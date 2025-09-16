'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, RequiredFieldMark } from '../ui/Form';
import { toast } from 'react-toastify';
import { useGetHeavenToken, useSetTokenForProject } from '~/lib/hooks/tanstack/useHeaven';
import { Textarea } from '../ui/Textarea';

const createSchema = () =>
  z.object({
    tokenAddress: z.string(),
    link: z.string(),
    description: z.string().optional(),
    twitter: z.union([
      z.undefined(),
      z.string().url().startsWith('https://x.com/', 'Invalid twitter page. Must be https://x.com/...'),
    ]),
    telegram: z.union([
      z.undefined(),
      z.string().url().startsWith('https://t.me/', 'Invalid telegram page. Must be https://t.me/...'),
    ]),
  });

interface DeployLinkedTokenFormProps {
  projectId: string;
  projectUrl: string;
  setShowTokenWindow: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function DeployLinkedTokenForm({
  projectId,
  projectUrl,
  setShowTokenWindow,
}: DeployLinkedTokenFormProps) {
  const schema = createSchema();
  const LinkTokenMutation = useSetTokenForProject(projectId);
  const GetTokenDataQuery = useGetHeavenToken(projectId);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      tokenAddress: '',
      link: projectUrl,
    },
  });

  const { control, handleSubmit, formState } = form;
  const { isSubmitting } = formState;

  const onSubmit = async (values: z.infer<typeof schema>) => {
    await LinkTokenMutation.mutateAsync(
      {
        tokenAddress: values.tokenAddress,
        description: values.description,
        telegram: values.telegram,
        twitter: values.twitter,
      },
      {
        onError: (error, vars, ctx) => {
          const messageFromResponse: string | string[] = (error.response?.data as any)?.message;
          const formatedMessage = Array.isArray(messageFromResponse)
            ? messageFromResponse.join(', ')
            : messageFromResponse;
          const errorMsg = `Error during token launch:\n${formatedMessage || error.message}`;
          toast.error(errorMsg);
        },
      },
    );
    const referchResponse = await GetTokenDataQuery.refetch();
    console.log(referchResponse.isSuccess, referchResponse.data, referchResponse.dataUpdatedAt);
    if (!referchResponse.isSuccess) {
      toast.error('Successfuly linked token, but failed to load token info. Try to reloaad page');
    } else {
      toast.success('Token linked to project');
      setShowTokenWindow(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mx-auto">
        <FormField
          control={control}
          name="tokenAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Token {<RequiredFieldMark />}</FormLabel>
              <FormControl>
                <Input placeholder="Address of your token" disabled={isSubmitting} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col gap-5">
          <FormField
            control={control}
            name="description"
            render={({ field }) => (
              <FormItem className="flex-1 flex flex-col">
                <FormLabel>Description</FormLabel>
                <FormControl className="flex-1">
                  <Textarea
                    placeholder="Short description of your token"
                    className="resize-none h-full"
                    disabled={isSubmitting}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-3 *:flex-1">
          <FormField
            control={control}
            name="telegram"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telegram</FormLabel>
                <FormControl>
                  <Input placeholder="Token's Telegram channel link" disabled={isSubmitting} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="twitter"
            render={({ field }) => (
              <FormItem>
                <FormLabel>𝕏</FormLabel>
                <FormControl>
                  <Input placeholder="Token's X profile link" disabled={isSubmitting} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={control}
          name="link"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {<div className="i-ph:link color-accent-300"></div>} Link to your current
                {<span className="color-accent-300">Aimpact</span>} project
              </FormLabel>
              <FormControl>
                <Input
                  readOnly
                  {...field}
                  onClick={() => {
                    navigator.clipboard.writeText(field.value);
                    toast.success('Link copied!');
                  }}
                  className="cursor-pointer"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Connecting...' : 'Connect Token'}
        </Button>
      </form>
    </Form>
  );
}
