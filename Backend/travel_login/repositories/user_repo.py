from typing import Any, Optional

class UserRepository:
    def __init__(self, users_collection):
        self.users = users_collection

    def find_by_email(self, email: str) -> Optional[dict]:
        return self.users.find_one({"email": email})

    def create_user(self, *, email: str, username: str, password_hash: str, verify_token: str) -> Any:
        return self.users.insert_one({
            "email": email,
            "username": username,
            "password": password_hash,
            "verified": False,
            "verify_token": verify_token,
        })

    def mark_verified(self, email: str) -> Any:
        return self.users.update_one({"email": email}, {"$set": {"verified": True}})

    def update_password_hash(self, email: str, password_hash: str) -> Any:
        return self.users.update_one({"email": email}, {"$set": {"password": password_hash}})
    
    def find_by_google_id(self, google_id: str):
        return self.users.find_one({"google_id": google_id})
    
    def upseret_google_id(self, *, google_id: str, email: str, username:str, thumbnail: str | None = None):
        return self.users.update_one(
            {"google_id": google_id},
            {"$set":{
                "google_id": google_id,
                "email": email,
                "username": username,
                "thumbnail": thumbnail,
                "verified": True,
            }},
            upsert = True
        )
