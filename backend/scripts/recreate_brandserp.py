"""Recreate Brand SERP Engine on Railway (paid plan): project + api/web services + domains."""
import asyncio, os
from datetime import datetime, timezone
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
import railway_client as rw  # noqa: E402

API_ID, WEB_ID = "aiblog-api-2a0f4f87", "aiblog-web-f4b73dfa"


async def main():
    db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
    now = datetime.now(timezone.utc).isoformat()

    proj = await rw.create_project("brand-serp-engine")
    pid = proj["id"]
    env_id = proj["environments"]["edges"][0]["node"]["id"]
    print("project", pid, env_id)

    api_svc = await rw.create_service(pid, "brand-serp-api")
    web_svc = await rw.create_service(pid, "brand-serp-web")
    api_dom = await rw.create_service_domain(pid, api_svc["id"], env_id, target_port=8000)
    web_dom = await rw.create_service_domain(pid, web_svc["id"], env_id, target_port=3000)
    api_url, web_url = "https://" + api_dom["domain"], "https://" + web_dom["domain"]
    print(api_url, web_url)

    common = {"railway_project_id": pid, "railway_env_id": env_id, "status": "pending",
              "updated_at": now}
    await db.projects.update_one({"id": API_ID}, {
        "$set": {**common, "railway_service_id": api_svc["id"], "url": api_url, "api_url": api_url},
        "$unset": {"railway_project_token": "", "mongo_service_id": "", "mongo_provisioned_at": ""}})
    await db.projects.update_one({"id": WEB_ID}, {
        "$set": {**common, "railway_service_id": web_svc["id"], "url": web_url, "api_url": api_url},
        "$unset": {"railway_project_token": ""}})
    await db.env_vars.update_one({"project_id": WEB_ID, "key": "REACT_APP_BACKEND_URL"},
                                 {"$set": {"value": api_url, "updated_at": now}}, upsert=True)
    await db.deployments.delete_many({"project_id": {"$in": [API_ID, WEB_ID]}})
    print("db updated")

asyncio.run(main())
