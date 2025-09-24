import { useMutation } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { client } from '../../api/backend/api';
import type { Dirent } from '~/lib/stores/files';

export interface PostBuildRequestPayload {
  projectId: string;
  snapshot: Record<string, Dirent | undefined>;
}

export const usePostBuildRequest = () =>
  useMutation<void, AxiosError, PostBuildRequestPayload>({
    mutationFn: async (payload) => {
      const { data } = await client.post('/build-contract/build-request', payload);
      return data;
    },
  });
