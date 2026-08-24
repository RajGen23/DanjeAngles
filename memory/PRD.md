# PRD — selfhost: Self-Hosting Control Panel (Railway-backed)

## Original Problem Statement
User wants their own hosting control panel to upload Emergent app exports and deploy them without paying per-app on Emergent.

## Architecture
```
Browser  →  FastAPI panel  →  MongoDB (panel state)
                 ├─►  Railway GraphQL      (account token — projects, services, env, domains, deployments, rollback)
                 ├─►  Railway CLI          (per-project token — `railway up` source upload)
                 └─►  GitHub REST + git    (GITHUB_PAT — mirror every successful deploy to a private repo)
```

## Implemented
### Session 1 — Real Railway hosting
- POST /api/deploy → real `railway up` + real streamed logs
- Env vars per project (GET/POST/DELETE `/api/projects/{id}/env`)
- Custom domains via `customDomainCreate` with live DNS record UI
- Owner/connectivity meta

### Session 2 — Mongo + Deploy history
- One-click Mongo: `mongo:7` service + `/data/db` volume + `${{Mongo.MONGO_URL}}` reference auto-injected
- Deploy history modal + `deploymentRollback` mutation on any past success

### Session 3 — Deploy Morning Soft
- Fetched full Morning Soft source (68 files, 8.6MB) from code-server via `/vscode-remote-resource`
- Dockerfiles for backend (`--extra-index-url` for emergentintegrations) and frontend (Node 20 + `serve`)
- 3-service Railway project (backend/mongo/frontend) live at:
  - https://morningsoft-web-production.up.railway.app
  - https://morningsoft-api-production.up.railway.app/api/
  - Admin: `admin@morningsofttissue.com` / `MorningSoft@2026`

### Session 4 — Redeploy fix + GitHub mirror
- `railway_up` now accepts a per-project token override (project-scoped token stored on the project record)
- POST /api/projects/{id}/token — saves per-project Railway token
- POST /api/projects/{id}/github — toggles GitHub mirror per project
- github_client.py — creates/updates `emergent-hosted-<slug>` repo via GitHub REST + force-pushes source via `git` CLI on each successful deploy
- Frontend: ProjectSettingsModal.jsx (gear icon per project) — paste Railway token, toggle GitHub sync, view mirror URL
- Owner endpoint now returns `github_user` for header indicator
- ProjectsList shows `mongo` and `synced` badges

## Backlog
- P1 Live runtime logs tab (`deploymentLogs` query)
- P2 Panel auth (JWT)
- P2 Auto-provision Postgres too (`postgres:16` image)

## Files
- Backend: `server.py`, `railway_client.py`, `github_client.py`
- Frontend: `App.js`, `components/hosting/{DeployPanel,DomainsPanel,EnvVarsPanel,DeployHistoryPanel,ProjectSettingsModal,ProjectsList,ResourceCharts,StatsCards}.jsx`

## Env vars in /app/backend/.env
- RAILWAY_TOKEN (account-scoped for GraphQL)
- RAILWAY_GRAPHQL_URL
- OWNER_EMAIL
- GITHUB_PAT (for auto-mirror)

## Deployed apps
- Morning Soft® — https://morningsoft-web-production.up.railway.app
