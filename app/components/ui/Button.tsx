import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { classNames } from 'app/utils/classNames';
import waterStyles from './WaterButton.module.scss';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-bolt-elements-borderColor disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-bolt-elements-background text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-2',
        destructive: 'bg-red-500 text-white hover:bg-red-600',
        outline:
          'border border-bolt-elements-borderColor bg-transparent hover:bg-bolt-elements-background-depth-2 hover:text-bolt-elements-textPrimary text-bolt-elements-textPrimary dark:border-bolt-elements-borderColorActive',
        secondary:
          'bg-transparent text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor',
        ghost: 'hover:bg-bolt-elements-background-depth-1 hover:text-bolt-elements-textPrimary',
        link: 'text-bolt-elements-textPrimary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  _asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size, _asChild = false, children, disabled, ...props }, ref) => {
    const isWaterEffect = variant === 'default' || variant === 'secondary' || variant === 'destructive';

    if (!isWaterEffect) {
      return (
        <button
          className={classNames(buttonVariants({ variant, size }), className)}
          ref={ref}
          disabled={disabled}
          {...props}
        >
          {children}
        </button>
      );
    }

    const waterVariant = variant === 'destructive' ? 'red' : 'default';

    return (
      <button
        ref={ref}
        className={classNames(
          'relative overflow-hidden',
          'text-white font-medium',
          'rounded-md',
          'transition-all duration-300',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black/50',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          {
            'bg-gray-500 bg-opacity-10': variant === 'default',
            'bg-red-500': variant === 'destructive',
            'bg-bolt-elements-background-depth-1 bg-opacity-10  ': variant === 'secondary',
          },
          size === 'sm' ? 'text-xs py-1 px-3' : size === 'lg' ? 'text-base py-3 px-6' : 'text-sm py-2 px-4',
          disabled ? '' : waterStyles.waterButton,
          disabled ? '' : waterStyles[waterVariant],
          className,
        )}
        disabled={disabled}
        {...props}
      >
        {!disabled && (
          <div className={waterStyles.effectLayer}>
            {/* ::before and ::after for flow/ripple are on .effectLayer */}
            <div className={waterStyles.waterDroplets}></div>
            <div className={waterStyles.waterSurface}></div>
          </div>
        )}
        <div className={disabled ? '' : waterStyles.buttonContent}>{children}</div>
      </button>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
