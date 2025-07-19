import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { client } from '../../api/backend/api';
import type { Dirent } from '~/lib/stores/files';

export interface DeployResponse {
  projectId: string;
  deploymentId: string;
  status: string;
  isDeployed: boolean;
  message: string;
  logs: Array<Record<string, unknown>>;
  finalUrl: string;
  provider: string;
  createdAt: string;
}

export interface PostDeployResponse {
  url: string;
}

export interface PostDeployPayload {
  projectId: string;
  snapshot: Record<string, Dirent | undefined>;
}

export const useGetDeploy = () =>
  useMutation<DeployResponse, AxiosError, string>({
    mutationFn: async (projectId) => {
      const { data } = await client.get<DeployResponse>(
        '/deploy-app/icp-deployment',
        { params: { projectId } }
      );
      return data;
    },
  });

export const usePostDeploy = () =>
  useMutation<PostDeployResponse, AxiosError, PostDeployPayload>({
    mutationFn: async (payload) => {
      const { data } = await client.post<PostDeployResponse>(
        '/deploy-app/icp-deployment',
        payload
      );
      return data;
    },
  });