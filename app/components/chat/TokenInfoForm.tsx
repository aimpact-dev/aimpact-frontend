'use client';
import { type TokenDataResponse } from '~/lib/hooks/tanstack/useHeaven';
import { Button, Input, Label } from '../ui';
import { Tooltip } from './Tooltip';
import { toast } from 'react-toastify';

interface TokenInfoFormProps {
  tokenData: TokenDataResponse;
}

export default function TokenInfoForm({ tokenData }: TokenInfoFormProps) {
  const formatNumber = (price: number, fraction?: number) => {
    if (price < 1e-6) return '<0.0000001';
    const rounded = parseFloat(price.toFixed(7));
    return rounded.toLocaleString(undefined, { maximumFractionDigits: fraction ?? 7 });
  };

  const inputClasses = 'border-none';
  const DollarIcon = () => {
    return (
      <div className="i-ph:currency-dollar-simple w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-accent-300 pointer-events-none" />
    );
  };

  return (
    <div className="flex flex-col gap-4  p-2">
      <div className="flex flex-col gap-3">
        <div className="flex justify-center items-center">
          <img src={tokenData.metadata.image} alt="token image" className="w-32 h-32 rounded-full" />
        </div>
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-accent-300 to-purple-700 bg-clip-text text-transparent">
            {tokenData.metadata.name}
          </h2>
          <h3 className="text-sm text-bolt-elements-textSecondary">{tokenData.metadata.symbol}</h3>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <div className="text-sm text-white/80">{tokenData.metadata.description}</div>
        <div className="flex flex-col gap-2">
          <Label>Price</Label>
          <div className="relative w-full">
            <DollarIcon />
            <Input readOnly value={`${formatNumber(tokenData.price)}`} className={inputClasses + ' pl-9'} />
          </div>
        </div>
        <div className="flex *:flex-1 gap-2">
          <div className="flex flex-col gap-2">
            <Label>Total Supply</Label>
            <div className="relative w-full">
              <Input
                readOnly
                value={tokenData.supply ? formatNumber(tokenData.supply) : '?'}
                className={inputClasses + ' pr-16'}
              />
              <span className="text-sm absolute right-3 top-1/2 transform -translate-y-1/2 text-accent-300/70 font-light">
                {tokenData.metadata.symbol}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Market Cap</Label>
            <div className="relative w-full">
              <DollarIcon />
              <Input readOnly value={`${formatNumber(tokenData.marketCap, 2)}`} className={inputClasses + ' pl-9'} />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label>
            <div className="i-ph:link-simple color-accent-300"></div> Token Address
          </Label>
          <div className="relative w-full">
            <Input readOnly value={tokenData.address} className={inputClasses + ' pr-15'} />
            <Tooltip content="Copy address" side="bottom">
              <span
                className="i-ph:copy-simple h-4 w-4 absolute right-8 top-1/2 transform -translate-y-1/2 text-accent-300 cursor-pointer"
                onClick={() => {
                  navigator.clipboard.writeText(tokenData.address);
                  toast.success('Token address copied to clipboard!');
                }}
              ></span>
            </Tooltip>
            <a target="_blank" rel="noopener noreferrer" href={`https://solscan.io/account/${tokenData.address}`}>
              <Tooltip content="Go to Solscan" side="bottom">
                <span className="i-ph:globe-simple h-4 w-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-accent-300"></span>
              </Tooltip>
            </a>
          </div>
        </div>
        {/* <div className="flex flex-col gap-2 pl-1">
          {tokenData.telegram && (
            <a href={tokenData.telegram} className='flex gap-3'>
              <div className="i-ph:telegram-logo size-5" />
              <p className='hover:underline'>{tokenData.telegram}</p>
            </a>
          )}

          {tokenData.twitter && (
            <a href={tokenData.twitter} className='flex gap-3'>
              <div className="i-ph:x-logo size-5" />
              <p className='hover:underline'>{tokenData.telegram}</p>
            </a>
          )}
        </div> */}

        <div className="flex flex-col gap-3 pl-1 mt-2">
          <div className="space-y-2">
            <Label>
              <div className="i-ph:telegram-logo color-accent-300" /> Telegram
            </Label>
            <div className="relative w-full">
              <a target="_blank" rel="noopener noreferrer" href={tokenData.telegram}>
                <Input readOnly value={tokenData.telegram} className={inputClasses + ' pr-15 cursor-pointer'} />
                <span className="i-ph:arrow-square-out h-4 w-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-accent-300"></span>
              </a>
            </div>
          </div>

          <a target="_blank" rel="noopener noreferrer" href={tokenData.twitter}>
            <div className="space-y-2">
              <Label>
                <div className="i-ph:x-logo color-accent-300" /> Twitter
              </Label>
              <div className="relative w-full">
                <Input readOnly value={tokenData.twitter} className={inputClasses + ' pr-15 cursor-pointer'} />
                <span className="i-ph:arrow-square-out h-4 w-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-accent-300"></span>
              </div>
            </div>
          </a>
        </div>
      </div>

      <div className="mt-4">
        <a href={`https://heaven.xyz/token/${tokenData.address}`} target="_blank" rel="noopener noreferrer">
          <Button size="default">View on Heaven</Button>
        </a>
      </div>
    </div>
  );
}
