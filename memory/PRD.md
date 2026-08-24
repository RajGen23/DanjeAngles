# PRD — selfhost: Self-Hosting Control Panel

## Original Problem Statement
"now i am planning to build my own hosting, where i will upload the emergent file (the apps or the website i build on emergent so instead of paying for individual apps we can take some dedicated vps hosting) and u gonna host the react website with all backend admin, i want the minimal looks beautiful"

## User Choices
- MVP with SIMULATED deployments (no real VPS access yet) — defaults assumed
- No login, open dashboard
- All features: upload zip + deploy logs, projects start/stop/restart, resource monitoring, custom domains
- Light minimal design (Swiss high-contrast minimalism, Manrope + IBM Plex Sans/Mono, #FF4400 accent)

## Architecture
- FastAPI + MongoDB (collections: projects, deployments, domains), all routes /api-prefixed
- React single-page dashboard: StatsCards, ProjectsList, DeployPanel (terminal-style logs), DomainsPanel, ResourceCharts (Recharts)
- Deploy simulation: asyncio background task streams ~13 log lines over ~12s; frontend polls GET /api/deployments/{id}
- DNS propagation simulated: domain flips propagating → active after ~8s

## Implemented (June 2026)
- GET /api/stats, GET /api/projects, POST /api/projects/{id}/action (start/stop/restart), DELETE project
- POST /api/deploy (multipart zip + name), GET /api/deployments[/{id}]
- GET /api/resources (24-point CPU/RAM/disk series), domains CRUD with validation (400 invalid, 409 duplicate)
- Seeded demo projects: portfolio-site, crm-dashboard
- Tested: 100% backend + frontend pass (iteration_1)

## MOCKED / SIMULATED
- Deployment engine, resource metrics, DNS propagation — all simulated (no real hosting)

## Backlog
- P0: none remaining for MVP
- P1: real static-site hosting of uploaded React builds (serve extracted zip at a preview path), deployment history panel with rollback
- P2: auth (JWT), env-var management per project, real VPS agent integration, per-project resource metrics

## Test Credentials
None — no auth.
