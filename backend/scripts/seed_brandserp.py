"""Create fresh Brand SERP Engine project records pointing at the new Railway project."""
import asyncio, os
from datetime import datetime, timezone
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

PID = "b6cf615f-658e-45ed-8a0f-6eeb16b39557"
ENV = "77fa97c1-aa2c-473b-a996-d5570e48780f"
API_SVC = "b81ffccf-e425-4c1e-97a7-c78bf5bea162"
WEB_SVC = "dd9ddf17-1348-48a7-b5d3-992f6a28fbd7"
API_ID, WEB_ID = "brandserp-api", "brandserp-web"
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
    base = {
        "railway_project_id": PID, "railway_env_id": ENV, "status": "pending",
        "created_at": now, "last_deployed_at": None, "deploy_count": 0, "size_mb": 0,
        "emergent_source_url": SRC_URL, "emergent_source_password": SRC_PWD,
        "emergent_workspace_root": "/app", "github_sync": False,
    }
    await db.projects.replace_one({"id": API_ID}, {
        **base, "id": API_ID, "name": "brand-serp-api", "slug": "brand-serp-api",
        "framework": "python", "railway_service_id": API_SVC, "url": None,
        "emergent_subdir": "backend", "docker_template": API_DOCKER,
        "railway_json_template": API_RJ,
    }, upsert=True)
    await db.projects.replace_one({"id": WEB_ID}, {
        **base, "id": WEB_ID, "name": "brand-serp-web", "slug": "brand-serp-web",
        "framework": "node", "railway_service_id": WEB_SVC, "url": None,
        "emergent_subdir": "frontend", "docker_template": WEB_DOCKER,
        "railway_json_template": WEB_RJ,
    }, upsert=True)

    for k, v in {"CORS_ORIGINS": "*", "SEARCHAPI_KEY": SEARCHAPI_KEY}.items():
        await db.env_vars.update_one({"project_id": API_ID, "key": k},
                                     {"$set": {"project_id": API_ID, "key": k, "value": v,
                                               "updated_at": now}}, upsert=True)
    await db.env_vars.delete_many({"project_id": {"$in": ["aiblog-api-2a0f4f87", "aiblog-web-f4b73dfa"]}})
    async for p in db.projects.find({}, {"_id": 0, "id": 1, "name": 1, "railway_service_id": 1}):
        print(p)

asyncio.run(main())
