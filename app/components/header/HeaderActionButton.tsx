import { classNames } from '~/utils/classNames';
import { forwardRef } from 'react';

interface ButtonProps {
  active?: boolean;
  disabled?: boolean;
  children?: any;
  onClick?: VoidFunction;
  className?: string;
  onMouseEnter?: React.MouseEventHandler<HTMLButtonElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLButtonElement>;
}

export const HeaderActionButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ active = false, disabled = false, children, onClick, className, onMouseEnter, onMouseLeave, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={classNames(
          'flex items-center p-1.5',
          {
            'bg-bolt-elements-item-backgroundDefault text-bolt-elements-textTertiary': !active && !disabled,
            'hover:bg-bolt-elements-item-backgroundActive hover:text-bolt-elements-textPrimary': !active && !disabled,
            'bg-bolt-elements-item-backgroundAccent text-bolt-elements-item-contentAccent': active && !disabled,
            'bg-bolt-elements-item-backgroundDefault text-alpha-gray-20 dark:text-alpha-white-20 cursor-not-allowed':
              disabled,
          },
          className,
        )}
        disabled={disabled}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        {...props}
      >
        {children}
      </button>
    );
  },
);
