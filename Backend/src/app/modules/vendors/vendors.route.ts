import { Router } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { VendorController } from './vendors.controller';
import { VendorValidation } from './vendors.validation';

const router = Router();

router.post(
  '/',
  validateRequest(VendorValidation.createVendorZodSchema),
  VendorController.createVendor
);

router.get(
  '/',
  validateRequest(VendorValidation.getAllVendorsZodSchema),
  VendorController.getAllVendors
);

router.get(
  '/:id',
  validateRequest(VendorValidation.getSingleVendorZodSchema),
  VendorController.getSingleVendor
);

router.patch(
  '/:id',
  validateRequest(VendorValidation.updateVendorZodSchema),
  VendorController.updateVendor
);

router.delete(
  '/:id',
  validateRequest(VendorValidation.deleteVendorZodSchema),
  VendorController.deleteVendor
);

export const VendorRoutes = router;
