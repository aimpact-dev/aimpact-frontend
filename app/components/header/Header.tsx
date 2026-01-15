import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { chatStore } from '~/lib/stores/chat';
import { classNames } from '~/utils/classNames';
import { useWallet } from '@solana/wallet-adapter-react';
import CustomWalletButton from '../common/CustomWalletButton';
import { type CSSProperties, type PropsWithChildren, type ReactElement, type MouseEvent } from 'react';
import { Button } from '~/components/ui/Button';
import { userInfo } from '~/lib/hooks/useAuth';
import HowItWorksButton from '../chat/HowItWorksButton';
import RewardsNavButton from '../chat/RewardsNavButton';
import LeaderboardNavButton from '../chat/LeaderboardNavButton';
import { useNavigate, useParams } from '@remix-run/react';
import { EventBanner } from '../ui/EventBanner';
import { useGetHeavenToken } from '~/lib/hooks/tanstack/useHeaven';
import TokenInfoNavButton from '../chat/TokenInfoButton';
import MobileMenu from './MobileMenu';
import { useViewport } from '~/lib/hooks';
import MessagesPanel from './MessagesPanel';
import { cn } from '~/lib/utils';
import { workbenchStore } from '~/lib/stores/workbench';

export type ButtonProps = PropsWithChildren<{
  className?: string;
  disabled?: boolean;
  endIcon?: ReactElement;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  startIcon?: ReactElement;
  style?: CSSProperties;
  tabIndex?: number;
}>;

type EditorMode = 'chat' | 'code';

export function Header() {
  const { connected } = useWallet();
  const user = useStore(userInfo);
  const navigate = useNavigate();
  const { isMobile, isSmallViewport } = useViewport();
  const isModeUsed = !isMobile && isSmallViewport;

  const { started: chatStarted, showChat } = useStore(chatStore);
  const showWorkbench = useStore(workbenchStore.showWorkbench);

  // for devices larger than mobile and smaller than 1024px
  const mode: EditorMode = showWorkbench ? 'code' : 'chat';

  const setMode = (nextMode: EditorMode) => {
    chatStore.setKey('showChat', nextMode === 'chat');
    workbenchStore.setShowWorkbench(nextMode === 'code');
  };

  return (
    <>
      {/* <EventBanner /> */}
      {!isMobile ? (
        <>
          <header
            className={classNames('flex items-center px-2 py-2 border-b h-[var(--header-height)] justify-between', {
              'border-transparent': !chatStarted,
              'border-bolt-elements-borderColor': chatStarted,
            })}
          >
            <div className="flex gap-2.5">
              <Button
                onClick={() => {
                  if (chatStarted) {
                    window.location.href = '/projects';
                  } else {
                    navigate('/projects');
                  }
                }}
                variant="default"
                className="flex items-center gap-2 px-4 py-2 border border-[#5c5c5c40]"
              >
                View all projects
              </Button>

              {!chatStarted && (
                <>
                  <HowItWorksButton />
                  <RewardsNavButton />
                  <LeaderboardNavButton />
                </>
              )}
            </div>

            {isModeUsed && (
              <div className="flex bg-bolt-elements-button-primary-background p-1 rounded-3xl">
                <button
                  type="button"
                  onClick={() => setMode('chat')}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-3xl text-sm transition-colors duration-200',
                    mode === 'chat'
                      ? 'bg-bolt-elements-background-depth-4 text-bolt-elements-textPrimary shadow-sm'
                      : 'text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary',
                  )}
                >
                  <div className="i-bolt:chat w-4 h-4" />
                  Chat
                </button>

                <button
                  type="button"
                  onClick={() => setMode('code')}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-3xl text-sm transition-colors duration-200',
                    mode === 'code'
                      ? 'bg-bolt-elements-background-depth-4 text-bolt-elements-textPrimary shadow-sm'
                      : 'text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary',
                  )}
                >
                  <div className="i-ph:code-bold w-4 h-4" />
                  Code
                </button>
              </div>
            )}

            <div className="flex justify-center items-center gap-2.5">
              {connected && user && (
                <>
                  <MessagesPanel />
                </>
              )}

              <ClientOnly>{() => <CustomWalletButton />}</ClientOnly>
            </div>
          </header>
        </>
      ) : (
        <MobileMenu />
      )}
    </>
  );
}
