import { createAppKit } from '@reown/appkit/react';
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react';
import { solana, solanaTestnet, solanaDevnet } from '@reown/appkit/networks';

const solanaWeb3JsAdapter = new SolanaAdapter();

const metadata = {
  name: 'AImpact',
  description: 'AImpact Application',
  url: import.meta.env.PUBLIC_BACKEND_URL,
  icons: [`${import.meta.env.PUBLIC_BACKEND_URL}/favicon.svg`],
};

createAppKit({
  adapters: [solanaWeb3JsAdapter],
  networks: [solana, solanaTestnet, solanaDevnet],
  metadata,
  projectId: import.meta.env.PUBLIC_WALLETCONNECT_PROJECT_ID,
  features: {
    analytics: true,
    socials: ['google', 'discord', 'x'],
  },
  themeMode: 'dark',
  themeVariables: {
    '--apkt-accent': '#9987ef',
  },
});

export default function SolanaProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
