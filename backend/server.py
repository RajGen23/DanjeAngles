import asyncio
import logging
import os
import random
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, File, Form, HTTPException, UploadFile
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def slugify(name: str) -> str:
    return re.sub(r'[^a-z0-9-]', '', name.lower().replace(' ', '-'))[:40] or 'app'


class ActionInput(BaseModel):
    action: str


class DomainInput(BaseModel):
    hostname: str
    project_id: Optional[str] = None


# ---------- Seed ----------
SEED_PROJECTS = [
    {"name": "portfolio-site", "framework": "React", "size_mb": 4.2},
    {"name": "crm-dashboard", "framework": "React + FastAPI", "size_mb": 12.8},
]


@app.on_event("startup")
async def seed():
    if await db.projects.count_documents({}) == 0:
        for p in SEED_PROJECTS:
            slug = slugify(p["name"])
            await db.projects.insert_one({
                "id": str(uuid.uuid4()),
                "name": p["name"],
                "framework": p["framework"],
                "status": "running",
                "url": f"https://{slug}.selfhost.app",
                "size_mb": p["size_mb"],
                "deploy_count": random.randint(2, 9),
                "created_at": now_iso(),
                "last_deployed_at": now_iso(),
            })


# ---------- Stats ----------
@api.get("/stats")
async def stats():
    running = await db.projects.count_documents({"status": "running"})
    total_projects = await db.projects.count_documents({})
    total_deployments = await db.deployments.count_documents({})
    agg = await db.projects.aggregate([{"$group": {"_id": None, "s": {"$sum": "$size_mb"}}}]).to_list(1)
    storage = round(agg[0]["s"], 1) if agg else 0
    return {
        "apps_running": running,
        "total_projects": total_projects,
        "total_deployments": total_deployments,
        "storage_mb": storage,
        "uptime_pct": 99.98,
    }


# ---------- Projects ----------
@api.get("/projects")
async def list_projects():
    return await db.projects.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)


@api.post("/projects/{pid}/action")
async def project_action(pid: str, body: ActionInput):
    project = await db.projects.find_one({"id": pid}, {"_id": 0})
    if not project:
        raise HTTPException(404, "Project not found")
    if body.action not in ("start", "stop", "restart"):
        raise HTTPException(400, "Invalid action")
    new_status = "stopped" if body.action == "stop" else "running"
    await db.projects.update_one({"id": pid}, {"$set": {"status": new_status}})
    return {"id": pid, "status": new_status}


@api.delete("/projects/{pid}")
async def delete_project(pid: str):
    res = await db.projects.delete_one({"id": pid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Project not found")
    await db.domains.delete_many({"project_id": pid})
    return {"deleted": True}


# ---------- Deploy simulation ----------
DEPLOY_STEPS = [
    (0.6, "info", "Received archive ({size} MB) — verifying integrity..."),
    (0.8, "ok", "Archive verified. Extracting build files..."),
    (0.9, "info", "Detected framework: {framework}"),
    (1.0, "info", "Installing dependencies (yarn install)..."),
    (1.4, "ok", "Dependencies installed — 0 vulnerabilities"),
    (1.0, "info", "Running production build..."),
    (1.5, "ok", "Build completed in 14.2s — bundle size 842 KB gzip"),
    (0.8, "info", "Provisioning container on node vps-01..."),
    (0.9, "info", "Configuring reverse proxy + SSL certificate..."),
    (0.8, "ok", "SSL issued (Let's Encrypt) — HTTPS enabled"),
    (0.7, "info", "Starting application process..."),
    (0.6, "ok", "Health check passed (200 OK)"),
]


async def run_deploy(deployment_id: str, project_id: str, framework: str, size_mb: float):
    total = len(DEPLOY_STEPS) + 1
    for i, (delay, level, tmpl) in enumerate(DEPLOY_STEPS):
        await asyncio.sleep(delay)
        line = tmpl.format(size=size_mb, framework=framework)
        await db.deployments.update_one({"id": deployment_id}, {
            "$push": {"logs": {"ts": now_iso(), "level": level, "msg": line}},
            "$set": {"progress": round((i + 1) / total * 100)},
        })
    await asyncio.sleep(0.5)
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    await db.deployments.update_one({"id": deployment_id}, {
        "$push": {"logs": {"ts": now_iso(), "level": "ok", "msg": f"Deployment live at {project['url']}"}},
        "$set": {"progress": 100, "status": "live", "finished_at": now_iso()},
    })
    await db.projects.update_one({"id": project_id}, {
        "$set": {"status": "running", "last_deployed_at": now_iso()},
        "$inc": {"deploy_count": 1},
    })


@api.post("/deploy")
async def deploy(file: UploadFile = File(...), name: str = Form(...)):
    if not file.filename.lower().endswith(".zip"):
        raise HTTPException(400, "Only .zip archives are supported")
    content = await file.read()
    size_mb = round(len(content) / (1024 * 1024), 2) or 0.01
    slug = slugify(name)
    project = await db.projects.find_one({"name": name}, {"_id": 0})
    if project:
        pid = project["id"]
        await db.projects.update_one({"id": pid}, {"$set": {"status": "deploying", "size_mb": size_mb}})
        framework = project["framework"]
    else:
        pid = str(uuid.uuid4())
        framework = "React"
        await db.projects.insert_one({
            "id": pid, "name": name, "framework": framework, "status": "deploying",
            "url": f"https://{slug}.selfhost.app", "size_mb": size_mb, "deploy_count": 0,
            "created_at": now_iso(), "last_deployed_at": None,
        })
    deployment_id = str(uuid.uuid4())
    await db.deployments.insert_one({
        "id": deployment_id, "project_id": pid, "project_name": name,
        "status": "building", "progress": 0, "logs": [
            {"ts": now_iso(), "level": "info", "msg": f"Deployment queued for '{name}' ({file.filename})"},
        ],
        "created_at": now_iso(), "finished_at": None,
    })
    asyncio.create_task(run_deploy(deployment_id, pid, framework, size_mb))
    return {"deployment_id": deployment_id, "project_id": pid}


@api.get("/deployments/{did}")
async def get_deployment(did: str):
    dep = await db.deployments.find_one({"id": did}, {"_id": 0})
    if not dep:
        raise HTTPException(404, "Deployment not found")
    return dep


@api.get("/deployments")
async def list_deployments():
    return await db.deployments.find({}, {"_id": 0, "logs": 0}).sort("created_at", -1).to_list(10)


# ---------- Resources ----------
@api.get("/resources")
async def resources():
    running = max(await db.projects.count_documents({"status": "running"}), 1)
    base_cpu = min(8 + running * 6, 70)
    base_ram = min(20 + running * 9, 80)
    points = []
    cpu, ram, disk = base_cpu, base_ram, 34.0
    for i in range(24):
        cpu = max(2, min(95, cpu + random.uniform(-6, 6)))
        ram = max(5, min(95, ram + random.uniform(-3, 3)))
        disk = max(10, min(90, disk + random.uniform(-0.4, 0.5)))
        points.append({"t": f"{i * 5}m", "cpu": round(cpu, 1), "ram": round(ram, 1), "disk": round(disk, 1)})
    return {"points": points, "cpu_now": points[-1]["cpu"], "ram_now": points[-1]["ram"], "disk_now": points[-1]["disk"]}


# ---------- Domains ----------
async def propagate_domain(domain_id: str):
    await asyncio.sleep(8)
    await db.domains.update_one({"id": domain_id}, {"$set": {"dns_status": "active"}})


@api.get("/domains")
async def list_domains():
    return await db.domains.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)


@api.post("/domains")
async def add_domain(body: DomainInput):
    hostname = body.hostname.strip().lower()
    if not re.match(r'^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$', hostname):
        raise HTTPException(400, "Invalid domain format")
    if await db.domains.find_one({"hostname": hostname}):
        raise HTTPException(409, "Domain already added")
    doc = {
        "id": str(uuid.uuid4()), "hostname": hostname, "project_id": body.project_id,
        "dns_status": "propagating", "ssl": True, "created_at": now_iso(),
    }
    await db.domains.insert_one(doc)
    asyncio.create_task(propagate_domain(doc["id"]))
    doc.pop("_id", None)
    return doc


@api.delete("/domains/{did}")
async def delete_domain(did: str):
    res = await db.domains.delete_one({"id": did})
    if res.deleted_count == 0:
        raise HTTPException(404, "Domain not found")
    return {"deleted": True}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
