import { useEffect, useState, type FormEvent } from 'react';
import { useNavigation } from '@remix-run/react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { toast } from 'react-toastify';
import { Button } from '../ui';
import { useSolanaProxy } from '~/lib/hooks/api-hooks/useSolanaProxyApi';
import { useApplyPromocode } from '~/lib/hooks/tanstack/useMessages';
import { classNames } from '~/utils/classNames';
import waterStyles from '../ui/WaterButton.module.scss';
import { Tooltip } from './Tooltip';
import Cookies from 'js-cookie';

const MESSAGE_PRICE_IN_SOL = Number(import.meta.env.VITE_PRICE_PER_MESSAGE_IN_SOL);

interface DepositButtonProps {
  discountPercent?: number;
  isMobile?: boolean;
}

export default function DepositButton({ discountPercent, isMobile = false }: DepositButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [promocode, setPromocode] = useState('');
  const [promocodeApplied, setPromocodeApplied] = useState(false);
  const [error, setError] = useState('');
  const navigation = useNavigation();
  const { publicKey, signTransaction } = useWallet();
  const { getRecentBlockhash, sendTransaction } = useSolanaProxy();
  const { mutateAsync: applyPromocode } = useApplyPromocode();

  const isSubmitting = navigation.state === 'submitting';

  const baseMessageCount = 10;
  const hasDiscount = discountPercent && discountPercent > 0;
  const discountedMessageCount = hasDiscount
    ? Math.floor(baseMessageCount / (1 - discountPercent / 100))
    : baseMessageCount;

  const multiplier = hasDiscount ? parseFloat((discountedMessageCount / baseMessageCount).toFixed(2)).toString() : null;

  const handleToggle = () => {
    setIsOpen(!isOpen);
    setPromocode('');
    setPromocodeApplied(false);
    setError('');
  };

  const handlePromocodeInput = (event: FormEvent<HTMLInputElement>) => {
    setPromocode(event.currentTarget.value.toUpperCase());
    setPromocodeApplied(false);
    setError('');
  };

  const handleApplyPromocode = async () => {
    setError('');

    if (!promocode) {
      setError('Promocode is required.');
      return;
    }

    try {
      const response = await applyPromocode({ promocode });
      const messagesApplied = response.messagesApplied;
      toast.success(`Promocode applied! You got ${messagesApplied} free messages!`);
      (window as any).plausible('apply_promocode', {
        props: {
          success: true,
          messages_applied: messagesApplied,
          promocode: promocode,
          error: null,
        },
      });
      setPromocodeApplied(true);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message;
      toast.error(errorMessage);
      setError(errorMessage);
      (window as any).plausible('apply_promocode', {
        props: {
          success: false,
          messages_applied: 0,
          promocode: promocode,
          error: `Failed due to server error: ${errorMessage}`,
        },
      });
    }
  };

  const handlePurchase = async () => {
    if (!publicKey || !sendTransaction || !signTransaction) {
      return;
    }

    // 1. Fetch recent blockhash and lastValidBlockHeight from backend
    let blockhash, lastValidBlockHeight;
    const authToken = Cookies.get('authToken');
    if (!authToken) {
      toast.error('You need to be logged in to purchase messages.');
      return;
    }

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

    const signedTransaction = await signTransaction(transaction);
    const serializedTransaction = signedTransaction.serialize();
    const base64 = Buffer.from(serializedTransaction).toString('base64');

    // 3. Send transaction with wallet
    try {
      await sendTransaction(base64);
      (window as any).plausible('purchase_messages', {
        props: {
          message_count: baseMessageCount,
          purchase_messages_success: true,
          error: null,
        },
      });

      setIsOpen(false);
      toast.success('Purchase completed!');
    } catch (err) {
      if (err instanceof Error && err.message.includes('User rejected the request')) {
        (window as any).plausible('purchase_messages', {
          props: {
            message_count: baseMessageCount,
            purchase_messages_success: false,
            error: 'Sign transaction failed',
          },
        });
        return;
      }

      toast.error('Transaction failed. Please try again.');
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <Tooltip content="Buy some messages for SOL">
        <Button
          onClick={handleToggle}
          variant="default"
          className="flex items-center gap-2 border border-bolt-elements-borderColor font-medium"
        >
          {isMobile && <div className="i-ph:plus-circle i-ph:fill h-5 w-5 "></div>}
          Buy {!isMobile && 'Messages'}
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
                    Get{' '}
                    {hasDiscount ? (
                      <>
                        <span className="font-semibold line-through text-gray-400">{baseMessageCount}</span>
                        <span className="mx-1" />
                        <span className="font-semibold text-white">{discountedMessageCount}</span>
                        {multiplier && <span className="text-green-400 font-semibold ml-1">(x{multiplier})</span>}
                      </>
                    ) : (
                      <span className="font-semibold">{baseMessageCount}</span>
                    )}{' '}
                    messages for <span className="font-semibold">{MESSAGE_PRICE_IN_SOL * baseMessageCount} SOL</span>
                  </p>

                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2 items-center justify-center mb-2">
                      <div className="border border-bolt-elements-borderColor rounded-md flex p-2 bg-white flex-1">
                        <input
                          className="border-none outline-none flex-1 text-base text-gray-900 placeholder-gray-500"
                          required
                          onInput={handlePromocodeInput}
                          value={promocode}
                          placeholder="Enter promocode"
                        />
                      </div>
                      <Button
                        variant="default"
                        disabled={promocodeApplied || !promocode}
                        onClick={handleApplyPromocode}
                        className="px-4 py-2 text-sm"
                      >
                        {promocodeApplied ? 'Applied' : 'Apply'}
                      </Button>
                    </div>

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
                      <div className={waterStyles.buttonContent}>{isSubmitting ? 'Processing...' : 'Purchase Now'}</div>
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
