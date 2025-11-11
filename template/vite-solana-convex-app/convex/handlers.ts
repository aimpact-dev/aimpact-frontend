import { httpAction } from './_generated/server';
import {} from '@coinbase/x402';
import { paymentMiddleware } from './x402_convex';
import { Address } from '@solana/kit';

const x402Middleware = paymentMiddleware(
  'place_your_wallet_address_here' as Address,
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
    const imageUrl = `https://picsum.photos/800/600?random=${randomId}`;

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
            a {
              display: inline-block;
              margin-top: 20px;
              padding: 12px 24px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 6px;
            }
            a:hover { background: #5568d3; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🎉 Payment Successful!</h1>
            <p>Here's your exclusive random picture:</p>
            <a href="${imageUrl}" target="_blank">View Your Random Picture</a>
          </div>
        </body>
      </html>
    `;

    return new Response(htmlContent, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  }),
);
