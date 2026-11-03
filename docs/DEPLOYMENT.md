# Deployment notes

Deploy the API as a Node.js service (for example Render, Railway or a managed VPS); keep the React app on Vercel and Supabase as the managed database/auth/storage layer. Set the backend start command to `npm start`, health check path to `/api/v1/health`, and provide runtime secrets through the host's secret manager.

Required operational settings include `NODE_ENV=production`, `PORT` from the host, `FRONTEND_URL` with the exact production frontend origin(s), `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, and `LOG_LEVEL=info`. Add Brevo values only when transactional email is enabled. Do not commit `.env` or expose secret values as frontend build variables.

Before production deployment, implement and apply reviewed SQL migrations/RLS/storage policies, configure Supabase Auth redirect URLs and Brevo SMTP settings, verify backup/restore, test confidential issue and conversation access with separate accounts, set trusted proxy behavior for the selected host, and configure log/error monitoring. The current health route is liveness only; a readiness check should be added after database integrations are implemented.
