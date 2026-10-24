"""Provision Dananjels Dolls (React CRA + FastAPI) on Railway."""
import asyncio, os, secrets, string, urllib.parse
from datetime import datetime, timezone
import httpx
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
import railway_client as rw  # noqa: E402
import emergent_fetcher as ef  # noqa: E402
from scripts.setup_viara import API_DOCKER, WEB_DOCKER, WEB_RJ, MONGO_CMD  # noqa: E402

SRC_URL = "https://vscode-c8b681ca-c522-45c9-a25b-188065799d59.preview.emergentagent.com"
SRC_PWD = "d53f4151"
NAME = "dananjels-dolls"
API_ID, WEB_ID = f"{NAME}-api", f"{NAME}-web"
WEB_DOCKER_FIXED = WEB_DOCKER.replace("COPY --from=build /app/build ./build\n",
                                      "COPY --from=build /app/build ./build\nRUN printf '{\"cleanUrls\":false}' > build/serve.json\n")
API_RJ = '{"$schema":"https://railway.com/railway.schema.json","build":{"builder":"DOCKERFILE","dockerfilePath":"Dockerfile"},"deploy":{"restartPolicyType":"ON_FAILURE","restartPolicyMaxRetries":3,"healthcheckPath":"/docs","healthcheckTimeout":300}}'


async def workspace_env() -> dict:
    ck = await ef._login(SRC_URL, SRC_PWD)
    async with httpx.AsyncClient(timeout=30, headers={"User-Agent": ef.UA, "Cookie": ck, "Referer": SRC_URL}) as c:
        r = await c.get(f"{SRC_URL}/vscode-remote-resource?path={urllib.parse.quote('/app/backend/.env')}")
    out = {}
    for line in r.text.splitlines():
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            out[k.strip()] = v.strip().strip('"').strip("'")
    return out


async def main():
    db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
    now = datetime.now(timezone.utc).isoformat()
    wenv = await workspace_env()

    proj = await rw.create_project(NAME)
    pid = proj["id"]
    env_id = proj["environments"]["edges"][0]["node"]["id"]
    api_svc = (await rw.create_service(pid, API_ID))["id"]
    web_svc = (await rw.create_service(pid, WEB_ID))["id"]
    tok = (await rw.gql(
        "mutation($i:ProjectTokenCreateInput!){projectTokenCreate(input:$i)}",
        {"i": {"projectId": pid, "environmentId": env_id, "name": "panel-deploy"}}
    ))["projectTokenCreate"]
    rw.PROJECT_TOKEN.set(tok)

    api_url = "https://" + (await rw.create_service_domain(pid, api_svc, env_id))["domain"]
    web_url = "https://" + (await rw.create_service_domain(pid, web_svc, env_id))["domain"]
    print("project", pid, env_id, "\napi", api_url, "\nweb", web_url)

    mongo_pw = "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(24))
    mongo_svc = (await rw.create_service(pid, "Mongo", image="mongo:7"))["id"]
    await rw.upsert_variables(pid, env_id, mongo_svc, {
        "MONGO_INITDB_ROOT_USERNAME": "root",
        "MONGO_INITDB_ROOT_PASSWORD": mongo_pw,
        "MONGO_URL": f"mongodb://root:{mongo_pw}@${{{{RAILWAY_PRIVATE_DOMAIN}}}}:27017",
    }, skip_deploys=True)
    await rw.create_volume(pid, mongo_svc, "/data/db", environment_id=env_id)
    await rw.gql(
        "mutation($e:String!,$s:String!,$i:ServiceInstanceUpdateInput!)"
        "{serviceInstanceUpdate(environmentId:$e,serviceId:$s,input:$i)}",
        {"e": env_id, "s": mongo_svc, "i": {"startCommand": MONGO_CMD,
                                            "restartPolicyType": "ALWAYS",
                                            "restartPolicyMaxRetries": 10}})
    print("mongo", mongo_svc)

    base = {"railway_project_id": pid, "railway_env_id": env_id,
            "railway_project_token": tok, "status": "pending",
            "created_at": now, "last_deployed_at": None, "deploy_count": 0, "size_mb": 0,
            "emergent_source_url": SRC_URL, "emergent_source_password": SRC_PWD,
            "emergent_workspace_root": "/app", "github_sync": False}
    await db.projects.replace_one({"id": API_ID}, {
        **base, "id": API_ID, "name": API_ID, "slug": API_ID,
        "framework": "python", "railway_service_id": api_svc, "url": api_url,
        "api_url": api_url, "frontend_url": web_url, "emergent_subdir": "backend",
        "docker_template": API_DOCKER, "railway_json_template": API_RJ,
        "mongo_service_id": mongo_svc, "mongo_provisioned_at": now,
        "admin_email": wenv.get("ADMIN_EMAIL"), "admin_password": wenv.get("ADMIN_PASSWORD"),
    }, upsert=True)
    await db.projects.replace_one({"id": WEB_ID}, {
        **base, "id": WEB_ID, "name": WEB_ID, "slug": WEB_ID,
        "framework": "node", "railway_service_id": web_svc, "url": web_url,
        "api_url": api_url, "emergent_subdir": "frontend",
        "docker_template": WEB_DOCKER_FIXED, "railway_json_template": WEB_RJ,
    }, upsert=True)

    api_env = {k: v for k, v in wenv.items() if k not in ("MONGO_URL", "DB_NAME", "CORS_ORIGINS")}
    api_env.update({"MONGO_URL": "${{Mongo.MONGO_URL}}", "DB_NAME": "dananjels",
                    "CORS_ORIGINS": web_url})
    for k, v in api_env.items():
        await db.env_vars.update_one({"project_id": API_ID, "key": k},
                                     {"$set": {"project_id": API_ID, "key": k, "value": v,
                                               "updated_at": now}}, upsert=True)
    for k, v in {"REACT_APP_BACKEND_URL": api_url, "PORT": "3000"}.items():
        await db.env_vars.update_one({"project_id": WEB_ID, "key": k},
                                     {"$set": {"project_id": WEB_ID, "key": k, "value": v,
                                               "updated_at": now}}, upsert=True)
    print("db seeded; api env keys:", sorted(api_env))

if __name__ == "__main__":
    asyncio.run(main())
