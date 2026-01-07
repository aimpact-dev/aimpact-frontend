import { useQuery } from '@tanstack/react-query';
import { Badge, Card, Label } from '../ui';
import { ky } from 'query';
import { useAuth } from '~/lib/hooks/useAuth';
import { twMerge } from 'tailwind-merge';
import { Tooltip } from '../chat/Tooltip';

interface Quest {
  zealyQuestId: string;
  name: string;
  description: string;
  messageReward: number;
  isCompleted: boolean;
  completedAt: Date | undefined;
}

export default function QuestsList() {
  const { jwtToken } = useAuth();

  const {
    data: quests,
    error: questsError,
    isPending: questsPending,
    isLoading: questsLoading,
  } = useQuery<Quest[]>({
    queryKey: ['quests', jwtToken],
    queryFn: async () => {
      const res = await ky.get('quest', {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Not found news articles: ${questsError}`);
      }

      const json = await res.json<Quest[]>();
      return json;
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <div className="i-ph:calendar-check color-accent-500"></div>
        <Label>Quests</Label>
      </div>
      <span className="text-xs text-left text-bolt-elements-textSecondary">
        Finish our tasks on Zealy.com and get extra messages
      </span>
      <div>
        {questsPending || questsLoading ? (
          <div className="inline-block i-ph:spinner-gap animate-spin mr-1"></div>
        ) : questsError ? (
          <span>Couldn't load quests. Try to reload the page.</span>
        ) : (
          <>
            {quests.map((quest) => {
              return (
                <a
                  href={`https://zealy.io/cw/aimpact/questboard/${import.meta.env.VITE_ZEALY_FREE_MESSAGES_CATEGORY_ID}/${quest.zealyQuestId}`}
                  target="_blank"
                >
                  <Card className="flex gap-3 items-center text-left px-4 py-3 bg-input hover:border-bolt-elements-borderColorActive transition-100 hover:scale-[0.99]">
                    <div
                      className={twMerge(
                        'text-accent-500/80 size-6',
                        quest.isCompleted ? 'i-ph:check-circle-fill' : 'i-ph:check-circle-light',
                      )}
                    ></div>

                    <div className="flex flex-col gap-1 text-sm">
                      <div className="flex gap-2 items-center ">
                        <h1 className={twMerge(quest.isCompleted ? 'line-through' : '')}>{quest.name}</h1>
                        <Badge variant="accent">
                          +{quest.messageReward} message{quest.messageReward > 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <span
                        className={twMerge(
                          quest.isCompleted ? 'line-through' : '',
                          'text-xs text-bolt-elements-textSecondary',
                        )}
                      >
                        {quest.description}
                      </span>
                    </div>
                  </Card>
                </a>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
