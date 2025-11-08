from flask import Flask
from flask_cors import CORS
from config import Config
from routes.chat_routes import chat_bp
from routes.map_routes import map_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # 啟用 CORS
    CORS(app)
    
    # 註冊藍圖 (Blueprint)
    app.register_blueprint(chat_bp, url_prefix='/api/chat')
    app.register_blueprint(map_bp, url_prefix='/api/maps')
    
    @app.route('/api/health')
    def health_check():
        return {'status': 'ok', 'message': 'Backend is running'}
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)