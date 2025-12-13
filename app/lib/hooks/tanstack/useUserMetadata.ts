import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '../../api/backend/api';

export interface UserMetadata {
  [key: string]: any;
}

export const useUserMetadata = (isAuthorized: boolean) => {
  return useQuery<UserMetadata>({
    queryKey: ['user-metadata'],
    queryFn: async () => {
      const { data } = await client.get('/user/metadata');
      return data ?? {};
    },
    enabled: isAuthorized,
  });
};

export const useUpdateUserMetadata = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (metadata: Record<string, any>) => {
      const { data } = await client.post('/user/metadata', metadata);
      return data as Record<string, any>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['user-metadata'],
      });
    },
  });
};
