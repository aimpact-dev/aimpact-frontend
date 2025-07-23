import { useStore } from '@nanostores/react';
import useViewport from '~/lib/hooks';
import { chatStore } from '~/lib/stores/chat';
import { workbenchStore } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { streamingState } from '~/lib/stores/streaming';
import { chatId, lastChatIdx, lastChatSummary, useChatHistory } from '~/lib/persistence';
import { toast, type Id as ToastId } from 'react-toastify';
import { useGetDeploy, usePostDeploy } from '~/lib/hooks/tanstack/useDeploy';
import { DeployService } from '~/lib/services/deployService';
import { webcontainer } from '~/lib/webcontainer';

interface HeaderActionButtonsProps {}

export function HeaderActionButtons({}: HeaderActionButtonsProps) {
  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const { showChat } = useStore(chatStore);
  const [activePreviewIndex] = useState(0);
  const previews = useStore(workbenchStore.previews);
  const activePreview = previews[activePreviewIndex];
  const [isDeploying, setIsDeploying] = useState(false);
  const isSmallViewport = useViewport(1024);
  const canHideChat = showWorkbench || !showChat;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isStreaming = useStore(streamingState);

  const publishButtonRef = useRef<HTMLButtonElement>(null);

  const { mutateAsync: getDeployRequest } = useGetDeploy();
  const { mutateAsync: createDeployRequest } = usePostDeploy();
  const [finalDeployLink, setFinalDeployLink] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const { takeSnapshot } = useChatHistory();
  const chatIdx = useStore(lastChatIdx);
  const chatSummary = useStore(lastChatSummary);

  // TODO: Add AbortController for canceling deploy
  const deployService = useRef<DeployService>();
  const toastIds = useRef<Set<ToastId>>(new Set());

  useEffect(() => {
    if (!deployService.current) {
      deployService.current = new DeployService(
        webcontainer,
      );
    }

    return () => {
      deployService.current?.cleanup?.();
    };
  }, []);

  useEffect(() => {
    return () => {
      toastIds.current.forEach(id => toast.dismiss(id));
      toastIds.current.clear();
    };
  }, []);

  const formattedLinkToast = (url: string) => {
    const toastId = toast.success(
      <div>
        Project is published. You can click to the button in the "Publish" dropdown and go to app.
        <br /> <br />
        <a href={url} target="_blank" rel="noopener noreferrer" className='underline cursor-pointer'>
          Link
        </a>
      </div>,
      { autoClose: false },
    );
    toastIds.current.add(toastId);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const currentChatId = chatId.get();
    if (!currentChatId) return;

    fetchDeployRequest({ 
      projectId: currentChatId,
      showError: false,
    });
  }, [chatId])

  const fetchDeployRequest = async ({
    projectId,
    enableMessages = true,
    showError = true,
  }: {
    projectId: string;
    enableMessages?: boolean;
    showError?: boolean;
  }) => {
    try {
      const data = await getDeployRequest(projectId);
      setFinalDeployLink(data.url);

      if (enableMessages && data.url) {
        formattedLinkToast(data.url);
      }
    } catch (error) {
      const failMessage = `Failed to publish app. Try again later.`;
      if (showError) {
        toast.error(failMessage);
        console.error(error);
      }
    }
  };

  const onDeploy = async () => {
    setIsDeploying(true);

    const toastId = toast.info('Publishing...', { autoClose: false });

    try {
      const currentChatId = chatId.get();

      if (!currentChatId) {
        toast.error('Failed to get chatId.');
        return;
      }

      if (!deployService?.current) {
        toast.error("Failed to init deploy service. Try to reload page");
        return;
      }

      const deployResult = await deployService.current.runDeployScript();
      
      console.log(deployResult);
      if (deployResult.exitCode !== 0 && deployResult.exitCode !== 143) {
        toast.error(`Failed to build. Status code: ${deployResult.exitCode}.`, { autoClose: false })
      }

      const files = workbenchStore.files.get();
      const filteredFiles = Object.fromEntries(Object.entries(files).filter(
        ([key, value]) => {
          return key.startsWith("/home/project/dist/");
        }
      ));

      const data = await createDeployRequest({
        projectId: currentChatId,
        snapshot: filteredFiles,
      });

      setFinalDeployLink(data.url);
      formattedLinkToast(data.url);
    } catch (error) {
      toast.error(`Failed to publish app. Maybe you have some errors in your app's code.`);
      console.error(error);
    } finally {
      setIsDeploying(false);
      if (toastId) {
        toast.dismiss(toastId);
      }
    }
  }

  const handleClickFinalLink = () => {
    if (finalDeployLink) {
      window.open(finalDeployLink, '_blank');
    }
  };

  const handleSaveSnapshot = async () => {
    if (!chatIdx) {
      toast.error('Failed to get chatIdx.');
      return;
    }

    setIsSaving(true);

    try {
      await takeSnapshot(chatIdx, workbenchStore.files.get(), undefined, chatSummary);
      toast.success('Project saved.');
    } catch (error) {
      toast.error('Failed to save project.');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex mr-1">
      {activePreview && (
        <Button
          active
          onClick={handleSaveSnapshot}
          disabled={isSaving || !activePreview || isStreaming}
          className="px-4 mr-4 hover:bg-bolt-elements-item-backgroundActive flex items-center gap-2 bg-bolt-elements-item-backgroundAccent border border-bolt-elements-borderColor rounded-md"
        >
          {isSaving ? (
            <>
              <div className="i-ph-spinner animate-spin h-4 w-4" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <div className="i-ph-download-simple h-4 w-4" />
              <span>Save</span>
            </>
          )}
        </Button>
      )}

      <div className="relative" ref={dropdownRef}>
        <div className="flex gap-2 mr-4 text-sm h-full">
            <Button
              active
              disabled={isDeploying || !activePreview || isStreaming}
              ref={publishButtonRef}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="px-4 hover:bg-bolt-elements-item-backgroundActive flex items-center gap-2
                border border-bolt-elements-borderColor rounded-md m-0"
            >
              {isDeploying ? `Publishing...` : 'Publish'}
              <div
                className={classNames('i-ph:caret-down w-4 h-4 transition-transform', isDropdownOpen ? 'rotate-180' : '')}
              />
            </Button>
        </div>

        {isDropdownOpen && (
          <div className="absolute right-2 flex flex-col gap-1 z-50 p-1 mt-1 min-w-[13.5rem] bg-bolt-elements-background-depth-2 rounded-md shadow-lg bg-bolt-elements-backgroundDefault border border-bolt-elements-borderColor">
            <Button
              disabled={isDeploying || !activePreview || isStreaming}
              onClick={onDeploy}
              className="flex items-center w-full rounded-md px-4 py-2 text-sm text-gray-200 gap-2"
            >
              <div className="i-ph:rocket h-[28px] w-[28px]"></div>
              <span className="mx-auto">Publish project</span>
            </Button>

            <Button
              disabled={!finalDeployLink}
              onClick={handleClickFinalLink}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-200 gap-2 rounded-md"
            >
              <div className="i-ph:arrow-square-out w-6 h-6"></div>
              <span className="mx-auto">Project link</span>
            </Button>
          </div>
        )}
      </div>
      <div className="flex border border-bolt-elements-borderColor rounded-md overflow-hidden mr-3">
        <Button
          active={showChat}
          disabled={!canHideChat || isSmallViewport} // expand button is disabled on mobile as it's not needed
          onClick={() => {
            if (canHideChat) {
              chatStore.setKey('showChat', !showChat);
            }
          }}
        >
          <div className="i-bolt:chat text-sm" />
        </Button>
        <div className="w-[1px] bg-bolt-elements-borderColor" />
        <Button
          active={showWorkbench}
          onClick={() => {
            if (showWorkbench && !showChat) {
              chatStore.setKey('showChat', true);
            }

            workbenchStore.showWorkbench.set(!showWorkbench);
          }}
        >
          <div className="i-ph:code-bold" />
        </Button>
      </div>
    </div>
  );
}

interface ButtonProps {
  active?: boolean;
  disabled?: boolean;
  children?: any;
  onClick?: VoidFunction;
  className?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ active = false, disabled = false, children, onClick, className }, ref) => {
    return (
      <button
        ref={ref}
        className={classNames(
          'flex items-center p-1.5',
          {
            'bg-bolt-elements-item-backgroundDefault text-bolt-elements-textTertiary': !active && !disabled,
            'hover:bg-bolt-elements-item-backgroundActive hover:text-bolt-elements-textPrimary':
              !active && !disabled,
            'bg-bolt-elements-item-backgroundAccent text-bolt-elements-item-contentAccent': active && !disabled,
            'bg-bolt-elements-item-backgroundDefault text-alpha-gray-20 dark:text-alpha-white-20 cursor-not-allowed':
              disabled,
          },
          className,
        )}
        disabled={disabled}
        onClick={onClick}
      >
        {children}
      </button>
    )
  }
)
