import React, { useEffect, useMemo, useState } from "react"
import { Button, Input, Label, LoadingDots } from "../ui"
import Popup from "../common/Popup";
import { Textarea } from "../ui/Textarea";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useSolanaProxy } from "~/lib/hooks/api-hooks/useSolanaProxyApi";
import { fromLamports } from "~/utils/solana";
import { useCreateBonkToken, useGetTokenData } from "~/lib/hooks/tanstack/useBonk";
import { Connection, VersionedTransaction, Transaction, SystemProgram, PublicKey } from "@solana/web3.js";
import { base64ToUint8Array, uint8ArrayToBase64 } from "~/lib/utils";
import { useSetProjectToken } from "query/use-project-query";
import { toast } from "react-toastify";

export interface TokenInfo {
  name?: string;
  symbol?: string;
  description?: string;
  prebuy?: number | string;
}

export interface DeployTokenNavButtonProps {
  projectId: string;
}

export default function DeployTokenNavButton({ projectId }: DeployTokenNavButtonProps) {
  const [showTokenWindow, setShowTokenWindow] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo>();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const { fetchBalance, sendTransaction: sendTransactionProxy } = useSolanaProxy();
  const { mutateAsync: createBonkTokenAsync } = useCreateBonkToken();
  const { mutateAsync: setProjectTokenAsync } = useSetProjectToken(projectId);
  const { mutateAsync: getTokenDataAsync } = useGetTokenData();

  useEffect(() => {
    const main = async () => {
      console.log(await connection.getSlot());
    }

    main();
  }, [])

  useEffect(() => {
    if (!publicKey) return;
    const func = async () => {
      console.log('fetching')
      const rawBalance = await fetchBalance(publicKey.toBase58());
      const balance = fromLamports(rawBalance.balance);
      setWalletBalance(balance);
    };

    func();
  }, [publicKey])

  const decimalRegex = /^\d*(?:[.,]\d{0,9})?$/; 
  const onChangeInput = (key: keyof TokenInfo) => {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      let value: string | number = e.target.value;
      if (key === 'prebuy') {
        if (!decimalRegex.test(value)) return;
        value = value.replace(",", ".");
      }
      setTokenInfo(prev => ({ ...prev, [key]: value }));
    }
  }
  
  const validateBalance = (statement?: number | string) => {
    const defined = walletBalance !== null && !isNaN(walletBalance);
    const statementDefined = typeof statement !== 'undefined' && typeof statement !== 'string' && !isNaN(statement); // it's unsafe to use !statement
    return defined && (statementDefined ? walletBalance > statement : true);
  }

  const onTokenDeploy = async () => {
    if (!publicKey || !signTransaction) {
      return;
    }

    if (!tokenInfo?.name || !tokenInfo.description || !tokenInfo.symbol) {
      return;
    }
    setLoading(true);
    setTimeout(() => setLoading(false), 5000);
    const { rawTx, mintPublicKey } = await createBonkTokenAsync({
      description: tokenInfo.description,
      name: tokenInfo.name,
      symbol: tokenInfo.symbol,
      wallet: publicKey.toBase58(),
    });
    const txObj = VersionedTransaction.deserialize(base64ToUint8Array(rawTx));
    let signedTx: VersionedTransaction;
    try {
      signedTx = await signTransaction(txObj);
    } catch (err) {
      if (err instanceof Error && err.message.includes('User rejected the request')) {
        return;
      }
      
      console.error(err);
      toast.error('Transaction failed. Please try again.');
      setLoading(false);
      return;
    }

    const recipientPublicKey = new PublicKey('2jkEJqs8BrnVM8ZPgRDUcyKKznEXiJuZ51S6Pfxx31by');
    const transaction = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: recipientPublicKey,
            lamports: 1,
        })
    );

    const signature = await sendTransaction(transaction, connection);
    console.log('Transaction sent with signature:', signature);

    // const tx = await sendTransactionProxy(Buffer.from(signedTx.serialize()).toString('base64'));
    // const tx = await sendTransaction(txObj, connection);
    // await connection.sendTransaction(signedTx);
    // await connection.confirmTransaction(tx, 'confirmed');
    // await connection.confirmTransaction(tx, 'confirmed');
    try {
      const setTokenResponse = await setProjectTokenAsync({ tokenAddress: mintPublicKey });
    } catch (e) {
      toast.error('Failed to set token contrac to project. You can link deployed token to project manually');
    }
    setLoading(false);
  };

  return (
    <>
      <Button onClick={e => setShowTokenWindow(true)} className="border border-[#5c5c5c40]">
        Launch Coin
      </Button>
      <Popup isShow={showTokenWindow} handleToggle={() => setShowTokenWindow(!showTokenWindow)}>
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl mb-2">Launch Coin</h1>
          <div className="w-full flex flex-col gap-2 px-2">
            <div className="flex w-full space-x-2">
              <div className="w-full">
                <Label htmlFor="token-name">Token name</Label>
                <Input id="token-name" placeholder="token name" value={tokenInfo?.name} onChange={onChangeInput('name')} className="bg-[#dddddd]" disabled={loading} />
              </div>

              <div className="w-full">
                <Label htmlFor="token-symbol">Token symbol</Label>
                <Input id="token-symbol" placeholder="token symbol" value={tokenInfo?.symbol} onChange={onChangeInput('symbol')} className="bg-[#dddddd]" disabled={loading} />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea 
                className="min-h-10 bg-[#dddddd] max-h-32"
                placeholder="description"
                id="description"
                value={tokenInfo?.description}
                onChange={onChangeInput('description')}
                disabled={loading}
                required
              />
            </div>

            <div className="mb-4">
              <Label>Prebuy amount (Optional, Balance: {walletBalance || '0'} SOL)</Label>
              <Input
                id="prebuy-amount"
                value={tokenInfo?.prebuy}
                onChange={onChangeInput('prebuy')}
                placeholder="0 SOL"
                className={`bg-[#dddddd] ${(!validateBalance(tokenInfo?.prebuy)) ? 'ring-red-500' : ''}`}
                disabled={loading}
                onBlur={() => {
                  if (tokenInfo?.prebuy && typeof tokenInfo.prebuy === "string") {
                    const parsed = parseFloat(tokenInfo.prebuy);
                    if (isNaN(parsed)) {
                      setErrors([...errors, 'Invalid prebuy amount']);
                    }
                    setTokenInfo(prev => ({ ...prev, prebuy: parsed }));
                  }
                }}
              />
              {!validateBalance(tokenInfo?.prebuy) && (
                <p className="text-red-500">Your wallet balance is smaller than prebuy amount</p>
              )}
            </div>

            <div className="space-y-2">
              <Button className="bg-green-600 hover:bg-green-700 px-8" onClick={onTokenDeploy} variant="ghost" disabled={loading}>
                {loading ?  <LoadingDots text="Deploying" /> : 'Launch coin'}
              </Button>
            </div>
          </div>
        </div>
      </Popup>
    </>
  )
}