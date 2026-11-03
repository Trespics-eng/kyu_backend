import { randomUUID } from 'node:crypto';

const uploadRules = {
  avatar: { bucket: 'avatars', maxBytes: 5_000_000, types: { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } },
  post: { bucket: 'post-media', maxBytes: 20_000_000, types: { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/webm': 'webm' } },
  business: { bucket: 'business-media', maxBytes: 10_000_000, types: { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } },
  article: { bucket: 'article-covers', maxBytes: 10_000_000, types: { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } },
  issue: { bucket: 'issue-media', maxBytes: 10_000_000, types: { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' } },
  accommodation: { bucket: 'accommodation-media', maxBytes: 10_000_000, types: { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } },
  document: { bucket: 'documents', maxBytes: 10_000_000, types: { 'application/pdf': 'pdf' } },
};

export async function createSignedUpload({ client, userId, purpose, mimeType, sizeBytes }) {
  const rule = uploadRules[purpose];
  if (!rule) throw Object.assign(new Error('Unsupported upload purpose.'), { status: 400, code: 'INVALID_UPLOAD_PURPOSE' });
  const extension = rule.types[mimeType];
  if (!extension) throw Object.assign(new Error('File type is not allowed for this upload.'), { status: 415, code: 'UNSUPPORTED_MEDIA_TYPE' });
  if (!Number.isInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > rule.maxBytes) {
    throw Object.assign(new Error(`File exceeds the ${rule.maxBytes} byte limit.`), { status: 413, code: 'UPLOAD_TOO_LARGE' });
  }

  const path = `${userId}/${randomUUID()}.${extension}`;
  const { data, error } = await client.storage.from(rule.bucket).createSignedUploadUrl(path, { upsert: false });
  if (error) throw Object.assign(new Error('Could not create an upload URL.'), { status: 502, code: 'STORAGE_SIGNING_FAILED' });
  return { bucket: rule.bucket, path, signedUrl: data.signedUrl, token: data.token, maxBytes: rule.maxBytes };
}
