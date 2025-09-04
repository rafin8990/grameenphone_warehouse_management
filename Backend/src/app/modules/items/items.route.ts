import { Router } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { ItemController } from './items.controller';
import { ItemValidation } from './items.validation';

const router = Router();

router.post(
  '/',
  validateRequest(ItemValidation.createItemZodSchema),
  ItemController.createItem
);

router.get(
  '/',
  validateRequest(ItemValidation.getAllItemsZodSchema),
  ItemController.getAllItems
);

router.get(
  '/:id',
  validateRequest(ItemValidation.getSingleItemZodSchema),
  ItemController.getSingleItem
);

router.patch(
  '/:id',
  validateRequest(ItemValidation.updateItemZodSchema),
  ItemController.updateItem
);

router.delete(
  '/:id',
  validateRequest(ItemValidation.deleteItemZodSchema),
  ItemController.deleteItem
);

export const ItemRoutes = router;
