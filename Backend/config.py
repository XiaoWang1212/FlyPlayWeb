import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # API Keys
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY')
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
    DATABASE_URL = os.getenv('DATABASE_URL')
    
    # Flask 配置
    SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key')
    DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'
    
    # Firestore
    GOOGLE_APPLICATION_CREDENTIALS = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')

    # JWT 配置
    JWT_SECRET = os.getenv("JWT_SECRET", "changeme")
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRE_SECONDS = int(os.getenv("JWT_EXPIRE_SECONDS", 3600))