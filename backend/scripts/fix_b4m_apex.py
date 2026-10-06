import asyncio, json, os, sys
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import railway_client as rw  # noqa

Q = """query($p:String!,$s:String!,$e:String!){
  domains(projectId:$p,serviceId:$s,environmentId:$e){
    serviceDomains{ id domain targetPort }
    customDomains{ id domain targetPort }
  }
}"""


async def main():
    db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
    p = await db.projects.find_one({"id": "best4medals-web"}, {"_id": 0})
    rw.PROJECT_TOKEN.set(p["railway_project_token"])
    pid, env, svc = p["railway_project_id"], p["railway_env_id"], p["railway_service_id"]
    d = (await rw.gql(Q, {"p": pid, "s": svc, "e": env}))["domains"]
    print(json.dumps(d, indent=1))

    have = {c["domain"] for c in d["customDomains"]}
    if "best4medals.com" not in have:
        r = await rw.create_custom_domain(pid, svc, env, "best4medals.com", target_port=3000)
        print("apex created", json.dumps(r, indent=1))
    if not d["serviceDomains"]:
        r = await rw.create_service_domain(pid, svc, env)
        print("service domain recreated", r)
        await db.projects.update_one({"id": "best4medals-web"},
                                     {"$set": {"url": "https://" + r["domain"]}})

asyncio.run(main())
