import  { type PersistentKV } from '~/lib/persistence/kv/persistentKV';
import { Redis } from '@upstash/redis/cloudflare';

export class UpstashRedisKV implements PersistentKV {
  private readonly redisClient: Redis;

  constructor(upstashRedisRestUrl: string, upstashRedisRestToken: string){
    this.redisClient = Redis.fromEnv({
      UPSTASH_REDIS_REST_URL: upstashRedisRestUrl,
      UPSTASH_REDIS_REST_TOKEN: upstashRedisRestToken
    })
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redisClient.del(key);
    } catch (error) {
      console.error(`[UpstashRedisKV] Failed to delete key: ${key}`, error);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      return (await this.redisClient.exists(key)) === 1;
    } catch (error) {
      console.error(`[UpstashRedisKV] Failed to check existence for key: ${key}`, error);
      throw error;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return this.redisClient.get(key);
    } catch (error) {
      console.error(`[UpstashRedisKV] Failed to get key: ${key}`, error);
      throw error;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      await this.redisClient.set(key, value);
    } catch (error) {
      console.error(`[UpstashRedisKV] Failed to set key: ${key}`, error);
      throw error;
    }
  }
}
