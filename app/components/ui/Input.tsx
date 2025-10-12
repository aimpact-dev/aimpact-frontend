import * as React from 'react';

import { cn } from '~/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'border-border-light file:text-foreground placeholder:text-bolt-elements-textTertiary selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border dark:bg-input px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'focus-visible:border-border-light focus-visible:border-2 focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'aria-invalid:border-destructive aria-invalid:focus-visible:border-destructive',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
