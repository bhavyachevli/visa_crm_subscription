"""
Demo Account Seeder for Pangaea CRM
Run with: python create_demo.py
"""
import bcrypt
from datetime import datetime, timezone
from utils.db import db

hashed = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode("utf-8")

# Check if user already exists
existing = db.users.find_one({"email": "admin@pangaea.com"})
if not existing:
    db.users.insert_one({
        "name": "Bhavya Admin",
        "email": "admin@pangaea.com",
        "passwordHash": hashed,
        "role": "ADMIN",
        "branchId": None,
        "emailVerifiedAt": datetime.now(timezone.utc),
        "totpEnabled": False,
        "totpSecret": None,
        "createdAt": datetime.now(timezone.utc)
    })
    print("SUCCESS: Demo user created!")
    print("  Email:    admin@pangaea.com")
    print("  Password: admin123")
else:
    db.users.update_one(
        {"email": "admin@pangaea.com"}, 
        {"$set": {"passwordHash": hashed, "totpEnabled": False, "totpSecret": None}}
    )
    print("SUCCESS: Demo user password has been reset!")
    print("  Email:    admin@pangaea.com")
    print("  Password: admin123")
