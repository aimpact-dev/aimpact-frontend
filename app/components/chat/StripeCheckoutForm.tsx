import React, { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '../ui';
import { classNames } from '~/utils/classNames';
import waterStyles from '../ui/WaterButton.module.scss';

interface StripeCheckoutFormProps {
  isSubmitting: boolean;
  onPaymentSuccess: () => void;
  onPaymentError: (error: string) => void;
  messageCount: number;
  amount: number;
}

export default function StripeCheckoutForm({
  isSubmitting,
  onPaymentSuccess,
  onPaymentError,
  messageCount,
  amount,
}: StripeCheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin,
      },
      redirect: 'if_required',
    });

    setIsProcessing(false);

    if (error) {
      if (error.type === 'card_error' || error.type === 'validation_error') {
        onPaymentError(error.message || 'Payment failed');
      } else {
        onPaymentError('An unexpected error occurred.');
      }
    } else {
      onPaymentSuccess();
      (window as any).plausible?.('purchase_messages_fiat', {
        props: {
          message_count: messageCount,
          purchase_messages_success: true,
          payment_method: 'stripe',
          amount_usd: amount,
          error: null,
        },
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <button
        type="submit"
        disabled={isProcessing || isSubmitting || !stripe || !elements}
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
          {isProcessing || isSubmitting ? 'Processing...' : `Pay $${amount}`}
        </div>
      </button>
    </form>
  );
}
