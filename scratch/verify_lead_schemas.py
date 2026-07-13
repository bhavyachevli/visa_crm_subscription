import sys
import os

# Adjust path to import schemas from server
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "server"))

try:
    from models.schemas import LeadCreate, LeadUpdate
    print("SUCCESS: Successfully imported LeadCreate and LeadUpdate schemas!")
except Exception as e:
    print(f"FAILED: Could not import schemas: {e}")
    sys.exit(1)

# Test data validation
test_lead_data = {
    "fullName": "Test User",
    "email": "test@example.com",
    "phone": "+91 9876543210",
    "source": "WEBSITE",
    "leadStatus": "NEW",
    "productLine": "CANADA",
    "branchId": "65b93d0c2420a32454b6c321",
    "secondaryApplicants": [
        {
            "secondaryRelationship": "Spouse",
            "secondaryFirstName": "Jane",
            "secondaryLastName": "Doe",
            "secondaryDob": "1990-01-01",
            "secondaryPassport": "Z1234567",
            "secondaryContactCode": "+91",
            "secondaryContactNumber": "9876543211",
            "secondaryEmail": "jane@example.com",
            "secondaryAddress": "Test Address"
        }
    ]
}

try:
    lead_create = LeadCreate(**test_lead_data)
    print("SUCCESS: LeadCreate validated mock data successfully!")
    dumped = lead_create.model_dump()
    assert "secondaryApplicants" in dumped, "secondaryApplicants missing in LeadCreate model_dump"
    assert len(dumped["secondaryApplicants"]) == 1, "secondaryApplicants list length mismatch"
    assert dumped["secondaryApplicants"][0]["secondaryFirstName"] == "Jane", "secondaryApplicants data mismatch"
    print("SUCCESS: Model serialization and deserialization works correctly!")
except Exception as e:
    print(f"FAILED: Validation or deserialization failed: {e}")
    sys.exit(1)

print("All Schema Verification Tests Passed Successfully!")
