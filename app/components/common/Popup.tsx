import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/Dialog';
import { motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';
import React, { type PropsWithChildren } from 'react';
import { classNames } from '~/utils/classNames';

interface CustDevPopupProps extends PropsWithChildren {
  isShow: boolean;
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
          'max-h-[90vh] overflow-y-auto max-w-[90%] sm:max-w-lg mx-auto bg-bolt-elements-background-depth-3 text-center',
          className,
        )}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.05 }}
        >
          <DialogHeader className="items-center gap-1 mb-5">
            <DialogTitle className={classNames('text-2xl', titleClasses)}>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className={twMerge(childrenClasses)}>{children}</div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
