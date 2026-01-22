import { classNames } from '~/utils/classNames';
import waterStyles from '../ui/WaterButton.module.scss';
import { shortenString } from '~/utils/shortenString';

import { useAppKit, useAppKitAccount } from '~/lib/hooks/appkit.client';

export default function CustomWalletButton() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();

  return (
    <div
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
      <button onClick={() => open()} className="p-[6px]  text-white rounded-lg font-semibold ">
        {isConnected && address ? shortenString(address) : 'Connect Wallet'}
      </button>
    </div>
  );
}
