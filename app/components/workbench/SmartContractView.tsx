import { useEffect, useState } from 'react';
import { Badge, Button } from '../ui';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface AnchorProject {
  name: string;
  path: string;
  build?: {
    id: string;
    startedAt: string;
    status: 'STARTED' | 'BUILDING' | 'COMPLETED' | 'FAILED';
    message?: string;
    logs?: Array<string>;
    name?: string;
    url?: string;
    builtAt?: string;
    sizeBytes?: number;
    idl?: string;
    deployCost?: number;
  };
  deploy?: {
    id: string;
    network: string;
    startedAt: string;
    status: 'STARTED' | 'DEPLOYING' | 'COMPLETED' | 'FAILED';
    message?: string;
    logs?: Array<string>;
    name?: string;
    deployedAt?: string;
    sizeBytes?: number;
    idl?: string;
  };
}

export default function SmartContractView() {
  const [anchorProject, setAnchorProject] = useState<AnchorProject | null>({
    name: 'anchor',
    path: 'src/anchor',
  });
  // get anchor project here

  const [openAccordion, setOpenAccordion] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!anchorProject) return;

    if (anchorProject?.deploy) {
      setOpenAccordion('deploy');
    } else {
      setOpenAccordion('build');
    }
  }, [anchorProject?.deploy, anchorProject?.build]);

  const buildContract = () => {
    // setAnchorProject((prev) => {
    //   if (!prev) return prev;
    //   return {
    //     ...prev,
    //     build: {
    //       id: `build-${Date.now()}`,
    //       startedAt: new Date().toISOString(),
    //       status: 'STARTED',
    //     },
    //   };
    // });
    // setTimeout(() => {
    //   setAnchorProject((prev) =>
    //     prev
    //       ? {
    //           ...prev,
    //           build: {
    //             ...prev.build!,
    //             status: 'BUILDING',
    //           },
    //         }
    //       : null,
    //   );
    // }, 2000);
    // setTimeout(() => {
    //   const isSuccess = Math.random() > 0.1; // 70% success rate
    //   setAnchorProject((prev) =>
    //     prev
    //       ? {
    //           ...prev,
    //           build: {
    //             ...prev.build!,
    //             status: isSuccess ? 'COMPLETED' : 'FAILED',
    //             builtAt: isSuccess ? new Date().toISOString() : undefined,
    //             message: isSuccess ? 'Anchor build completed successfully' : 'Anchor build failed',
    //             logs: isSuccess
    //               ? []
    //               : [
    //                   '[2025-09-24 10:15:12] Build requested...',
    //                   '[2025-09-24 10:15:13] Fetching project files...',
    //                   '[2025-09-24 10:15:16] Running pre-build checks...',
    //                   '[2025-09-24 10:15:18] Installing dependencies...',
    //                   '[2025-09-24 10:15:27] Dependencies installed successfully.',
    //                   '[2025-09-24 10:15:30] Compiling smart contract sources...',
    //                   '[2025-09-24 10:15:37] Source compilation in progress...',
    //                   "[2025-09-24 10:15:44] Warning: unused variable 'tempCounter' in src/lib.rs:42",
    //                   '[2025-09-24 10:15:51] Error: cannot find type `AccountInfo` in this scope',
    //                   '[2025-09-24 10:15:52]   --> src/contract.rs:17:14',
    //                   '[2025-09-24 10:15:52]    |',
    //                   '[2025-09-24 10:15:52] 17 |     fn init(ctx: Context<Init>) -> Result<()> {',
    //                   '[2025-09-24 10:15:52]    |              ^^^ not found in this scope',
    //                   '[2025-09-24 10:15:53] Compilation failed due to 1 previous error.',
    //                   '[2025-09-24 10:15:54] Error: Build process exited with code 1',
    //                 ],
    //             name: isSuccess ? 'program.so' : undefined,
    //             sizeBytes: isSuccess ? 224000 : undefined,
    //             idl: isSuccess ? '{ ...mock idl... }' : undefined,
    //             url: isSuccess ? '/mock/program.so' : undefined,
    //             deployCost: isSuccess ? 100 : undefined,
    //           },
    //         }
    //       : null,
    //   );
    // }, 4000);
  };

  const fixBuild = () => {
    // buildContract();
  };

  const deployContract = () => {
    // if (!anchorProject) return;
    // setAnchorProject((prev) =>
    //   prev
    //     ? {
    //         ...prev,
    //         deploy: {
    //           id: `deploy-${Date.now()}`,
    //           network: 'devnet', // or any network you want
    //           startedAt: new Date().toISOString(),
    //           status: 'STARTED',
    //         },
    //       }
    //     : null,
    // );
    // setTimeout(() => {
    //   setAnchorProject((prev) =>
    //     prev
    //       ? {
    //           ...prev,
    //           deploy: {
    //             ...prev.deploy!,
    //             status: 'DEPLOYING',
    //           },
    //         }
    //       : null,
    //   );
    // }, 2000);
    // setTimeout(() => {
    //   const isSuccess = Math.random() > 0.99; // 70% success rate
    //   setAnchorProject((prev) =>
    //     prev
    //       ? {
    //           ...prev,
    //           deploy: {
    //             ...prev.deploy!,
    //             status: isSuccess ? 'COMPLETED' : 'FAILED',
    //             deployedAt: isSuccess ? new Date().toISOString() : undefined,
    //             message: isSuccess ? 'Anchor deployment completed successfully' : 'Anchor deployment failed',
    //             logs: isSuccess
    //               ? []
    //               : [
    //                   '[2025-09-24 11:45:01] Deploy requested...',
    //                   '[2025-09-24 11:45:03] Preparing deployment package...',
    //                   '[2025-09-24 11:45:07] Deployment package prepared successfully.',
    //                   '[2025-09-24 11:45:10] Connecting to Solana devnet...',
    //                   '[2025-09-24 11:45:13] Network connection established.',
    //                   '[2025-09-24 11:45:16] Sending deployment transaction...',
    //                   '[2025-09-24 11:45:19] Error: insufficient funds for transaction fee',
    //                   '[2025-09-24 11:45:20]   → required: 0.002 SOL, available: 0.0005 SOL',
    //                   '[2025-09-24 11:45:23] Transaction aborted.',
    //                   '[2025-09-24 11:45:26] Error: Deployment failed',
    //                 ],
    //             name: isSuccess ? 'program.so' : undefined,
    //             sizeBytes: isSuccess ? 224000 : undefined,
    //             idl: isSuccess ? '{ ...mock idl... }' : undefined,
    //             url: isSuccess ? '/mock/program.so' : undefined,
    //           },
    //         }
    //       : null,
    //   );
    // }, 6000);
  };

  const fixDeploy = () => {
    // deployContract();
  };

  const getStatusBadge = () => {
    if (!anchorProject) {
      return <Badge variant="secondary">No project</Badge>;
    }
    if (anchorProject.build && !anchorProject.deploy) {
      switch (anchorProject.build.status) {
        case 'STARTED':
          return <Badge variant="warning">Build requested</Badge>;
        case 'BUILDING':
          return <Badge variant="info">Building...</Badge>;
        case 'COMPLETED':
          return (
            <div>
              <Badge variant="success">Build completed</Badge>
              <Badge variant="primary">Ready for deploy</Badge>
            </div>
          );
        case 'FAILED':
          return <Badge variant="destructive">Build failed</Badge>;
      }
    }

    if (anchorProject.deploy) {
      switch (anchorProject.deploy.status) {
        case 'STARTED':
          return <Badge variant="warning">Deploy requested</Badge>;
        case 'DEPLOYING':
          return <Badge variant="info">Deploying...</Badge>;
        case 'COMPLETED':
          return <Badge variant="success">Deploy completed</Badge>;
        case 'FAILED':
          return <Badge variant="destructive">Deploy failed</Badge>;
      }
    }

    return <Badge variant="primary">Ready to build</Badge>;
  };

  return (
    <div className="flex w-full h-full justify-center bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary">
      {anchorProject ? (
        <div className="w-full bg-bolt-elements-background-depth-2 px-6 py-8 overflow-auto [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex flex-col xl:gap-6 gap-3 px-6 py-8 bg-bolt-elements-background-depth-3 rounded-sm">
            <div className="flex justify-between">
              <h1>Anchor project detected</h1>
              {getStatusBadge()}
            </div>
            <div className="bg-bolt-elements-background-depth-2 border rounded-lg *:p-3 border-bolt-elements-borderColor">
              <div className="flex items-center gap-2 ">
                <span className="text-sm text-muted-foreground">Project:</span>
                <span className="bg-muted px-2 py-1 rounded text-sm font-mono text-bolt-elements-item-contentAccent">
                  {anchorProject.name}
                </span>
              </div>
              <div className="flex items-center gap-2 border-t border-bolt-elements-borderColor">
                <span className="text-sm text-muted-foreground">Path:</span>
                <span className="bg-muted px-2 py-1 rounded text-sm font-mono text-bolt-elements-item-contentAccent">
                  {anchorProject.path}
                </span>
              </div>
            </div>

            {anchorProject.build ? (
              <>
                <Accordion
                  type="single"
                  value={openAccordion}
                  onValueChange={(value) => setOpenAccordion(value)}
                  collapsible
                >
                  <AccordionItem value="build">
                    <AccordionTrigger>Build</AccordionTrigger>
                    <AccordionContent className="flex flex-col gap-3">
                      {anchorProject.build.status === 'STARTED' && (
                        <div>
                          <span className="text-bolt-elements-textSecondary text-sm mr-3">
                            {anchorProject.build.startedAt
                              ? new Date(anchorProject.build.startedAt).toLocaleString()
                              : ''}
                          </span>
                          Build has started
                          <span className="ml-3 inline-block i-ph:circle-notch-duotone scale-98 animate-spin text-bolt-elements-item-contentDefault align-text-top w-4 h-4"></span>
                        </div>
                      )}
                      {anchorProject.build.status === 'BUILDING' && (
                        <div>
                          <span className="text-bolt-elements-textSecondary text-sm mr-3">
                            {new Date().toLocaleString()}
                          </span>
                          Building
                          <span className="ml-3 inline-block i-ph:circle-notch-duotone scale-98 animate-spin text-bolt-elements-item-contentDefault align-text-top w-4 h-4"></span>
                        </div>
                      )}
                      {anchorProject.build.status === 'COMPLETED' && (
                        <>
                          <div>
                            <span className="text-bolt-elements-textSecondary text-sm mr-3">
                              {new Date(anchorProject.build.builtAt!).toLocaleString()}
                            </span>
                            Building has finished successfully
                            <span className="ml-3 inline-block i-ph:check text-bolt-elements-icon-success align-text-top w-4 h-4"></span>
                          </div>

                          <div className="flex *:flex-1 [&_p]:text-bolt-elements-textSecondary">
                            <div>
                              <div>
                                <p>Name:</p> {anchorProject.build.name}
                              </div>
                              <div>
                                <p>ID:</p> {anchorProject.build.id}
                              </div>
                              <div>
                                <p>Size:</p> {anchorProject.build.sizeBytes}
                              </div>
                            </div>
                            <div>
                              <div>
                                <p>Started at:</p> {new Date(anchorProject.build.startedAt!).toLocaleString()}
                              </div>
                              <div>
                                <p>Built at:</p> {new Date(anchorProject.build.builtAt!).toLocaleString()}
                              </div>
                              <div>
                                <p>Deploy cost:</p> <span className="opacity-70">$</span>{' '}
                                {anchorProject.build.deployCost}
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
                        </>
                      )}
                      {anchorProject.build.status === 'FAILED' && (
                        <>
                          <div>
                            <span className="text-bolt-elements-textSecondary text-sm mr-3">
                              {new Date().toLocaleString()}
                            </span>
                            {anchorProject.build.message}
                            <span className="ml-3 inline-block i-ph:x text-bolt-elements-icon-error align-text-top w-4 h-4"></span>
                          </div>
                          <div className="max-h-[150px] modern-scrollbar bg-bolt-elements-background-depth-2 p-2 text-bolt-elements-item-contentDanger">
                            {anchorProject.build.logs?.map((log, idx) => <p key={idx}>{log}</p>)}
                          </div>
                          <Button onClick={fixBuild}>Fix with AI</Button>
                        </>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  {anchorProject.deploy && (
                    <AccordionItem value="deploy">
                      <AccordionTrigger>Deploy</AccordionTrigger>
                      <AccordionContent className="flex flex-col gap-3">
                        {anchorProject.deploy.status === 'STARTED' && (
                          <div>
                            <span className="text-bolt-elements-textSecondary text-sm mr-3">
                              {anchorProject.build.startedAt
                                ? new Date(anchorProject.deploy.startedAt).toLocaleString()
                                : ''}
                            </span>
                            Deployment has started
                            <span className="ml-3 inline-block i-ph:circle-notch-duotone scale-98 animate-spin text-bolt-elements-item-contentDefault align-text-top w-4 h-4"></span>
                          </div>
                        )}
                        {anchorProject.deploy.status === 'DEPLOYING' && (
                          <div>
                            <span className="text-bolt-elements-textSecondary text-sm mr-3">
                              {new Date().toLocaleString()}
                            </span>
                            Deploying
                            <span className="ml-3 inline-block i-ph:circle-notch-duotone scale-98 animate-spin text-bolt-elements-item-contentDefault align-text-top w-4 h-4"></span>
                          </div>
                        )}
                        {anchorProject.deploy.status === 'COMPLETED' && (
                          <>
                            <div>
                              <span className="text-bolt-elements-textSecondary text-sm mr-3">
                                {anchorProject.deploy.deployedAt
                                  ? new Date(anchorProject.deploy.deployedAt).toLocaleString()
                                  : ''}
                              </span>
                              Deployment has finished successfully
                              <span className="ml-3 inline-block i-ph:check text-bolt-elements-icon-success align-text-top w-4 h-4"></span>
                            </div>
                            <div className="flex *:flex-1 [&_p]:text-bolt-elements-textSecondary">
                              <div>
                                <div>
                                  <p>Name:</p> {anchorProject.deploy.name}
                                </div>
                                <div>
                                  <p>ID:</p> {anchorProject.deploy.id}
                                </div>
                                <div>
                                  <p>Size:</p> {anchorProject.deploy.sizeBytes}
                                </div>
                              </div>
                              <div>
                                <div>
                                  <p>Network</p> {anchorProject.deploy.network}
                                </div>
                                <div>
                                  <p>Deployed at:</p> {new Date(anchorProject.deploy.deployedAt!).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                        {anchorProject.deploy.status === 'FAILED' && (
                          <>
                            <div>
                              <span className="text-bolt-elements-textSecondary text-sm mr-3">
                                {new Date().toLocaleString()}
                              </span>
                              {anchorProject.deploy.message}
                              <span className="ml-3 inline-block i-ph:x text-bolt-elements-icon-error align-text-top w-4 h-4"></span>
                            </div>
                            <div className="max-h-[150px] modern-scrollbar bg-bolt-elements-background-depth-2 p-2 text-bolt-elements-item-contentDanger">
                              {anchorProject.deploy.logs?.map((log, idx) => <p key={idx}>{log}</p>)}
                            </div>
                            <Button onClick={fixDeploy}>Fix with AI</Button>
                          </>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>

                {anchorProject.build?.status === 'COMPLETED' && !anchorProject.deploy && (
                  <Button onClick={deployContract}>
                    <span className="i-ph:rocket-launch h-4 w-4 text-bolt-elements-item-contentAccent"></span> Deploy
                    contract
                  </Button>
                )}
              </>
            ) : (
              <Button onClick={buildContract}>
                <span className="i-ph:hammer h-4 w-4 text-bolt-elements-item-contentAccent"></span> Build contract
              </Button>
            )}
          </div>
        </div>
      ) : (
        <p className="max-w-70 text-center self-center">
          No Anchor project has been detected. <br />
          <span className="text-muted-foreground text-sm">
            Create an Anchor project to get started with smart contract development.
          </span>
        </p>
      )}
    </div>
  );
}
