'use client';
import { useEffect, useState } from 'react';

export default function SolanaProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Dynamic import to avoid SSR execution
    Promise.all([
      import('@reown/appkit/react'),
      import('@reown/appkit-adapter-solana/react'),
      import('@reown/appkit/networks'),
    ]).then(([{ createAppKit }, { SolanaAdapter }, { solana, solanaTestnet, solanaDevnet }]) => {
      const origin = window.location.origin;

      const metadata = {
        name: 'AImpact',
        description: 'AImpact Application',
        url: origin,
        icons: [`${origin}/favicon.svg`],
      };

      const solanaWeb3JsAdapter = new SolanaAdapter();

      createAppKit({
        adapters: [solanaWeb3JsAdapter],
        networks: [solana, solanaTestnet, solanaDevnet],
        metadata,
        projectId: import.meta.env.PUBLIC_WALLETCONNECT_PROJECT_ID,
        features: {
          analytics: true,
          socials: ['google', 'discord', 'x'],
          connectMethodsOrder: ['social', 'email', 'wallet'],
          legalCheckbox: true,
        },
        themeMode: 'dark',
        privacyPolicyUrl: `${origin}/privacy-policy`,
        termsConditionsUrl: `${origin}/terms-of-service`,
        themeVariables: {
          '--w3m-accent': '#9987ef',
          '--w3m-color-mix': '#9987ef',
          '--w3m-color-mix-strength': 5,
        },
      });

      setIsInitialized(true);
    });
  }, []);

  return <>{children}</>;
}
