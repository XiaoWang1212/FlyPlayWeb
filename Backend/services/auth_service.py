import os, datetime, jwt
from psycopg2 import connect
from psycopg2.extras import RealDictCursor
from config import Config


class AuthService:
    def __init__(self, database_url=None):
        self.database_url = database_url or os.getenv("DATABASE_URL")
        if not self.database_url:
            raise ValueError("DATABASE_URL 未設定")
        self.secret = Config.JWT_SECRET
        self.algo = Config.JWT_ALGORITHM
        self.exp = Config.JWT_EXPIRE_SECONDS 

    def _conn(self):
        return connect(self.database_url, cursor_factory=RealDictCursor)

    def _make_token(self, user):
        payload = {
            "user_id": user["user_id"],
            "email": user["email"],
            "exp": datetime.datetime.utcnow() + datetime.timedelta(seconds=self.exp),
        }
        return jwt.encode(payload, self.secret, algorithm=self.algo)

    def login(self, email, password):
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT user_id, email, name, hash_password FROM users WHERE email=%s",
                    (email,),
                )
                user = cur.fetchone()
                if not user:
                    return {"success": False, "error": "帳號不存在"}
                # 本示範直接比對明文，正式要用 hash
                if user["hash_password"] != password:
                    return {"success": False, "error": "密碼錯誤"}
                token = self._make_token(user)
                return {
                    "success": True,
                    "user": {
                        "user_id": user["user_id"],
                        "email": user["email"],
                        "name": user["name"],
                    },
                    "token": token,
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
            
    def verify_token(self, token):
        try:
            payload = jwt.decode(token, self.secret, algorithms=[self.algo])
            return {"user_id": payload["user_id"], "email": payload["email"]}
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None