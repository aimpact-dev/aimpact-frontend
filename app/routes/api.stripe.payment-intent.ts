import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const MESSAGE_PRICE_USD = Number(process.env.VITE_MESSAGE_PRICE_USD || '0.5');

interface StripePaymentIntent {
  id: string;
  client_secret: string;
  amount: number;
  currency: string;
  status: string;
  metadata: Record<string, string>;
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  if (!STRIPE_SECRET_KEY) {
    return json({ error: 'Stripe not configured' }, { status: 500 });
  }

  try {
    const { messageCount } = await request.json<{ messageCount: number }>();

    if (!messageCount || messageCount <= 0) {
      return json({ error: 'Invalid message count' }, { status: 400 });
    }

    // convert to cents
    const amount = Math.round(messageCount * MESSAGE_PRICE_USD * 100);

    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: amount.toString(),
        currency: 'usd',
        'metadata[messageCount]': messageCount.toString(),
        'metadata[pricePerMessage]': MESSAGE_PRICE_USD.toString(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Stripe API error:', errorData);
      return json({ error: 'Failed to create payment intent' }, { status: 500 });
    }

    const paymentIntent = (await response.json()) as StripePaymentIntent;

    // Return amount in dollars
    return json({
      clientSecret: paymentIntent.client_secret,
      amount: amount / 100,
    });
  } catch (error) {
    console.error('Payment intent creation error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
