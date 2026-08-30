import os
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv
# pyrefly: ignore [missing-import]
from pymongo import MongoClient
from contextvars import ContextVar

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

# Global coordinator database holds the general system data (tenants list, global users mapping)
coordinator_db = client["nexus_coordinator"]

# Context variable to hold the PyMongo Database instance for the current request context
db_context: ContextVar = ContextVar("db_context", default=coordinator_db)

class TenantDatabaseProxy:
    def __getattr__(self, name):
        # Forward attribute lookup to the database currently in context
        return getattr(db_context.get(), name)
        
    def __getitem__(self, name):
        # Forward dictionary-like lookup (e.g. db["leads"])
        return db_context.get()[name]

# Transparent proxy for routes to import
db = TenantDatabaseProxy()
