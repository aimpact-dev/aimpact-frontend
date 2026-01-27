import { useStore } from '@nanostores/react';
import { useMemo, useState } from 'react';
import { workbenchStore } from '~/lib/stores/workbench';
import ConvexTab from './ConvexTab';
import { Tooltip } from '~/components/chat/Tooltip';

type Integration = 'Convex';

export default function IntegrationsView() {
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const files = useStore(workbenchStore.files);

  const isConvexProject = useMemo(() => {
    const actualFiles = workbenchStore.files.get();
    return Object.entries(actualFiles).some(([path, file]) => file?.type === 'folder' && path.endsWith('convex'));
  }, [files]);

  return (
    <div className="flex w-full h-full justify-center bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary">
      <div className="w-full bg-bolt-elements-background-depth-2 px-6 py-8 overflow-auto [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {!selectedIntegration && (
          <IntegrationsGrid isConvexProject={isConvexProject} onSelect={setSelectedIntegration} />
        )}

        {selectedIntegration === 'Convex' && (
          <IntegrationLayout onBack={() => setSelectedIntegration(null)}>
            <ConvexTab />
          </IntegrationLayout>
        )}
      </div>
    </div>
  );
}

function IntegrationsGrid({
  onSelect,
  isConvexProject,
}: {
  onSelect: (integration: 'Convex') => void;
  isConvexProject: boolean;
}) {
  const isDisabled = !isConvexProject;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      <Tooltip content="Your project doesn’t use Convex. Ask AI to implement it." side="bottom" disabled={!isDisabled}>
        <div>
          <button
            disabled={isDisabled}
            onClick={() => onSelect('Convex')}
            className="flex flex-col items-center justify-center gap-3 p-4 rounded-lg border
                       bg-bolt-elements-background-depth-3 hover:bg-bolt-elements-background-depth-4
                       disabled:opacity-50 disabled:cursor-not-allowed transition
                       w-full"
          >
            <img src="/assets/convex-logo.svg" alt="Convex" className="w-12 h-12" />
            <span className="font-medium">Convex</span>
          </button>
        </div>
      </Tooltip>
    </div>
  );
}

function IntegrationLayout({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <button
        onClick={onBack}
        className="mb-4 w-fit text-sm text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary"
      >
        ← Back to integrations
      </button>

      <div className="flex-1">{children}</div>
    </div>
  );
}
