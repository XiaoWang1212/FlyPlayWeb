import json
import re
import google.generativeai as genai
from config import Config
from datetime import datetime
from services.googlemap_service import GoogleMapService
from services.data_fix_service import DataFixService


with open("test.json", "r", encoding="utf-8") as f:
    test_data = json.load(f)


class GeminiService:
    def __init__(self):
        genai.configure(api_key=Config.GEMINI_API_KEY)
        self.system_prompt = (
            "你是一個旅遊規劃 AI。若系統已提供旅遊上下文，請直接使用，不要詢問任何追加問題。"
            "不論資訊是否完整，都必須直接給出具體建議，不得反問使用者。"
            "所有回覆請使用繁體中文純文字，不要輸出 Markdown、不要使用 **、#、-、編號清單或 code block。"
            "如果使用者的問題與旅遊、行程、景點、美食、住宿、交通無關，請直接婉拒回答並引導回旅遊主題，不要嘗試回答數學、科學、程式或其他非旅遊問題。"
        )
        self.model = genai.GenerativeModel(
            "gemini-2.5-flash",
            system_instruction=self.system_prompt,
        )
        self.map_service = GoogleMapService()
        self.data_fix_service = DataFixService()

        # 配置生成參數
        self.generation_config = {
            "temperature": 0.5,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 9999,  # revised
        }

    def _extract_itinerary_spot_names(self, current_itinerary, ai_text=""):
        """從目前行程中整理可查圖的景點名稱，優先取出現在回覆有提到的景點。"""
        if not isinstance(current_itinerary, list) or not current_itinerary:
            return []

        names = []
        for day in current_itinerary:
            if not isinstance(day, dict):
                continue
            activities = day.get("activities") or day.get("location") or []
            if not isinstance(activities, list):
                continue
            for activity in activities:
                if not isinstance(activity, dict):
                    continue
                name = (
                    activity.get("place_name")
                    or activity.get("location_name")
                    or activity.get("name")
                    or ""
                )
                name = str(name).strip()
                if name and name not in names:
                    names.append(name)

        if not names:
            return []

        message = str(ai_text or "")
        mentioned = [name for name in names if name in message]
        ordered = mentioned + [name for name in names if name not in mentioned]
        return ordered[:8]

    def _normalize_itinerary_days(self, source_data):
        """把常見行程格式轉成統一的 days[].activities 結構。"""
        if isinstance(source_data, dict):
            if isinstance(source_data.get("days"), list):
                raw_days = source_data.get("days")
            elif isinstance(source_data.get("data"), list):
                raw_days = source_data.get("data")
            else:
                raw_days = []
        elif isinstance(source_data, list):
            raw_days = source_data
        else:
            raw_days = []

        normalized = []
        for idx, day in enumerate(raw_days):
            if not isinstance(day, dict):
                continue

            activities = day.get("activities") or day.get("location") or day.get("locations") or []
            if not isinstance(activities, list):
                activities = []

            normalized.append(
                {
                    "day": day.get("day") or idx + 1,
                    "weekday": day.get("weekday") or "",
                    "activities": activities,
                }
            )

        return normalized

    def _attach_photo_urls_to_itinerary(self, parsed_json):
        """把行程中的每個景點補上 photo_url，保留原本結構。"""
        if not isinstance(parsed_json, dict):
            return parsed_json

        itinerary_days = None
        day_key = None

        if isinstance(parsed_json.get("days"), list):
            itinerary_days = parsed_json.get("days")
            day_key = "days"
        elif isinstance(parsed_json.get("data"), list):
            itinerary_days = parsed_json.get("data")
            day_key = "data"

        if not isinstance(itinerary_days, list):
            return parsed_json

        normalized_days = []
        for index, day in enumerate(itinerary_days):
            if not isinstance(day, dict):
                continue

            activities = day.get("activities") or day.get("location") or day.get("locations") or []
            if not isinstance(activities, list):
                activities = []

            normalized_locations = []
            for activity in activities:
                if not isinstance(activity, dict):
                    continue
                place_name = (
                    activity.get("place_name")
                    or activity.get("location_name")
                    or activity.get("name")
                    or ""
                )
                normalized_locations.append(
                    {
                        "time": activity.get("time", ""),
                        "place_name": place_name,
                        "description": activity.get("description", ""),
                        "type": activity.get("type", ""),
                        "cost": activity.get("cost", ""),
                        "location": activity.get("location"),
                        "photo_url": activity.get("photo_url", ""),
                    }
                )

            normalized_days.append(
                {
                    "day": day.get("day") or index + 1,
                    "location": normalized_locations,
                }
            )

        enriched_days = self.data_fix_service.enrich_data_with_picture(normalized_days)

        for index, day in enumerate(itinerary_days):
            if not isinstance(day, dict) or index >= len(enriched_days):
                continue

            enriched_locations = enriched_days[index].get("location", [])
            if not isinstance(enriched_locations, list):
                continue

            if isinstance(day.get("activities"), list):
                target_key = "activities"
            else:
                target_key = "location" if isinstance(day.get("location"), list) else "locations"

            day[target_key] = enriched_locations

        parsed_json[day_key] = itinerary_days
        return parsed_json

    def _build_spot_image_cards(self, current_itinerary, ai_text="", latlng_itinerary=None):
        """把已綁定的 photo_url 轉成聊天室可用的圖片卡片，並保留行程順序。"""
        cards = []

        if not isinstance(current_itinerary, list):
            return cards

        latlng_map = {}
        if isinstance(latlng_itinerary, list):
            for day in latlng_itinerary:
                if not isinstance(day, dict):
                    continue
                for loc in (day.get("locations") or []):
                    if not isinstance(loc, dict):
                        continue
                    name = (loc.get("location_name") or loc.get("place_name") or "").strip()
                    location = loc.get("location") or {}
                    lat = location.get("latitude") or location.get("lat")
                    lng = location.get("longitude") or location.get("lng")
                    if name and lat not in (None, 0) and lng not in (None, 0):
                        latlng_map[name] = {"lat": lat, "lng": lng}

        for day in current_itinerary:
            if not isinstance(day, dict):
                continue

            activities = day.get("activities") or day.get("location") or day.get("locations") or []
            if not isinstance(activities, list):
                continue

            for activity in activities:
                if not isinstance(activity, dict):
                    continue

                spot_name = (
                    activity.get("place_name")
                    or activity.get("location_name")
                    or activity.get("name")
                    or ""
                ).strip()
                photo_url = (activity.get("photo_url") or "").strip()
                address = activity.get("address") or ""
                place_id = activity.get("place_id") or ""

                if photo_url:
                    act_location = latlng_map.get(spot_name)
                    if act_location:
                        activity["location"] = act_location
                    card = {
                        "name": spot_name,
                        "photo_url": photo_url,
                        "address": address,
                        "place_id": place_id,
                    }
                    if act_location:
                        card["location"] = act_location
                    cards.append(card)
                    continue

                if not spot_name:
                    continue

                try:
                    existing_location = latlng_map.get(spot_name)
                    has_valid_location = existing_location is not None
                    if has_valid_location:
                        search_result = self.map_service.search_places_nearby(
                            text_query=spot_name,
                            location={
                                "latitude": existing_location["lat"],
                                "longitude": existing_location["lng"],
                            },
                            radius=500,
                            language_code="zh-TW",
                            max_results=1,
                        )
                    else:
                        search_result = self.map_service.search_places(
                            text_query=spot_name,
                            language_code="zh-TW",
                            max_results=1,
                        )
                    if not search_result.get("success"):
                        continue

                    places = search_result.get("places") or []
                    if not places:
                        continue

                    place = places[0] if isinstance(places[0], dict) else {}
                    photos = place.get("photos") or []
                    first_photo = photos[0] if photos and isinstance(photos[0], dict) else {}
                    fallback_photo_url = first_photo.get("photo_url")

                    if not fallback_photo_url:
                        continue

                    activity["photo_url"] = fallback_photo_url
                    if place.get("address"):
                        activity["address"] = place["address"]
                    if place.get("place_id"):
                        activity["place_id"] = place["place_id"]

                    # Save found coordinates back to activity if we didn't already have them
                    found_location = place.get("location") or {}
                    if not has_valid_location and found_location.get("latitude") is not None and found_location.get("longitude") is not None:
                        existing_location = {"lat": found_location["latitude"], "lng": found_location["longitude"]}
                        activity["location"] = existing_location
                        has_valid_location = True

                    card = {
                        "name": place.get("name") or spot_name,
                        "photo_url": fallback_photo_url,
                        "address": place.get("address") or address,
                        "place_id": place.get("place_id") or place_id,
                    }
                    if has_valid_location and isinstance(existing_location, dict):
                        card["location"] = existing_location
                    cards.append(card)
                except Exception:
                    continue

        return cards

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

        # 移除 trailing commas（,後面只跟著空白/換行再接 } 或 ]）
        raw_text = re.sub(r",\s*([}\]])", r"\1", raw_text)

        return raw_text

    def _parse_response_json(self, response):
        """統一處理 Gemini 回傳文字並解析為 JSON。"""
        raw_content = response.text.strip()
        cleaned_json = self._clean_json_response(raw_content)
        parsed_json = json.loads(cleaned_json)
        return raw_content, cleaned_json, parsed_json

    def _strip_markdown_text(self, text):
        """把常見 Markdown 標記移除，保留可直接閱讀的純文字。"""
        plain_lines = []
        for raw_line in str(text or "").splitlines():
            line = raw_line.rstrip()
            if not line.strip():
                plain_lines.append("")
                continue

            line = re.sub(r"^\s{0,3}#{1,6}\s*", "", line)
            line = re.sub(r"^\s*[-*+]\s+", "", line)
            line = re.sub(r"^\s*\d+[.)]\s+", "", line)
            line = line.replace("**", "").replace("__", "").replace("`", "")
            plain_lines.append(line)

        normalized = []
        previous_blank = False
        for line in plain_lines:
            is_blank = not line.strip()
            if is_blank and previous_blank:
                continue
            normalized.append(line)
            previous_blank = is_blank

        return "\n".join(normalized).strip()

    def _build_gemini_history(self, conversation_history):
        """將前端的對話歷史轉成 Gemini chat history 格式。"""
        gemini_history = []

        for msg in conversation_history or []:
            if not isinstance(msg, dict):
                continue

            role = str(msg.get("role", "")).lower()
            content = msg.get("content") or msg.get("text") or ""
            content = str(content).strip()

            if not content:
                continue

            if role in {"assistant", "bot", "model"}:
                gemini_role = "model"
            elif role == "user":
                gemini_role = "user"
            else:
                continue

            gemini_history.append({"role": gemini_role, "parts": [content]})

        return gemini_history

    def _build_trip_context_text(self, trip_context):
        """把前端傳來的旅遊設定整理成可讀上下文。"""
        if not isinstance(trip_context, dict):
            return ""

        destination = trip_context.get("destination") or trip_context.get("destinations")
        if isinstance(destination, list):
            destination = "、".join(
                str(item.get("city") or item.get("name") or item.get("label") or "")
                for item in destination
                if isinstance(item, dict)
            )

        days = trip_context.get("days")
        if isinstance(days, str) and days and not days.isdigit():
            days_text = days
        elif days:
            days_text = f"{days}天"
        else:
            days_text = ""

        context_lines = []
        if destination:
            context_lines.append(f"目的地：{destination}")
        if days_text:
            context_lines.append(f"天數：{days_text}")
        if trip_context.get("departure"):
            context_lines.append(f"出發地：{trip_context.get('departure')}")
        if trip_context.get("companion"):
            context_lines.append(f"旅伴類型：{trip_context.get('companion')}")
        trip_pace = (
            trip_context.get("pace")
            or trip_context.get("tripPace")
            or trip_context.get("morningDeparture")
            or trip_context.get("morning_departure")
        )
        if trip_pace:
            pace_text = str(trip_pace).strip()
            pace_label = "緊湊" if pace_text in {"packed", "緊湊"} else "輕鬆"
            context_lines.append(f"行程緊湊度：{pace_label}")
        if trip_context.get("travelType"):
            context_lines.append(f"旅遊偏好：{trip_context.get('travelType')}")
        if trip_context.get("startDate"):
            context_lines.append(f"出發日期：{trip_context.get('startDate')}")

        if not context_lines:
            return ""

        return "\n".join(context_lines)

    def _is_itinerary_edit_request(self, message):
        text = str(message or "").strip()
        if not text:
            return False

        edit_keywords = ["修改", "更改", "調整", "改成", "替換", "刪除", "新增", "第", "天"]
        if not any(keyword in text for keyword in edit_keywords):
            return False

        return bool(re.search(r"第\s*[0-9一二三四五六七八九十百]+\s*天", text)) or any(
            keyword in text for keyword in ["修改", "更改", "調整", "改成", "替換"]
        )

    def _build_itinerary_context_text(self, current_itinerary, current_day_index=-1):
        if not isinstance(current_itinerary, list) or not current_itinerary:
            return ""

        lines = []
        for index, day in enumerate(current_itinerary):
            if not isinstance(day, dict):
                continue

            day_no = day.get("day") or index + 1
            weekday = day.get("weekday") or ""
            activities = day.get("activities") or day.get("location") or []
            if not isinstance(activities, list):
                activities = []

            summary_items = []
            for activity in activities:
                if not isinstance(activity, dict):
                    continue
                time = activity.get("time") or ""
                name = activity.get("place_name") or activity.get("location_name") or activity.get("name") or ""
                if name:
                    summary_items.append(f"{time} {name}".strip())

            current_marker = " (目前所在天)" if current_day_index == index else ""
            lines.append(
                f"第{day_no}天{f' {weekday}' if weekday else ''}{current_marker}: "
                + "；".join(summary_items)
            )

        return "\n".join(lines)

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

            raw_content, _, parsed_json = self._parse_response_json(response)

            return {
                "success": True,
                "data": {
                    "raw_output": raw_content,
                    "parsed": parsed_json,
                },
            }
        except Exception as e:
            return {"success": False, "error": f"行程生成失敗: {str(e)}"}

    def format_itinerary_for_display(self, raw_output=None, parsed=None, latlng_itinerary=None):
        """把 AI 行程 JSON 轉成適合直接顯示給使用者的可讀文字。"""
        try:
            source_data = parsed

            if isinstance(source_data, str):
                try:
                    source_data = json.loads(source_data)
                except Exception:
                    source_data = None

            if not source_data and raw_output:
                try:
                    source_data = json.loads(raw_output)
                except Exception:
                    source_data = raw_output

            if isinstance(source_data, (dict, list)):
                itinerary_text = json.dumps(source_data, ensure_ascii=False, indent=2)
            else:
                itinerary_text = str(source_data or raw_output or "")

            normalized_days = self._normalize_itinerary_days(source_data)

            prompt = f"""請把以下旅遊行程整理成繁體中文，直接輸出，不要有任何 JSON、code block 或多餘說明。

每天格式：
第 N 天（星期X）

每個景點固定輸出三行，格式如下：
• 景點名稱
時間 · 費用（例：09:00 · ¥3,000，若免費寫「免費」，若無費用資訊則只寫時間）
一句話描述景點特色

規則：
- 天與天之間空一行，景點與景點之間空一行
- 不要輸出任何其他文字、標題或說明
- 不要使用「上午、下午、晚上」等分段詞
- 每個景點一定要輸出完整三行

行程內容：
{itinerary_text}
"""

            response = self.model.generate_content(
                prompt, generation_config=self.generation_config
            )
            readable_text = self._strip_markdown_text(response.text)
            spot_images = self._build_spot_image_cards(normalized_days, readable_text, latlng_itinerary=latlng_itinerary)

            return {
                "success": True,
                "data": {
                    "response": readable_text,
                    "spot_images": spot_images,
                },
            }
        except Exception as e:
            return {"success": False, "error": f"行程文字整理失敗: {str(e)}"}

    def chat_with_ai(
        self,
        message,
        conversation_history=None,
        trip_context=None,
        current_itinerary=None,
        current_day_index=-1,
        latlng_itinerary=None,
    ):
        """與 AI 進行對話"""
        try:
            chat_history = self._build_gemini_history(conversation_history)
            chat = self.model.start_chat(history=chat_history)

            trip_context_text = self._build_trip_context_text(trip_context)
            itinerary_context_text = self._build_itinerary_context_text(
                current_itinerary, current_day_index
            )
            final_message = str(message).strip()
            if self._is_itinerary_edit_request(final_message) and itinerary_context_text:
                final_message = (
                    "你是一個旅遊行程編輯器。使用者要透過聊天修改某一天的行程。\n"
                    "請只修改使用者指定的那一天，不要改其他天。\n"
                    "若使用者沒有明說天數，請根據上下文推斷；若無法判斷，請回傳 need_clarification。\n"
                    "請只回傳純 JSON，不要輸出 Markdown。\n\n"
                    "現有旅遊上下文：\n"
                    f"{trip_context_text or '無'}\n\n"
                    "現有行程：\n"
                    f"{itinerary_context_text}\n\n"
                    "使用者修改需求：\n"
                    f"{final_message}\n\n"
                    "請輸出以下 JSON 形式：\n"
                    "{\n"
                    '  "action": "update_day",\n'
                    '  "target_day": 2,\n'
                    '  "summary": "已將第 2 天下午改為...",\n'
                    '  "updated_day": {\n'
                    '    "day": 2,\n'
                    '    "weekday": "星期五",\n'
                    '    "activities": [\n'
                    '      {"time": "建議停留 2 小時", "place_name": "...", "description": "...", "type": "景點", "cost": "免費", "location": null}\n'
                    "    ]\n"
                    "  }\n"
                    "}\n"
                    "如果無法完成修改，請回傳 {\"action\": \"need_clarification\", \"question\": \"...\"}。"
                )
            elif trip_context_text:
                final_message = (
                    "已知旅遊資訊：\n"
                    f"{trip_context_text}\n\n"
                    f"使用者問題：{final_message}\n\n"
                    "請直接根據已知資訊給出具體建議，不得反問使用者任何問題。"
                )

            response = chat.send_message(final_message)
            ai_content = self._strip_markdown_text(response.text)
            spot_images = self._build_spot_image_cards(current_itinerary, ai_content, latlng_itinerary=latlng_itinerary)
            parsed_payload = None
            if self._is_itinerary_edit_request(message):
                try:
                    _, _, parsed_payload = self._parse_response_json(response)
                except Exception:
                    parsed_payload = None

            return {
                'success': True,
                'data': {
                    'response': ai_content,
                    'spot_images': spot_images,
                    'parsed': parsed_payload,
                    'history': (conversation_history or []) + [
                        {"role": "user", "content": message},
                        {"role": "assistant", "content": ai_content},
                    ]
                }
            }
        except Exception as e:
            return {'success': False, 'error': f"對話發生錯誤: {str(e)}"}

    def suggest_itinerary_spot(
        self,
        current_itinerary,
        target_day,
        target_item,
        trip_context=None,
    ):
        """根據目前行程與目標項目，推薦可加入或替換的景點名稱。"""
        try:
            day_value = int(target_day) if target_day else 0
            trip_context_text = self._build_trip_context_text(trip_context)
            itinerary_context_text = self._build_itinerary_context_text(
                current_itinerary, day_value - 1 if day_value > 0 else -1
            )

            prompt = f"""你是一個旅遊行程編輯助理。
請根據使用者目前的行程與想修改的目標，推薦一個最適合加入或替換的景點名稱。

推薦限制：
1. 推薦的景點必須與當天行程地點保持合理距離，與當天主要地點的距離不得超過 120 公里。
2. 如果當天行程主要集中在同一城市或同一區域，請優先推薦同城市、同區域或鄰近區域的景點。
3. 如果無法確認距離是否符合限制，請優先選擇更接近現有行程的地點，不要推薦太遠或跨區過多的景點。
4. 避免推薦與當天行程地點無明顯關聯、且搜尋框可能難以直接找到的地名。
5. 避免推薦機場、航廈、候機室這類地點，機場只是交通節點，不應列為觀光景點。

請只回傳純 JSON，不要輸出 Markdown 或多餘說明。

現有旅遊上下文：
{trip_context_text or '無'}

現有行程：
{itinerary_context_text or '無'}

目標天數：第 {day_value} 天
目標行程：{target_item}

請輸出以下 JSON 結構：
{{
    "action": "recommend_spot",
    "target_day": {day_value},
    "target_item": "{target_item}",
    "suggested_spot": "景點名稱",
    "search_keyword": "同 suggested_spot",
    "reason": "一句話理由"
}}

如果資訊不足，請輸出：
{{
    "action": "need_clarification",
    "question": "請補充..."
}}
"""

            response = self.model.generate_content(
                prompt, generation_config=self.generation_config
            )
            raw_content, cleaned_json, parsed_json = self._parse_response_json(response)

            return {
                "success": True,
                "data": {
                    "raw_output": raw_content or cleaned_json,
                    "parsed": parsed_json,
                },
            }
        except Exception as e:
            return {"success": False, "error": f"景點推薦失敗: {str(e)}"}

    def suggest_spot_duration(self, place_name, place_type=None, address=None, rating=None):
        """針對單一景點建議停留時間，供手動加入行程的景點補上 time 欄位。"""
        try:
            type_text = place_type or "景點"
            address_text = address or "未提供"
            rating_text = str(rating) if rating is not None else "未提供"

            prompt = f"""你是一個旅遊行程助理。請針對下面這個景點，估算遊客大概會停留多久時間。

景點名稱：{place_name}
景點類型：{type_text}
地址：{address_text}
評分：{rating_text}

請只回傳純 JSON，不要輸出 Markdown 或多餘說明，結構如下：
{{
    "time": "建議停留 X 小時"
}}

規則：
1. time 請用「建議停留 X 小時」這種自然語句，X 可以是小數（例如 1.5），不要使用 09:00 這類實際時刻。
2. 如果建議停留時間 < 1小時，請直接寫「建議停留 30 分鐘」或「建議停留 15 分鐘」這種說法，不要寫「建議停留 0.5 小時」。
3. 請依景點類型與規模合理判斷，例如博物館、主題樂園停留較久，便利商店、車站、小型景點停留較短。
4. 不要輸出除了 time 以外的欄位。
"""

            response = self.model.generate_content(
                prompt, generation_config=self.generation_config
            )
            raw_content, cleaned_json, parsed_json = self._parse_response_json(response)

            suggested_time = ""
            if isinstance(parsed_json, dict):
                suggested_time = str(parsed_json.get("time") or "").strip()

            return {
                "success": True,
                "data": {
                    "time": suggested_time,
                    "raw_output": raw_content or cleaned_json,
                },
            }
        except Exception as e:
            return {"success": False, "error": f"停留時間建議失敗: {str(e)}"}

    def generate_itinerary(
        self, location, days, trip_pace, traveler_type, interests, start_date=None
    ):
        """生成完整詳細行程 (結構化輸出)"""
        try:
            interests_str = ", ".join(interests) if interests else "通用興趣"
            date_info = (
                f"出發日期: {start_date}"
                if start_date
                else "出發日期: 未指定 (請假設從星期一開始)"
            )
            pace_label = "緊湊" if str(trip_pace).strip() in {"packed", "緊湊"} else "輕鬆"
            pace_rule = (
                "行程緊湊度：緊湊，每日可用觀光時間為 10 小時，請安排景點使每日建議停留時間總和接近 10 小時（含景點間移動時間），景點數不得超過 5 個。"
                if pace_label == "緊湊"
                else "行程緊湊度：輕鬆，每日可用觀光時間為 6 小時，請安排景點使每日建議停留時間總和不超過 6 小時（含景點間移動時間），景點數不得超過 3 個。"
            )

            prompt = f"""請為以下旅客創建完整的{days}天{location}行程。
            旅客類型: {traveler_type}
            行程緊湊度: {pace_label}
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
                                "time": "建議停留 X 小時",
                                "location_name": "地點名稱"
                            }}
                        ]
                    }}
                ]
            }}
            只要輸出上面有給的內容就好。不要包含任何 markdown 標記。
            請根據行程緊湊度和每個景點的建議停留時間來決定每日景點數，嚴格遵守以下規則：
            - 輕鬆：每日可用觀光時間 6 小時，景點建議停留時間總和不超過 6 小時，景點數不超過 3 個
            - 緊湊：每日可用觀光時間 10 小時，景點建議停留時間總和接近 10 小時，景點數不超過 5 個
            若單一景點建議停留時間已達 5 小時以上，該天不得再安排其他景點。
            {pace_rule}
            每一天的 location 裡面至少要有一個 type 為「美食」的項目。
            如果該天原本沒有餐廳或美食安排，請補上一個合適且常見的在地美食或餐廳。
            days[].location.location_name裡面只可以有景點名稱，不要包含任何描述或其他資訊。
            請避免推薦墓園、墳墓、靈骨塔、墓地、graveyard、cemetery、sacred burial sites 這類景點。
            如果原本可能會想到這類地點，請改成附近的公園、商店街、博物館、神社、寺院或其他更適合一般旅遊的景點。
            絕對不可以推薦任何機場、國際機場、航廈、候機室、機場捷運站這類地點（例如：桃園國際機場、成田機場、羽田機場、關西國際機場等），機場是交通節點，不得列為觀光景點，即使行程起訖點在機場附近也不得列入。
            所有景點都必須是位於「{location}」當地、實際存在於該城市或地區範圍內的真實景點，絕對不可以出現其他城市或國家的景點。
            特別注意：不要因為慣性聯想而誤植台灣的景點（例如九份、台北101、士林夜市、西門町、太魯閣、日月潭、淡水等），除非「{location}」本身就位於台灣。如果你想到的景點其實位於其他城市或國家，請改成「{location}」當地真實對應、性質相近的景點。
            檢查每日景點的距離不要超過120公里。
            同一區的景點安排在同一天，不要同個區的景點去兩天。
            像是秋葉原電器街和秋葉原根本上是同個地方，就不要同一天安排一個叫秋葉原電器街、一個叫秋葉原的景點，請合併成同一個景點。
            車站這類的景點也是同樣的道理，如果有一個叫「東京車站」，另一個叫「東京車站八重洲口」，就不要同一天安排兩個，請合併成一個「東京車站」。
            不論行程緊湊度為何，同一天都不得同時安排兩個位於相同建築、相同園區、或實際上是同一地點的景點（例如：有晴空塔就不能再加晴空塔城、有東京鐵塔就不能再加東京鐵塔內的展望台），這類景點請合併成一個。
            這個合併規則不限於名稱完全相同的情況：只要兩個地點名稱有包含關係（其中一個名稱完整出現在另一個名稱裡面），例如「新世界」和「新世界串炸店」、「道頓堀」和「道頓堀固力果」，就視為同一區域內的細項，同一天只能挑一個，不要兩個都排進去。
            「每一天至少要有一個美食」這條規則也必須遵守上述合併規則：補美食時，新增地點的名稱不可包含當天其他景點名稱、也不可被當天其他景點名稱包含，請改選名稱明顯不同、實際上是另一個地點的真實美食或餐廳。
            如果行程緊湊度為「輕鬆」，景點之間還必須保持實際距離，不可以安排兩個步行2分鐘內就能互通的景點；輕鬆行程的每個景點必須是彼此獨立、有一定距離的不同地點。
            若單一景點（如主題樂園、大型遊樂園）建議停留時間達 5 小時以上，該天不得再安排任何其他景點，因為這類景點本身就包含全天的活動與餐飲。

            """
            # 嚴格遵守以下 JSON 結構輸出，確保前端能直接渲染：
            # {{
            #     "days": [
            #         {{
            #             "day": 1,
            #             "weekday": "星期幾 (例如：星期一)",
            #             "activities": [
            #                 {{
            #                     "time": "建議停留 2 小時",
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

            raw_content, _, parsed_json = self._parse_response_json(response)

            return {
                "success": True,
                "data": {
                    "raw_output": raw_content,
                    "parsed": parsed_json,
                },
            }
        except Exception as e:
            return {"success": False, "error": f"行程生成失敗: {str(e)}"}

    def generate_itinerary_detail(
        self,
        location,
        days,
        trip_pace,
        traveler_type,
        interests,
        start_date=None,
        existing_itinerary=None,
    ):
        """生成完整詳細行程 (包含description、type、cost等詳細信息)

        參數：
            existing_itinerary: 可選的現有行程 JSON 數據。
        """
        try:
            interests_str = ", ".join(interests) if interests else "通用興趣"
            date_info = (
                f"出發日期: {start_date}"
                if start_date
                else "出發日期: 未指定 (請假設從星期一開始)"
            )
            pace_label = "緊湊" if str(trip_pace).strip() in {"packed", "緊湊"} else "輕鬆"
            pace_rule = (
                "行程緊湊度：緊湊，每日可用觀光時間為 10 小時，請安排景點使每日建議停留時間總和接近 10 小時（含景點間移動時間），景點數不得超過 5 個。"
                if pace_label == "緊湊"
                else "行程緊湊度：輕鬆，每日可用觀光時間為 6 小時，請安排景點使每日建議停留時間總和不超過 6 小時（含景點間移動時間），景點數不得超過 3 個。"
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

                        locations = (
                            day_item.get("locations", [])
                            if isinstance(day_item, dict)
                            else []
                        )
                        normalized_locations = []
                        for loc in locations:
                            loc_name = (
                                loc.get("location_name")
                                if isinstance(loc, dict)
                                else None
                            )
                            if not loc_name:
                                continue
                            loc_time = (
                                str(loc.get("time") or "").strip()
                                if isinstance(loc, dict)
                                else ""
                            )
                            normalized_locations.append(
                                {
                                    "time": loc_time,
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
            prompt = f"""請根據以下現有行程進行補充相關資訊，請勿更改任何行程內容。
            原始行程：
            {existing_itinerary_str}

            修改要求：
            旅客類型: {traveler_type}
            行程緊湊度: {pace_label}
            興趣: {interests_str}
            {date_info}

            請保留現有行程的日期和基本結構。
            確保修改後的行程仍然保持以下 JSON 結構：
            {{
                "days": [
                    {{
                        "day": 1,
                        "weekday": "星期幾 (例如：星期一)", 
                        "location": [
                            {{
                                "time": "建議停留 X 小時",
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
            - 不確定的估算：約 JPY 2,000
            - 禁止輸出沒有幣別或沒有千分位的格式。
            5. 只回傳純 JSON，不要包含任何 markdown 標記。
            6. 確保修改後的行程符合用戶行程緊湊度偏好和興趣。
            7. 優先沿用原始行程中的 place_name（請不要改名或換成不同地點）。
            8. 每天 location 項目數量需與原始行程對應天數的地點數量一致。
            9. 不要推薦墓園、墳墓、靈骨塔、墓地、graveyard、cemetery、sacred burial sites 這類地點；若原始內容包含這類地點，請替換成相鄰且更適合旅遊的景點。
            不要推薦機場、航廈、候機室這類地點；機場只是交通節點，不應列為觀光景點，若原始內容包含機場，請替換成附近適合旅遊的景點。
            若原始內容中出現不屬於「{location}」當地的景點（例如行程目的地不是台灣，卻出現九份、台北101、士林夜市這類台灣景點），請替換成「{location}」當地真實對應、性質相近的景點。
            10. 每一天的 location 裡面至少要有一個 type 為「美食」的項目；如果原始行程沒有美食，請補上一個合適的餐廳或在地美食。
            補美食時必須避免與當天其他 location 重複或重疊：新增地點的名稱不可包含當天其他 location 的 place_name、也不可被當天其他 location 的 place_name 包含（例如當天已有「新世界」，就不可以新增「新世界串炸店」這種同樣含有「新世界」的店家），也不可以是同一棟建築、同一園區內的設施，請改選名稱明顯不同、實際上是另一個地點的真實美食或餐廳。
            11. 如果原始行程沒有提供 time，請你依照景點類型、規模與行程節奏自行判斷建議停留時間，不要使用固定預設值。
            如果需要根據行程節奏估算整體安排，請使用同樣的緊湊度規則：
            - 輕鬆：視為悠閒節奏，安排 2 個景點並增加每站停留時間。
            - 緊湊：視為密集行程，安排 4 個景點並相應縮短每站停留時間。
            {pace_rule}
            12. location[].time 請表示建議停留時間，不要使用 09:00 這類實際時刻；請用「建議停留 X 小時」或相近的自然語句。
            """

            response = self.model.generate_content(
                prompt, generation_config=self.generation_config
            )

            raw_content, _, parsed_json = self._parse_response_json(response)
            print(parsed_json)
            return {
                "success": True,
                "data": {
                    "parsed": parsed_json,
                },
            }
        except Exception as e:
            return {"success": False, "error": f"行程生成/修改失敗: {str(e)}"}

    def refine_itinerary(self, itinerary, feedback): #廢物
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

            _, cleaned_json, parsed_json = self._parse_response_json(response)

            return {
                "success": True,
                "data": {
                    "raw_output": cleaned_json,
                    "parsed": parsed_json,
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

            _, cleaned_json, parsed_json = self._parse_response_json(response)

            return {
                "success": True,
                "data": {
                    "raw_output": cleaned_json,
                    "parsed": parsed_json,
                },
            }
        except Exception as e:
            return {"success": False, "error": f"提示獲取失敗: {str(e)}"}
