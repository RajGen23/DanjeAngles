"""Provision DakEvents (Expo Router + FastAPI) on Railway."""
import asyncio, os, secrets, string
from datetime import datetime, timezone
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
import railway_client as rw  # noqa: E402

SRC_URL = "https://vscode-dd065ae8-4dfa-4fe9-833e-16a5f7ecc84e.preview.emergentagent.com"
SRC_PWD = "efd95d63"
EXPO_PREVIEW = "https://shaadi-connect-27.preview.emergentagent.com"
API_ID, WEB_ID = "dakevents-api", "dakevents-web"

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

# Expo Router web build: `expo export -p web` → static bundle in dist/
WEB_DOCKER = """FROM node:20-alpine AS build
RUN apk add --no-cache python3 make g++ git
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --network-timeout 900000
COPY . .
ARG EXPO_PUBLIC_BACKEND_URL
RUN rm -f .env && printf 'EXPO_PUBLIC_BACKEND_URL=%s\\n' "$EXPO_PUBLIC_BACKEND_URL" > .env
ENV CI=1
RUN npx expo export --platform web --output-dir dist

FROM node:20-alpine
WORKDIR /app
RUN yarn global add serve
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["sh", "-c", "serve -s dist -l ${PORT:-3000}"]
"""

API_RJ = '{"$schema":"https://railway.com/railway.schema.json","build":{"builder":"DOCKERFILE","dockerfilePath":"Dockerfile"},"deploy":{"restartPolicyType":"ON_FAILURE","restartPolicyMaxRetries":3,"healthcheckPath":"/api/","healthcheckTimeout":300}}'
WEB_RJ = '{"$schema":"https://railway.com/railway.schema.json","build":{"builder":"DOCKERFILE","dockerfilePath":"Dockerfile"},"deploy":{"restartPolicyType":"ON_FAILURE","restartPolicyMaxRetries":3}}'

MONGO_CMD = ("sh -c 'rm -rf /data/db/diagnostic.data; exec docker-entrypoint.sh mongod "
             "--auth --bind_ip_all --setParameter diagnosticDataCollectionEnabled=false'")

API_ENV = {
    "MONGO_URL": "${{Mongo.MONGO_URL}}",
    "DB_NAME": "dakevents_db",
    "JWT_SECRET": "dak-6f4b9c2e8a1d7f3b5c0e9a2d4f8b1c6e3a7d5f9b2c4e8a1d",
    "JWT_ALGORITHM": "HS256",
    "EMERGENT_LLM_KEY": "sk-emergent-bC20c1bD977B3634bD",
    "WP_SYNC_ENABLED": "true",
    "WP_BASE_URL": "https://dakevents.ci",
    "WP_USERNAME": "rajgen1299@gmail.com",
    "WP_APP_PASSWORD": "6Xwr iA85 So9W DtIV DxQU 4Pq6",
    "CORS_ORIGINS": "*",
}


async def main():
    db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
    now = datetime.now(timezone.utc).isoformat()

    proj = await rw.create_project("dakevents")
    pid = proj["id"]
    env_id = proj["environments"]["edges"][0]["node"]["id"]
    api_svc = (await rw.create_service(pid, "dakevents-api"))["id"]
    web_svc = (await rw.create_service(pid, "dakevents-web"))["id"]
    print("project", pid, env_id, "api", api_svc, "web", web_svc)

    tok = (await rw.gql(
        "mutation($i:ProjectTokenCreateInput!){projectTokenCreate(input:$i)}",
        {"i": {"projectId": pid, "environmentId": env_id, "name": "panel-deploy"}}
    ))["projectTokenCreate"]
    rw.PROJECT_TOKEN.set(tok)

    api_url = "https://" + (await rw.create_service_domain(pid, api_svc, env_id))["domain"]
    web_url = "https://" + (await rw.create_service_domain(pid, web_svc, env_id))["domain"]
    print("api", api_url, "web", web_url)

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
        **base, "id": API_ID, "name": "dakevents-api", "slug": "dakevents-api",
        "framework": "python", "railway_service_id": api_svc, "url": api_url,
        "api_url": api_url, "frontend_url": web_url, "emergent_subdir": "backend",
        "docker_template": API_DOCKER, "railway_json_template": API_RJ,
        "mongo_service_id": mongo_svc, "mongo_provisioned_at": now,
        "admin_email": "admin@dakevents.demo", "admin_password": "Admin@2026",
    }, upsert=True)
    await db.projects.replace_one({"id": WEB_ID}, {
        **base, "id": WEB_ID, "name": "dakevents-web", "slug": "dakevents-web",
        "framework": "node", "railway_service_id": web_svc, "url": web_url,
        "api_url": api_url, "emergent_subdir": "frontend",
        "expo_preview_url": EXPO_PREVIEW,
        "docker_template": WEB_DOCKER, "railway_json_template": WEB_RJ,
    }, upsert=True)

    for k, v in API_ENV.items():
        await db.env_vars.update_one({"project_id": API_ID, "key": k},
                                     {"$set": {"project_id": API_ID, "key": k, "value": v,
                                               "updated_at": now}}, upsert=True)
    await db.env_vars.update_one({"project_id": WEB_ID, "key": "EXPO_PUBLIC_BACKEND_URL"},
                                 {"$set": {"project_id": WEB_ID, "key": "EXPO_PUBLIC_BACKEND_URL",
                                           "value": api_url, "updated_at": now}}, upsert=True)
    print("db seeded")

if __name__ == "__main__":
    asyncio.run(main())
