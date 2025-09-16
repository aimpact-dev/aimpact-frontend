import React, { useState } from 'react';
import { Button } from '../ui';
import Popup from '../common/Popup';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/Tabs';
import DeployNewTokenForm from './DeployNewTokenForm';
import DeployLinkedTokenForm from './LinkTokenForm';
import TokenInfoForm from './TokenInfoForm';
import type { TokenDataResponse } from '~/lib/hooks/tanstack/useHeaven';

export interface TokenInfoNavButtonProps {
  tokenData: TokenDataResponse;
}

export default function TokenInfoNavButton({ tokenData }: TokenInfoNavButtonProps) {
  const [showTokenWindow, setShowTokenWindow] = useState(false);

  const currentUrl = new URL(window.location.href);
  currentUrl.pathname = currentUrl.pathname.replace('/chat/', '/project/');
  const projectUrl = currentUrl.toString();

  return (
    <>
      <Button onClick={() => setShowTokenWindow(true)} className="border border-[#5c5c5c40] space-x-0">
        Token info<span className='color-green-300 -ml-0.5 text-xs'>new!</span>
      </Button>

      <Popup
        isShow={showTokenWindow}
        handleToggle={() => {
          setShowTokenWindow(!showTokenWindow);
        }}
        positionClasses='sm:max-w-[600px] sm:w-[600px] mt-12'
      >
        <div className="mb-3">
          <h1 className="text-2xl font-bold">Token info</h1>
        </div>

        <TokenInfoForm tokenData={tokenData} />
      </Popup>
    </>
  );
}
