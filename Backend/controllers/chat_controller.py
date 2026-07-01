from services.gemini_service import GeminiService
from services.travel_service import TravelService
import asyncio
import json
import nest_asyncio

# 允許在已有事件迴圈的環境中重用迴圈
nest_asyncio.apply()

class ChatController:
    def __init__(self):
        self.chat_service = GeminiService()
        self.travel_service = TravelService()

    def handle_chat_message(
        self,
        message,
        conversation_history,
        trip_context=None,
        current_itinerary=None,
        current_day_index=-1,
        itinerary_id=None,
    ):
        """處理用戶聊天消息"""
        try:
            if not str(message or "").strip():
                return {
                    'success': False,
                    'error': '必須提供聊天內容',
                }

            latlng_itinerary = None
            if itinerary_id:
                try:
                    row = self.travel_service.get_itinerary(int(itinerary_id))
                    if row:
                        latlng_itinerary = row.get('data_latlng')
                except Exception:
                    pass

            result = self.chat_service.chat_with_ai(
                message,
                conversation_history,
                trip_context,
                current_itinerary,
                current_day_index,
                latlng_itinerary=latlng_itinerary,
            )

            if result.get('success') and itinerary_id and isinstance(current_itinerary, list):
                try:
                    self._persist_found_photos(int(itinerary_id), current_itinerary)
                except Exception:
                    pass

            return result
        except Exception as e:
            return {'success': False, 'error': f'聊天處理失敗: {str(e)}'}

    def _persist_found_photos(self, itinerary_id, current_itinerary):
        photo_map = {}
        for day in current_itinerary:
            for act in (day.get('activities') or day.get('location') or []):
                name = (act.get('place_name') or act.get('location_name') or act.get('name') or '').strip()
                url = (act.get('photo_url') or '').strip()
                if name and url:
                    photo_map[name] = url
        if not photo_map:
            return

        row = self.travel_service.get_itinerary(itinerary_id)
        if not row:
            return
        detailed = row.get('detailed_itinerary')
        if isinstance(detailed, str):
            detailed = json.loads(detailed)
        if not isinstance(detailed, dict):
            return

        parsed = detailed.get('parsed') or {}
        days = parsed.get('days') or parsed.get('data') or []
        updated = False
        for day in days:
            for loc in (day.get('location') or day.get('activities') or []):
                name = (loc.get('place_name') or loc.get('location_name') or '').strip()
                if name in photo_map and not loc.get('photo_url'):
                    loc['photo_url'] = photo_map[name]
                    updated = True

        if updated:
            self.travel_service.update_itinerary_ai_data(itinerary_id, detailed_itinerary=detailed)
    
    def handle_travel_recommendation(self, location, days, transportation, preferences):
        """處理旅遊推薦請求"""
        try:
            return self.chat_service.get_travel_recommendation(
                location, days, transportation, preferences
            )
        except Exception as e:
            return {'success': False, 'error': f'推薦生成失敗: {str(e)}'}
    
    def handle_generate_itinerary(
        self, location, days, trip_pace, traveler_type, interests, start_date=None
    ):
        """處理完整行程生成"""
        try:
            return self.chat_service.generate_itinerary(
                location, days, trip_pace, traveler_type, interests, start_date
            )
        except Exception as e:
            return {'success': False, 'error': f'行程生成失敗: {str(e)}'}
    
    def handle_refine_itinerary(self, itinerary, feedback):
        """處理行程優化請求"""
        try:
            return self.chat_service.refine_itinerary(itinerary, feedback)
        except Exception as e:
            return {'success': False, 'error': f'行程優化失敗: {str(e)}'}

    def handle_itinerary_suggestion(self, current_itinerary, target_day, target_item, trip_context=None):
        """處理行程景點推薦請求"""
        try:
            return self.chat_service.suggest_itinerary_spot(
                current_itinerary,
                target_day,
                target_item,
                trip_context,
            )
        except Exception as e:
            return {'success': False, 'error': f'景點推薦失敗: {str(e)}'}

    def handle_suggest_spot_duration(self, place_name, place_type=None, address=None, rating=None):
        """處理單一景點建議停留時間請求"""
        try:
            if not str(place_name or "").strip():
                return {'success': False, 'error': '必須提供 placeName 參數'}

            return self.chat_service.suggest_spot_duration(
                place_name, place_type, address, rating
            )
        except Exception as e:
            return {'success': False, 'error': f'停留時間建議失敗: {str(e)}'}

    # def handle_travel_tips(self, location, travel_time=None):
    #     """處理旅遊提示請求"""
    #     try:
    #         return self.chat_service.get_travel_tips(location, travel_time)
    #     except Exception as e:
    #         return {'success': False, 'error': f'提示獲取失敗: {str(e)}'}
    
    def handle_clear_history(self):
        """清除對話歷史"""
        return {'success': True, 'data': '對話歷史已清除'}