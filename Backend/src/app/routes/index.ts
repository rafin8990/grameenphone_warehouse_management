import express from 'express';
import { DashboardRoutes } from '../modules/dashboard/dashboard.routes';
import { ItemRoutes } from '../modules/items/items.route';
import { PurchaseOrderRoutes } from '../modules/purchase-orders/purchase-orders.route';
import { PoHexCodeRoutes } from '../modules/po-hex-codes/po-hex-codes.route';
import { InboundRoutes } from '../modules/inbound/inbound.route';
import { LocationRoutes } from '../modules/locations/locations.routes';
import { LocationTrackerRoutes } from '../modules/location-trackers/location-trackers.routes';
import { StockRoutes } from '../modules/stock/stock.routes';
import { AuthRoutes } from '../modules/auth/auth.routes';
import { UserRoutes } from '../modules/users/users.routes';


const router = express.Router();

const moduleRoutes = [
  {
    path: '/auth',
    routes: AuthRoutes,
  },
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
  {
    path: '/locations',
    routes: LocationRoutes,
  },
  {
    path: '/location-trackers',
    routes: LocationTrackerRoutes,
  },
  {
    path: '/stock',
    routes: StockRoutes,
  },
  {
    path: '/users',
    routes: UserRoutes,
  },
];

moduleRoutes.forEach(route => router.use(route.path, route.routes));
export default router;
