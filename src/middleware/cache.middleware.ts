import { Request, Response, NextFunction } from 'express';
import RedisService from '../services/redis.service';
import logger from '../utils/logger';

export const cacheMiddleware = (duration: number = 3600) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key from URL and query params
    const key = `cache:${req.originalUrl || req.url}`;

    try {
      // Try to get cached data
      const cachedData = await RedisService.get(key);

      if (cachedData) {
        logger.info(`Cache hit: ${key}`);
        return res.status(200).json(cachedData);
      }

      // Store original send function
      const originalSend = res.json.bind(res);

      // Override send function to cache response
      res.json = function (body: any) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          RedisService.set(key, body, duration).catch((error) => {
            logger.error('Error caching response:', error);
          });
        }
        return originalSend(body);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
};

export const invalidateCache = async (pattern: string): Promise<void> => {
  try {
    const keys = await RedisService.keys(pattern);
    if (keys.length > 0) {
      for (const key of keys) {
        await RedisService.delete(key);
      }
      logger.info(`Invalidated ${keys.length} cache keys with pattern: ${pattern}`);
    }
  } catch (error) {
    logger.error('Error invalidating cache:', error);
  }
};

export const cache = (duration: number = 3600) => cacheMiddleware(duration);