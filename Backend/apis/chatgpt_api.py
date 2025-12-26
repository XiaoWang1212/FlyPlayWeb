import openai
from config import Config

class ChatGPTService:
    def __init__(self):
        openai.api_key = Config.OPENAI_API_KEY
    
    async def get_travel_recommendation(self, location, preferences):
        try:
            response = await openai.ChatCompletion.acreate(
                model="gpt--mini",
                messages=[
                    {"role": "system", "content": "你是一個專業的旅遊顧問"},
                    {"role": "user", "content": f"請推薦{location}的旅遊景點，偏好：{preferences}"}
                ],
                max_tokens=500
            )
            return {
                'success': True,
                'recommendation': response.choices[0].message.content
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    async def chat_with_ai(self, message, conversation_history=[]):
        try:
            messages = conversation_history + [{"role": "user", "content": message}]
            
            response = await openai.ChatCompletion.acreate(
                model="gpt-3.5-turbo",
                messages=messages,
                max_tokens=300
            )
            
            return {
                'success': True,
                'response': response.choices[0].message.content
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }