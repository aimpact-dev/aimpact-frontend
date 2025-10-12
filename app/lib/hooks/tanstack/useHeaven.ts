import { useMutation, useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { client } from '../../api/backend/api';

export interface HeavenTokenRequest {
  name: string;
  symbol: string;
  description: string;
  prebuy?: number;
  image: Blob;
}

export interface TokenDataResponse {
  marketCap?: number;
  supply: number;
  address: string;
  price?: number;
  metadata: {
    name: string;
    description: string;
    symbol: string;
    uri: string;
    image: string;
  };
  telegram: string;
  twitter: string;
  isHeaven: boolean;
}

export interface HeavenTokenResponse {
  tx: string; // base64
  mintPublicKey: string;
}

export interface QuoteInitalBuyResponse {
  tokenAmount: number;
  solAmount: number;
}

export const useCreateHeavenToken = () =>
  useMutation<HeavenTokenResponse, AxiosError, FormData>({
    mutationFn: async (formDataPayload) => {
      const { data } = await client.post<HeavenTokenResponse>('/heaven-dex/tokens', formDataPayload);
      return data;
    },
  });

export const useQuoteInitialBuy = () =>
  useMutation<QuoteInitalBuyResponse, AxiosError, number>({
    mutationFn: async (percent: number) => {
      const { data } = await client.get<QuoteInitalBuyResponse>('/heaven-dex/tokens/quote/initial-buy', {
        params: { percent },
      });
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
    retryDelay: 20000,
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
