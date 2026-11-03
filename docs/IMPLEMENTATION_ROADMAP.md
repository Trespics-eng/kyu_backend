# Implementation roadmap

## Phase 1 — Foundation (implemented)

Converted backend to ES modules; configured runtime settings, CORS, security headers, body limits, compression, request IDs, Pino logs, rate limits, errors and liveness. Added Supabase clients, verified bearer auth middleware, optional Brevo/email and signed-upload helpers. Added health/not-found tests, a typed frontend API client and Vite API URL template. Health tests and lint pass; frontend production build passes. Concrete domain flows remain behind the database review boundary.

## Phase 2 — Data model and access policy (proposal awaiting review)

Review `DATABASE.md` and answer its five open decisions, especially confidential report access. After approval, implement SQL migrations, constraints/indexes, RLS and storage policies, local-only synthetic seeds and isolated RLS tests. No complete domain migration should be created before this review.

## Phase 3 — Auth and profiles

Connect the frontend to the Supabase browser auth client, session refresh, email confirmation and recovery redirects. Build profile bootstrap/update, settings, access-token verification, role checks and account-status checks. Remove simulated authentication without losing route/layout behavior.

## Phase 4 — Feed and media

Implement profile visibility, posts, media metadata, comments, reactions, bookmarks and cursor pagination. Issue signed storage URLs; replace browser data URLs. Migrate Home/Explore and composer.

## Phase 5 — Issues

Implement public/private issue paths, uploads, status history, support, follow and comments. Prove confidential content is invisible in public query/search/realtime and only visible to reporter/authorized staff. Integrate `IssuesPage`.

## Phase 6 — Marketplace and publishing

Implement businesses/products/verification and article drafts/review/publishing/comments/likes. Integrate marketplace and blog pages.

## Phase 7 — Remaining discovery domains

Implement opportunities/applications, accommodation, events/attendance, academic communities/membership and lost-found. Replace `FeaturePage` fixture mutations domain by domain.

## Phase 8 — Messaging, notifications and moderation

Persist conversations/messages/read state and notifications; add Realtime only under membership RLS. Build reports, moderation queues/actions and append-only audit events with trusted-role authorization.

## Phase 9 — Hardening and deployment

Complete endpoint/RLS tests, API OpenAPI docs, production env/secrets, migrations and backups, logs/monitoring, CORS deployment origins, storage lifecycle, rate-limit tuning, accessibility/error/loading UI and staging deployment. Avoid calling a feature complete until its data path, authorization and tests are complete.

## Current limitations

The frontend still uses mock fixtures and localStorage for product data and simulated login. The API currently provides only health/liveness plus shared middleware and client configuration. No SQL schema, auth routes, feature endpoints or live frontend data wiring are claimed complete. Waiting for database proposal review is the deliberate approval boundary described in the provided master prompt.
