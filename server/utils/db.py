import os
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

MONGO_URL = os.environ.get("DATABASE_URL", "mongodb://localhost:27017")

try:
    client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
    # Test the connection
    client.admin.command('ping')
    print("SUCCESS: Connected to MongoDB")
except Exception as e:
    print(f"ERROR: Could not connect to MongoDB: {e}")
    raise

db = client["pangaea_crm"]
