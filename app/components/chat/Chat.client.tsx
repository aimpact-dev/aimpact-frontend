import { useStore } from '@nanostores/react';
import { useChat } from '@ai-sdk/react';
import { useAnimate } from 'framer-motion';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cssTransition, toast, ToastContainer } from 'react-toastify';
import { useMessageParser, usePromptEnhancer, useShortcuts } from '~/lib/hooks';
import { chatId, description, lastChatIdx, lastChatSummary, useChatHistory } from '~/lib/persistence';
import { chatStore } from '~/lib/stores/chat';
import { workbenchStore } from '~/lib/stores/workbench';
import { PROMPT_COOKIE_KEY } from '~/utils/constants';
import { cubicEasingFn } from '~/utils/easings';
import { createScopedLogger, renderLogger } from '~/utils/logger';
import { BaseChat } from './BaseChat';
import Cookies from 'js-cookie';
import { debounce } from '~/utils/debounce';
import { useSettings } from '~/lib/hooks/useSettings';
import type { ProviderInfo } from '~/types/model';
import { data, useSearchParams } from '@remix-run/react';
import { createSampler } from '~/utils/sampler';
import { logStore } from '~/lib/stores/logs';
import { streamingState } from '~/lib/stores/streaming';
import Page404 from '~/routes/$';
import ErrorPage from '../common/ErrorPage';
import { DaytonaCleanup } from '~/components/common/DaytonaCleanup';
import { useAuth } from '~/lib/hooks/useAuth';
import { convexTeamNameStore } from '~/lib/stores/convex';
import type { MessageDataEvent, UIMessage } from '~/lib/message';
import { DefaultChatTransport, generateId } from 'ai';

const toastAnimation = cssTransition({
  enter: 'animated fadeInRight',
  exit: 'animated fadeOutRight',
});

const logger = createScopedLogger('Chat');

export function Chat() {
  renderLogger.trace('Chat');

  const { ready, initialMessages, storeMessageHistory, importChat, exportChat, error } = useChatHistory();

  const title = useStore(description);
  useEffect(() => {
    workbenchStore.setReloadedMessages(initialMessages.map((m) => m.id));
    // chatStore.setKey('initialMessagesIds', initialMessages.map(m => m.id));
  }, [initialMessages]);

  if ((error as any)?.status === 404) {
    return <Page404 />;
  } else if ((error as any)?.status === 401) {
    return <ErrorPage errorCode="401" errorText="Unauthorized" details="Connect wallet, sign in and reload page" />;
  }

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
    initialMessages: UIMessage[];
    isLoading: boolean;
    parseMessages: (messages: UIMessage[], isLoading: boolean) => void;
    storeMessageHistory: (messages: UIMessage[]) => Promise<void>;
  }) => {
    let { messages } = options;
    const { initialMessages, isLoading, parseMessages, storeMessageHistory } = options;

    messages = messages.filter((message) => {
      if (message.role === 'user') return true;
      return message.parts?.find((p) => p.type === 'text');
    });
    messages = messages.map((message) => {
      return {
        ...message,
        parts: message.parts.filter(
          (p) => p.type != 'step-start' && p.type != 'reasoning' && !p.type.startsWith('data-'),
        ),
      };
    });

    const filteredMessages = messages.filter((message) => {
      return message.metadata ? !message.metadata.ignoreActions : true;
    });
    console.log('all messages', messages, filteredMessages);
    parseMessages(filteredMessages, isLoading);

    if (messages.length > initialMessages.length) {
      if (!messages.length) return;
      storeMessageHistory(messages).catch((error) => toast.error(error.message));
    }
  },
  50,
);

interface ChatProps {
  initialMessages: UIMessage[];
  storeMessageHistory: (messages: UIMessage[]) => Promise<void>;
  importChat: (description: string, messages: UIMessage[]) => Promise<void>;
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
  const convexTeamName = useStore(convexTeamNameStore);
  const actionAlert = useStore(workbenchStore.alert);
  const deployAlert = useStore(workbenchStore.deployAlert);
  const supabaseAlert = useStore(workbenchStore.supabaseAlert);
  const { autoSelectTemplate } = useSettings();
  const { jwtToken } = useAuth();

  useEffect(() => {
    return () => {
      processSampledMessages.cancel?.();

      // Stop any ongoing chat requests
      if (status === 'streaming') {
        stop();
      }

      // Clear any pending toasts
      toast.dismiss();
    };
  }, []); // Empty dependency array for cleanup on unmount

  const { showChat } = useStore(chatStore);
  const showWorkbench = useStore(workbenchStore.showWorkbench);

  const [animationScope, animate] = useAnimate();
  const chatIdState = useStore(chatId);

  // TODO: fix cwd
  const bodyRef = useRef<any>(null);
  useEffect(() => {
    bodyRef.current = { files, chatId: chatId.get(), cwd: '/home/project', convexTeamName };
  }, [files, chatIdState, convexTeamName]);

  const headersRef = useRef<any>(null);
  useEffect(() => {
    headersRef.current = { Authorization: `Bearer ${jwtToken}` };
  }, [jwtToken]);

  const { takeSnapshot } = useChatHistory();

  const [input, setInput] = useState(Cookies.get(PROMPT_COOKIE_KEY) || '');
  const [streamDataEvents, setStreamDataEvents] = useState<MessageDataEvent[]>([]);

  const { messages, status, stop, sendMessage, setMessages, regenerate, error } = useChat<UIMessage>({
    onError: (e) => {
      logger.error('Request failed\n\n', e, error);
      console.log('error', e, e?.message, typeof e);
      logStore.logError('Chat request failed', e, {
        component: 'Chat',
        action: 'request',
        error: e.message,
      });
      toast.error('There was an error processing your request: ' + (e.message ?? 'Unknown error'));
    },

    onFinish: ({ message, isError, finishReason }) => {
      if (isError) {
        const msg = `Error on stream request: ${finishReason || 'Unknown error'}`;
        console.error(msg);
        return;
      }
      const usage = message.metadata?.totalUsage;
      logger.debug('ON FINISH');

      if (usage) {
        logger.debug('Token usage:', usage);
        logStore.logProvider('Chat response completed', {
          component: 'Chat',
          action: 'response',
          usage,
          messageLength: message.parts
            .map((val) => (val.type === 'text' ? val.text.length : 0))
            .reduce((a, b) => a + b),
        });
      }

      logger.debug('Finished streaming');
      const chatIdx = lastChatIdx.get();
      const files = workbenchStore.files.get();
      const chatSummary = lastChatSummary.get();
      if (!chatIdx || Object.values(files).length === 0) return;

      takeSnapshot(chatIdx, files, undefined, chatSummary)
        .then(() => logger.debug('Project saved after message on finish'))
        .catch((e) => {
          logger.error('error in take snapshot!!!');
          logger.error(e);
        });
    },
    onData: (dataPart) => {
      logger.debug('new data event', dataPart);
      if (dataPart.type === 'data-template') {
        const templateUIMessage: UIMessage = {
          id: generateId(),
          parts: [
            {
              type: 'text',
              text: dataPart.data as string,
            },
          ],
          role: 'system',
        };
        setMessages([...messages, templateUIMessage]);
      }

      if (dataPart.type.startsWith('data-')) {
        setStreamDataEvents([...streamDataEvents, dataPart]);
      }
    },

    messages: initialMessages,
    experimental_throttle: 100,

    transport: new DefaultChatTransport({
      api: new URL('/chat/test-stream', import.meta.env.PUBLIC_BACKEND_URL)?.href,
      headers: () => headersRef.current,
      body: () => bodyRef.current,
    }),
  });

  useEffect(() => {
    const prompt = searchParams.get('prompt');

    if (prompt) {
      setSearchParams({});
      setInput(prompt);
    }
  }, [searchParams]);

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
      messages: messages as UIMessage[],
      initialMessages,
      isLoading: status == 'streaming',
      parseMessages,
      storeMessageHistory,
    });
  }, [messages, status, parseMessages]);

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

  const sendMessageCallback = async (_event: React.UIEvent, messageInput?: string) => {
    const messageContent = messageInput || input;

    if (!messageContent?.trim()) {
      return;
    }

    if (status === 'streaming') {
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

      // If autoSelectTemplate is disabled or template selection failed, proceed with normal message
      const id = Date.now().toString();
      console.log('before sendMessage:', id);
      sendMessage({
        id,
        role: 'user',
        parts: [
          {
            type: 'text',
            text: finalMessageContent,
          },
          // TODO: bro im tired of this shit
          //   ...imageDataList.map((imageData) => ({
          //     type: 'image',
          //     image: imageData,
          //   })),
        ],
      });
      setFakeLoading(false);
      setInput('');
      Cookies.remove(PROMPT_COOKIE_KEY);

      setUploadedFiles([]);
      setImageDataList([]);

      resetEnhancer();

      textareaRef.current?.blur();

      return;
    }

    sendMessage({
      id: generateId(),
      role: 'user',
      parts: [
        {
          type: 'text',
          text: finalMessageContent,
        },
        // TODO: bro im tired of this shit
        //   ...imageDataList.map((imageData) => ({
        //     type: 'image',
        //     image: imageData,
        //   })),
      ],
    });
    setFakeLoading(false);

    if (error != null) {
      console.log('before error slice');
      setMessages(messages.slice(0, -1));
    }

    chatStore.setKey('aborted', false);

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
    ((e) => setInput(e.target.value))(event);
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

  const enhancePromptCallback = useCallback(() => {
    enhancePrompt(input, (input) => {
      setInput(input);
      scrollTextArea();
    });
  }, [enhancePrompt, input, setInput]);

  const handleInputChangeAndCache = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onTextareaChange(e);
      debouncedCachePrompt(e);
    },
    [onTextareaChange, debouncedCachePrompt],
  );

  const clearAlertCallback = useCallback(() => {
    workbenchStore.clearAlert();
  }, []);

  const clearSupabaseAlertCallback = useCallback(() => {
    workbenchStore.clearSupabaseAlert();
  }, []);

  const clearDeployAlertCallback = useCallback(() => {
    workbenchStore.clearDeployAlert();
  }, []);

  const onStreamingChangeCallback = useCallback(
    (streaming: boolean) => {
      streamingState.set(streaming);
    },
    [streamingState],
  );

  return (
    <>
      <BaseChat
        ref={animationScope}
        textareaRef={textareaRef}
        input={input}
        showChat={showChat}
        chatStarted={chatStarted}
        isStreaming={status === 'streaming' || fakeLoading}
        onStreamingChange={onStreamingChangeCallback}
        enhancingPrompt={enhancingPrompt}
        promptEnhanced={promptEnhanced}
        sendMessage={sendMessageCallback}
        handleInputChange={handleInputChangeAndCache}
        handleStop={abort}
        messages={
          messages.map((message, i) => {
            if (message.role === 'user') {
              return message;
            }

            const parsedContent = parsedMessages[i];
            return {
              ...message,
              parts: parsedContent ? [{ type: 'text', text: parsedContent || '' }] : message.parts,
            };
          }) as UIMessage[]
        }
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
        data={streamDataEvents}
        showWorkbench={showWorkbench}
      />
      <DaytonaCleanup />
    </>
  );
});
