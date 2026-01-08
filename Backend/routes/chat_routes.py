from flask import Blueprint, request, jsonify
from controllers.chat_controller import ChatController

chat_bp = Blueprint('chat', __name__)
chat_controller = ChatController()

@chat_bp.route('/message', methods=['POST'])
def send_message():
    """發送聊天消息給 AI"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': '請求體不能為空'
            }), 400
        
        message = data.get('message') or data.get('text')
        conversation_history = data.get('conversationHistory', [])
        
        if not message:
            return jsonify({
                'success': False,
                'error': '必須提供message參數'
            }), 400
        
        result = chat_controller.handle_chat_message(message, conversation_history)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'服務器錯誤: {str(e)}'
        }), 500

@chat_bp.route('/recommendation', methods=['POST'])
def get_travel_recommendation():
    """根據使用者參數生成旅遊行程推薦"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': '請求體不能為空'
            }), 400
        
        location = data.get('location')
        days = data.get('days')
        transportation = data.get('transportation', 'public_transport')
        preferences = data.get('preferences') or data.get('preference')
        
        if not location or not days:
            return jsonify({
                'success': False,
                'error': '必須提供location與days參數'
            }), 400
        
        result = chat_controller.handle_travel_recommendation(
            location, 
            days, 
            transportation, 
            preferences
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

@chat_bp.route('/itinerary', methods=['POST'])
def generate_itinerary():
    """根據詳細信息生成完整行程"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': '請求體不能為空'
            }), 400
        
        location = data.get('location')
        days = data.get('days')
        budget = data.get('budget')
        traveler_type = data.get('travelerType') or data.get('traveler_type')
        interests = data.get('interests', [])
        
        if not location or not days:
            return jsonify({
                'success': False,
                'error': '必須提供location與days參數'
            }), 400
        
        result = chat_controller.handle_generate_itinerary(
            location, 
            days, 
            budget, 
            traveler_type, 
            interests
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

@chat_bp.route('/refine', methods=['POST'])
def refine_itinerary():
    """根據使用者反饋優化現有行程"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': '請求體不能為空'
            }), 400
        
        itinerary = data.get('itinerary')
        feedback = data.get('feedback')
        
        if not itinerary or not feedback:
            return jsonify({
                'success': False,
                'error': '必須提供itinerary與feedback參數'
            }), 400
        
        result = chat_controller.handle_refine_itinerary(itinerary, feedback)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'服務器錯誤: {str(e)}'
        }), 500

@chat_bp.route('/tips', methods=['POST'])
def get_travel_tips():
    """獲取目的地旅遊提示與建議"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': '請求體不能為空'
            }), 400
        
        location = data.get('location')
        travel_time = data.get('travelTime') or data.get('travel_time')
        
        if not location:
            return jsonify({
                'success': False,
                'error': '必須提供location參數'
            }), 400
        
        result = chat_controller.handle_travel_tips(location, travel_time)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'服務器錯誤: {str(e)}'
        }), 500

@chat_bp.route('/clear-history', methods=['POST'])
def clear_conversation_history():
    """清除對話歷史"""
    try:
        result = chat_controller.handle_clear_history()
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'服務器錯誤: {str(e)}'
        }), 500
