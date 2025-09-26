import { useMutation } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { client } from '../../api/backend/api';
import type { Dirent } from '~/lib/stores/files';
import { toast } from 'react-toastify';
import { chatId } from '~/lib/persistence';
import { getAnchorProjectSnapshot, validateAnchorProject } from '~/lib/smartContracts/anchorProjectUtils';

export type ContractBuildRequestStatus = 'STARTED' | 'BUILDING' | 'COMPLETED' | 'FAILED';

export interface PostBuildRequestPayload {
  projectId: string;
  snapshot: Record<string, Dirent | undefined>;
}

export interface GetBuildRequestResponse {
  projectId: string;
  status: ContractBuildRequestStatus;
  startedAt: Date;
  message?: string;
  logs?: Array<string>;
}

export interface GetBuildResponse {
  programId: string;
  programIdl: object;
  programName: string;
  buildUrl: string;
  builtAt: Date;
  sizeBytes: number;
}

export const useGetBuild = () =>
  useMutation<GetBuildResponse, AxiosError, string>({
    mutationFn: async(projectId) => {
      const { data } = await client.get<GetBuildResponse>(`/build-contract/${projectId}/build`);
      return data;
    }
  });

export const useGetBuildRequest = () =>
  useMutation<GetBuildRequestResponse, AxiosError, string>({
    mutationFn: async (projectId) => {
      const { data } = await client.get<GetBuildRequestResponse>(`/build-contract/${projectId}/build-request`);
      return data;
    }
  });

export const usePostBuildRequest = () =>
  useMutation<void, AxiosError, PostBuildRequestPayload>({
    mutationFn: async (payload) => {
      const { data } = await client.post('/build-contract/build-request', payload);
      return data;
    },
  });
