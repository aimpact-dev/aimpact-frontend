import { useEffect, useState } from 'react';
import { useNavigation } from '@remix-run/react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { toast } from 'react-toastify';
import { Button } from '../ui';
import { useSolanaProxy } from '~/lib/api-hooks/useSolanaProxyApi';
import { classNames } from '~/utils/classNames';
import waterStyles from '../ui/WaterButton.module.scss';
import { Tooltip } from './Tooltip';
import Cookies from 'js-cookie';
import { StripeProvider } from '../providers/StripeProvider';
import StripeCheckoutForm from './StripeCheckoutForm';

const MESSAGE_PRICE_IN_SOL = Number(import.meta.env.VITE_PRICE_PER_MESSAGE_IN_SOL);
const MESSAGE_PRICE_USD = Number(import.meta.env.VITE_MESSAGE_PRICE_USD || '0.5');

interface DepositButtonProps {
  discountPercent?: number;
}

type PaymentMethod = 'sol' | 'fiat';

export default function DepositButton({ discountPercent }: DepositButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('sol');
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const navigation = useNavigation();
  const { publicKey, signTransaction } = useWallet();
  const { getRecentBlockhash, sendTransaction } = useSolanaProxy();
  const detectMobileScreen = () => {
    return window.innerWidth <= 768;
  };

  const isSubmitting = navigation.state === 'submitting';

  const baseMessageCount = 10;
  const hasDiscount = discountPercent && discountPercent > 0;
  const discountedMessageCount = hasDiscount
    ? Math.floor(baseMessageCount / (1 - discountPercent / 100))
    : baseMessageCount;

  const multiplier = hasDiscount ? parseFloat((discountedMessageCount / baseMessageCount).toFixed(2)).toString() : null;

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (isOpen) {
      setSelectedPaymentMethod('sol');
      setStripeClientSecret(null);
    }
  };

  const createPaymentIntent = async () => {
    try {
      const response = await fetch('/api/stripe/payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageCount: hasDiscount ? discountedMessageCount : baseMessageCount,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      const data = (await response.json()) as { clientSecret: string; amount: number };
      setStripeClientSecret(data.clientSecret);
      return data;
    } catch (error) {
      toast.error('Failed to initialize payment. Please try again.');
      throw error;
    }
  };

  const handlePaymentMethodChange = async (method: PaymentMethod, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    setSelectedPaymentMethod(method);

    if (method === 'fiat') {
      try {
        await createPaymentIntent();
      } catch (error) {
        // Fallback to SOL
        setSelectedPaymentMethod('sol');
      }
    }
  };

  const handleFiatPaymentSuccess = () => {
    setIsOpen(false);
    setStripeClientSecret(null);
    toast.success('Payment completed! Messages have been added to your account.');
  };

  const handleFiatPaymentError = (error: string) => {
    toast.error(error);
    (window as any).plausible?.('purchase_messages_fiat', {
      props: {
        message_count: hasDiscount ? discountedMessageCount : baseMessageCount,
        purchase_messages_success: false,
        payment_method: 'stripe',
        error: error,
      },
    });
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
      <Tooltip content="Buy messages with SOL or Card">
        <Button
          onClick={handleToggle}
          variant="default"
          className="flex py-2.5 items-center gap-2 border border-bolt-elements-borderColor font-medium"
        >
          Buy Messages
        </Button>
      </Tooltip>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" style={{ zIndex: 9999 }}>
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div
              className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75 cursor-pointer"
              onClick={handleToggle}
              style={{ zIndex: 9998 }}
            ></div>
            <div
              className="relative inline-block w-full max-w-lg overflow-hidden text-left align-middle transition-all transform border-2 border-bolt-elements-borderColor rounded-lg shadow-xl bg-bolt-elements-background"
              style={{ zIndex: 10000 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleToggle}
                className="absolute top-4 right-4 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-transparent hover:bg-gray-500/10 dark:hover:bg-gray-500/20 group transition-all duration-200"
              >
                <div className="i-ph:x w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-gray-500 transition-colors" />
              </button>

              <div className="px-6 py-6 bg-bolt-elements-background-depth-3 pointer-events-auto">
                <div className="text-center pointer-events-auto">
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
                    messages
                  </p>

                  <div className="mb-6 pointer-events-auto">
                    <h4 className="text-lg font-medium mb-3">Choose Payment Method</h4>
                    <div className="flex gap-3 justify-center pointer-events-auto">
                      <button
                        onClick={(e) => handlePaymentMethodChange('sol', e)}
                        className={classNames(
                          'flex items-center gap-2 px-4 py-2 rounded-lg border transition-all pointer-events-auto cursor-pointer',
                          selectedPaymentMethod === 'sol'
                            ? 'border-purple-500 bg-purple-500/20 text-purple-200'
                            : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500',
                        )}
                      >
                        <div className="w-6 h-6 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full"></div>
                        <div className="text-left">
                          <div className="font-medium">Solana</div>
                          <div className="text-sm opacity-80">
                            {MESSAGE_PRICE_IN_SOL * (hasDiscount ? discountedMessageCount : baseMessageCount)} SOL
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={(e) => handlePaymentMethodChange('fiat', e)}
                        className={classNames(
                          'flex items-center gap-2 px-4 py-2 rounded-lg border transition-all pointer-events-auto cursor-pointer',
                          selectedPaymentMethod === 'fiat'
                            ? 'border-purple-500 bg-purple-500/20 text-purple-200'
                            : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500',
                        )}
                      >
                        <div className="w-6 h-6 bg-gradient-to-r from-green-400 to-blue-400 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold">$</span>
                        </div>
                        <div className="text-left">
                          <div className="font-medium">Card</div>
                          <div className="text-sm opacity-80">
                            ${MESSAGE_PRICE_USD * (hasDiscount ? discountedMessageCount : baseMessageCount)}
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 pointer-events-auto">
                    {selectedPaymentMethod === 'sol' && (
                      <button
                        onClick={handlePurchase}
                        disabled={isSubmitting || !publicKey}
                        className={classNames(
                          'relative overflow-hidden w-full px-6 py-3 text-lg font-medium text-white rounded-md',
                          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500',
                          'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
                          'transition-all duration-300 pointer-events-auto',
                          waterStyles.waterButton,
                          waterStyles.purple,
                        )}
                      >
                        <div className={waterStyles.effectLayer}>
                          <div className={waterStyles.waterDroplets}></div>
                          <div className={waterStyles.waterSurface}></div>
                        </div>
                        <div className={waterStyles.buttonContent}>
                          {isSubmitting
                            ? 'Processing...'
                            : `Pay ${MESSAGE_PRICE_IN_SOL * (hasDiscount ? discountedMessageCount : baseMessageCount)} SOL`}
                        </div>
                      </button>
                    )}

                    {selectedPaymentMethod === 'fiat' && stripeClientSecret && (
                      <StripeProvider clientSecret={stripeClientSecret}>
                        <StripeCheckoutForm
                          isSubmitting={isSubmitting}
                          onPaymentSuccess={handleFiatPaymentSuccess}
                          onPaymentError={handleFiatPaymentError}
                          messageCount={hasDiscount ? discountedMessageCount : baseMessageCount}
                          amount={MESSAGE_PRICE_USD * (hasDiscount ? discountedMessageCount : baseMessageCount)}
                        />
                      </StripeProvider>
                    )}

                    {selectedPaymentMethod === 'fiat' && !stripeClientSecret && (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-gray-400">Loading payment form...</div>
                      </div>
                    )}
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
