import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { client } from '../../api/backend/api';
import type { Dirent } from '~/lib/stores/files';

export interface IcpDeployResponse {
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

export interface AkashDeployResponse {
  url: string;
}

export interface S3DeployResponse {
  url: string;
}

export interface PostDeployResponse {
  url: string;
}

export interface PostDeployPayload {
  projectId: string;
  snapshot: Record<string, Dirent | undefined>;
}

export const useGetIcpDeploy = () =>
  useMutation<IcpDeployResponse, AxiosError, string>({
    mutationFn: async (projectId) => {
      const { data } = await client.get<IcpDeployResponse>('/deploy-app/icp-deployment', { params: { projectId } });
      return data;
    },
  });

export const useGetS3Deploy = () =>
  useMutation<S3DeployResponse, AxiosError, string>({
    mutationFn: async (projectId) => {
      const { data } = await client.get<S3DeployResponse>('/deploy-app/s3-deployment', { params: { projectId } });
      return data;
    },
  });

export const usePostS3Deploy = () =>
  useMutation<PostDeployResponse, AxiosError, PostDeployPayload>({
    mutationFn: async (payload) => {
      const { data } = await client.post<PostDeployResponse>('/deploy-app/s3-deployment', payload);
      return data;
    },
  });

export const useGetAkashDeploy = () =>
  useMutation<AkashDeployResponse, AxiosError, string>({
    mutationFn: async (projectId) => {
      const { data } = await client.get<AkashDeployResponse>('/deploy-app/akash-deployment', { params: { projectId } });
      return data;
    },
  });

export const usePostAkashDeploy = () =>
  useMutation<PostDeployResponse, AxiosError, PostDeployPayload>({
    mutationFn: async (payload) => {
      const { data } = await client.post<PostDeployResponse>('/deploy-app/akash-deployment', payload);
      return data;
    },
  });
