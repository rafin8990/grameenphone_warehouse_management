import { Router } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { StockBalanceController } from './stock-balance.controller';
import { StockBalanceValidation } from './stock-balance.validation';

const router = Router();

// Stock Balance routes
router.post(
  '/',
  validateRequest(StockBalanceValidation.createStockBalanceZodSchema),
  StockBalanceController.createStockBalance
);

router.get(
  '/',
  validateRequest(StockBalanceValidation.getStockBalanceZodSchema),
  StockBalanceController.getAllStockBalances
);

router.get(
  '/:id',
  validateRequest(StockBalanceValidation.getSingleStockBalanceZodSchema),
  StockBalanceController.getSingleStockBalance
);

router.patch(
  '/:id',
  validateRequest(StockBalanceValidation.updateStockBalanceZodSchema),
  StockBalanceController.updateStockBalance
);

router.delete(
  '/:id',
  validateRequest(StockBalanceValidation.deleteStockBalanceZodSchema),
  StockBalanceController.deleteStockBalance
);

// Additional routes
router.get(
  '/item/:itemId',
  StockBalanceController.getStockBalanceByItem
);

router.get(
  '/location/:locationId',
  StockBalanceController.getStockBalanceByLocation
);

router.patch(
  '/quantity/update',
  StockBalanceController.updateStockBalanceQuantity
);

export const StockBalanceRoutes = router;
