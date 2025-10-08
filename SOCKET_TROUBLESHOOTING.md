# Socket.IO Troubleshooting Guide

## ⚠️ Live Dashboard কিছু show করছে না?

এই steps follow করুন:

---

## Step 1: Install socket.io-client

### Option A: npm install (Recommended)
```bash
cd Frontend
npm install socket.io-client@4.8.1
```

### Option B: Manual package.json check
Check করুন `Frontend/package.json` এ আছে কিনা:
```json
"socket.io-client": "^4.8.1"
```

যদি না থাকে, manually add করে `npm install` run করুন।

---

## Step 2: Backend Restart

Backend restart করুন এবং console check করুন:

```bash
cd Backend
npm start
```

দেখবেন:
```
✅ Database connected successfully
✅ Socket.IO initialized  ← This is important!
🚀 Server running on port 5000
```

---

## Step 3: Frontend Start

Frontend restart করুন:

```bash
cd Frontend
npm run dev
```

---

## Step 4: Open Live Dashboard

Browser এ যান:
```
http://localhost:3000/inbound/warehouse-gate
```

Browser console (F12) check করুন:
```
✅ Socket connected: [socket-id]
```

---

## Step 5: Test Socket Connection

### Backend Console এ দেখবেন:
```
✅ Socket connected: jIvel6EvK_n2hWIRAAAB
```

### Frontend Console (F12) এ দেখবেন:
```
✅ Socket connected: jIvel6EvK_n2hWIRAAAB
```

---

## Step 6: Send Test Scan

### Using the test file:
```bash
cd Backend
node test-socket-emit.js
```

### Or using curl:
```bash
curl -X POST http://localhost:5000/api/v1/inbound/scan \
  -H "Content-Type: application/json" \
  -d "{\"epc\": \"E4DAA89CD0370C17\"}"
```

---

## Step 7: Check Console Logs

### Backend Console দেখবেন:
```
📡 Processing RFID scan: { epc: 'E4DAA89CD0370C17', ... }
🔍 Searching for EPC: E4DAA89CD0370C17
✅ Hex code found: { ... }
✅ Item found: { ... }
✅ EPC marked as processed
✨ New inbound created (or updated)
✅ Socket event emitted for GP-2025-001 - Item: 500497359, Total Qty: 100
```

### Frontend Console (Browser F12) দেখবেন:
```
📡 New scan received: { po_number: 'GP-2025-001', item_number: '500497359', quantity: 100 }
```

---

## 🔍 Common Issues

### Issue 1: "Socket.IO not available"
**Problem**: Backend console এ `✅ Socket.IO initialized` দেখাচ্ছে না

**Solution**: 
1. Backend restart করুন
2. Check করুন socket.io package installed আছে কিনা:
   ```bash
   cd Backend
   npm list socket.io
   ```

### Issue 2: Frontend এ "Socket connected" দেখাচ্ছে না
**Problem**: socket.io-client installed নেই

**Solution**:
```bash
cd Frontend
npm install socket.io-client@4.8.1
```

### Issue 3: CORS Error
**Problem**: Browser console এ CORS error

**Solution**: Backend `server.ts` এ check করুন:
```typescript
cors: {
  origin: 'http://localhost:3000',  // Frontend URL
  methods: ['GET', 'POST'],
}
```

Frontend different port এ চলে? Change করুন accordingly.

### Issue 4: "Hex code not found"
**Problem**: EPC match হচ্ছে না

**Solution**: 
1. PO Hex Codes page এ যান
2. Hex code create করুন
3. সেই hex code use করুন test এ

---

## ✅ Verification Checklist

- [ ] Backend running (port 5000)
- [ ] Frontend running (port 3000)
- [ ] socket.io-client installed
- [ ] Backend console shows "Socket.IO initialized"
- [ ] Frontend console shows "Socket connected"
- [ ] Hex codes exist in po_hex_codes table
- [ ] Items exist in items table

---

## 🧪 Quick Test

### 1. Check Backend Socket
```bash
# Backend console should show:
✅ Socket.IO initialized
```

### 2. Open Dashboard
```
http://localhost:3000/inbound/warehouse-gate
```

### 3. Check Browser Console (F12)
```javascript
// Should see:
✅ Socket connected: [id]
```

### 4. Send Test Scan
```bash
curl -X POST http://localhost:5000/api/v1/inbound/scan \
  -H "Content-Type: application/json" \
  -d "{\"epc\": \"E4DAA89CD0370C17\"}"
```

### 5. Watch Both Consoles

**Backend:**
```
✅ Socket event emitted for GP-2025-001 - Item: 500497359, Total Qty: 100
```

**Frontend (Browser F12):**
```
📡 New scan received: { ... }
```

**Dashboard:**
```
Latest Scan card should update!
```

---

## 🎯 Still Not Working?

### Debug Steps:

1. **Check socket.io-client installation:**
   ```bash
   cd Frontend
   npm list socket.io-client
   ```
   Should show: `socket.io-client@4.8.1`

2. **Check Backend logs:**
   Look for "Socket connected" when you open dashboard

3. **Check Frontend console (F12):**
   - No errors?
   - Socket connected message?

4. **Manually test socket in Browser Console:**
   ```javascript
   // In browser console (F12)
   import { getSocket } from '@/lib/socket';
   const socket = getSocket();
   console.log('Socket:', socket.connected);
   ```

---

## 🔧 Manual Fix

যদি এখনো কাজ না করে:

### 1. Check package installed:
```bash
cd Frontend/node_modules
dir socket.io-client  # Windows
ls socket.io-client   # Mac/Linux
```

### 2. Reinstall:
```bash
cd Frontend
rm -rf node_modules package-lock.json  # Remove everything
npm install  # Fresh install
```

### 3. Hard refresh browser:
```
Ctrl + Shift + R  (Windows)
Cmd + Shift + R   (Mac)
```

---

## 📱 Alternative: Check Without Frontend

Backend socket working কিনা test করুন:

```bash
cd Backend
node test-socket-emit.js
```

এটা যদি work করে, তাহলে problem frontend এ।
এটা যদি fail করে, তাহলে problem backend এ (hex code না থাকতে পারে)।

---

আপনার current status কি? 
1. Backend console এ "Socket.IO initialized" দেখাচ্ছে?
2. Frontend console এ "Socket connected" দেখাচ্ছে?
3. socket.io-client install করেছেন?

আমাকে বলুন কোন step এ আটকে আছেন! 🔍

