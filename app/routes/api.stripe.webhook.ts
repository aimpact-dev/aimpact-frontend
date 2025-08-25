import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { createServerClient, parseCookieHeader as _parseCookieHeader, serializeCookieHeader } from '@supabase/ssr';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

const parseCookieHeader = (headers: Headers) => {
  return _parseCookieHeader(headers.get('Cookie') ?? '').map(({ name, value }) => ({
    name,
    value: value ?? '',
  }));
};

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    return json({ error: 'Stripe not configured' }, { status: 500 });
  }

  try {
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return json({ error: 'Missing stripe signature' }, { status: 400 });
    }

    // TODO: verify webhook signature
    const event = JSON.parse(payload);

    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        const messageCount = parseInt(paymentIntent.metadata.messageCount);

        if (messageCount > 0) {
          const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
            cookies: {
              getAll() {
                return parseCookieHeader(request.headers);
              },
              setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) =>
                  request.headers.append('Set-Cookie', serializeCookieHeader(name, value, options)),
                );
              },
            },
          });

          console.log(`Crediting ${messageCount} messages for payment intent ${paymentIntent.id}`);
        }
        break;

      case 'payment_intent.payment_failed':
        console.log('Payment failed:', event.data.object.id);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return json({ error: 'Webhook handler failed' }, { status: 400 });
  }
}
