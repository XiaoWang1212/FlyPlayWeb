from psycopg2 import connect
from config import Config


SQL_STATEMENTS = [
    """
    ALTER TABLE itineraries
    ADD COLUMN IF NOT EXISTS interests JSONB NOT NULL DEFAULT '[]'::jsonb;
    """,
    """
    ALTER TABLE itineraries
    ADD COLUMN IF NOT EXISTS start_date DATE;
    """,
    """
    ALTER TABLE itineraries
    DROP COLUMN IF EXISTS travel_style;
    """,
]


def run_migration() -> None:
    database_url = Config.DATABASE_URL
    if not database_url:
        raise ValueError("未偵測到 DATABASE_URL 環境變數")

    with connect(database_url) as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT to_regclass('public.itineraries');")
            table_name = cursor.fetchone()[0]
            if table_name is None:
                raise RuntimeError(
                    "找不到 itineraries 資料表，請先完成基礎資料庫初始化"
                )

            for statement in SQL_STATEMENTS:
                cursor.execute(statement)

        conn.commit()

    print("✅ itineraries schema migration 完成（interests/start_date/travel_style）")


if __name__ == "__main__":
    run_migration()
