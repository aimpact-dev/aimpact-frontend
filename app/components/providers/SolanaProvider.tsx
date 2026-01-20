import { createAppKit } from '@reown/appkit/react';
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react';
import { solana, solanaTestnet, solanaDevnet } from '@reown/appkit/networks';

const solanaWeb3JsAdapter = new SolanaAdapter();

const origin = typeof window !== 'undefined' ? window.location.origin : 'https://aimpact.dev';

const metadata = {
  name: 'AImpact',
  description: 'AImpact Application',
  url: origin,
  icons: [`${origin}/favicon.svg`],
};

createAppKit({
  adapters: [solanaWeb3JsAdapter],
  networks: [solana, solanaTestnet, solanaDevnet],
  metadata,
  projectId: import.meta.env.PUBLIC_WALLETCONNECT_PROJECT_ID,
  features: {
    analytics: true,
    socials: ['google', 'discord', 'x'],
    connectMethodsOrder: ['social', 'email', 'wallet'],
    // legalCheckbox: true,
  },
  themeMode: 'dark',
  // privacyPolicyUrl: `${origin}/privacy-policy`,
  // termsConditionsUrl: `${origin}/terms-of-service`,
  themeVariables: {
    '--apkt-accent': '#9987ef',
    '--apkt-color-mix': '#9987ef',
    '--apkt-color-mix-strength': 5,
  },
});

export default function SolanaProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
