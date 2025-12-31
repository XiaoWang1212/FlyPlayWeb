"""
Map Routes - 地圖路由
定義地圖和地點相關的路由端點（使用新版Google Places API）
"""
from flask import Blueprint, request, jsonify
from controllers.map_controller import MapController

map_bp = Blueprint('maps', __name__)
map_controller = MapController()

@map_bp.route('/search', methods=['POST'])
def text_search():
    """文字搜索地點（新版API）"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': '請求體不能為空'
            }), 400
        
        text_query = data.get('textQuery') or data.get('text_query')
        language_code = data.get('languageCode', 'zh-TW')
        max_results = data.get('maxResultCount', 5)
        
        # 調用控制器處理業務邏輯
        result = map_controller.handle_text_search(
            text_query, 
            language_code, 
            max_results
        )
        
        # 根據結果返回相應的響應
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'服務器錯誤: {str(e)}'
        }), 500

@map_bp.route('/details/<place_id>', methods=['GET'])
def get_place_details(place_id):
    """獲取地點詳情"""
    try:
        # 調用控制器處理業務邏輯
        result = map_controller.handle_place_details(place_id)
        
        # 根據結果返回相應的響應
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'服務器錯誤: {str(e)}'
        }), 500

@map_bp.route('/nearby', methods=['POST'])
def nearby_search():
    """附近搜索"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': '請求體不能為空'
            }), 400
        
        location = data.get('location')
        radius = data.get('radius', 1500)
        included_types = data.get('includedTypes') or data.get('types')
        language_code = data.get('languageCode', 'zh-TW')
        max_results = data.get('maxResultCount', 10)
        
        # 驗證location
        if not location:
            return jsonify({
                'success': False,
                'error': '必須提供location參數'
            }), 400
        
        # 調用控制器處理業務邏輯
        result = map_controller.handle_nearby_search(
            location, 
            radius, 
            included_types,
            language_code,
            max_results
        )
        
        # 根據結果返回相應的響應
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'服務器錯誤: {str(e)}'
        }), 500