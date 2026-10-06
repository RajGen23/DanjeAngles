import asyncio, os, sys
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import railway_client as rw  # noqa


async def main():
    db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
    p = await db.projects.find_one({"id": "best4medals-web"}, {"_id": 0})
    rw.PROJECT_TOKEN.set(p["railway_project_token"])
    pid, env, svc = p["railway_project_id"], p["railway_env_id"], p["railway_service_id"]
    await rw.upsert_variables(pid, env, svc, {"PORT": "3000"}, skip_deploys=True)
    dep = await rw.redeploy_service(svc, env)
    print("redeploy", dep)
    await db.env_vars.update_one({"project_id": "best4medals-web", "key": "PORT"},
                                 {"$set": {"project_id": "best4medals-web", "key": "PORT",
                                           "value": "3000", "updated_at": ""}}, upsert=True)

asyncio.run(main())
