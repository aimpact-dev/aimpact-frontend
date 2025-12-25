import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { ky } from 'query';
import { type KyResponse } from 'ky';
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
}

export type Project = {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
  appDeployments?: AppDeployments[];
};

export type ProjectWithOwner = Project & {
  projectOwnerAddress: string;
};

export type UpdateProjectInfoPayload = {
  name?: string;
  description?: string;
  category?: string;
  featured?: string;
};

export type ProjectFilters = {
  owned?: true;
  featured?: true;
  deployedFilter?: 'all' | 'Akash' | 'S3' | 'ICP';
  hackathonWinner?: true;
};

export const useProjectsQuery = (
  page: number,
  pageSize: number,
  filters: ProjectFilters,
  sortBy: 'createdAt' | 'updatedAt' | 'name',
  sortOrder: 'ASC' | 'DESC',
  jwtToken?: string,
) => {
  return useQuery<ProjectsResponse>({
    queryKey: [
      'projects',
      {
        page,
        pageSize,
        filters,
        sortBy,
        sortOrder,
      },
    ],
    queryFn: async () => {
      const requestHeaders: Record<string, string> = {};

      if (jwtToken) {
        requestHeaders['Authorization'] = `Bearer ${jwtToken}`;
      }

      const searchParams: Record<string, string | number | boolean> = {
        page,
        pageSize,
        ownership: filters.owned ? 'owned' : 'all',
        deployed: !!filters.deployedFilter,
        featured: !!filters.featured,
        hackathonWinner: !!filters.hackathonWinner,
        sortBy,
        sortOrder,
      };

      if (filters.deployedFilter && filters.deployedFilter !== 'all') {
        searchParams.provider = filters.deployedFilter;
      }

      const res = await ky.get('projects', {
        searchParams,
        headers: requestHeaders,
      });

      if (!res.ok) {
        throw new Error('Not found projects');
      }

      return res.json<ProjectsResponse>();
    },
  });
};

export const useUpdateProjectInfoMutation = (id: string, jwtToken?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateProjectInfoPayload) => {
      const headers: Record<string, string> = {};
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }
      const res = await ky.post(`projects/${id}/update`, {
        json: payload,
        headers,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to update project');
      }

      return res.json<ProjectWithOwner>();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['project', id] });
    },
  });
};

export const useProjectQuery = (id: string) => {
  return useQuery<ProjectWithOwner | null>({
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
    retry: false,
    refetchInterval: 30000,
    queryFn: async () => {
      if (!projectId) return null;

      const endpointMap = {
        s3: `deploy-app/s3-deployment`,
        icp: `deploy-app/icp-deployment`,
        akash: `deploy-app/akash-deployment`,
      };

      const res = await ky.get(`${endpointMap[provider]}?projectId=${projectId}`, { throwHttpErrors: false });

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
    },
  });
};
