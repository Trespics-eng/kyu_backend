import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { createSignedUpload } from '../../services/storage.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';

const router = Router();

router.post('/sign', authenticate, async (req, res, next) => {
  try {
    const { purpose, mimeType, sizeBytes } = req.body;
    if (!purpose || !mimeType || !sizeBytes) {
      return sendError(res, 'purpose, mimeType, and sizeBytes are required.', 400);
    }

    const result = await createSignedUpload({
      client: req.supabase || (await import('../../config/supabase.js')).getSupabaseAdmin(),
      userId: req.user.id,
      purpose,
      mimeType,
      sizeBytes: Number(sizeBytes),
    });

    return sendSuccess(res, result, 'Signed upload URL generated.');
  } catch (err) {
    return next(err);
  }
});

export default router;

