import { useMutation, useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { client } from '../../api/backend/api';

export interface BonkTokenRequest {
  name: string;
  symbol: string;
  description: string;
  website?: string;
  telegram?: string;
  twitter?: string;
  wallet: string;
}

export interface TokenDataResponse {
  symbol: string;
  name: string;
  decimals: number;
  marketCap: number;
  creator: string;
  description: string;
  totalSupply: number;
  address: string;
  metadataUrl: string;
  price: number;
}

export interface BonkTokenResponse {
  rawTx: string; // base64
  mintPublicKey: string;
}

export const useCreateBonkToken = () =>
  useMutation<BonkTokenResponse, AxiosError, BonkTokenRequest>({
    mutationFn: async (payload) => {
      const { data } = await client.post<BonkTokenResponse>(
        '/bonk/tokens',
        payload
      );
      return data;
    },
  });

export const useGetTokenData = () => 
  useMutation<TokenDataResponse, AxiosError, string>({
    mutationFn: async (tokenAddress) => {
      const { data } = await client.get<TokenDataResponse>(
        `/bonk/tokens/${tokenAddress}`,
      );
      return data;
    },
  });
