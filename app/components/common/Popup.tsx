import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';
import React, { type PropsWithChildren } from 'react';
import { classNames } from '~/utils/classNames';

interface CustDevPopupProps extends PropsWithChildren {
  isShow: boolean;
  closeTopButton?: boolean;
  handleToggle: (open?: boolean) => void;
  title?: string | React.ReactNode;
  titleClasses?: string;
  description?: string | React.ReactNode;
  childrenClasses?: string;
  className?: string;
  children: React.ReactNode;
}

export default function Popup({
  isShow,
  handleToggle,
  closeTopButton,
  title,
  titleClasses,
  description,
  childrenClasses,
  className,
  children,
}: CustDevPopupProps) {
  return (
    <Dialog open={isShow} onOpenChange={handleToggle}>
      <DialogContent
        className={twMerge(
          'flex flex-col overflow-hidden w-[90%]  max-h-[90vh]  max-w-md sm:max-w-lg  bg-bolt-elements-background-depth-3 text-center',
          className,
        )}
        showCloseButton={closeTopButton}
      >
        <motion.div
          initial={{   opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.05 }}
          className="flex flex-col overflow-hidden"
        >
          <DialogHeader className="items-center gap-1 mb-5">
            <DialogTitle className={classNames('text-2xl', titleClasses)}>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className={twMerge('flex-1 min-h-0 overflow-y-auto overflow-x-hidden', childrenClasses)}>{children}</div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
