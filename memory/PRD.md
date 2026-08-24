# PRD — selfhost: Self-Hosting Control Panel (Railway-backed)

## Original Problem Statement
Own hosting control panel for Emergent app exports — deploy without paying per-app on Emergent.

## Architecture
```
Browser  →  FastAPI panel  →  MongoDB (panel state)
                 ├─►  Railway GraphQL       (account token — projects/services/envs/domains/deploys)
                 ├─►  Railway CLI           (project-scoped token — `railway up` source uploads)
                 ├─►  GitHub REST + git     (GITHUB_PAT — mirror source to per-project repo)
                 └─►  Emergent code-server  (user-provided URL+password — pull latest workspace via /vscode-remote-resource)
```

## Implemented (sessions 1–6)
### Core
- POST /api/deploy — real `railway up` + streamed logs
- Env vars per project (GET/POST/DELETE `/api/projects/{id}/env`)
- Custom domains (create + auto DNS records display) — fixed missing `projectId` + `targetPort` bugs
- One-click Mongo add-on (`mongo:7` + volume + `${{Mongo.MONGO_URL}}` reference)
- Deploy history + rollback (`deploymentRollback`)
- Owner/connectivity meta (Railway + GitHub user)
- Per-project settings modal: Railway token, GitHub sync toggle, Public URLs & admin, Emergent source

### Deployed Morning Soft®
- 3-service Railway project (backend/mongo/frontend)
- Custom domain https://www.brandjunction.xyz — Let's Encrypt SSL ✅
- Fallback URLs live at *.up.railway.app ✅
- Admin: `admin@morningsofttissue.com` / `MorningSoft@2026`
- Frontend Dockerfile hardcodes `serve -l 3000` to match `targetPort=3000`

### One-Click Refetch (new)
- `/app/backend/emergent_fetcher.py` — BFS fetch of code-server workspace via `/vscode-remote-resource`, following JS `@/` alias + relative + Python module imports
- POST `/api/projects/{id}/emergent-source` — save code-server URL/password/subdir + cached Dockerfile + railway.json templates
- POST `/api/projects/{id}/refetch` — auth → fetch → inject cached Dockerfile → zip → deploy
- Settings modal "Emergent source" section
- ProjectsList ↻ (green) button visible when configured, spins during refetch
- Both morningsoft projects pre-configured with subdir (backend / frontend) + Dockerfile/railway.json templates
- **Current status**: fetcher live-tested against Emergent workspace — password `f69d08a5` since rotated by Emergent, needs fresh password paste through the settings modal to work

## Files
- Backend: `server.py`, `railway_client.py`, `github_client.py`, `emergent_fetcher.py`
- Frontend: `App.js`, `components/hosting/{DeployPanel,DomainsPanel,EnvVarsPanel,DeployHistoryPanel,ProjectSettingsModal,ProjectsList,ResourceCharts,StatsCards}.jsx`

## Backlog
- P1 Live runtime logs tab (`deploymentLogs` query)
- P2 Cost meter per service (Railway metrics)
- P2 Auth (JWT) for the panel itself
