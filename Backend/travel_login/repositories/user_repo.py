from dataclasses import dataclass
from typing import Any, Optional


@dataclass
class RepoResult:
    inserted_id: Optional[int] = None
    matched_count: int = 0
    modified_count: int = 0
    upserted_id: Optional[int] = None

class UserRepository:
    def __init__(self, users_connection):
        self.conn = users_connection

    def _to_user_dict(self, row) -> Optional[dict]:
        if row is None:
            return None
        return {
            "_id": row["id"],
            "email": row["email"],
            "username": row["username"],
            "password": row["password"],
            "verified": bool(row["verified"]),
            "verify_token": row["verify_token"],
            "google_id": row["google_id"],
            "thumbnail": row["thumbnail"],
        }

    def find_by_email(self, email: str) -> Optional[dict]:
        row = self.conn.execute(
            "SELECT id, email, username, password, verified, verify_token, google_id, thumbnail FROM users WHERE email = ?",
            (email,),
        ).fetchone()
        return self._to_user_dict(row)

    def create_user(self, *, email: str, username: str, password_hash: str, verify_token: str) -> Any:
        cursor = self.conn.execute(
            """
            INSERT INTO users (email, username, password, verified, verify_token)
            VALUES (?, ?, ?, 0, ?)
            """,
            (email, username, password_hash, verify_token),
        )
        self.conn.commit()
        return RepoResult(inserted_id=cursor.lastrowid)

    def mark_verified(self, email: str) -> Any:
        cursor = self.conn.execute(
            "UPDATE users SET verified = 1 WHERE email = ?",
            (email,),
        )
        self.conn.commit()
        return RepoResult(matched_count=cursor.rowcount, modified_count=cursor.rowcount)

    def update_password_hash(self, email: str, password_hash: str) -> Any:
        cursor = self.conn.execute(
            "UPDATE users SET password = ? WHERE email = ?",
            (password_hash, email),
        )
        self.conn.commit()
        return RepoResult(matched_count=cursor.rowcount, modified_count=cursor.rowcount)
    
    def find_by_google_id(self, google_id: str):
        row = self.conn.execute(
            "SELECT id, email, username, password, verified, verify_token, google_id, thumbnail FROM users WHERE google_id = ?",
            (google_id,),
        ).fetchone()
        return self._to_user_dict(row)

    def link_google_to_existing_user(self, *, user_id: int, google_id: str, thumbnail: str | None = None):
        cursor = self.conn.execute(
            """
            UPDATE users
            SET google_id = ?, thumbnail = ?, verified = 1
            WHERE id = ?
            """,
            (google_id, thumbnail, user_id),
        )
        self.conn.commit()
        return RepoResult(matched_count=cursor.rowcount, modified_count=cursor.rowcount)
    
    def upsert_google_user(self, *, google_id: str, email: str, username:str, thumbnail: str | None = None):
        existing = self.find_by_google_id(google_id)
        if existing:
            cursor = self.conn.execute(
                """
                UPDATE users
                SET email = ?, username = ?, thumbnail = ?, verified = 1
                WHERE google_id = ?
                """,
                (email, username, thumbnail, google_id),
            )
            self.conn.commit()
            return RepoResult(matched_count=cursor.rowcount, modified_count=cursor.rowcount)

        cursor = self.conn.execute(
            """
            INSERT INTO users (email, username, password, verified, verify_token, google_id, thumbnail)
            VALUES (?, ?, '', 1, '', ?, ?)
            """,
            (email, username, google_id, thumbnail),
        )
        self.conn.commit()
        return RepoResult(inserted_id=cursor.lastrowid, upserted_id=cursor.lastrowid)

    def upseret_google_id(self, *, google_id: str, email: str, username:str, thumbnail: str | None = None):
        return self.upsert_google_user(
            google_id=google_id,
            email=email,
            username=username,
            thumbnail=thumbnail,
        )
