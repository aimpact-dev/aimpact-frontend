import React, { useState } from 'react';
import { Button } from '../ui';
import Popup from '../common/Popup';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/Tabs';
import DeployNewTokenForm from './DeployNewTokenForm';
import DeployLinkedTokenForm from './LinkTokenForm';
import { Tooltip } from './Tooltip';
import { classNames } from '~/utils/classNames';

interface DeployTokenButtonProps {
  projectId: string;
  disabled: boolean;
  isMobile?: boolean;
  className?: string;
}

function getCurrentProjectUrl() {
  const currentUrl = new URL(window.location.href);
  currentUrl.pathname = currentUrl.pathname.replace('/chat/', '/project/');
  return currentUrl.toString();
}

export default function DeployTokenButton({
  projectId,
  disabled = false,
  isMobile = false,
  className,
}: DeployTokenButtonProps) {
  const [showTokenWindow, setShowTokenWindow] = useState(false);

  const projectUrl = getCurrentProjectUrl();

  return (
    <>
      {isMobile ? (
        <button onClick={() => setShowTokenWindow(true)} disabled={disabled}>
          Launch token
        </button>
      ) : (
        <Tooltip content={disabled ? 'Token is loading' : 'Create new or link existing Solana token'} side="top">
          <button
            onClick={() => setShowTokenWindow(true)}
            disabled={disabled}
            className={classNames('border border-[#5c5c5c40] space-x-0', className)}
          >
            Launch token
          </button>
        </Tooltip>
      )}

      <Popup
        isShow={showTokenWindow}
        handleToggle={() => {
          setShowTokenWindow(!showTokenWindow);
        }}
        title="Connect your token to an app"
      >
        <Tabs defaultValue="new" className="items-center">
          <TabsList className="bg-input h-8 w-full box-border mb-5">
            <TabsTrigger value="new">New</TabsTrigger>
            <TabsTrigger value="link">By existing token</TabsTrigger>
          </TabsList>
          <TabsContent value="new">
            <DeployNewTokenForm projectId={projectId} projectUrl={projectUrl} setShowTokenWindow={setShowTokenWindow} />
          </TabsContent>
          <TabsContent value="link">
            <DeployLinkedTokenForm
              projectId={projectId}
              projectUrl={projectUrl}
              setShowTokenWindow={setShowTokenWindow}
            />
          </TabsContent>
        </Tabs>
      </Popup>
    </>
  );
}
