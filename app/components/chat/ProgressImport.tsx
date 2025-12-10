import { AnimatePresence, motion } from 'framer-motion';
import { classNames } from '~/utils/classNames';
import { buildStyles, CircularProgressbar } from 'react-circular-progressbar';
import { FlowingParticlesBackground } from '../ui/FlowingParticlesBackground';
import { Tooltip } from './Tooltip';
import { useEffect, useState } from 'react';

interface Props {
  className?: string;
  totalSegments: number;
  segments: number;
}

export default function ProgressImport({ className, totalSegments, segments }: Props) {
  const [destroyProgress, setDestroyProgress] = useState(false);

  useEffect(() => {
    if (!segments || !totalSegments || segments < totalSegments) return;

    const timeout = setTimeout(() => {
      setDestroyProgress(true);
    }, 5000);

    return () => {
      clearTimeout(timeout);
    };
  }, [segments, totalSegments]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDestroyProgress(true);
    }, 60 * 1000);

    return () => {
      clearTimeout(timeout);
    }
  }, [])

  
  const percents = segments === 0 ? 0 : Math.floor(100 / (totalSegments / segments));
  if (destroyProgress === true || totalSegments === 0) {
    return;
  }

  return (
    <AnimatePresence>
      <div
        className={classNames(
          'relative w-full max-w-chat mx-auto z-prompt',
          'rounded-lg border border-bolt-elements-borderColorActive/30 animate-pulse-glow overflow-hidden',
          'bg-bolt-elements-background-depth-2 p-1 flex',
          className,
        )}
      >
        <FlowingParticlesBackground />

        <div className="flex p-1 gap-2 relative bg-bolt-elements-item-backgroundAccent p-1 rounded-lg text-bolt-elements-item-contentAccent flex z-10 w-full h-full">
          <p>Progress import:</p>
          <Tooltip content={`${segments} / ${totalSegments}`} side="top">
            <motion.div className="w-6" transition={{ duration: 0.15 }}>
              <CircularProgressbar
                value={percents}
                strokeWidth={50}
                styles={buildStyles({
                  strokeLinecap: 'butt',
                  trailColor: '#9e9e9eff',
                  pathColor: '#6c48dfff',
                })}
              />
            </motion.div>
          </Tooltip>
          <p>{percents}%</p>
        </div>
      </div>
    </AnimatePresence>
  );
}
