import { useMutation, useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { ky } from 'query';
import { client } from '~/lib/api/backend/api';

interface AppDeployments {
  provider: string;
  url: string | null;
}

export type Project = {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
  appDeployments: AppDeployments[],
};

export type ProjectWithOwner = Project & {
  projectOwnerAddress: string;
};

export const useProjectsQuery = (ownership: 'all' | 'owned', sortBy: 'createdAt' | 'updatedAt' | 'name', sortDirection: 'ASC' | 'DESC', jwtToken?: string) => {
  return useQuery<Project[]>({
    initialData: [],
    queryKey: ['projects'],
    queryFn: async () => {
      const requestHeaders: Record<string, string> = {};
      if (jwtToken) {
        requestHeaders['Authorization'] = `Bearer ${jwtToken}`;
      }
      const res = await ky.get('projects', {
        searchParams: {
          ownership,
          sortBy,
          sortOrder: sortDirection,
        },
        headers: requestHeaders
      })
      const data = await res.json<Project[]>();

      if (!res.ok) {
        throw new Error('Not found projects');
      }

      return data;
    },
  });
};

export const useProjectQuery = (id: string) => {
  return useQuery<ProjectWithOwner | null>({
    initialData: null,
    queryKey: ['project', id],
    queryFn: async () => {
      const requestHeaders: Record<string, string> = {};
      const res = await ky.get(`projects/${id}`, { headers: requestHeaders });
      const data = await res.json<ProjectWithOwner>();

      if (res.status === 404) {
        throw new Error('Not found project');
      }

      if (!res.ok) {
        throw new Error('Failed to fetch project');
      }

      return data;
    },
  });
};

export const useS3DeployemntQuery = (id: string) => {
  return useQuery<string | null>({
    initialData: null,
    queryKey: ['getS3Deployment', id],
    queryFn: async () => {
      const res = await ky.get(`deploy-app/s3-deployment?projectId=${id}`);

      if (res.status === 404) {
        return null; // No deployment found
      }

      if (!res.ok) {
        throw new Error('Failed to fetch S3 deployment');
      }

      const data = await res.json<{ url: string }>();
      return data.url;
    },
  });
};

export interface SetProjectTokenPayload {
  tokenAddress: string;
}

export const useSetProjectToken = (id: string) => {
  return useMutation<{}, AxiosError, SetProjectTokenPayload>({
    mutationFn: async (payload) => {
      const { data } = await client.post<{}>(`projects/${id}/add-token`, {
        json: payload,
      });
      return data;
    }
  })
}
