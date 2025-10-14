import { useStore } from '@nanostores/react';
import useViewport from '~/lib/hooks';
import { chatStore } from '~/lib/stores/chat';
import { workbenchStore } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { streamingState } from '~/lib/stores/streaming';
import { chatId, lastChatIdx, lastChatSummary, useChatHistory } from '~/lib/persistence';
import { toast, type Id as ToastId } from 'react-toastify';
import {
  useGetIcpDeploy,
  useGetS3Deploy,
  usePostIcpDeploy,
  usePostS3Deploy,
  usePostAkashDeploy,
  useGetAkashDeploy,
  type IcpDeployResponse,
  type PostDeployResponse,
  type S3DeployResponse,
} from '~/lib/hooks/tanstack/useDeploy';
import { Tooltip } from '../chat/Tooltip';
import { BuildService } from '~/lib/services/buildService';
import { getSandbox } from '~/lib/daytona';
import { getAimpactFs } from '~/lib/aimpactfs';
import { TwitterShareButton } from '../ui/TwitterShareButton';
import { useDeploymentQuery } from 'query/use-project-query';

interface HeaderActionButtonsProps {}
enum DeployProviders {
  ICP = 'ICP',
  AWS = 'AWS',
  AKASH = 'Akash',
}
enum Methods {
  GET = 'GET',
  DEPLOY = 'DEPLOY',
}

const providerToIconSlug: Record<DeployProviders, string> = {
  [DeployProviders.AWS]: 'i-ph:rocket',
  [DeployProviders.ICP]: 'i-bolt:icp-solid',
  [DeployProviders.AKASH]: 'i-bolt:akash',
};

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

  const { mutateAsync: getIcpDeployRequest } = useGetIcpDeploy();
  const { mutateAsync: createIcpDeployRequest } = usePostIcpDeploy();
  const { mutateAsync: getS3DeployRequest } = useGetS3Deploy();
  const { mutateAsync: createaS3DeployRequest } = usePostS3Deploy();
  const { mutateAsync: getAkashDeployRequest } = useGetAkashDeploy();
  const { mutateAsync: createAkashDeployRequest } = usePostAkashDeploy();
  const [finalDeployLink, setFinalDeployLink] = useState<string>('');
  const deployStatusInterval = useRef<NodeJS.Timeout | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { takeSnapshot } = useChatHistory();
  const chatIdx = useStore(lastChatIdx);
  const chatSummary = useStore(lastChatSummary);

  // TODO: Add AbortController for canceling deploy
  const buildService = useRef<BuildService>();
  const toastIds = useRef<Set<ToastId>>(new Set());
  const deployingToastId = useRef<ToastId | null>(null);

  const s3Url = useDeploymentQuery(chatId.get(), 's3').data;
  const icpUrl = useDeploymentQuery(chatId.get(), 'icp').data;
  const akashUrl = useDeploymentQuery(chatId.get(), 'akash').data;

  const deployUrls = [
    s3Url && { name: 'S3', url: s3Url },
    icpUrl && { name: 'ICP', url: icpUrl },
    akashUrl && { name: 'Akash', url: akashUrl },
  ].filter(Boolean) as { name: string; url: string }[];

  const clearDeployStatusInterval = () => {
    deployStatusInterval.current ? clearTimeout(deployStatusInterval.current) : undefined;
    deployStatusInterval.current = null;
    console.log('Deploy status and interval', deployStatusInterval);
  };

  useEffect(() => {
    if (!buildService.current) {
      buildService.current = new BuildService(
        Promise.resolve(workbenchStore.getMainShell),
        getSandbox(),
        getAimpactFs(),
      );
    }

    return () => {};
  }, []);

  useEffect(() => {
    return () => {
      toastIds.current.forEach((id) => toast.dismiss(id));
      toastIds.current.clear();
    };
  }, []);

  const formattedLinkToast = (url: string, provider: DeployProviders) => {
    const toastId = toast.success(
      <div>
        Project is published to <b>{provider}</b>. You can click to the button in the "Publish" dropdown and go to app
        by link or just click link here.
        <br /> <br />
        <a href={url} target="_blank" rel="noopener noreferrer" className="underline cursor-pointer">
          <b>Link</b>
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
      provider: DeployProviders.AWS,
    });
    fetchDeployRequest({
      projectId: currentChatId,
      showError: false,
      provider: DeployProviders.ICP,
    });

    return clearDeployStatusInterval;
  }, [chatId]);

  const fetchDeployRequest = async ({
    projectId,
    provider,
    enableMessages = true,
    showError = true,
  }: {
    projectId: string;
    provider: DeployProviders;
    enableMessages?: boolean;
    showError?: boolean;
  }) => {
    try {
      let url: string;
      if (provider === DeployProviders.ICP) {
        const data = await getIcpDeployRequest(projectId, {
          onError: () => {
            console.error(`ICP project not found (${projectId})`);
          },
        });
        url = data.finalUrl;
      } else if (provider === DeployProviders.AWS) {
        const data = await getS3DeployRequest(projectId, {
          onError: () => {
            console.error(`AWS project not found (${projectId})`);
          },
        });
        url = data.url;
      } else if (provider === DeployProviders.AKASH) {
        const data = await getAkashDeployRequest(projectId);
        url = data.url;
      } else {
        throw new Error('Invalid provider');
      }
      setFinalDeployLink(url);

      if (url) {
        if (deployingToastId.current) {
          toast.dismiss(deployingToastId.current);
        }
        clearDeployStatusInterval();
        setIsDeploying(false);
      }
      if (enableMessages && url) {
        formattedLinkToast(url, provider);
      }
    } catch (error) {
      const failMessage = `Failed to publish app. Try again later.`;
      clearDeployStatusInterval();
      setIsDeploying(false);
      if (showError) {
        toast.error(failMessage);
        console.error(error);
      }
    }
  };

  const onDeploy = async (provider: DeployProviders) => {
    setIsDeploying(true);

    const toastId = toast.info('Publishing...', { autoClose: false });

    try {
      const currentChatId = chatId.get();

      if (!currentChatId) {
        toast.error('Failed to get chatId.');
        return;
      }

      if (!buildService?.current) {
        toast.error('Failed to init deploy service. Try to reload page');
        return;
      }

      const buildResult = await buildService.current.runBuildScript('pnpm');

      if (buildResult.exitCode !== 0 && buildResult.exitCode !== 143) {
        toast.error(`Failed to build. Status code: ${buildResult.exitCode}.`, { autoClose: false });
        setIsDeploying(false);
      }
      if (!buildResult.fileMap) {
        toast.error(`Failed to build. No files found in the build directory.`);
        return;
      }

      let data: IcpDeployResponse | S3DeployResponse;
      let url: string;
      if (provider === DeployProviders.AWS) {
        data = await createaS3DeployRequest({
          projectId: currentChatId,
          snapshot: buildResult.fileMap,
        });
        url = data.url;
        formattedLinkToast(url, provider);
        setIsDeploying(false);
        toast.dismiss(toastId);
      } else if (provider === DeployProviders.ICP) {
        data = await createIcpDeployRequest({
          projectId: currentChatId,
          snapshot: buildResult.fileMap,
        });
        clearDeployStatusInterval();
        deployStatusInterval.current = setInterval(
          async () => await fetchDeployRequest({ projectId: currentChatId, provider }),
          5000,
        );
        url = data.url;
        if (deployingToastId.current) {
          toast.dismiss(deployingToastId.current);
        }
        deployingToastId.current = toastId;
      } else if (provider === DeployProviders.AKASH) {
        data = await createAkashDeployRequest({
          projectId: currentChatId,
          snapshot: buildResult.fileMap,
        });
        clearDeployStatusInterval();
        deployStatusInterval.current = setInterval(
          async () => await fetchDeployRequest({ projectId: currentChatId, provider }),
          5000,
        );
        url = data.url;
        if (deployingToastId.current) {
          toast.dismiss(deployingToastId.current);
        }
        deployingToastId.current = toastId;
      } else if (provider === DeployProviders.AKASH) {
        data = await createAkashDeployRequest({
          projectId: currentChatId,
          snapshot: buildResult.fileMap,
        });
        clearDeployStatusInterval();
        deployStatusInterval.current = setInterval(
          async () => await fetchDeployRequest({ projectId: currentChatId, provider }),
          5000,
        );
        url = data.url;
        if (deployingToastId.current) {
          toast.dismiss(deployingToastId.current);
        }
        deployingToastId.current = toastId;
      } else {
        throw new Error('Invalid provider');
      }

      setFinalDeployLink(url);
    } catch (error) {
      toast.error(`Failed to publish app. Maybe you have some errors in your app's code.`);
      setIsDeploying(false);
      if (deployingToastId.current) {
        toast.dismiss(deployingToastId.current);
      }
      console.error(error);
    }
  };

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
    <div className="flex gap-2 mr-1">
      <Tooltip
        content={
          (isSaving && 'Saving...') ||
          (!activePreview && 'Run a project before saving') ||
          (isStreaming && 'Wait until streaming ends') ||
          'Save current project'
        }
        side="bottom"
      >
        <Button
          active
          onClick={handleSaveSnapshot}
          disabled={isSaving || !activePreview || isStreaming}
          className="text-sm px-4 py-2 hover:bg-bolt-elements-item-backgroundActive flex items-center gap-2 bg-bolt-elements-item-backgroundAccent border border-bolt-elements-borderColor rounded-md"
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
      </Tooltip>

      <div className="relative" ref={dropdownRef}>
        <div className="flex gap-2 text-sm h-full">
          <Button
            active
            // disabled={isDeploying || !activePreview || isStreaming}
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
          <div className="absolute right-2 flex flex-col gap-1 z-50 p-1 mt-1 min-w-[15rem] bg-bolt-elements-background-depth-2 rounded-md shadow-lg bg-bolt-elements-backgroundDefault border border-bolt-elements-borderColor">
            <Button
              disabled={isDeploying || !activePreview || isStreaming}
              onClick={() => onDeploy(DeployProviders.AWS)}
              className="flex items-center w-full rounded-md px-4 py-2 text-sm text-gray-200 gap-2"
            >
              <div className={`${providerToIconSlug[DeployProviders.AWS]} h-6 w-6`}></div>
              <span className="mx-auto">Publish to AWS</span>
            </Button>

            <Button
              disabled={isDeploying || !activePreview || isStreaming}
              onClick={() => onDeploy(DeployProviders.ICP)}
              className="flex items-center w-full rounded-md px-4 py-2 text-sm text-gray-200 gap-2"
            >
              <div className={`${providerToIconSlug[DeployProviders.ICP]} h-6 w-6`}></div>
              <span className="mx-auto">Publish to ICP</span>
            </Button>

            <Button
              disabled={isDeploying || !activePreview || isStreaming}
              onClick={() => onDeploy(DeployProviders.AKASH)}
              className="flex items-center w-full rounded-md px-4 py-2 text-sm text-gray-200 gap-2"
            >
              <div className={`${providerToIconSlug[DeployProviders.AKASH]} h-6 w-6`}></div>
              <span className="mx-auto">Publish to Akash</span>
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
        <Tooltip content={showChat ? 'Hide chat' : 'Show chat'} side="bottom">
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
        </Tooltip>
        <div className="w-[1px] bg-bolt-elements-borderColor" />
        <Tooltip content={showWorkbench ? 'Hide workbench' : 'Show workbench'} side="bottom">
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
        </Tooltip>
      </div>
      <div>
        <TwitterShareButton withLabel deployUrls={deployUrls} />
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
  onMouseEnter?: React.MouseEventHandler<HTMLButtonElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLButtonElement>;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ active = false, disabled = false, children, onClick, className, onMouseEnter, onMouseLeave, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={classNames(
          'flex items-center p-1.5',
          {
            'bg-bolt-elements-item-backgroundDefault text-bolt-elements-textTertiary': !active && !disabled,
            'hover:bg-bolt-elements-item-backgroundActive hover:text-bolt-elements-textPrimary': !active && !disabled,
            'bg-bolt-elements-item-backgroundAccent text-bolt-elements-item-contentAccent': active && !disabled,
            'bg-bolt-elements-item-backgroundDefault text-alpha-gray-20 dark:text-alpha-white-20 cursor-not-allowed':
              disabled,
          },
          className,
        )}
        disabled={disabled}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        {...props}
      >
        {children}
      </button>
    );
  },
);
