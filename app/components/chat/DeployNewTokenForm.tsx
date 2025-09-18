'use client';

import { z } from 'zod';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useQuery } from '@tanstack/react-query';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSolanaProxy } from '~/lib/hooks/api-hooks/useSolanaProxyApi';
import { fromLamports } from '~/utils/solana';
import { VersionedTransaction, Transaction, SystemProgram, PublicKey } from '@solana/web3.js';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  RequiredFieldMark,
} from '../ui/Form';
import { base64ToUint8Array } from '~/lib/utils';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useCreateHeavenToken, useGetHeavenToken, useSetTokenForProject } from '~/lib/hooks/tanstack/useHeaven';

const createSchema = (walletBalance: number | null) =>
  z.object({
    name: z.string().min(1, 'Name is required'),
    symbol: z.string().min(1, 'Symbol is required'),
    description: z.string().max(200, 'Description should be shorter than 200 symbols').optional(),
    prebuy: z.coerce
      .number({ error: 'Prebuy must be a number' })
      .nonnegative('Prebuy must be greater or equal to 0')
      .refine((val) => walletBalance === null || val <= walletBalance, {
        message: 'Prebuy cannot be larger than your wallet balance',
      })
      .optional(),
    twitter: z
      .url()
      .startsWith('https://x.com/', 'Invalid twitter page. Must be https://x.com/...')
      .optional()
      .or(z.literal('')),
    telegram: z
      .url()
      .startsWith('https://t.me/', 'Invalid telegram page. Must be https://t.me/...')
      .optional()
      .or(z.literal('')),
    image: z.instanceof(File, { message: 'Image is required' }),
    link: z.string(),
  });

interface DeployNewTokenFormProps {
  projectId: string;
  projectUrl: string;
  setShowTokenWindow: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function DeployNewTokenForm({ projectId, projectUrl, setShowTokenWindow }: DeployNewTokenFormProps) {
  const { publicKey, signTransaction } = useWallet();
  const { fetchBalance, sendTransaction: sendTransactionProxy } = useSolanaProxy();
  const { mutateAsync: createHeavenTokenAsync } = useCreateHeavenToken();
  const { mutateAsync: setProjectTokenAsync } = useSetTokenForProject(projectId);
  const { refetch: refetchTokenData } = useGetHeavenToken(projectId);

  const {
    data: walletBalance = null,
    error: balanceError,
    isLoading: isBalanceLoading,
  } = useQuery({
    queryKey: ['wallet-balance', publicKey?.toBase58()],
    queryFn: async () => {
      if (!publicKey) return 0;
      const rawBalance = await fetchBalance(publicKey.toBase58());
      return fromLamports(rawBalance.balance);
    },
    enabled: !!publicKey,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (balanceError) {
      toast.error('Failed to fetch wallet balance.', { autoClose: false });
    }
  }, [balanceError]);

  const schema = createSchema(walletBalance);

  type FormValues = z.infer<typeof schema>;
  const resolver = zodResolver(schema) as unknown as Resolver<FormValues, any>;
  const form = useForm({
    resolver,
    defaultValues: {
      name: '',
      symbol: '',
      description: '',
      prebuy: undefined,
      telegram: '',
      twitter: '',
      link: projectUrl,
    },
  });

  const { control, handleSubmit, formState } = form;
  const { isSubmitting } = formState;
  const prebuy = useWatch({ control, name: 'prebuy' });

  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const onSubmit = async (values: z.infer<typeof schema>) => {
    if (!publicKey || !signTransaction) return;

    try {
      const formData = new FormData();
      Object.entries(values).map(([key, val]) => {
        if (typeof val === 'undefined') return;
        let value: Blob | string;
        if (typeof val === 'number') {
          value = val.toString();
        } else if (val instanceof File) {
          value = new Blob([val]);
        } else {
          value = val;
        }
        formData.append(key, value);
      });
      const { tx, mintPublicKey } = await createHeavenTokenAsync(formData);

      const txObj = VersionedTransaction.deserialize(base64ToUint8Array(tx));
      let signedTx: VersionedTransaction;
      try {
        signedTx = await signTransaction(txObj);
      } catch (err) {
        console.error(err);
        toast.error('Transaction failed. Please try again.');
        return;
      }

      await sendTransactionProxy(Buffer.from(signedTx.serialize()).toString('base64'));
      await setProjectTokenAsync({
        tokenAddress: mintPublicKey,
        description: values.description || undefined,
        telegram: values.telegram || undefined,
        twitter: values.twitter || undefined,
      });
      const refetchResponse = await refetchTokenData();
      if (!refetchResponse.isSuccess) {
        toast.error('Successfuly launched token, but failed to load token info. Try to reaload page');
      } else {
        toast.success('Sucessfully launched token');
      }
      setShowTokenWindow(false);
    } catch (err: any) {
      if (err.message?.includes('User rejected')) return;
      console.error(err);
      toast.error('Transaction failed. Please try again.');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mx-auto">
        <div className="flex gap-5">
          <div className="flex flex-col gap-5">
            <div className="flex gap-3 *:flex-1">
              <FormField
                control={control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name {<RequiredFieldMark />}</FormLabel>
                    <FormControl>
                      <Input autoComplete="off" placeholder="My Token" disabled={isSubmitting} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="symbol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Symbol {<RequiredFieldMark />}</FormLabel>
                    <FormControl>
                      <Input autoComplete="off" placeholder="MTK" disabled={isSubmitting} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                      autoComplete="off"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={control}
            name="image"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Image {<RequiredFieldMark />}</FormLabel>
                <div className="mt-2 w-32 h-32 border border-border-light rounded-md overflow-hidden">
                  {imagePreview && <img src={imagePreview} alt="Preview" className="object-contain w-full h-full" />}
                </div>
                <FormControl>
                  <div className="flex flex-col gap-2">
                    <label className="inline-flex justify-center items-center text-foreground font-bold w-full cursor-pointer border-1 bg-input border-border-light h-7 px-3 py-1 text-sm rounded-md hover:border-2">
                      {imagePreview ? 'Change' : 'Upload'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          field.onChange(file); // set value in RHF
                          if (file) {
                            field.onChange(file);
                            const url = URL.createObjectURL(file);
                            setImagePreview(url);
                          }
                        }}
                        disabled={isSubmitting}
                        className="hidden"
                      />
                    </label>
                  </div>
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={control}
          name="prebuy"
          rules={{ min: { value: 0, message: 'Minimum quantity is 1' } }}
          render={({ field }) => (
            <FormItem>
              <div className="flex justify-between">
                <FormLabel>Prebuy Amount</FormLabel>
                <FormDescription>
                  Balance:{' '}
                  {isBalanceLoading ? (
                    <div className="inline-block i-ph:spinner-gap animate-spin mr-1"></div>
                  ) : (
                    walletBalance
                  )}
                  SOL
                </FormDescription>
              </div>
              <FormControl>
                <Input
                  placeholder="0 SOL"
                  disabled={isSubmitting || !!balanceError || isBalanceLoading}
                  {...field}
                  type="text"
                  pattern="[0-9]*[.,]?[0-9]*"
                  autoComplete="off"
                  inputMode="decimal"
                  onChange={(e) => {
                    const value = e.target.value.replace(',', '.');
                    field.onChange(value === '' ? undefined : value);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3 *:flex-1">
          <FormField
            control={control}
            name="telegram"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telegram</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Token's Telegram channel link"
                    autoComplete="off"
                    disabled={isSubmitting}
                    {...field}
                  />
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
                  <Input placeholder="Token's X profile link" autoComplete="off" disabled={isSubmitting} {...field} />
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
                  className="cursor-not-allowed text-gray-400"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Token'}
        </Button>
      </form>
    </Form>
  );
}
