'use client';
import { useEffect, useState } from 'react';
import LoadingScreen from '../common/LoadingScreen';
import type { ReactNode } from 'react';

export default function AppKitProviderWrapper({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [AppKitComponents, setAppKitComponents] = useState<{
    Provider: any;
    adapter: any;
    networks: any;
  } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    Promise.all([
      import('@reown/appkit/react'),
      import('@reown/appkit-adapter-solana/react'),
      import('@reown/appkit/networks'),
    ])
      .then(([{ AppKitProvider }, { SolanaAdapter }, { solana, solanaTestnet, solanaDevnet }]) => {
        setAppKitComponents({
          Provider: AppKitProvider,
          adapter: new SolanaAdapter(),
          networks: { solana, solanaTestnet, solanaDevnet },
        });
        setIsInitialized(true);
      })
      .catch((error) => {
        console.error('Failed to initialize AppKit:', error);
        setIsInitialized(true);
      });
  }, []);

  if (!isInitialized || !AppKitComponents) {
    return <LoadingScreen />;
  }

  const { Provider, adapter, networks } = AppKitComponents;
  const origin = window.location.origin;

  const metadata = {
    name: 'AImpact',
    description: 'AImpact Application',
    url: origin,
    icons: [`${origin}/favicon.svg`],
  };

  return (
    <Provider
      adapters={[adapter]}
      networks={[networks.solana, networks.solanaTestnet, networks.solanaDevnet]}
      metadata={metadata}
      projectId={import.meta.env.PUBLIC_WALLETCONNECT_PROJECT_ID}
      features={{
        analytics: true,
        socials: ['google', 'discord', 'x'],
        connectMethodsOrder: ['social', 'email', 'wallet'],
        legalCheckbox: true,
      }}
      themeMode="dark"
      privacyPolicyUrl={`${origin}/privacy-policy`}
      termsConditionsUrl={`${origin}/terms-of-service`}
      themeVariables={{
        '--w3m-accent': '#9987ef',
        '--w3m-color-mix': '#9987ef',
        '--w3m-color-mix-strength': 5,
      }}
    >
      {children}
    </Provider>
  );
}
