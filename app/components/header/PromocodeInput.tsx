import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Label } from '../ui';
import { z } from 'zod';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useApplyPromocode } from '~/lib/hooks/tanstack/useMessages';

const promocodeSchema = z.object({
  promocode: z
    .string()
    .min(1, 'Promocode is required')
    .transform((v) => v.toUpperCase()),
});

type PromocodeFormValues = z.infer<typeof promocodeSchema>;

export default function PromocodeInput() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<PromocodeFormValues>({
    resolver: zodResolver(promocodeSchema),
    defaultValues: {
      promocode: '',
    },
  });

  const { mutateAsync: applyPromocode } = useApplyPromocode();
  const [promocodeApplied, setPromocodeApplied] = useState(false);

  const onSubmit = async ({ promocode }: PromocodeFormValues) => {
    try {
      const response = await applyPromocode({ promocode });
      const messagesApplied = response.messagesApplied;

      toast.success(`Promocode applied! You got ${messagesApplied} free messages!`);

      (window as any).plausible('apply_promocode', {
        props: {
          success: true,
          messages_applied: messagesApplied,
          promocode,
          error: null,
        },
      });

      setPromocodeApplied(true);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Something went wrong';

      setError('promocode', {
        type: 'server',
        message: errorMessage,
      });

      (window as any).plausible('apply_promocode', {
        props: {
          success: false,
          messages_applied: 0,
          promocode,
          error: `Failed due to server error: ${errorMessage}`,
        },
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="i-ph:tag color-accent-500"></div>
          <Label>Promocode</Label>
        </div>

        <span className="text-xs text-left text-bolt-elements-textSecondary">
          Apply promocode from our social media or events to get complimentary messages
        </span>

        <div className="flex gap-2 items-center justify-center">
          <Input {...register('promocode')} placeholder="Enter promocode" disabled={promocodeApplied} />

          <Button
            type="submit"
            variant="default"
            disabled={promocodeApplied || isSubmitting}
            className="px-4 py-2 text-sm"
          >
            {promocodeApplied ? 'Applied' : 'Apply'}
          </Button>
        </div>
      </div>

      {errors.promocode && <p className="text-sm text-red-500">{errors.promocode.message}</p>}
    </form>
  );
}
