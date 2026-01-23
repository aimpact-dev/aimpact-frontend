// app/components/providers/AppKitProvider.tsx
import { AppKitProvider as ReownAppKitProvider } from '@reown/appkit/react';
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react';
import { solana, solanaDevnet, solanaTestnet } from '@reown/appkit/networks';
import React from 'react';

const solanaWeb3JsAdapter = new SolanaAdapter();

const metadata = {
  name: 'AImpact',
  description: 'AImpact Application',
  url: typeof window !== 'undefined' ? window.location.origin : '',
  icons: [`${typeof window !== 'undefined' ? window.location.origin : ''}/favicon.svg`],
};

export function AppKitProvider({ children }: { children: React.ReactNode }) {
  return (
    <ReownAppKitProvider
      adapters={[solanaWeb3JsAdapter]}
      networks={[solana, solanaTestnet, solanaDevnet]}
      metadata={metadata}
      projectId={import.meta.env.PUBLIC_WALLETCONNECT_PROJECT_ID}
      features={{
        analytics: true,
        socials: ['google', 'discord', 'x'],
        connectMethodsOrder: ['social', 'email', 'wallet'],
        legalCheckbox: true,
      }}
      themeMode="dark"
      privacyPolicyUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/privacy-policy`}
      termsConditionsUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/terms-of-service`}
      themeVariables={{
        '--w3m-accent': '#9987ef',
        '--w3m-color-mix': '#9987ef',
        '--w3m-color-mix-strength': 5,
      }}
    >
      {children}
    </ReownAppKitProvider>
  );
}
