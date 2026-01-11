import json
'''from config import Config'''
from services.googlemap_service import GoogleMapService

def test_get_distance_and_duration():
    service = GoogleMapService()
    result = service.get_distance_and_duration("大阪城", "名古屋城", mode="driving")
    print(json.dumps(result, ensure_ascii=False, indent=4))

'''
travel = {
    "plan":
        [
            {
                "day": 1,
                "stops": [
                    {
                        "name": "台北101",
                        "address": "台北市信義區市府路45號",
                        "type": "attraction"
                    },
                    {
                        "name": "台北車站",
                        "address": "台北市中正區北平西路3號",
                        "type": "transportation"
                    }
                ]
            },
            {
                "day": 2,
                "stops": [
                    {
                        "name": "故宮博物院",
                        "address": "台北市士林區至善路二段221號",
                        "type": "attraction"
                    },
                    {
                        "name": "士林夜市",
                        "address": "台北市士林區大東路101號",
                        "type": "attraction"
                    }
                ]
            }
        ]
}
result = service.get_distance_and_duration("台北101", "台北車站", mode="driving")
print(result)

buffer_time = 20  # minutes
limit_time = 12 * 60  # 12 hours in minutes
def validate_travel_plan(travel_plan):
    time = 0
    for day in travel_plan["plan"]:
        stops = day["stops"]
        for i in range(len(stops) - 1):
            origin = stops[i]["name"]
            destination = stops[i + 1]["name"]
            result = service.get_distance_and_duration(origin, destination, mode="driving")
            if result["success"] == True:
                duration = result["data"]["duration"]
                time += duration + buffer_time
            else:
                return {"success": False, "message": f"Failed to get distance and duration from {origin} to {destination}"}
    if time <= limit_time:
        return {"success": True, "message": "Travel plan is valid within the time limit."}
    else:
        return {"success": False, "message": "Travel plan exceeds the time limit."}


{
    "data": {
        "destination": "台北車站",
        "distance": "5.8 公里",
        "duration": "20 分鐘",
        "mode": "driving",
        "origin": "台北101"
    },
    "success": true 
}'''