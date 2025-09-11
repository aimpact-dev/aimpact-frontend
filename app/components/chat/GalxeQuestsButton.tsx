import { classNames } from '~/utils/classNames';
import { Button } from '../ui';
import { Tooltip } from './Tooltip';
import waterStyles from '../ui/WaterButton.module.scss';
import { useEffect, useState } from 'react';
import Popup from '../common/Popup';
import { motion } from 'framer-motion';
import * as ReactSpinners from 'react-spinners';
import {
  useGetAllQuestsQuery,
  useIsUserEligibleQuery,
  useUserEligibleMutation,
  type AllQuestsResponse,
  type GalxeQuest,
  type QuestEligibilityRequest,
} from 'query/use-quests-query';
import { useAuth } from '~/lib/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
const { ClipLoader } = ReactSpinners;

export default function GalxeQuestButton() {
  const [open, setOpen] = useState(false);
  const galxeQuestLink = 'https://app.galxe.com/quest/UTmxVJ47pqYUWqEKgKDKco/GCdHmt6PLa';
  const { jwtToken } = useAuth();
  const galxeQuestsQuery = useGetAllQuestsQuery(jwtToken);
  const galxeQuestsEligibilityMutation = useUserEligibleMutation(jwtToken, toast.error);
  const galxeQuestsIsUserEligibleQuery = useIsUserEligibleQuery(
    { questId: galxeQuestsQuery?.data?.quests[0].id || '' },
    jwtToken,
  );
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!galxeQuestsIsUserEligibleQuery.data && galxeQuestsQuery.data && galxeQuestsIsUserEligibleQuery.isLoading) {
      // set loading for every quest
      galxeQuestsQuery.data.quests.map((q) => {
        setLoadingStates((prev) => ({ ...prev, [q.id]: true }));
      });
    } else {
      // if we already loaded eligible query data
      setLoadingStates({});
    }
  }, [galxeQuestsIsUserEligibleQuery.data, galxeQuestsIsUserEligibleQuery.isLoading]);

  const handleToggle = () => {
    setOpen(!open);
  };

  const onVerifyQuest = (quest: GalxeQuest) => {
    return async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setLoadingStates((prev) => ({ ...prev, [quest.id]: true }));

      const res = await galxeQuestsEligibilityMutation.mutateAsync({ questId: quest.id });
      console.log(res);
      if (!res.quest?.eligible) {
        toast.dismiss();
        toast.warn("You are not eligible");
      }
      setLoadingStates((prev) => ({ ...prev, [quest.id]: false }));
    };
  };

  return (
    <>
      <Tooltip content="Complete quests and get free messages">
        <Button
          className={classNames(
            'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-all duration-300',
            waterStyles.waterButton,
            waterStyles.green,
          )}
          onClick={handleToggle}
        >
          <div className={waterStyles.effectLayer}>
            <div className={waterStyles.waterDroplets}></div>
            <div className={waterStyles.waterSurface}></div>
          </div>
          <div className={waterStyles.buttonContent}>Get Free Messages!</div>
        </Button>
      </Tooltip>

      <Popup handleToggle={handleToggle} isShow={open} positionClasses="sm:max-w-xl sm:w-full mt-12">
        <div className="flex flex-col gap-4 items-center">
          <h1 className="text-3xl mb-2">Quests</h1>
          <p className="text-amber-300 text-left text-xs mb-2">
            *You should signup with <b>Solana address</b> or bind your <b>Solana address</b> in Galxe to verify quests.
          </p>
          <div className="w-full px-1 flex flex-col min-h-48">
            {galxeQuestsQuery.data &&
              galxeQuestsQuery.data?.quests.map((q) => (
                <div
                  className={classNames(
                    'rounded-lg flex justify-between py-3 px-4 items-center',
                    loadingStates[q.id] ? 'bg-gray-700' : 'bg-gray-600 hover:bg-gray-700',
                    galxeQuestsIsUserEligibleQuery.data?.quest?.eligible ? 'bg-green-700' : '',
                  )}
                  key={q.id}
                >
                  <a
                    className={classNames(
                      'group block w-full text-left hover:underline',
                      galxeQuestsIsUserEligibleQuery.data?.quest?.eligible ? 'line-through' : '',
                    )}
                    href={galxeQuestLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {q.name}
                  </a>
                  <button
                    onClick={onVerifyQuest(q)}
                    disabled={loadingStates[q.id] || galxeQuestsIsUserEligibleQuery.data?.quest?.eligible}
                    className={`bg-transparent relative z-10  px-2 ${!loadingStates[q.id] ? 'hover:text-gray-300' : ''}`}
                  >
                    <motion.div
                      animate={loadingStates[q.id] ? { rotate: 360 } : { rotate: 0 }}
                      transition={
                        loadingStates[q.id] ? { repeat: Infinity, ease: 'linear', duration: 1 } : { duration: 0 }
                      }
                    >
                      <div className={classNames("w-5 h-5", galxeQuestsIsUserEligibleQuery.data?.quest?.eligible ? "i-ph:check-circle" : "i-ph:arrow-clockwise")} />
                    </motion.div>
                  </button>
                </div>
              ))}
          </div>
        </div>
      </Popup>
    </>
  );
}
