import { useStore } from '@nanostores/react';
import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Button, Input, Label } from '~/components/ui';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '~/components/ui/accordion';
import { convexTeamNameStore } from '~/lib/stores/convex';
import { workbenchStore } from '~/lib/stores/workbench';

export default function ConvexTab() {
  const [apiKey, setApiKey] = useState('');
  const [maskedApiKey, setMaskedApiKey] = useState('');
  const [buttonDisabled, setButtonDisabled] = useState(false);

  const handleSaveButton = () => {
    const [slugOfKey, _] = apiKey.split('|');
    const teamName = slugOfKey.split(':').at(1);
    console.log(slugOfKey, teamName);
    if (apiKey.length < 10 || !slugOfKey || !teamName) {
      toast.error('Invalid API key');
      return;
    }

    convexTeamNameStore.set(teamName);
    workbenchStore.getMainShell.executeCommand(`echo "CONVEX_DEPLOY_KEY=${apiKey}" >> .env.local`);
    setButtonDisabled(true);
    setTimeout(() => setButtonDisabled(false), 1000);
  };

  return (
    <div className="flex flex-col xl:gap-4 gap-3 px-6 py-8 bg-bolt-elements-background-depth-3 rounded-lg">
      <div className="flex flex-col gap-1">
        <h1>Convex configuration</h1>
        <p className="text-sm">
          To launch backend we use Convex.dev, so please paste your Development Deploy Key below and click Save.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="convex-key-input" className="flex gap-2">
          <div className="i-ph:key h-4.5 w-4.5 color-accent-300"></div>
          Convex deploy key
        </Label>
        <div className="flex gap-3">
          <Input
            id="convex-key-input"
            className="w-full"
            value={maskedApiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setMaskedApiKey('•'.repeat(e.target.value.length));
            }}
            disabled={buttonDisabled}
          />

          <Button disabled={buttonDisabled} variant="default" onClick={handleSaveButton}>
            Save
          </Button>
        </div>
      </div>
      <Accordion type="single" collapsible>
        <AccordionItem value="build">
          <AccordionTrigger>
            <div className="flex gap-2 items-center">
              <div className="i-ph:question h-4.5 w-4.5 color-accent-300"></div> How to get deploy key
            </div>
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-3">
            <p>
              1. Go to{' '}
              <a href="https://dashboard.convex.dev" target="_blank" className="inline font-bold hover:underline">
                dashboard.convex.dev
              </a>{' '}
              and log in. <br />
              2. Click Create project. <br />
              3. Go to the project Settings, open URL & Deploy Key → open Show development credentials dropdown. <br />
              4. Click Generate Development Deploy Key, enter any name, and then Save. <br />
              5. Copy the Development Deploy Key and paste it here. <br />
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
