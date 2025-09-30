import { useQuery } from '@tanstack/react-query';
import { ky } from 'query';

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

export type OwnershipFilter = 'all' | 'owned';
export type DeploymentPlatform = 'S3' | 'Akash' | 'ICP';
export type StatusFilter = 'deployed' | 'hackathonWinner' | 'featured';
export type ProjectFilters = OwnershipFilter | DeploymentPlatform | StatusFilter;

const deploymentPlatforms: DeploymentPlatform[] = ['S3', 'Akash', 'ICP'];

export const useProjectsQuery = (page: number, pageSize: number, filters: ProjectFilters[], sortBy: 'createdAt' | 'updatedAt' | 'name', sortDirection: 'ASC' | 'DESC', jwtToken?: string) => {
  const ownership: OwnershipFilter = filters.includes('owned') ? 'owned' : 'all';

  const provider = deploymentPlatforms.find((p) => filters.includes(p));

  const statusFilters: Partial<Record<StatusFilter, boolean>> = {};

  if (filters.includes('hackathonWinner')) {
    statusFilters.hackathonWinner = true;
  }
  if (filters.includes('featured')) {
    statusFilters.featured = true;
  }
  if (filters.includes('deployed')) {
    statusFilters.deployed = true;
  }

  return useQuery<ProjectsResponse>({
    queryKey: ['projects', {page, pageSize, ownership, statusFilters, provider,  sortBy, sortDirection}],
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
          ...(provider ? { provider } : {}),
          ...statusFilters,
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
