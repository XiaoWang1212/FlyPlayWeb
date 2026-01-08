class OAuthService:
    def __init__(self, user_repo ):
        self.user_repo = user_repo
    
    def login_or_link_google_user(self, *, google_id: str, email: str, username: str, thumbnail: str | None):
        user = self.user_repo.find_by_google_id(google_id)
        if user:
            return user
        
        existing = self.user_repo.find_by_email(email)
        if existing:
            self.user_repo.users.update_one(
                {"_id": existing["_id"]},
                {"$set": {"google_id": google_id, "thumbnail": thumbnail, "verified": True}}
            )
            return self.user_repo.find_by_email(email)
        
        self.user_repo.upsert_google_user(
            google_id = google_id,
            email = email,
            username = username,
            thumbnail = thumbnail,
        )
        return self.user_repo.find_by_google_id(google_id)