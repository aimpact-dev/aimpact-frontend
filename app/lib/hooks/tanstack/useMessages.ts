import { useMutation, useQuery } from '@tanstack/react-query';
import { client } from '../../api/backend/api';

interface RequestMesssagesPayload {
  twitterHandle: string;
}

interface ApplyPromocodePayload {
  promocode: string;
}

export const useRequestMessages = () => {
  return useMutation({
    mutationFn: async (payload: RequestMesssagesPayload) => {
      const { data } = await client.post('/user/request-messages', payload);
      return data;
    },
  });
};

export const useApplyPromocode = () => {
  return useMutation({
    mutationFn: async (payload: ApplyPromocodePayload) => {
      const { data } = await client.post('/billing/promocode', payload);
      return data;
    },
  });
};
