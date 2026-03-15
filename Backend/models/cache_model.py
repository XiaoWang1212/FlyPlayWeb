import sqlite3
from datetime import datetime, timedelta
import json
import os
import psycopg2
from psycopg2 import Error as PsycopgError

class PlaceCache:
    def __init__(self, db_path='Backend/data/cache.db', database_url=None):
        self.db_path = db_path
        self.database_url = database_url or os.getenv('DATABASE_URL')
        self.use_postgres = bool(self.database_url and self.database_url.startswith('postgres'))
        self.postgres_error = None

        if self.use_postgres:
            try:
                self._init_postgres()
            except PsycopgError as error:
                self.postgres_error = str(error)
                self._fallback_to_sqlite()
        else:
            self._fallback_to_sqlite()

    def _fallback_to_sqlite(self):
        self.use_postgres = False
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_sqlite()

    def _init_sqlite(self):
        """初始化 SQLite 表"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS places (
                    place_id TEXT PRIMARY KEY,
                    result TEXT NOT NULL,
                    cached_at TEXT NOT NULL
                )
            ''')
            conn.commit()

    def _init_postgres(self):
        """初始化 PostgreSQL 表"""
        with psycopg2.connect(self.database_url) as conn:
            with conn.cursor() as cursor:
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS places (
                        place_id TEXT PRIMARY KEY,
                        result JSONB NOT NULL,
                        cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    )
                ''')
            conn.commit()

    def get(self, place_id, expire_days=7):
        """獲取快取數據"""
        if self.use_postgres:
            try:
                with psycopg2.connect(self.database_url) as conn:
                    with conn.cursor() as cursor:
                        cursor.execute(
                            'SELECT result, cached_at FROM places WHERE place_id = %s',
                            (place_id,)
                        )
                        row = cursor.fetchone()

                        if row:
                            result, cached_at = row
                            cached_time = cached_at.replace(tzinfo=None) if cached_at.tzinfo else cached_at
                            if datetime.utcnow() - cached_time < timedelta(days=expire_days):
                                return result if isinstance(result, dict) else json.loads(result)
            except PsycopgError as error:
                self.postgres_error = str(error)
                self._fallback_to_sqlite()
            return None

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
        if self.use_postgres:
            try:
                with psycopg2.connect(self.database_url) as conn:
                    with conn.cursor() as cursor:
                        cursor.execute(
                            '''INSERT INTO places (place_id, result, cached_at)
                               VALUES (%s, %s::jsonb, %s)
                               ON CONFLICT (place_id)
                               DO UPDATE SET result = EXCLUDED.result, cached_at = EXCLUDED.cached_at''',
                            (place_id, json.dumps(result), datetime.utcnow())
                        )
                    conn.commit()
                return
            except PsycopgError as error:
                self.postgres_error = str(error)
                self._fallback_to_sqlite()

        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                '''INSERT OR REPLACE INTO places (place_id, result, cached_at) 
                   VALUES (?, ?, ?)''',
                (place_id, json.dumps(result), datetime.utcnow().isoformat())
            )
            conn.commit()
            
    def clear_all(self):
        """清除所有快取"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('DELETE FROM places')
            conn.commit()