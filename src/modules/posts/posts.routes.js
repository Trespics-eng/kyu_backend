import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { optionalAuth } from '../../middleware/optionalAuth.js';
import { validate } from '../../middleware/validate.js';
import * as postsController from './posts.controller.js';
import { createPostSchema, addCommentSchema } from './posts.validation.js';

const router = Router();

router.get('/', optionalAuth, postsController.getPosts);
router.post('/', authenticate, validate(createPostSchema), postsController.createPost);
router.get('/trending', postsController.getTrendingTags);
router.get('/:id', optionalAuth, postsController.getPostById);
router.post('/:id/reactions', authenticate, postsController.toggleReaction);
router.delete('/:id/reactions', authenticate, postsController.toggleReaction);
router.post('/:id/bookmarks', authenticate, postsController.toggleBookmark);
router.delete('/:id/bookmarks', authenticate, postsController.toggleBookmark);
router.get('/:id/comments', optionalAuth, postsController.getComments);
router.post('/:id/comments', authenticate, validate(addCommentSchema), postsController.addComment);

export default router;

