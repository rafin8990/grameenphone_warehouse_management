import { Router } from 'express';
import { DashboardController } from './dashboard.controller';

const router = Router();

router.get('/stats', DashboardController.getDashboardStats);
router.get('/data', DashboardController.getDashboardData);

export const DashboardRoutes = router;
