import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { optionalAuth } from '../../middleware/optionalAuth.js';
import { validate } from '../../middleware/validate.js';
import * as accController from './accommodation.controller.js';
import { createAccommodationSchema } from './accommodation.validation.js';

const router = Router();

router.get('/', optionalAuth, accController.getAccommodations);
router.post('/', authenticate, validate(createAccommodationSchema), accController.createAccommodation);

export default router;

