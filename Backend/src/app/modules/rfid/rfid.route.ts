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

export const RfidRoutes = router;
