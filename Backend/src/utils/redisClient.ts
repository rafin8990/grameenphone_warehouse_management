import { createClient, RedisClientType } from 'redis';
import config from '../config';

let client: RedisClientType | null = null;
let isConnected = false;

async function connect(): Promise<void> {
  if (isConnected && client) {
    return;
  }

  try {
    const urlObj = new URL(String(config.redis_url));
    const isTls = urlObj.protocol === 'rediss:';

    client = createClient({
      // host: "188.166.232.67",
      // port: 6379,
      url: "redis://188.166.232.67:6389",
      // socket: {
      //   // Enable TLS for rediss:// and set SNI to the hostname from the URL
      //   ...(isTls ? { tls: true as const, servername: urlObj.hostname } : {}),
      //   reconnectStrategy: (retries) => {
      //     if (retries > 5) {
      //       console.log('⚠️  Redis connection failed after 5 retries - continuing without Redis');
      //       return false; // Stop retrying
      //     }
      //     return Math.min(retries * 100, 3000);
      //   }
      // }
    });

    client.on('error', (err) => {
      console.error('Redis Client Error:', err);
      isConnected = false;
    });

    client.on('connect', () => {
      console.log('🔌 Redis socket connected');
    });

    client.on('ready', () => {
      console.log('✅ Redis is ready');
      isConnected = true;
    });

    client.on('disconnect', () => {
      console.log('❌ Disconnected from Redis');
      isConnected = false;
    });

    await client.connect();

    try {
      await client.ping();
      isConnected = true;
    } catch (err) {
      isConnected = false;
      console.error('⚠️  Redis ping failed after connect:', err);
    }
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    console.log('⚠️  Continuing without Redis - some features may be limited');
  }
}

async function disconnect(): Promise<void> {
  if (client && isConnected) {
    await client.disconnect();
    isConnected = false;
  }
}

async function set(key: string, value: string, ttlSeconds?: number): Promise<void> {
  if (!client || !isConnected) {
    console.log('⚠️  Redis not available - skipping set operation');
    return;
  }
  if (ttlSeconds) {
    await client.setEx(key, ttlSeconds, value);
  } else {
    await client.set(key, value);
  }
}

async function get(key: string): Promise<string | null> {
  if (!client || !isConnected) {
    console.log('⚠️  Redis not available - returning null');
    return null;
  }
  return await client.get(key);
}

async function del(key: string): Promise<number> {
  if (!client || !isConnected) {
    console.log('⚠️  Redis not available - skipping delete operation');
    return 0;
  }
  return await client.del(key);
}

async function exists(key: string): Promise<boolean> {
  if (!client || !isConnected) {
    console.log('⚠️  Redis not available - returning false');
    return false;
  }
  const result = await client.exists(key);
  return result === 1;
}

async function ttl(key: string): Promise<number> {
  if (!client || !isConnected) {
    console.log('⚠️  Redis not available - returning -1');
    return -1;
  }
  return await client.ttl(key);
}

async function keys(pattern: string): Promise<string[]> {
  if (!client || !isConnected) {
    console.log('⚠️  Redis not available - returning empty array');
    return [];
  }
  return await client.keys(pattern);
}

async function flushAll(): Promise<void> {
  if (!client || !isConnected) {
    console.log('⚠️  Redis not available - skipping flush operation');
    return;
  }
  await client.flushAll();
}

function isReady(): boolean {
  return isConnected && client !== null;
}

const redisClient = {
  connect,
  disconnect,
  set,
  get,
  del,
  exists,
  ttl,
  keys,
  flushAll,
  isReady,
};

export default redisClient;
