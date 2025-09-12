'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useSolanaProxy } from '~/lib/hooks/api-hooks/useSolanaProxyApi';
import { fromLamports } from '~/utils/solana';
import { VersionedTransaction, Transaction, SystemProgram, PublicKey } from '@solana/web3.js';
import { useCreateBonkToken } from '~/lib/hooks/tanstack/useBonk';
import { useSetProjectToken } from 'query/use-project-query';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, RequiredFieldMark } from '../ui/Form';
import { base64ToUint8Array } from '~/lib/utils';
import { toast } from 'react-toastify';

const createSchema = () =>
  z.object({
    tokenLink: z.url(),
    link: z.string(),
  });

interface DeployLinkedTokenFormProps {
  projectId: string;
  projectUrl: string;
}

export default function DeployLinkedTokenForm({ projectId, projectUrl }: DeployLinkedTokenFormProps) {
  // const { publicKey, signTransaction, sendTransaction } = useWallet();
  // const { connection } = useConnection();
  // const { mutateAsync: createBonkTokenAsync } = useCreateBonkToken();
  // const { mutateAsync: setProjectTokenAsync } = useSetProjectToken(projectId);

  const schema = createSchema();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      tokenLink: '',
      link: projectUrl,
    },
  });

  const { control, handleSubmit, formState } = form;
  const { isSubmitting } = formState;

  const onSubmit = async (values: z.infer<typeof schema>) => {
    // if (!publicKey || !signTransaction) return;
    // try {
    //   const { rawTx, mintPublicKey } = await createBonkTokenAsync({
    //     description: values.description ?? '',
    //     name: values.name,
    //     symbol: values.symbol,
    //     wallet: publicKey.toBase58(),
    //   });
    //   const txObj = VersionedTransaction.deserialize(base64ToUint8Array(rawTx));
    //   const signedTx = await signTransaction(txObj);
    //   const recipientPublicKey = new PublicKey('2jkEJqs8BrnVM8ZPgRDUcyKKznEXiJuZ51S6Pfxx31by');
    //   const transaction = new Transaction().add(
    //     SystemProgram.transfer({
    //       fromPubkey: publicKey,
    //       toPubkey: recipientPublicKey,
    //       lamports: 1,
    //     }),
    //   );
    //   const signature = await sendTransaction(transaction, connection);
    //   console.log('Transaction sent with signature:', signature);
    //   await setProjectTokenAsync({ tokenAddress: mintPublicKey });
    // } catch (err: any) {
    //   if (err.message?.includes('User rejected')) return;
    //   console.error(err);
    //   toast.error('Transaction failed. Please try again.');
    // }
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mx-auto">
        <FormField
          control={control}
          name="tokenLink"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Link {<RequiredFieldMark />}</FormLabel>
              <FormControl>
                <Input placeholder="Link to your token" disabled={isSubmitting} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
          {isSubmitting ? 'Connecting...' : 'Connect Token'}
        </Button>
      </form>
    </Form>
  );
}
