import React, { useState } from 'react';
import { Button } from '../ui';
import Popup from '../common/Popup';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/Tabs';
import DeployNewTokenForm from './DeployNewTokenForm';
import DeployLinkedTokenForm from './LinkTokenForm';
import { Tooltip } from './Tooltip';

interface DeployTokenNavButtonProps {
  projectId: string;
  disabled: boolean;
}

function getCurrentProjectUrl() {
  const currentUrl = new URL(window.location.href);
  currentUrl.pathname = currentUrl.pathname.replace('/chat/', '/project/');
  return currentUrl.toString();
}

export default function DeployTokenNavButton({ projectId, disabled = false }: DeployTokenNavButtonProps) {
  const [showTokenWindow, setShowTokenWindow] = useState(false);

  const projectUrl = getCurrentProjectUrl();

  return (
    <>
      <Tooltip content={disabled ? 'Token is loading' : 'Create new or link existing Solana token'} side="bottom">
        <Button
          onClick={() => setShowTokenWindow(true)}
          disabled={disabled}
          className="border border-[#5c5c5c40] space-x-0"
        >
          Launch Token <span className="color-green-300 -ml-0.5 text-xs">new!</span>
        </Button>
      </Tooltip>

      <Popup
        isShow={showTokenWindow}
        handleToggle={() => {
          setShowTokenWindow(!showTokenWindow);
        }}
      >
        <div className="mb-3">
          <h1 className="text-2xl font-bold">Connect your token to an app</h1>
        </div>

        <Tabs defaultValue="new" className="items-center">
          <TabsList className="bg-input h-7 w-full box-content mb-5">
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
