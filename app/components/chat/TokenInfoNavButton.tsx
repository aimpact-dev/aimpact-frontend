import React, { useEffect, useMemo, useState } from "react"
import { Button, Input, Label, LoadingDots } from "../ui"
import Popup from "../common/Popup";
import { Textarea } from "../ui/Textarea";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useSolanaProxy } from "~/lib/hooks/api-hooks/useSolanaProxyApi";
import { fromLamports } from "~/utils/solana";
import { useCreateBonkToken, useGetTokenData } from "~/lib/hooks/tanstack/useBonk";
import type { Transaction } from "@codemirror/state";
import { VersionedTransaction } from "@solana/web3.js";
import { base64ToUint8Array } from "~/lib/utils";
import { useSetProjectToken } from "query/use-project-query";

export interface TokenInfo {
  name?: string;
  symbol?: string;
  description?: string;
  prebuy?: number;
}

export interface DeployTokenNavButtonProps {
  projectId: string;
}

export default function DeployTokenNavButton({ projectId }: DeployTokenNavButtonProps) {
  const [showTokenWindow, setShowTokenWindow] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo>();
  const [loading, setLoading] = useState(false);
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const { fetchBalance } = useSolanaProxy();
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
  
  const validateBalance = (statement?: number) => {
    const defined = walletBalance !== null && !isNaN(walletBalance);
    const statementDefined = typeof statement !== 'undefined' && !isNaN(statement); // it's unsafe to use !statement
    return defined && (statementDefined ? walletBalance > statement : true);
  }

  return (
    <>
      <Button onClick={e => setShowTokenWindow(true)} className="border border-[#5c5c5c40]">
        Launch Coin
      </Button>
      <Popup isShow={showTokenWindow} handleToggle={() => setShowTokenWindow(!showTokenWindow)}>
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl mb-2">Launch Coin</h1>
          <div className="w-full flex flex-col gap-2 px-2">
            
          </div>
        </div>
      </Popup>
    </>
  )
}