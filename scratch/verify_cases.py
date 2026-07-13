import requests
from pymongo import MongoClient
from bson import ObjectId

def test_unified_cases():
    print("[INFO] Connecting to MongoDB...")
    client = MongoClient("mongodb://localhost:27017")
    db = client["pangaea_crm"]
    
    # 1. Fetch or seed test lead
    lead = db.leads.find_one()
    if not lead:
        print("[INFO] Seeding test lead...")
        branch = db.branches.find_one()
        branch_id = branch["_id"] if branch else db.branches.insert_one({"name": "Test Branch", "city": "Surat", "country": "India"}).inserted_id
        lead_id = db.leads.insert_one({
            "fullName": "Jane Doe",
            "email": "jane@example.com",
            "phone": "+919876543210",
            "branchId": branch_id,
            "productLine": "PR",
            "leadStatus": "NEW"
        }).inserted_id
    else:
        lead_id = lead["_id"]
        
    lead_id_str = str(lead_id)
    print(f"[INFO] Using Lead ID: {lead_id_str}")

    # 2. Log in to get token
    login_url = "http://localhost:8000/api/auth/login"
    login_payload = {
        "email": "admin@pangaea.com",
        "password": "admin123"
    }
    session = requests.Session()
    try:
        response = session.post(login_url, json=login_payload)
        response.raise_for_status()
        token = response.json().get("token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        print("[SUCCESS] Logged in successfully.")
    except Exception as e:
        print(f"[ERROR] Failed to log in: {e}")
        return

    # 3. Create case via immigration POST
    create_payload = {
        "clientId": lead_id_str,
        "visaType": "PR",
        "targetCountry": "Canada",
        "productLine": "CANADA"
    }
    try:
        print("[INFO] Creating immigration case...")
        res = session.post("http://localhost:8000/api/immigration/cases", json=create_payload)
        res.raise_for_status()
        case_data = res.json()
        print(f"[SUCCESS] Case created! data: {case_data}")
        case_id = case_data["caseId"]
    except Exception as e:
        print(f"[ERROR] Failed to create case: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Details: {e.response.text}")
        return

    # 4. Get cases for lead via standard cases API (which now queries immigration_cases)
    try:
        print("[INFO] Fetching cases for lead via cases endpoint...")
        res = session.get(f"http://localhost:8000/api/cases/lead/{lead_id_str}")
        res.raise_for_status()
        cases = res.json()
        print(f"[SUCCESS] Retrieved {len(cases)} cases for lead.")
        found = next((c for c in cases if c["_id"] == case_id), None)
        assert found is not None, "Created case was not returned under lead's standard cases route!"
        assert found["visaType"] == "PR", f"Expected visaType PR, got {found['visaType']}"
        assert found["stage"] == "Intake", f"Expected stage Intake, got {found['stage']}"
        print("[SUCCESS] Case data verified under lead's cases route.")
    except Exception as e:
        print(f"[ERROR] Failed verification: {e}")
        return

    # 5. Fetch all immigration cases and verify clientName is populated
    try:
        print("[INFO] Fetching immigration cases list...")
        res = session.get("http://localhost:8000/api/immigration/cases")
        res.raise_for_status()
        all_cases = res.json()
        found = next((c for c in all_cases if c["_id"] == case_id), None)
        assert found is not None, "Created case not found in global immigration list!"
        assert "clientName" in found, "clientName was not populated!"
        print(f"[SUCCESS] Verified clientName in Kanban list: {found['clientName']}")
    except Exception as e:
        print(f"[ERROR] Failed list verification: {e}")
        return

    print("\n[VERIFICATION STATUS] ALL BACKEND UNIFIED CHECKS PASSED!")

if __name__ == "__main__":
    test_unified_cases()
