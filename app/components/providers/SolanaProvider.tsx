import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import '@solana/wallet-adapter-react-ui/styles.css';
import { 
  PhantomWalletAdapter, 
  SolflareWalletAdapter,
  WalletConnectWalletAdapter 
} from '@solana/wallet-adapter-wallets';
import { ClientOnly } from 'remix-utils/client-only';

export interface SolanaProviderProps {
  children: React.ReactNode;
}

export default function SolanaProvider({ children }: SolanaProviderProps) {
  const network = WalletAdapterNetwork.Mainnet;

  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new WalletConnectWalletAdapter({
        network,
        options: {
          projectId: import.meta.env.PUBLIC_WALLETCONNECT_PROJECT_ID,
        },
      }),
    ],
    [network]
  );

  return (
    <ClientOnly>
      {() => {
        return (
          <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
              <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
          </ConnectionProvider>
        );
      }}
    </ClientOnly>
  );
}
