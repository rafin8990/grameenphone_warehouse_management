import redisClient from '../utils/redisClient';

interface LocationTrackingData {
  epc: string;
  po_number: string;
  item_number: string;
  location_code: string;
  status: 'in' | 'out';
  timestamp: number;
}

const COOLDOWN_SECONDS = 30;
const KEY_PREFIX = 'location_tracking:';

function generateKey(epc: string): string {
  // Cooldown is EPC-wide: if same EPC scans within 30s, ignore regardless of PO/item/location
  return `${KEY_PREFIX}${epc}`;
}

async function canProcessScan(
  epc: string
): Promise<{ canProcess: boolean; lastStatus?: 'in' | 'out'; timeRemaining?: number }> {
  try {
    if (!redisClient.isReady()) {
      console.log('⚠️  Redis not available - allowing scan processing');
      return { canProcess: true };
    }

    const key = generateKey(epc);
    const data = await redisClient.get(key);

    if (!data) {
      return { canProcess: true };
    }

    const trackingData: LocationTrackingData = JSON.parse(data);
    const now = Date.now();
    const timeDiff = now - trackingData.timestamp;
    const timeRemaining = Math.max(0, COOLDOWN_SECONDS * 1000 - timeDiff);

    if (timeDiff < COOLDOWN_SECONDS * 1000) {
      return {
        canProcess: false,
        lastStatus: trackingData.status,
        timeRemaining: Math.ceil(timeRemaining / 1000)
      };
    }

    return {
      canProcess: true,
      lastStatus: trackingData.status
    };
  } catch (error) {
    console.error('Error checking scan cooldown:', error);
    return { canProcess: true };
  }
}

async function recordScan(
  epc: string,
  status: 'in' | 'out'
): Promise<void> {
  try {
    if (!redisClient.isReady()) {
      console.log('⚠️  Redis not available - skipping scan recording');
      return;
    }

    const key = generateKey(epc);
    const trackingData: LocationTrackingData = {
      epc,
      po_number: '',
      item_number: '',
      location_code: '',
      status,
      timestamp: Date.now()
    };

    await redisClient.set(key, JSON.stringify(trackingData), 3600);
    console.log(`📝 Redis: Recorded scan - ${epc} with status ${status}`);
  } catch (error) {
    console.error('Error recording scan in Redis:', error);
  }
}

async function getLastStatus(
  epc: string
): Promise<'in' | 'out' | null> {
  try {
    if (!redisClient.isReady()) {
      console.log('⚠️  Redis not available - returning null for last status');
      return null;
    }

    const key = generateKey(epc);
    const data = await redisClient.get(key);

    if (!data) {
      return null;
    }

    const trackingData: LocationTrackingData = JSON.parse(data);
    return trackingData.status;
  } catch (error) {
    console.error('Error getting last status from Redis:', error);
    return null;
  }
}

async function clearTrackingData(
  epc: string
): Promise<void> {
  try {
    if (!redisClient.isReady()) {
      console.log('⚠️  Redis not available - skipping clear operation');
      return;
    }

    const key = generateKey(epc);
    await redisClient.del(key);
    console.log(`🗑️ Redis: Cleared tracking data for ${epc}`);
  } catch (error) {
    console.error('Error clearing tracking data from Redis:', error);
  }
}

async function getCooldownStatus(
  epc: string
): Promise<{ isInCooldown: boolean; timeRemaining: number; lastStatus?: 'in' | 'out' }> {
  try {
    if (!redisClient.isReady()) {
      console.log('⚠️  Redis not available - returning no cooldown status');
      return { isInCooldown: false, timeRemaining: 0 };
    }

    const key = generateKey(epc);
    const data = await redisClient.get(key);

    if (!data) {
      return { isInCooldown: false, timeRemaining: 0 };
    }

    const trackingData: LocationTrackingData = JSON.parse(data);
    const now = Date.now();
    const timeDiff = now - trackingData.timestamp;
    const timeRemaining = Math.max(0, COOLDOWN_SECONDS * 1000 - timeDiff);

    return {
      isInCooldown: timeDiff < COOLDOWN_SECONDS * 1000,
      timeRemaining: Math.ceil(timeRemaining / 1000),
      lastStatus: trackingData.status
    };
  } catch (error) {
    console.error('Error getting cooldown status from Redis:', error);
    return { isInCooldown: false, timeRemaining: 0 };
  }
}

async function getAllActiveTracking(): Promise<LocationTrackingData[]> {
  try {
    if (!redisClient.isReady()) {
      console.log('⚠️  Redis not available - returning empty tracking data');
      return [];
    }

    const pattern = `${KEY_PREFIX}*`;
    const keys = await redisClient.keys(pattern);
    const results: LocationTrackingData[] = [];

    for (const key of keys) {
      const data = await redisClient.get(key);
      if (data) {
        results.push(JSON.parse(data));
      }
    }

    return results;
  } catch (error) {
    console.error('Error getting all active tracking from Redis:', error);
    return [];
  }
}

export const locationTrackingRedis = {
  canProcessScan,
  recordScan,
  getLastStatus,
  clearTrackingData,
  getCooldownStatus,
  getAllActiveTracking,
};

export default locationTrackingRedis;
