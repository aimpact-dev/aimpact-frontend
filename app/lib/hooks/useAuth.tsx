import Cookies from 'js-cookie';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { atom } from 'nanostores';
import bs58 from 'bs58';
import { useAppKitAccount, useAppKitProvider, useDisconnect, type Provider } from './appkit.client';

interface UserInfo {
  id: string;
  wallet: string;
  messagesLeft: number;
  pendingMessages: number;
  inviteCode: string;
  discountPercent: number;
  referralsRewards: number;
  totalEarnedRewards: number;
  claimedFreeMessages: boolean;
}

type AuthContextType = {
  isAuthorized: boolean;
  jwtToken: string;
  disconnect: () => Promise<void>;
};

type RequestMessageResponseType = {
  nonce: string;
  message: string;
};

type LoginWalletResponseType = {
  accessToken: string;
};

export const userInfo = atom<UserInfo | undefined>(undefined);

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAppKitAccount();
  const { disconnect } = useDisconnect();
  const { walletProvider } = useAppKitProvider<Provider>('solana');

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [jwtToken, setJwtToken] = useState('');

  useEffect(() => {
    const checkCreds = async () => {
      if (!isConnected) {
        setIsAuthorized(false);
        return;
      }

      if (!walletProvider || !walletProvider.publicKey) {
        return;
      }

      const publicKey = walletProvider.publicKey;

      const authToken = Cookies.get('authToken');

      if (!authToken || authToken === 'undefined') {
        let requestMessage;

        try {
          requestMessage = await fetch(`${import.meta.env.PUBLIC_BACKEND_URL}/auth/requestMessage`, {
            method: 'POST',
            headers: {
              accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ walletAddress: publicKey.toBase58() }),
          });
        } catch (error) {
          const msg = 'Failed to request sign message';
          toast.error(msg);
          setIsAuthorized(false);
          throw error;
        }

        if (!requestMessage.ok) {
          throw new Error('Failed to request sign message');
        }

        const { message, nonce } = (await requestMessage.json()) as RequestMessageResponseType;

        try {
          const encodedMessage = new TextEncoder().encode(message);
          const signedMessage = await walletProvider.signMessage(encodedMessage);

          const signature = bs58.encode(signedMessage);

          // backend /api/login logic
          const response = await fetch(`${import.meta.env.PUBLIC_BACKEND_URL}/auth/loginWithWallet`, {
            headers: {
              accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              nonce,
              signedMessage: signature,
              walletAddress: publicKey.toBase58(),
              inviteCode: localStorage.getItem('refCode') || null,
            }),
            method: 'POST',
          });

          if (!response.ok) {
            setIsAuthorized(false);
            throw new Error('Login response is not ok.');
          }

          const responseData: LoginWalletResponseType = await response.json();

          setJwtToken(responseData.accessToken);
          setIsAuthorized(true);
          Cookies.set('authToken', responseData.accessToken);
        } catch (error) {
          console.error(error);
          toast.error((error as Error)?.message || 'Failed to sign message and authorize');
          await handleDisconnect();
        }
      } else {
        setIsAuthorized(true);
        setJwtToken(authToken);
      }
    };

    checkCreds();
  }, [isConnected, walletProvider]);

  useEffect(() => {
    if (!isConnected && isAuthorized) {
      Cookies.remove('authToken');
      setIsAuthorized(false);
      setJwtToken('');
      userInfo.set(undefined);
    }
  }, [isConnected, isAuthorized]);

  useEffect(() => {
    if (!isConnected || !isAuthorized) {
      return;
    }

    const req = async () => {
      const authToken = Cookies.get('authToken');

      if (!authToken) {
        return;
      }

      const response = await fetch(`${import.meta.env.PUBLIC_BACKEND_URL}/auth/me`, {
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        await handleDisconnect();
        return;
      }

      const userInfoData = (await response.json()) as UserInfo;
      userInfo.set(userInfoData);
    };

    req();

    const interval = setInterval(req, 10000);

    return () => clearInterval(interval);
  }, [isConnected, isAuthorized]);

  const handleDisconnect = async () => {
    Cookies.remove('authToken');
    setIsAuthorized(false);
    setJwtToken('');
    userInfo.set(undefined);
    await disconnect();
  };

  return (
    <AuthContext.Provider value={{ isAuthorized, jwtToken, disconnect: handleDisconnect }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

// For usage outside of React components
export function getAuthTokenFromCookies(): string | undefined {
  return Cookies.get('authToken');
}
