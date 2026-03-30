from flask import Flask, jsonify, render_template, send_from_directory, request
from flask_cors import CORS
from config import Config
from routes.map_routes import map_bp
from routes.chat_routes import chat_bp
from routes.travel_routes import travel_bp
from routes.auth_routes import auth_bp
from models.plan_model import init_plan_tables
from services.googlemap_service import GoogleMapService
import os
import traceback
import json

# 存储从 setup.html 传来的行程数据
stored_itinerary_data = None

with open('response.json', 'r', encoding='utf-8') as f:
    test_data = json.load(f)
with open('test.json', 'r', encoding='utf-8') as f:
    test_data_2 = json.load(f)

# 初始化 GoogleMapService
google_map_service = GoogleMapService()

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

    
    @app.route('/test/latlng', methods=['GET'])
    def test_latlng():
        all_locations = [
            loc
            for day in test_data_2.get('data', [])
            for loc in day.get('locations', [])
        ]

        center_location = None
        results = []
        # 先找到第一個有座標的地點
        for loc in all_locations:
            search_result = google_map_service.search_places(
                text_query=loc.get('location_name', ''),
                language_code='zh-TW',
                max_results=1
            )
            if search_result.get('success') and search_result.get('places'):
                place = search_result['places'][0]
                location = place.get('location', {})
                if location.get('latitude') and location.get('longitude'):
                    center_location = {
                        'latitude': location['latitude'],
                        'longitude': location['longitude']
                    }
                    results.append({
                        'location_name': loc.get('location_name'),
                        'place_id': place.get('place_id'),
                        'location': center_location
                    })
                    break
        if not center_location:
            return jsonify({
                'success': False,
                'error': '所有地點皆查無座標'
            }), 404

        # 其餘地點用 search_places_nearby 以前一個為參考座標
        for loc in all_locations:
            if loc.get('location_name') == results[0]['location_name']:
                continue
            nearby_result = google_map_service.search_places_nearby(
                text_query=loc.get('location_name', ''),
                location=center_location,
                language_code='zh-TW',
                max_results=1
            )
            if nearby_result.get('success') and nearby_result.get('places'):
                place = nearby_result['places'][0]
                location = place.get('location', {})
                results.append({
                    'location_name': loc.get('location_name'),
                    'place_id': place.get('place_id'),
                    'location': location
                })
                # 更新 center_location 為最新找到的地點
                if location.get('latitude') and location.get('longitude'):
                    center_location = {
                        'latitude': location['latitude'],
                        'longitude': location['longitude']
                    }
            else:
                results.append({
                    'location_name': loc.get('location_name'),
                    'place_id': -1,
                    'location': {}
                })

        return jsonify({
            'success': True,
            'results': results
        }), 200
        
    @app.route('/cache/clear', methods=['POST'])
    def clear_cache():
        """清除所有快取"""
        google_map_service.place_cache.clear_all()
        return jsonify({
            'success': True,
            'message': '所有快取已清除'
        }), 200


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
                    
                    # 使用 search_places 獲取圖片
                    place_name = modified_activity['place_name']
                    if place_name and place_name != '未命名':
                        try:
                            search_result = google_map_service.search_places(
                                place_name, 
                                language_code='zh-TW',
                                max_results=1
                            )
                            
                            if search_result.get('success') and search_result.get('places'):
                                place = search_result['places'][0]
                                
                                location = place.get('location', {})
                                if location.get('latitude') is not None and location.get('longitude') is not None:
                                    modified_activity['location'] = {
                                        'lat': location['latitude'],
                                        'lng': location['longitude']
                                    }
                                
                                if place.get('photos'):
                                    modified_activity['photos'] = [place['photos'][0]]

                                if place.get('rating'):
                                    modified_activity['rating'] = place['rating']
                                
                                if place.get('address'):
                                    modified_activity['address'] = place['address']
                                
                                if place.get('phone'):
                                    modified_activity['phone'] = place['phone']
                                
                        except Exception as e:
                            print(f"獲取 {place_name} 的圖片失敗: {e}")
                    
                    modified_day['activities'].append(modified_activity)
                
                modified_days.append(modified_day)
            
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