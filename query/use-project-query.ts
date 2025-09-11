import { useMutation, useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { ky } from 'query';
import { client } from '~/lib/api/backend/api';

interface AppDeployments {
  provider: string;
  url: string | null;
}

interface ProjectsResponse {
  data: Project[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
};

export type Project = {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
  appDeployments?: AppDeployments[],
};

export type ProjectWithOwner = Project & {
  projectOwnerAddress: string;
};

export const useProjectsQuery = (page: number, pageSize: number, ownership: 'all' | 'owned', sortBy: 'createdAt' | 'updatedAt' | 'name', sortDirection: 'ASC' | 'DESC', jwtToken?: string) => {
  return useQuery<ProjectsResponse>({
    initialData: { data: [], pagination: { page: 1, pageSize, total: 0 } },
    queryKey: ['projects', {page, pageSize, ownership, sortBy, sortDirection}],
    queryFn: async () => {
      const requestHeaders: Record<string, string> = {};
      if (jwtToken) {
        requestHeaders['Authorization'] = `Bearer ${jwtToken}`;
      }
      const res = await ky.get('projects', {
        searchParams: {
          page,
          pageSize,
          ownership,
          sortBy,
          sortOrder: sortDirection,
        },
        headers: requestHeaders
      })
      const data = await res.json<ProjectsResponse>();

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

export const useDeploymentQuery = (projectId: string | undefined, provider: 's3' | 'icp' | 'akash') => {
  return useQuery<string | null>({
    queryKey: ['getDeployment', projectId, provider],
    enabled: !!projectId,
    initialData: null,
    queryFn: async () => {
      if (!projectId) return null;

      const endpointMap = {
        s3: `deploy-app/s3-deployment`,
        icp: `deploy-app/icp-deployment`,
        akash: `deploy-app/akash-deployment`,
      };

      const res = await ky.get(`${endpointMap[provider]}?projectId=${projectId}`);
      console.log(provider, res);

      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`Failed to fetch ${provider} deployment`);

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
