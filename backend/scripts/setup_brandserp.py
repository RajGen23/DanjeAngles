"""One-off: repurpose the abandoned ai-blog-writer-5 records into brand-serp-engine."""
import asyncio, os, sys
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

SRC_URL = "https://vscode-c0c5d0d0-94cd-48ae-9deb-cc01a57d558c.preview.emergentagent.com"
SRC_PWD = "f2ee4833"
SEARCHAPI_KEY = "AZRvcm5jF5NuqjMKFtxAP3ZL"

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


async def main():
    db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
    now = datetime.now(timezone.utc).isoformat()

    api_id, web_id = "aiblog-api-2a0f4f87", "aiblog-web-f4b73dfa"

    await db.projects.update_one({"id": api_id}, {"$set": {
        "name": "brand-serp-api", "slug": "brand-serp-api", "framework": "python",
        "status": "pending", "deploy_count": 0, "last_deployed_at": None,
        "emergent_source_url": SRC_URL, "emergent_source_password": SRC_PWD,
        "emergent_subdir": "backend", "emergent_workspace_root": "/app",
        "docker_template": API_DOCKER, "railway_json_template": API_RJ,
        "github_sync": True, "updated_at": now,
    }})
    await db.projects.update_one({"id": web_id}, {"$set": {
        "name": "brand-serp-web", "slug": "brand-serp-web", "framework": "node",
        "status": "pending", "deploy_count": 0, "last_deployed_at": None,
        "emergent_source_url": SRC_URL, "emergent_source_password": SRC_PWD,
        "emergent_subdir": "frontend", "emergent_workspace_root": "/app",
        "docker_template": WEB_DOCKER, "railway_json_template": WEB_RJ,
        "github_sync": True, "updated_at": now,
    }})

    for pid, kv in (
        (api_id, {"MONGO_URL": "${{Mongo.MONGO_URL}}", "DB_NAME": "brand_serp",
                  "CORS_ORIGINS": "*", "SEARCHAPI_KEY": SEARCHAPI_KEY}),
        (web_id, {}),
    ):
        for k, v in kv.items():
            await db.env_vars.update_one({"project_id": pid, "key": k},
                                         {"$set": {"value": v, "updated_at": now}}, upsert=True)

    await db.deployments.delete_many({"project_id": {"$in": [api_id, web_id]}})
    for p in await db.projects.find({}, {"_id": 0, "id": 1, "name": 1, "status": 1,
                                         "railway_service_id": 1}).to_list(50):
        print(p)

asyncio.run(main())
