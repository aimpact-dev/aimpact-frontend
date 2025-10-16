import { clusterApiUrl, Connection } from '@solana/web3.js';

export const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
export const fromLamports = (lamports: number) => {
  return lamports / 10 ** 9;
}

export const toLamports = (sol: number) => {
  return sol * 10 ** 9;
}
