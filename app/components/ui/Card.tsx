import { forwardRef } from 'react';
import { classNames } from '~/utils/classNames';

type CardVariant = 'default' | 'accented';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  withHoverEffect?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', withHoverEffect = false, ...props }, ref) => {
    const baseClasses = 'rounded-lg border border-bolt-elements-borderColor text-bolt-elements-textPrimary shadow-sm';

    const variantClasses = {
      default: 'bg-gray-900/50 border-gray-700 backdrop-blur-sm',
      accented: 'group relative bg-black/20 border border-white/15 rounded-xl overflow-hidden shadow-lg',
    };

    const hoverClasses = {
      default: '',
      accented:
        'hover:bg-black/35 hover:border-bolt-elements-borderColorActive hover:scale-[1.02] hover:shadow-xl transition-all duration-300',
    };

    return (
      <div
        ref={ref}
        className={classNames(
          baseClasses,
          variantClasses[variant],
          withHoverEffect ? hoverClasses[variant] : '',
          className,
        )}
        {...props}
      />
    );
  },
);
Card.displayName = 'Card';

const CardHeader = forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => {
  return <div ref={ref} className={classNames('flex flex-col space-y-1.5 p-6', className)} {...props} />;
});
CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={classNames('text-2xl font-semibold leading-none tracking-tight', className)}
        {...props}
      />
    );
  },
);
CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    return <p ref={ref} className={classNames('text-sm text-bolt-elements-textSecondary', className)} {...props} />;
  },
);
CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => {
  return <div ref={ref} className={classNames('p-6 pt-0', className)} {...props} />;
});
CardContent.displayName = 'CardContent';

const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={classNames('flex items-center p-6 pt-0', className)} {...props} />
));
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
