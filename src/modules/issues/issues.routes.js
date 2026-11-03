import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { optionalAuth } from '../../middleware/optionalAuth.js';
import { validate } from '../../middleware/validate.js';
import * as issuesController from './issues.controller.js';
import { createIssueSchema, addIssueCommentSchema } from './issues.validation.js';

const router = Router();

router.get('/', optionalAuth, issuesController.getIssues);
router.post('/', authenticate, validate(createIssueSchema), issuesController.createIssue);
router.get('/mine/confidential', authenticate, issuesController.getMyConfidentialReports);
router.post('/:id/support', authenticate, issuesController.toggleSupport);
router.delete('/:id/support', authenticate, issuesController.toggleSupport);
router.post('/:id/follow', authenticate, issuesController.toggleFollow);
router.delete('/:id/follow', authenticate, issuesController.toggleFollow);
router.get('/:id/comments', optionalAuth, issuesController.getIssueComments);
router.post('/:id/comments', authenticate, validate(addIssueCommentSchema), issuesController.addIssueComment);
router.get('/:id/history', optionalAuth, issuesController.getIssueHistory);

export default router;

