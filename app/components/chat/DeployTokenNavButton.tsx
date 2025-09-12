import React, { useState } from 'react';
import { Button } from '../ui';
import Popup from '../common/Popup';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/Tabs';
import DeployNewTokenForm from './DeployNewTokenForm';
import DeployLinkedTokenForm from './DeployLinkedTokenForm';

export interface DeployTokenNavButtonProps {
  projectId: string;
}

export default function DeployTokenNavButton({ projectId }: DeployTokenNavButtonProps) {
  const [showTokenWindow, setShowTokenWindow] = useState(false);

  const currentUrl = new URL(window.location.href);
  currentUrl.pathname = currentUrl.pathname.replace('/chat/', '/project/');
  const projectUrl = currentUrl.toString();

  return (
    <>
      <Button onClick={() => setShowTokenWindow(true)} className="border border-[#5c5c5c40]">
        Launch Coin
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
            <DeployNewTokenForm projectId={projectId} projectUrl={projectUrl} />
          </TabsContent>
          <TabsContent value="link">
            <DeployLinkedTokenForm projectId={projectId} projectUrl={projectUrl} />
          </TabsContent>
        </Tabs>
      </Popup>
    </>
  );
}
