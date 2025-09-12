'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useQuery } from '@tanstack/react-query';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useSolanaProxy } from '~/lib/hooks/api-hooks/useSolanaProxyApi';
import { fromLamports } from '~/utils/solana';
import { VersionedTransaction, Transaction, SystemProgram, PublicKey } from '@solana/web3.js';
import { useCreateBonkToken } from '~/lib/hooks/tanstack/useBonk';
import { useSetProjectToken } from 'query/use-project-query';
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
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

const createSchema = (walletBalance: number | null) =>
  z.object({
    name: z.string().min(1, 'Name is required'),
    symbol: z.string().min(1, 'Symbol is required'),
    description: z.string().optional(),
    prebuy: z
      .number({ error: 'Prebuy must be a number' })
      .nonnegative('Prebuy must be greater or equal to 0')
      .refine((val) => walletBalance === null || val <= walletBalance, {
        message: 'Prebuy cannot be larger than your wallet balance',
      })
      .optional(),
    telegram: z.string().optional(),
    twitter: z.string().optional(),
    image: z.instanceof(File, { error: 'Image is required' }),
    link: z.string(),
  });

interface DeployNewTokenFormProps {
  projectId: string;
  projectUrl: string;
}

export default function DeployNewTokenForm({ projectId, projectUrl }: DeployNewTokenFormProps) {
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const { fetchBalance } = useSolanaProxy();
  const { connection } = useConnection();
  const { mutateAsync: createBonkTokenAsync } = useCreateBonkToken();
  const { mutateAsync: setProjectTokenAsync } = useSetProjectToken(projectId);

  const {
    data: walletBalance = 0,
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

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
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

  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const onSubmit = async (values: z.infer<typeof schema>) => {
    if (!publicKey || !signTransaction) return;

    try {
      const { rawTx, mintPublicKey } = await createBonkTokenAsync({
        description: values.description ?? '',
        name: values.name,
        symbol: values.symbol,
        wallet: publicKey.toBase58(),
      });

      const txObj = VersionedTransaction.deserialize(base64ToUint8Array(rawTx));
      const signedTx = await signTransaction(txObj);

      const recipientPublicKey = new PublicKey('2jkEJqs8BrnVM8ZPgRDUcyKKznEXiJuZ51S6Pfxx31by');
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientPublicKey,
          lamports: 1,
        }),
      );

      const signature = await sendTransaction(transaction, connection);
      console.log('Transaction sent with signature:', signature);

      await setProjectTokenAsync({ tokenAddress: mintPublicKey });
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
                      <Input placeholder="My Token" disabled={isSubmitting} {...field} />
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
                      <Input placeholder="MTK" disabled={isSubmitting} {...field} />
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
          render={({ field }) => (
            <FormItem>
              <div className="flex justify-between">
                <FormLabel>Prebuy Amount</FormLabel>
                <FormDescription>
                  Balance:{' '}
                  {isBalanceLoading ? (
                    <div className="inline-block i-ph:spinner-gap animate-spin"></div>
                  ) : (
                    walletBalance
                  )}{' '}
                  SOL
                </FormDescription>
              </div>
              <FormControl>
                <Input placeholder="0 SOL" disabled={isSubmitting || !!balanceError || isBalanceLoading} {...field} />
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
                  <Input placeholder="Your Telegram profile" disabled={isSubmitting} {...field} />
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
                  <Input placeholder="Your X profile" disabled={isSubmitting} {...field} />
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
                {<div className="i-ph:link  color-accent-300"></div>} Link to your current{' '}
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
          {isSubmitting ? 'Creating...' : 'Create Token'}
        </Button>
      </form>
    </Form>
  );
}
