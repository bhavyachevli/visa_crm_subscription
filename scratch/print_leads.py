import sys
import os
from bson import ObjectId

# Adjust path to import db
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "server"))

from utils.db import db

# Fetch the last 3 leads
leads = list(db.leads.find().sort("createdAt", -1).limit(3))

print(f"Total leads in DB: {db.leads.count_documents({})}")
for idx, lead in enumerate(leads):
    print(f"\n--- Lead #{idx+1} ---")
    for k, v in lead.items():
        print(f"  {k}: {repr(v)}")
