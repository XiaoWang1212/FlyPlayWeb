from flask import Flask, jsonify, render_template, send_from_directory, request
from flask_cors import CORS
from config import Config
from routes.map_routes import map_bp
from routes.chat_routes import chat_bp
from routes.travel_routes import travel_bp
from routes.auth_routes import auth_bp
from models.plan_model import init_plan_tables
from services.googlemap_service import GoogleMapService
from services.data_fix_service import DataFixService
from services.gemini_service import GeminiService
import os
import traceback
import json

# 存储从 setup.html 传来的行程数据
stored_itinerary_data = None

with open('response.json', 'r', encoding='utf-8') as f:
    test_data = json.load(f)
with open('test.json', 'r', encoding='utf-8') as f:
    test_data_2 = json.load(f)

# 初始化服務
google_map_service = GoogleMapService()
data_fix_service = DataFixService()
gemini_service = GeminiService()

def create_app():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    ui_path = os.path.join(base_dir, '../UI')
    
    app = Flask(__name__, template_folder=ui_path)
    app.config.from_object(Config)

    init_plan_tables()
    
    CORS(app)
    
    app.register_blueprint(map_bp, url_prefix='/api/maps')
    app.register_blueprint(chat_bp, url_prefix='/api/chat')
    app.register_blueprint(travel_bp, url_prefix='/api/travel')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    
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

    # @app.route('/api/debug-key', methods=['GET'])
    # def debug_key():
    #     """檢查 API Key 是否被正確加載"""
    #     api_key = Config.GOOGLE_MAPS_API_KEY
        
    #     debug_info = {
    #         'api_key_loaded': api_key is not None and len(api_key) > 0,
    #         'api_key_length': len(api_key) if api_key else 0,
    #         'api_key_prefix': f"{api_key[:10]}..." if api_key else "None",
    #         'api_key_full': api_key,  # 完整 API Key（用於調試）
    #     }
        
    #     return jsonify(debug_info), 200
    
    @app.route('/data/latlng', methods=['GET'])
    def test_latlng():
        """
        測試端點：使用 nearby 模式增強位置坐標信息
        """
        try:
            
            data = test_data_2.get('data', [])
            if not data:
                return jsonify({
                    'success': False,
                    'error': '沒有測試數據'
                }), 400
            
            result = data_fix_service.enrich_data_with_location(data)
            
            if result['success']:
                return jsonify({
                    'success': True,
                    'data': result['data']
                }), 200
            else:
                return jsonify(result), 400
                
        except Exception as e:
            print(f"測試端點錯誤: {e}")
            print(traceback.format_exc())
            return jsonify({
                'success': False,
                'error': f'服務器錯誤: {str(e)}'
            }), 500
        
    @app.route('/cache/clear', methods=['POST'])
    def clear_cache():
        """清除所有快取"""
        google_map_service.place_cache.clear_all()
        return jsonify({
            'success': True,
            'message': '所有快取已清除'
        }), 200

    @app.route('/api/itinerary/detail', methods=['POST'])
    def generate_itinerary_detail():
        """調用 Gemini 生成詳細行程"""
        try:
            request_data = request.get_json()
            
            # 處理新的合併格式：{ data_latlng: {...}, trip_setup: {...} }
            if 'data_latlng' in request_data and 'trip_setup' in request_data:
                existing_itinerary = request_data.get('data_latlng')
                data = request_data.get('trip_setup', {})
            else:
                # 相容舊格式
                existing_itinerary = None
                data = request_data
            
            # 從 trip_setup 中提取配置信息
            location = data.get('location') or (data.get('destinations', [{}])[0].get('city') 
                                   if data.get('destinations') else '東京')
            days = int(data.get('daysValue') or data.get('days', 3))
            budget = data.get('budgetLabel') or data.get('budget') or '中等'
            traveler_type = data.get('companionLabel') or data.get('companion') or '個人'

            if 'travelTypeLabels' in data and isinstance(data['travelTypeLabels'], list):
                interests = data['travelTypeLabels']
            elif 'travelTypeLabel' in data and data['travelTypeLabel']:
                interests = [data['travelTypeLabel']]
            else:
                interests = []

            print(f"→ 呼叫 generate_itinerary_detail")
            print(f"   位置: {location}, 天數: {days}, 預算: {budget}")
            
            # 調用 GeminiService
            result = gemini_service.generate_itinerary_detail(
                location=location,
                days=days,
                budget=budget,
                traveler_type=traveler_type,
                interests=interests,
                existing_itinerary=existing_itinerary
            )
            
            if result['success']:
                print("✓ 詳細行程已生成")
                return jsonify({
                    'code': 200,
                    'message': '詳細行程已生成',
                    'data': result['data']
                }), 200
            else:
                print(f"✗ 生成失敗: {result['error']}")
                return jsonify({
                    'code': 400,
                    'error': result['error']
                }), 400
                
        except Exception as e:
            print(f"生成詳細行程錯誤: {e}")
            print(traceback.format_exc())
            return jsonify({
                'success': False,
                'error': f'詳細行程生成失敗: {str(e)}'
            }), 500

    @app.route('/api/itinerary', methods=['POST', 'GET'])  
    def parse_itinerary():
        global stored_itinerary_data
        
        try:
            if request.method == 'POST':
                incoming_data = request.get_json()
                if incoming_data:
                    stored_itinerary_data = incoming_data
                    print(stored_itinerary_data)
                    return jsonify({
                        'code': 200,
                        'message': '數據已接收'
                    }), 200
            
            # GET 方法：返回完整的行程數據
            if stored_itinerary_data:
                response_data = stored_itinerary_data
                message = response_data.get('message', '')
                raw_output = response_data.get('data', {}).get('raw_output', '')
            else:
                response_data = test_data
                message = ''
                raw_output = ''
                print("→ 使用默认 testdata")
            
            if not response_data or ('data' not in response_data and 'parsed' not in response_data):
                return jsonify({
                    'success': False,
                    'error': '無效的請求格式'
                }), 400
            
            if 'data' in response_data:
                parsed_data = response_data.get('data', {})
                days = parsed_data.get('parsed', {}).get('days', [])
            else:
                days = response_data.get('parsed', {}).get('days', []) if 'parsed' in response_data else []
            

            modified_days = data_fix_service.enrich_data_with_picture(days)
            
            print("✓ 行程數據已處理完成")  
            
            # 返回修改後的數據 + 原始信息
            return jsonify({
                'code': 200,
                'message': message,
                'data': {
                    'days': modified_days,
                    'raw_output': raw_output
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