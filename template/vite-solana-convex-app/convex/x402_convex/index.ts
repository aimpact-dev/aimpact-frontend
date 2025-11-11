import { Address } from '@solana/kit';
import { exact } from 'x402/schemes';
import {
  computeRoutePatterns,
  findMatchingPaymentRequirements,
  findMatchingRoute,
  processPriceToAtomicAmount,
  toJsonSafe,
} from 'x402/shared';
import { getPaywallHtml } from 'x402/paywall';
import {
  FacilitatorConfig,
  moneySchema,
  PaymentPayload,
  PaymentRequirements,
  Resource,
  RoutesConfig,
  PaywallConfig,
  ERC20TokenAmount,
  SupportedEVMNetworks,
  SupportedSVMNetworks,
} from 'x402/types';
import { useFacilitator } from 'x402/verify';
import { safeBase64Encode } from 'x402/shared';
import { GenericActionCtx } from 'convex/server';

export function paymentMiddleware(
  payTo: Address,
  routes: RoutesConfig,
  facilitator?: FacilitatorConfig,
  paywall?: PaywallConfig,
) {
  const { verify, settle, supported } = useFacilitator(facilitator);
  const x402Version = 1;

  // Pre-compile route patterns to regex and extract verbs
  const routePatterns = computeRoutePatterns(routes);

  return function middleware(func: (ctx: GenericActionCtx<any>, request: Request) => Promise<Response>) {
    return async (ctx: GenericActionCtx<any>, request: Request): Promise<Response> => {
      const pathname = new URL(request.url).pathname;
      const method = request.method.toUpperCase();

      // Find matching route configuration
      const matchingRoute = findMatchingRoute(routePatterns, pathname, method);

      if (!matchingRoute) {
        return await func(ctx, request);
      }

      const { price, network, config = {} } = matchingRoute.config;
      const {
        description,
        mimeType,
        maxTimeoutSeconds,
        inputSchema,
        outputSchema,
        customPaywallHtml,
        resource,
        errorMessages,
        discoverable,
      } = config;

      const atomicAmountForAsset = processPriceToAtomicAmount(price, network);
      if ('error' in atomicAmountForAsset) {
        return new Response(atomicAmountForAsset.error, { status: 500 });
      }
      const { maxAmountRequired, asset } = atomicAmountForAsset;

      const resourceUrl =
        resource || (`${new URL(request.url).protocol}//${new URL(request.url).host}${pathname}` as Resource);

      let paymentRequirements: PaymentRequirements[] = [];

      // TODO: create a shared middleware function to build payment requirements
      // evm networks
      if (SupportedEVMNetworks.includes(network)) {
        paymentRequirements.push({
          scheme: 'exact',
          network,
          maxAmountRequired,
          resource: resourceUrl,
          description: description ?? '',
          mimeType: mimeType ?? 'application/json',
          payTo: payTo.toString(),
          maxTimeoutSeconds: maxTimeoutSeconds ?? 300,
          asset: asset.address.toString(),
          // TODO: Rename outputSchema to requestStructure
          outputSchema: {
            input: {
              type: 'http',
              method,
              discoverable: discoverable ?? true,
              ...inputSchema,
            },
            output: outputSchema,
          },
          extra: (asset as ERC20TokenAmount['asset']).eip712,
        });
      }
      // svm networks
      else if (SupportedSVMNetworks.includes(network)) {
        // network call to get the supported payments from the facilitator
        const paymentKinds = await supported();

        // find the payment kind that matches the network and scheme
        let feePayer: string | undefined;
        for (const kind of paymentKinds.kinds) {
          if (kind.network === network && kind.scheme === 'exact') {
            feePayer = kind?.extra?.feePayer;
            break;
          }
        }

        // svm networks require a fee payer
        if (!feePayer) {
          throw new Error(`The facilitator did not provide a fee payer for network: ${network}.`);
        }

        // build the payment requirements for svm
        paymentRequirements.push({
          scheme: 'exact',
          network,
          maxAmountRequired,
          resource: resourceUrl,
          description: description ?? '',
          mimeType: mimeType ?? '',
          payTo: payTo,
          maxTimeoutSeconds: maxTimeoutSeconds ?? 60,
          asset: asset.address,
          // TODO: Rename outputSchema to requestStructure
          outputSchema: {
            input: {
              type: 'http',
              method,
              discoverable: discoverable ?? true,
              ...inputSchema,
            },
            output: outputSchema,
          },
          extra: {
            feePayer,
          },
        });
      } else {
        throw new Error(`Unsupported network: ${network}`);
      }

      // Check for payment header
      const paymentHeader = request.headers.get('X-PAYMENT');
      if (!paymentHeader) {
        const accept = request.headers.get('Accept');
        if (accept?.includes('text/html')) {
          const userAgent = request.headers.get('User-Agent');
          if (userAgent?.includes('Mozilla')) {
            let displayAmount: number;
            if (typeof price === 'string' || typeof price === 'number') {
              const parsed = moneySchema.safeParse(price);
              if (parsed.success) {
                displayAmount = parsed.data;
              } else {
                displayAmount = Number.NaN;
              }
            } else {
              displayAmount = Number(price.amount) / 10 ** price.asset.decimals;
            }

            // TODO: handle paywall html for solana
            const html =
              customPaywallHtml ??
              getPaywallHtml({
                amount: displayAmount,
                paymentRequirements: toJsonSafe(paymentRequirements) as Parameters<
                  typeof getPaywallHtml
                >[0]['paymentRequirements'],
                currentUrl: request.url,
                testnet: network === 'base-sepolia',
                cdpClientKey: paywall?.cdpClientKey,
                appLogo: paywall?.appLogo,
                appName: paywall?.appName,
                sessionTokenEndpoint: paywall?.sessionTokenEndpoint,
              });
            return new Response(html, {
              status: 402,
              headers: { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*', Vary: 'origin' },
            });
          }
        }

        return new Response(
          JSON.stringify({
            x402Version,
            error: errorMessages?.paymentRequired || 'X-PAYMENT header is required',
            accepts: paymentRequirements,
          }),
          {
            status: 402,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', Vary: 'origin' },
          },
        );
      }

      // Verify payment
      let decodedPayment: PaymentPayload;
      try {
        decodedPayment = exact.evm.decodePayment(paymentHeader);
        decodedPayment.x402Version = x402Version;
      } catch (error) {
        return new Response(
          JSON.stringify({
            x402Version,
            error: errorMessages?.invalidPayment || (error instanceof Error ? error : 'Invalid payment'),
            accepts: paymentRequirements,
          }),
          {
            status: 402,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', Vary: 'origin' },
          },
        );
      }

      const selectedPaymentRequirements = findMatchingPaymentRequirements(paymentRequirements, decodedPayment);
      if (!selectedPaymentRequirements) {
        return new Response(
          JSON.stringify({
            x402Version,
            error: errorMessages?.noMatchingRequirements || 'Unable to find matching payment requirements',
            accepts: toJsonSafe(paymentRequirements),
          }),
          {
            status: 402,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', Vary: 'origin' },
          },
        );
      }

      const verification = await verify(decodedPayment, selectedPaymentRequirements);

      if (!verification.isValid) {
        return new Response(
          JSON.stringify({
            x402Version,
            error: errorMessages?.verificationFailed || verification.invalidReason,
            accepts: paymentRequirements,
            payer: verification.payer,
          }),
          {
            status: 402,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', Vary: 'origin' },
          },
        );
      }

      // Proceed with request
      const response = await func(ctx, request);

      // if the response from the protected route is >= 400, do not settle the payment
      if (response.status >= 400) {
        return response;
      }

      // Settle payment after response
      try {
        const settlement = await settle(decodedPayment, selectedPaymentRequirements);

        if (settlement.success) {
          response.headers.set(
            'X-PAYMENT-RESPONSE',
            safeBase64Encode(
              JSON.stringify({
                success: true,
                transaction: settlement.transaction,
                network: settlement.network,
                payer: settlement.payer,
              }),
            ),
          );
        }
      } catch (error) {
        return new Response(
          JSON.stringify({
            x402Version,
            error: errorMessages?.settlementFailed || (error instanceof Error ? error : 'Settlement failed'),
            accepts: paymentRequirements,
          }),
          {
            status: 402,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', Vary: 'origin' },
          },
        );
      }

      return await func(ctx, request);
    };
  };
}
