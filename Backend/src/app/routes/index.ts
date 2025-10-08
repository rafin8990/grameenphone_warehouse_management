import express from 'express';
import { CategoryRoutes } from '../modules/categories/categories.route';
import { DashboardRoutes } from '../modules/dashboard/dashboard.routes';
import { ItemRoutes } from '../modules/items/items.route';
import { LocationRoutes } from '../modules/locations/locations.route';
import { PurchaseOrderRoutes } from '../modules/purchase-orders/purchase-orders.route';
import { PoHexCodeRoutes } from '../modules/po-hex-codes/po-hex-codes.route';
import { InboundRoutes } from '../modules/inbound/inbound.route';
import { RequisitionRoutes } from '../modules/requisitions/requisitions.route';
import { RfidRoutes } from '../modules/rfid/rfid.route';
import { StockBalanceRoutes } from '../modules/stock-balance/stock-balance.route';
import { VendorRoutes } from '../modules/vendors/vendors.route';

const router = express.Router();

const moduleRoutes = [
  {
    path: '/dashboard',
    routes: DashboardRoutes,
  },
  {
    path: '/categories',
    routes: CategoryRoutes,
  },
  {
    path: '/locations',
    routes: LocationRoutes,
  },
  {
    path: '/items',
    routes: ItemRoutes,
  },
  {
    path: '/vendors',
    routes: VendorRoutes,
  },
  {
    path: '/requisitions',
    routes: RequisitionRoutes,
  },
  {
    path: '/rfid',
    routes: RfidRoutes,
  },
  {
    path: '/purchase-orders',
    routes: PurchaseOrderRoutes,
  },
  {
    path: '/po-hex-codes',
    routes: PoHexCodeRoutes,
  },
  {
    path: '/inbound',
    routes: InboundRoutes,
  },
  {
    path: '/stock-balances',
    routes: StockBalanceRoutes,
  },
];

moduleRoutes.forEach(route => router.use(route.path, route.routes));
export default router;
