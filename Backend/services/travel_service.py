import os
import json
from psycopg2 import connect
from psycopg2.extras import RealDictCursor
from services.openai_service import ChatGPTService


class TravelService:
    def __init__(self, database_url=None):
        self.database_url = database_url or os.getenv("DATABASE_URL")
        if not self.database_url:
            raise ValueError("未偵測到 DATABASE_URL")
        self.chatgpt = ChatGPTService()

    def _conn(self):
        return connect(self.database_url, cursor_factory=RealDictCursor)

    def create_project(self, user_id, title):
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO projects (user_id, title)
                    VALUES (%s, %s)
                    RETURNING project_id, user_id, title, created_at
                    """,
                    (user_id, title),
                )
                return cur.fetchone()

    def create_itinerary(self, project_id, days, destination, type_, money, data_json):
        with self._conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    INSERT INTO itineraries (project_id, days, destination, type, money, data_json)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING itinerary_id
                """,
                    (project_id, days, destination, type, money, json.dumps(data_json)),
                )
                new_id = cur.fetchone()["itinerary_id"]
            conn.commit()
        return new_id

    def get_itineraries(self, project_id):
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM itineraries WHERE project_id=%s ORDER BY created_at DESC",
                    (project_id,),
                )
                return cur.fetchall()

    def save_conversation_message(self, conversation_id, role, content):
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO messages (conversation_id, role, content)
                    VALUES (%s, %s, %s)
                    RETURNING message_id, created_at
                    """,
                    (conversation_id, role, content),
                )
                return cur.fetchone()

    def get_projects(self, user_id):
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT project_id, user_id, title, created_at, updated_at FROM projects WHERE user_id=%s ORDER BY created_at DESC",
                    (user_id,),
                )
                return cur.fetchall()

    def get_itinerary(self, itinerary_id):
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM itineraries WHERE itinerary_id=%s",
                    (itinerary_id,),
                )
                return cur.fetchone()

    def update_itinerary(self, itinerary_id, **fields):
        if not fields:
            return None
        allowed = ["days", "destination", "type", "money", "data_json"]
        set_items = []
        values = []
        for key, value in fields.items():
            if key not in allowed:
                continue
            set_items.append(f"{key}=%s")
            if key == "data_json":
                values.append(json.dumps(value))
            else:
                values.append(value)
        if not set_items:
            return None
        values.append(itinerary_id)
        sql = f"UPDATE itineraries SET {', '.join(set_items)}, updated_at=NOW() WHERE itinerary_id=%s RETURNING *"
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, tuple(values))
                return cur.fetchone()

    def delete_itinerary(self, itinerary_id):
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM itineraries WHERE itinerary_id=%s RETURNING itinerary_id",
                    (itinerary_id,),
                )
                return cur.fetchone()

    def delete_project(self, project_id):
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM projects WHERE project_id=%s RETURNING project_id",
                    (project_id,),
                )
                return cur.fetchone()

    async def generate_itinerary(
        self, location, days, budget, traveler_type, interests, start_date=None
    ):
        return await self.chatgpt.generate_itinerary(
            location, days, budget, traveler_type, interests, start_date
        )
