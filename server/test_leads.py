import os
from pymongo import MongoClient

MONGO_URL = os.environ.get("DATABASE_URL", "mongodb://localhost:27017")
client = MongoClient(MONGO_URL)
db = client["pangaea_crm"]

print("--- CASES ---")
cases = list(db.immigration_cases.find().limit(5))
for c in cases:
    print(f"Case ID: {c['_id']}, Tracking: {c['trackingId']}, ClientId: {c.get('clientId')} ({type(c.get('clientId'))})")

print("\n--- LEADS ---")
leads = list(db.leads.find().limit(5))
for l in leads:
    print(f"Lead ID: {l['_id']}, Name: {l.get('fullName')}, First: {l.get('firstName')}, Last: {l.get('lastName')}, leadNo: {l.get('leadNo')}")
