"""
Database configuration and session management
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, scoped_session
from config import Config

# 創建數據庫引擎
engine = create_engine(
    Config.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in Config.DATABASE_URL else {},
    echo=True
)

# 創建會話工廠
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 使用 scoped_session 確保線程安全
db_session = scoped_session(SessionLocal)

# 創建基類
Base = declarative_base()
Base.query = db_session.query_property()

def init_db():
    """初始化數據庫，創建所有表"""
    import models.user_model
    import models.trip_model
    import models.favorite_model
    Base.metadata.create_all(bind=engine)

def get_db():
    """獲取數據庫會話的依賴注入函數"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
