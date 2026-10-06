import asyncio, json, os, sys
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import railway_client as rw  # noqa

Q = """query($p:String!){
  project(id:$p){ services{ edges{ node{ id name
    serviceInstances{ edges{ node{ domains{
      serviceDomains{ id domain targetPort }
      customDomains{ id domain targetPort }
    } } } } } } }
  }
}"""


async def main():
    db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
    p = await db.projects.find_one({"id": "best4medals-web"}, {"_id": 0})
    rw.PROJECT_TOKEN.set(p["railway_project_token"])
    print(json.dumps(await rw.gql(Q, {"p": p["railway_project_id"]}), indent=1))
    print("web vars:", await rw.get_variables(p["railway_project_id"], p["railway_env_id"], p["railway_service_id"]))

asyncio.run(main())
