import { Router } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { ItemCategoryController } from './categories.controller';
import { CategoryValidation } from './categories.validation';

const router = Router();

router.post(
  '/',
  validateRequest(CategoryValidation.createCategoryZodSchema),
  ItemCategoryController.createItemCategory
);

router.get(
  '/',
  validateRequest(CategoryValidation.getAllCategoriesZodSchema),
  ItemCategoryController.getAllItemCategories
);

router.get(
  '/:id',
  validateRequest(CategoryValidation.getSingleCategoryZodSchema),
  ItemCategoryController.getSingleItemCategory
);

router.patch(
  '/:id',
  validateRequest(CategoryValidation.updateCategoryZodSchema),
  ItemCategoryController.updateItemCategory
);

router.delete(
  '/:id',
  validateRequest(CategoryValidation.deleteCategoryZodSchema),
  ItemCategoryController.deleteItemCategory
);

export const CategoryRoutes = router;
