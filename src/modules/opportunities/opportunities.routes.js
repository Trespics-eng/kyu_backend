import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { optionalAuth } from '../../middleware/optionalAuth.js';
import { validate } from '../../middleware/validate.js';
import * as oppsController from './opportunities.controller.js';
import { createOpportunitySchema } from './opportunities.validation.js';

const router = Router();

router.get('/', optionalAuth, oppsController.getOpportunities);
router.post('/', authenticate, validate(createOpportunitySchema), oppsController.createOpportunity);

export default router;

