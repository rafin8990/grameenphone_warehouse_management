# 🚀 Quick Start - Grameenphone Warehouse Management

## ⚡ এক নজরে

এই session এ **4টা complete module** তৈরি হয়েছে:
1. ✅ **Items** - Simple inventory management
2. ✅ **Purchase Orders** - Auto-generate GP-YYYY-XXX format
3. ✅ **PO Hex Codes** - 16-digit hex code generator
4. ✅ **Inbound (Warehouse Gate)** - Live RFID scanning dashboard

---

## 📦 Installation (One Time)

```bash
# Frontend এ socket.io-client install করুন
cd Frontend
npm install socket.io-client@^4.8.1
```

---

## 🏃 Run Application

```bash
# Backend Start
cd Backend
npm start

# Frontend Start  
cd Frontend
npm run dev
```

---

## 🎯 Page Links

| Page | URL | Purpose |
|------|-----|---------|
| Items | `/items` | Create/manage items |
| Purchase Orders | `/purchase-orders` | Generate POs |
| PO Hex Codes | `/po-hex-codes` | Generate hex codes |
| **Warehouse Gate** | `/inbound/warehouse-gate` | **LIVE Dashboard** ⚡ |

---

## 🧪 Complete Test Flow

### 1️⃣ Create Item (1 minute)
```
Page: /items
Click: "Add Item"
Fill:
  ✓ Item Number: 500497359
  ✓ Item Description: Smart Card Type A
  ✓ UOM Code: PCS
  ✓ Status: Active
Click: "Create Item"
```

### 2️⃣ Generate Purchase Order (30 seconds)
```
Page: /purchase-orders
Click: "Generate PO" (green button)
Result: GP-2025-001 created with 3 items automatically!
```

### 3️⃣ Generate Hex Code (1 minute)
```
Page: /po-hex-codes
Fill Form:
  ✓ PO Number: GP-2025-001
  ✓ Lot No: LOT-001
  ✓ Item Number: 500497359
  ✓ Quantity: 1000
  ✓ UOM: PCS
Click: "Generate Hex Code"
Result: A1B2C3D4E5F60718 (auto-generated!)
```

### 4️⃣ Open Live Dashboard (10 seconds)
```
Page: /inbound/warehouse-gate
Status: ● Connected (green dot)
Waiting for scans...
```

### 5️⃣ Send RFID Scan (30 seconds)
```bash
# Use Postman or curl
POST http://localhost:5000/api/v1/inbound/scan

{
  "epc": "A1B2C3D4E5F60718",
  "rssi": "-45",
  "deviceId": "device_001"
}
```

### 6️⃣ Watch Live Magic! ⚡
```
Dashboard instantly shows:
✅ PO Number: GP-2025-001
✅ Item Number: 500497359  
✅ Quantity: 1,000
✅ Time: 15:30:45

All in REAL-TIME - No refresh needed!
```

---

## 🎨 Key Buttons

### Items Page
- `[+ Add Item]` - Create new item

### Purchase Orders Page
- `[+ Generate PO]` (Green) - Auto-create PO, no form! ⭐
- `[+ Create Purchase Order]` - Manual create

### PO Hex Codes Page
- `[+ Generate Hex Code]` - Create with auto hex

### Warehouse Gate
- Just watch! Real-time updates ⚡

---

## 💡 Pro Tips

1. **Quick PO Generate**: Click green "Generate PO" button - no form needed!
2. **Hex Code**: Auto-generates 16-digit - just fill other fields
3. **Live Dashboard**: Keep open while scanning - updates instantly
4. **Connection Status**: Green dot = working, Red = check backend
5. **Scan History**: Shows last 50 scans automatically

---

## 🔥 Special Features

### Auto-Generation
- ✅ PO Numbers: `GP-2025-001`, `GP-2025-002`...
- ✅ Hex Codes: `A1B2C3D4E5F60718` (16-digit)
- ✅ Sequential numbering
- ✅ Year-based reset

### Real-Time
- ⚡ WebSocket powered
- ⚡ Instant updates
- ⚡ Live connection status
- ⚡ No refresh needed

### Smart Logic
- 🧠 Duplicate EPC prevention
- 🧠 Quantity aggregation
- 🧠 Item grouping by PO
- 🧠 Auto-matching

---

## 🎯 Quick Commands

```bash
# Test RFID Scan
curl -X POST http://localhost:5000/api/v1/inbound/scan \
  -H "Content-Type: application/json" \
  -d '{"epc": "A1B2C3D4E5F60718"}'

# Check if socket is running
# Look for: ✅ Socket.IO initialized

# Test socket connection
# Open: http://localhost:3000/inbound/warehouse-gate
# See: ● Connected
```

---

## 📊 Data Flow

```
Items → Purchase Orders → PO Hex Codes → RFID Scan → Inbound → Live Dashboard
  ↓           ↓                ↓             ↓          ↓            ↓
 Save      GP-2025-001    16-digit hex   Match EPC   Process    Show LIVE!
```

---

## ✅ Checklist

Before testing, make sure:
- [x] Backend is running (port 5000)
- [x] Frontend is running (port 3000)
- [x] socket.io-client installed
- [x] Items exist in database
- [x] Hex codes generated
- [x] Live dashboard open

---

## 🆘 Troubleshooting

**Problem**: Dashboard shows "Disconnected"
**Solution**: Check backend is running and socket.io initialized

**Problem**: Scan not showing
**Solution**: Verify hex code exists in po_hex_codes table

**Problem**: "Item not found"
**Solution**: Create item first in /items page

**Problem**: "EPC not found"
**Solution**: Generate hex code first in /po-hex-codes page

---

## 🎉 You're All Set!

Everything is ready! Just:
1. Install `socket.io-client`
2. Start backend + frontend
3. Test the flow
4. Enjoy real-time RFID scanning! ⚡

---

## 📞 Support

Check these files for details:
- `INBOUND_SYSTEM_README.md` - Processing logic
- `INBOUND_LIVE_DASHBOARD_GUIDE.md` - Dashboard guide
- `COMPLETE_IMPLEMENTATION_SUMMARY.md` - Full summary

Happy scanning! 🎊

