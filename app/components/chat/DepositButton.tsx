import { useEffect, useState } from 'react';
import { useNavigation } from '@remix-run/react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { toast } from 'react-toastify';
import { Button } from '../ui';
import { useSolanaProxy } from '~/lib/hooks/api-hooks/useSolanaProxyApi';
import { classNames } from '~/utils/classNames';
import waterStyles from '../ui/WaterButton.module.scss';
import { Tooltip } from './Tooltip';

const MESSAGE_PRICE_IN_SOL = Number(import.meta.env.VITE_PRICE_PER_MESSAGE_IN_SOL);

interface DepositButtonProps {
  discountPercent?: number;
}

export default function DepositButton({ discountPercent }: DepositButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigation = useNavigation();
  const { publicKey, sendTransaction } = useWallet();
  const { getRecentBlockhash } = useSolanaProxy();
  const detectMobileScreen = () => {
    return window.innerWidth <= 768;
  };

  const isSubmitting = navigation.state === 'submitting';

  const baseMessageCount = 10;
  const hasDiscount = discountPercent && discountPercent > 0;
  const discountedMessageCount = hasDiscount
    ? Math.floor(baseMessageCount / (1 - discountPercent / 100))
    : baseMessageCount;

  const multiplier = hasDiscount
    ? parseFloat((discountedMessageCount / baseMessageCount).toFixed(2)).toString()
    : null;

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handlePurchase = async () => {
    if (!publicKey || !sendTransaction) {
      return;
    }

    // 1. Fetch recent blockhash and lastValidBlockHeight from backend
    let blockhash, lastValidBlockHeight;

    try {
      const data = await getRecentBlockhash();
      blockhash = data.blockhash;
      lastValidBlockHeight = data.lastValidBlockHeight;
    } catch (err) {
      return;
    }

    // 2. Build transaction using new TransactionBlockhashCtor
    let transaction = new Transaction({
      blockhash,
      lastValidBlockHeight,
      feePayer: publicKey,
    }).add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: new PublicKey(import.meta.env.VITE_DEPOSIT_ADDRESS),
        lamports: MESSAGE_PRICE_IN_SOL * baseMessageCount * LAMPORTS_PER_SOL,
      }),
    );

    // public rpc connection
    const connection = new Connection('https://api.mainnet-beta.solana.com');

    // 3. Send transaction with wallet
    try {
      await sendTransaction(transaction, connection);

      (window as any).plausible('purchase_messages', { props: {
        message_count: baseMessageCount,
        purchase_messages_success: true,
        error: null,
      }
    });

    setIsOpen(false);
    toast.success('Purchase completed!');
    } catch (err) {
      if (err instanceof Error && err.message.includes('User rejected the request')) {
        (window as any).plausible('purchase_messages', { props: {
            message_count: baseMessageCount,
            purchase_messages_success: false,
            error: 'Sign transaction failed',
          }
        });
      return;
      }

      toast.error('Transaction failed. Please try again.');
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <Tooltip content="Buy some messages for SOL">
        <Button onClick={handleToggle} variant="default" className="flex py-2.5 items-center gap-2 border border-bolt-elements-borderColor font-medium">
          Buy Messages
        </Button>
      </Tooltip>

      {isOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex relative items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" onClick={handleToggle}></div>
            <div className="inline-block overflow-hidden text-left align-bottom transition-all transform border-2 border-bolt-elements-borderColor rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <button
                onClick={handleToggle}
                className="flex absolute right-0 items-center justify-center w-8 h-8 rounded-full bg-transparent hover:bg-gray-500/10 dark:hover:bg-gray-500/20 group transition-all duration-200"
              >
                <div className="i-ph:x w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-gray-500 transition-colors" />
              </button>

              <div className="px-4 py-5 sm:p-6 bg-bolt-elements-background bg-bolt-elements-background-depth-3">
                <div className="text-center">
                  <h3 className="text-2xl font-bold mb-4">Purchase Messages</h3>
                  <p className="text-xl mb-6">
                    Get{" "}
                    {hasDiscount ? (
                      <>
                        <span className="font-semibold line-through text-gray-400">{baseMessageCount}</span>
                        <span className="mx-1" />
                        <span className="font-semibold text-white">{discountedMessageCount}</span>
                        {multiplier && (
                          <span className="text-green-400 font-semibold ml-1">
                            (x{multiplier})
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="font-semibold">{baseMessageCount}</span>
                    )}{" "}
                    messages for{" "}
                    <span className="font-semibold">{MESSAGE_PRICE_IN_SOL * baseMessageCount} SOL</span>
                  </p>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handlePurchase}
                      disabled={isSubmitting || !publicKey}
                      className={classNames(
                        'relative overflow-hidden w-full px-6 py-3 text-lg font-medium text-white rounded-md',
                        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        'transition-all duration-300',
                        waterStyles.waterButton,
                        waterStyles.purple,
                      )}
                    >
                      <div className={waterStyles.effectLayer}>
                        <div className={waterStyles.waterDroplets}></div>
                        <div className={waterStyles.waterSurface}></div>
                      </div>
                      <div className={waterStyles.buttonContent}>
                        {isSubmitting ? 'Processing...' : 'Purchase Now'}
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
