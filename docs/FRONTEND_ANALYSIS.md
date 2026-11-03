# Frontend analysis

Inspected the checked out `kyuconnect` application under `src/`. It is a React 19, TypeScript, Vite and React Router SPA. It currently has no HTTP API client, Supabase client, or server-authenticated session. The pages are an interactive prototype: mock data is the source of truth and mutations generally update browser localStorage. The implementation below uses the existing types as a starting contract and does not assume that a visible page already has durable or secure backend behavior.

## Routes and screens

| Route | Page/component | Current behavior and backend domain |
| --- | --- | --- |
| `/` | `HomePage` inside `AppShell` | Mock social feed; create post, comment/reaction/save behavior; profiles, feed, comments, reactions, bookmarks, notifications. |
| `/explore`, `/community` | `FeaturePage` | Search/discovery and feature collection surfaces; people, posts, businesses, topics and groups. |
| `/issues` | `IssuesPage` | Public issue list, category/status/location filters, map-style display, submit public/confidential issue, attachment preview, support, follow, comments and history. |
| `/marketplace`, `/business/:id` | `MarketplacePage` | Business directory/search/filter/save and business creation form. The existing business detail route is not yet a distinct detail experience. |
| `/blogs`, `/article/:id` | `BlogsPage` | Browse/search/category filter, article reader, create/publish and local draft, like/save/comment. |
| `/opportunities`, `/accommodation`, `/events`, `/lost-found`, `/academics`, `/messages`, `/saved`, `/profile`, `/settings`, `/admin` | `FeaturePage` | Shared route-driven component. Mock opportunities/events/stays/lost items, community membership, chats/messages, profile/settings and simulated moderation actions. |
| `/login`, `/signup`, `/forgot-password`, `/profile-setup` | `AuthPage` | Simulated form flow. It does not authenticate a person, establish a verified session or send a real password reset. |

## Existing TypeScript data shapes

`src/data/mockData.ts` declares `User`, `MemberProfile`, `Post`, `Comment`, `Issue`, `Business`, `Article`, `Opportunity`, `EventItem`, `Stay` and `LostItem`, plus fixture collections for users, feed, issues, businesses, articles, opportunities, events, accommodation, lost-and-found, groups, conversations and notifications. These are presentation-oriented types, not yet API contracts: many IDs and dates are display strings; author data is embedded; relationship counts are denormalized; and monetary data is sometimes a formatted string. The proposed API returns stable IDs, ISO timestamps, normalized relationships and server-computed counts, with a frontend mapping layer retaining the current view types during migration.

Important issue fields already modeled include `confidential`, status, category, location, attachments, support and comments. A confidential issue is currently put into a separate localStorage key; that separation is only a UI convention and provides no privacy. The backend must make private reports inaccessible from public list, search, storage and realtime channels at the database policy level.

## Forms and submitted data

- **Authentication/profile:** signup asks for name, email, password, account category, school, course, year and optional profile image. Login uses email/password. Forgot password uses email. Profile setup repeats profile identity/education/image fields. Verification is currently simulated.
- **Post composer:** category, post type, body text and optional image/video file (current client preview limit 2 MB).
- **Issue report:** title, category, location, description, observed date/time, optional image/document and public/confidential choice. Supporting/follow-up interactions include support, comment, follow and status history.
- **Business listing:** name, category, location, phone, optional WhatsApp, starting price, description, hours, products/services and optional image/logo.
- **Article:** title, category, tags, excerpt, story body, cover image; save draft or publish. Reader interactions include like, bookmark and comment.
- **Opportunity:** title, category/type, location, organisation, deadline, application URL/instructions and description.
- **Event:** title, category, venue, organiser, date, time, registration/contact and optional image.
- **Accommodation:** property name/type, location, rent, room count, contact, facilities/description and optional image.
- **Lost/found:** item name, lost/found status/category, approximate location, observed date, description, optional image and contact. UI cautions against publishing unique sensitive identifiers.
- **Messaging:** text and optional attachment preview; conversation/member list, read/unread UI. No server delivery or persistent secure conversation exists yet.
- **Settings/moderation:** local preference toggles, blocked/report concepts and admin status/verification controls are simulated; there is no enforced role model.

## Browser storage inventory

`src/lib/storage.ts` wraps `localStorage` with the `kyu:` key prefix and contains FileReader-to-data-URL preview helpers. Storage users and keys found by inspection:

| Component/page | Keys currently persisted |
| --- | --- |
| `AppShell` | `profile`, `posts`, `liked`, `saved` |
| `Topbar` | `notifications` |
| `RightSidebar` | `followed-people` |
| `IssuesPage` | `issues`, `private-issues`, `issue-support`, `issue-followed`, `issue-comments` |
| `MarketplacePage` | `businesses`, `saved-businesses` |
| `BlogsPage` | `profile`, `articles`, `article-drafts`, `article-liked`, `article-saved`, `article-comments` |
| `FeaturePage` | `profile`, `joined-groups`, `opportunities`, `events`, `stays`, `lost-items`, `saved-events`, `interested-events`, `chats`, `businesses`, `articles`, `issues`, `preferences`, `admin-status`; it also reads shared feed/saved state from `AppShell`. |
| `AuthPage` | Reads `profile` and directly writes `kyu:profile`; this is simulated identity, not auth. |

Keep only harmless UI preferences/cache in localStorage after integration. Do not persist passwords, private issue data, private messages or privileged roles there. Access/refresh token handling should use the official Supabase browser client after integration rather than hand-written token storage.

## Upload and realtime needs

Uploads are currently client-side previews encoded as data URLs. Posts support image/video; issues support images and documents; businesses, articles, events, accommodation and lost/found support images; chats support attachments. Replace data URLs with Supabase Storage object paths and short-lived signed upload/download URLs. Validate MIME type, byte limits, ownership and bucket visibility on server/database policies.

Supabase Realtime is appropriate for persisted chat messages, unread notifications and issue status changes/followers. Feed content, listings, articles and discovery can start as paginated REST reads with refresh after mutation; add realtime only where it improves an actual screen. Presence is not currently a dependable backend requirement; online badges are mock values.

## Integration issues to fix during connection

1. Auth currently reports success and navigates without creating an account or session; the logout link only navigates to `/login`.
2. The UI models current user/profile as a fixed fixture and several cards show hard-coded counts or labels. Map authenticated profile data from the server and avoid implying real verification.
3. Public/confidential issue lists are separate only in the browser. Server filters and RLS must be the security boundary; private storage must be separate.
4. FileReader data URLs are persisted in localStorage in some flows; this grows local storage and exposes sensitive data to any script running in the origin.
5. `FeaturePage` is a shared prototype destination for several different domains. Connect page-by-page behind domain services and retain separate validation/types rather than one broad generic update endpoint.
6. `/business/:id` and several feature pages are route placeholders; document missing/partial behavior instead of claiming fully implemented domain pages.
7. Dates and fake sample identities use presentation strings. Send ISO-8601 values and UTC timestamps to/from the API and format them in the client.

## Proposed frontend migration order

First add a typed `src/lib/api.ts` wrapper that reads `VITE_API_URL` and attaches the Supabase session access token. Add a Supabase browser client for auth/session state and keep the API bearer token aligned with that session. Then migrate profile/auth, public feed, issue reporting (including separate confidential retrieval), and marketplace one at a time. Preserve mock fixtures only as development fallback or explicit fixtures, never as production writes. Each connected page needs loading, empty, validation-error, permission-error and network-error states.
