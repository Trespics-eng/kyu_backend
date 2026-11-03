import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { optionalAuth } from '../../middleware/optionalAuth.js';
import { validate } from '../../middleware/validate.js';
import * as marketplaceController from './marketplace.controller.js';
import { createBusinessSchema } from './marketplace.validation.js';

const router = Router();

router.get('/', optionalAuth, marketplaceController.getBusinesses);
router.post('/', authenticate, validate(createBusinessSchema), marketplaceController.createBusiness);
router.get('/:id', optionalAuth, marketplaceController.getBusinessById);
router.post('/:id/save', authenticate, marketplaceController.toggleSaveBusiness);
router.delete('/:id/save', authenticate, marketplaceController.toggleSaveBusiness);

export default router;

