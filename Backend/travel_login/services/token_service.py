from itsdangerous import URLSafeTimedSerializer

class TokenService:
    def __init__(self, secret_key: str):
        self.serializer = URLSafeTimedSerializer(secret_key)

    # Email verification
    def make_email_confirm_token(self, email: str) -> str:
        return self.serializer.dumps(email, salt="email-confirm")

    def load_email_confirm_token(self, token: str, *, max_age: int = 3600) -> str:
        return self.serializer.loads(token, salt="email-confirm", max_age=max_age)

    # Password reset
    def make_reset_token(self, data: dict) -> str:
        return self.serializer.dumps(data, salt="reset-password")

    def load_reset_token(self, token: str, *, max_age: int = 3600) -> dict:
        return self.serializer.loads(token, salt="reset-password", max_age=max_age)
