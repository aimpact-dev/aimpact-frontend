import React, { useState } from 'react';
import { Button } from '../ui';
import Popup from '../common/Popup';
import TokenInfoForm from './TokenInfoForm';
import type { TokenDataResponse } from '~/lib/hooks/tanstack/useHeaven';
import { Tooltip } from './Tooltip';

export interface TokenInfoNavButtonProps {
  tokenData: TokenDataResponse;
}

export default function TokenInfoNavButton({ tokenData }: TokenInfoNavButtonProps) {
  const [showTokenWindow, setShowTokenWindow] = useState(false);

  return (
    <>
      <Tooltip content={'View details of the connected token'} side="bottom">
        <Button onClick={() => setShowTokenWindow(true)} className="border border-[#5c5c5c40] space-x-0">
          Token info<span className="color-green-300 -ml-0.5 text-xs">new!</span>
        </Button>
      </Tooltip>

      <Popup
        isShow={showTokenWindow}
        handleToggle={() => {
          setShowTokenWindow(!showTokenWindow);
        }}
        positionClasses="sm:max-w-[500px] sm:w-[500px] mt-12"
      >
        <TokenInfoForm tokenData={tokenData} />
      </Popup>
    </>
  );
}
