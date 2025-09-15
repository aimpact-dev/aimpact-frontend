'use client';
import { type TokenDataResponse } from '~/lib/hooks/tanstack/useHeaven';
import { Button } from '../ui';

interface TokenInfoFormProps {
  tokenData: TokenDataResponse;
}

export default function TokenInfoForm({ tokenData }: TokenInfoFormProps) {
  const formatPrice = (price: number) => {
    const formated = price.toFixed(7);
    return price < 1 * 10 ** -6 ? '<0.0000001' : formated;
  };
  console.log(tokenData);

  return (
    <div className="space-y-6 mx-auto pt-2">
      <div className="flex justify-center items-center">
        <img src={tokenData.metadata.image} alt="token image" className="w-16 h-16 rounded-full" />
      </div>
      <div className="space-y-2 px-1">
        <div className="justify-center space-y-0.5">
          <h2 className="text-3xl font-bold color-accent-300">{tokenData.metadata.name}</h2>
          <h3 className="text-xl mb-4 text-gray-300">{tokenData.metadata.symbol}</h3>
          {tokenData.metadata.description ? (
            <>
              <p className="max-h-24 w-full overflow-auto text-left">
                <b>Description</b>: {tokenData.metadata.description}
              </p>
            </>
          ) : null}
        </div>
        <div className="text-left space-y-0.5">
          <p>
            <b>Price:</b> ${formatPrice(tokenData.price)}
          </p>
          <p>
            <b>Token Address:</b>{' '}
            <a
              className="hover:underline hover:text-gray-200"
              target="_blank"
              rel="noopener noreferrer"
              href={`https://solscan.io/account/${tokenData.address}`}
            >
              <i>{tokenData.address}</i>
            </a>
          </p>
          <p>
            <b>Total Supply:</b> ${tokenData.supply || '?'} <span className='color-accent-300'>{tokenData.metadata.symbol}</span>
          </p>
          <p>
            <b>Market Cap:</b> ${tokenData.marketCap.toFixed(0)}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <a href={`https://heaven.xyz/token/${tokenData.address}`}>
          <Button size="default">View on Heaven</Button>
        </a>
      </div>
    </div>
  );
}
