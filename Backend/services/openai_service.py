import json
from openai import AsyncOpenAI
from config import Config

class ChatGPTService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key = Config.OPENAI_API_KEY)
        self.model = "gpt-4o-mini"
    
    async def get_travel_recommendation(self, location, days, transportation, preferences):
        """基於參數生成旅遊推薦"""
        try:
            prompt = f"""你是一個專業的旅遊顧問。請為使用者規劃前往{location}的{days}天行程。
            偏好活動:{preferences}
            主要交通方式:{transportation}

            請確保:
            1. 形成順序符合地理位置邏輯，減少交通往返的時間。
            2. 輸出格式必須為純 JSON，方便程式解析串接 Google Maps。
            """

            response = await self.client.chat.completions.create(
                model = self.model,
                messages = [
                    {"role": "system", "content": "你是一個專業的旅遊顧問，僅以JSON格式回傳行程資料。"},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                max_tokens = 1500
            )
            # 解析內容
            recommendation_data = json.loads(response.choices[0].message.content)

            return {
                'success': True,
                'data': recommendation_data
            }
        except Exception as e:
            return {
                'success': False,
                'error': f"行程生成失敗: {str(e)}"
            }
    
    async def chat_with_ai(self, message, conversation_history=[]):
        """與 AI 進行對話"""
        try:
            messages = [
                {"role": "system", "content": "你是一個旅遊規劃 AI，請主動詢問使用者旅伴類型、目的地、天數等資訊來優化行程。"}
            ] + conversation_history + [{"role": "user", "content": message}]
            
            response = await self.client.chat.completions.create(
                model = self.model,
                messages = messages,
                max_tokens = 500
            )
            
            return {
                'success': True,
                'response': response.choices[0].message.content,
                'history': messages + [{"role": "assistant", "content": response.choices[0].message.content}]
            }
        except Exception as e:
            return {
                'success': False,
                'error': f"對話發生錯誤: {str(e)}"
            }
    
    async def generate_itinerary(self, location, days, budget, traveler_type, interests):
        """生成完整行程"""
        try:
            interests_str = ', '.join(interests) if interests else '通用興趣'
            
            prompt = f"""你是一個專業的旅遊規劃專家。請為以下旅客創建完整的{days}天{location}行程：
            
            旅客類型: {traveler_type}
            預算: {budget}
            興趣: {interests_str}
            
            請提供:
            1. 每日詳細行程 (包括地點、時間、活動)
            2. 餐廳推薦
            3. 交通方式建議
            4. 預估花費
            
            輸出格式必須為純 JSON。
            """
            
            response = await self.client.chat.completions.create(
                model = self.model,
                messages = [
                    {"role": "system", "content": "你是專業旅遊規劃師，只回傳 JSON 格式的行程資料。"},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                max_tokens = 2000
            )
            
            itinerary_data = json.loads(response.choices[0].message.content)
            
            return {
                'success': True,
                'data': itinerary_data
            }
        except Exception as e:
            return {
                'success': False,
                'error': f"行程生成失敗: {str(e)}"
            }
    
    async def refine_itinerary(self, itinerary, feedback):
        """根據用戶反饋優化行程"""
        try:
            prompt = f"""根據以下反饋優化旅遊行程：
            
            原始行程: {json.dumps(itinerary, ensure_ascii=False)}
            
            用戶反饋: {feedback}
            
            請修改行程以符合用戶的反饋，並以 JSON 格式返回優化後的行程。
            """
            
            response = await self.client.chat.completions.create(
                model = self.model,
                messages = [
                    {"role": "system", "content": "你是專業旅遊規劃師，根據反饋優化行程並只回傳 JSON 格式的資料。"},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                max_tokens = 2000
            )
            
            refined_itinerary = json.loads(response.choices[0].message.content)
            
            return {
                'success': True,
                'data': refined_itinerary
            }
        except Exception as e:
            return {
                'success': False,
                'error': f"行程優化失敗: {str(e)}"
            }
    
    async def get_travel_tips(self, location, travel_time=None):
        """獲取目的地旅遊提示"""
        try:
            time_info = f"旅遊時間: {travel_time}" if travel_time else ""
            
            prompt = f"""請提供前往{location}的旅遊提示與建議。
            {time_info}
            
            請包括:
            1. 最佳旅遊時間
            2. 簽證與入境要求
            3. 貨幣與預算提示
            4. 當地習俗與禮儀
            5. 交通與住宿建議
            6. 必去景點與活動
            
            輸出格式必須為純 JSON。
            """
            
            response = await self.client.chat.completions.create(
                model = self.model,
                messages = [
                    {"role": "system", "content": "你是旅遊專家，提供詳細的旅遊提示，只回傳 JSON 格式。"},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                max_tokens = 1500
            )
            
            tips_data = json.loads(response.choices[0].message.content)
            
            return {
                'success': True,
                'data': tips_data
            }
        except Exception as e:
            return {
                'success': False,
                'error': f"提示獲取失敗: {str(e)}"
            }