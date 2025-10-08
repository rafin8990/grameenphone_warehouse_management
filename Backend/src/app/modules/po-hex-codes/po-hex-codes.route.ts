import { Router } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { PoHexCodeController } from './po-hex-codes.controller';
import { PoHexCodeValidation } from './po-hex-codes.validation';

const router = Router();

// Create PO hex code
router.post(
  '/',
  validateRequest(PoHexCodeValidation.createPoHexCodeZodSchema),
  PoHexCodeController.createPoHexCode
);

// Get all PO hex codes with filters and pagination
router.get(
  '/',
  validateRequest(PoHexCodeValidation.getAllPoHexCodesZodSchema),
  PoHexCodeController.getAllPoHexCodes
);

// Get single PO hex code by ID
router.get(
  '/:id',
  validateRequest(PoHexCodeValidation.getSinglePoHexCodeZodSchema),
  PoHexCodeController.getSinglePoHexCode
);

// Update PO hex code by ID (hex_code cannot be updated)
router.patch(
  '/:id',
  validateRequest(PoHexCodeValidation.updatePoHexCodeZodSchema),
  PoHexCodeController.updatePoHexCode
);

// Delete PO hex code by ID
router.delete(
  '/:id',
  validateRequest(PoHexCodeValidation.deletePoHexCodeZodSchema),
  PoHexCodeController.deletePoHexCode
);

export const PoHexCodeRoutes = router;

