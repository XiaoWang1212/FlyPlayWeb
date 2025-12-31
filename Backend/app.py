from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from routes.map_routes import map_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    CORS(app)
    
    app.register_blueprint(map_bp, url_prefix='/api/maps')
    
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
        """500 錯誤處理"""
        return jsonify({
            'success': False,
            'error': '內部服務器錯誤'
        }), 500
    
    @app.errorhandler(Exception)
    def handle_exception(error):
        """全局異常處理"""
        return jsonify({
            'success': False,
            'error': f'未預期的錯誤: {str(error)}'
        }), 500
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000, host='0.0.0.0')