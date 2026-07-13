from pymongo import MongoClient

try:
    client = MongoClient("mongodb://localhost:27017")
    db = client["pangaea_crm"]
    
    # Reset any document that still has the fake mock-s3-bucket URL
    result = db.immigration_cases.update_many(
        {},
        {
            "$set": {
                "documents.$[elem].fileUrl": None,
                "documents.$[elem].status": "Pending Upload"
            }
        },
        array_filters=[{"elem.fileUrl": {"$regex": "mock-s3-bucket"}}]
    )
    print(f"Fixed {result.modified_count} cases containing fake AWS URLs.")
except Exception as e:
    print(f"Error: {e}")

