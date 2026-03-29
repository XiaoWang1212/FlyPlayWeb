from services.travel_service import TravelService

class TravelController:
    def __init__(self):
        self.travel_service = TravelService()

    def create_project(self, user_id, title):
        return {"success": True, "data": self.travel_service.create_project(user_id, title)}

    def create_itinerary(self, project_id, days, destination, type_, money, data_json):
        return {"success": True, "data": self.travel_service.create_itinerary(project_id, days, destination, type_, money, data_json)}

    def list_itineraries(self, project_id):
        return {"success": True, "data": self.travel_service.get_itineraries(project_id)}

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

    def delete_project(self, project_id):
        data = self.travel_service.delete_project(project_id)
        if not data:
            return {"success": False, "error": "專案不存在"}
        return {"success": True, "data": data}

    async def generate_itinerary(self, location, days, budget, traveler_type, interests, start_date=None):
        res = await self.travel_service.generate_itinerary(location, days, budget, traveler_type, interests, start_date)
        return res