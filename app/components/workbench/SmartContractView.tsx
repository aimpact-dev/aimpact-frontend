import { useEffect, useRef, useState } from 'react';
import { Badge, Button } from '../ui';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  AnchorValidationStatus,
  getAnchorProjectSnapshot,
  validateAnchorProject
} from '~/lib/smartContracts/anchorProjectUtils';
import { toast } from 'react-toastify';
import {
  type GetBuildRequestResponse,
  type GetBuildResponse,
  useGetBuild,
  useGetBuildRequest,
  usePostBuildRequest
} from '~/lib/hooks/tanstack/useContractBuild';
import { chatId } from '~/lib/persistence';
import {
  type ContractDeployRequestStatus,
  type GetDeploymentResponse,
  type GetDeployRequestResponse,
  useGetDeployment,
  useGetDeployRequest,
  usePostDeployRequest

} from '~/lib/hooks/tanstack/useContractDeploy';
//TODO: Switch to real implementations.
// import {
//   useGetBuild,
//   useGetBuildRequest,
//   usePostBuildRequest
// } from '~/lib/hooks/tanstack/mocks/useContractBuild';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import axios, { Axios } from 'axios';

//Represents anchor project found in user's files on the client
interface LocalAnchorProject {
  path: string;
  programName: string;
}

interface ContractBuild extends GetBuildResponse{
  deployCost: number;
}

interface AnchorProject {
  name: string;
  path: string;
  buildRequest?: GetBuildRequestResponse;
  build?: ContractBuild;
  deploy?: {
    id: string;
    network: string;
    startedAt: string;
    status: ContractDeployRequestStatus;
    message?: string;
    logs?: Array<string>;
    name?: string;
    deployedAt?: string;
    sizeBytes?: number;
    idl?: string;
  };
}

const DEVNET_RPC = 'https://api.devnet.solana.com';
const ANCHOR_PROJECT_CHECKING_INTERVAL_MS = 1000;
const BUILD_REQUEST_POLLING_INTERVAL_MS = 5000;
const DEPLOY_REQUEST_POLLING_INTERVAL_MS = 1000;

export default function SmartContractView() {
  const [localAnchorProject, setLocalAnchorProject] = useState<LocalAnchorProject | null>();
  const [contractBuildRequest, setContractBuildRequest] = useState<GetBuildRequestResponse | null>();
  const [contractBuild, setContractBuild] = useState<ContractBuild | null>();
  const [contractDeployRequest, setContractDeployRequest] = useState<GetDeployRequestResponse | null>();
  const [contractDeployment, setContractDeployment] = useState<GetDeploymentResponse | null>();

  const [buildInProgress, setBuildInProgress] = useState<boolean>(false);
  const buildRequestPollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [openAccordion, setOpenAccordion] = useState<string | undefined>(undefined);

  const {mutateAsync: requestContractBuild } = usePostBuildRequest();
  const {mutateAsync: getContractBuildRequest } = useGetBuildRequest();
  const {mutateAsync: getContractBuild} = useGetBuild();
  const {mutateAsync: requestContractDeploy } = usePostDeployRequest();
  const {mutateAsync: getContractDeployRequest} = useGetDeployRequest();
  const {mutateAsync: getContractDeployment} = useGetDeployment();

  useEffect(() => {
    if (!localAnchorProject) return;

    if (contractDeployRequest) {
      setOpenAccordion('deploy');
    } else {
      setOpenAccordion('build');
    }
  }, [contractDeployRequest, contractBuildRequest]);

  const updateLocalAnchorProject = () => {
    const validationResult = validateAnchorProject();
    if(validationResult.status === AnchorValidationStatus.VALID){
      const snapshot = getAnchorProjectSnapshot(false);
      setLocalAnchorProject({
        path: 'src-anchor',
        programName: snapshot.programName
      })
    }
  }

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
  useEffect(()=> {
    const loadAnchorProject = async() => {
      const projectId = chatId.get();
      if(!projectId) {
        console.log("Initial load of anchor project data from backend failed, project id is undefined.");
        return;
      }

      try {
        const buildRequest = await getContractBuildRequest(projectId);
        setContractBuildRequest(buildRequest);
        if(buildRequest.status !== 'FAILED' && buildRequest.status !== 'COMPLETED'){
          setBuildInProgress(true);
        }
        else {
          setBuildInProgress(false);
        }
      }
      catch(e) {
        console.log(`On smart contract view load, could not get contract build request for project with id: ${projectId}, an error occurred: ${e}`);
      }

      try {
        const contractBuild = await getContractBuild(projectId);
        const connection = new Connection(DEVNET_RPC);
        const deployCostLamports = await connection.getMinimumBalanceForRentExemption(contractBuild.sizeBytes);
        const deployCostSOL = deployCostLamports / LAMPORTS_PER_SOL;
        setContractBuild({
          ...contractBuild,
          deployCost: deployCostSOL
        });
      }
      catch(e) {
        console.log(`On smart contract view load, could not  get build for project with id: ${projectId}, an error occurred: ${e}`);
      }

      try {
        const deployRequest = await getContractDeployRequest(projectId);
        setContractDeployRequest(deployRequest);
      }
      catch(e) {
        console.log(`On smart contract view load, could not get deploy request for project with id: ${projectId}, an error occurred: ${e} `);
      }

      try {
        const contractDeployment = await getContractDeployment(projectId);
        setContractDeployment(contractDeployment);
      }
      catch(e) {
        console.log(`On smart contract view load, could not get smart contract deployment for project with id: ${projectId}, an error occurred: ${e}`);
      }
    }
    loadAnchorProject();
  }, []);

  //This effect controls polling of build requests. You can start polling by setting buildInProgress to true.
  useEffect(() => {
    const projectId = chatId.get();

    if(buildInProgress){
      buildRequestPollingIntervalRef.current = setInterval(async () => {
        if(!projectId){
          toast.error('Cannot poll build request, project id is undefined.');
          return;
        }
        try{
          const buildRequest = await getContractBuildRequest(projectId);
          setContractBuildRequest(buildRequest);
          if(buildRequest.status === 'FAILED' || buildRequest.status === 'COMPLETED'){
            setBuildInProgress(false);
          }
        }
        catch (error){
          if (axios.isAxiosError(error) ) {
            if(error.response && error.response.status === 404){
              setContractBuildRequest(null);
              buildRequestPollingIntervalRef.current = null;
              setBuildInProgress(false);
              toast.error('Build request was not found on the server, stopping polling.');
            }
            else{
              toast.error('Network error when polling build request.');
            }
          }
          else{
            toast.error('An unknown error occurred when polling build request.');
          }
        }
      }, BUILD_REQUEST_POLLING_INTERVAL_MS);
    } else if (buildRequestPollingIntervalRef.current){
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

  const buildContract = async () => {
    if(buildInProgress){
      return;
    }
    const validationResult = validateAnchorProject();
    if(validationResult.status !== AnchorValidationStatus.VALID){
      //TODO: Add more comprehensive invalid anchor project handling.
      toast.error("Cannot build contract, validation error occurred: " + validationResult.message);
    }
    else{
      const snapshot = getAnchorProjectSnapshot(false);
      try {
        const projectId = chatId.get();
        if (!projectId) {
          toast.error("Cannot request contract build, could not retrieve project id.");
          return;
        }
        setBuildInProgress(true);
        await requestContractBuild({
          projectId: projectId,
          snapshot: snapshot.files
        });
      }
      catch (error) {
        setBuildInProgress(false);
        if(error instanceof Error) {
          toast.error("Smart contract build request failed with an error: " + error.message);
        }
        else {
          toast.error("Smart contract build request failed with an unknown error.");
        }
      }
    }
  };

  const fixBuild = () => {

  };

  const deployContract = () => {

  };

  const fixDeploy = () => {

  };

  const getStatusBadge = () => {
    if (!localAnchorProject) {
      return <Badge variant="secondary">No project</Badge>;
    }
    if (contractBuildRequest && !contractDeployRequest) {
      switch (contractBuildRequest.status) {
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

    if (contractDeployRequest) {
      switch (contractDeployRequest.status) {
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
      {localAnchorProject ? (
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

            {(!contractBuildRequest ||
              contractBuildRequest.status === 'FAILED' ||
              contractBuildRequest.status === 'COMPLETED') && (
              <Button onClick={buildContract}>
                <span className="i-ph:hammer h-4 w-4 text-bolt-elements-item-contentAccent"></span> Build contract
              </Button>
            )}
            {contractBuildRequest && (
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
                      {contractBuildRequest.status === 'STARTED' && (
                        <div>
                          <span className="text-bolt-elements-textSecondary text-sm mr-3">
                            {contractBuildRequest.startedAt
                              ? new Date(contractBuildRequest.startedAt).toLocaleString()
                              : ''}
                          </span>
                          Build has started
                          <span className="ml-3 inline-block i-ph:circle-notch-duotone scale-98 animate-spin text-bolt-elements-item-contentDefault align-text-top w-4 h-4"></span>
                        </div>
                      )}
                      {contractBuildRequest.status === 'BUILDING' && (
                        <div>
                          <span className="text-bolt-elements-textSecondary text-sm mr-3">
                            {new Date().toLocaleString()}
                          </span>
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
                                    <p>Deploy cost:</p> <span className="opacity-70">SOL</span>{' '}
                                    {contractBuild.deployCost}
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
                            <span className="text-bolt-elements-textSecondary text-sm mr-3">
                              {new Date().toLocaleString()}
                            </span>
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
                              {contractDeployRequest.startedAt
                                ? new Date(contractDeployRequest.startedAt).toLocaleString()
                                : ''}
                            </span>
                            Deployment has started
                            <span className="ml-3 inline-block i-ph:circle-notch-duotone scale-98 animate-spin text-bolt-elements-item-contentDefault align-text-top w-4 h-4"></span>
                          </div>
                        )}
                        {contractDeployRequest.status === 'DEPLOYING' && (
                          <div>
                            <span className="text-bolt-elements-textSecondary text-sm mr-3">
                              {new Date().toLocaleString()}
                            </span>
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
                                    {contractDeployment.deployedAt
                                      ? new Date(contractDeployment.deployedAt).toLocaleString()
                                      : ''}
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
                                      <p>ID:</p> {contractDeployment.programId}
                                    </div>
                                    {/*<div>*/}
                                    {/*  <p>Size:</p> {contractDeployment.sizeBytes}*/}
                                    {/*</div>*/}
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
                              </>
                            ) : (
                              <>
                                <div>
                                  Deployment has finished successfully, downloading deploy artifacts.
                                  <span className="ml-3 inline-block i-ph:check text-bolt-elements-icon-success align-text-top w-4 h-4"></span>
                                </div>
                              </>
                            )}
                          </>
                        )}
                        {contractDeployRequest.status === 'FAILED' && (
                          <>
                            <div>
                              <span className="text-bolt-elements-textSecondary text-sm mr-3">
                                {new Date().toLocaleString()}
                              </span>
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

                {contractBuildRequest?.status === 'COMPLETED' && !contractDeployRequest && (
                  <Button onClick={deployContract}>
                    <span className="i-ph:rocket-launch h-4 w-4 text-bolt-elements-item-contentAccent"></span> Deploy
                    contract
                  </Button>
                )}
              </>
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
