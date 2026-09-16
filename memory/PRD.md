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

## 2026-09-02 — Morning Soft outage fix + Brand SERP Engine deploy (in progress)
- **Mongo crash (morningsofttissue.com products blank) — FIXED.** Root cause: mongod 7 FTDC thread
  failed writing `/data/db/diagnostic.data/metrics.interim.temp` → `terminate()` → service CRASHED,
  so `morningsoft-api` got ServerSelectionTimeoutError and returned 500 (browser reported it as CORS).
  Fix: Mongo service start command set to
  `mongod --bind_ip_all --setParameter diagnosticDataCollectionEnabled=false`,
  restartPolicy set to ALWAYS (10 retries), Mongo + api redeployed. Products verified live.
- **Railway account token (RAILWAY_TOKEN) can no longer reach the ai-blog/amused-creation project.**
  `railway_client.gql` now falls back to the project-scoped token via `rw.PROJECT_TOKEN` contextvar
  (set in `run_real_deploy`). Header used: `Project-Access-Token`.
- **Railway CLI was missing in the forked pod** → installed with `npm i -g @railway/cli` (needed by `railway up`).
- **Brand SERP Engine** (workspace vscode-c0c5d0d0…, pwd f2ee4833) — backend LIVE at
  https://ai-blog-writer-5-api-production.up.railway.app/api/ ; reused ai-blog DB records
  (`aiblog-api-2a0f4f87` → brand-serp-api, `aiblog-web-f4b73dfa` → brand-serp-web), Mongo reused,
  `SEARCHAPI_KEY` injected. Frontend NOT deployed: Railway free plan resource limit (5/5 services).
  GitHub mirror failed: PAT lacks repo-create permission.

### 2026-09-02 (later) — Mongo crash RECURRED: real root cause = FULL VOLUME
- `mongo-volume` (500MB plan / 434MB usable) was **100% full**: 123MB `/data/db/diagnostic.data`
  + 301MB `/data/db/journal`. WiredTiger checkpoint hit errno 28 (ENOSPC) → `Fatal assertion 50853`
  → mongod aborts → crash loop → morningsoft-api 500s on /api/products.
- Diagnosis trick: temporarily set the Mongo service startCommand to
  `sh -c 'df -h /data/db; du -sh /data/db/*; ... ; sleep 3600'` and read deployment logs.
- Fix applied: deleted diagnostic.data (freed 123MB) and set permanent startCommand
  `sh -c 'rm -rf /data/db/diagnostic.data; exec docker-entrypoint.sh mongod --auth --bind_ip_all --setParameter diagnosticDataCollectionEnabled=false'`
  with restartPolicy ALWAYS(10). Verified /api/products 200 + shop renders.
- Volume resize to 2GB REJECTED by Railway API (free plan caps at 500MB) → user must upgrade to
  Hobby for headroom. Remaining risk: 301MB journal leaves ~120MB free.

## 2026-09-02 — Marine Engine Store (MECHANICS) deployed to Railway
- Source workspace: https://vscode-b1934023-d18d-4984-8598-35e95ab30658.preview.emergentagent.com (pwd 50f22ee7)
- Railway project `marine-engine-store` = 43dfcc06-7f65-4603-b075-6739823f4a80, env bef47ba9-a5b6-4e6e-a833-5b158fc04ff6
  - marine-api  svc 3bf0ce60 → https://marine-api-production-3b34.up.railway.app
  - marine-web  svc 159fc75b → https://marine-web-production.up.railway.app
  - Mongo       svc 73af9060 (FTDC disabled + volume, crash-proofed from the start)
  - project token 723a4db3-a40a-4bf6-986a-75ab651336ad (stored on both project records)
- Panel project ids: `marine-api`, `marine-web`. Admin: admin@mechanics.co.za / Mechanics#2026
- **Catalogue data migrated**: the code seed only had 39 products; the live preview had 828.
  `/app/backend/scripts/migrate_marine_catalogue.py` copies them from the preview API into the
  Railway deployment via the admin API (828/828, 0 failures, 51 brands).
- Tested by testing agent (iteration_6.json): 15/15 backend tests, all frontend flows incl. admin CRUD,
  contact enquiry, filters, mobile. No regressions on Morning Soft or the panel.

### Panel bugs fixed while deploying
- `railway_up()`: account tokens must go in RAILWAY_API_TOKEN (+RAILWAY_PROJECT_ID/ENVIRONMENT_ID);
  putting an account token in RAILWAY_TOKEN makes the CLI say "Invalid RAILWAY_TOKEN".
- `create_service_domain()`: Railway 400s if `projectId` is in ServiceDomainCreateInput — send only
  serviceId + environmentId.
- `get_project()` query shape was invalid (400) — simplified.
- Frontend docker template must serve on `${PORT}` (`serve -s build -l ${PORT:-3000}`), otherwise
  Railway shows "Application failed to respond".
- CORS_ORIGINS must be the exact web origin (not `*`) for apps using `withCredentials: true`.
- `POST /api/{pid}/refetch` no longer requires a project token (account token works).
- Railway CLI is NOT persistent in the pod — reinstall with `npm i -g @railway/cli` if `railway` is missing.
- `DELETE /api/projects/{id}` in the panel destroys the whole Railway project (this is how the
  ai-blog/brand-serp project was lost — deleted from the panel UI). Needs a confirm + detach option.

### Backlog
- P1: type-to-confirm + "detach without destroying Railway" on project delete
- P1: stream live Railway build logs into the panel
- P1: Brand SERP Engine still undeployed (project b6cf615f ready; code-server password rotated)
- P2: Morning Soft Mongo volume still 500MB — grow it in the Railway dashboard now that the plan is paid
- P2: custom domain for Marine Engine Store

### 2026-09-02 — "refetch not successful" investigation (marine-web)
- Access log shows NO refetch request from the user's click reached the backend; the only two
  marine-web refetch calls in the log were the agent's. Conclusion: the click happened during the
  window when the Railway CLI binary was missing from the pod (`Errno 2: 'railway'`, which killed
  the earlier marine-api attempts), or the browser confirm() dialog was dismissed.
- Reproduced the UI flow with Playwright against the panel: refetch-btn-marine-web → POST 200 →
  deployment 37baa470 built and went live in 72s (marine-web now v3). Refetch works end-to-end.
- Fixed while investigating: `customDomain(id:)` query was missing the required `projectId` arg,
  which made GET /api/domains spam 400s and always show custom domains as "propagating";
  now passes the owning project's railway_project_id (+ project token) and treats
  DNS_RECORD_STATUS_PROPAGATED as active → www.morningsofttissue.com shows active/SSL.
- Ongoing risk: the Railway CLI is not persistent in this pod. If `which railway` is empty,
  run `npm i -g @railway/cli` before any deploy/refetch.

### 2026-09-02 — Self-healing deploys (DONE)
- `railway_client.ensure_cli()` checks for the `railway` binary on a fixed PATH and, if missing,
  runs `npm install -g @railway/cli` behind an asyncio lock (5 min timeout) before every
  `railway up`. The deployment log records "Railway CLI was missing — reinstalled it automatically".
- Verified by deleting /usr/bin/railway + /usr/lib/node_modules/@railway and triggering a real
  marine-web refetch: CLI reinstalled itself and the deploy went live (v4).

## 2026-09-07 — DakEvents deployed to Railway (Expo Router + FastAPI)
- Source workspace: vscode-dd065ae8-4dfa-4fe9-833e-16a5f7ecc84e (pwd efd95d63);
  data source of truth = https://shaadi-connect-27.preview.emergentagent.com
- Railway project `dakevents` c3dc6815-23b2-4242-8492-2d3b503e97f5, env fde1182d-82db-4d73-8799-753bb360ccfb
  - dakevents-api svc 9ee32606 → https://dakevents-api-production.up.railway.app
  - dakevents-web svc ab195e26 → https://dakevents-web-production.up.railway.app
  - Mongo svc e1694e00 (FTDC disabled + volume + restart ALWAYS)
  - project token stored on both panel project records (`dakevents-api`, `dakevents-web`)
- Data migrated: 1339 vendors (WP auto-sync from dakevents.ci + 24-vendor delta from preview),
  17 categories, 8 events, 6 offers, admin settings (login hero, home hero, promo, app config),
  plus the demo user test@dak.demo. Script: `/app/backend/scripts/migrate_dakevents.py`.
- Tested (iteration_7.json): 27/29 backend pass on first run; the one real bug (demo user
  test@dak.demo 401) was fixed by adding demo-account registration to the migration script —
  all 4 accounts now log in 200. Frontend flows all pass incl. /admin CMS, /superadmin,
  hard-refresh deep links and mobile. No regressions on Marine or Morning Soft.

### Panel capability added: Expo Router support
- `emergent_fetcher.discover_expo_sources(app_url)` reads the Metro dev source map
  (`/node_modules/expo-router/entry.map?platform=web&dev=true&lazy=false`) of the RUNNING preview
  and returns every non-node_modules source path. Needed because expo-router routes are file-based
  and have no import graph from a single entry (a plain fetch returned only 6 files).
- `fetch_workspace(..., extra_paths=[...])`; Expo seeds (app.json/tsconfig/metro/babel) added;
  app.json's `./assets/...` icon+splash references are auto-queued.
- `POST /api/projects/{pid}/refetch` runs the Expo discovery when the project has `expo_preview_url`.
- Expo web Docker template: node20 → `npx expo export --platform web --output-dir dist` →
  `serve -s dist -l $PORT`; the fetched `frontend/.env` is REPLACED at build time with the Railway
  API URL (otherwise the build bakes in the Emergent preview URL).
- Gotcha: the Emergent code-server idles to zero and returns a "Starting IDE..." placeholder; only a
  real browser session wakes it. Server-side polling for 12+ minutes did not.

### Backlog (updated)
- P1: type-to-confirm + "detach without destroying Railway" on project delete
- P1: stream live Railway build logs into the panel
- P2: Morning Soft CNAME drift — Cloudflare points at 4z6ndoy0.up.railway.app but Railway now expects
  gd6nyke7.up.railway.app; SSL stays pending until the user updates DNS
- P2: Brand SERP Engine still undeployed (workspace password rotated)
- P2: custom domains for Marine and DakEvents

## 2026-09-07 — Bag Buddy deployed to Railway
- Source workspace: vscode-6f66f01a-c19e-48b1-9abd-c4896b8d9867 (pwd 78c84748); CRA + shadcn + FastAPI
- Railway project `bagbuddy` e098b545-4e79-4d56-93d1-7f1c5c08f96e, env 734fc8fa-bc08-46dd-9710-1f2548a22c36
  - bagbuddy-api → https://bagbuddy-api-production.up.railway.app
  - bagbuddy-web → https://bagbuddy-web-production.up.railway.app
  - Mongo svc f95fc378 (FTDC off + volume + restart ALWAYS)
- Airports/zones/promo codes and the admin account are seeded by the app on startup (backend/seed.py),
  so no data migration was needed. CORS_ORIGINS set to the exact web origin (app uses withCredentials).
- Provisioning script: `/app/backend/scripts/setup_bagbuddy.py`
- Tested (iteration_8.json): 51/52 backend pass, no critical issues. Booking wizard end-to-end
  (live booking BB-HOU-000133 with WELCOME20 → $49.36), tracking, agent application, contact form,
  admin dashboard (Overview/Bookings/Agents/Inbox/Promotions), lockout, mobile, all 14 SPA routes on
  hard refresh. No regressions on DakEvents / Marine / Morning Soft / the panel.
- Known non-blockers: POST /api/pricing/quote returns 400 (not 200 + discount=0) for unknown promo codes;
  `serve -s` returns index.html for missing /static/* which logs an "Unexpected token <" console error
  on every route; QA left ~5 'QA TEST' bookings + 1 agent application + 1 message in the prod DB and the
  app exposes no delete endpoints for them (admin API is read-only for bookings/messages).

### 2026-09-07 — BagBuddy logo bug FIXED (root cause was in the panel's fetcher)
- Symptom: broken logo image on the deployed BagBuddy site.
- Root cause: `emergent_fetcher.fetch_workspace()` walked only the JS/Python IMPORT graph, so files in
  `frontend/public/` referenced by URL string (`src="/bagbuddy-logo.png"`) were never fetched. The
  deployed build had no logo file and `serve -s` returned index.html for it.
- Fix: the BFS now also scans .js/.jsx/.ts/.tsx/.html for
  `(?:src|href)="/<name>.(png|jpg|jpeg|svg|webp|ico)"` and queues
  `{workspace_root}/frontend/public/<name>`. Refetch went 59 → 62 files, logo included.
- Verified by testing agent (iteration_9.json): /bagbuddy-logo.png serves image/png 277619 bytes,
  in-browser naturalWidth 510x660 on home, /admin login, admin dashboard, hard-refreshed /book and
  /track, and mobile. 58/59 regression checks pass; no criticals. Other three apps + panel green.
- An earlier attempt that base64-injected the PDF logo into the Docker template was REVERTED (Docker
  rejects any Dockerfile line > 65535 bytes; the workspace file is the right source anyway).
  The owner's PDF + a 512px PNG are kept in /app/memory/assets/ for reference.
- Also hardened: the Railway build poll loop now backs off exponentially on HTTP 429 (it was polling
  every 3s and burning the account quota for ~25 minutes), and a 429 before upload now reports
  "nothing was deployed" instead of a raw Fatal.


### 2026-09-09 — Viara deployed to Railway (React CRA + FastAPI)
- App: flights/hotels/cars meta-search (ZRH/GVA/MUC/VIE ⇄ TIA corridor), combines carriers into one itinerary.
- Provisioned via `scripts/setup_viara.py`: Railway project `viara`, services viara-api / viara-web / Mongo (mongo:7 with /data/db volume + diagnostic-data-off start cmd).
  - API: https://viara-api-production-d279.up.railway.app  ·  Web: https://viara-web-production.up.railway.app
- Deployed both via panel `/api/projects/{id}/refetch`. API Dockerfile strips litellm + dev tooling from requirements.
- Live data seeded on API startup from seed_data.py: 5 airports, 6 airlines, 40 flights, 8 hotels, 7 cars, FX rates. Admin user seeded from ADMIN_EMAIL/ADMIN_PASSWORD env.
- Verified: API /api/ health 200, /api/search returns 6 journeys ZRH→TIA, hotels/cars populated, admin login 200, web home renders (VIARA brand + live "Routes we built this morning" cards), frontend bundle references correct API URL. Both projects status=running.
- Previous block (Railway 429 rate limit) had cleared; provisioning + both deploys succeeded on first pass.

### 2026-09-14 — bagbuddy-api crash after refetch (FIXED)
- Symptom: after refetching latest build, bagbuddy-api showed "Crashed" in Railway (Mongo + web fine).
- Root cause: new backend code calls `seed_employees()` on startup which reads `os.environ["STAFF_SEED_PIN"]`;
  that var did not exist on the Railway service -> KeyError -> uvicorn "Application startup failed", 3 retries, CRASHED.
  Build itself succeeded; panel marked it "live" because it only watches build status, not runtime health.
- Fix: upserted STAFF_SEED_PIN=481902 on bagbuddy-api and redeployed. Deployment SUCCESS,
  runtime log "BagBuddy API ready", /api/ 200, admin login 200, /admin dashboard renders with live data.
- Open follow-up (P1): on refetch, diff workspace backend/.env keys vs Railway vars and warn/auto-add
  missing keys BEFORE deploying; also poll runtime status after build so the panel doesn't report
  a crashed service as "live".

### 2026-09-16 — Delivery 7 Tocoa deployed to Railway (React CRA + FastAPI)
- App: multi-portal delivery platform for Tocoa, Honduras (admin panel, customer app, driver app,
  restaurant portal), Spanish/English toggle, WebSocket realtime order sync, image uploads via
  Emergent managed object storage (storage.py needs EMERGENT_LLM_KEY).
- Provisioned with scripts/setup_delivery7tocoa.py: Railway project `delivery7tocoa`,
  services delivery7tocoa-api / delivery7tocoa-web / Mongo (mongo:7 + /data/db volume).
  - API: https://delivery7tocoa-api-production.up.railway.app
  - Web: https://delivery7tocoa-web-production.up.railway.app
- API env: MONGO_URL=${{Mongo.MONGO_URL}}, DB_NAME=delivery7tocoa, CORS_ORIGINS=web URL, EMERGENT_LLM_KEY.
- Both deployed via panel /api/projects/{id}/refetch; both registered with the emergent source URL+pwd
  so Refetch works later. Seed runs on API startup (seed_if_empty).
- Verified: /api/ 200 ("Delivery 7 Tocoa API"), /api/restaurants 8, /api/orders and /api/drivers populated,
  web landing renders (desktop + 390px mobile), admin login -> dashboard shows 309 pedidos / 8 restaurantes /
  L 61,910 ingresos from live production Mongo.
- Note: admin login is frontend-only (no backend auth) in the source app — flagged, not changed.

### 2026-09-16 (later) — Delivery 7 Tocoa: missing sections in production (FIXED)
- Symptom: "Flores y Regalos", "Mejor calificados", "Platillos populares" visible in the Emergent
  preview but empty on the published app, even right after a Refetch.
- Root cause: NOT a deploy gap. The fetcher pulled all 7 backend + 72 frontend files and both
  services redeployed fine (landing text already showed the newer "Mandaditos 7"). The app's
  `seed_if_empty()` returns early whenever `restaurants` is non-empty, so production Mongo kept the
  day-one seed (8 restaurants) and never received the newer seed entries r9 Floristería Bella Rosa,
  r10 Detalles y Regalos Tocoa, their flower/gift menus and the gift catalogue.
- Fix: redeployed api + web from the current workspace, then called POST /api/admin/reset on
  production (force reseed, user approved the data wipe).
- Verified: /api/restaurants now returns 10 incl. r9/r10 with type=regalos, /api/menus/r9 returns
  Ramos / Arreglos florales / Cajas de rosas, 300 demo orders regenerated, and the customer home at
  /app/home (after demo login) renders the Flores y Regalos category chip, the Caja de Rosas Premium
  "Oferta del día", Mejor calificados and the two new shops.
- LESSON for the panel: seed-on-startup guards mean a code deploy does NOT migrate data. Any app
  whose seed grows needs an explicit reseed/migration step after refetch.

### 2026-09-16 — Panel feature: one-click "Reseed demo data" per project
- POST /api/projects/{pid}/reseed (server.py, ReseedInput). Calls the DEPLOYED app's own seed/reset
  endpoint over its public api_url. Uses the project's saved `reseed_path` when present, otherwise
  auto-probes /api/admin/reset, /api/admin/seed, /api/seed, /api/seed/reset, /api/dev/seed and saves
  whichever one answers. Stores `reseed_path` + `last_reseed_at`; on total failure returns a 400 that
  lists every path tried with its status so it's obvious the app has no seed endpoint.
- UI: new "Reseed demo data" block in ProjectSettingsModal.jsx — editable path (blank = auto-detect),
  a type-RESEED confirm gate, amber destructive styling, and a "last <timestamp>" stamp.
  testids: reseed-path-input, reseed-confirm-input, reseed-btn.
- Also fixed: the modal's reset effect was keyed on the whole `project` object, so the polling list
  refresh wiped whatever the user was mid-typing (the confirm box only ever kept one character).
  Now keyed on `project?.id`.
- Verified: auto-detect resolved /api/admin/reset for delivery7tocoa-api (200, path persisted);
  marine-api correctly 400s listing all 5 probes; UI gate enables only on RESEED and a real click
  reseeded production and updated the last-run stamp. Mobile 390px renders with no overflow.
