from flask import Blueprint, request, jsonify
from controllers.chat_controller import ChatController

chat_bp = Blueprint('chat', __name__)
chat_controller = ChatController()

def unified_response(code, message, data=None):
    """統一 API 回傳格式"""
    return jsonify({
        "code": code,
        "message": message,
        "data": data
    }), 200

@chat_bp.route('/message', methods=['POST'])
def send_message():
    try:
        data = request.get_json()
        if not data:
            return unified_response(400, '請求體不能為空')
        
        message = data.get('message') or data.get('text')
        conversation_history = data.get('conversationHistory', [])
        
        if not message:
            return unified_response(400, '必須提供 message 參數')
        
        result = chat_controller.handle_chat_message(message, conversation_history)
        
        if result['success']:
            return unified_response(200, '成功', result['data'])
        else:
            return unified_response(500, result['error'])
    except Exception as e:
        return unified_response(500, f'服務器錯誤: {str(e)}')

@chat_bp.route('/recommendation', methods=['POST'])
def get_travel_recommendation():
    try:
        data = request.get_json()
        if not data:
            return unified_response(400, '請求體不能為空')
        
        location = data.get('location')
        days = data.get('days')
        transportation = data.get('transportation', 'public_transport')
        preferences = data.get('preferences')
        
        if not location or not days:
            return unified_response(400, '必須提供 location 與 days 參數')
        
        result = chat_controller.handle_travel_recommendation(
            location, days, transportation, preferences
        )
        
        if result['success']:
            return unified_response(200, '推薦生成成功', result['data'])
        else:
            return unified_response(500, result['error'])
    except Exception as e:
        return unified_response(500, f'服務器錯誤: {str(e)}')

@chat_bp.route('/itinerary', methods=['POST'])
def generate_itinerary():
    try:
        data = request.get_json()
        if not data:
            return unified_response(400, '請求體不能為空')
        
        location = data.get('location')
        days = data.get('days')
        budget = data.get('budget', '中等')
        traveler_type = data.get('travelerType', '獨旅')
        interests = data.get('interests', [])
        start_date = data.get('startDate') or data.get('start_date') # 支援兩種命名
        
        if not location or not days:
            return unified_response(400, '必須提供 location 與 days 參數')
        
        result = chat_controller.handle_generate_itinerary(
            location, days, budget, traveler_type, interests, start_date
        )
        
        if result['success']:
            return unified_response(200, '行程生成成功', result['data'])
        else:
            return unified_response(500, result['error'])
    except Exception as e:
        return unified_response(500, f'服務器錯誤: {str(e)}')

@chat_bp.route('/refine', methods=['POST'])
def refine_itinerary():
    try:
        data = request.get_json()
        if not data:
            return unified_response(400, '請求體不能為空')
        
        itinerary = data.get('itinerary')
        feedback = data.get('feedback')
        
        if not itinerary or not feedback:
            return unified_response(400, '必須提供 itinerary 與 feedback 參數')
        
        result = chat_controller.handle_refine_itinerary(itinerary, feedback)
        
        if result['success']:
            return unified_response(200, '行程優化成功', result['data'])
        else:
            return unified_response(500, result['error'])
    except Exception as e:
        return unified_response(500, f'服務器錯誤: {str(e)}')

@chat_bp.route('/tips', methods=['POST'])
def get_travel_tips():
    try:
        data = request.get_json()
        if not data:
            return unified_response(400, '請求體不能為空')
        
        location = data.get('location')
        travel_time = data.get('travelTime')
        
        if not location:
            return unified_response(400, '必須提供 location 參數')
        
        result = chat_controller.handle_travel_tips(location, travel_time)
        
        if result['success']:
            return unified_response(200, '提示獲取成功', result['data'])
        else:
            return unified_response(500, result['error'])
    except Exception as e:
        return unified_response(500, f'服務器錯誤: {str(e)}')

@chat_bp.route('/clear-history', methods=['POST'])
def clear_conversation_history():
    try:
        result = chat_controller.handle_clear_history()
        
        if result['success']:
            return unified_response(200, '對話歷史已清除')
        else:
            return unified_response(500, result['error'])
    except Exception as e:
        return unified_response(500, f'服務器錯誤: {str(e)}')