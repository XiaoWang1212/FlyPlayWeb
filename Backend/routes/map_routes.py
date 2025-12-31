from flask import Blueprint, request, jsonify
from controllers.map_controller import MapController

map_bp = Blueprint('maps', __name__)
map_controller = MapController()

@map_bp.route('/search', methods=['POST'])
def text_search():
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
        
        result = map_controller.handle_text_search(
            text_query, 
            language_code, 
            max_results
        )
        
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
        result = map_controller.handle_place_details(place_id)
        
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
        
        if not location:
            return jsonify({
                'success': False,
                'error': '必須提供location參數'
            }), 400
        
        result = map_controller.handle_nearby_search(
            location, 
            radius, 
            included_types,
            language_code,
            max_results
        )
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'服務器錯誤: {str(e)}'
        }), 500
        
@map_bp.route('/distance', methods=['POST'])
def get_distance_and_duration():
    try:
        data = request.get_json()
        origin = data.get('origin')
        destination = data.get('destination')
        mode = data.get('mode', 'driving')
        if not origin or not destination:
            return jsonify({'success': False, 'error': '必須提供origin與destination'}), 400
        result = map_controller.handle_distance_and_duration(origin, destination, mode)
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@map_bp.route('/opening_hours/<place_id>', methods=['GET'])
def get_opening_hours(place_id):
    try:
        result = map_controller.handle_opening_hours(place_id)
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    
@map_bp.route('/opening_hours', methods=['POST'])
def get_opening_hours_by_name():
    """
    支援只傳店名查營業時間
    """
    try:
        data = request.get_json()
        name = data.get('name')
        if not name:
            return jsonify({'success': False, 'error': '請提供店名'}), 400
        result = map_controller.handle_opening_hours(name, is_name=True)
        if result.get('success'):
            return jsonify(result), 200
        else:
            return jsonify(result), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@map_bp.route('/route_details', methods=['POST'])
def get_route_details():
    try:
        data = request.get_json()
        origin = data.get('origin')
        destination = data.get('destination')
        mode = data.get('mode', 'driving')
        if not origin or not destination:
            return jsonify({'success': False, 'error': '必須提供origin與destination'}), 400
        result = map_controller.handle_route_details(origin, destination, mode)
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500  