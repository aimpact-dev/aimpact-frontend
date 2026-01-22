'use client';
import { useEffect } from 'react';
import { createAppKit } from '@reown/appkit/react';
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react';
import { solana, solanaTestnet, solanaDevnet } from '@reown/appkit/networks';

export default function SolanaProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;

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
        '--apkt-accent': '#9987ef',
        '--apkt-color-mix': '#9987ef',
        '--apkt-color-mix-strength': 5,
      },
    });
  }, []); // Empty dependency array = run once on mount

  return <>{children}</>;
}
