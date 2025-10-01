//TODO: Use MSW or other library for mocking APIs in the future.

import { useMutation } from '@tanstack/react-query';
import { AxiosError, AxiosHeaders } from 'axios';
import { client } from '~/lib/api/backend/api';
import type {
  GetBuildRequestResponse,
  GetBuildResponse,
  PostBuildRequestPayload
} from '~/lib/hooks/tanstack/useContractBuild';

//Change this const to control build failures imitation.
const FAIL_BUILD_REQUEST: boolean = false;

const POST_REQUEST_DELAY_MS = 1000;
const GET_REQUEST_DELAY_MS = 500;
const GET_BUILD_DELAY_MS = 500;
const MIN_TIME_BETWEEN_REQUESTS_MS = 60 * 1000;
const STATE_SWITCH_INTERVAL_MS = 10 * 1000;

let currentRequest: GetBuildRequestResponse | null = null;
let currentBuild: GetBuildResponse | null = null;

let stateSwitchTimeout: NodeJS.Timeout | null = null;

function switchToBuilding(){
  if(!currentRequest) return;
  currentRequest.status = 'BUILDING';
  if(FAIL_BUILD_REQUEST){
    stateSwitchTimeout = setTimeout(()=>switchToFailed(), STATE_SWITCH_INTERVAL_MS);
  }
  else{
    stateSwitchTimeout = setInterval(() => switchToCompleted(), STATE_SWITCH_INTERVAL_MS);
  }
}

function switchToCompleted(){
  if(!currentRequest) return;
  currentRequest.status = 'COMPLETED';
  currentBuild = {
    programName: "Mock program",
    programId: "mockprogramid1234",
    programIdl: {'address': 'mockprogramaddress'},
    sizeBytes: 256,
    builtAt: new Date(),
    buildUrl: 'mockbuildurl',
  }
}

function switchToFailed(){
  if(!currentRequest) return;
  currentRequest.status = 'FAILED';
  currentRequest.message = 'Contract build failed.';
  currentRequest.logs = ['An error occurred when building smart contract.', 'Some files were missing or wahtever.', 'This is a mock fail message.'];
}

export const useGetBuild = () =>
  useMutation<GetBuildResponse, AxiosError, string>({
    mutationFn: async(projectId) => {
      await new Promise(res => setTimeout(res, GET_BUILD_DELAY_MS));
      if(!currentBuild){
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
      }
      else{
        return currentBuild;
      }
    }
  });

export const useGetBuildRequest = () =>
  useMutation<GetBuildRequestResponse, AxiosError, string>({
    mutationFn: async (projectId) => {
      await new Promise(res => setTimeout(res, GET_REQUEST_DELAY_MS));
      if(!currentRequest){
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
      }
      else{
        return currentRequest;
      }
    }
  });

export const usePostBuildRequest = () =>
  useMutation<void, AxiosError, PostBuildRequestPayload>({
    mutationFn: async (payload) => {
      await new Promise(res => setTimeout(res, POST_REQUEST_DELAY_MS));
      if(!currentRequest ||
        (Date.now() - currentRequest.startedAt.getTime() > MIN_TIME_BETWEEN_REQUESTS_MS)) {
        currentRequest = {
          projectId: payload.projectId,
          status: 'STARTED',
          startedAt: new Date()
        }
        if(stateSwitchTimeout){
          clearInterval(stateSwitchTimeout);
        }
        stateSwitchTimeout = setTimeout(() => switchToBuilding(), STATE_SWITCH_INTERVAL_MS);
        return;
      }
      else {
        throw new AxiosError(
          'Forbidden',
          'ERR_FORBIDDEN',
          undefined,
          undefined,
          { status: 403, statusText: 'Forbidden', headers: {}, config: {
              headers: new AxiosHeaders()
            }, data: {} }
        );
      }
    },
  });
