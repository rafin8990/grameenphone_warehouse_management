import { Router } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { PurchaseOrderController } from './purchase-orders.controller';
import { PurchaseOrderValidation } from './purchase-orders.validation';

const router = Router();

// Quick generate purchase order (no form needed - uses fixed data)
router.post(
  '/quick-generate',
  PurchaseOrderController.quickGeneratePurchaseOrder
);

// Auto-create purchase order (can auto-generate PO number)
router.post(
  '/auto-generate',
  validateRequest(PurchaseOrderValidation.autoCreatePurchaseOrderZodSchema),
  PurchaseOrderController.autoCreatePurchaseOrder
);

// Create purchase order with items
router.post(
  '/',
  validateRequest(PurchaseOrderValidation.createPurchaseOrderZodSchema),
  PurchaseOrderController.createPurchaseOrder
);

// Get all purchase orders with filters and pagination
router.get(
  '/',
  validateRequest(PurchaseOrderValidation.getAllPurchaseOrdersZodSchema),
  PurchaseOrderController.getAllPurchaseOrders
);

// Get single purchase order by ID with items
router.get(
  '/:id',
  validateRequest(PurchaseOrderValidation.getSinglePurchaseOrderZodSchema),
  PurchaseOrderController.getSinglePurchaseOrder
);

// Update purchase order by ID
router.patch(
  '/:id',
  validateRequest(PurchaseOrderValidation.updatePurchaseOrderZodSchema),
  PurchaseOrderController.updatePurchaseOrder
);

// Delete purchase order by ID
router.delete(
  '/:id',
  validateRequest(PurchaseOrderValidation.deletePurchaseOrderZodSchema),
  PurchaseOrderController.deletePurchaseOrder
);

// Check and update PO status
router.post('/:po_number/check-status', PurchaseOrderController.checkPOStatus);

// Get PO status summary
router.get('/:po_number/status-summary', PurchaseOrderController.getPOStatusSummary);

export const PurchaseOrderRoutes = router;
