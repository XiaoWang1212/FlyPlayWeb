from flask import Flask, jsonify, render_template, send_from_directory
from flask_cors import CORS
from config import Config
from routes.map_routes import map_bp
from routes.chat_routes import chat_bp
from models.plan_model import init_plan_tables
import os
import traceback

if Config.GOOGLE_APPLICATION_CREDENTIALS:
    os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = Config.GOOGLE_APPLICATION_CREDENTIALS

if Config.OPENAI_API_KEY:
    os.environ['OPENAI_API_KEY'] = Config.OPENAI_API_KEY

if Config.GOOGLE_MAPS_API_KEY:
    os.environ['GOOGLE_MAPS_API_KEY'] = Config.GOOGLE_MAPS_API_KEY

ITINERARY_DATA = {
    "data": {
        "days": [
            {
                "activities": [
                    {"place_name": "秋葉原", "location": {"lat": 35.6994, "lng": 139.7739}},
                    {"place_name": "淺草寺", "location": {"lat": 35.7148, "lng": 139.7967}},
                    {"place_name": "東京塔", "location": {"lat": 35.6586, "lng": 139.7454}},
                    {"place_name": "新宿御苑", "location": {"lat": 35.6852, "lng": 139.7100}}
                ]
            }
        ]
    }
}

def create_app():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    ui_path = os.path.join(base_dir, '../UI')
    
    app = Flask(__name__, template_folder=ui_path)
    app.config.from_object(Config)

    init_plan_tables()
    
    CORS(app)
    
    app.register_blueprint(map_bp, url_prefix='/api/maps')
    app.register_blueprint(chat_bp, url_prefix='/api/chat')

    @app.route('/map')
    def map_page():
        return render_template('index.html')
    
    @app.route('/api/google-key')
    def get_key():
        return jsonify({
        "key": app.config.get("GOOGLE_MAPS_API_KEY")
    })

    @app.route('/')
    def index():
        return jsonify({
            'success': True,
            'api': 'Google Places API (New)',
        }), 200
    
    @app.errorhandler(404)
    def not_found(error):
        """404 錯誤處理"""
        return jsonify({
            'success': False,
            'error': 'API端點未找到'
        }), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        print(f"錯誤: {error}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(error),
            'traceback': traceback.format_exc()
        }), 500
    
    @app.errorhandler(Exception)
    def handle_exception(error):
        """全局異常處理"""
        return jsonify({
            'success': False,
            'error': f'未預期的錯誤: {str(error)}'
        }), 500

    @app.route('/api/itinerary')
    def get_itinerary_api():
        return jsonify(ITINERARY_DATA)
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5001, host='0.0.0.0')