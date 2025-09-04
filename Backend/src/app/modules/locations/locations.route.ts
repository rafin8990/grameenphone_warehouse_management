import { Router } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { LocationController } from './locations.controller';
import { LocationValidation } from './locations.validation';

const router = Router();

router.post(
  '/',
  validateRequest(LocationValidation.createLocationZodSchema),
  LocationController.createLocation
);

router.get(
  '/',
  validateRequest(LocationValidation.getAllLocationsZodSchema),
  LocationController.getAllLocations
);

router.get(
  '/:id',
  validateRequest(LocationValidation.getSingleLocationZodSchema),
  LocationController.getSingleLocation
);

router.patch(
  '/:id',
  validateRequest(LocationValidation.updateLocationZodSchema),
  LocationController.updateLocation
);

router.delete(
  '/:id',
  validateRequest(LocationValidation.deleteLocationZodSchema),
  LocationController.deleteLocation
);

export const LocationRoutes = router;
