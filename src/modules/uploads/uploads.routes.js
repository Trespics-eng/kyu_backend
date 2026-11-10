import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { createSignedUpload } from '../../services/storage.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import multer from 'multer';

const postMediaUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20_000_000 } }).single('file');

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

router.post('/media', authenticate, (req, res, next) => postMediaUpload(req, res, (error) => error ? next(error) : next()), async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, 'Choose an image or video file to upload.', 400);
    const client = (await import('../../config/supabase.js')).getSupabaseAdmin();
    const { bucket, path, token } = await createSignedUpload({
      client,
      userId: req.user.id,
      purpose: 'post',
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
    });
    const { error } = await client.storage.from(bucket).uploadToSignedUrl(path, token, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false,
    });
    if (error) return next(error);
    const { data } = client.storage.from(bucket).getPublicUrl(path);
    return sendSuccess(res, { media_url: data.publicUrl, media_type: req.file.mimetype.startsWith('video/') ? 'video' : 'image' }, 'Media uploaded.');
  } catch (err) { return next(err); }
});

export default router;

