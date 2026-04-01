import os
import psycopg2
from psycopg2 import connect, sql
from psycopg2.extras import RealDictCursor
from config import Config

class DatabaseInitializer:
    def __init__(self, database_url=None):
        self.database_url = Config.DATABASE_URL
        if not self.database_url:
            raise ValueError("未偵測到 DATABASE_URL 環境變數")

    def init_all_tables(self):
        """依照關聯順序建立所有資料表"""
        try:
            with connect(self.database_url) as conn:
                with conn.cursor() as cursor:
                    # 1. User 表 (支援 Google 登入)
                    cursor.execute('''
                        CREATE TABLE IF NOT EXISTS users (
                            user_id SERIAL PRIMARY KEY,
                            email VARCHAR(255) UNIQUE NOT NULL,
                            name VARCHAR(100),
                            hash_password TEXT, -- Google 登入者此欄位為空
                            google_id VARCHAR(255) UNIQUE, -- Google 唯一識別碼
                            auth_provider VARCHAR(20) DEFAULT 'local', -- local 或 google
                            created_at TIMESTAMPTZ DEFAULT NOW()
                        );
                    ''')

                    # 2. Hash 表 (若有額外驗證需求)
                    cursor.execute('''
                        CREATE TABLE IF NOT EXISTS user_hashes (
                            user_id INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
                            hash_value TEXT NOT NULL,
                            updated_at TIMESTAMPTZ DEFAULT NOW()
                        );
                    ''')

                    # 3. Project 表 (專案/旅行計畫)
                    cursor.execute('''
                        CREATE TABLE IF NOT EXISTS projects (
                            project_id SERIAL PRIMARY KEY,
                            user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                            title VARCHAR(255) NOT NULL,
                            created_at TIMESTAMPTZ DEFAULT NOW(),
                            updated_at TIMESTAMPTZ DEFAULT NOW()
                        );
                    ''')

                    # 4. Itineraries 表 (具體行程產出)
                    cursor.execute('''
                        CREATE TABLE IF NOT EXISTS itineraries (
                            itinerary_id SERIAL PRIMARY KEY,
                            project_id INTEGER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
                            days INTEGER NOT NULL,
                            departure_airport VARCHAR(255),         -- 原來的出發地改成出發機場
                            destination VARCHAR(255),
                            type VARCHAR(50),                       -- 旅遊類型
                            companion VARCHAR(50),                  -- 旅伴
                            travel_style VARCHAR(50),               -- 旅遊類型詳細（如美食、冒險）
                            budget VARCHAR(50),                     -- 預算等級（中等、高等...）
                            data_json JSONB NOT NULL DEFAULT '{}'::jsonb,  -- 詳細行程內容
                            data_latlng JSONB NOT NULL DEFAULT '{}'::jsonb, -- 經緯度補齊後資料
                            detailed_itinerary JSONB NOT NULL DEFAULT '{}'::jsonb, -- Gemini 詳細行程結果
                            created_at TIMESTAMPTZ DEFAULT NOW()
                        );
                    ''')

                    # 5. Conversation 表 (對話紀錄)
                    cursor.execute('''
                        CREATE TABLE IF NOT EXISTS conversations (
                            conversation_id SERIAL PRIMARY KEY,
                            project_id INTEGER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
                            created_at TIMESTAMPTZ DEFAULT NOW()
                        );
                    ''')

                    # 6. Message 表 (具體訊息)
                    cursor.execute('''
                        CREATE TABLE IF NOT EXISTS messages (
                            message_id SERIAL PRIMARY KEY,
                            conversation_id INTEGER NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
                            role VARCHAR(20) NOT NULL, -- user, assistant
                            content TEXT NOT NULL,
                            created_at TIMESTAMPTZ DEFAULT NOW()
                        );
                    ''')

                    # 建立索引以優化查詢效能
                    cursor.execute('CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);')
                    cursor.execute('CREATE INDEX IF NOT EXISTS idx_itineraries_project ON itineraries(project_id);')
                    cursor.execute('CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);')
                    
                    cursor.execute('''
                        CREATE OR REPLACE FUNCTION update_modified_column()
                        RETURNS TRIGGER AS $$
                        BEGIN
                            NEW.updated_at = NOW();
                            RETURN NEW;
                        END;
                        $$ LANGUAGE plpgsql;
                        ''')

                    cursor.execute('''
                    DO $$
                    BEGIN
                        CREATE TRIGGER update_projects_modtime
                        BEFORE UPDATE ON projects
                        FOR EACH ROW EXECUTE FUNCTION update_modified_column();
                    EXCEPTION WHEN duplicate_object THEN NULL;
                    END
                    $$;
                    ''')

                conn.commit()
                print("--- 所有資料表初始化成功 ---")
        except Exception as e:
            print(f"資料庫初始化失敗: {e}")
            raise
    
    def seed_test_user(self):
        """初始化時加入一個測試帳號"""
        try:
            with connect(self.database_url) as conn:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        INSERT INTO users (email, name, hash_password, auth_provider)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT (email) DO UPDATE
                          SET name = EXCLUDED.name,
                              hash_password = EXCLUDED.hash_password,
                              auth_provider = EXCLUDED.auth_provider
                        RETURNING user_id;
                    """, ('test@gmail.com', '測試用戶', 'password123', 'local'))
                    user_id = cursor.fetchone()[0]
                conn.commit()
            print(f"--- 已初始化假用戶 test@gmail.com (user_id={user_id}) ---")
        except Exception as e:
            print(f"假用戶插入失敗: {e}")
            raise

def init_db():
    initializer = DatabaseInitializer()
    initializer.init_all_tables()
    initializer.seed_test_user()

if __name__ == "__main__":
    init_db()