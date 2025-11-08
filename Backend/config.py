import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # 資料庫配置
    DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///flyplay.db')
    
    # API Keys
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY')
    
    # Flask 配置
    SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key')
    DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'