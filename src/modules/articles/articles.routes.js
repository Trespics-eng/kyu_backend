import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { optionalAuth } from '../../middleware/optionalAuth.js';
import { validate } from '../../middleware/validate.js';
import * as articlesController from './articles.controller.js';
import { createArticleSchema, addArticleCommentSchema } from './articles.validation.js';

const router = Router();

router.get('/', optionalAuth, articlesController.getArticles);
router.post('/', authenticate, validate(createArticleSchema), articlesController.createArticle);
router.get('/drafts', authenticate, articlesController.getDrafts);
router.delete('/drafts/:id', authenticate, articlesController.deleteDraft);
router.get('/:id', optionalAuth, articlesController.getArticleById);
router.post('/:id/like', authenticate, articlesController.toggleArticleLike);
router.delete('/:id/like', authenticate, articlesController.toggleArticleLike);
router.post('/:id/comments', authenticate, validate(addArticleCommentSchema), articlesController.addArticleComment);

export default router;

