import  { type PersistentKV } from '~/lib/persistence/kv/persistentKV';
import  Redis from 'ioredis';

export class RedisKV implements PersistentKV {
  protected readonly redisClient: Redis;

  constructor(redisUrl: string) {
    this.redisClient = new Redis(redisUrl);
  }

  async delete(key: string): Promise<void> {
    await this.redisClient.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.redisClient.exists(key)) === 1;
  }

  async get(key: string): Promise<string | null> {
    return this.redisClient.get(key);
  }

  async set(key: string, value: string): Promise<void> {
    await this.redisClient.set(key, value);
  }
}
