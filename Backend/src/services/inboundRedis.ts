import redisClient from '../utils/redisClient';

export interface DuplicateCheckData {
  epc: string;
  item_number: string;
  po_number: string;
  timestamp: number;
}

export interface InboundRedisData {
  epc: string;
  item_number: string;
  po_number: string;
  quantity: number;
  timestamp: number;
}

// Constants
const DUPLICATE_CHECK_TTL = 60; // 60 seconds (1 minute) - prevent same EPC+item+PO from being processed multiple times
const LOCATION_TRACKER_TTL = 60; // 60 seconds (1 minute) - prevent same EPC+PO+item+location from being processed multiple times
const PREFIX_EPC_ITEM = 'epc_item';
const PREFIX_INBOUND_SCAN = 'inbound_scan';
const PREFIX_LOCATION_TRACKER = 'location_tracker';

// Helper functions
const createKey = (prefix: string, epc: string, item_number: string): string => 
  `${prefix}:${epc}:${item_number}`;

const createLocationTrackerKey = (epc: string, po_number: string, item_number: string, user_id: string): string => 
  `${PREFIX_LOCATION_TRACKER}:${epc}:${po_number}:${item_number}:${user_id}`;

const createDuplicateCheckData = (epc: string, item_number: string, po_number: string): DuplicateCheckData => ({
  epc,
  item_number,
  po_number,
  timestamp: Date.now()
});

const parseJsonData = <T>(data: string | null): T | null => 
  data ? JSON.parse(data) : null;

const filterScansByPO = (scans: InboundRedisData[], po_number: string): InboundRedisData[] =>
  scans.filter(scan => scan.po_number === po_number);

// Core Redis operations
const checkDuplicate = async (epc: string, item_number: string, po_number: string): Promise<boolean> => {
  const key = `${PREFIX_EPC_ITEM}:${epc}:${item_number}:${po_number}`;
  const existingData = await redisClient.get(key);
  return existingData !== null;
};

const setDuplicateCheck = async (epc: string, item_number: string, po_number: string): Promise<void> => {
  const key = `${PREFIX_EPC_ITEM}:${epc}:${item_number}:${po_number}`;
  const data = createDuplicateCheckData(epc, item_number, po_number);
  await redisClient.set(key, JSON.stringify(data), DUPLICATE_CHECK_TTL);
};

const storeInboundScan = async (data: InboundRedisData, ttlSeconds?: number): Promise<void> => {
  const key = createKey(PREFIX_INBOUND_SCAN, data.epc, data.item_number);
  await redisClient.set(key, JSON.stringify(data), ttlSeconds);
};

const getInboundScan = async (epc: string, item_number: string): Promise<InboundRedisData | null> => {
  const key = createKey(PREFIX_INBOUND_SCAN, epc, item_number);
  const data = await redisClient.get(key);
  return parseJsonData<InboundRedisData>(data);
};

const removeInboundScan = async (epc: string, item_number: string): Promise<void> => {
  const key = createKey(PREFIX_INBOUND_SCAN, epc, item_number);
  await redisClient.del(key);
};

const getAllInboundScans = async (): Promise<InboundRedisData[]> => {
  const pattern = `${PREFIX_INBOUND_SCAN}:*`;
  const keys = await redisClient.keys(pattern);
  
  const scans = await Promise.all(
    keys.map(async (key) => {
      const data = await redisClient.get(key);
      return parseJsonData<InboundRedisData>(data);
    })
  );
  
  return scans.filter((scan): scan is InboundRedisData => scan !== null);
};

const getInboundScansByPO = async (po_number: string): Promise<InboundRedisData[]> => {
  const allScans = await getAllInboundScans();
  return filterScansByPO(allScans, po_number);
};

const clearInboundScansByPO = async (po_number: string): Promise<void> => {
  const scans = await getInboundScansByPO(po_number);
  
  await Promise.all(
    scans.map(scan => 
      removeInboundScan(scan.epc, scan.item_number)
    )
  );
};

const isReady = (): boolean => redisClient.isReady();

const getTTL = async (epc: string, item_number: string): Promise<number> => {
  const key = createKey(PREFIX_EPC_ITEM, epc, item_number);
  return await redisClient.ttl(key);
};

const checkConnection = async (): Promise<boolean> => {
  if (!isReady()) {
    console.log('⚠️ Redis not available for inbound operations');
    return false;
  }
  return true;
};

// Location Tracker Redis operations
const checkLocationTrackerDuplicate = async (epc: string, po_number: string, item_number: string, user_id: string): Promise<boolean> => {
  const key = createLocationTrackerKey(epc, po_number, item_number, user_id);
  const existingData = await redisClient.get(key);
  return existingData !== null;
};

const setLocationTrackerDuplicate = async (epc: string, po_number: string, item_number: string, user_id: string): Promise<void> => {
  const key = createLocationTrackerKey(epc, po_number, item_number, user_id);
  const data = {
    epc,
    po_number,
    item_number,
    user_id,
    timestamp: Date.now()
  };
  await redisClient.set(key, JSON.stringify(data), LOCATION_TRACKER_TTL);
};

const getLocationTrackerTTL = async (epc: string, po_number: string, item_number: string, user_id: string): Promise<number> => {
  const key = createLocationTrackerKey(epc, po_number, item_number, user_id);
  return await redisClient.ttl(key);
};

// New function to check if EPC+item combination already exists in inbound JSON
const checkInboundJsonDuplicate = async (epc: string, item_number: string, po_number: string): Promise<boolean> => {
  const key = `inbound_json:${po_number}:${epc}:${item_number}`;
  const existingData = await redisClient.get(key);
  return existingData !== null;
};

// New function to set EPC+item combination as processed in inbound JSON
const setInboundJsonDuplicate = async (epc: string, item_number: string, po_number: string): Promise<void> => {
  const key = `inbound_json:${po_number}:${epc}:${item_number}`;
  const data = {
    epc,
    item_number,
    po_number,
    timestamp: Date.now()
  };
  await redisClient.set(key, JSON.stringify(data), 3600); // 1 hour TTL
};

// Function to clear all inbound JSON duplicate flags (for testing)
const clearInboundJsonDuplicates = async (): Promise<void> => {
  const pattern = `inbound_json:*`;
  const keys = await redisClient.keys(pattern);
  if (keys.length > 0) {
    for (const key of keys) {
      await redisClient.del(key);
    }
  }
};

// Export functional API
const inboundRedis = {
  checkDuplicate,
  setDuplicateCheck,
  storeInboundScan,
  getInboundScan,
  removeInboundScan,
  getInboundScansByPO,
  clearInboundScansByPO,
  isReady,
  getTTL,
  checkConnection,
  getAllInboundScans,
  // Location Tracker functions
  checkLocationTrackerDuplicate,
  setLocationTrackerDuplicate,
  getLocationTrackerTTL,
  // Inbound JSON duplicate functions
  checkInboundJsonDuplicate,
  setInboundJsonDuplicate,
  clearInboundJsonDuplicates
};

export default inboundRedis;
