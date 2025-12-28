import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '../../api/backend/api';

export interface UserMetadata {
  [key: string]: any;
}

export const useUserMetadata = (isAuthorized: boolean) => {
  return useQuery<UserMetadata>({
    queryKey: ['user'],
    queryFn: async () => {
      const { data } = await client.get('/auth/me');
      return data?.metadata ?? {};
    },
    enabled: isAuthorized,
  });
};

export const useUpdateUserMetadata = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (metadata: Record<string, any>) => {
      const { data } = await client.patch('/user', { metadata });
      return data as Record<string, any>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['user'],
      });
    },
  });
};
