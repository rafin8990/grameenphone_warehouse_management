import { Router } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { RfidController } from './rfid.controller';
import { RfidValidation } from './rfid.validation';

const router = Router();

router.post(
  '/',
  validateRequest(RfidValidation.createRfidTagZodSchema),
  RfidController.createRfidTag
);

router.post(
  '/check',
  RfidController.checkRfidTags
);

router.post(
  '/bulk',
  validateRequest(RfidValidation.createBulkRfidTagsZodSchema),
  RfidController.createBulkRfidTags
);

router.get(
  '/check-duplicate/:epc',
  validateRequest(RfidValidation.checkDuplicateEpcZodSchema),
  RfidController.checkDuplicateEpc
);

router.get(
  '/',
  validateRequest(RfidValidation.getAllRfidTagsZodSchema),
  RfidController.getAllRfidTags
);

router.get(
  '/:id',
  validateRequest(RfidValidation.getSingleRfidTagZodSchema),
  RfidController.getSingleRfidTag
);

router.patch(
  '/:id',
  validateRequest(RfidValidation.updateRfidTagZodSchema),
  RfidController.updateRfidTag
);

router.delete(
  '/:id',
  validateRequest(RfidValidation.deleteRfidTagZodSchema),
  RfidController.deleteRfidTag
);

router.post(
  '/:id/assign',
  RfidController.assignRfidTag
);

router.post(
  '/:id/unassign',
  RfidController.unassignRfidTag
);

// UHF-specific routes to match Java API endpoints
router.post(
  '/uhf/tags',
  validateRequest(RfidValidation.sendUHFTagZodSchema),
  RfidController.sendUHFTag
);

router.post(
  '/uhf/tags/batch',
  validateRequest(RfidValidation.sendUHFTagsBatchZodSchema),
  RfidController.sendUHFTagsBatch
);

router.get(
  '/uhf/tags',
  validateRequest(RfidValidation.getUHFTagsZodSchema),
  RfidController.getUHFTags
);

router.delete(
  '/uhf/tags/:epc',
  validateRequest(RfidValidation.deleteUHFTagZodSchema),
  RfidController.deleteUHFTag
);

export const RfidRoutes = router;
