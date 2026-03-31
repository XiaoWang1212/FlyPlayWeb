from services.auth_service import AuthService

class AuthController:
    def __init__(self):
        self.auth_service = AuthService()

    def login(self, email, password):
        if not email or not password:
            return {"success": False, "error": "email/password 欄位必填"}
        return self.auth_service.login(email, password)

    def register(self, email, password, name=None):
        if not email or not password:
            return {"success": False, "error": "email/password 必填"}
        return self.auth_service.register(email, password, name)