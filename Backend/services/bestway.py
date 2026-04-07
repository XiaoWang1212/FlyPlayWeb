import requests

def get_place_details(place_name, lat, lng, api_key):
    # Google Places API (New) Text Search URL
    url = "https://places.googleapis.com/v1/places:searchText"
    
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        # 這裡指定你要拿到的資料欄位，節省費用
        "X-Goog-FieldMask": "places.displayName,places.regularOpeningHours,places.id"
    }
    
    data = {
        "textQuery": place_name,
        "locationBias": {
            "circle": {
                "center": {"latitude": lat, "longitude": lng},
                "radius": 500.0
            }
        },
        "languageCode": "zh-TW"
    }
    
    response = requests.post(url, json=data, headers=headers)
    if response.status_code == 200:
        results = response.json().get('places', [])
        if results:
            return results[0] # 回傳最匹配的第一筆資料
    return None

# 使用方式範例
# detail = get_place_details("台北101", 25.0336, 121.5646, "YOUR_API_KEY")
# print(detail.get('regularOpeningHours'))