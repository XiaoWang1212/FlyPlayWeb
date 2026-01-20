import json
from openai import AsyncOpenAI
from config import Config

class ChatGPTService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=Config.OPENAI_API_KEY)
        self.model = "gpt-4o-mini"
    
    async def get_travel_recommendation(self, location, days, transportation, preferences):
        """基於參數生成旅遊推薦 (簡要版)"""
        try:
            prompt = f"""你是一個專業的旅遊顧問。請為使用者規劃前往{location}的{days}天行程。
            偏好活動: {preferences}
            主要交通方式: {transportation}

            請嚴格遵守以下 JSON 格式回傳，不要包含 Markdown 標記：
            {{
                "recommendation_summary": "一句話推薦語",
                "highlights": ["亮點1", "亮點2"],
                "daily_outline": [
                    {{ "day": 1, "weekday": "星期幾", "focus": "第一天重點", "places": ["地點A", "地點B"] }}
                ]
            }}
            """

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "你是一個專業的旅遊顧問，僅以JSON格式回傳資料。"},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                max_tokens=1500
            )
            raw_content = response.choices[0].message.content
            parsed_json = json.loads(raw_content)

            return {
                'success': True,
                'data': {
                    'raw_output': raw_content,
                    'parsed': parsed_json
                }
            }
        except Exception as e:
            return {'success': False, 'error': f"行程生成失敗: {str(e)}"}
    
    async def chat_with_ai(self, message, conversation_history=[]):
        """與 AI 進行對話"""
        try:
            messages = [
                {"role": "system", "content": "你是一個旅遊規劃 AI，請主動詢問使用者旅伴類型、目的地、天數等資訊來優化行程。"}
            ] + conversation_history + [{"role": "user", "content": message}]
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=500
            )
            
            ai_content = response.choices[0].message.content
            return {
                'success': True,
                'data': {
                    'response': ai_content,
                    'history': messages + [{"role": "assistant", "content": ai_content}]
                }
            }
        except Exception as e:
            return {'success': False, 'error': f"對話發生錯誤: {str(e)}"}
    
    async def generate_itinerary(self, location, days, budget, traveler_type, interests, start_date=None):
        """生成完整詳細行程 (結構化輸出)"""
        try:
            interests_str = ', '.join(interests) if interests else '通用興趣'
            date_info = f"出發日期: {start_date}" if start_date else "出發日期: 未指定 (請假設從星期一開始)"
            
            prompt = f"""請為以下旅客創建完整的{days}天{location}行程。
            旅客類型: {traveler_type}
            預算: {budget}
            興趣: {interests_str}
            {date_info}
            
            請嚴格遵守以下 JSON 結構輸出，確保前端能直接渲染：
            {{
                "trip_title": "行程標題 (例如：京都古韻三日遊)",
                "overview": "行程總覽描述",
                "total_budget_estimate": "預估總花費區間",
                "days": [
                    {{
                        "day": 1,
                        "weekday": "星期幾 (例如：星期一)", 
                        "date_title": "第一天主題",
                        "activities": [
                            {{
                                "time": "09:00",
                                "place_name": "地點名稱",
                                "description": "活動簡述",
                                "type": "景點/美食/交通/住宿",
                                "cost": "預估費用",
                                "location": {{ "lat": 0.0, "lng": 0.0 }}
                            }}
                        ]
                    }}
                ],
                "dining_recommendations": [
                    {{ "name": "餐廳名", "feature": "特色", "price_range": "價位" }}
                ],
                "transport_tips": "交通建議"
            }}
            """
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "你是專業旅遊規劃師，只回傳符合 Schema 的 JSON 資料。"},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                max_tokens=2500
            )
            raw_content = response.choices[0].message.content
            parsed_json = json.loads(raw_content)

            return {
                'success': True,
                'data': {
                    'raw_output': raw_content,
                    'parsed': parsed_json
                }
            }
        except Exception as e:
            return {'success': False, 'error': f"行程生成失敗: {str(e)}"}
    
    async def refine_itinerary(self, itinerary, feedback):
        """根據用戶反饋優化行程"""
        try:
            prompt = f"""根據以下反饋優化旅遊行程。
            原始行程: {json.dumps(itinerary, ensure_ascii=False)}
            用戶反饋: {feedback}
            
            請保持與原始行程完全相同的 JSON 結構 (包括 weekday 欄位) 進行修改並回傳。
            """
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "你是專業旅遊規劃師，根據反饋優化行程，保持 JSON 結構一致。"},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                max_tokens=2500
            )
            raw_content = response.choices[0].message.content
            parsed_json = json.loads(raw_content)

            return {
                'success': True,
                'data': {
                    'raw_output': raw_content,
                    'parsed': parsed_json
                }
            }
        except Exception as e:
            return {'success': False, 'error': f"行程優化失敗: {str(e)}"}
    
    async def get_travel_tips(self, location, travel_time=None):
        """獲取目的地旅遊提示"""
        try:
            time_info = f"旅遊時間: {travel_time}" if travel_time else ""
            
            prompt = f"""請提供前往{location}的旅遊提示。{time_info}
            
            請嚴格遵守以下 JSON 格式回傳：
            {{
                "best_time_to_visit": "最佳旅遊季節說明",
                "entry_requirements": "簽證與入境須知",
                "currency_info": "貨幣與支付建議",
                "cultural_etiquette": ["習俗1", "習俗2"],
                "transportation_guide": "當地交通建議",
                "must_visit_spots": ["景點1", "景點2"]
            }}
            """
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "你是旅遊專家，只回傳 JSON 格式的提示。"},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                max_tokens=1500
            )
            raw_content = response.choices[0].message.content
            parsed_json = json.loads(raw_content)

            return {
                'success': True,
                'data': {
                    'raw_output': raw_content,
                    'parsed': parsed_json
                }
            }
        except Exception as e:
            return {'success': False, 'error': f"提示獲取失敗: {str(e)}"}