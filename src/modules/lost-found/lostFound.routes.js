import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { optionalAuth } from '../../middleware/optionalAuth.js';
import { validate } from '../../middleware/validate.js';
import * as lostFoundController from './lostFound.controller.js';
import { createLostFoundSchema } from './lostFound.validation.js';

const router = Router();

router.get('/', optionalAuth, lostFoundController.getLostFoundItems);
router.post('/', authenticate, validate(createLostFoundSchema), lostFoundController.createLostFoundItem);

export default router;

