/**
 * Standard API envelope format for KyU Connect:
 * Success: { success: true, message: string, data: any, meta: object | null }
 * Error: { success: false, message: string, errors: any, requestId?: string }
 */

export function sendSuccess(res, data = null, message = 'Success', meta = null, status = 200) {
  return res.status(status).json({
    success: true,
    message,
    data,
    meta,
  });
}

export function sendError(res, message = 'Request could not be completed', status = 400, errors = null) {
  return res.status(status).json({
    success: false,
    message,
    errors,
    ...(res.req?.id ? { requestId: res.req.id } : {}),
  });
}

