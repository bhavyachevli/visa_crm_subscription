import os
from dotenv import load_dotenv
from utils.db import db

def seed_branches():
    branches = [
        {"name": "Australia"},
        {"name": "Surat"},
        {"name": "Ahmedabad"}
    ]
    
    for b in branches:
        if not db.branches.find_one({"name": b["name"]}):
            db.branches.insert_one(b)
            print(f"Added branch: {b['name']}")
        else:
            print(f"Branch already exists: {b['name']}")
            
    print("Done seeding branches!")

if __name__ == "__main__":
    seed_branches()
