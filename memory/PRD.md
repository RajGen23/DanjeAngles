# PRD — selfhost: Self-Hosting Control Panel (Railway-backed)

## Original Problem Statement
Own hosting control panel for Emergent app exports — deploy without paying per-app.

## Architecture
```
Browser  →  FastAPI panel  →  MongoDB (panel state)
                 ├─►  Railway GraphQL   (account token — projects, services, envs, domains, deployments, rollback)
                 ├─►  Railway CLI       (project-scoped token — `railway up` source uploads)
                 └─►  GitHub REST + git (GITHUB_PAT — mirror source to per-project repo on each deploy)
```

## Implemented
### Session 1 — Real Railway hosting
- POST /api/deploy with real `railway up` and streamed logs
- Env vars per project via `variableCollectionUpsert`
- Custom domains via `customDomainCreate` with live DNS record UI
- Owner/connectivity meta

### Session 2 — Mongo add-on + Deploy history
- One-click Mongo (`mongo:7` service + `/data/db` volume + `${{Mongo.MONGO_URL}}` reference)
- Deploy history modal + `deploymentRollback`

### Session 3 — Morning Soft deploy
- Fetched full workspace via `/vscode-remote-resource` (auth cookie route)
- Dockerfiles for backend + frontend (emergentintegrations custom pip index)
- Deployed 3 Railway services in one project; verified end-to-end

### Session 4 — Redeploy + GitHub sync
- `railway_up` now uses per-project token override
- `github_client.py` push each deploy to `emergent-hosted-<slug>` repo
- Frontend: `ProjectSettingsModal` (gear icon) for token / GitHub / URLs

### Session 5 — Project row URLs + Custom domain live
- `frontend_url`, `admin_email`, `admin_password` fields + `POST /api/projects/{id}/urls`
- ProjectsList row shows `STORE / API / ADMIN` inline
- Attached `www.brandjunction.xyz` to `morningsoft-web` (fixed missing `projectId` in `customDomainCreate` payload; Railway also required `targetPort`)
- Fixed 502 on customDomain by hardcoding `serve -l 3000` in Dockerfile so container port matches `targetPort=3000`
- `www.brandjunction.xyz` is LIVE with valid Let's Encrypt SSL, HTTP 200

## Backlog
- **P1** Fix serviceDomain targetPort so `morningsoft-web-production.up.railway.app` returns 200 again (needs `serviceDomainUpdate` mutation, waiting for rate-limit clear)
- **P1** Live runtime logs tab (`deploymentLogs` query)
- **P2** One-click "Refetch from Emergent" button — pulls latest source from code-server + redeploys
- **P2** Cost meter per service (Railway metrics API)
- **P2** Auth for the panel itself

## Files
- Backend: `server.py`, `railway_client.py`, `github_client.py`
- Frontend: `App.js`, `components/hosting/{DeployPanel,DomainsPanel,EnvVarsPanel,DeployHistoryPanel,ProjectSettingsModal,ProjectsList,ResourceCharts,StatsCards}.jsx`

## Deployed
- Morning Soft®: https://www.brandjunction.xyz — SSL ✅, backend on Railway ✅, Mongo add-on ✅
