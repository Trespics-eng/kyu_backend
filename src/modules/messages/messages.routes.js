import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import * as messagesController from './messages.controller.js';
import { startConversationSchema, sendMessageSchema } from './messages.validation.js';

const router = Router();

router.get('/conversations', authenticate, messagesController.getConversations);
router.post('/conversations', authenticate, validate(startConversationSchema), messagesController.startConversation);
router.get('/:convId', authenticate, messagesController.getMessages);
router.post('/:convId', authenticate, validate(sendMessageSchema), messagesController.sendMessage);

export default router;

