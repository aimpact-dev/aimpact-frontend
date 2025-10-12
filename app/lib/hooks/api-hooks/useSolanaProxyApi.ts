import { useFetch } from '../../hooks/useFetch';

const host = import.meta.env.PUBLIC_BACKEND_URL;

interface RecentBlockhashResponse {
  blockhash: string;
  lastValidBlockHeight: number;
}

interface SendTransactionResponse {
  txHash: string;
}

export const useSolanaProxy = () => {
  const { fetchDataAuthorized } = useFetch();

  const getRecentBlockhash = async () => {
    return fetchDataAuthorized(`${host}/proxy/recent-blockhash`) as Promise<RecentBlockhashResponse>;
  };

  const sendTransaction = async (serializedTx: string) => {
    return fetchDataAuthorized(`${host}/proxy/send-tx`, {
      method: 'POST',
      body: JSON.stringify({ serializedTx }),
      headers: {
        'Content-Type': 'application/json',
      },
    }) as Promise<SendTransactionResponse>;
  };

  const fetchBalance = async (address: string) => {
    return fetchDataAuthorized(`${host}/proxy/balance`, {
      method: 'POST',
      body: JSON.stringify({ address }),
      headers: {
        'Content-Type': 'application/json',
      },
    }) as Promise<{ balance: number }>;
  };

  const minRentBalance = async (dataLength: number) => {
    return fetchDataAuthorized(`${host}/proxy/min-balance-for-rent`, {
      method: 'POST',
      body: JSON.stringify({ bytes: dataLength }),
      headers: {
        'Content-Type': 'application/json',
      },
    }) as Promise<{ lamports: number }>;
  };

  return {
    getRecentBlockhash,
    sendTransaction,
    fetchBalance,
    minRentBalance,
  };
};
