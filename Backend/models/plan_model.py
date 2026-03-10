import os
import sqlite3
from psycopg2 import connect
from psycopg2 import Error as PsycopgError


class PlanTableInitializer:
    def __init__(self, db_path='Backend/data/cache.db', database_url=None):
        self.db_path = db_path
        self.database_url = database_url or os.getenv('DATABASE_URL')
        self.use_postgres = bool(self.database_url and self.database_url.startswith('postgres'))
        self.postgres_error = None

        if self.use_postgres:
            try:
                self._init_postgres_tables()
            except PsycopgError as error:
                self.postgres_error = str(error)
                self._init_sqlite_tables()
        else:
            self._init_sqlite_tables()

    def _init_postgres_tables(self):
        with connect(self.database_url) as conn:
            with conn.cursor() as cursor:
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS plans (
                        id SERIAL PRIMARY KEY,
                        title VARCHAR(255) NOT NULL,
                        description TEXT,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    )
                ''')

                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS itinerary_plans (
                        id SERIAL PRIMARY KEY,
                        plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
                        day_number INTEGER NOT NULL,
                        itinerary_content JSONB NOT NULL,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    )
                ''')

                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS ai_chat_records (
                        id SERIAL PRIMARY KEY,
                        plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
                        role VARCHAR(20) NOT NULL,
                        message TEXT NOT NULL,
                        metadata JSONB,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    )
                ''')

                cursor.execute('''
                    CREATE INDEX IF NOT EXISTS idx_itinerary_plan_id
                    ON itinerary_plans(plan_id)
                ''')

                cursor.execute('''
                    CREATE INDEX IF NOT EXISTS idx_chat_plan_id
                    ON ai_chat_records(plan_id)
                ''')

            conn.commit()

    def _init_sqlite_tables(self):
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('PRAGMA foreign_keys = ON')

            conn.execute('''
                CREATE TABLE IF NOT EXISTS plans (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    description TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            ''')

            conn.execute('''
                CREATE TABLE IF NOT EXISTS itinerary_plans (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    plan_id INTEGER NOT NULL,
                    day_number INTEGER NOT NULL,
                    itinerary_content TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(plan_id) REFERENCES plans(id) ON DELETE CASCADE
                )
            ''')

            conn.execute('''
                CREATE TABLE IF NOT EXISTS ai_chat_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    plan_id INTEGER NOT NULL,
                    role TEXT NOT NULL,
                    message TEXT NOT NULL,
                    metadata TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(plan_id) REFERENCES plans(id) ON DELETE CASCADE
                )
            ''')

            conn.execute('''
                CREATE INDEX IF NOT EXISTS idx_itinerary_plan_id
                ON itinerary_plans(plan_id)
            ''')

            conn.execute('''
                CREATE INDEX IF NOT EXISTS idx_chat_plan_id
                ON ai_chat_records(plan_id)
            ''')

            conn.commit()


def init_plan_tables():
    return PlanTableInitializer()