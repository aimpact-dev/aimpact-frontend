import  { type PersistentKV } from '~/lib/persistence/kv/persistentKV';

export class CloudflareKV implements PersistentKV {
  private kv: any;

  constructor(cloudflareEnv: any){
    this.kv = cloudflareEnv.KV;
  }

  async delete(key: string): Promise<void> {
    await this.kv.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const res = await this.kv.get(key);
    return !!res;
  }

  async get(key: string): Promise<string | null> {
    return this.kv.get(key);
  }

  async set(key: string, value: string): Promise<void> {
    await this.kv.put(key, value);
  }
}
