import { useStore } from '@nanostores/react';
import useViewport from '~/lib/hooks';
import { chatStore } from '~/lib/stores/chat';
import { workbenchStore } from '~/lib/stores/workbench';
import { chatId } from '~/lib/persistence';
import { Tooltip } from '../chat/Tooltip';
import { TwitterShareButton } from '../ui/TwitterShareButton';
import { useDeploymentQuery } from 'query/use-project-query';
import DeployButton from '../deploy/DeployButton.client';
import { HeaderActionButton } from './HeaderActionButton';

export function HeaderActionButtons() {
  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const { showChat } = useStore(chatStore);

  const isSmallViewport = useViewport(1024);
  const canHideChat = showWorkbench || !showChat;

  const s3Url = useDeploymentQuery(chatId.get(), 's3').data;
  const icpUrl = useDeploymentQuery(chatId.get(), 'icp').data;
  const akashUrl = useDeploymentQuery(chatId.get(), 'akash').data;

  const deployUrls = [
    s3Url && { name: 'S3', url: s3Url },
    icpUrl && { name: 'ICP', url: icpUrl },
    akashUrl && { name: 'Akash', url: akashUrl },
  ].filter(Boolean) as { name: string; url: string }[];

  return (
    <div className="flex gap-2">
      <DeployButton isHeaderActionButton />
      <div className="flex border border-bolt-elements-borderColor rounded-md overflow-hidden">
        <Tooltip content={showChat ? 'Hide chat' : 'Show chat'} side="bottom">
          <HeaderActionButton
            active={showChat}
            disabled={!canHideChat || isSmallViewport} // expand button is disabled on mobile as it's not needed
            onClick={() => {
              if (canHideChat) {
                chatStore.setKey('showChat', !showChat);
              }
            }}
          >
            <div className="i-bolt:chat text-sm" />
          </HeaderActionButton>
        </Tooltip>
        <div className="w-[1px] bg-bolt-elements-borderColor" />
        <Tooltip content={showWorkbench ? 'Hide workbench' : 'Show workbench'} side="bottom">
          <HeaderActionButton
            active={showWorkbench}
            onClick={() => {
              if (showWorkbench && !showChat) {
                chatStore.setKey('showChat', true);
              }

              workbenchStore.showWorkbench.set(!showWorkbench);
            }}
          >
            <div className="i-ph:code-bold" />
          </HeaderActionButton>
        </Tooltip>
      </div>
      <div>
        <TwitterShareButton deployUrls={deployUrls} />
      </div>
    </div>
  );
}
