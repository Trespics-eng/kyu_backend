import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { optionalAuth } from '../../middleware/optionalAuth.js';
import { validate } from '../../middleware/validate.js';
import * as eventsController from './events.controller.js';
import { createEventSchema } from './events.validation.js';

const router = Router();

router.get('/', optionalAuth, eventsController.getEvents);
router.post('/', authenticate, validate(createEventSchema), eventsController.createEvent);
router.post('/:id/attend', authenticate, eventsController.toggleAttendEvent);
router.delete('/:id/attend', authenticate, eventsController.toggleAttendEvent);
router.post('/:id/save', authenticate, eventsController.toggleSaveEvent);
router.delete('/:id/save', authenticate, eventsController.toggleSaveEvent);

export default router;

