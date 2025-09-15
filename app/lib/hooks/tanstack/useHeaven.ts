import { useMutation, useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { client } from '../../api/backend/api';
import { c } from 'node_modules/vite/dist/node/moduleRunnerTransport.d-DJ_mE5sf';

export interface HeavenTokenRequest {
  name: string;
  symbol: string;
  description: string;
  prebuy?: number;
  image: Blob;
}

export interface TokenDataResponse {
  marketCap: number;
  supply: number;
  address: string;
  price: number;
  metadata: {
    name: string;
    description: string;
    symbol: string;
    uri: string;
    image: string;
  };
}

export interface HeavenTokenResponse {
  tx: string; // base64
  mintPublicKey: string;
}

export const useCreateHeavenToken = () =>
  useMutation<HeavenTokenResponse, AxiosError, FormData>({
    mutationFn: async (formDataPayload) => {
      const { data } = await client.post<HeavenTokenResponse>('/heaven-dex/tokens', formDataPayload);
      return data;
    },
  });

export const useGetHeavenToken = (projectId: string) =>
  useQuery<TokenDataResponse, AxiosError>({
    queryKey: ['tokenData', projectId],
    queryFn: async () => {
      const { data } = await client.get<TokenDataResponse>(`/heaven-dex/projects/${projectId}/tokens`);
      return data;
    },
    retry: false,
  });

export interface SetTokenForProjectRequest {
  tokenAddress: string;
  twitter?: string;
  telegram?: string;
  description?: string;
}

export const useSetTokenForProject = (projectId: string) =>
  useMutation<void, AxiosError, SetTokenForProjectRequest>({
    mutationFn: async (payload) => {
      await client.post<{}>(`/heaven-dex/projects/${projectId}/tokens/link/`, payload);
    },
  });
