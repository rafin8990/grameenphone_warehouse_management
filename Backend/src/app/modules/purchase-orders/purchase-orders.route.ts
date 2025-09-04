import { Router } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { PurchaseOrderController } from './purchase-orders.controller';
import { PurchaseOrderValidation } from './purchase-orders.validation';

const router = Router();

router.post(
  '/',
  validateRequest(PurchaseOrderValidation.createPurchaseOrderZodSchema),
  PurchaseOrderController.createPurchaseOrder
);

router.get(
  '/',
  validateRequest(PurchaseOrderValidation.getAllPurchaseOrdersZodSchema),
  PurchaseOrderController.getAllPurchaseOrders
);

router.get(
  '/:id',
  validateRequest(PurchaseOrderValidation.getSinglePurchaseOrderZodSchema),
  PurchaseOrderController.getSinglePurchaseOrder
);



router.patch(
  '/:id',
  validateRequest(PurchaseOrderValidation.updatePurchaseOrderZodSchema),
  PurchaseOrderController.updatePurchaseOrder
);

router.delete(
  '/:id',
  validateRequest(PurchaseOrderValidation.deletePurchaseOrderZodSchema),
  PurchaseOrderController.deletePurchaseOrder
);

export const PurchaseOrderRoutes = router;
