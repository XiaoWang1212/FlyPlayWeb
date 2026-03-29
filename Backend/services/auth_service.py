import os
from psycopg2 import connect
from psycopg2.extras import RealDictCursor

class AuthService:
    def __init__(self, database_url=None):
        self.database_url = database_url or os.getenv("DATABASE_URL")
        if not self.database_url:
            raise ValueError("DATABASE_URL 未設定")

    def _conn(self):
        return connect(self.database_url, cursor_factory=RealDictCursor)

    def login(self, email, password):
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT user_id, email, name, hash_password FROM users WHERE email=%s", (email,))
                user = cur.fetchone()
                if not user:
                    return {"success": False, "error": "帳號不存在"}
                # 本示範直接比對明文，正式要用 hash
                if user["hash_password"] != password:
                    return {"success": False, "error": "密碼錯誤"}
                return {
                    "success": True,
                    "user": {"user_id": user["user_id"], "email": user["email"], "name": user["name"]}
                }

    def register(self, email, password, name=None):
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT user_id FROM users WHERE email=%s", (email,))
                if cur.fetchone():
                    return {"success": False, "error": "Email 已被註冊"}
                cur.execute(
                    "INSERT INTO users (email, name, hash_password) VALUES (%s, %s, %s) RETURNING user_id, email, name",
                    (email, name, password),
                )
                user = cur.fetchone()
                return {"success": True, "user": user}