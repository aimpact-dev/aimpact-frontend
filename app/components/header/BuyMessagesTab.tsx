import { useNavigation } from '@remix-run/react';
import { Badge, Button, Card } from '../ui';
import { twMerge } from 'tailwind-merge';
import { useAppKitProvider } from '@reown/appkit/react';
import type { Provider } from '@reown/appkit-adapter-solana/react';
import { useSolanaProxy } from '~/lib/hooks/api-hooks/useSolanaProxyApi';
import { useStore } from '@nanostores/react';
import { userInfo } from '~/lib/hooks/useAuth';
import Cookies from 'js-cookie';
import { toast } from 'react-toastify';
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { useAppKitAccount } from '~/lib/hooks/useAppKitAccount.client';

const BASE_MESSAGE_COUNT = 10;
const MESSAGE_PRICE_IN_SOL = Number(import.meta.env.VITE_PRICE_PER_MESSAGE_IN_SOL);

export default function BuyMessagesTab() {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const userDiscountPercent = useStore(userInfo)?.discountPercent ?? 0;

  const hasDiscount = userDiscountPercent && userDiscountPercent > 0;
  const discountedMessageCount = hasDiscount
    ? Math.floor(BASE_MESSAGE_COUNT / (1 - userDiscountPercent / 100))
    : BASE_MESSAGE_COUNT;

  const multiplier = hasDiscount
    ? parseFloat((discountedMessageCount / BASE_MESSAGE_COUNT).toFixed(2)).toString()
    : null;

  const { isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider<Provider>('solana');
  const { getRecentBlockhash, sendTransaction } = useSolanaProxy();

  const publicKey = walletProvider.publicKey;

  const handlePurchase = async () => {
    if (!isConnected || !publicKey) {
      toast.error('Please connect your wallet to purchase messages.');
      return;
    }

    const authToken = Cookies.get('authToken');
    if (!authToken) {
      toast.error('You need to be logged in to purchase messages.');
      return;
    }

    let blockhash, lastValidBlockHeight;

    try {
      const data = await getRecentBlockhash();
      blockhash = data.blockhash;
      lastValidBlockHeight = data.lastValidBlockHeight;
    } catch (err) {
      toast.error('Failed to prepare transaction. Please try again.');
      return;
    }

    try {
      const transaction = new Transaction({
        blockhash,
        lastValidBlockHeight,
        feePayer: publicKey,
      }).add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(import.meta.env.VITE_DEPOSIT_ADDRESS),
          lamports: MESSAGE_PRICE_IN_SOL * BASE_MESSAGE_COUNT * LAMPORTS_PER_SOL,
        }),
      );

      const signedTransaction = await walletProvider.signTransaction(transaction);
      const serializedTransaction = (signedTransaction as Transaction).serialize();
      const base64 = Buffer.from(serializedTransaction).toString('base64');

      await sendTransaction(base64);

      (window as any).plausible?.('purchase_messages', {
        props: {
          message_count: BASE_MESSAGE_COUNT,
          purchase_messages_success: true,
          error: null,
        },
      });

      toast.success('Purchase completed!');
    } catch (err) {
      console.error('Transaction error:', err);

      if (
        err instanceof Error &&
        (err.message.includes('User rejected') || err.message.includes('rejected') || err.message.includes('cancelled'))
      ) {
        (window as any).plausible?.('purchase_messages', {
          props: {
            message_count: BASE_MESSAGE_COUNT,
            purchase_messages_success: false,
            error: 'Sign transaction failed',
          },
        });
        return;
      }

      (window as any).plausible?.('purchase_messages', {
        props: {
          message_count: BASE_MESSAGE_COUNT,
          purchase_messages_success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        },
      });

      toast.error('Transaction failed. Please try again.');
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-3 p-2">
      <Card
        key="buy-messages"
        variant="accented"
        className="!bg-[#1E1E1E] p-6 flex flex-col  overflow-visible justify-between items-center m-1 !border-bolt-elements-borderColorActive flex-1
        before:content-[''] before:absolute before:inset-[-2px] before:rounded-[inherit]
        before:bg-gradient-to-br before:from-purple-700/70 before:to-accent-700 before:blur-[8px] before:-z-10 before:animate-pulse"
      >
        <div>
          <Badge variant="primary" className="mb-2">
            Instant access
          </Badge>
          <h3 className="text-xl font-semibold text-white mb-2">Purchase messages</h3>
          <p className="text-gray-300 text-sm md:text-base mb-4">
            Get{' '}
            {hasDiscount ? (
              <>
                <span className="line-through">{BASE_MESSAGE_COUNT}</span>{' '}
                <span className="font-bold">{discountedMessageCount}</span>
                {multiplier && (
                  <span className="text-green-600 font-semibold text-xs align-text-top">(x{multiplier})</span>
                )}
              </>
            ) : (
              BASE_MESSAGE_COUNT
            )}{' '}
            messages instantly to start using the app
          </p>
          <p className="text-center text-3xl md:text-4xl text-white m-5 md:m-10">
            <b>{MESSAGE_PRICE_IN_SOL * BASE_MESSAGE_COUNT}</b>
            <span className="text-sm align-text-baseline">SOL</span>
          </p>
          <Button className="w-full" onClick={handlePurchase} disabled={isSubmitting || !isConnected}>
            <div
              className={twMerge(
                'color-accent-500 size-5',
                isSubmitting ? 'i-ph:spinner-gap animate-spin' : 'i-ph:basket',
              )}
            ></div>

            {isSubmitting ? 'Processing...' : 'Buy Now'}
          </Button>
        </div>
      </Card>
      <Card
        key="buy-subscription"
        variant="accented"
        className="p-6 flex  flex-col justify-between items-center m-1 flex-1"
      >
        <div>
          <Badge variant="info" className="mb-2">
            Unlimited
          </Badge>
          <h3 className="text-xl font-semibold text-white mb-2">Get subscription</h3>
          <p className="text-gray-300 mb-4 text-sm md:text-base">Unlock access to unlimited use of AImpact</p>
          <p className="text-center text-xl text-white mt-10 font-bold">Coming soon...</p>
          <p className="text-gray-500 text-sm mb-4">We're working on it</p>
        </div>
      </Card>
    </div>
  );
}
