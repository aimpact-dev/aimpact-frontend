/*
 * @ts-nocheck
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import type { JSONValue, UIMessage } from 'ai';
import React, { type RefCallback, useEffect, useState } from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { IconButton } from '~/components/ui/IconButton';
import { Workbench } from '~/components/workbench/Workbench.client';
import { classNames } from '~/utils/classNames';
import { Messages } from './Messages.client';
import { SendButton } from './SendButton.client';
import * as Tooltip from '@radix-ui/react-tooltip';

import styles from './BaseChat.module.scss';
import { ExportChatButton } from '~/components/chat/chatExportAndImport/ExportChatButton';
import { ExamplePrompts } from '~/components/chat/ExamplePrompts';

import FilePreview from './FilePreview';
import { SpeechRecognitionButton } from '~/components/chat/SpeechRecognition';
import type { ProviderInfo } from '~/types/model';
import { ScreenshotStateManager } from './ScreenshotStateManager';
import { toast } from 'react-toastify';
import type { ActionAlert, SupabaseAlert, DeployAlert } from '~/types/actions';
import DeployChatAlert from '~/components/deploy/DeployAlert';
import ChatAlert from './ChatAlert';
import ProgressCompilation from './ProgressCompilation';
import type { ProgressAnnotation } from '~/types/context';
import type { ActionRunner } from '~/lib/runtime/action-runner';
import { ExpoQrModal } from '~/components/workbench/ExpoQrModal';
import { expoUrlAtom } from '~/lib/stores/qrCodeStore';
import { useStore } from '@nanostores/react';
import { StickToBottom, useStickToBottomContext, useViewport } from '~/lib/hooks';
import SideMenu from '../footer/SideMenu.client';
import { useAuth } from '~/lib/hooks/useAuth';
import { userInfo } from '~/lib/hooks/useAuth';
import CustomWalletButton from '../common/CustomWalletButton';
import Footer from '../footer/Footer';
import { useParams } from '@remix-run/react';
import { useGetHeavenToken } from '~/lib/hooks/tanstack/useHeaven';
import { HeaderActionButtons } from '../header/HeaderActionButtons.client';
import type { MessageDataEvent } from '~/lib/message';
import { twMerge } from 'tailwind-merge';

const TEXTAREA_MIN_HEIGHT = 95;

interface BaseChatProps {
  textareaRef?: React.RefObject<HTMLTextAreaElement> | undefined;
  messageRef?: RefCallback<HTMLDivElement> | undefined;
  scrollRef?: RefCallback<HTMLDivElement> | undefined;
  showChat?: boolean;
  chatStarted?: boolean;
  isStreaming?: boolean;
  onStreamingChange?: (streaming: boolean) => void;
  messages?: UIMessage[];
  description?: string;
  enhancingPrompt?: boolean;
  promptEnhanced?: boolean;
  input?: string;
  providerList?: ProviderInfo[];
  handleStop?: () => void;
  sendMessage?: (event: React.UIEvent, messageInput?: string) => void;
  handleInputChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  enhancePrompt?: () => void;
  importChat?: (description: string, messages: UIMessage[]) => Promise<void>;
  exportChat?: () => void;
  uploadedFiles?: File[];
  setUploadedFiles?: (files: File[]) => void;
  imageDataList?: string[];
  setImageDataList?: (dataList: string[]) => void;
  actionAlert?: ActionAlert;
  clearAlert?: () => void;
  supabaseAlert?: SupabaseAlert;
  clearSupabaseAlert?: () => void;
  deployAlert?: DeployAlert;
  clearDeployAlert?: () => void;
  data?: MessageDataEvent[] | undefined;
  actionRunner?: ActionRunner;
  showWorkbench?: boolean;
}

export const BaseChat = React.forwardRef<HTMLDivElement, BaseChatProps>(
  (
    {
      textareaRef,
      showChat = true,
      chatStarted = false,
      isStreaming = false,
      onStreamingChange,
      input = '',
      enhancingPrompt,
      handleInputChange,

      promptEnhanced,
      enhancePrompt,
      sendMessage,
      handleStop,
      exportChat,
      uploadedFiles = [],
      setUploadedFiles,
      imageDataList = [],
      setImageDataList,
      messages,
      actionAlert,
      clearAlert,
      deployAlert,
      clearDeployAlert,
      supabaseAlert,
      clearSupabaseAlert,
      data,
      actionRunner,
      showWorkbench,
    },
    ref,
  ) => {
    const { isMobile } = useViewport();
    const TEXTAREA_MAX_HEIGHT = chatStarted ? 400 : 200;
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
    const [progressAnnotations, setProgressAnnotations] = useState<MessageDataEvent[]>([]);
    const expoUrl = useStore(expoUrlAtom);
    const [qrModalOpen, setQrModalOpen] = useState(false);
    const params = useParams();
    const tokenInfoQuery = params.id ? useGetHeavenToken(params.id) : null;

    const { isAuthorized } = useAuth();
    const userInfoData = useStore(userInfo);

    const [isDragging, setIsDragging] = useState(false);
    const isDisabled = !isAuthorized || !userInfoData?.messagesLeft;

    useEffect(() => {
      if (expoUrl) {
        setQrModalOpen(true);
      }
    }, [expoUrl]);

    useEffect(() => {
      if (promptEnhanced) {
        toast.success('Prompt enhanced!');
      }
    }, [promptEnhanced]);

    useEffect(() => {
      if (data) {
        const progressList = data.filter((x) => x.type === 'data-progress');
        setProgressAnnotations(progressList);
      }
    }, [data]);

    useEffect(() => {
      onStreamingChange?.(isStreaming);
    }, [isStreaming, onStreamingChange]);

    useEffect(() => {
      if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map((result) => result[0])
            .map((result) => result.transcript)
            .join('');

          if (handleInputChange) {
            const syntheticEvent = {
              target: { value: transcript },
            } as React.ChangeEvent<HTMLTextAreaElement>;
            handleInputChange(syntheticEvent);
          }
        };

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        setRecognition(recognition);

        return () => {
          recognition.stop();
        };
      }
    }, []);

    const startListening = () => {
      if (recognition) {
        recognition.start();
        setIsListening(true);
      }
    };

    const stopListening = () => {
      if (recognition) {
        recognition.stop();
        setIsListening(false);
      }
    };

    const handleSendMessage = (event: React.UIEvent, messageInput?: string) => {
      if (!isAuthorized) {
        toast.warning('You cannot use chat. Connect your wallet and log in.');
        return;
      }

      (window as any).plausible('send_chat_message');

      if (sendMessage) {
        sendMessage(event, messageInput);

        if (recognition) {
          recognition.abort(); // Stop current recognition
          setIsListening(false);

          // Clear the input by triggering handleInputChange with empty value
          if (handleInputChange) {
            const syntheticEvent = {
              target: { value: '' },
            } as React.ChangeEvent<HTMLTextAreaElement>;
            handleInputChange(syntheticEvent);
          }
        }
      }
    };

    const handleFileUpload = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];

        if (file) {
          const reader = new FileReader();

          reader.onload = (e) => {
            const base64Image = e.target?.result as string;
            setUploadedFiles?.([...uploadedFiles, file]);
            setImageDataList?.([...imageDataList, base64Image]);
          };
          reader.readAsDataURL(file);
        }
      };

      input.click();
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;

      if (!items) {
        return;
      }

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();

          const file = item.getAsFile();

          if (file) {
            const reader = new FileReader();

            reader.onload = (e) => {
              const base64Image = e.target?.result as string;
              setUploadedFiles?.([...uploadedFiles, file]);
              setImageDataList?.([...imageDataList, base64Image]);
            };
            reader.readAsDataURL(file);
          }

          break;
        }
      }
    };

    const baseChat = (
      <div
        ref={ref}
        className={classNames(styles.BaseChat, 'relative flex flex-col h-full w-full overflow-hidden')}
        data-chat-visible={showChat}
      >
        {isMobile && chatStarted && <ClientOnly>{() => <HeaderActionButtons isMobile />}</ClientOnly>}

        {/* <ClientOnly>{() => <Menu />}</ClientOnly> */}
        <div className="flex flex-col lg:flex-row overflow-x-hidden w-full h-full">
          <div className={classNames(styles.Chat, 'flex flex-col flex-grow lg:min-w-[var(--chat-min-width)] h-full')}>
            {!chatStarted && (
              <div id="intro" className="mt-[5vh] 2xl:mt-[8vh] max-w-chat mx-auto text-center px-4 lg:px-0">
                <div className="flex justify-center mb-6">
                  <img src="/aimpact-logo-beta-xmas.png" alt="AImpact Logo" className="h-[72px] w-auto" />
                </div>
                <h1 className="text-3xl lg:text-6xl font-bold text-bolt-elements-textPrimary mb-4 animate-fade-in">
                  Your AI co-founder
                </h1>
                <p className="text-md lg:text-xl mb-4 2xl:mb-8 text-bolt-elements-textSecondary animate-fade-in animation-delay-200">
                  Where your Web3 dreams come true
                </p>
              </div>
            )}

            <StickToBottom
              className={classNames('pt-6 px-2 sm:px-6 relative', {
                'h-full flex flex-col modern-scrollbar': chatStarted,
              })}
              resize="smooth"
              initial="smooth"
            >
              <StickToBottom.Content className="flex flex-col gap-4">
                <ClientOnly>
                  {() => {
                    return chatStarted ? (
                      <Messages
                        className="flex flex-col w-full gap-4 flex-1 max-w-chat pb-6 mx-auto z-1"
                        messages={messages}
                        isStreaming={isStreaming}
                      />
                    ) : null;
                  }}
                </ClientOnly>
              </StickToBottom.Content>
              <div
                className={classNames('my-auto flex flex-col gap-2 w-full max-w-chat mx-auto z-prompt mb-6', {
                  'sticky bottom-2': chatStarted,
                })}
              >
                <div className="flex flex-col gap-2">
                  {deployAlert && (
                    <DeployChatAlert
                      alert={deployAlert}
                      clearAlert={() => clearDeployAlert?.()}
                      postMessage={(message: string | undefined) => {
                        sendMessage?.({} as any, message);
                        clearSupabaseAlert?.();
                      }}
                    />
                  )}
                  {actionAlert && (
                    <ChatAlert
                      alert={actionAlert}
                      clearAlert={() => clearAlert?.()}
                      postMessage={(message) => {
                        sendMessage?.({} as any, message);
                        clearAlert?.();
                      }}
                    />
                  )}
                </div>
                <ScrollToBottom />
                {progressAnnotations && <ProgressCompilation data={progressAnnotations} className="my-1" />}
                <div
                  className={classNames(
                    'relative bg-bolt-elements-background-depth-2 p-3 rounded-lg border border-bolt-elements-borderColor w-full max-w-chat mx-auto z-prompt',

                    /*
                     * {
                     *   'sticky bottom-2': chatStarted,
                     * },
                     */
                  )}
                >
                  <svg className={classNames(styles.PromptEffectContainer)}>
                    <defs>
                      <linearGradient
                        id="line-gradient"
                        x1="20%"
                        y1="0%"
                        x2="-14%"
                        y2="10%"
                        gradientUnits="userSpaceOnUse"
                        gradientTransform="rotate(-45)"
                      >
                        <stop offset="0%" stopColor="#b44aff" stopOpacity="0%"></stop>
                        <stop offset="40%" stopColor="#b44aff" stopOpacity="80%"></stop>
                        <stop offset="50%" stopColor="#b44aff" stopOpacity="80%"></stop>
                        <stop offset="100%" stopColor="#b44aff" stopOpacity="0%"></stop>
                      </linearGradient>
                      <linearGradient id="shine-gradient">
                        <stop offset="0%" stopColor="white" stopOpacity="0%"></stop>
                        <stop offset="40%" stopColor="#ffffff" stopOpacity="80%"></stop>
                        <stop offset="50%" stopColor="#ffffff" stopOpacity="80%"></stop>
                        <stop offset="100%" stopColor="white" stopOpacity="0%"></stop>
                      </linearGradient>
                    </defs>
                    <rect className={classNames(styles.PromptEffectLine)} pathLength="100" strokeLinecap="round"></rect>
                    <rect className={classNames(styles.PromptShine)} x="48" y="24" width="70" height="1"></rect>
                  </svg>
                  <FilePreview
                    files={uploadedFiles}
                    imageDataList={imageDataList}
                    onRemove={(index) => {
                      setUploadedFiles?.(uploadedFiles.filter((_, i) => i !== index));
                      setImageDataList?.(imageDataList.filter((_, i) => i !== index));
                    }}
                  />
                  <ClientOnly>
                    {() => (
                      <ScreenshotStateManager
                        setUploadedFiles={setUploadedFiles}
                        setImageDataList={setImageDataList}
                        uploadedFiles={uploadedFiles}
                        imageDataList={imageDataList}
                      />
                    )}
                  </ClientOnly>
                  <div
                    className={classNames(
                      'relative shadow-xs border border-bolt-elements-borderColor backdrop-blur rounded-lg transition-all duration-150',
                      ...(!isAuthorized || !userInfoData?.messagesLeft
                        ? ['blur-[2px] pointer-events-none select-none']
                        : []),
                    )}
                  >
                    <div className="relative w-full">
                      <textarea
                        ref={textareaRef}
                        disabled={isDisabled}
                        className={twMerge(
                          'w-full pl-4 pt-4 pr-16 outline-none resize-none text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary bg-transparent text-sm',
                          isDragging && 'blur-sm',
                        )}
                        placeholder="How can AImpact help you today?"
                        onDragEnter={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          setIsDragging(false);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragging(false);

                          const files = Array.from(e.dataTransfer.files);
                          files.forEach((file) => {
                            if (file.type.startsWith('image/')) {
                              const reader = new FileReader();
                              reader.onload = (e) => {
                                const base64Image = e.target?.result as string;
                                setUploadedFiles?.([...uploadedFiles, file]);
                                setImageDataList?.([...imageDataList, base64Image]);
                              };
                              reader.readAsDataURL(file);
                            }
                          });
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            if (event.shiftKey || isStreaming) {
                              return;
                            }
                            event.preventDefault();

                            // ignore if using input method engine
                            if (event.nativeEvent.isComposing) {
                              return;
                            }
                            handleSendMessage?.(event);
                          }
                        }}
                        value={input}
                        onChange={handleInputChange}
                        onPaste={handlePaste}
                        style={{
                          minHeight: TEXTAREA_MIN_HEIGHT,
                          maxHeight: TEXTAREA_MAX_HEIGHT,
                        }}
                        maxLength={16000}
                        translate="no"
                      />

                      {isDragging && (
                        <div className="absolute inset-0 flex gap-2 items-center justify-center bg-black/20 rounded-lg border-1 border-accent-500 text-accent-500 gap-2 pointer-events-none text-center">
                          <div className="i-ph:tray-arrow-down text-xl"></div>
                          Drop your files here
                        </div>
                      )}
                    </div>

                    <ClientOnly>
                      {() => (
                        <SendButton
                          show={(input.length > 0 || isStreaming || uploadedFiles.length > 0) && !isDragging}
                          isStreaming={isStreaming}
                          disabled={isDisabled}
                          onClick={(event) => {
                            if (isStreaming) {
                              handleStop?.();
                              return;
                            }

                            if (input.length > 0 || uploadedFiles.length > 0) {
                              handleSendMessage?.(event);
                            }
                          }}
                        />
                      )}
                    </ClientOnly>
                    <div className="flex justify-between items-center text-sm p-4 pt-2">
                      <div className="flex gap-1 items-center">
                        <IconButton title="Upload file" className="transition-all" onClick={() => handleFileUpload()}>
                          <div className="i-ph:paperclip text-xl"></div>
                        </IconButton>
                        <IconButton
                          title="Enhance prompt"
                          disabled={input.length === 0 || enhancingPrompt || isDisabled}
                          className={classNames('transition-all', enhancingPrompt ? 'opacity-100' : '')}
                          onClick={() => {
                            enhancePrompt?.();
                          }}
                        >
                          {enhancingPrompt ? (
                            <div className="i-svg-spinners:90-ring-with-bg text-bolt-elements-loader-progress text-xl animate-spin"></div>
                          ) : (
                            <div className="i-bolt:stars text-xl"></div>
                          )}
                        </IconButton>

                        <SpeechRecognitionButton
                          isListening={isListening}
                          onStart={startListening}
                          onStop={stopListening}
                          disabled={isStreaming || isDisabled}
                        />
                        {chatStarted && <ClientOnly>{() => <ExportChatButton exportChat={exportChat} />}</ClientOnly>}
                      </div>
                      {input.length > 3 ? (
                        <div className="text-xs text-bolt-elements-textTertiary">
                          Use <kbd className="kdb px-1.5 py-0.5 rounded bg-bolt-elements-background-depth-2">Shift</kbd>{' '}
                          + <kbd className="kdb px-1.5 py-0.5 rounded bg-bolt-elements-background-depth-2">Return</kbd>{' '}
                          a new line
                        </div>
                      ) : null}
                      {/* <SupabaseConnection /> */}
                      <ExpoQrModal open={qrModalOpen} onClose={() => setQrModalOpen(false)} />
                    </div>
                  </div>
                  {(!isAuthorized || !userInfoData?.messagesLeft) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg z-10">
                      {!isAuthorized ? (
                        <div className="flex flex-col items-center justify-center">
                          <CustomWalletButton />
                        </div>
                      ) : (
                        <span className="text-white text-sm font-medium text-center px-4">
                          You have no messages left. Get more to continue chatting.
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </StickToBottom>
            <div className="flex flex-col justify-center">
              {/* {!chatStarted && (
                <div className="flex justify-center gap-2">
                  {ImportButtons(importChat)}
                  <GitCloneButton importChat={importChat} />
                </div>
              )} */}
              <div className="flex flex-col gap-5">
                {!chatStarted &&
                  !isDisabled &&
                  ExamplePrompts((event, messageInput) => {
                    if (isStreaming) {
                      handleStop?.();
                      return;
                    }

                    handleSendMessage?.(event, messageInput);
                  })}
                {/* {!chatStarted && <StarterTemplates />} */}
              </div>
            </div>
          </div>
          <ClientOnly>
            {() => (
              <Workbench
                actionRunner={actionRunner ?? ({} as ActionRunner)}
                chatStarted={chatStarted}
                isStreaming={isStreaming}
                postMessage={(message: string | undefined) => {
                  sendMessage?.({} as any, message);
                }}
              />
            )}
          </ClientOnly>
        </div>
        {!showWorkbench && !chatStarted && (
          <>
            <SideMenu positionClass="absolute" />
            <Footer />
          </>
        )}
      </div>
    );

    return <Tooltip.Provider delayDuration={200}>{baseChat}</Tooltip.Provider>;
  },
);

function ScrollToBottom() {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  return (
    !isAtBottom && (
      <button
        className="absolute z-50 top-[0%] translate-y-[-100%] rounded-lg left-[50%] translate-x-[-50%] px-1.5 py-0.5 flex items-center gap-2 bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor text-bolt-elements-textPrimary text-sm"
        onClick={() => scrollToBottom()}
      >
        Go to last message
        <span className="i-ph:arrow-down animate-bounce" />
      </button>
    )
  );
}
