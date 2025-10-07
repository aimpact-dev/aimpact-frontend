import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Button } from '../../ui';
import {
  AnchorValidationStatus,
  getAnchorProjectSnapshot,
  validateAnchorProject,
  type AnchorValidationResult,
} from '~/lib/smartContracts/anchorProjectUtils';
import { toast } from 'react-toastify';
import {
  type GetBuildRequestResponse,
  type GetBuildResponse,
  useGetBuild,
  useGetBuildRequest,
  usePostBuildRequest,
} from '~/lib/hooks/tanstack/useContractBuild';

import { chatId } from '~/lib/persistence';
import {
  type ContractDeployRequestStatus,
  type GetDeploymentResponse,
  type GetDeployRequestResponse,
  useGetDeployment,
  useGetDeployRequest,
  usePostDeployRequest,
} from '~/lib/hooks/tanstack/useContractDeploy';
// import {
//   useGetBuild,
//   useGetBuildRequest,
//   usePostBuildRequest,
// }from '~/lib/hooks/tanstack/mocks/useContractBuild';
// import {
//   useGetDeployment,
//   useGetDeployRequest,
//   usePostDeployRequest,
// } from '~/lib/hooks/tanstack/mocks/useContractDeploy';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import axios from 'axios';
import { getAimpactFs } from '~/lib/aimpactfs';
import SmartContractAccordion from './SmartContractAccordion';

//Represents anchor project found in user's files on the client
interface LocalAnchorProject {
  path: string;
  programName: string;
}

export interface ContractBuild extends GetBuildResponse {
  deployCost: number;
}

interface Props {
  postMessage: (message: string) => void;
}

const CONTRACT_IDL_FILE_NAME = 'contract-idl.json';
const DEVNET_RPC = 'https://api.devnet.solana.com';
const ANCHOR_PROJECT_CHECKING_INTERVAL_MS = 1000;
const BUILD_REQUEST_POLLING_INTERVAL_MS = 5000;
const DEPLOY_REQUEST_POLLING_INTERVAL_MS = 5000;

export default function SmartContractView({ postMessage }: Props) {
  const [lastValidationResult, setLastValidationResult] = useState<AnchorValidationResult | null>(null);
  const [localAnchorProject, setLocalAnchorProject] = useState<LocalAnchorProject | null>(null);
  const [contractBuildRequest, setContractBuildRequest] = useState<GetBuildRequestResponse | null>(null);
  const [contractBuild, setContractBuild] = useState<ContractBuild | null>(null);
  const [contractDeployRequest, setContractDeployRequest] = useState<GetDeployRequestResponse | null>(null);
  const [contractDeployment, setContractDeployment] = useState<GetDeploymentResponse | null>(null);

  const [buildInProgress, setBuildInProgress] = useState<boolean>(false);
  const buildRequestPollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [deployInProgress, setDeployInProgress] = useState<boolean>(false);
  const deployRequestPollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [openAccordion, setOpenAccordion] = useState<string | undefined>(undefined);

  const { mutateAsync: requestContractBuild } = usePostBuildRequest();
  const { mutateAsync: getContractBuildRequest } = useGetBuildRequest();
  const { mutateAsync: getContractBuild } = useGetBuild();
  const { mutateAsync: requestContractDeploy } = usePostDeployRequest();
  const { mutateAsync: getContractDeployRequest } = useGetDeployRequest();
  const { mutateAsync: getContractDeployment } = useGetDeployment();

  const updateLocalAnchorProject = () => {
    const validationResult = validateAnchorProject();
    setLastValidationResult(validationResult);
    if (validationResult.status === AnchorValidationStatus.VALID) {
      const snapshot = getAnchorProjectSnapshot(false);
      setLocalAnchorProject({
        path: 'src-anchor',
        programName: snapshot.programName,
      });
    }
  };

  //Converting GetBuildResponse to the local contract build type by adding deploy cost to it.
  const convertToContractBuild = async (buildResponse: GetBuildResponse): Promise<ContractBuild> => {
    const connection = new Connection(DEVNET_RPC);
    const deployCostLamports = await connection.getMinimumBalanceForRentExemption(buildResponse.sizeBytes);
    const deployCostSOL = deployCostLamports / LAMPORTS_PER_SOL;
    return {
      ...buildResponse,
      deployCost: deployCostSOL,
    };
  };

  //Checking local files for anchor project and setting up periodical anchor project check
  useEffect(() => {
    updateLocalAnchorProject();
    const interval = setInterval(() => {
      updateLocalAnchorProject();
    }, ANCHOR_PROJECT_CHECKING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  //User may already have smart contract artifacts (build and deploy requests, build, deployment), so we need to download them on smart
  //contracts section load.
  useEffect(() => {
    const loadAnchorProject = async () => {
      const projectId = chatId.get();
      if (!projectId) {
        console.log('Initial load of anchor project data from backend failed, project id is undefined.');
        return;
      }

      try {
        const buildRequest = await getContractBuildRequest(projectId);
        setContractBuildRequest(buildRequest);
        if (buildRequest.status !== 'FAILED' && buildRequest.status !== 'COMPLETED') {
          setBuildInProgress(true);
        } else {
          setBuildInProgress(false);
        }
      } catch (e) {
        console.log(
          `On smart contract view load, could not get contract build request for project with id: ${projectId}, an error occurred: ${e}`,
        );
      }

      try {
        const contractBuildResponse = await getContractBuild(projectId);
        setContractBuild(await convertToContractBuild(contractBuildResponse));
      } catch (e) {
        console.log(
          `On smart contract view load, could not  get build for project with id: ${projectId}, an error occurred: ${e}`,
        );
      }

      try {
        const deployRequest = await getContractDeployRequest(projectId);
        setContractDeployRequest(deployRequest);
      } catch (e) {
        console.log(
          `On smart contract view load, could not get deploy request for project with id: ${projectId}, an error occurred: ${e} `,
        );
      }

      try {
        const contractDeployment = await getContractDeployment(projectId);
        const fs = await getAimpactFs();
        await fs.writeFile(CONTRACT_IDL_FILE_NAME, JSON.stringify(contractDeployment.programIdl), 'utf-8');
        setContractDeployment(contractDeployment);
      } catch (e) {
        console.log(
          `On smart contract view load, could not get smart contract deployment for project with id: ${projectId}, an error occurred: ${e}`,
        );
      }
    };
    loadAnchorProject();
  }, []);

  //This effect controls polling of build requests. You can start polling by setting buildInProgress to true.
  useEffect(() => {
    //This function retrieves contract build and processes 404 error in case build is not found on the backend.
    //Should be called upon build request completion.
    const onBuildComplete = async () => {
      const projectId = chatId.get();
      if (!projectId) return;
      try {
        const buildResponse = await getContractBuild(projectId);
        setContractBuild(await convertToContractBuild(buildResponse));
      } catch (error) {
        if (axios.isAxiosError(error) && error.response && error.response.status === 404) {
          toast.error('Contract build was not found on the server after build completion.');
        } else {
          throw error;
        }
      }
    };

    if (buildInProgress) {
      if (buildRequestPollingIntervalRef.current) {
        clearInterval(buildRequestPollingIntervalRef.current);
      }
      buildRequestPollingIntervalRef.current = setInterval(async () => {
        const projectId = chatId.get();
        if (!projectId) {
          toast.error('Cannot poll build request, project id is undefined.');
          return;
        }
        try {
          const buildRequest = await getContractBuildRequest(projectId);
          setContractBuildRequest(buildRequest);
          if (buildRequest.status === 'FAILED' || buildRequest.status === 'COMPLETED') {
            if (buildRequest.status === 'COMPLETED') {
              await onBuildComplete();
            }
            setBuildInProgress(false);
          }
        } catch (error) {
          if (axios.isAxiosError(error)) {
            if (error.response && error.response.status === 404) {
              setContractBuildRequest(null);
              if (buildRequestPollingIntervalRef.current) {
                clearInterval(buildRequestPollingIntervalRef.current);
              }
              buildRequestPollingIntervalRef.current = null;
              setBuildInProgress(false);
              toast.error('Build request was not found on the server, stopping polling.');
            } else {
              toast.error('Network error when polling build request.');
              console.error('Network error when polling build request: ', {
                message: error.message,
                code: error.code,
                status: error.response?.status,
                data: error.response?.data,
                url: error.config?.url,
              });
            }
          } else {
            toast.error('An unknown error occurred when polling build request.');
            console.error('Unknown error when polling build request: ' + error);
          }
        }
      }, BUILD_REQUEST_POLLING_INTERVAL_MS);
    } else if (buildRequestPollingIntervalRef.current) {
      clearInterval(buildRequestPollingIntervalRef.current);
      buildRequestPollingIntervalRef.current = null;
    }

    return () => {
      if (buildRequestPollingIntervalRef.current) {
        clearInterval(buildRequestPollingIntervalRef.current);
        buildRequestPollingIntervalRef.current = null;
      }
    };
  }, [buildInProgress]);

  //This effect controls polling of deploy request. You can start polling by setting deployInProgress to true.
  useEffect(() => {
    const onDeployComplete = async () => {
      const projectId = chatId.get();
      if (!projectId) return;
      try {
        const fs = await getAimpactFs();
        const deployment = await getContractDeployment(projectId);
        setContractDeployment(deployment);
        await fs.writeFile(CONTRACT_IDL_FILE_NAME, JSON.stringify(deployment.programIdl), 'utf-8');
      } catch (error) {
        if (axios.isAxiosError(error) && error.response && error.response.status === 404) {
          toast.error('Contract deployment was not found on the server after deploy completion.');
        } else {
          throw error;
        }
      }
    };

    if (deployInProgress) {
      deployRequestPollingIntervalRef.current = setInterval(async () => {
        const projectId = chatId.get();
        if (!projectId) {
          toast.error('Cannot poll deploy request, project id is undefined.');
          return;
        }
        try {
          const deployRequest = await getContractDeployRequest(projectId);
          setContractDeployRequest(deployRequest);
          if (deployRequest.status === 'FAILED' || deployRequest.status === 'COMPLETED') {
            if (deployRequest.status === 'COMPLETED') {
              await onDeployComplete();
            }
            setDeployInProgress(false);
          }
        } catch (error) {
          if (axios.isAxiosError(error)) {
            if (error.response && error.response.status === 404) {
              setContractDeployRequest(null);
              if (deployRequestPollingIntervalRef.current) {
                clearInterval(deployRequestPollingIntervalRef.current);
              }
              deployRequestPollingIntervalRef.current = null;
              setDeployInProgress(false);
              toast.error('Deploy request was not found on the server, stopping polling.');
            } else {
              toast.error('Network error when polling deploy request.');
              console.error('Network error when polling deploy request: ', {
                message: error.message,
                code: error.code,
                status: error.response?.status,
                data: error.response?.data,
                url: error.config?.url,
              });
            }
          } else {
            toast.error('An unknown error occurred when polling deploy request.');
            console.error('Unknown error when polling deploy request: ' + error);
          }
        }
      }, DEPLOY_REQUEST_POLLING_INTERVAL_MS);
    } else if (deployRequestPollingIntervalRef.current) {
      clearInterval(deployRequestPollingIntervalRef.current);
      deployRequestPollingIntervalRef.current = null;
    }

    return () => {
      if (deployRequestPollingIntervalRef.current) {
        clearInterval(deployRequestPollingIntervalRef.current);
        deployRequestPollingIntervalRef.current = null;
      }
    };
  }, [deployInProgress]);

  const buildContract = useCallback(async () => {
    if (buildInProgress) {
      return;
    }
    setBuildInProgress(true);
    setOpenAccordion('build');
    const validationResult = validateAnchorProject();
    if (validationResult.status !== AnchorValidationStatus.VALID) {
      //TODO: Add more comprehensive invalid anchor project handling.
      setBuildInProgress(false);
      toast.error('Cannot build contract, validation error occurred: ' + validationResult.message);
    } else {
      const snapshot = getAnchorProjectSnapshot(false);
      try {
        const projectId = chatId.get();
        if (!projectId) {
          setBuildInProgress(false);
          toast.error('Cannot request contract build, could not retrieve project id.');
          return;
        }
        await requestContractBuild({
          projectId: projectId,
          snapshot: snapshot.files,
        });
        const request = await getContractBuildRequest(projectId);
        setContractBuildRequest(request);
      } catch (error) {
        setBuildInProgress(false);
        if (error instanceof Error) {
          toast.error('Smart contract build request failed with an error: ' + error.message);
        } else {
          toast.error('Smart contract build request failed with an unknown error.');
        }
      }
    }
  }, []);

  const fixBuild = useCallback(() => {
    console.log("Trying to fix build.");
    if (!contractBuildRequest || contractBuildRequest.status !== 'FAILED') return;
    const content = contractBuildRequest.logs?.join('\n');
    postMessage(`*Fix this anchor build error* \n\`\`\`${'sh'}\n${content}\n\`\`\`\n`);
  }, []);

  const deployContract = useCallback(async () => {
    if (deployInProgress) {
      return;
    }
    setDeployInProgress(true);
    setOpenAccordion('deploy');
    const projectId = chatId.get();
    if (!projectId) {
      setDeployInProgress(false);
      toast.error('Cannot request contract deploy, could not retrieve project id.');
      return;
    }
    try {
      await requestContractDeploy({
        projectId: projectId,
        network: 'devnet',
      });
      const request = await getContractDeployRequest(projectId);
      setContractDeployRequest(request);
    } catch (error) {
      setDeployInProgress(false);
      if (error instanceof Error) {
        toast.error('Smart contract deploy request failed with an error: ' + error.message);
      } else {
        toast.error('Smart contract deploy request failed with an unknown error.');
      }
    }
  }, []);

  const fixDeploy = useCallback(() => {
    if (!contractDeployRequest || contractDeployRequest.status !== 'FAILED') return;
    const content = contractDeployRequest.logs?.join('\n');
    postMessage(`*Fix this anchor contract deploy error* \n\`\`\`${'sh'}\n${content}\n\`\`\`\n`);
  }, []);

  const getStatusBadge = () => {
    if (!localAnchorProject) {
      return <Badge variant="secondary">No project</Badge>;
    }

    const badges: React.ReactNode[] = [];

    if (contractBuildRequest) {
      switch (contractBuildRequest.status) {
        case 'STARTED':
          badges.push(
            <Badge key="build-started" variant="warning">
              Build requested
            </Badge>,
          );
          break;
        case 'BUILDING':
          badges.push(
            <Badge key="build-building" variant="info">
              Building...
            </Badge>,
          );
          break;
        case 'COMPLETED':
          badges.push(
            <Badge key="build-completed" variant="success">
              Build completed
            </Badge>,
          );
          if (!contractDeployRequest) {
            badges.push(
              <Badge key="ready-deploy" variant="primary">
                Ready for deploy
              </Badge>,
            );
          }
          break;
        case 'FAILED':
          badges.push(
            <Badge key="build-failed" variant="destructive">
              Build failed
            </Badge>,
          );
          break;
      }
    }

    if (contractDeployRequest) {
      switch (contractDeployRequest.status) {
        case 'STARTED':
          badges.push(
            <Badge key="deploy-started" variant="warning">
              Deploy requested
            </Badge>,
          );
          break;
        case 'DEPLOYING':
          badges.push(
            <Badge key="deploying" variant="info">
              Deploying...
            </Badge>,
          );
          break;
        case 'COMPLETED':
          badges.push(
            <Badge key="deploy-completed" variant="success">
              Deploy completed
            </Badge>,
          );
          break;
        case 'FAILED':
          badges.push(
            <Badge key="deploy-failed" variant="destructive">
              Deploy failed
            </Badge>,
          );
          break;
      }
    }

    if (contractDeployment && contractBuild && contractDeployment.buildTime !== contractBuild.builtAt) {
      badges.push(
        <Badge key="deploy-outdated" variant="warning">
          Deploy outdated
        </Badge>,
      );
    }

    if (badges.length === 0) {
      return <Badge variant="primary">Ready to build</Badge>;
    }

    return <div className="flex gap-2">{badges}</div>;
  };

  return (
    <div className="flex w-full h-full justify-center bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary">
      {lastValidationResult && lastValidationResult.status === 'VALID' && localAnchorProject ? (
        <div className="w-full bg-bolt-elements-background-depth-2 px-6 py-8 overflow-auto [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex flex-col xl:gap-6 gap-3 px-6 py-8 bg-bolt-elements-background-depth-3 rounded-sm">
            <div className="flex justify-between">
              <h1>Anchor project detected</h1>
              {getStatusBadge()}
            </div>
            <div className="bg-bolt-elements-background-depth-2 border rounded-lg *:p-3 border-bolt-elements-borderColor">
              <div className="flex items-center gap-2 ">
                <span className="text-sm text-muted-foreground">Program name:</span>
                <span className="bg-muted px-2 py-1 rounded text-sm font-mono text-bolt-elements-item-contentAccent">
                  {localAnchorProject.programName}
                </span>
              </div>
              <div className="flex items-center gap-2 border-t border-bolt-elements-borderColor">
                <span className="text-sm text-muted-foreground">Path:</span>
                <span className="bg-muted px-2 py-1 rounded text-sm font-mono text-bolt-elements-item-contentAccent">
                  {localAnchorProject.path}
                </span>
              </div>
            </div>

            {!contractBuildRequest && (
              <Button onClick={buildContract}>
                <span className="i-ph:hammer h-4 w-4 text-bolt-elements-item-contentAccent"></span> Build contract
              </Button>
            )}
            {contractBuildRequest && (
              <>
                <SmartContractAccordion
                  openAccordion={openAccordion}
                  setOpenAccordion={setOpenAccordion}
                  contractBuildRequest={contractBuildRequest}
                  contractBuild={contractBuild}
                  contractDeployRequest={contractDeployRequest}
                  contractDeployment={contractDeployment}
                  buildInProgress={buildInProgress}
                  deployInProgress={deployInProgress}
                  buildContract={buildContract}
                  fixBuild={fixBuild}
                  deployContract={deployContract}
                  fixDeploy={fixDeploy}
                />

                {contractBuildRequest?.status === 'COMPLETED' && contractBuild && !contractDeployRequest && (
                  <Button onClick={deployContract}>
                    <span className="i-ph:rocket-launch h-4 w-4 text-bolt-elements-item-contentAccent"></span> Deploy
                    contract
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      ) : lastValidationResult && lastValidationResult.status === 'INVALID' ? (
        <p className="max-w-70 text-center self-center text-destructive">{lastValidationResult.message}</p>
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
