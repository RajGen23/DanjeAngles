"""Provision Marine Engine Store (MECHANICS) on Railway: project + api/web + domains + Mongo."""
import asyncio, os, secrets, string
from datetime import datetime, timezone
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
import railway_client as rw  # noqa: E402

SRC_URL = "https://vscode-b1934023-d18d-4984-8598-35e95ab30658.preview.emergentagent.com"
SRC_PWD = "50f22ee7"
API_ID, WEB_ID = "marine-api", "marine-web"
JWT_SECRET = "9f4c1e7ab2d84f0c9e6a3b5d7f1428c6e0a9b3d5f7c1e4a8b2d6f0c3e7a1b5d9"
ADMIN_EMAIL, ADMIN_PASSWORD = "admin@mechanics.co.za", "Mechanics#2026"

API_DOCKER = """FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends build-essential curl && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN sed -i -E '/^litellm @/d' requirements.txt \\
    && sed -i -E '/^(black|mypy|mypy_extensions|flake8|isort|pytest|pytest-xdist|watchfiles)==/d' requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \\
    pip install --no-cache-dir --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/ -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}"]
"""

WEB_DOCKER = """FROM node:20-alpine AS build
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 300000
COPY . .
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL}
ENV DISABLE_ESLINT_PLUGIN=true
ENV CI=false
RUN yarn build

FROM node:20-alpine
WORKDIR /app
RUN yarn global add serve
COPY --from=build /app/build ./build
EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "3000"]
"""

API_RJ = '{"$schema":"https://railway.com/railway.schema.json","build":{"builder":"DOCKERFILE","dockerfilePath":"Dockerfile"},"deploy":{"restartPolicyType":"ON_FAILURE","restartPolicyMaxRetries":3,"healthcheckPath":"/api/","healthcheckTimeout":300}}'
WEB_RJ = '{"$schema":"https://railway.com/railway.schema.json","build":{"builder":"DOCKERFILE","dockerfilePath":"Dockerfile"},"deploy":{"restartPolicyType":"ON_FAILURE","restartPolicyMaxRetries":3}}'

MONGO_CMD = ("sh -c 'rm -rf /data/db/diagnostic.data; exec docker-entrypoint.sh mongod "
             "--auth --bind_ip_all --setParameter diagnosticDataCollectionEnabled=false'")


async def main():
    db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
    now = datetime.now(timezone.utc).isoformat()

    proj = await rw.create_project("marine-engine-store")
    pid = proj["id"]
    env_id = proj["environments"]["edges"][0]["node"]["id"]
    api_svc = (await rw.create_service(pid, "marine-api"))["id"]
    web_svc = (await rw.create_service(pid, "marine-web"))["id"]
    api_url = "https://" + (await rw.create_service_domain(pid, api_svc, env_id))["domain"]
    web_url = "https://" + (await rw.create_service_domain(pid, web_svc, env_id))["domain"]
    print("project", pid, env_id, "\napi", api_url, "\nweb", web_url)

    # Mongo service with the crash-proof start command + persistent volume
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

    base = {"railway_project_id": pid, "railway_env_id": env_id, "status": "pending",
            "created_at": now, "last_deployed_at": None, "deploy_count": 0, "size_mb": 0,
            "emergent_source_url": SRC_URL, "emergent_source_password": SRC_PWD,
            "emergent_workspace_root": "/app", "github_sync": False}
    await db.projects.replace_one({"id": API_ID}, {
        **base, "id": API_ID, "name": "marine-api", "slug": "marine-api", "framework": "python",
        "railway_service_id": api_svc, "url": api_url, "api_url": api_url,
        "frontend_url": web_url, "emergent_subdir": "backend",
        "docker_template": API_DOCKER, "railway_json_template": API_RJ,
        "mongo_service_id": mongo_svc, "mongo_provisioned_at": now,
        "admin_email": ADMIN_EMAIL, "admin_password": ADMIN_PASSWORD,
    }, upsert=True)
    await db.projects.replace_one({"id": WEB_ID}, {
        **base, "id": WEB_ID, "name": "marine-web", "slug": "marine-web", "framework": "node",
        "railway_service_id": web_svc, "url": web_url, "api_url": api_url,
        "emergent_subdir": "frontend", "docker_template": WEB_DOCKER,
        "railway_json_template": WEB_RJ,
    }, upsert=True)

    api_env = {"MONGO_URL": "${{Mongo.MONGO_URL}}", "DB_NAME": "marine_engine_store",
               "CORS_ORIGINS": web_url, "JWT_SECRET": JWT_SECRET,
               "ADMIN_EMAIL": ADMIN_EMAIL, "ADMIN_PASSWORD": ADMIN_PASSWORD}
    for k, v in api_env.items():
        await db.env_vars.update_one({"project_id": API_ID, "key": k},
                                     {"$set": {"project_id": API_ID, "key": k, "value": v,
                                               "updated_at": now}}, upsert=True)
    await db.env_vars.update_one({"project_id": WEB_ID, "key": "REACT_APP_BACKEND_URL"},
                                 {"$set": {"project_id": WEB_ID, "key": "REACT_APP_BACKEND_URL",
                                           "value": api_url, "updated_at": now}}, upsert=True)
    print("db seeded")

if __name__ == "__main__":
    asyncio.run(main())
