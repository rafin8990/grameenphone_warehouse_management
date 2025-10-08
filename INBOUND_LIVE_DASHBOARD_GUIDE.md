# Inbound Live Dashboard - Complete Guide

## ✅ সব কিছু তৈরি হয়েছে!

### Backend
1. ✅ Socket.IO server setup (`server.ts`)
2. ✅ Inbound module with socket emit
3. ✅ API endpoint: `POST /api/v1/inbound/scan`
4. ✅ Complex processing logic
5. ✅ Auto-generated hex code matching

### Frontend
1. ✅ Socket.IO client setup (`lib/socket.ts`)
2. ✅ Live dashboard page (`app/inbound/warehouse-gate/page.tsx`)
3. ✅ Sidebar navigation added
4. ✅ Real-time updates configured

## 🚀 Installation Steps

### Step 1: Install Socket.IO Client (Frontend)
```bash
cd Frontend
npm install socket.io-client@^4.8.1
```

অথবা Windows এ double-click করুন:
```
Frontend/install-socket.bat
```

### Step 2: Start Backend
```bash
cd Backend
npm start
```

### Step 3: Start Frontend
```bash
cd Frontend
npm run dev
```

### Step 4: Open Live Dashboard
```
http://localhost:3000/inbound/warehouse-gate
```

## 📊 Sidebar Navigation (Updated)

```
┌─────────────────────────────┐
│  🏠 Dashboard               │
│  📦 Items                   │
│  🛒 Purchase Orders         │
│  #  PO Hex Codes            │
│  🏭 Inbound        ← NEW!   │
│  🏷️  Categories              │
│  📍 Locations               │
│  📡 RFID                    │
│  🏢 Vendors                 │
│  📋 Requisitions            │
└─────────────────────────────┘
```

## 🎯 Live Dashboard UI

```
┌────────────────────────────────────────────────────────┐
│ Warehouse Gate - Live Dashboard                        │
├────────────────────────────────────────────────────────┤
│ RFID Scanner Status            [●] Connected           │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ 📡 Latest Scan                                         │
├────────────────────────────────────────────────────────┤
│ PO Number:    GP-2025-001                              │
│ Item Number:  500497359                                │
│ Quantity:     1,000                                    │
│ Time:         15:30:45                                 │
│                                                         │
│ Item Description: Smart Card Type A                    │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ 🕐 Scan History (50)                                   │
│ Real-time feed of incoming RFID scans                  │
├────────────────────────────────────────────────────────┤
│ PO: GP-2025-001 │ Item: 500497359 │ Qty: 1,000 │ 15:30│
│ PO: GP-2025-001 │ Item: 500180440 │ Qty: 5,000 │ 15:29│
│ PO: GP-2025-001 │ Item: 3002379   │ Qty: 2,500 │ 15:28│
└────────────────────────────────────────────────────────┘
```

## 🔄 Complete Flow

```
RFID Gun                Backend                Frontend Dashboard
────────                ───────                ─────────────────

Scan EPC
A1B2C3D4... ──────→ POST /scan
                    │
                    ├→ Match hex_code
                    ├→ Get item details
                    ├→ Update inbound
                    ├→ Save to DB
                    │
                    ├→ Socket emit ─────────→ Dashboard receives
                    │  'inbound:new-scan'      │
                    │                          ├→ Update latest scan
                    │                          ├→ Add to history
                    │                          └→ Show LIVE! ⚡
                    │
                    └→ Response ←─────────────
```

## 📡 Socket Events

### Event: `inbound:new-scan`
```typescript
{
  po_number: "GP-2025-001",
  item_number: "500497359",
  item_description: "Smart Card Type A",
  quantity: 1000,
  lot_no: "LOT-001",
  timestamp: "2025-10-08T15:30:45.123Z",
  epc: "A1B2C3D4E5F60718"
}
```

## 🧪 Test করুন

### Test 1: Send RFID Scan
```bash
# Using curl
curl -X POST http://localhost:5000/api/v1/inbound/scan \
  -H "Content-Type: application/json" \
  -d '{
    "epc": "A1B2C3D4E5F60718",
    "rssi": "-45",
    "deviceId": "device_001"
  }'
```

### Test 2: Watch Dashboard
1. Open: `http://localhost:3000/inbound/warehouse-gate`
2. দেখবেন connection status: ● Connected (green)
3. RFID scan পাঠান (উপরের curl command)
4. Dashboard এ **তৎক্ষণাৎ** দেখাবে! ⚡

## 🎨 Dashboard Features

### Real-time Features
✅ **Live Connection Status**
- Green dot = Connected
- Red dot = Disconnected
- Auto-reconnect

✅ **Latest Scan Card** (Highlighted)
- Shows most recent scan
- Large, bold display
- Animated pulse effect
- Full item details

✅ **Scan History** (Last 50)
- Real-time feed
- Newest at top
- Auto-scroll
- Compact display

### Visual Indicators
✅ **New Scan Animation**
- Green background
- Pulse animation
- Border highlight

✅ **Connection Status**
- Animated pulse when connected
- Color-coded badges

## 📋 Prerequisites

Before testing, ensure:

1. ✅ **Items exist in database**
   ```sql
   INSERT INTO items (item_number, uom_code, item_description) 
   VALUES ('500497359', 'PCS', 'Smart Card Type A');
   ```

2. ✅ **PO Hex Codes exist**
   - Use PO Hex Codes page to generate
   - Or insert directly:
   ```sql
   INSERT INTO po_hex_codes (po_number, lot_no, item_number, quantity, uom, hex_code)
   VALUES ('GP-2025-001', 'LOT-001', '500497359', 1000, 'PCS', 'A1B2C3D4E5F60718');
   ```

3. ✅ **Purchase Order exists** (optional but recommended)

## 🔧 Technical Details

### Backend Socket Setup
```typescript
// server.ts
io = new SocketIOServer(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// inbound.service.ts
io.emit('inbound:new-scan', {
  po_number,
  item_number,
  quantity,
  // ... data
});
```

### Frontend Socket Setup
```typescript
// lib/socket.ts
const socket = io('http://localhost:5000');

// warehouse-gate/page.tsx
socket.on('inbound:new-scan', (data) => {
  setLastScan(data);
  setScans(prev => [data, ...prev]);
});
```

## 🎯 How It Works

### When RFID Gun Sends Data:

**Input:**
```json
{
  "epc": "A1B2C3D4E5F60718"
}
```

**Backend Processing:**
1. Receive EPC
2. Match with po_hex_codes table
3. Get item details from items table
4. Update/create inbound record
5. **Emit socket event** ⚡
6. Return response

**Frontend Live Update:**
1. **Instantly** receives socket event
2. Updates "Latest Scan" card
3. Adds to history list
4. Shows animation
5. No page refresh needed!

## 🎨 Live Dashboard Components

### 1. Connection Status Card
```typescript
<Card>
  <div className={isConnected ? 'bg-green-500' : 'bg-red-500'}>
    {isConnected ? 'Connected' : 'Disconnected'}
  </div>
</Card>
```

### 2. Latest Scan Card (Large Display)
```typescript
<Card className="border-green-500 bg-green-50">
  <div>PO: {lastScan.po_number}</div>
  <div>Item: {lastScan.item_number}</div>
  <div>Qty: {lastScan.quantity}</div>
</Card>
```

### 3. History Feed (Scrollable)
```typescript
<div className="max-h-[600px] overflow-y-auto">
  {scans.map(scan => (
    <div>{scan.po_number} - {scan.quantity}</div>
  ))}
</div>
```

## 📱 Responsive Design

- ✅ Mobile friendly
- ✅ Tablet optimized
- ✅ Desktop full-width
- ✅ Auto-scroll history

## 🎯 Key Features

1. ✅ **Real-time updates** - No refresh needed
2. ✅ **Live connection status** - Visual indicator
3. ✅ **Latest scan highlight** - Big, bold display
4. ✅ **Scan history** - Last 50 scans
5. ✅ **Auto-reconnect** - Maintains connection
6. ✅ **Animations** - Smooth transitions
7. ✅ **Error handling** - Graceful degradation

## 🚀 Quick Start

```bash
# Terminal 1: Start Backend
cd Backend
npm start

# Terminal 2: Install socket.io-client (one time)
cd Frontend  
npm install socket.io-client@^4.8.1

# Terminal 3: Start Frontend
cd Frontend
npm run dev

# Browser: Open Dashboard
http://localhost:3000/inbound/warehouse-gate

# Terminal 4: Test Scan
curl -X POST http://localhost:5000/api/v1/inbound/scan \
  -H "Content-Type: application/json" \
  -d '{"epc": "A1B2C3D4E5F60718"}'

# Watch magic happen! ✨
```

## 🎉 Features Summary

- ⚡ **Real-time** - Instant updates via WebSocket
- 🎯 **Live** - No page refresh required
- 📊 **Visual** - Connection status, animations
- 📜 **History** - Track last 50 scans
- 🔄 **Auto-reconnect** - Maintains connection
- 📱 **Responsive** - Works on all devices

Everything is ready! Just install socket.io-client and start using! 🚀

