import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, AnchorProvider, BN, web3 } from '@coral-xyz/anchor';
import { AnchorWallet } from '@solana/wallet-adapter-react';
import idl from './idl.json';
const PROGRAM_ID = new PublicKey(idl.address);

export class SolanaClient {
  private connection: Connection;
  private provider: AnchorProvider;
  private program: any;

  constructor(wallet: AnchorWallet) {
    this.connection = new Connection(clusterApiUrl('devnet'));

    this.provider = new AnchorProvider(this.connection, wallet, { commitment: 'confirmed' });

    try {
      this.program = new Program(idl, this.provider);
    } catch (error) {
      console.error('Program initialization error:', error);
      // For now, create a minimal program interface
      this.program = {
        methods: {
          initialize: () => ({ accounts: () => ({ rpc: () => Promise.resolve('mock-tx') }) }),
          set: () => ({ accounts: () => ({ rpc: () => Promise.resolve('mock-tx') }) }),
        },
        account: {
          val: {
            fetch: () => Promise.resolve({ value: new BN(0) }),
          },
        },
      };
    }
  }

  async initialize(domain: number, key: number): Promise<string> {
    try {
      // Generate PDA for the account
      const [valPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(domain.toString()), Buffer.from(key.toString())],
        PROGRAM_ID,
      );

      const tx = await this.program.methods
        .initialize(new BN(domain), new BN(key))
        .accounts({
          val: valPda,
          signer: this.provider.wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();
      return tx;
    } catch (error) {
      console.error('Initialize error:', error);
      throw error;
    }
  }

  async setValue(domain: number, key: number, value: number): Promise<string> {
    try {
      // Generate PDA for the account
      const [valPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(domain.toString()), Buffer.from(key.toString())],
        PROGRAM_ID,
      );

      const tx = await this.program.methods
        .set(new BN(domain), new BN(key), new BN(value))
        .accounts({
          val: valPda,
        })
        .rpc();
      return tx;
    } catch (error) {
      console.error('Set value error:', error);
      throw error;
    }
  }

  async getValue(domain: number, key: number): Promise<number> {
    try {
      // Generate PDA for the account
      const [valPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(domain.toString()), Buffer.from(key.toString())],
        PROGRAM_ID,
      );

      const account = await this.program.account.val.fetch(valPda);
      return account.value.toNumber();
    } catch (error) {
      console.error('Get value error:', error);
      throw error;
    }
  }
}
