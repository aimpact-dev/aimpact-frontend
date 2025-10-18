import  { type PersistentKV } from '~/lib/persistence/kv/persistentKV';

export class CloudflareKV implements PersistentKV {
  private kv: any;

  constructor(cloudflareEnv: any){
    this.kv = cloudflareEnv.KV;
  }

  async delete(key: string): Promise<void> {
    try{
      await this.kv.delete(key);
    } catch(err){
      console.log(`Error when deleting key ${key} from Cloudflare KV. Error ${JSON.stringify(err)}`);
      throw err;
    }
  }

  async exists(key: string): Promise<boolean> {
    try{
      console.log(`Checking if key ${key} exists on Cloudflare KV`);
      const res = await this.kv.get(key);
      console.log(`Retrieved value from Cloudflare KV when checking if key ${key} exists: ${JSON.stringify(res)}`);
      return !!res;
    } catch(err){
      console.log(`Error occurred while checking for key ${key} existence in Cloudflare KV. Error ${JSON.stringify(err)}`);
      throw err;
    }
  }

  async get(key: string): Promise<string | null> {
    try{
      return this.kv.get(key);
    } catch(err){
      console.log(`Error occurred while getting key ${key} in Cloudflare KV. Error ${JSON.stringify(err)}`);
      throw err;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try{
      await this.kv.put(key, value);
    } catch(err){
      console.log(`Error occurred while setting key ${key} in Cloudflare KV. Error ${JSON.stringify(err)}`);
      throw err;
    }
  }
}
