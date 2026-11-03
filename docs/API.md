# Proposed REST API contract

Base path: `/api/v1`. This is the proposed contract for the existing React app, not a claim that every route is implemented. All success responses use `{ "success": true, "message": "...", "data": ..., "meta": ... }`; errors use `{ "success": false, "message": "...", "errors": ..., "requestId": "..." }`. Paginated collection `meta` includes `nextCursor` and `hasMore`. Timestamps are ISO-8601 UTC. Protected requests send `Authorization: Bearer <Supabase access token>`.

## Initial foundation currently implemented

| Method/path | Auth | Purpose |
| --- | --- | --- |
| `GET /` | Public | API identity and health link. |
| `GET /api/v1/health` | Public | Liveness/status response. |

## Planned endpoint groups

| Feature | Methods and paths | Auth/notes |
| --- | --- | --- |
| Auth | `POST /auth/register`, `/auth/login`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password`; `GET /auth/me` | Supabase Auth; no custom password storage. Confirm redirect URLs. |
| Profiles/settings | `GET /users/:id`, `PATCH /users/me`, `GET/PATCH /users/me/settings`, `GET /users/:id/posts` | Profile visibility and owner checks. |
| Feed | `GET/POST /posts`, `GET/PATCH/DELETE /posts/:id`, `GET/POST /posts/:id/comments`, `PATCH/DELETE /comments/:id`, `POST/DELETE /posts/:id/reactions`, `GET /bookmarks`, `POST/DELETE /posts/:id/bookmark` | Public reads according to visibility; writes authenticated and ownership-checked. Feed accepts `cursor`, `limit`, `category`, `sort`. |
| Issues | `GET/POST /issues`, `GET/PATCH /issues/:id`, `POST /issues/:id/comments`, `/follow`, `/support`; `GET /issues/:id/history`, `GET /issues/mine/confidential` | Public collection must exclude confidential reports. Private retrieval authenticated; moderation status route restricted. |
| Business | `GET/POST /businesses`, `GET/PATCH/DELETE /businesses/:id`, `GET/POST /businesses/:id/products` | Public active listings; writes owner-only; verification is moderator/admin-only. |
| Articles | `GET/POST /articles`, `GET/PATCH/DELETE /articles/:id`, `POST /articles/:id/submit`, `/like`, `/comments` | Public only published; draft/submit/approve flow protected. |
| Opportunities | `GET/POST /opportunities`, `GET /opportunities/:id`, `POST /opportunities/:id/applications` | Creator controls listing; application visibility is private to applicant/owner. |
| Accommodation | `GET/POST /accommodation`, `GET/PATCH /accommodation/:id` | Public active listings; owner-only mutation. |
| Events | `GET/POST /events`, `GET /events/:id`, `POST/DELETE /events/:id/attend` | Organizer controls listing; attendance requires authenticated user. |
| Communities | `GET/POST /communities`, `GET /communities/:id`, `POST /communities/:id/join`, `DELETE /communities/:id/leave` | Visibility and membership policies gate posts/members. |
| Lost and found | `GET/POST /lost-found`, `GET/PATCH /lost-found/:id` | Public listing omits private contact unless authorized/owner chooses disclosure. |
| Messages/notices | `GET/POST /conversations`, `GET/POST /conversations/:id/messages`, `PATCH /messages/:id/read`, `GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/read-all` | Conversation membership and notification owner required; realtime subscribes only after policy review. |
| Search/reports/admin | `GET /search?q=...`, `POST /reports`, `GET /admin/dashboard`, plus role-protected moderation/user/report routes | Search filters by visibility. Admin routes require trusted server-side roles, audit trail and explicit allow-list updates. |
| Uploads | `POST /uploads/sign` and `POST /uploads/complete` | Authenticated; validates purpose, MIME, byte limit, object ownership. Returns signed URL/path; never accepts Base64 content. |

## Request examples

Create post request: `{ "body": "...", "category": "Campus Life", "type": "Discussion", "visibility": "public", "media": [{ "path": "post-media/<generated-key>", "type": "image" }] }`. Server derives author from token, not request body.

Create issue request: `{ "title": "...", "category": "Water Shortages", "description": "...", "location": "...", "observedAt": "2026-11-03T08:00:00Z", "visibility": "public" }`. Confidential intake uses a separate protected route/table and never shares the public response shape.

Create business request: `{ "name": "...", "categoryId": "<uuid>", "description": "...", "location": "...", "phone": "+254...", "whatsapp": null, "priceFrom": { "amount": 120, "currency": "KES" }, "hours": "...", "products": [] }`.

## Frontend integration

Add `VITE_API_URL=http://localhost:5000/api/v1` to the Vite app's local `.env` (never a Supabase secret). The typed API client should inject the current Supabase session access token, parse the shared response envelope, map validation fields to form feedback, and preserve cursor metadata. Replace each localStorage-backed feature only after its endpoint and RLS policy are implemented. Keep local state for transient form contents and harmless display preferences only.
