import { Router } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { RequisitionController } from './requisitions.controller';
import { RequisitionValidation } from './requisitions.validation';

const router = Router();

// Requisition routes
router.post(
  '/',
  validateRequest(RequisitionValidation.createRequisitionZodSchema),
  RequisitionController.createRequisition
);

router.get(
  '/',
  validateRequest(RequisitionValidation.getAllRequisitionsZodSchema),
  RequisitionController.getAllRequisitions
);

router.get(
  '/:id',
  validateRequest(RequisitionValidation.getSingleRequisitionZodSchema),
  RequisitionController.getSingleRequisition
);

router.patch(
  '/:id',
  validateRequest(RequisitionValidation.updateRequisitionZodSchema),
  RequisitionController.updateRequisition
);

router.delete(
  '/:id',
  validateRequest(RequisitionValidation.deleteRequisitionZodSchema),
  RequisitionController.deleteRequisition
);

// Requisition items routes
router.post(
  '/:requisitionId/items',
  validateRequest(RequisitionValidation.addRequisitionItemZodSchema),
  RequisitionController.addRequisitionItem
);

router.patch(
  '/items/:id',
  validateRequest(RequisitionValidation.updateRequisitionItemZodSchema),
  RequisitionController.updateRequisitionItem
);

router.delete(
  '/items/:id',
  validateRequest(RequisitionValidation.deleteRequisitionItemZodSchema),
  RequisitionController.deleteRequisitionItem
);

router.get(
  '/items/:id',
  validateRequest(RequisitionValidation.getSingleRequisitionItemZodSchema),
  RequisitionController.getSingleRequisitionItem
);

export const RequisitionRoutes = router;
