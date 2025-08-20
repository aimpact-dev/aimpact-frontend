import { forwardRef } from 'react';
import { classNames } from '~/utils/classNames';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={classNames(
        'w-full min-h-[6rem] rounded-md border border-bolt-elements-border bg-bolt-elements-background px-3 py-2 text-sm leading-5',
        'ring-offset-bolt-elements-background placeholder:text-bolt-elements-textSecondary focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-bolt-elements-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-95 resize-vertical text-black',
        className,
      )}
      {...props}
    />
  );
});

Textarea.displayName = 'Textarea';

export { Textarea };
