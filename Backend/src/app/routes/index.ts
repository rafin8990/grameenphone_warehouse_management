import express from 'express';
import { DashboardRoutes } from '../modules/dashboard/dashboard.routes';
import { ItemRoutes } from '../modules/items/items.route';
import { PurchaseOrderRoutes } from '../modules/purchase-orders/purchase-orders.route';
import { PoHexCodeRoutes } from '../modules/po-hex-codes/po-hex-codes.route';
import { InboundRoutes } from '../modules/inbound/inbound.route';


const router = express.Router();

const moduleRoutes = [
  {
    path: '/dashboard',
    routes: DashboardRoutes,
  },
  {
    path: '/items',
    routes: ItemRoutes,
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
];

moduleRoutes.forEach(route => router.use(route.path, route.routes));
export default router;
