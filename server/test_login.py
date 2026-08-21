from routes.auth import login
from models.schemas import UserLogin
from fastapi import Response
import sys

print("Calling login function directly...")

class MockResponse(Response):
    def __init__(self):
        super().__init__()
        self.cookies_set = {}
    def set_cookie(self, key, value, **kwargs):
        self.cookies_set[key] = value
    def delete_cookie(self, key, **kwargs):
        if key in self.cookies_set:
            del self.cookies_set[key]

response = MockResponse()
creds = UserLogin(email="ceo@pangaea.com", password="ceo@pangaea123")

try:
    result = login(creds, response)
    print("LOGIN SUCCESS!")
    print("Result:", result)
    print("Cookies set:", response.cookies_set)
except Exception as e:
    print("CRITICAL EXCEPTION OCCURRED:")
    import traceback
    traceback.print_exc()
    sys.exit(1)
