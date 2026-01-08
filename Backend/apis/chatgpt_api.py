import json
from openai import AsyncOpenAI
from config import Config

class ChatGPTService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key = Config.OPENAI_API_KEY)
        self.model = "gpt-4o-mini"
    
    async def get_travel_recommendation(self, location, days, transportation, preferences):
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
                response_format={"type": "json_object"}
                max_tokens = 1500
            )
            #解析內容
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