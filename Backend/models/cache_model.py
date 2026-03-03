import sqlite3
from datetime import datetime, timedelta
import json
import os

class PlaceCache:
    def __init__(self, db_path='Backend/data/cache.db'):
        self.db_path = db_path
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self._init_db()

    def _init_db(self):
        """初始化數據庫表"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS places (
                    place_id TEXT PRIMARY KEY,
                    result TEXT NOT NULL,
                    cached_at TEXT NOT NULL
                )
            ''')
            conn.commit()

    def get(self, place_id, expire_days=7):
        """獲取快取數據"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                'SELECT result, cached_at FROM places WHERE place_id = ?',
                (place_id,)
            )
            row = cursor.fetchone()
            
            if row:
                result, cached_at = row
                cached_time = datetime.fromisoformat(cached_at)
                if datetime.utcnow() - cached_time < timedelta(days=expire_days):
                    return json.loads(result)
        return None

    def set(self, place_id, result):
        """設置快取數據"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                '''INSERT OR REPLACE INTO places (place_id, result, cached_at) 
                   VALUES (?, ?, ?)''',
                (place_id, json.dumps(result), datetime.utcnow().isoformat())
            )
            conn.commit()