import { useStore } from '@nanostores/react';
import type { Message, UIMessage } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useAnimate } from 'framer-motion';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cssTransition, toast, ToastContainer } from 'react-toastify';
import { useMessageParser, usePromptEnhancer, useShortcuts } from '~/lib/hooks';
import { description, useChatHistory } from '~/lib/persistence';
import { chatStore } from '~/lib/stores/chat';
import { workbenchStore } from '~/lib/stores/workbench';
import {
  DEFAULT_MINI_MODEL,
  DEFAULT_MINI_PROVIDER,
  DEFAULT_MODEL,
  DEFAULT_PROVIDER,
  PROMPT_COOKIE_KEY,
} from '~/utils/constants';
import { cubicEasingFn } from '~/utils/easings';
import { createScopedLogger, renderLogger } from '~/utils/logger';
import { BaseChat } from './BaseChat';
import Cookies from 'js-cookie';
import { debounce } from '~/utils/debounce';
import { useSettings } from '~/lib/hooks/useSettings';
import type { ProviderInfo } from '~/types/model';
import { useSearchParams } from '@remix-run/react';
import { createSampler } from '~/utils/sampler';
import { getTemplates, selectStarterTemplate } from '~/utils/selectStarterTemplate';
import { logStore } from '~/lib/stores/logs';
import { streamingState } from '~/lib/stores/streaming';
import { filesToArtifacts } from '~/utils/fileUtils';
import { supabaseConnection } from '~/lib/stores/supabase';
import Popup from '../common/Popup';

const toastAnimation = cssTransition({
  enter: 'animated fadeInRight',
  exit: 'animated fadeOutRight',
});

const logger = createScopedLogger('Chat');

export function Chat() {
  renderLogger.trace('Chat');

  const { ready, initialMessages, storeMessageHistory, importChat, exportChat } = useChatHistory();
  const title = useStore(description);
  useEffect(() => {
    workbenchStore.setReloadedMessages(initialMessages.map((m) => m.id));
  }, [initialMessages]);

  return (
    <>
      {ready && (
        <ChatImpl
          description={title}
          initialMessages={initialMessages}
          exportChat={exportChat}
          storeMessageHistory={storeMessageHistory}
          importChat={importChat}
        />
      )}
      <ToastContainer
        closeButton={({ closeToast }) => {
          return (
            <button className="Toastify__close-button" onClick={closeToast}>
              <div className="i-ph:x text-lg" />
            </button>
          );
        }}
        icon={({ type }) => {
          /**
           * @todo Handle more types if we need them. This may require extra color palettes.
           */
          switch (type) {
            case 'success': {
              return <div className="i-ph:check-bold text-bolt-elements-icon-success text-2xl" />;
            }
            case 'error': {
              return <div className="i-ph:warning-circle-bold text-bolt-elements-icon-error text-2xl" />;
            }
          }

          return undefined;
        }}
        position="bottom-right"
        pauseOnFocusLoss
        transition={toastAnimation}
        autoClose={3000}
      />
    </>
  );
}

const processSampledMessages = createSampler(
  (options: {
    messages: UIMessage[];
    initialMessages: Message[];
    isLoading: boolean;
    parseMessages: (messages: Message[], isLoading: boolean) => void;
    storeMessageHistory: (messages: Message[]) => Promise<void>;
  }) => {
    const { messages, initialMessages, isLoading, parseMessages, storeMessageHistory } = options;
    parseMessages(messages, isLoading);
    
    if (messages.length > initialMessages.length) {
      storeMessageHistory(messages).catch((error) => toast.error(error.message));
    }
  },
  50,
);

interface ChatProps {
  initialMessages: Message[];
  storeMessageHistory: (messages: Message[]) => Promise<void>;
  importChat: (description: string, messages: Message[]) => Promise<void>;
  exportChat: () => void;
  description?: string;
}

export const ChatImpl = memo(({ initialMessages, storeMessageHistory }: ChatProps) => {
  useShortcuts();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [chatStarted, setChatStarted] = useState(initialMessages.length > 0);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [imageDataList, setImageDataList] = useState<string[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [fakeLoading, setFakeLoading] = useState(false);
  const files = useStore(workbenchStore.files);
  const actionAlert = useStore(workbenchStore.alert);
  const deployAlert = useStore(workbenchStore.deployAlert);
  const supabaseConn = useStore(supabaseConnection); // Add this line to get Supabase connection
  const selectedProject = supabaseConn.stats?.projects?.find(
    (project) => project.id === supabaseConn.selectedProjectId,
  );
  const supabaseAlert = useStore(workbenchStore.supabaseAlert);
  const { activeProviders, promptId, autoSelectTemplate, contextOptimizationEnabled } = useSettings();

  /*
   * console.log(`Auto select template: ${autoSelectTemplate}`)
   * console.log(`Prompt id: ${promptId}`)
   */

  useEffect(() => {
    return () => {
      processSampledMessages.cancel?.();
      
      // Stop any ongoing chat requests
      if (isLoading) {
        stop();
      }
      
      // Clear any pending toasts
      toast.dismiss();
    };
  }, []); // Empty dependency array for cleanup on unmount

  const [model, setModel] = useState(() => {
    const savedModel = Cookies.get('selectedModel');
    return DEFAULT_MODEL || savedModel;
  });
  const [miniModel, setMiniModel] = useState(() => {
    const savedModel = Cookies.get('selectedModel');
    return DEFAULT_MINI_MODEL || savedModel;
  });
  const [provider, setProvider] = useState(() => {
    return DEFAULT_PROVIDER as ProviderInfo;
  });
  const [miniProvider, setMiniProvider] = useState(() => {
    return DEFAULT_MINI_PROVIDER as ProviderInfo;
  });

  const { showChat } = useStore(chatStore);
  const showWorkbench = useStore(workbenchStore.showWorkbench);

  const [animationScope, animate] = useAnimate();

  const chatBody = useMemo(() => ({
    files,
    promptId,
    contextOptimization: contextOptimizationEnabled,
    authToken: Cookies.get('authToken'),
  }), [files, promptId, contextOptimizationEnabled]);

  const {
    messages,
    isLoading,
    input,
    handleInputChange,
    setInput,
    stop,
    append,
    setMessages,
    reload,
    error,
    data: chatData,
    setData,
  } = useChat({
    api: '/api/chat',
    body: chatBody,
    sendExtraMessageFields: true,
    onError: (e) => {
      logger.error('Request failed\n\n', e, error);
      logStore.logError('Chat request failed', e, {
        component: 'Chat',
        action: 'request',
        error: e.message,
      });
      toast.error(
        'There was an error processing your request: ' + (e.message ? e.message : 'No details were returned'),
      );
    },
    onFinish: (message, response) => {
      logger.debug('ON FINISH');
      logger.debug(response.usage);

      const usage = response.usage;
      setData(undefined);

      if (usage) {
        console.log('Token usage:', usage);
        logStore.logProvider('Chat response completed', {
          component: 'Chat',
          action: 'response',
          model,
          provider: provider.name,
          usage,
          messageLength: message.content.length,
        });
      }

      logger.debug('Finished streaming');
    },
    initialMessages,
    initialInput: Cookies.get(PROMPT_COOKIE_KEY) || '',
    experimental_throttle: 75,
  });
  useEffect(() => {
    const prompt = searchParams.get('prompt');

    // console.log(prompt, searchParams, model, provider);

    if (prompt) {
      setSearchParams({});
      setInput(prompt);

      /*
       * runAnimation();
       * append({
       *   role: 'user',
       *   content: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${prompt}`,
       * });
       */
    }
  }, [model, provider, searchParams]);

  const { enhancingPrompt, promptEnhanced, enhancePrompt, resetEnhancer } = usePromptEnhancer();
  const { parsedMessages, parseMessages } = useMessageParser();

  const TEXTAREA_MAX_HEIGHT = chatStarted ? 400 : 200;

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    chatStore.setKey('started', initialMessages.length > 0);
  }, []);

  useEffect(() => {
    processSampledMessages({
      messages,
      initialMessages,
      isLoading,
      parseMessages,
      storeMessageHistory,
    });
  }, [messages, isLoading, parseMessages]);

  const scrollTextArea = () => {
    const textarea = textareaRef.current;

    if (textarea) {
      textarea.scrollTop = textarea.scrollHeight;
    }
  };

  const abort = () => {
    stop();
    chatStore.setKey('aborted', true);
    workbenchStore.abortAllActions();

    logStore.logProvider('Chat response aborted', {
      component: 'Chat',
      action: 'abort',
      model,
      provider: provider.name,
    });
  };

  useEffect(() => {
    const textarea = textareaRef.current;

    if (textarea) {
      textarea.style.height = 'auto';

      const scrollHeight = textarea.scrollHeight;

      textarea.style.height = `${Math.min(scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
      textarea.style.overflowY = scrollHeight > TEXTAREA_MAX_HEIGHT ? 'auto' : 'hidden';
    }
  }, [input, textareaRef]);

  const runAnimation = async () => {
    if (chatStarted) {
      return;
    }

    await Promise.all([
      animate('#examples', { opacity: 0, display: 'none' }, { duration: 0.1 }),
      animate('#intro', { opacity: 0, flex: 1 }, { duration: 0.2, ease: cubicEasingFn }),
    ]);

    chatStore.setKey('started', true);

    setChatStarted(true);
  };

  const sendMessage = async (_event: React.UIEvent, messageInput?: string) => {
    const messageContent = messageInput || input;

    if (!messageContent?.trim()) {
      return;
    }

    if (isLoading) {
      abort();
      return;
    }

    // If no locked items, proceed normally with the original message
    const finalMessageContent = messageContent;

    logger.info(`IS CHAT STARTED (TEMPLATE): ${chatStarted}`);
    runAnimation();

    if (!chatStarted) {
      setFakeLoading(true);

      logger.info(`AUTO SELECT TEMPLATE: ${autoSelectTemplate}`);

      if (autoSelectTemplate) {
        const { template, title } = await selectStarterTemplate({
          message: finalMessageContent,
          model: miniModel,
          provider: miniProvider,
        });
        console.log(`SELECTED TEMPLATE:`);
        console.log(template);

        if (!isMounted.current) return;

        if (template !== 'blank') {
          const temResp = await getTemplates(template, title).catch((e) => {
            if (e.message.includes('rate limit')) {
              toast.warning('Rate limit exceeded. Skipping starter template\n Continuing with blank template');
            } else {
              toast.warning('Failed to import starter template\n Continuing with blank template');
            }

            return null;
          });
          if (!isMounted.current) return;

          if (temResp) {
            const { assistantMessage, userMessage } = temResp;
            setMessages([
              {
                id: `1-${new Date().getTime()}`,
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${finalMessageContent}`,
                  },
                  ...imageDataList.map((imageData) => ({
                    type: 'image',
                    image: imageData,
                  })),
                ] as any,
              },
              {
                id: `2-${new Date().getTime()}`,
                role: 'assistant',
                content: assistantMessage,
              },
              {
                id: `3-${new Date().getTime()}`,
                role: 'user',
                content: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${userMessage}`,
                annotations: ['hidden', 'no-store'],
              },
            ]);
            reload();
            setInput('');
            Cookies.remove(PROMPT_COOKIE_KEY);

            setUploadedFiles([]);
            setImageDataList([]);

            resetEnhancer();

            textareaRef.current?.blur();
            setFakeLoading(false);

            return;
          }
        }
      }

      // If autoSelectTemplate is disabled or template selection failed, proceed with normal message
      setMessages([
        {
          id: `${new Date().getTime()}`,
          role: 'user',
          content: [
            {
              type: 'text',
              text: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${finalMessageContent}`,
            },
            ...imageDataList.map((imageData) => ({
              type: 'image',
              image: imageData,
            })),
          ] as any,
        },
      ]);
      reload();
      setFakeLoading(false);
      setInput('');
      Cookies.remove(PROMPT_COOKIE_KEY);

      setUploadedFiles([]);
      setImageDataList([]);

      resetEnhancer();

      textareaRef.current?.blur();

      return;
    }

    if (error != null) {
      setMessages(messages.slice(0, -1));
    }

    const modifiedFiles = workbenchStore.getModifiedFiles();

    chatStore.setKey('aborted', false);

    if (modifiedFiles !== undefined) {
      const userUpdateArtifact = filesToArtifacts(modifiedFiles, `${Date.now()}`);
      append({
        role: 'user',
        content: [
          {
            type: 'text',
            text: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${userUpdateArtifact}${finalMessageContent}`,
          },
          ...imageDataList.map((imageData) => ({
            type: 'image',
            image: imageData,
          })),
        ] as any,
      });

      workbenchStore.resetAllFileModifications();
    } else {
      append({
        role: 'user',
        content: [
          {
            type: 'text',
            text: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${finalMessageContent}`,
          },
          ...imageDataList.map((imageData) => ({
            type: 'image',
            image: imageData,
          })),
        ] as any,
      });
    }

    setInput('');
    Cookies.remove(PROMPT_COOKIE_KEY);

    setUploadedFiles([]);
    setImageDataList([]);

    resetEnhancer();

    textareaRef.current?.blur();
  };

  /**
   * Handles the change event for the textarea and updates the input state.
   * @param event - The change event from the textarea.
   */
  const onTextareaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleInputChange(event);
  };

  /**
   * Debounced function to cache the prompt in cookies.
   * Caches the trimmed value of the textarea input after a delay to optimize performance.
   */
  const debouncedCachePrompt = useCallback(
    debounce((event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const trimmedValue = event.target.value.trim();
      Cookies.set(PROMPT_COOKIE_KEY, trimmedValue, { expires: 30 });
    }, 1000),
    [],
  );

  useEffect(() => {
    return () => {
      debouncedCachePrompt.cancel?.();
    };
  }, [debouncedCachePrompt]);

  const handleModelChange = (newModel: string) => {
    setModel(newModel);
    Cookies.set('selectedModel', newModel, { expires: 30 });
  };

  const handleProviderChange = (newProvider: ProviderInfo) => {
    setProvider(newProvider);
    Cookies.set('selectedProvider', newProvider.name, { expires: 30 });
  };

  const enhancePromptCallback = useCallback(() => {
    enhancePrompt(
      input,
      (input) => {
        setInput(input);
        scrollTextArea();
      },
    );
  }, [enhancePrompt, input, setInput]);

  const handleInputChangeAndCache = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onTextareaChange(e);
    debouncedCachePrompt(e);
  }, [onTextareaChange, debouncedCachePrompt]);

  const clearAlertCallback = useCallback(() => {
    workbenchStore.clearAlert();
  }, []);

  const clearSupabaseAlertCallback = useCallback(() => {
    workbenchStore.clearSupabaseAlert()
  }, []);

  const clearDeployAlertCallback = useCallback(() => {
    workbenchStore.clearDeployAlert()
  }, []);

  const onStreamingChangeCallback = useCallback((streaming: boolean) => {
    streamingState.set(streaming);
  }, [streamingState]);

  return (
    <>
      {/* <Popup isShow={showPopup} handleToggle={handleClosePopup}>
        <h3 className='text-2xl font-bold mb-4'>You are using AImpact v0.01</h3>
        <p className='text-left'>
        <br />
        You can use the service if you want to, but be ready, it's not in production at the moment.
After launch, all users will have some free messages and also, there will be quests to get more free ones. 
<br /> <br />
At the moment, we removed free messages temporarily, so the service does not get abused while we are not launched, but feel free to buy some if you want to start early and support us.
<br /> <br />
Follow our <a href='https://x.com/ostolex' target='_blank' className='underline'>Twitter</a> to be updated on our launch and other news.
        </p>
      </Popup> */}
      <BaseChat
        ref={animationScope}
        textareaRef={textareaRef}
        input={input}
        showChat={showChat}
        chatStarted={chatStarted}
        isStreaming={isLoading || fakeLoading}
        onStreamingChange={onStreamingChangeCallback}
        enhancingPrompt={enhancingPrompt}
        promptEnhanced={promptEnhanced}
        sendMessage={sendMessage}
        model={model}
        setModel={handleModelChange}
        provider={provider}
        setProvider={handleProviderChange}
        providerList={activeProviders}
        handleInputChange={handleInputChangeAndCache}
        handleStop={abort}
        /*
        * description={description}
        * importChat={importChat}
        * exportChat={exportChat}
        */
        messages={messages.map((message, i) => {
          if (message.role === 'user') {
            return message;
          }

          return {
            ...message,
            content: parsedMessages[i] || '',
          };
        })}
        enhancePrompt={enhancePromptCallback}
        uploadedFiles={uploadedFiles}
        setUploadedFiles={setUploadedFiles}
        imageDataList={imageDataList}
        setImageDataList={setImageDataList}
        actionAlert={actionAlert}
        clearAlert={clearAlertCallback}
        supabaseAlert={supabaseAlert}
        clearSupabaseAlert={clearSupabaseAlertCallback}
        deployAlert={deployAlert}
        clearDeployAlert={clearDeployAlertCallback}
        data={chatData}
        showWorkbench={showWorkbench}
      />
    </>
  );
});
