from flask import Flask, jsonify, render_template, send_from_directory
from flask_cors import CORS
from config import Config
from routes.map_routes import map_bp
from routes.chat_routes import chat_bp
import os
import traceback
import json

with open('response.json', 'r', encoding='utf-8') as f:
    test_data = json.load(f)


ITINERARY_DATA = {
    "data": {
        "days": [
            {
                "activities": [
                    {"place_name": "秋葉原", "location": {"lat": 35.6994, "lng": 139.7739}},
                    {"place_name": "淺草寺", "location": {"lat": 35.7148, "lng": 139.7967}},
                    {"place_name": "東京塔", "location": {"lat": 35.6586, "lng": 139.7454}}
                    
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
    
    CORS(app)
    
    app.register_blueprint(map_bp, url_prefix='/api/maps')
    app.register_blueprint(chat_bp, url_prefix='/api/chat')

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

    
    # @app.route('/api/itinerary')
    # def get_itinerary_api():
    #     return jsonify(ITINERARY_DATA)
    @app.route('/api/itinerary', methods=['GET'])  
    def parse_itinerary():
        """返回修正好的行程 JSON"""
        try:
            data = test_data
            
            if not data or 'data' not in data:
                return jsonify({
                    'success': False,
                    'error': '無效的請求格式'
                }), 400
            
            parsed_data = data.get('data', {})
            days = parsed_data.get('parsed', {}).get('days', [])
            
            # 修改和驗證數據
            modified_days = []
            for day in days:
                modified_day = {
                    'day': day.get('day'),
                    'weekday': day.get('weekday', ''),
                    'activities': []
                }
                
                # 修改每個活動
                activities = day.get('activities', [])
                for activity in activities:
                    modified_activity = {
                        'place_name': activity.get('place_name', '未命名'),
                        'time': activity.get('time', ''),
                        'description': activity.get('description', ''),
                        'location': activity.get('location', {'lat': 0, 'lng': 0}),
                        'type': activity.get('type', ''),
                        'cost': activity.get('cost', '')
                    }
                    
                    # 驗證 location 是否有效
                    if not modified_activity['location'] or 'lat' not in modified_activity['location']:
                        modified_activity['location'] = {'lat': 0, 'lng': 0}
                    
                    modified_day['activities'].append(modified_activity)
                
                modified_days.append(modified_day)
            print("修改後的行程數據:", modified_days)  # 調試輸出
            # 返回修改後的數據
            return jsonify({
                'data': {
                    'days': modified_days
                }
            }), 200
            
        except Exception as e:
            print(f"行程解析錯誤: {e}")
            print(traceback.format_exc())
            return jsonify({
                'success': False,
                'error': f'行程解析失敗: {str(e)}'
            }), 500
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5001, host='0.0.0.0')