import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useEffect, useRef, useState } from 'react';
import { classNames } from '~/utils/classNames';
import waterStyles from '../ui/WaterButton.module.scss';

export default function CustomWalletButton() {
  const { connected } = useWallet();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && buttonRef.current && !connected) {
      // Find the span with the text and update it
      const spans = buttonRef.current.getElementsByTagName('span');

      for (let i = 0; i < spans.length; i++) {
        if (spans[i].textContent === 'Select Wallet') {
          spans[i].textContent = 'Connect Wallet';
        }
      }
    }
  }, [mounted, connected]);

  return (
    <div
      ref={buttonRef}
      className={classNames(
        waterStyles.waterButton,
        waterStyles.noHoverTransform,
        'relative',
        'text-white font-medium',
        'rounded-md',
        'transition-all duration-300',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black/50',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'inline-flex items-center justify-center',
        'px-4',
        'text-sm',
        'bg-gray-500 bg-opacity-10',
        'border border-bolt-elements-borderColor',
        'overflow-visible',
      )}
    >
      <div className={waterStyles.effectLayer}>
        <div className={waterStyles.waterDroplets}></div>
        <div className={waterStyles.waterSurface}></div>
      </div>
      <WalletMultiButton
        style={{
          background: 'transparent',
          // border: '1px solid #5c5c5c40',
          color: 'inherit',
          font: 'inherit',
          margin: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '6px',
        }}
      >
        {!connected && 'Connect Wallet'}
      </WalletMultiButton>
    </div>
  );
}
