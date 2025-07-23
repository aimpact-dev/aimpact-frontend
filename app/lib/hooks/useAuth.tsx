import { useWallet } from '@solana/wallet-adapter-react';
import Cookies from 'js-cookie';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { WalletSignMessageError } from '@solana/wallet-adapter-base';
import bs58 from 'bs58';
import { toast } from 'react-toastify';
import { atom } from 'nanostores';

interface UserInfo {
  id: string;
  wallet: string;
  messagesLeft: number;
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
  const { publicKey, connected, signMessage, disconnect } = useWallet();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [jwtToken, setJwtToken] = useState('');

  useEffect(() => {
    const checkCreds = async () => {
      if (connected && isAuthorized) {
        return;
      }

      if (!connected || !signMessage || !publicKey) {
        setIsAuthorized(false);
        return;
      }

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
          const rawSignature = await signMessage(new TextEncoder().encode(message));
          const signature = bs58.encode(rawSignature);

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

          if (error instanceof WalletSignMessageError) {
            await handleDisconnect();
          }
        }
      } else {
        setIsAuthorized(true);
        setJwtToken(authToken);
      }
    };

    checkCreds().then(() => {
      /*
       * console.log(`Is Auth new: ${isAuthorized} ${jwtToken.slice(0, 15)}`);
       * console.log(`Jwt new: ${jwtToken} ${typeof jwtToken}`);
       * console.log(`Public Key: ${publicKey}`);
       */
    });
  }, [publicKey, connected, signMessage, disconnect]);

  useEffect(() => {
    if (!connected && isAuthorized) {
      Cookies.remove('authToken');
      setIsAuthorized(false);
      setJwtToken('');
      userInfo.set(undefined);
    }
  }, [connected, isAuthorized]);

  useEffect(() => {
    if (!connected || !isAuthorized) {
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
  }, [connected, isAuthorized]);

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
