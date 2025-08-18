import React, { useEffect, useState } from 'react';
import { userHasWallet } from "@civic/auth-web3";
import { useUser } from '@civic/auth-web3/react';

export const CivicConnectionChecker: React.FC = () => {
  const user = useUser();
  const [status, setStatus] = useState('Checking...');

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const checkConnection = async () => {
      console.log("Checking connection...");
      if (!user) {
        setStatus('No civic user detected');
      } else {
        const hasWallet = await userHasWallet(user);
        console.log("User has wallet:", hasWallet);
        if (hasWallet) {
          setStatus('Civic user has wallet');
        } else {
          setStatus('No wallet for civic user');
        }
      }
    };

    checkConnection();
    interval = setInterval(checkConnection, 1000);

    return () => clearInterval(interval);
  }, [user]);

  return <div>{status}</div>;
};
