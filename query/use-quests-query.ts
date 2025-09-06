import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ky } from 'query';
import type { toast } from 'react-toastify';

export enum QuestStatus {
  Active = 'Active',
  CapReached = 'CapReached',
  Deleted = 'Deleted',
  Draft = 'Draft',
  Expired = 'Expired',
  NotStarted = 'NotStarted',
}

export type GalxeQuest = {
  id: string;
  name: string;
  status: QuestStatus;
  participantsCount: number;
  loyaltyPoints: number;
  startTime: number;
  endTime: number;
};

export type AllQuestsResponse = {
  quests: GalxeQuest[];
};

export interface QuestEligibilityRequest {
  questId: string;
}

export interface QuestEligibilityResponse {
  quest: {
    id: string;
    eligible: boolean;
    points: number;
  };
}

export function useGetAllQuestsQuery(jwtToken: string) {
  return useQuery<AllQuestsResponse, Error>({
    queryKey: ['allQuests', jwtToken],
    queryFn: async () => {
      const res = await ky.get<AllQuestsResponse>(`galxe/quests`, {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
        },
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });
}

const USER_ELIGIBLE_QUERY_KEY = (questIds: string[]) => ['quest-eligibility', ...questIds];

const userEligibleRequest = async (payload: QuestEligibilityRequest, jwtToken: string, isQuery = false) => {
  if (isQuery && !payload.questId) {
    throw new Error('Quest id not found');
  }
  const res = await ky.post<QuestEligibilityResponse>('galxe/quests/eligibility', {
    json: payload,
    headers: {
      Authorization: `Bearer ${jwtToken}`,
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export function useIsUserEligibleQuery(
  requestBody: QuestEligibilityRequest,
  jwtToken: string,
) {
  return useQuery<QuestEligibilityResponse, Error>({
    queryKey: USER_ELIGIBLE_QUERY_KEY(requestBody.questId ? [requestBody.questId] : []),
    queryFn: async () => {
      return await userEligibleRequest(requestBody, jwtToken, true);
    },
    enabled: !!requestBody.questId,
    staleTime: 60 * 60 * 12 * 1000, // 12 hours
  });
}

export function useUserEligibleMutation(jwtToken: string, toastFunc?: typeof toast.error) {
  const queryClient = useQueryClient();

  return useMutation<QuestEligibilityResponse, Error, QuestEligibilityRequest>({
    mutationFn: async (payload) => {
      return await userEligibleRequest(payload, jwtToken);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(USER_ELIGIBLE_QUERY_KEY([data.quest.id]), data);
    },
    onError: (err) => {
      if (toastFunc) {
        toastFunc(err?.message || 'Unknown error');
      }
    },
  });
}
