import { useMutation } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { client } from '../../api/backend/api';

export type ContractDeployRequestStatus = 'STARTED' | 'DEPLOYING' | 'COMPLETED' | 'FAILED';
export type SolanaNetwork = 'devnet' | 'mainnet';

export interface PostDeployRequestPayload {
  projectId: string;
  solanaNetwork: 'devnet' | 'mainnet';
}

export interface GetDeployRequestResponse {
  projectId: string;
  programId: string;
  network: SolanaNetwork;
  status: ContractDeployRequestStatus;
  startedAt: Date;
  message?: string;
  logs?: Array<string>;
}

export interface GetDeploymentResponse {
  programName: string;
  programId: string;
  programIds: object;
  network: SolanaNetwork;
  deployedAt: Date;
  upgradeAuthorityPublicKey: string;
}

export const usePostDeployRequest = () =>
  useMutation<void, AxiosError, PostDeployRequestPayload>({
    mutationFn: async (payload) => {
      const { data } = await client.post('/deploy-contract/deploy-request', payload);
      return data;
    }
  });

export const useGetDeployRequest = () =>
  useMutation<GetDeployRequestResponse, AxiosError, string>({
    mutationFn: async (projectId) => {
      const { data } = await client.get(`/deploy-contract/${projectId}/deploy-request`);
      return data;
    }
  });

export const useGetDeployment = () =>
  useMutation<GetDeploymentResponse, AxiosError, string>({
    mutationFn: async (projectId) => {
      const { data } = await client.get(`/deploy-contract/${projectId}/deployment`);
      return data;
    }
  });
