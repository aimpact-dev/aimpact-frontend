'use client';
import type { Provider } from '@reown/appkit-adapter-solana/react';

export const useAppKitAccount = () => {
  if (typeof window === 'undefined') {
    return { address: undefined, isConnected: false, caipAddress: undefined, status: 'disconnected' as const };
  }
  const { useAppKitAccount } = require('@reown/appkit/react') as typeof import('@reown/appkit/react');
  return useAppKitAccount();
};

export const useAppKitProvider = () => {
  if (typeof window === 'undefined') {
    return { walletProvider: undefined as Provider | undefined };
  }
  const { useAppKitProvider } = require('@reown/appkit/react') as typeof import('@reown/appkit/react');
  return useAppKitProvider<Provider>('solana');
};

export const useDisconnect = () => {
  if (typeof window === 'undefined') {
    return { disconnect: async () => {} };
  }
  const { useDisconnect } = require('@reown/appkit/react') as typeof import('@reown/appkit/react');
  return useDisconnect();
};

export const useAppKit = () => {
  if (typeof window === 'undefined') {
    return { open: () => {}, close: () => {} };
  }
  const { useAppKit } = require('@reown/appkit/react') as typeof import('@reown/appkit/react');
  return useAppKit();
};

export type { Provider };
