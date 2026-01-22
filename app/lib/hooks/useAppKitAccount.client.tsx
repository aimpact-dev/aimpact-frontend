'use client';
import { useAppKitAccount as useOriginalAppKitAccount } from '@reown/appkit/react';

export function useAppKitAccount() {
  if (typeof window === 'undefined') {
    return { address: undefined, isConnected: false };
  }
  return useOriginalAppKitAccount();
}
