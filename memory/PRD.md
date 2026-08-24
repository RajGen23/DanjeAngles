# PRD — selfhost: Self-Hosting Control Panel (Railway-backed)

## Original Problem Statement
User wants their own hosting control panel to upload Emergent app exports (React + FastAPI) and deploy them without paying per-app on Emergent. Minimal, beautiful design.

## User Choices
- Real hosting via **Railway.app** (not simulated)
- Provider token supplied by user (Account-level token — verified working)
- Owner email: `rajgen1299@gmail.com`
- Minimal light design retained (Swiss high-contrast, Manrope + IBM Plex, #FF4400 accent)
- No login on the control panel itself (single-owner MVP)

## Architecture
```
Browser (React + Tailwind + shadcn + framer-motion)
        │
        ▼
FastAPI  ──►  MongoDB (projects/deployments/env_vars/domains)
        │
        ├──►  Railway GraphQL API  (projects, services, env vars, domains, deployments, rollback, plugins)
        └──►  `railway up` CLI     (source archive upload → build → deploy)
```

- One Railway **project + service** per uploaded app (auto-created on first deploy)
- `railway up` runs from a temp directory with `RAILWAY_TOKEN` env var (non-interactive)
- Build logs and deployment status pulled from GraphQL `buildLogs` + `deployment` queries, streamed into our own deployment record → frontend polls
- Env vars: written to Mongo AND upserted to Railway via `variableCollectionUpsert`
- Custom domains: created via `customDomainCreate`, DNS records + status shown live with copy-to-clipboard
- Owner meta endpoint checks Railway connectivity live and shows "connected / offline" in the header

## Implemented (Feb 2026 — session 1: real hosting)
- `POST /api/deploy` — extracts zip, auto-adds `railway.json`, creates Railway project+service+domain if new, upserts env vars, `railway up`, polls status, streams logs
- `GET/POST/DELETE /api/projects/{id}/env` — Railway `variableCollectionUpsert` / `variableDelete`
- `POST /api/projects/{id}/action` with `redeploy` — `serviceInstanceRedeploy`
- `DELETE /api/projects/{id}` — cascades `projectDelete` on Railway + local cleanup
- `POST /api/domains` / `GET /api/domains` — `customDomainCreate`, live DNS record + status
- `GET /api/owner` — Railway connectivity check
- Frontend: `EnvVarsPanel` modal, updated `DeployPanel` (new-project or update-existing), `DomainsPanel` (DNS record display + copy), `ProjectsList` (redeploy button, env-vars button, real Railway URLs)

## Implemented (Feb 2026 — session 2: DB + history)
- `POST /api/projects/{id}/mongo` — Creates `mongo:7` Railway service, `/data/db` persistent volume, sets root credentials + `MONGO_URL`, injects `${{Mongo.MONGO_URL}}` + `DB_NAME` into the app service. Verified: Railway resolves the reference to `mongodb://root:...@mongo.railway.internal:27017`
- `DELETE /api/projects/{id}/mongo` — Tears down the Mongo service
- `GET /api/projects/{id}/deployments` — last 25 Railway deploys (id/status/url/createdAt/canRollback)
- `POST /api/deployments/{railway_id}/rollback` — calls `deploymentRollback`
- Frontend: `DeployHistoryPanel` modal (current deploy highlighted, rollback button on past successes); ProjectsList gets Database + History icon buttons + a "mongo" badge when provisioned

## Verified this session
- Full Railway flow smoke-tested twice (session 1: project/service/env/domain/delete; session 2: mongo image service + volume + variable references + deployment list + delete)
- Frontend renders with live Railway "connected" indicator
- All validation returns correct HTTP codes (404 on unknown IDs, 400 on invalid domain, 500 with GraphQL error text on invalid rollback id)
- No lint errors (Python + JS)

## Backlog
- **P1** Live tail of runtime logs (`deploymentLogs` query) as a separate tab
- **P2** Metrics (CPU/RAM) from Railway metrics API when available
- **P2** JWT auth for the panel itself (currently open)
- **P2** Multi-account: allow adding several Railway tokens for different tenants

## Files
- `/app/backend/server.py` — FastAPI routes
- `/app/backend/railway_client.py` — Railway GraphQL + CLI helpers
- `/app/frontend/src/App.js` — layout + polling + modal wiring
- `/app/frontend/src/components/hosting/*.jsx` — DeployPanel, DomainsPanel, EnvVarsPanel, DeployHistoryPanel, ProjectsList, ResourceCharts, StatsCards

## Env vars used
- `RAILWAY_TOKEN` — user's Railway account token (in `/app/backend/.env`)
- `RAILWAY_GRAPHQL_URL` — https://backboard.railway.app/graphql/v2
- `OWNER_EMAIL` — rajgen1299@gmail.com

## Test Credentials
No login on the panel itself. Railway token stored server-side only.
