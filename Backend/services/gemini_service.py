import json
import google.generativeai as genai
from config import Config
from datetime import datetime


with open("test.json", "r", encoding="utf-8") as f:
    test_data = json.load(f)


class GeminiService:
    def __init__(self):
        genai.configure(api_key=Config.GEMINI_API_KEY)
        self.model = genai.GenerativeModel("gemini-2.5-flash")

        # 配置生成參數
        self.generation_config = {
            "temperature": 0.5,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 9999,  # revised
        }

    def _clean_json_response(self, response_text):
        """清理和提取 JSON 內容"""
        raw_text = response_text.strip()

        # 移除 markdown 代碼塊標記
        if raw_text.startswith("```"):
            # 找到第一個和最後一個 ```
            parts = raw_text.split("```")
            if len(parts) >= 3:
                raw_text = parts[1]
            else:
                raw_text = parts[0] if len(parts) > 1 else raw_text

        # 移除 json 標籤
        raw_text = raw_text.strip()
        if raw_text.startswith("json"):
            raw_text = raw_text[4:].strip()

        # 移除代碼塊結尾的 ```
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3].strip()

        return raw_text

    def _parse_response_json(self, response):
        """統一處理 Gemini 回傳文字並解析為 JSON。"""
        raw_content = response.text.strip()
        cleaned_json = self._clean_json_response(raw_content)
        parsed_json = json.loads(cleaned_json)
        return raw_content, cleaned_json, parsed_json

    def _extract_token_usage(self, response):
        """提取 Gemini token 使用量；若無法取得則回傳 None。"""
        usage_metadata = getattr(response, "usage_metadata", None)
        if not usage_metadata:
            return {
                "total_tokens": None,
            }

        return {
            "total_tokens": getattr(usage_metadata, "total_token_count", None),
        }

    def _time_slots_for_count(self, count):
        """依每日行程數量生成固定時間"""
        presets = {
            1: ["09:00"],
            2: ["09:00", "14:00"],
            3: ["09:00", "12:00", "15:00"],
            4: ["09:00", "12:00", "15:00", "18:00"],
            5: ["08:00", "11:00", "14:00", "17:00", "20:00"],
        }
        if count in presets:
            return presets[count]

        base_hour = 8
        return [f"{(base_hour + i * 2):02d}:00" for i in range(count)]

    def _attach_generated_times(self, parsed_json):
        """為行程補上 time 欄位，並以目前 location 順序為準。"""
        if not isinstance(parsed_json, dict):
            return parsed_json

        days = None
        if isinstance(parsed_json.get("days"), list):
            days = parsed_json.get("days")
        elif isinstance(parsed_json.get("data"), list):
            days = parsed_json.get("data")

        if not isinstance(days, list):
            return parsed_json

        for day in days:
            if not isinstance(day, dict):
                continue

            locations = day.get("location")
            if not isinstance(locations, list):
                continue

            slots = self._time_slots_for_count(len(locations))
            for idx, loc in enumerate(locations):
                if isinstance(loc, dict):
                    loc["time"] = slots[idx] if idx < len(slots) else slots[-1]

        return parsed_json

    def get_travel_recommendation(self, location, days, transportation, preferences):
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

            response = self.model.generate_content(
                prompt, generation_config=self.generation_config
            )
            token_usage = self._extract_token_usage(response)

            raw_content, _, parsed_json = self._parse_response_json(response)

            return {
                "success": True,
                "data": {
                    "raw_output": raw_content,
                    "parsed": parsed_json,
                    "token_usage": token_usage,
                },
            }
        except Exception as e:
            return {"success": False, "error": f"行程生成失敗: {str(e)}"}

    # def chat_with_ai(self, message, conversation_history=[]):
    #     """與 AI 進行對話"""
    #     try:
    #         # 轉換為 Gemini 格式
    #         chat = self.model.start_chat(history=[])

    #         # 添加系统提示
    #         system_prompt = "你是一個旅遊規劃 AI，請主動詢問使用者旅伴類型、目的地、天數等資訊來優化行程。"

    #         # 構建完整訊息
    #         full_message = f"{system_prompt}\n\n用户消息: {message}"

    #         if conversation_history:
    #             # 重建對話歷史
    #             for msg in conversation_history:
    #                 if msg['role'] == 'user':
    #                     chat.send_message(msg['content'])

    #         response = chat.send_message(full_message)
    #         ai_content = response.text

    #         return {
    #             'success': True,
    #             'data': {
    #                 'response': ai_content,
    #                 'history': conversation_history + [
    #                     {"role": "user", "content": message},
    #                     {"role": "assistant", "content": ai_content}
    #                 ]
    #             }
    #         }
    #     except Exception as e:
    #         return {'success': False, 'error': f"對話發生錯誤: {str(e)}"}

    def generate_itinerary(
        self, location, days, budget, traveler_type, interests, start_date=None
    ):
        """生成完整詳細行程 (結構化輸出)"""
        try:
            interests_str = ", ".join(interests) if interests else "通用興趣"
            date_info = (
                f"出發日期: {start_date}"
                if start_date
                else "出發日期: 未指定 (請假設從星期一開始)"
            )

            prompt = f"""請為以下旅客創建完整的{days}天{location}行程。
            旅客類型: {traveler_type}
            預算: {budget}
            興趣: {interests_str}
            {date_info}
            
            嚴格遵守以下 JSON 結構輸出，確保前端能直接渲染：
            {{
                "data": [
                    {{
                        "day": 1,
                        "weekday": "星期幾 (例如：星期一)", 
                        "location": [
                            {{
                                "location_name": "地點名稱",
                            }}
                        ]
                    }}
                ],

            }}
            只要輸出上面有給的內容就好。不要包含任何 markdown 標記。
            一天最多三個景點就好。
            days[].location.location_name裡面只可以有景點名稱，不要包含任何描述或其他資訊。
            time 欄位由系統補上，請不要輸出 time。

            """
            # 嚴格遵守以下 JSON 結構輸出，確保前端能直接渲染：
            # {{
            #     "days": [
            #         {{
            #             "day": 1,
            #             "weekday": "星期幾 (例如：星期一)",
            #             "activities": [
            #                 {{
            #                     "time": "09:00",
            #                     "place_name": "地點名稱",
            #                     "description": "活動簡述",
            #                     "type": "景點/美食/交通/住宿",
            #                     "cost": "預估費用 (例如：JPY 3,000 或 JPY 1,000 - 2,500 或 免費)"
            #                 }}
            #             ]
            #         }}
            #     ],
            #     "dining_recommendations": [
            #         {{ "name": "餐廳名", "feature": "特色", "price_range": "價位" }}
            #     ],
            #     "transport_tips": "交通建議"
            # }}

            # 只回傳純 JSON，不要包含任何 markdown 標記。
            # 飯店請也幫我找一間符合預算的，放在每天的行程裡面，且標註 type 為住宿。
            # place_name請不要寫超過一個以上的地點。
            # 一天最多安排三個活動，不限dining_recommendations的數量。
            # decription請簡短描述活動內容，控制在一句話以內。
            # days[].activities[].cost 必須遵守以下格式：
            # 1) 單一價格：幣別 + 空白 + 千分位數字 (例：JPY 3,000)
            # 2) 價格區間：幣別 + 空白 + 最小值 + 空白-空白 + 最大值 (例：JPY 1,000 - 2,500)
            # 3) 免費活動：免費
            # 4) 住宿可加單位：JPY 12,000 / 晚
            # 5) 不確定可用估算：約 JPY 2,000
            # 禁止輸出沒有幣別或沒有千分位的格式。
            # dining_recommendations[].feature 簡短描述餐廳特色，控制在一句話以內。
            # 僅可輸出上述欄位，不可新增任何欄位。
            # 交通建議請在兩三句話內結束，不要有容辭贅字。
            # 請想辦法讓生成資料的時間減少。
            # """
            response = self.model.generate_content(
                prompt, generation_config=self.generation_config
            )
            token_usage = self._extract_token_usage(response)

            raw_content, _, parsed_json = self._parse_response_json(response)
            parsed_json = self._attach_generated_times(parsed_json)

            return {
                "success": True,
                "data": {
                    # 'raw_output': raw_content,
                    "parsed": parsed_json,
                    "token_usage": token_usage,
                },
            }
        except Exception as e:
            return {"success": False, "error": f"行程生成失敗: {str(e)}"}

    def generate_itinerary_detail(
        self,
        location,
        days,
        budget,
        traveler_type,
        interests,
        start_date=None,
        existing_itinerary=None,
    ):
        """生成完整詳細行程 (包含description、type、cost等詳細信息)

        參數：
            existing_itinerary: 可選的現有行程 JSON 數據。如果提供，AI 會根據其進行修改優化。
        """
        try:
            interests_str = ", ".join(interests) if interests else "通用興趣"
            date_info = (
                f"出發日期: {start_date}"
                if start_date
                else "出發日期: 未指定 (請假設從星期一開始)"
            )

            # 將 existing_itinerary 正規化為 Gemini 可讀的結構
            normalized_existing = None
            if existing_itinerary:
                try:
                    raw_days = []
                    if isinstance(existing_itinerary, dict) and isinstance(
                        existing_itinerary.get("data"), list
                    ):
                        raw_days = existing_itinerary.get("data", [])
                    elif isinstance(existing_itinerary, dict) and isinstance(
                        existing_itinerary.get("days"), list
                    ):
                        raw_days = existing_itinerary.get("days", [])
                    elif isinstance(existing_itinerary, list):
                        raw_days = existing_itinerary

                    normalized_days = []
                    weekday_labels = [
                        "星期一",
                        "星期二",
                        "星期三",
                        "星期四",
                        "星期五",
                        "星期六",
                        "星期日",
                    ]

                    for idx, day_item in enumerate(raw_days):
                        day_no = (
                            day_item.get("day")
                            if isinstance(day_item, dict)
                            else (idx + 1)
                        )
                        try:
                            day_no_int = int(day_no)
                        except Exception:
                            day_no_int = idx + 1

                        locations = []
                        if isinstance(day_item, dict):
                            if isinstance(day_item.get("locations"), list):
                                locations = day_item.get("locations", [])
                            elif isinstance(day_item.get("location"), list):
                                locations = day_item.get("location", [])
                        normalized_locations = []
                        for loc in locations:
                            loc_name = (
                                loc.get("location_name")
                                if isinstance(loc, dict)
                                else None
                            )
                            if not loc_name:
                                continue
                            normalized_locations.append(
                                {
                                    "place_name": loc_name,
                                    "description": "",
                                    "type": "景點",
                                    "cost": "免費",
                                }
                            )

                        normalized_days.append(
                            {
                                "day": day_no_int,
                                "weekday": weekday_labels[(day_no_int - 1) % 7],
                                "location": normalized_locations,
                            }
                        )

                    normalized_existing = {"days": normalized_days}
                except Exception:
                    normalized_existing = None

            existing_itinerary_str = json.dumps(
                normalized_existing if normalized_existing else test_data,
                ensure_ascii=False,
                indent=2,
            )
            prompt = f"""請根據以下現有行程進行修改和優化。
            原始行程：
            {existing_itinerary_str}

            修改要求：
            旅客類型: {traveler_type}
            預算: {budget}
            興趣: {interests_str}
            {date_info}

            請保留現有行程的日期和基本結構，根據上述要求對行程的各個景點進行調整、添加或刪除。
            確保修改後的行程仍然保持以下 JSON 結構：
            {{
                "days": [
                    {{
                        "day": 1,
                        "weekday": "星期幾 (例如：星期一)", 
                        "location": [
                            {{
                                "place_name": "地點名稱",
                                "description": "活動簡述",
                                "type": "景點/美食/交通/住宿",
                                "cost": "預估費用 (例如：JPY 3,000 或 JPY 1,000 - 2,500 或 免費)"
                            }}
                        ]
                    }}
                ]
            }}

            規則要求：
            1. place_name 只可包含地點名稱，不要包含任何描述。
            2. description 簡短描述活動內容，控制在一句話以內。
            3. type 必須是以下之一：景點、美食、交通、住宿。
            4. cost 必須遵守以下格式：
            - 單一價格：幣別 + 空白 + 千分位數字 (例：JPY 3,000)
            - 價格區間：幣別 + 空白 + 最小值 + 空白-空白 + 最大值 (例：JPY 1,000 - 2,500)
            - 免費活動：免費
            - 住宿可加單位：JPY 12,000 / 晚
            - 不確定的估算：約 JPY 2,000
            - 禁止輸出沒有幣別或沒有千分位的格式。
            5. 一天最多安排 3-5 個活動（包含住宿）。
            6. 每天應包含至少一個住宿選項（type 為住宿）。
            7. 只回傳純 JSON，不要包含任何 markdown 標記。
            8. 確保修改後的行程符合用戶預算和興趣。
            9. 優先沿用原始行程中的 place_name（請不要改名或換成不同地點）。
            10. 每天 location 項目數量需與原始行程對應天數的地點數量一致。
            11. time 欄位由系統補上，請不要輸出 time。
            """

            response = self.model.generate_content(
                prompt, generation_config=self.generation_config
            )
            token_usage = self._extract_token_usage(response)

            raw_content, _, parsed_json = self._parse_response_json(response)
            parsed_json = self._attach_generated_times(parsed_json)
            print(parsed_json)
            return {
                "success": True,
                "data": {
                    "parsed": parsed_json,
                    "token_usage": token_usage,
                },
            }
        except Exception as e:
            return {"success": False, "error": f"行程生成/修改失敗: {str(e)}"}

    def refine_itinerary(self, itinerary, feedback):
        """根據用戶反饋優化行程"""
        try:
            prompt = f"""根據以下反饋優化旅遊行程。
            原始行程: {json.dumps(itinerary, ensure_ascii=False)}
            用戶反饋: {feedback}
            
            請保持與原始行程完全相同的 JSON 結構 (包括 weekday 欄位) 進行修改並回傳。
            只回傳純 JSON，不要包含任何 markdown 標記。
            """

            response = self.model.generate_content(
                prompt, generation_config=self.generation_config
            )
            token_usage = self._extract_token_usage(response)

            _, cleaned_json, parsed_json = self._parse_response_json(response)

            return {
                "success": True,
                "data": {
                    "raw_output": cleaned_json,
                    "parsed": parsed_json,
                    "token_usage": token_usage,
                },
            }
        except Exception as e:
            return {"success": False, "error": f"行程優化失敗: {str(e)}"}

    def get_travel_tips(self, location, travel_time=None):
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
            
            只回傳純 JSON，不要包含任何 markdown 標記。
            """

            response = self.model.generate_content(
                prompt, generation_config=self.generation_config
            )
            token_usage = self._extract_token_usage(response)

            _, cleaned_json, parsed_json = self._parse_response_json(response)

            return {
                "success": True,
                "data": {
                    "raw_output": cleaned_json,
                    "parsed": parsed_json,
                    "token_usage": token_usage,
                },
            }
        except Exception as e:
            return {"success": False, "error": f"提示獲取失敗: {str(e)}"}
