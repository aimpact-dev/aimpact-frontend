import { useState } from 'react';
import { toast } from 'react-toastify';
import { Button, Input, Label } from '~/components/ui';
import { convexTeamNameStore } from '~/lib/stores/convex';
import { workbenchStore } from '~/lib/stores/workbench';

export default function ConvexView({ isConvexProject = true }: { isConvexProject: boolean }) {
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
    <div className="flex w-full h-full justify-center bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary">
      <div className="w-full bg-bolt-elements-background-depth-2 px-6 py-8 overflow-auto [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex flex-col xl:gap-6 gap-3 px-6 py-8 bg-bolt-elements-background-depth-3 rounded-sm">
          <div className="flex justify-between">
            <h1>Convex configuration</h1>
          </div>
          <div className="mt-4 gap-y-2 flex flex-col justify-center items-center">
            <Label htmlFor="convex-key-input">Convex deploy key</Label>
            <Input
              id="convex-key-input"
              className="max-w-[360px] w-full mb-3"
              value={maskedApiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setMaskedApiKey('•'.repeat(e.target.value.length));
              }}
              disabled={!isConvexProject || buttonDisabled}
            />

            <Button
              disabled={!isConvexProject || buttonDisabled}
              className="px-8"
              variant="default"
              onClick={handleSaveButton}
            >
              Save!
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
