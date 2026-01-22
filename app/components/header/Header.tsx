import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { chatStore } from '~/lib/stores/chat';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import CustomWalletButton from '../common/CustomWalletButton';
import { type CSSProperties, type PropsWithChildren, type ReactElement, type MouseEvent } from 'react';
import { Button } from '~/components/ui/Button';
import { userInfo } from '~/lib/hooks/useAuth';
import GetMessagesButton from '../chat/GetMessagesButton';
import HowItWorksButton from '../chat/HowItWorksButton';
import RewardsNavButton from '../chat/RewardsNavButton';
import LeaderboardNavButton from '../chat/LeaderboardNavButton';
import DeployTokenNavButton from '../chat/DeployTokenNavButton';
import { useNavigate, useParams } from '@remix-run/react';
import { EventBanner } from '../ui/EventBanner';
import { useGetHeavenToken } from '~/lib/hooks/tanstack/useHeaven';
import TokenInfoNavButton from '../chat/TokenInfoButton';
import MobileMenu from './MobileMenu';
import { useViewport } from '~/lib/hooks';
import MessagesPanel from './MessagesPanel';
import { useAppKitAccount } from '~/lib/hooks/useAppKitAccount.client';

export type ButtonProps = PropsWithChildren<{
  className?: string;
  disabled?: boolean;
  endIcon?: ReactElement;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  startIcon?: ReactElement;
  style?: CSSProperties;
  tabIndex?: number;
}>;

export function Header() {
  const chat = useStore(chatStore);
  const { isConnected } = useAppKitAccount();
  const user = useStore(userInfo);
  const params = useParams();
  const navigate = useNavigate();
  const tokenInfoQuery = params.id ? useGetHeavenToken(params.id) : null;
  const { isMobile } = useViewport();

  return (
    <>
      {/* <EventBanner /> */}
      {!isMobile ? (
        <>
          <header
            className={classNames('flex items-center px-2 py-2 border-b h-[var(--header-height)] justify-between', {
              'border-transparent': !chat.started,
              'border-bolt-elements-borderColor': chat.started,
            })}
          >
            <div className="flex gap-2.5">
              <Button
                onClick={() => {
                  if (chat.started) {
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

              {!chat.started && (
                <>
                  <HowItWorksButton />
                  <RewardsNavButton />
                  <LeaderboardNavButton />
                </>
              )}
              {chat.started && params.id && !tokenInfoQuery?.data && (
                <div className="h-full">
                  <DeployTokenNavButton projectId={params.id} disabled={tokenInfoQuery?.isLoading ?? true} />
                </div>
              )}
              {chat.started && params.id && tokenInfoQuery?.data && (
                <div className="h-full">
                  <TokenInfoNavButton tokenData={tokenInfoQuery.data} />
                </div>
              )}
            </div>

            {chat.started ? ( // Display ChatDescription and HeaderActionButtons only when the chat has started.
              <>
                <ClientOnly>{() => <HeaderActionButtons />}</ClientOnly>
              </>
            ) : (
              <div className="flex items-center justify-center"></div>
            )}
            <div className="flex justify-center items-center gap-2.5">
              {isConnected && user && (
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
