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
    """
    ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;
    """,
    # --- 以下為教學系統相關 ---
    """
    ALTER TABLE itineraries
    ADD COLUMN IF NOT EXISTS morning_departure VARCHAR(50);
    """,
    """
    ALTER TABLE itineraries
    ADD COLUMN IF NOT EXISTS data_latlng JSONB;
    """,
    """
    ALTER TABLE itineraries
    ADD COLUMN IF NOT EXISTS detailed_itinerary JSONB;
    """,
    """
    ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS is_tutorial BOOLEAN NOT NULL DEFAULT FALSE;
    """,
    # 將舊版以 title='__tutorial__' 識別的教學專案升級為 is_tutorial=TRUE
    """
    UPDATE projects
    SET is_tutorial = TRUE
    WHERE title = '__tutorial__' AND is_tutorial = FALSE;
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

    print("✅ migration 完成（itineraries: interests/start_date/morning_departure/data_latlng/detailed_itinerary; projects: is_pinned/is_tutorial）")


if __name__ == "__main__":
    run_migration()
