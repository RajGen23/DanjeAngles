import asyncio, os, sys
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


async def main():
    db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
    r = await db.domains.update_one({"hostname": "best4medals.com"}, {"$set": {
        "railway_domain_id": "20abed92-51c6-44c7-908a-3144ade05df3",
        "dns_records": [{"hostlabel": "", "recordType": "DNS_RECORD_TYPE_CNAME",
                         "requiredValue": "wumnd117.up.railway.app", "currentValue": "",
                         "status": "DNS_RECORD_STATUS_REQUIRES_UPDATE",
                         "purpose": "DNS_RECORD_PURPOSE_TRAFFIC_ROUTE",
                         "zone": "best4medals.com", "fqdn": "best4medals.com"}],
        "dns_status": "propagating", "ssl": False,
    }})
    print("domains updated", r.modified_count)

asyncio.run(main())
