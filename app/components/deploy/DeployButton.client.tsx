import { useEffect, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { workbenchStore } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import { streamingState } from '~/lib/stores/streaming';
import { toast, type Id as ToastId } from 'react-toastify';
import {
  useGetAkashDeploy,
  useGetS3Deploy,
  usePostAkashDeploy,
  usePostS3Deploy,
  type IcpDeployResponse,
  type S3DeployResponse,
} from '~/lib/hooks/tanstack/useDeploy';
import { BuildService } from '~/lib/services/buildService';
import { getSandbox } from '~/lib/daytona';
import { getAimpactFs } from '~/lib/aimpactfs';
import { chatId } from '~/lib/persistence';
import { Button, buttonVariants, type ButtonProps } from '~/components/ui/Button';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

export enum DeployProviders {
  AWS = 'AWS',
  AKASH = 'Akash',
}

export const providerToIconSlug: Record<DeployProviders, string> = {
  [DeployProviders.AWS]: 'i-ph:rocket',
  [DeployProviders.AKASH]: 'i-bolt:akash',
};

interface Props {
  customVariant?: ButtonProps['variant'];
  customText?: string;
  className?: string;
}

export default function DeployButton({ customVariant, customText, className }: Props) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [activePreviewIndex] = useState(0);
  const previews = useStore(workbenchStore.previews);
  const activePreview = previews[activePreviewIndex];

  const isStreaming = useStore(streamingState);
  const [isDeploying, setIsDeploying] = useState(false);
  const [finalDeployLink, setFinalDeployLink] = useState<string>('');

  const toastIds = useRef<Set<ToastId>>(new Set());
  const deployingToastId = useRef<ToastId | null>(null);

  // TODO: Add AbortController for canceling deploy
  const buildService = useRef<BuildService>();

  const { mutateAsync: getS3DeployRequest } = useGetS3Deploy();
  const { mutateAsync: createaS3DeployRequest } = usePostS3Deploy();
  const { mutateAsync: getAkashDeployRequest } = useGetAkashDeploy();
  const { mutateAsync: createAkashDeployRequest } = usePostAkashDeploy();

  const deployStatusInterval = useRef<NodeJS.Timeout | null>(null);

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
      { autoClose: 10000 },
    );
    toastIds.current.add(toastId);
  };

  const clearDeployStatusInterval = () => {
    deployStatusInterval.current ? clearTimeout(deployStatusInterval.current) : undefined;
    deployStatusInterval.current = null;
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

  useEffect(() => {
    const currentChatId = chatId.get();
    if (!currentChatId) return;

    fetchDeployRequest({
      projectId: currentChatId,
      showError: false,
      provider: DeployProviders.AWS,
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
      if (provider === DeployProviders.AWS) {
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

      toast.success(`Your app has been successfully published!`);
    } catch (error) {
      toast.error(`Failed to publish app. Maybe you have some errors in your app's code.`);
      setIsDeploying(false);
      if (deployingToastId.current) {
        toast.dismiss(deployingToastId.current);
      }
      console.error(error);
    }
  };

  return (
    <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
      <DropdownMenuTrigger>
        <div className="flex gap-2 text-sm h-full">
          <div
            className={classNames(
              'px-4 hover:bg-bolt-elements-item-backgroundActive flex items-center gap-2 border border-bolt-elements-borderColor rounded-md m-0',
              className,
              customVariant ? buttonVariants({ variant: customVariant }) : '',
            )}
          >
            {isDeploying ? `Publishing...` : (customText ?? 'Publish')}
            <div
              className={classNames('i-ph:caret-down w-4 h-4 transition-transform', isDropdownOpen ? 'rotate-180' : '')}
            />
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>
          <button
            disabled={isDeploying || isStreaming}
            onClick={() => onDeploy(DeployProviders.AWS)}
            className="flex items-center w-full rounded-md px-4 py-2 text-sm text-gray-200 gap-2"
          >
            <div className={`${providerToIconSlug[DeployProviders.AWS]} h-6 w-6`}></div>
            <span className="mx-auto">Publish to AWS</span>
          </button>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <button
            disabled={isDeploying || isStreaming}
            onClick={() => onDeploy(DeployProviders.AKASH)}
            className="flex items-center w-full rounded-md px-4 py-2 text-sm text-gray-200 gap-2"
          >
            <div className={`${providerToIconSlug[DeployProviders.AKASH]} h-6 w-6`}></div>
            <span className="mx-auto">Publish to Akash</span>
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
