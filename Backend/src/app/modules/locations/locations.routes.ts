import { Router } from 'express';
import { LocationController } from './locations.controller';
import { LocationValidation } from './locations.validation';
import validateRequest from '../../middlewares/validateRequest';


const router = Router();

router.post(
  '/',
  validateRequest(LocationValidation.createLocationZodSchema),
  LocationController.createLocation
);

router.get(
  '/',
  validateRequest(LocationValidation.getLocationsZodSchema),
  LocationController.getAllLocations
);

router.get('/stats', LocationController.getLocationStats);

router.get('/:id', LocationController.getSingleLocation);

router.patch(
  '/:id',
  validateRequest(LocationValidation.updateLocationZodSchema),
  LocationController.updateLocation
);

router.delete('/:id', LocationController.deleteLocation);

export const LocationRoutes = router;
