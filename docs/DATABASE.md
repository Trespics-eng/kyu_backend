# Proposed database schema — review required

This is the schema outline for approval before full SQL migrations are written. It follows the UI data types and features in [FRONTEND_ANALYSIS.md](./FRONTEND_ANALYSIS.md), and deliberately models ownership and visibility as database concepts. Supabase Auth owns credentials and identities. Every primary key is UUID unless a provider-specific object key is needed; durable rows have `created_at`/`updated_at` timestamps in UTC. This document is a proposal, not an applied schema.

## Proposed entities and relationships

| Domain | Tables and key relationships |
| --- | --- |
| Identity | `profiles(id → auth.users.id, username, full_name, avatar_path, cover_path, bio, phone, location, user_type, verification_status, account_status)`, `user_roles(user_id, role)` managed only by trusted admin/service logic, `user_settings(user_id, preferences jsonb)`, `verification_requests(user_id, status, evidence_path)`. Avoid duplicate passwords or user-managed admin claims. |
| Feed | `posts(author_id, body, category, post_type, visibility, status)`, `post_media(post_id, storage_path, media_type, sort_order)`, `comments(post_id, author_id, parent_id, body, status)`, `reactions(user_id, post_id, reaction_type)` unique per user/post/type, `bookmarks(user_id, post_id)`, `follows(follower_id, followed_id)`, optional `hashtags` and `post_hashtags`. |
| Issues | `issues(reporter_id nullable for anonymous intake, title, category, description, location_text, location geography optional, visibility, status, observed_at, assigned_to)`, `issue_media(issue_id, storage_path)`, `issue_comments`, `issue_supporters`, `issue_followers`, `issue_status_history(actor_id, from_status, to_status, note)`. Confidential submissions are private rows under a separate table/policy strategy (see below), never merely a `confidential` client flag. |
| Marketplace | `business_categories`, `businesses(owner_id, name, category_id, description, location, phone, whatsapp, hours, verification_status, status)`, `products(business_id, name, description, price_amount numeric, currency default KES, image_path, status)`, `business_reviews`, `business_favorites`. |
| Publishing | `article_categories`, `articles(author_id, title, excerpt, body, cover_path, status draft/pending_review/published/rejected, published_at)`, `article_comments`, `article_likes`. Public reads expose published articles; drafts/review items are owner/moderator only. |
| Opportunities | `opportunities(owner_id, organisation, title, kind, description, location, requirements, deadline, application_url, status, verification_status)`, `opportunity_applications(opportunity_id, applicant_id, status)` with duplicate application constraint. |
| Accommodation | `accommodation_listings(owner_id, name, kind, location, rent_amount, currency, available_rooms, amenities text[], contact, availability, status)`, `accommodation_images`, `accommodation_favorites`. |
| Events | `events(organizer_id, title, category, description, starts_at, ends_at, venue, registration_url, capacity, status)`, `event_attendees(event_id, user_id, attendance_status)` unique event/user. |
| Academic groups | `communities(owner_id, name, slug, description, visibility, status)`, `community_members(community_id, user_id, role, status)` unique pair, `community_posts(community_id, post_id)`. Group membership gates private group content. |
| Lost and found | `lost_found_items(owner_id, item_name, state lost/found, category, description, location_text, observed_at, contact_method, image_path, claim_status, status)`. Do not store/expose government or student ID numbers. |
| Messaging | `conversations(created_by, kind)`, `conversation_members(conversation_id, user_id, last_read_at, status)` unique pair, `messages(conversation_id, sender_id, body, created_at, deleted_at)`, `message_attachments(message_id, storage_path, mime_type)`. Only active members may read/write. Realtime channels follow the same membership policy. |
| Notifications and moderation | `notifications(user_id, kind, payload jsonb, read_at)`, `notification_preferences`, `reports(reporter_id, target_type, target_id, reason, status)`, `moderation_actions(actor_id, target_type, target_id, action, reason)`, append-only `audit_logs`, `user_devices` only if push delivery is later added. |

## Confidential issue decision

Recommended design: `issues` contains public reports only. Store sensitive intake in `confidential_reports(id, reporter_id, title, category, description, location_text, observed_at, status, assigned_to, created_at)` with no public-readable relationship. `confidential_report_media` points only to a private Storage bucket. A view or carefully scoped server endpoint may provide the submitting user their own report and assigned moderators access; anonymous submission, if required, needs a separately approved contact/token model. Never return reporter identity, private media path or confidential description from public issue listing, search, notifications, realtime or admin aggregates.

Please confirm whether anonymous reports are required and which trusted roles can see a confidential report before migration. The existing UI implies authenticated personal tracking, but does not define anonymous follow-up or moderator roles.

## RLS and integrity proposal

- Enable RLS on every table exposed through Supabase Data API. Deny by default; add explicit select/insert/update/delete policies per role and ownership.
- Use `auth.uid()` for ownership. Do not trust a submitted `user_id`, role, verification badge, reporter label, support count or moderation status.
- Public select policies only expose active public content: published posts/articles, public issues, active businesses/events/opportunities/accommodation/lost-found and public profiles. Draft/private/blocked/suspended states must be considered.
- Owners may update only their own editable content and only allowed columns/states. Status transitions that constitute moderation require trusted `user_roles` checks and audit records.
- Conversation messages require active membership. Group posts require group visibility/member policy. Business changes require owner or moderator. Confidential data has no anonymous public policy.
- Enforce uniqueness for reactions, bookmarks, follows, community membership, attendance, and applications; add foreign keys and check constraints for enum/status/price/date invariants.
- Index feed ordering/filter columns, foreign keys, owner IDs, status/category, event deadlines, conversation message cursor `(conversation_id, created_at, id)`, and issue location only if map search is implemented. Add trigram/full-text indexes after search requirements are confirmed.
- Storage policies bind each object path to its owner/domain and use separate private buckets for reports/documents/messages. Store object paths, not Base64 or user-submitted public URLs.

## Retention and open choices for approval

1. Do we require anonymous confidential reports, or must every reporter sign in?
2. Which roles can create events/opportunities/articles and who approves each type?
3. Is post visibility only public/community, or are followers/private groups needed at launch?
4. May users delete accounts and should content be deleted, anonymized, or retained for moderation/legal audit?
5. Should product/listing values be numeric KES amounts with optional units, rather than the UI's current formatted text?

### Recommended v1 defaults

To keep the first production schema straightforward, I recommend: require a signed-in account for confidential reports; assign moderator/admin roles manually outside user-editable profile fields; allow public posts and use membership checks for academic groups; send submitted articles and business verification requests through moderator review; represent money as numeric amount plus ISO currency (default `KES`); and on account deletion remove/auth-anonymize personal profile data while retaining only necessary de-identified moderation audit history. Reply with approval for these defaults or specify changes.

Once approved, implement this in ordered SQL migrations, seed only fictional local data, and validate RLS with distinct test users/roles before connecting production writes.
