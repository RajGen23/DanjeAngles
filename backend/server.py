"""Selfhost control panel — REAL Railway.app-backed hosting."""
import asyncio
import logging
import os
import re
import shutil
import tempfile
import uuid
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, File, Form, HTTPException, UploadFile
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from starlette.middleware.cors import CORSMiddleware

import railway_client as rw
import github_client as gh
import emergent_fetcher as ef

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

OWNER_EMAIL = os.environ.get("OWNER_EMAIL", "owner@selfhost.app")
UPLOAD_ROOT = Path("/tmp/selfhost_uploads")
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)

app = FastAPI()
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9-]", "", name.lower().replace(" ", "-"))[:40] or "app"


# ---------------- Models ----------------
class ActionInput(BaseModel):
    action: str


class DomainInput(BaseModel):
    hostname: str
    project_id: str


class EnvVarInput(BaseModel):
    key: str
    value: str


class RedeployInput(BaseModel):
    pass


class ProjectTokenInput(BaseModel):
    token: str


class GithubSyncInput(BaseModel):
    enabled: bool


class ProjectUrlsInput(BaseModel):
    frontend_url: Optional[str] = None
    admin_email: Optional[str] = None
    admin_password: Optional[str] = None


class ReseedInput(BaseModel):
    path: Optional[str] = None  # e.g. "/api/admin/reset"; auto-probed when omitted


class EmergentSourceInput(BaseModel):
    url: str
    password: str
    workspace_root: str = "/app"
    subdir: Optional[str] = None  # "backend" or "frontend" for split deploys
    dockerfile: Optional[str] = None
    railway_json: Optional[str] = None


def _rand_password(n: int = 24) -> str:
    import secrets, string
    alpha = string.ascii_letters + string.digits
    return "".join(secrets.choice(alpha) for _ in range(n))


# ---------------- Helpers ----------------
def safe_extract(zip_path: Path, dest: Path) -> None:
    root = dest.resolve()
    with zipfile.ZipFile(zip_path) as z:
        total = 0
        for info in z.infolist():
            name = Path(info.filename)
            if name.is_absolute() or ".." in name.parts:
                raise ValueError("Unsafe zip path")
            total += info.file_size
            if total > 500 * 1024 * 1024:
                raise ValueError("Extracted archive exceeds 500 MB")
        z.extractall(root)
    # If the zip has a single top-level folder, flatten it
    entries = [e for e in root.iterdir() if not e.name.startswith("__MACOSX")]
    if len(entries) == 1 and entries[0].is_dir():
        inner = entries[0]
        for item in inner.iterdir():
            shutil.move(str(item), str(root / item.name))
        inner.rmdir()


async def _log(deployment_id: str, level: str, msg: str) -> None:
    await db.deployments.update_one(
        {"id": deployment_id},
        {"$push": {"logs": {"ts": now_iso(), "level": level, "msg": msg}}},
    )


async def _set_progress(deployment_id: str, progress: int, status: Optional[str] = None) -> None:
    upd = {"progress": progress}
    if status:
        upd["status"] = status
    await db.deployments.update_one({"id": deployment_id}, {"$set": upd})


# ---------------- Deploy Task ----------------
async def run_real_deploy(deployment_id: str, project_local_id: str, zip_path: str,
                           app_name: str, initial_env: dict[str, str]) -> None:
    """The main deployment orchestration on Railway."""
    slug = slugify(app_name)
    workdir = UPLOAD_ROOT / f"src_{deployment_id}"
    workdir.mkdir(parents=True, exist_ok=True)
    try:
        await _log(deployment_id, "info", f"Extracting archive to {workdir.name}...")
        safe_extract(Path(zip_path), workdir)
        await _set_progress(deployment_id, 10)

        framework = rw.detect_framework(workdir)
        await _log(deployment_id, "info", f"Detected framework: {framework}")
        rw.ensure_railway_config(workdir, framework)

        project = await db.projects.find_one({"id": project_local_id}, {"_id": 0})
        if not project:
            await _log(deployment_id, "error", "Project record missing")
            await _set_progress(deployment_id, 100, "failed")
            return

        # Project-scoped token fallback for accounts whose token can't reach this project
        if project.get("railway_project_token"):
            rw.PROJECT_TOKEN.set(project["railway_project_token"])

        # Create Railway project + service if not present
        rw_project_id = project.get("railway_project_id")
        rw_service_id = project.get("railway_service_id")
        rw_env_id = project.get("railway_env_id")

        if not rw_project_id:
            await _log(deployment_id, "info", f"Creating Railway project '{slug}'...")
            created = await rw.create_project(f"selfhost-{slug}")
            rw_project_id = created["id"]
            envs = created.get("environments", {}).get("edges", [])
            rw_env_id = envs[0]["node"]["id"] if envs else None
            await _set_progress(deployment_id, 20)

        if not rw_service_id:
            await _log(deployment_id, "info", f"Creating service '{slug}'...")
            svc = await rw.create_service(rw_project_id, slug)
            rw_service_id = svc["id"]
            await _set_progress(deployment_id, 30)

        # Attach a public Railway domain if not yet set
        rw_public_url = project.get("url")
        if not rw_public_url or "selfhost.app" in rw_public_url:
            try:
                dom = await rw.create_service_domain(rw_project_id, rw_service_id, rw_env_id)
                rw_public_url = f"https://{dom['domain']}"
                await _log(deployment_id, "ok", f"Public URL assigned: {rw_public_url}")
            except Exception as e:
                await _log(deployment_id, "info", f"Domain assign skipped: {e}")

        # Push env vars if any
        if initial_env:
            await _log(deployment_id, "info", f"Syncing {len(initial_env)} env variable(s)...")
            await rw.upsert_variables(rw_project_id, rw_env_id, rw_service_id, initial_env, replace=False, skip_deploys=True)
            await _set_progress(deployment_id, 35)

        # Save the Railway IDs back to our project
        await db.projects.update_one({"id": project_local_id}, {"$set": {
            "railway_project_id": rw_project_id,
            "railway_service_id": rw_service_id,
            "railway_env_id": rw_env_id,
            "url": rw_public_url or project.get("url"),
            "framework": framework,
        }})

        # Upload source via CLI (uses per-project token when set)
        await _log(deployment_id, "info", "Uploading source to Railway (railway up)...")
        await _set_progress(deployment_id, 45)
        proj_token = project.get("railway_project_token")
        ok, out = await rw.railway_up(str(workdir), rw_project_id, rw_service_id, rw_env_id, token=proj_token)
        for line in out.splitlines()[-30:]:
            if line.strip():
                await _log(deployment_id, "info", line.strip())
        if not ok:
            await _log(deployment_id, "error", "railway up failed — see logs above")
            await _set_progress(deployment_id, 100, "failed")
            await db.projects.update_one({"id": project_local_id}, {"$set": {"status": "failed"}})
            return
        await _set_progress(deployment_id, 60)
        await _log(deployment_id, "ok", "Source uploaded — waiting for build...")

        # Poll deployment status via Railway API
        rw_deployment_id = None
        for _ in range(20):
            await asyncio.sleep(3)
            try:
                deps = await rw.list_service_deployments(rw_service_id, rw_env_id, limit=1)
            except Exception as e:
                await _log(deployment_id, "info", f"(waiting for deployment record: {e})")
                continue
            if deps:
                rw_deployment_id = deps[0]["id"]
                break

        if not rw_deployment_id:
            await _log(deployment_id, "error", "Could not locate Railway deployment id")
            await _set_progress(deployment_id, 100, "failed")
            return

        await db.deployments.update_one({"id": deployment_id}, {"$set": {"railway_deployment_id": rw_deployment_id}})
        seen: set = set()
        terminal = {"SUCCESS", "FAILED", "CRASHED", "REMOVED", "SKIPPED"}
        backoff = 6  # Railway rate-limits aggressive polling; start gentle
        for i in range(120):  # up to ~15 min at the default interval
            await asyncio.sleep(backoff)
            rate_limited = False
            try:
                logs = await rw.get_build_logs(rw_deployment_id, limit=200)
            except Exception as e:
                logs = []
                if "429" in str(e):
                    rate_limited = True
                else:
                    await _log(deployment_id, "info", f"(log fetch retry: {e})")
            for row in logs:
                key = (row.get("timestamp"), row.get("message"))
                if key in seen:
                    continue
                seen.add(key)
                lvl = "error" if row.get("severity") in ("error", "ERROR") else "info"
                await _log(deployment_id, lvl, row.get("message", "").rstrip())
            try:
                dep = await rw.get_deployment(rw_deployment_id)
                st = dep.get("status", "").upper()
                progress = min(60 + i, 95)
                await _set_progress(deployment_id, progress)
                if st in terminal:
                    if st == "SUCCESS":
                        url = dep.get("url") or dep.get("staticUrl")
                        if url and not url.startswith("http"):
                            url = f"https://{url}"
                        final_url = url or rw_public_url
                        # Prefer custom domain (set by user via /api/domains) over Railway subdomain
                        proj_now = await db.projects.find_one({"id": project_local_id}, {"_id": 0, "custom_domain": 1})
                        if proj_now and proj_now.get("custom_domain"):
                            final_url = proj_now["custom_domain"]
                        await _log(deployment_id, "ok", f"Deployment live at {final_url}")
                        await db.deployments.update_one({"id": deployment_id}, {"$set": {
                            "status": "live", "progress": 100, "finished_at": now_iso(),
                        }})
                        await db.projects.update_one({"id": project_local_id}, {"$set": {
                            "status": "running", "url": final_url,
                            "last_deployed_at": now_iso(),
                        }, "$inc": {"deploy_count": 1}})
                        # GitHub mirror if enabled + token present
                        proj_fresh = await db.projects.find_one({"id": project_local_id}, {"_id": 0})
                        if proj_fresh and proj_fresh.get("github_sync") and os.environ.get("GITHUB_PAT"):
                            try:
                                repo_name = f"emergent-hosted-{proj_fresh.get('slug') or slugify(proj_fresh['name'])}"
                                await _log(deployment_id, "info", f"Mirroring source to GitHub ({repo_name})...")
                                repo = await gh.ensure_repo(repo_name, private=True,
                                                            description=f"Auto-mirror for {proj_fresh['name']}")
                                gh_ok, gh_out = await gh.push_source(
                                    str(workdir), repo["owner"], repo["name"],
                                    commit_msg=f"Deploy v{proj_fresh.get('deploy_count', 0) + 1}")
                                if gh_ok:
                                    await _log(deployment_id, "ok", f"GitHub mirror updated: {repo['html_url']}")
                                    await db.projects.update_one({"id": project_local_id}, {"$set": {
                                        "github_repo_url": repo["html_url"],
                                        "github_last_push_at": now_iso(),
                                    }})
                                else:
                                    await _log(deployment_id, "error", f"GitHub mirror failed: {gh_out[:400]}")
                            except Exception as ghe:
                                await _log(deployment_id, "error", f"GitHub mirror error: {ghe}")
                    else:
                        await _log(deployment_id, "error", f"Build finished with status {st}")
                        await db.deployments.update_one({"id": deployment_id}, {"$set": {
                            "status": "failed", "progress": 100, "finished_at": now_iso(),
                        }})
                        await db.projects.update_one({"id": project_local_id}, {"$set": {"status": "failed"}})
                    return
            except Exception as e:
                if "429" in str(e):
                    rate_limited = True
                else:
                    await _log(deployment_id, "info", f"(status poll retry: {e})")
            if rate_limited:
                backoff = min(backoff * 2, 120)
                if i % 5 == 0:
                    await _log(deployment_id, "info",
                               f"Railway API rate-limited — backing off to {backoff}s "
                               "(the build keeps running on Railway)")
            else:
                backoff = 6

        # Timeout
        await _log(deployment_id, "error", "Deployment polling timed out")
        await _set_progress(deployment_id, 100, "failed")
    except Exception as e:
        logger.exception("deploy failed")
        if "429" in str(e):
            await _log(deployment_id, "error",
                       "Railway API rate limit hit before the upload could start — "
                       "wait a few minutes and click Refetch again. Nothing was deployed.")
        else:
            await _log(deployment_id, "error", f"Fatal: {e}")
        await _set_progress(deployment_id, 100, "failed")
    finally:
        # Cleanup extracted source
        try:
            shutil.rmtree(workdir, ignore_errors=True)
            Path(zip_path).unlink(missing_ok=True)
        except Exception:
            pass


# ---------------- Stats ----------------
@api.get("/stats")
async def stats():
    running = await db.projects.count_documents({"status": "running"})
    total_projects = await db.projects.count_documents({})
    total_deployments = await db.deployments.count_documents({})
    agg = await db.projects.aggregate([{"$group": {"_id": None, "s": {"$sum": "$size_mb"}}}]).to_list(1)
    storage = round(agg[0]["s"], 1) if agg and agg[0].get("s") else 0
    return {
        "apps_running": running,
        "total_projects": total_projects,
        "total_deployments": total_deployments,
        "storage_mb": storage,
        "uptime_pct": 99.98,
        "owner": OWNER_EMAIL,
    }


# ---------------- Projects ----------------
@api.get("/projects")
async def list_projects():
    projects = await db.projects.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    # Auto-heal: any project stuck in 'deploying' but Railway shows a terminal state
    # (this happens when our poll loop times out before the build finishes)
    for p in projects:
        if p.get("status") != "deploying":
            continue
        svc, env = p.get("railway_service_id"), p.get("railway_env_id")
        if not (svc and env):
            continue
        try:
            deps = await rw.list_service_deployments(svc, env, limit=1)
        except Exception:
            continue
        if not deps:
            continue
        latest = deps[0]
        st = (latest.get("status") or "").upper()
        if st == "SUCCESS":
            url = latest.get("url") or latest.get("staticUrl")
            if url and not url.startswith("http"):
                url = f"https://{url}"
            # Prefer custom domain when the project has one attached
            if p.get("custom_domain"):
                url = p["custom_domain"]
            upd = {"status": "running", "last_deployed_at": now_iso()}
            if url:
                upd["url"] = url
            await db.projects.update_one({"id": p["id"]}, {"$set": upd})
            p.update(upd)
        elif st in ("FAILED", "CRASHED"):
            await db.projects.update_one({"id": p["id"]}, {"$set": {"status": "failed"}})
            p["status"] = "failed"
    return projects


@api.post("/projects/{pid}/action")
async def project_action(pid: str, body: ActionInput):
    project = await db.projects.find_one({"id": pid}, {"_id": 0})
    if not project:
        raise HTTPException(404, "Project not found")
    if body.action not in ("start", "stop", "restart", "redeploy"):
        raise HTTPException(400, "Invalid action")
    rw_service_id = project.get("railway_service_id")
    rw_env_id = project.get("railway_env_id")
    if body.action == "redeploy":
        if not (rw_service_id and rw_env_id):
            raise HTTPException(400, "Project has no Railway deployment yet")
        try:
            await rw.redeploy_service(rw_service_id, rw_env_id)
        except Exception as e:
            raise HTTPException(500, f"Redeploy failed: {e}")
        await db.projects.update_one({"id": pid}, {"$set": {"status": "deploying"}})
        return {"id": pid, "status": "deploying"}
    # start/stop/restart => local status flip (Railway doesn't have stop; would need scaling)
    new_status = "stopped" if body.action == "stop" else "running"
    await db.projects.update_one({"id": pid}, {"$set": {"status": new_status}})
    return {"id": pid, "status": new_status}


# ---------------- Mongo add-on ----------------
@api.post("/projects/{pid}/mongo")
async def provision_mongo(pid: str):
    project = await db.projects.find_one({"id": pid}, {"_id": 0})
    if not project:
        raise HTTPException(404, "Project not found")
    if project.get("mongo_service_id"):
        raise HTTPException(409, "MongoDB already provisioned for this project")
    rw_project_id = project.get("railway_project_id")
    rw_env_id = project.get("railway_env_id")
    rw_app_service_id = project.get("railway_service_id")
    if not (rw_project_id and rw_env_id and rw_app_service_id):
        raise HTTPException(400, "Deploy the app once before adding MongoDB")

    try:
        # Create mongo service from Docker image
        mongo_svc = await rw.create_service(rw_project_id, "Mongo", image="mongo:7")
        mongo_id = mongo_svc["id"]
        password = _rand_password()
        creds = {
            "MONGO_INITDB_ROOT_USERNAME": "root",
            "MONGO_INITDB_ROOT_PASSWORD": password,
            "MONGO_URL": f"mongodb://root:{password}@${{{{RAILWAY_PRIVATE_DOMAIN}}}}:27017",
        }
        await rw.upsert_variables(rw_project_id, rw_env_id, mongo_id, creds, replace=False, skip_deploys=True)
        # Persistent volume
        try:
            await rw.create_volume(rw_project_id, mongo_id, "/data/db", environment_id=rw_env_id)
        except Exception as e:
            logger.warning("volume create failed: %s", e)
        # Wire MONGO_URL reference into the app service
        await rw.upsert_variables(rw_project_id, rw_env_id, rw_app_service_id, {
            "MONGO_URL": "${{Mongo.MONGO_URL}}",
            "DB_NAME": slugify(project["name"]),
        }, replace=False, skip_deploys=False)
        await db.projects.update_one({"id": pid}, {"$set": {
            "mongo_service_id": mongo_id,
            "mongo_provisioned_at": now_iso(),
        }})
        # Reflect in local env_vars mirror
        await db.env_vars.update_one(
            {"project_id": pid, "key": "MONGO_URL"},
            {"$set": {"project_id": pid, "key": "MONGO_URL", "value": "${{Mongo.MONGO_URL}}", "updated_at": now_iso()}},
            upsert=True,
        )
        await db.env_vars.update_one(
            {"project_id": pid, "key": "DB_NAME"},
            {"$set": {"project_id": pid, "key": "DB_NAME", "value": slugify(project["name"]), "updated_at": now_iso()}},
            upsert=True,
        )
        return {"mongo_service_id": mongo_id, "status": "provisioning",
                "note": "MongoDB is starting up. Your app will get MONGO_URL on next deploy."}
    except Exception as e:
        logger.exception("mongo provision failed")
        raise HTTPException(500, f"Mongo provisioning failed: {e}")


@api.delete("/projects/{pid}/mongo")
async def deprovision_mongo(pid: str):
    project = await db.projects.find_one({"id": pid}, {"_id": 0})
    if not project:
        raise HTTPException(404, "Project not found")
    mongo_id = project.get("mongo_service_id")
    if not mongo_id:
        raise HTTPException(404, "No MongoDB service on this project")
    try:
        await rw.delete_service(mongo_id)
    except Exception as e:
        logger.warning("mongo service delete failed: %s", e)
    await db.projects.update_one({"id": pid}, {"$unset": {"mongo_service_id": "", "mongo_provisioned_at": ""}})
    return {"deleted": True}


# ---------------- Deploy history & rollback ----------------
@api.get("/projects/{pid}/deployments")
async def project_deployments(pid: str):
    project = await db.projects.find_one({"id": pid}, {"_id": 0})
    if not project:
        raise HTTPException(404, "Project not found")
    rw_service_id = project.get("railway_service_id")
    rw_env_id = project.get("railway_env_id")
    if not (rw_service_id and rw_env_id):
        return []
    try:
        return await rw.list_service_deployments(rw_service_id, rw_env_id, limit=25)
    except Exception as e:
        raise HTTPException(500, f"Failed to list deployments: {e}")


@api.post("/deployments/{railway_deployment_id}/rollback")
async def rollback_deployment(railway_deployment_id: str):
    try:
        ok = await rw.deployment_rollback(railway_deployment_id)
    except Exception as e:
        raise HTTPException(500, f"Rollback failed: {e}")
    if not ok:
        raise HTTPException(400, "Rollback rejected by Railway")
    return {"rolled_back_to": railway_deployment_id}


# ---------------- Reseed demo data ----------------
RESEED_CANDIDATES = ["/api/admin/reset", "/api/admin/seed", "/api/seed",
                     "/api/seed/reset", "/api/dev/seed"]


@api.post("/projects/{pid}/reseed")
async def reseed_project(pid: str, body: ReseedInput):
    """Call the deployed app's own seed/reset endpoint so data catches up with code.

    Seed-on-startup guards (`if count > 0: return`) mean a code deploy never migrates
    data, so newly added seed records stay missing in production until this is run.
    """
    project = await db.projects.find_one({"id": pid}, {"_id": 0})
    if not project:
        raise HTTPException(404, "Project not found")
    base = (project.get("api_url") or project.get("url") or "").rstrip("/")
    if not base:
        raise HTTPException(400, "Project has no API URL — set it in Settings first")

    paths = [body.path.strip()] if body.path and body.path.strip() else (
        [project["reseed_path"]] if project.get("reseed_path") else RESEED_CANDIDATES)
    import httpx
    tried = []
    async with httpx.AsyncClient(timeout=120, follow_redirects=True) as c:
        for path in paths:
            url = base + ("/" + path.lstrip("/"))
            try:
                r = await c.post(url)
            except Exception as e:
                tried.append(f"{path} → {e}")
                continue
            if r.status_code < 400:
                await db.projects.update_one({"id": pid}, {"$set": {
                    "reseed_path": path, "last_reseed_at": now_iso()}})
                return {"ok": True, "path": path, "status": r.status_code,
                        "response": r.text[:500]}
            tried.append(f"{path} → HTTP {r.status_code}")
    raise HTTPException(400, "No reseed endpoint responded. Tried: " + "; ".join(tried))


@api.delete("/projects/{pid}")
async def delete_project(pid: str):
    project = await db.projects.find_one({"id": pid}, {"_id": 0})
    if not project:
        raise HTTPException(404, "Project not found")
    rw_project_id = project.get("railway_project_id")
    if rw_project_id:
        try:
            await rw.delete_project(rw_project_id)
        except Exception as e:
            logger.warning("Failed to delete Railway project %s: %s", rw_project_id, e)
    await db.projects.delete_one({"id": pid})
    await db.domains.delete_many({"project_id": pid})
    await db.env_vars.delete_many({"project_id": pid})
    return {"deleted": True}


# ---------------- Env vars ----------------
@api.get("/projects/{pid}/env")
async def list_env(pid: str):
    project = await db.projects.find_one({"id": pid}, {"_id": 0})
    if not project:
        raise HTTPException(404, "Project not found")
    rw_project_id = project.get("railway_project_id")
    rw_service_id = project.get("railway_service_id")
    rw_env_id = project.get("railway_env_id")
    # Prefer live Railway values if provisioned
    if rw_project_id and rw_service_id and rw_env_id:
        try:
            vars_ = await rw.get_variables(rw_project_id, rw_env_id, rw_service_id)
            return [{"key": k, "value": v, "source": "railway"} for k, v in sorted(vars_.items())]
        except Exception as e:
            logger.warning("Fetch env from Railway failed: %s", e)
    # Fallback: local mongo (pre-provisioning stage)
    docs = await db.env_vars.find({"project_id": pid}, {"_id": 0}).to_list(200)
    return [{"key": d["key"], "value": d["value"], "source": "local"} for d in docs]


@api.post("/projects/{pid}/env")
async def set_env(pid: str, body: EnvVarInput):
    project = await db.projects.find_one({"id": pid}, {"_id": 0})
    if not project:
        raise HTTPException(404, "Project not found")
    if not re.match(r"^[A-Za-z_][A-Za-z0-9_]*$", body.key):
        raise HTTPException(400, "Invalid env variable name")
    await db.env_vars.update_one(
        {"project_id": pid, "key": body.key},
        {"$set": {"project_id": pid, "key": body.key, "value": body.value, "updated_at": now_iso()}},
        upsert=True,
    )
    rw_project_id = project.get("railway_project_id")
    rw_service_id = project.get("railway_service_id")
    rw_env_id = project.get("railway_env_id")
    if rw_project_id and rw_service_id and rw_env_id:
        try:
            await rw.upsert_variables(rw_project_id, rw_env_id, rw_service_id, {body.key: body.value}, replace=False, skip_deploys=True)
        except Exception as e:
            raise HTTPException(500, f"Railway env update failed: {e}")
    return {"key": body.key, "value": body.value}


@api.delete("/projects/{pid}/env/{key}")
async def delete_env(pid: str, key: str):
    project = await db.projects.find_one({"id": pid}, {"_id": 0})
    if not project:
        raise HTTPException(404, "Project not found")
    await db.env_vars.delete_one({"project_id": pid, "key": key})
    rw_project_id = project.get("railway_project_id")
    rw_service_id = project.get("railway_service_id")
    rw_env_id = project.get("railway_env_id")
    if rw_project_id and rw_service_id and rw_env_id:
        try:
            await rw.delete_variable(rw_project_id, rw_env_id, rw_service_id, key)
        except Exception as e:
            logger.warning("Env delete on Railway failed: %s", e)
    return {"deleted": True}


# ---------------- Deploy ----------------
@api.post("/deploy")
async def deploy(file: UploadFile = File(...), name: str = Form(...), project_id: Optional[str] = Form(None)):
    if not file.filename.lower().endswith(".zip"):
        raise HTTPException(400, "Only .zip archives are supported")
    content = await file.read()
    if len(content) > 250 * 1024 * 1024:
        raise HTTPException(413, "Archive exceeds 250 MB")
    size_mb = round(len(content) / (1024 * 1024), 2) or 0.01
    slug = slugify(name)
    zip_path = UPLOAD_ROOT / f"{uuid.uuid4()}.zip"
    zip_path.write_bytes(content)

    # Reuse existing project when name matches (or explicit project_id supplied) => new deploy version
    project = None
    if project_id:
        project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        project = await db.projects.find_one({"name": name}, {"_id": 0})
    if project:
        pid = project["id"]
        await db.projects.update_one({"id": pid}, {"$set": {"status": "deploying", "size_mb": size_mb}})
        initial_env = {d["key"]: d["value"] for d in await db.env_vars.find({"project_id": pid}, {"_id": 0}).to_list(500)}
    else:
        pid = str(uuid.uuid4())
        initial_env = {}
        await db.projects.insert_one({
            "id": pid, "name": name, "slug": slug, "framework": "detecting",
            "status": "deploying", "url": None, "size_mb": size_mb,
            "deploy_count": 0, "created_at": now_iso(), "last_deployed_at": None,
            "railway_project_id": None, "railway_service_id": None, "railway_env_id": None,
        })

    deployment_id = str(uuid.uuid4())
    await db.deployments.insert_one({
        "id": deployment_id, "project_id": pid, "project_name": name,
        "status": "building", "progress": 0,
        "logs": [{"ts": now_iso(), "level": "info", "msg": f"Deployment queued for '{name}' ({file.filename})"}],
        "created_at": now_iso(), "finished_at": None, "railway_deployment_id": None,
    })
    asyncio.create_task(run_real_deploy(deployment_id, pid, str(zip_path), name, initial_env))
    return {"deployment_id": deployment_id, "project_id": pid}


@api.get("/deployments/{did}")
async def get_deployment(did: str):
    dep = await db.deployments.find_one({"id": did}, {"_id": 0})
    if not dep:
        raise HTTPException(404, "Deployment not found")
    return dep


@api.get("/deployments")
async def list_deployments():
    return await db.deployments.find({}, {"_id": 0, "logs": 0}).sort("created_at", -1).to_list(20)


# ---------------- Resources (light live metrics from Railway meta) ----------------
@api.get("/resources")
async def resources():
    # Cheap live series based on how many services & recent deploys — real hosting
    # avoids the pretense of per-VPS CPU/RAM since Railway abstracts that away.
    running = max(await db.projects.count_documents({"status": "running"}), 1)
    total = await db.projects.count_documents({})
    recent = await db.deployments.count_documents({"created_at": {"$gte": (datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)).isoformat()}})
    return {
        "services_active": running,
        "services_total": total,
        "deploys_today": recent,
        "provider": "Railway",
    }


# ---------------- Domains ----------------
@api.get("/domains")
async def list_domains():
    docs = await db.domains.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    # Refresh live status for each
    for d in docs:
        rw_id = d.get("railway_domain_id")
        if rw_id:
            try:
                owner = await db.projects.find_one({"id": d.get("project_id")},
                                                   {"_id": 0, "railway_project_id": 1,
                                                    "railway_project_token": 1})
                if not owner or not owner.get("railway_project_id"):
                    continue
                if owner.get("railway_project_token"):
                    rw.PROJECT_TOKEN.set(owner["railway_project_token"])
                live = await rw.get_custom_domain_status(rw_id, owner["railway_project_id"])
                st = live.get("status") or {}
                d["dns_records"] = st.get("dnsRecords") or []
                # Simplify status label
                records = d["dns_records"]
                ok_states = {"valid", "DNS_RECORD_STATUS_PROPAGATED"}
                if records and all(r.get("status") in ok_states for r in records):
                    d["dns_status"] = "active"
                elif records:
                    d["dns_status"] = "propagating"
                else:
                    d["dns_status"] = "pending"
                d["ssl"] = d["dns_status"] == "active"
            except Exception as e:
                logger.warning("domain status refresh failed: %s", e)
    return docs


@api.post("/domains")
async def add_domain(body: DomainInput):
    hostname = body.hostname.strip().lower()
    if not re.match(r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$", hostname):
        raise HTTPException(400, "Invalid domain format")
    if await db.domains.find_one({"hostname": hostname}):
        raise HTTPException(409, "Domain already added")
    project = await db.projects.find_one({"id": body.project_id}, {"_id": 0})
    if not project:
        raise HTTPException(404, "Project not found")
    rw_service_id = project.get("railway_service_id")
    rw_env_id = project.get("railway_env_id")
    if not (rw_service_id and rw_env_id):
        raise HTTPException(400, "Deploy the project once before attaching a domain")
    try:
        created = await rw.create_custom_domain(project["railway_project_id"], rw_service_id, rw_env_id, hostname)
    except Exception as e:
        raise HTTPException(500, f"Failed to attach: {e}")
    doc = {
        "id": str(uuid.uuid4()),
        "hostname": hostname,
        "project_id": body.project_id,
        "project_name": project["name"],
        "railway_domain_id": created["id"],
        "dns_records": (created.get("status") or {}).get("dnsRecords", []),
        "dns_status": "propagating",
        "ssl": False,
        "created_at": now_iso(),
    }
    await db.domains.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/domains/{did}")
async def delete_domain(did: str):
    d = await db.domains.find_one({"id": did}, {"_id": 0})
    if not d:
        raise HTTPException(404, "Domain not found")
    rw_id = d.get("railway_domain_id")
    if rw_id:
        try:
            await rw.delete_custom_domain(rw_id)
        except Exception as e:
            logger.warning("Failed to delete Railway domain: %s", e)
    await db.domains.delete_one({"id": did})
    return {"deleted": True}


# ---------------- Owner meta ----------------
@api.get("/owner")
async def owner():
    # Basic Railway sanity check
    ok, name = True, "Railway"
    try:
        await rw.list_projects()
    except Exception as e:
        ok = False
        name = str(e)
    # GitHub connectivity
    gh_user = None
    if os.environ.get("GITHUB_PAT"):
        try:
            u = await gh.whoami()
            gh_user = u.get("login") if u else None
        except Exception:
            gh_user = None
    return {"email": OWNER_EMAIL, "provider": "Railway", "connected": ok,
            "detail": name if not ok else None,
            "github_user": gh_user}


# ---------------- Per-project settings ----------------
@api.post("/projects/{pid}/token")
async def set_project_token(pid: str, body: ProjectTokenInput):
    project = await db.projects.find_one({"id": pid}, {"_id": 0})
    if not project:
        raise HTTPException(404, "Project not found")
    tok = body.token.strip()
    if not tok:
        raise HTTPException(400, "Empty token")
    await db.projects.update_one({"id": pid}, {"$set": {"railway_project_token": tok}})
    return {"saved": True}


@api.post("/projects/{pid}/github")
async def toggle_github_sync(pid: str, body: GithubSyncInput):
    project = await db.projects.find_one({"id": pid}, {"_id": 0})
    if not project:
        raise HTTPException(404, "Project not found")
    if body.enabled and not os.environ.get("GITHUB_PAT"):
        raise HTTPException(400, "GITHUB_PAT is not configured server-side")
    await db.projects.update_one({"id": pid}, {"$set": {"github_sync": bool(body.enabled)}})
    return {"github_sync": bool(body.enabled)}


@api.post("/projects/{pid}/urls")
async def set_project_urls(pid: str, body: ProjectUrlsInput):
    project = await db.projects.find_one({"id": pid}, {"_id": 0})
    if not project:
        raise HTTPException(404, "Project not found")
    upd: dict = {}
    if body.frontend_url is not None:
        upd["frontend_url"] = body.frontend_url.strip() or None
    if body.admin_email is not None:
        upd["admin_email"] = body.admin_email.strip() or None
    if body.admin_password is not None:
        upd["admin_password"] = body.admin_password
    if upd:
        await db.projects.update_one({"id": pid}, {"$set": upd})
    return {"saved": True, "updated": list(upd.keys())}


@api.post("/projects/{pid}/emergent-source")
async def set_emergent_source(pid: str, body: EmergentSourceInput):
    project = await db.projects.find_one({"id": pid}, {"_id": 0})
    if not project:
        raise HTTPException(404, "Project not found")
    src = {
        "emergent_source_url": body.url.strip().rstrip("/"),
        "emergent_source_password": body.password,
        "emergent_workspace_root": body.workspace_root or "/app",
        "emergent_subdir": (body.subdir.strip() if body.subdir else None) or None,
    }
    if body.dockerfile is not None:
        src["docker_template"] = body.dockerfile
    if body.railway_json is not None:
        src["railway_json_template"] = body.railway_json
    await db.projects.update_one({"id": pid}, {"$set": src})
    return {"saved": True}


@api.post("/projects/{pid}/refetch")
async def refetch_and_deploy(pid: str):
    project = await db.projects.find_one({"id": pid}, {"_id": 0})
    if not project:
        raise HTTPException(404, "Project not found")
    src_url = project.get("emergent_source_url")
    src_pwd = project.get("emergent_source_password")
    if not (src_url and src_pwd):
        raise HTTPException(400, "Emergent source not configured — set it in project settings first")

    # Fetch → zip → kick off same deploy background task
    try:
        extra: list[str] = []
        expo_url = project.get("expo_preview_url")
        if expo_url:
            # Expo Router: routes are file-based, so discover the real file list
            # from the running preview's Metro source map.
            extra = await ef.discover_expo_sources(
                expo_url, workspace_root=project.get("emergent_workspace_root", "/app"))
            logger.info("refetch: discovered %d expo sources", len(extra))
        dest = await ef.fetch_workspace(
            src_url, src_pwd,
            workspace_root=project.get("emergent_workspace_root", "/app"),
            subdir=project.get("emergent_subdir"),
            extra_paths=extra,
        )
    except Exception as e:
        raise HTTPException(500, f"Fetch failed: {e}")

    # Inject cached Dockerfile / railway.json if present.
    # Always OVERWRITE — the cached template is authoritative (contains fixes
    # like the mobile canonical sed step that the fetched source may lack).
    docker_tmpl = project.get("docker_template")
    if docker_tmpl:
        (dest / "Dockerfile").write_text(docker_tmpl)
        logger.info("refetch: wrote cached docker_template (%d chars) to %s/Dockerfile", len(docker_tmpl), dest)
    rj_tmpl = project.get("railway_json_template")
    if rj_tmpl:
        (dest / "railway.json").write_text(rj_tmpl)

    # Zip
    import shutil
    zip_path = UPLOAD_ROOT / f"refetch_{uuid.uuid4()}.zip"
    shutil.make_archive(str(zip_path).replace(".zip", ""), "zip", str(dest))

    initial_env = {d["key"]: d["value"] for d in await db.env_vars.find(
        {"project_id": pid}, {"_id": 0}).to_list(500)}
    await db.projects.update_one({"id": pid}, {"$set": {
        "status": "deploying",
        "size_mb": round(zip_path.stat().st_size / (1024 * 1024), 2),
    }})
    deployment_id = str(uuid.uuid4())
    await db.deployments.insert_one({
        "id": deployment_id, "project_id": pid, "project_name": project["name"],
        "status": "building", "progress": 0,
        "logs": [{"ts": now_iso(), "level": "info",
                   "msg": f"Refetched {sum(1 for _ in dest.rglob('*') if _.is_file())} files from Emergent — starting deploy"}],
        "created_at": now_iso(), "finished_at": None, "railway_deployment_id": None,
    })
    asyncio.create_task(run_real_deploy(deployment_id, pid, str(zip_path), project["name"], initial_env))
    # Cleanup fetched dir after zip is on disk
    shutil.rmtree(dest, ignore_errors=True)
    return {"deployment_id": deployment_id, "project_id": pid}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup() -> None:
    # Reset legacy simulated seed data (they have no Railway ids and useless URLs)
    await db.projects.delete_many({"url": {"$regex": ".selfhost.app"}})


@app.on_event("shutdown")
async def shutdown_db_client() -> None:
    client.close()
