import { Router } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { ItemController } from './items.controller';
import { ItemValidation } from './items.validation';

const router = Router();

// Create item
router.post(
  '/',
  validateRequest(ItemValidation.createItemZodSchema),
  ItemController.createItem
);

// Get all items with filters and pagination
router.get(
  '/',
  validateRequest(ItemValidation.getAllItemsZodSchema),
  ItemController.getAllItems
);

// Get single item by ID
router.get(
  '/:id',
  validateRequest(ItemValidation.getSingleItemZodSchema),
  ItemController.getSingleItem
);

// Update item by ID
router.patch(
  '/:id',
  validateRequest(ItemValidation.updateItemZodSchema),
  ItemController.updateItem
);

// Delete item by ID
router.delete(
  '/:id',
  validateRequest(ItemValidation.deleteItemZodSchema),
  ItemController.deleteItem
);

export const ItemRoutes = router;
