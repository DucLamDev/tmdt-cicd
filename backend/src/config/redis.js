import { createClient } from 'redis';
import logger from './logger.js';

let redisClient = null;

export const connectRedis = async () => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    redisClient.on('error', (err) => {
      logger.error(`Redis Client Error: ${err}`);
    });

    redisClient.on('connect', () => {
      logger.info('Redis Client Connected');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.warn(`Redis connection failed: ${error.message}. Continuing without Redis.`);
    return null;
  }
};

export const getRedisClient = () => redisClient;

export default { connectRedis, getRedisClient };
