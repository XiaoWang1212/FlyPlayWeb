from services.travel_service import TravelService
from services.gemini_service import GeminiService


class TravelController:
    def __init__(self):
        self.travel_service = TravelService()
        self.gemini_service = GeminiService()

    def create_project(self, user_id, title):
        return {
            "success": True,
            "data": self.travel_service.create_project(user_id, title),
        }

    def create_itinerary(
        self,
        project_id,
        days,
        departure_airport,
        destination,
        type_,
        companion,
        budget,
        interests,
        start_date,
    ):
        if not all(
            [
                project_id,
                days,
                departure_airport,
                destination,
                type_,
                companion,
                budget,
                start_date,
            ]
        ):
            return {"success": False, "error": "缺少欄位"}

        if interests is None:
            interests = []
        if not isinstance(interests, list):
            return {"success": False, "error": "interests 必須是 list"}

        ai_result = self.gemini_service.generate_itinerary(
            location=destination,
            days=days,
            budget=budget,
            traveler_type=companion,
            interests=interests,
            start_date=start_date,
        )
        if not ai_result.get("success"):
            return {"success": False, "error": ai_result.get("error", "AI 生成失敗")}

        parsed = ai_result.get("data", {}).get("parsed")
        if not isinstance(parsed, dict):
            return {"success": False, "error": "AI 回傳格式錯誤"}

        itinerary_id = self.travel_service.create_itinerary_record(
            project_id=project_id,
            days=days,
            departure_airport=departure_airport,
            destination=destination,
            type=type_,
            companion=companion,
            budget=budget,
            interests=interests,
            start_date=start_date,
            data_json=parsed,
        )
        if itinerary_id:
            return {"success": True, "data": {"itinerary_id": itinerary_id}}
        return {"success": False, "error": "寫入失敗"}

    def list_itineraries(self, project_id):
        return {
            "success": True,
            "data": self.travel_service.get_itineraries(project_id),
        }

    def list_projects(self, user_id):
        return {"success": True, "data": self.travel_service.get_projects(user_id)}

    def get_itinerary(self, itinerary_id):
        data = self.travel_service.get_itinerary(itinerary_id)
        if not data:
            return {"success": False, "error": "行程不存在"}
        return {"success": True, "data": data}

    def update_itinerary(self, itinerary_id, payload):
        data = self.travel_service.update_itinerary(itinerary_id, **payload)
        if not data:
            return {"success": False, "error": "更新失敗或無可更新欄位"}
        return {"success": True, "data": data}

    def delete_itinerary(self, itinerary_id):
        data = self.travel_service.delete_itinerary(itinerary_id)
        if not data:
            return {"success": False, "error": "行程不存在"}
        return {"success": True, "data": data}

    async def generate_itinerary(
        self, location, days, budget, traveler_type, interests, start_date=None
    ):
        res = self.gemini_service.generate_itinerary(
            location, days, budget, traveler_type, interests, start_date
        )
        return res

    def delete_project(self, project_id):
        data = self.travel_service.delete_project(project_id)
        if not data:
            return {"success": False, "error": "專案不存在"}
        return {"success": True, "data": data}
