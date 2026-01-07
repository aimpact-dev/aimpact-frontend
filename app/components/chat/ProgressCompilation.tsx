import { useStore } from '@nanostores/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { streamingState } from '~/lib/stores/streaming';
import { classNames } from '~/utils/classNames';
import { cubicEasingFn } from '~/utils/easings';
import { FlowingParticlesBackground } from '../ui/FlowingParticlesBackground';
import type { MessageDataEvent } from '~/lib/message';

interface Props {
  data: MessageDataEvent[];
  className: string;
}

export default function ProgressCompilation({ data, className }: Props) {
  const isStreaming = useStore(streamingState);

  const [progressList, setProgressList] = useState<MessageDataEvent[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!data || data.length == 0) {
      setProgressList([]);
      return;
    }

    const progressMap = new Map<string, MessageDataEvent>();
    data.forEach((x) => {
      const existingProgress = progressMap.get(x.data.label);

      if (existingProgress && existingProgress.data.status === 'complete') {
        return;
      }

      progressMap.set(x.data.label, x);
    });

    const newData = Array.from(progressMap.values());
    newData.sort((a, b) => a.data.order - b.data.order);
    setProgressList(newData);
  }, [data]);

  if (progressList.length === 0 || !isStreaming) {
    return <></>;
  }

  return (
    <AnimatePresence>
      <div
        className={classNames(
          'relative w-full max-w-chat mx-auto z-prompt',
          'rounded-lg border border-bolt-elements-borderColorActive/30 animate-pulse-glow overflow-hidden',
          'bg-bolt-elements-background-depth-2 p-1',
          className,
        )}
      >
        <FlowingParticlesBackground />

        <div
          className={classNames(
            'relative z-10',
            'bg-bolt-elements-item-backgroundAccent p-1 rounded-lg text-bolt-elements-item-contentAccent flex',
          )}
        >
          <div className="flex-1">
            <AnimatePresence>
              {expanded ? (
                <motion.div
                  className="actions"
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: '0px' }}
                  transition={{ duration: 0.15 }}
                >
                  {progressList.map((x, i) => (
                    <ProgressItem key={i} progress={x} />
                  ))}
                </motion.div>
              ) : (
                <ProgressItem progress={progressList.slice(-1)[0]} />
              )}
            </AnimatePresence>
          </div>

          {progressList.length >= 1 && (
            <motion.button
              initial={{ width: 0 }}
              animate={{ width: 'auto' }}
              exit={{ width: 0 }}
              transition={{ duration: 0.15, ease: cubicEasingFn }}
              className="p-1 rounded-lg bg-bolt-elements-item-backgroundAccent hover:bg-bolt-elements-artifacts-backgroundHover"
              onClick={() => setExpanded((v) => !v)}
            >
              <div className={expanded ? 'i-ph:caret-up-bold' : 'i-ph:caret-down-bold'}></div>
            </motion.button>
          )}
        </div>
      </div>
    </AnimatePresence>
  );
}

const ProgressItem = ({ progress }: { progress: MessageDataEvent }) => {
  return (
    <motion.div
      className={classNames('flex text-sm gap-3')}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-center gap-1.5 ">
        <div>
          {progress.data.status === 'in-progress' ? (
            <div className="i-svg-spinners:90-ring-with-bg"></div>
          ) : progress.data.status === 'complete' ? (
            <div className="i-ph:check"></div>
          ) : null}
        </div>
        {/* {x.label} */}
      </div>
      {progress.data.message}
    </motion.div>
  );
};
