import asyncio, os, sys
from datetime import datetime, timezone
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
import railway_client as rw  # noqa: E402

PID = "b6cf615f-658e-45ed-8a0f-6eeb16b39557"
ENV = "77fa97c1-aa2c-473b-a996-d5570e48780f"
API_ID, WEB_ID = "aiblog-api-2a0f4f87", "aiblog-web-f4b73dfa"


async def main():
    db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
    now = datetime.now(timezone.utc).isoformat()
    pr = await rw.get_project(PID)
    svcs = {e["node"]["name"]: e["node"]["id"] for e in pr["services"]["edges"]}
    print(svcs)
    common = {"railway_project_id": PID, "railway_env_id": ENV, "status": "pending", "updated_at": now}
    await db.projects.update_one({"id": API_ID}, {
        "$set": {**common, "railway_service_id": svcs["brand-serp-api"], "url": None},
        "$unset": {"railway_project_token": "", "mongo_service_id": "", "mongo_provisioned_at": ""}})
    await db.projects.update_one({"id": WEB_ID}, {
        "$set": {**common, "railway_service_id": svcs["brand-serp-web"], "url": None},
        "$unset": {"railway_project_token": ""}})
    await db.deployments.delete_many({"project_id": {"$in": [API_ID, WEB_ID]}})
    print("saved")

asyncio.run(main())
