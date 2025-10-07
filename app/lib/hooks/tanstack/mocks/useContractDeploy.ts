//TODO: Use a mocking library like MSW for mocking api calls.

import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { AxiosHeaders } from 'axios';
import type {
  GetDeploymentResponse,
  GetDeployRequestResponse,
  PostDeployRequestPayload
} from '~/lib/hooks/tanstack/useContractDeploy';

// Change this const to control deploy failures imitation.
const FAIL_DEPLOY_REQUEST: boolean = false;

const POST_REQUEST_DELAY_MS = 1000;
const GET_REQUEST_DELAY_MS = 500;
const GET_DEPLOY_DELAY_MS = 500;
const MIN_TIME_BETWEEN_REQUESTS_MS = 60 * 1000;
const STATE_SWITCH_INTERVAL_MS = 5 * 1000;

let currentRequest: GetDeployRequestResponse | null = null;
let currentDeployment: GetDeploymentResponse | null = null;

let stateSwitchTimeout: NodeJS.Timeout | null = null;

function switchToDeploying() {
  if (!currentRequest) return;
  currentRequest.status = 'DEPLOYING';
  if (FAIL_DEPLOY_REQUEST) {
    stateSwitchTimeout = setTimeout(() => switchToFailed(), STATE_SWITCH_INTERVAL_MS);
  } else {
    stateSwitchTimeout = setTimeout(() => switchToCompleted(), STATE_SWITCH_INTERVAL_MS);
  }
}

function switchToCompleted() {
  if (!currentRequest) return;
  currentRequest.status = 'COMPLETED';
  currentDeployment = {
    programName: 'Mock program',
    programId: 'mockprogramid1234',
    programIdl: { address: 'mockprogramaddress' },
    network: currentRequest.network,
    deployedAt: new Date(),
    upgradeAuthorityPublicKey: 'mockupgradeauthoritykey',
    buildFinishTime: new Date(),
  };
}

function switchToFailed() {
  if (!currentRequest) return;
  currentRequest.status = 'FAILED';
  currentRequest.message = 'Contract deploy failed.';
  currentRequest.logs = [
    'An error occurred when deploying smart contract.',
    'Some files were missing or whatever.',
    'This is a mock fail message.'
  ];
}

export const useGetDeployment = () =>
  useMutation<GetDeploymentResponse, AxiosError, string>({
    mutationFn: async (projectId) => {
      await new Promise(res => setTimeout(res, GET_DEPLOY_DELAY_MS));
      if (!currentDeployment) {
        throw new AxiosError(
          'Not Found',
          'ERR_NOT_FOUND',
          undefined,
          undefined,
          {
            status: 404,
            statusText: 'Not Found',
            headers: new AxiosHeaders(),
            config: { headers: new AxiosHeaders() },
            data: {}
          }
        );
      } else {
        return {...currentDeployment};
      }
    }
  });

export const useGetDeployRequest = () =>
  useMutation<GetDeployRequestResponse, AxiosError, string>({
    mutationFn: async (projectId) => {
      await new Promise(res => setTimeout(res, GET_REQUEST_DELAY_MS));
      if (!currentRequest) {
        throw new AxiosError(
          'Not Found',
          'ERR_NOT_FOUND',
          undefined,
          undefined,
          {
            status: 404,
            statusText: 'Not Found',
            headers: new AxiosHeaders(),
            config: { headers: new AxiosHeaders() },
            data: {}
          }
        );
      } else {
        return {...currentRequest};
      }
    }
  });

export const usePostDeployRequest = () =>
  useMutation<void, AxiosError, PostDeployRequestPayload>({
    mutationFn: async (payload) => {
      await new Promise(res => setTimeout(res, POST_REQUEST_DELAY_MS));
      if (!currentRequest ||
        currentRequest.status === 'FAILED' ||
        currentRequest.status === 'COMPLETED' ||
        (Date.now() - currentRequest.startedAt.getTime() > MIN_TIME_BETWEEN_REQUESTS_MS)) {
        currentRequest = {
          projectId: payload.projectId,
          programId: 'mockprogramid1234',
          network: payload.network,
          status: 'STARTED',
          startedAt: new Date(),
        };
        if (stateSwitchTimeout) {
          clearTimeout(stateSwitchTimeout);
        }
        stateSwitchTimeout = setTimeout(() => switchToDeploying(), STATE_SWITCH_INTERVAL_MS);
        return;
      } else {
        throw new AxiosError(
          'Forbidden',
          'ERR_FORBIDDEN',
          undefined,
          undefined,
          {
            status: 403,
            statusText: 'Forbidden',
            headers: {},
            config: { headers: new AxiosHeaders() },
            data: {}
          }
        );
      }
    },
  });
