import { Router } from 'express';
import { LocationTrackerController } from './location-trackers.controller';
import { LocationTrackerValidation } from './location-trackers.validation';
import validateRequest from '../../middlewares/validateRequest';


const router = Router();

router.post(
  '/',
  validateRequest(LocationTrackerValidation.createLocationTrackerZodSchema),
  LocationTrackerController.createLocationTracker
);

router.get(
  '/',
  validateRequest(LocationTrackerValidation.getLocationTrackersZodSchema),
  LocationTrackerController.getAllLocationTrackers
);

router.get('/stats', LocationTrackerController.getLocationTrackerStats);

router.get('/current-status', LocationTrackerController.getCurrentLocationStatus);

router.get('/location/:locationCode', LocationTrackerController.getLocationTrackerByLocation);

export const LocationTrackerRoutes = router;
