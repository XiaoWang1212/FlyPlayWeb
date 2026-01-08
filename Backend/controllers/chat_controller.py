from services.openai_service import ChatGPTService
import asyncio

class ChatController:
    def __init__(self):
        self.chat_service = ChatGPTService()
    
    def handle_chat_message(self, message, conversation_history):
        """處理用戶聊天消息"""
        try:
            # 執行異步操作
            result = asyncio.run(
                self.chat_service.chat_with_ai(message, conversation_history)
            )
            return result
        except Exception as e:
            return {
                'success': False,
                'error': f'聊天處理失敗: {str(e)}'
            }
    
    def handle_travel_recommendation(self, location, days, transportation, preferences):
        """處理旅遊推薦請求"""
        try:
            result = asyncio.run(
                self.chat_service.get_travel_recommendation(
                    location, 
                    days, 
                    transportation, 
                    preferences
                )
            )
            return result
        except Exception as e:
            return {
                'success': False,
                'error': f'推薦生成失敗: {str(e)}'
            }
    
    def handle_generate_itinerary(self, location, days, budget, traveler_type, interests):
        """處理完整行程生成"""
        try:
            result = asyncio.run(
                self.chat_service.generate_itinerary(
                    location, 
                    days, 
                    budget, 
                    traveler_type, 
                    interests
                )
            )
            return result
        except Exception as e:
            return {
                'success': False,
                'error': f'行程生成失敗: {str(e)}'
            }
    
    def handle_refine_itinerary(self, itinerary, feedback):
        """處理行程優化請求"""
        try:
            result = asyncio.run(
                self.chat_service.refine_itinerary(itinerary, feedback)
            )
            return result
        except Exception as e:
            return {
                'success': False,
                'error': f'行程優化失敗: {str(e)}'
            }
    
    def handle_travel_tips(self, location, travel_time=None):
        """處理旅遊提示請求"""
        try:
            result = asyncio.run(
                self.chat_service.get_travel_tips(location, travel_time)
            )
            return result
        except Exception as e:
            return {
                'success': False,
                'error': f'提示獲取失敗: {str(e)}'
            }
    
    def handle_clear_history(self):
        """清除對話歷史"""
        try:
            return {
                'success': True,
                'message': '對話歷史已清除'
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'清除失敗: {str(e)}'
            }
