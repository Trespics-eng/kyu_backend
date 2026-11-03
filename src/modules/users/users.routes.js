import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { optionalAuth } from '../../middleware/optionalAuth.js';
import { validate } from '../../middleware/validate.js';
import * as usersController from './users.controller.js';
import { updateProfileSchema, updateSettingsSchema } from './users.validation.js';

const router = Router();

router.get('/me/settings', authenticate, usersController.getSettings);
router.patch('/me/settings', authenticate, validate(updateSettingsSchema), usersController.updateSettings);
router.patch('/me', authenticate, validate(updateProfileSchema), usersController.updateMe);
router.get('/:id', optionalAuth, usersController.getProfile);
router.post('/:id/follow', authenticate, usersController.followUser);
router.delete('/:id/follow', authenticate, usersController.unfollowUser);

export default router;

