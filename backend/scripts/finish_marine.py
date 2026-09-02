"""Finish Marine Engine Store setup on the surviving Railway project."""
import asyncio, os, secrets, string
from datetime import datetime, timezone
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
import railway_client as rw  # noqa: E402
from scripts.setup_marine import (API_DOCKER, WEB_DOCKER, API_RJ, WEB_RJ, MONGO_CMD,
                                  SRC_URL, SRC_PWD, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD,
                                  API_ID, WEB_ID)

PID = "43dfcc06-7f65-4603-b075-6739823f4a80"
ENV = "bef47ba9-a5b6-4e6e-a833-5b158fc04ff6"
API_SVC = "3bf0ce60-e144-4ea4-a8bb-bbdd12255c2d"
WEB_SVC = "159fc75b-12cc-4f3d-95cc-e7b903d3655b"
STALE_PID = "7eb24f16-080e-49b5-ac13-9dd285e2aff0"


async def main():
    db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
    now = datetime.now(timezone.utc).isoformat()

    try:
        await rw.delete_project(STALE_PID)
        print("stale project deleted")
    except Exception as e:
        print("stale delete skipped:", e)

    mongo_pw = "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(24))
    mongo_svc = (await rw.create_service(PID, "Mongo", image="mongo:7"))["id"]
    await rw.upsert_variables(PID, ENV, mongo_svc, {
        "MONGO_INITDB_ROOT_USERNAME": "root",
        "MONGO_INITDB_ROOT_PASSWORD": mongo_pw,
        "MONGO_URL": f"mongodb://root:{mongo_pw}@${{{{RAILWAY_PRIVATE_DOMAIN}}}}:27017",
    }, skip_deploys=True)
    await rw.create_volume(PID, mongo_svc, "/data/db", environment_id=ENV)
    await rw.gql(
        "mutation($e:String!,$s:String!,$i:ServiceInstanceUpdateInput!)"
        "{serviceInstanceUpdate(environmentId:$e,serviceId:$s,input:$i)}",
        {"e": ENV, "s": mongo_svc, "i": {"startCommand": MONGO_CMD,
                                         "restartPolicyType": "ALWAYS",
                                         "restartPolicyMaxRetries": 10}})
    print("mongo", mongo_svc)

    base = {"railway_project_id": PID, "railway_env_id": ENV, "status": "pending",
            "created_at": now, "last_deployed_at": None, "deploy_count": 0, "size_mb": 0,
            "emergent_source_url": SRC_URL, "emergent_source_password": SRC_PWD,
            "emergent_workspace_root": "/app", "github_sync": False}
    await db.projects.replace_one({"id": API_ID}, {
        **base, "id": API_ID, "name": "marine-api", "slug": "marine-api", "framework": "python",
        "railway_service_id": API_SVC, "url": None, "emergent_subdir": "backend",
        "docker_template": API_DOCKER, "railway_json_template": API_RJ,
        "mongo_service_id": mongo_svc, "mongo_provisioned_at": now,
        "admin_email": ADMIN_EMAIL, "admin_password": ADMIN_PASSWORD,
    }, upsert=True)
    await db.projects.replace_one({"id": WEB_ID}, {
        **base, "id": WEB_ID, "name": "marine-web", "slug": "marine-web", "framework": "node",
        "railway_service_id": WEB_SVC, "url": None, "emergent_subdir": "frontend",
        "docker_template": WEB_DOCKER, "railway_json_template": WEB_RJ,
    }, upsert=True)

    api_env = {"MONGO_URL": "${{Mongo.MONGO_URL}}", "DB_NAME": "marine_engine_store",
               "CORS_ORIGINS": "*", "JWT_SECRET": JWT_SECRET,
               "ADMIN_EMAIL": ADMIN_EMAIL, "ADMIN_PASSWORD": ADMIN_PASSWORD}
    for k, v in api_env.items():
        await db.env_vars.update_one({"project_id": API_ID, "key": k},
                                     {"$set": {"project_id": API_ID, "key": k, "value": v,
                                               "updated_at": now}}, upsert=True)
    print("db seeded")

asyncio.run(main())
