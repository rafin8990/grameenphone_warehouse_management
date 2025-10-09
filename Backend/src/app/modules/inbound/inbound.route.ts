import { Router } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { InboundController } from './inbound.controller';
import { InboundValidation } from './inbound.validation';

const router = Router();

// Process RFID scan (from gun)
router.post(
  '/scan',
  validateRequest(InboundValidation.processRfidScanZodSchema),
  InboundController.processRfidScan
);

// Get all inbounds with filters and pagination
router.get(
  '/',
  validateRequest(InboundValidation.getAllInboundsZodSchema),
  InboundController.getAllInbounds
);

// Unified live data endpoint (define BEFORE dynamic :id route)
router.get('/live', InboundController.getUnifiedLiveData);

// Get single inbound by ID
router.get(
  '/:id',
  validateRequest(InboundValidation.getSingleInboundZodSchema),
  InboundController.getSingleInbound
);

// Update inbound by ID
router.patch(
  '/:id',
  validateRequest(InboundValidation.updateInboundZodSchema),
  InboundController.updateInbound
);

// Delete inbound by ID
router.delete(
  '/:id',
  validateRequest(InboundValidation.deleteInboundZodSchema),
  InboundController.deleteInbound
);

export const InboundRoutes = router;

