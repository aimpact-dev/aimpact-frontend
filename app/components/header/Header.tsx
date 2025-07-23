import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { chatStore } from '~/lib/stores/chat';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';
import DepositButton from '../chat/DepositButton';
import { useWallet } from '@solana/wallet-adapter-react';
import CustomWalletButton from '../common/CustomWalletButton';
import {
  type CSSProperties,
  type PropsWithChildren,
  type ReactElement,
  type MouseEvent,
} from 'react';
import { Button } from '~/components/ui/Button';
import { userInfo } from '~/lib/hooks/useAuth';
import GetMessagesButton from '../chat/GetMessagesButton';
import HowItWorksButton from '../chat/HowItWorksButton';
import RewardsNavButton from '../chat/RewardsNavButton';

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
  const { connected } = useWallet();
  const user = useStore(userInfo);

  return (
    <header
      className={classNames('flex items-center px-2 py-2 border-b h-[var(--header-height)] justify-between', {
        'border-transparent': !chat.started,
        'border-bolt-elements-borderColor': chat.started,
      })}
    >
      <div className='flex gap-2.5'>
        <a className="flex items-center gap-2 z-logo cursor-pointer" href="/projects">
          <Button
            variant="default"
            className="flex items-center gap-2 px-4 py-2 border border-[#5c5c5c40]"
          >
            View all projects
          </Button>
        </a>

        {!chat.started && (
          <>
            <HowItWorksButton />
            <RewardsNavButton />
          </>
        )}
      </div>


      {chat.started ? ( // Display ChatDescription and HeaderActionButtons only when the chat has started.
        <>
          <span className="flex-1 px-4 truncate text-center text-bolt-elements-textPrimary">
            <ClientOnly>{() => <ChatDescription />}</ClientOnly>
          </span>
          <ClientOnly>
            {() => (
              <div className="mr-1">
                <HeaderActionButtons />
              </div>
            )}
          </ClientOnly>
        </>
      ) : (
        <div className='flex items-center justify-center'>

        </div>
      )}
      <div className="flex justify-center items-center gap-2.5">
        {connected && user && (
          <>
            <div className="whitespace-nowrap text-base font-medium text-bolt-elements-textPrimary bg-bolt-elements-background rounded-md border border-bolt-elements-borderColor px-4 py-2">
              {user.messagesLeft} message{user.messagesLeft === 1 ? '' : 's'} left
            </div>

            <ClientOnly>
              {() => {
                return connected && <DepositButton discountPercent={user.discountPercent || 0} />;
              }}
            </ClientOnly>

            <GetMessagesButton />
          </>
        )}

        <ClientOnly>{() => <CustomWalletButton />}</ClientOnly>
      </div>
    </header>
  );
}
