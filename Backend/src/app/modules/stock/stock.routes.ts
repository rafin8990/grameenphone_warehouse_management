import { Router } from 'express';
import { StockController } from './stock.controller';

const router = Router();

router.get('/', StockController.getAllStocks);

router.get('/stats', StockController.getStockStats);

router.get('/summary', StockController.getStockSummary);

router.get('/live', StockController.getLiveStockData);

router.get('/aggregated', StockController.getAggregatedStocks);

router.get('/:po_number/:item_number/:lot_no', StockController.getStockByPoItemLot);

export const StockRoutes = router;
