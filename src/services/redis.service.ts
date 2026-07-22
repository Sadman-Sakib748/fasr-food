import { RedisClientType } from 'redis';
import { connectRedis, getRedisClient } from '../config/redis';
import logger from '../utils/logger';

export class RedisService {
  private static client: RedisClientType;

  // Initialize Redis
  static async init(): Promise<void> {
    try {
      if (!this.client) {
        this.client = await connectRedis();
        logger.info('Redis service initialized');
      }
    } catch (error) {
      logger.error('Error initializing Redis service:', error);
      throw error;
    }
  }

  // Get Redis client
  static getClient(): RedisClientType {
    if (!this.client) {
      throw new Error('Redis client not initialized. Call init() first.');
    }
    return this.client;
  }

  // Set value with expiration
  static async set(key: string, value: any, expiresIn: number = 3600): Promise<void> {
    try {
      const client = this.getClient();
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      await client.set(key, stringValue, { EX: expiresIn });
    } catch (error) {
      logger.error(`Error setting Redis key ${key}:`, error);
      throw error;
    }
  }

  // Get value
  static async get(key: string): Promise<any> {
    try {
      const client = this.getClient();
      const value = await client.get(key);
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      logger.error(`Error getting Redis key ${key}:`, error);
      return null;
    }
  }

  // Delete key
  static async delete(key: string): Promise<void> {
    try {
      const client = this.getClient();
      await client.del(key);
    } catch (error) {
      logger.error(`Error deleting Redis key ${key}:`, error);
      throw error;
    }
  }

  // Check if key exists
  static async exists(key: string): Promise<boolean> {
    try {
      const client = this.getClient();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Error checking Redis key ${key}:`, error);
      return false;
    }
  }

  // Set expiration
  static async expire(key: string, seconds: number): Promise<void> {
    try {
      const client = this.getClient();
      await client.expire(key, seconds);
    } catch (error) {
      logger.error(`Error setting expiration for ${key}:`, error);
      throw error;
    }
  }

  // Get all keys matching pattern
  static async keys(pattern: string): Promise<string[]> {
    try {
      const client = this.getClient();
      return await client.keys(pattern);
    } catch (error) {
      logger.error(`Error getting keys with pattern ${pattern}:`, error);
      return [];
    }
  }

  // Increment counter
  static async increment(key: string): Promise<number> {
    try {
      const client = this.getClient();
      return await client.incr(key);
    } catch (error) {
      logger.error(`Error incrementing ${key}:`, error);
      return 0;
    }
  }

  // Set hash field
  static async hset(key: string, field: string, value: any): Promise<void> {
    try {
      const client = this.getClient();
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      await client.hSet(key, field, stringValue);
    } catch (error) {
      logger.error(`Error setting hash ${key}:${field}:`, error);
      throw error;
    }
  }

  // Get hash field
  static async hget(key: string, field: string): Promise<any> {
    try {
      const client = this.getClient();
      const value = await client.hGet(key, field);
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      logger.error(`Error getting hash ${key}:${field}:`, error);
      return null;
    }
  }

  // Get all hash fields
  static async hgetall(key: string): Promise<Record<string, any>> {
    try {
      const client = this.getClient();
      const result = await client.hGetAll(key);
      const parsedResult: Record<string, any> = {};
      for (const [field, value] of Object.entries(result)) {
        try {
          parsedResult[field] = JSON.parse(value);
        } catch {
          parsedResult[field] = value;
        }
      }
      return parsedResult;
    } catch (error) {
      logger.error(`Error getting all hash ${key}:`, error);
      return {};
    }
  }

  // Push to list
  static async lpush(key: string, value: any): Promise<void> {
    try {
      const client = this.getClient();
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      await client.lPush(key, stringValue);
    } catch (error) {
      logger.error(`Error pushing to list ${key}:`, error);
      throw error;
    }
  }

  // Pop from list
  static async rpop(key: string): Promise<any> {
    try {
      const client = this.getClient();
      const value = await client.rPop(key);
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      logger.error(`Error popping from list ${key}:`, error);
      return null;
    }
  }

  // Get list range
  static async lrange(key: string, start: number, stop: number): Promise<any[]> {
    try {
      const client = this.getClient();
      const values = await client.lRange(key, start, stop);
      return values.map((v) => {
        try {
          return JSON.parse(v);
        } catch {
          return v;
        }
      });
    } catch (error) {
      logger.error(`Error getting list range ${key}:`, error);
      return [];
    }
  }

  // Clear cache
  static async clearCache(pattern: string = '*'): Promise<void> {
    try {
      const keys = await this.keys(pattern);
      if (keys.length > 0) {
        const client = this.getClient();
        await client.del(keys);
        logger.info(`Cleared ${keys.length} cache keys`);
      }
    } catch (error) {
      logger.error('Error clearing cache:', error);
      throw error;
    }
  }
}

export default RedisService;