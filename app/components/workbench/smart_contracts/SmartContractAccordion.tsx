import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { GetBuildRequestResponse } from '~/lib/hooks/tanstack/useContractBuild';
import type { ContractBuild } from './SmartContractView';
import type { GetDeploymentResponse, GetDeployRequestResponse } from '~/lib/hooks/tanstack/useContractDeploy';
import { Button } from '~/components/ui';

interface Props {
  openAccordion: string | undefined;
  setOpenAccordion: (value: string) => void;
  contractBuildRequest: GetBuildRequestResponse;
  contractBuild: ContractBuild | null;
  contractDeployRequest: GetDeployRequestResponse | null;
  contractDeployment: GetDeploymentResponse | null;
  buildInProgress: boolean;
  deployInProgress: boolean;
  buildContract: () => void;
  fixBuild: () => void;
  deployContract: () => void;
  fixDeploy: () => void;
}

export default function SmartContractAccordion({
  openAccordion,
  setOpenAccordion,
  contractBuildRequest,
  contractBuild,
  contractDeployRequest,
  contractDeployment,
  buildInProgress,
  deployInProgress,
  buildContract,
  fixBuild,
  deployContract,
  fixDeploy,
}: Props) {
  return (
    <Accordion type="single" value={openAccordion} onValueChange={(value) => setOpenAccordion(value)} collapsible>
      <AccordionItem value="build">
        <AccordionTrigger>Build</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-3">
          {contractBuildRequest.status === 'STARTED' && (
            <div>
              <span className="text-bolt-elements-textSecondary text-sm mr-3">
                {contractBuildRequest.startedAt ? new Date(contractBuildRequest.startedAt).toLocaleString() : ''}
              </span>
              Build has started
              <span className="ml-3 inline-block i-ph:circle-notch-duotone scale-98 animate-spin text-bolt-elements-item-contentDefault align-text-top w-4 h-4"></span>
            </div>
          )}
          {contractBuildRequest.status === 'BUILDING' && (
            <div>
              <span className="text-bolt-elements-textSecondary text-sm mr-3">{new Date().toLocaleString()}</span>
              Building
              <span className="ml-3 inline-block i-ph:circle-notch-duotone scale-98 animate-spin text-bolt-elements-item-contentDefault align-text-top w-4 h-4"></span>
            </div>
          )}
          {contractBuildRequest.status === 'COMPLETED' && (
            <>
              {contractBuild ? (
                <>
                  <div>
                    <span className="text-bolt-elements-textSecondary text-sm mr-3">
                      {new Date(contractBuild.builtAt!).toLocaleString()}
                    </span>
                    Building has finished successfully
                    <span className="ml-3 inline-block i-ph:check text-bolt-elements-icon-success align-text-top w-4 h-4"></span>
                  </div>

                  <div className="flex *:flex-1 [&_p]:text-bolt-elements-textSecondary">
                    <div>
                      <div>
                        <p>Name:</p> {contractBuild.programName}
                      </div>
                      <div>
                        <p>Program ID:</p>
                        <span className="text-xs break-all">{contractBuild.programId}</span>
                      </div>
                      <div>
                        <p>Size:</p> {contractBuild.sizeBytes}
                      </div>
                    </div>
                    <div>
                      <div>
                        <p>Started at:</p> {new Date(contractBuildRequest.startedAt!).toLocaleString()}
                      </div>
                      <div>
                        <p>Built at:</p> {new Date(contractBuild.builtAt!).toLocaleString()}
                      </div>
                      <div>
                        <p>Deploy cost:</p> <span className="opacity-70">SOL</span> {contractBuild.deployCost}
                      </div>
                    </div>
                  </div>
                  <div>
                    <a
                      href="#"
                      className="text-bolt-elements-item-contentAccent underline hover:color-accent-400 transition-100"
                    >
                      <span className="inline-block align-text-bottom text-lg i-ph:arrow-square-out"></span>
                      Open IDL
                    </a>
                  </div>
                  {buildInProgress ? (
                    <span className="self-center ml-3 inline-block i-ph:circle-notch-duotone scale-98 animate-spin align-text-top w-4 h-4"></span>
                  ) : (
                    <Button onClick={buildContract}>
                      <span className="i-ph:hammer h-4 w-4 text-bolt-elements-item-contentAccent"></span> Rebuild
                      contract
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <div>
                    Building has finished successfully, downloading build artifacts.
                    <span className="ml-3 inline-block i-ph:circle-notch-duotone scale-98 animate-spin align-text-top w-4 h-4"></span>
                  </div>
                </>
              )}
            </>
          )}
          {contractBuildRequest.status === 'FAILED' && (
            <>
              <div>
                <span className="text-bolt-elements-textSecondary text-sm mr-3">{new Date().toLocaleString()}</span>
                {contractBuildRequest.message}
                <span className="ml-3 inline-block i-ph:x text-bolt-elements-icon-error align-text-top w-4 h-4"></span>
              </div>
              <div className="max-h-[150px] modern-scrollbar bg-bolt-elements-background-depth-2 p-2 text-bolt-elements-item-contentDanger">
                {contractBuildRequest.logs?.map((log, idx) => <p key={idx}>{log}</p>)}
              </div>
              <Button onClick={fixBuild}>Fix with AI</Button>
            </>
          )}
        </AccordionContent>
      </AccordionItem>

      {contractDeployRequest && (
        <AccordionItem value="deploy">
          <AccordionTrigger>Deploy</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-3">
            {contractDeployRequest.status === 'STARTED' && (
              <div>
                <span className="text-bolt-elements-textSecondary text-sm mr-3">
                  {contractDeployRequest.startedAt ? new Date(contractDeployRequest.startedAt).toLocaleString() : ''}
                </span>
                Deployment has started
                <span className="ml-3 inline-block i-ph:circle-notch-duotone scale-98 animate-spin text-bolt-elements-item-contentDefault align-text-top w-4 h-4"></span>
              </div>
            )}
            {contractDeployRequest.status === 'DEPLOYING' && (
              <div>
                <span className="text-bolt-elements-textSecondary text-sm mr-3">{new Date().toLocaleString()}</span>
                Deploying
                <span className="ml-3 inline-block i-ph:circle-notch-duotone scale-98 animate-spin text-bolt-elements-item-contentDefault align-text-top w-4 h-4"></span>
              </div>
            )}
            {contractDeployRequest.status === 'COMPLETED' && (
              <>
                {contractDeployment ? (
                  <>
                    <div>
                      <span className="text-bolt-elements-textSecondary text-sm mr-3">
                        {contractDeployment.deployedAt ? new Date(contractDeployment.deployedAt).toLocaleString() : ''}
                      </span>
                      Deployment has finished successfully
                      <span className="ml-3 inline-block i-ph:check text-bolt-elements-icon-success align-text-top w-4 h-4"></span>
                    </div>
                    <div className="flex *:flex-1 [&_p]:text-bolt-elements-textSecondary">
                      <div>
                        <div>
                          <p>Name:</p> {contractDeployment.programName}
                        </div>
                        <div>
                          <p>Program ID:</p>
                          <span className="text-xs break-all">{contractDeployment.programId}</span>
                        </div>
                      </div>
                      <div>
                        <div>
                          <p>Network</p> {contractDeployment.network}
                        </div>
                        <div>
                          <p>Deployed at:</p> {new Date(contractDeployment.deployedAt!).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    {!deployInProgress && (
                      <Button onClick={deployContract}>
                        <span className="i-ph:rocket-launch h-4 w-4 text-bolt-elements-item-contentAccent"></span>{' '}
                        Redeploy contract
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      Deployment has finished successfully, downloading deploy artifacts.
                      <span className="ml-3 inline-block i-ph:circle-notch-duotone scale-98 animate-spin align-text-top w-4 h-4"></span>
                    </div>
                  </>
                )}
              </>
            )}
            {contractDeployRequest.status === 'FAILED' && (
              <>
                <div>
                  <span className="text-bolt-elements-textSecondary text-sm mr-3">{new Date().toLocaleString()}</span>
                  {contractDeployRequest.message}
                  <span className="ml-3 inline-block i-ph:x text-bolt-elements-icon-error align-text-top w-4 h-4"></span>
                </div>
                <div className="max-h-[150px] modern-scrollbar bg-bolt-elements-background-depth-2 p-2 text-bolt-elements-item-contentDanger">
                  {contractDeployRequest.logs?.map((log, idx) => <p key={idx}>{log}</p>)}
                </div>
                <Button onClick={fixDeploy}>Fix with AI</Button>
              </>
            )}
          </AccordionContent>
        </AccordionItem>
      )}
    </Accordion>
  );
}
