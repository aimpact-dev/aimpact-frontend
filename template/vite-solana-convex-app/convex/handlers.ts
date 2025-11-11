import { httpAction } from './_generated/server';
import {} from '@coinbase/x402';
import { paymentMiddleware } from './x402_convex';
import { Address } from '@solana/kit';

const x402Middleware = paymentMiddleware(
  'place_your_solana_devnet_wallet_address_here' as Address,
  {
    '/paid-content': {
      price: '$0.01', // USDC
      network: 'solana-devnet',
      config: {
        description: 'Access to the protected content',
        mimeType: 'text/html',
      },
    },
  },
  {
    url: 'https://x402.org/facilitator',
  },
);

export const paidContentHandler = httpAction(
  x402Middleware(async (ctx, request) => {
    const randomId = Math.floor(Math.random() * 1000);
    const imageUrl = `https://picsum.photos/400/300?random=${randomId}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Your Paid Content</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: #f5f5f5;
            }
            .container {
              text-align: center;
              padding: 40px;
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            h1 { color: #333; }
            img {
              max-width: 100%;
              height: auto;
              border-radius: 8px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🎉 Payment Successful!</h1>
            <p>Here's your exclusive random picture:</p>
            <img src="${imageUrl}" alt="Your exclusive random picture" />
          </div>
        </body>
      </html>
    `;

    return new Response(htmlContent, {
      headers: {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*',
        Vary: 'origin',
      },
    });
  }),
);
