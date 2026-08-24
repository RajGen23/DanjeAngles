# PRD — selfhost: Self-Hosting Control Panel (Railway-backed)

## Original Problem Statement
User wants their own hosting control panel to upload Emergent app exports and deploy them without paying per-app on Emergent. Minimal, beautiful design.

## User Choices
- Real hosting via **Railway.app**
- Account token + GitHub PAT + per-project tokens (all in `/app/backend/.env`)
- Owner email: `rajgen1299@gmail.com`
- Minimal light design (Swiss high-contrast)

## Architecture
```
Browser  →  FastAPI (this panel)  →  MongoDB (panel state)
                    ├─►  Railway GraphQL (account token: projects, services, env, domains, deployments, rollback)
                    └─►  Railway CLI     (project-scoped tokens per app: `railway up` source upload)
```

## Implemented (Feb 2026)
### Session 1 — Real Railway hosting
- POST /api/deploy (real `railway up` + real logs streamed from Railway API)
- Env vars per project (GET/POST/DELETE `/api/projects/{id}/env`)
- Custom domains via Railway `customDomainCreate` with live DNS record display
- Owner/connectivity meta

### Session 2 — Mongo + History
- One-click Mongo (`mongo:7` service + `/data/db` volume + `${{Mongo.MONGO_URL}}` reference injected into app service)
- Deploy history modal with rollback (`deploymentRollback` mutation)

### Session 3 — Real Morning Soft deploy
- Fetched full Morning Soft® e-commerce source (68 files, 8.6 MB) from code-server via `/vscode-remote-resource` (auth cookie + browser UA)
- Wrote Dockerfile + railway.json for both backend (Python 3.11 + `--extra-index-url` for emergentintegrations) and frontend (Node 20 + `serve`)
- Deployed to Railway project `fb47cf58-c686-4486-a5ad-779069c5bda9`:
  - Backend service `morningsoft-api` → https://morningsoft-api-production.up.railway.app
  - Mongo service auto-provisioned with `MONGO_URL` reference wired into backend
  - Frontend service `morningsoft-web` → https://morningsoft-web-production.up.railway.app
  - All 5 backend secrets pushed (STRIPE_API_KEY, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, CORS_ORIGINS)
  - `REACT_APP_BACKEND_URL` set on frontend before build
- Fixed CLI auth: user provided **project-scoped token** (account tokens don't work with `railway up`); token stored per-project on our panel record

## Backlog
- **P1** Panel UX: prompt for project token on deploy (or auto-generate when possible) so future deploys don't need CLI-token workaround
- **P1** Live runtime logs tab (`deploymentLogs` query)
- **P2** GitHub PAT integration — push zip contents to a temp GitHub repo, use Railway git-source (would remove the project-token requirement entirely)
- **P2** JWT auth for the panel itself

## Files
- `/app/backend/server.py` — FastAPI routes
- `/app/backend/railway_client.py` — Railway GraphQL + CLI helpers
- `/app/frontend/src/App.js` — layout + modal wiring
- `/app/frontend/src/components/hosting/*.jsx` — DeployPanel, DomainsPanel, EnvVarsPanel, DeployHistoryPanel, ProjectsList, ResourceCharts, StatsCards

## Env vars (in /app/backend/.env)
- `RAILWAY_TOKEN` — account-scoped for GraphQL
- `RAILWAY_GRAPHQL_URL`
- `OWNER_EMAIL`
- `GITHUB_PAT` — provided by user (unused yet, reserved for git-source deploys)

## Deployed apps
- Morning Soft® — https://morningsoft-web-production.up.railway.app
  - Backend: https://morningsoft-api-production.up.railway.app
  - Admin login: `admin@morningsofttissue.com` / `MorningSoft@2026`
