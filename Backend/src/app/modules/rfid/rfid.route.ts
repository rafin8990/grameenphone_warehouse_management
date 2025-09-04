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

export const RfidRoutes = router;
