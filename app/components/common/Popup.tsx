import { type PropsWithChildren } from 'react';
import { twMerge } from 'tailwind-merge';
import { AnimatePresence, motion } from 'framer-motion';
import { classNames } from '~/utils/classNames';
import { createPortal } from 'react-dom';

interface CustDevPopupProps extends PropsWithChildren {
  isShow: boolean;
  handleToggle: () => void;
  backgroundElement?: boolean;
  positionClasses?: string;
  closeByTouch?: boolean;
  childrenClasses?: string;
  className?: string;
}

export default function Popup({
  isShow,
  backgroundElement = true,
  positionClasses,
  childrenClasses,
  handleToggle,
  children,
  className,
  closeByTouch = true,
}: CustDevPopupProps) {
  return (
    isShow && (
      <AnimatePresence>
        <div className={classNames('fixed inset-0 z-7000 overflow-y-auto', className)}>
          <div className="flex relative items-center justify-center min-h-screen px-8 pt-8 pb-20 text-center">
            {backgroundElement && (
              <div
                className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75"
                onClick={closeByTouch ? handleToggle : undefined}
              />
            )}

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.05 }}
              className={twMerge(
                'relative inline-block overflow-hidden text-left transition-all transform border border-gray-700 rounded-lg shadow-xl align-middle max-w-lg w-full',
                positionClasses ?? 'my-8',
              )}
            >
              <button
                onClick={handleToggle}
                className="flex absolute right-0 items-center justify-center m-1 w-8 h-8 rounded-full bg-transparent hover:bg-gray-500/10 dark:hover:bg-gray-500/20 group transition-all duration-200"
              >
                <div className="i-ph:x w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-gray-500 transition-colors" />
              </button>

              <div className={classNames(childrenClasses, 'p-5 bg-bolt-elements-background-depth-3 text-center')}>
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      </AnimatePresence>
    )
  );
}
