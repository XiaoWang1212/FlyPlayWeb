from flask import Blueprint, request, jsonify
from services.chatgpt_service import ChatGPTService
import asyncio

chat_bp = Blueprint('chat', __name__)
chat_service = ChatGPTService()

@chat_bp.route('/recommend', methods=['POST'])
def get_recommendation():
    data = request.get_json()
    location = data.get('location')
    preferences = data.get('preferences', '')
    
    result = asyncio.run(chat_service.get_travel_recommendation(location, preferences))
    return jsonify(result)

@chat_bp.route('/message', methods=['POST'])
def chat_message():
    data = request.get_json()
    message = data.get('message')
    history = data.get('history', [])
    
    result = asyncio.run(chat_service.chat_with_ai(message, history))
    return jsonify(result)