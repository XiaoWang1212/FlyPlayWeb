import json
import re
import math
from services.googlemap_service import GoogleMapService
from datetime import datetime

buffer_time = 20  # minutes
limit_time = 12 * 60  # 12 hours in minutes
angle_threshold = 60

def validate_travel_plan(travel_plan):
    data = travel_plan["data"]
    time_result = time_validate(data)
    open_result = open_validate(data["days"])
    route_result = route_validate(data)
    
    
def time_validate(data_days):
    service = GoogleMapService()
    time = 0
    for day in data_days["days"]:
        stops = day["activities"]
        for i in range(len(stops) - 1):
            origin = stops[i]["place_name"]
            destination = stops[i + 1]["place_name"]
            result = service.get_distance_and_duration(origin, destination, mode="driving")
            if result["success"] == True:
                time_str = result["data"]["duration"]
                hours = re.search(r'(\d+)小時', time_str)
                minutes = re.search(r'(\d+)分鐘', time_str)
                h = int(hours.group(1)) if hours else 0
                m = int(minutes.group(1)) if minutes else 0
                duration = h * 60 + m
                time += duration + buffer_time
            else:
                return {"success": False, "message": f"Failed to get distance and duration from {origin} to {destination}"}
    if time <= limit_time:
        return {"success": True, "message": "Travel plan is valid within the time limit."}
    else:
        return {"success": False, "message": "Travel plan exceeds the time limit."}


def open_validate(data_days):
    service = GoogleMapService()

    for day in data_days:
        weekday = day.get("weekday")
        activities = day.get("activities")
        for act in activities:
            place_name = act.get("place_name")
            act_time = act.get("time")

            # 查詢營業時間
            result = service.get_opening_hours(place_name, is_name=True)
            if not result.get("success"):
                return {
                    "success": False,
                    "message": f"無法取得 {place_name} 的營業時間"
                }
            opening_hours = result["data"].get("opening_hours", [])

            # 找對應的星期
            day_opening = None
            for line in opening_hours:
                if line.startswith(weekday):
                    day_opening = line
                    break

            if not day_opening:
                return {
                    "success": False,
                    "message": f"{place_name} 在 {weekday} 沒有營業資訊"
                }

            # 解析營業時間
            # 範例："星期六: 09:00 – 19:00"
            try:
                time_part = day_opening.split(": ", 1)[1]
                open_time_str, close_time_str = time_part.split(" – ")

                open_time = datetime.strptime(open_time_str, "%H:%M").time()
                close_time = datetime.strptime(close_time_str, "%H:%M").time()
                activity_time = datetime.strptime(act_time, "%H:%M").time()
            except Exception:
                return {
                    "success": False,
                    "message": f"{place_name} 的營業時間格式解析失敗"
                }

            # 判斷是否在營業時間內
            if not (open_time <= activity_time <= close_time):
                return {
                    "success": False,
                    "message": (
                        f"{place_name} 在 {weekday} {act_time} 未營業 "
                        f"(營業時間 {open_time_str}–{close_time_str})"
                    )
                }

    return {
        "success": True,
        "message": "所有行程皆在營業時間內"
    }
    

def route_validate(plan_json, angle_threshold=60):
    days = plan_json.get("data", {}).get("days", [])
    for day in days:
        activities = day.get("activities", [])
        for i in range(len(activities) - 2):
            a = activities[i]["location"]
            b = activities[i + 1]["location"]
            c = activities[i + 2]["location"]
            angle = turning_angle(a, b, c)

            if angle is not None and angle < angle_threshold:
                return {
                    "success": False,
                    "message": "Travel plan has a detour.",
                    "problem_day": day,
                    "problem_place": activities[i + 1]["place_name"],
                    "angle": round(angle, 2)
                }
    return {
        "success": True,
        "message": "Travel route is feasible."
    }


def turning_angle(a, b, c):
        BA = (a["lat"] - b["lat"], a["lng"] - b["lng"])
        BC = (c["lat"] - b["lat"], c["lng"] - b["lng"])

        dot = BA[0] * BC[0] + BA[1] * BC[1]
        mag_ba = math.sqrt(BA[0]**2 + BA[1]**2)
        mag_bc = math.sqrt(BC[0]**2 + BC[1]**2)

        if mag_ba == 0 or mag_bc == 0:
            return None

        cos_angle = dot / (mag_ba * mag_bc)
        cos_angle = max(-1, min(1, cos_angle))
        return math.degrees(math.acos(cos_angle))

'''
    {
    "code": 200,
    "data": {
        "days": [
            {
                "activities": [
                    {
                        "cost": "約3000日圓",
                        "description": "在這裡開始一天的購物之旅，探索各種電子產品以及動漫周邊商品。",
                        "location": {
                            "lat": 35.6994,
                            "lng": 139.7739
                        },
                        "place_name": "秋葉原",
                        "time": "09:00",
                        "type": "購物"
                    },
                    {
                        "cost": "約500日圓",
                        "description": "參觀東京最著名的寺廟，享受周邊的小吃與傳統風情。",
                        "location": {
                            "lat": 35.7148,
                            "lng": 139.7967
                        },
                        "place_name": "淺草寺",
                        "time": "12:00",
                        "type": "景點"
                    },
                    {
                        "cost": "約1000日圓",
                        "description": "品嚐淺草著名的雷門甜點與小吃，如方便抹茶冰淇淋。",
                        "location": {
                            "lat": 35.7148,
                            "lng": 139.7967
                        },
                        "place_name": "雷門名物小吃",
                        "time": "13:30",
                        "type": "美食"
                    },
                    {
                        "cost": "約8000日圓",
                        "description": "前往東京迪士尼樂園，享受夢幻的遊樂設施和精彩表演。",
                        "location": {
                            "lat": 35.6329,
                            "lng": 139.8804
                        },
                        "place_name": "東京迪士尼樂園",
                        "time": "15:00",
                        "type": "景點"
                    },
                    {
                        "cost": "約4000日圓",
                        "description": "在迪士尼內的餐廳享用浪漫晚餐，結束美好的一天。",
                        "location": {
                            "lat": 35.6329,
                            "lng": 139.8804
                        },
                        "place_name": "迪士尼餐廳",
                        "time": "20:00",
                        "type": "美食"
                    }
                ],
                "date_title": "購物與迪士尼日",
                "day": 1,
                "weekday": "星期六"
            }
        ],
        "dining_recommendations": [
            {
                "feature": "著名的小籠包與餃子",
                "name": "小籠包 餃子",
                "price_range": "1000日圓"
            },
            {
                "feature": "新鮮的壽司食材",
                "name": "壽司屋",
                "price_range": "3000日圓"
            }
        ],
        "overview": "這是一個充滿購物、美食與迪士尼樂園的浪漫一天，適合情侶在東京度過難忘的時光。",
        "total_budget_estimate": "15000 - 20000日圓",
        "transport_tips": "建議購買一日東京通行券，方便搭乘地鐵和巴士，此外，從淺草到迪士尼可以搭乘JR京葉線。",
        "trip_title": "東京浪漫之旅"
    },
    "message": "行程生成成功"
}
    '''