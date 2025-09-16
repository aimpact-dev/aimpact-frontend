import React, { useState } from 'react';
import { Button } from '../ui';
import Popup from '../common/Popup';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/Tabs';
import DeployNewTokenForm from './DeployNewTokenForm';
import DeployLinkedTokenForm from './LinkTokenForm';

export interface DeployTokenNavButtonProps {
  projectId: string;
  disabled: boolean;
}

export default function DeployTokenNavButton({ projectId, disabled = false }: DeployTokenNavButtonProps) {
  const [showTokenWindow, setShowTokenWindow] = useState(false);

  const currentUrl = new URL(window.location.href);
  currentUrl.pathname = currentUrl.pathname.replace('/chat/', '/project/');
  const projectUrl = currentUrl.toString();

  return (
    <>
      <Button onClick={() => setShowTokenWindow(true)} disabled={disabled} className="border border-[#5c5c5c40] space-x-0">
        Launch Token<span className='color-green-300 -ml-0.5 text-xs'>new!</span>
      </Button>

      <Popup
        isShow={showTokenWindow}
        handleToggle={() => {
          setShowTokenWindow(!showTokenWindow);
        }}
      >
        <div className="mb-3">
          <h1 className="text-2xl font-bold">Connect your app to a token </h1>
          <h2 className="text-m text-muted-foreground">for transactions and integrations</h2>
        </div>

        <Tabs defaultValue="new" className="items-center">
          <TabsList className="bg-input h-7 w-full box-content mb-5">
            <TabsTrigger value="new">New</TabsTrigger>
            <TabsTrigger value="link">By link</TabsTrigger>
          </TabsList>
          <TabsContent value="new">
            <DeployNewTokenForm projectId={projectId} projectUrl={projectUrl} setShowTokenWindow={setShowTokenWindow} />
          </TabsContent>
          <TabsContent value="link">
            <DeployLinkedTokenForm projectId={projectId} projectUrl={projectUrl} setShowTokenWindow={setShowTokenWindow} />
          </TabsContent>
        </Tabs>
      </Popup>
    </>
  );
}
