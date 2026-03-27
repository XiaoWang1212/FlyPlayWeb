# GOOGLE MAP API 操作說明

---

## 1️. 距離與時間查詢

**API 路徑**  
`POST http://localhost:5001/api/maps/distance`

### 程式調用

```python
from services.googlemap_service import GoogleMapService

service = GoogleMapService()
result = service.get_distance_and_duration("台北101", "台北車站", mode="driving")
print(result)
```

### 請求範例

```json
{
  "origin": "台北101",
  "destination": "台北車站",
  "mode": "driving"
}
```

### 回傳範例

```json
{
  "data": {
    "destination": "台北車站",
    "distance": "5.8 公里",
    "duration": "20 分鐘",
    "mode": "driving",
    "origin": "台北101"
  },
  "success": true
}
```

---

## 2️. 路線細節查詢

**API 路徑**  
`POST http://localhost:5001/api/maps/route_details`

### 程式調用

```python
from services.googlemap_service import GoogleMapService

service = GoogleMapService()
result = service.get_route_details("台北101", "台北車站", mode="transit")
print(result)
```

### 請求範例

```json
{
  "origin": "台北101",
  "destination": "台北車站",
  "mode": "transit"
}
```

### 回傳範例

```json
{
  "data": {
    "destination": "台北車站",
    "mode": "transit",
    "origin": "台北101",
    "steps": [
      {
        "distance": "0.2 公里",
        "duration": "4 分鐘",
        "instruction": "步行到台北101/世貿"
      },
      {
        "arrival_stop": "台北車站",
        "departure_stop": "台北101/世貿",
        "instruction": "捷運 開往淡水站",
        "line_name": "淡水信義線",
        "num_stops": 7,
        "vehicle": "SUBWAY"
      },
      {
        "distance": "0.1 公里",
        "duration": "2 分鐘",
        "instruction": "步行到100台灣臺北市中正區臺北車站"
      }
    ]
  },
  "success": true
}
```

### 解釋

- steps：路線步驟（依序）
  1. 步行到捷運站
  2. 搭乘捷運（包含線路、上下車站、站數、交通工具類型）
  3. 下車後步行到目的地
- 每個步驟都包含距離、時間、指示說明

---

## 3️⃣ 店家營業時間查詢

**API 路徑**  
`POST http://localhost:5001/api/maps/business_info`

```python
from services.googlemap_service import GoogleMapService

service = GoogleMapService()
result = service.get_place_business_info("Simple Kaffa Sola 天空興波", is_name=True)
print(result)
```

### 請求範例

```json
{
  "name": "Simple Kaffa Sola 天空興波"
}
```

### 回傳範例

```json
{
  "data": {
    "name": "Simple Kaffa Sola 天空興波",
    "opening_hours": [
      "星期一: 09:00 – 19:00",
      "星期二: 09:00 – 19:00",
      "星期三: 09:00 – 19:00",
      "星期四: 09:00 – 19:00",
      "星期五: 09:00 – 19:00",
      "星期六: 09:00 – 19:00",
      "星期日: 09:00 – 19:00"
    ],
    "place_id": "Simple Kaffa Sola 天空興波",
    "google_place_id": "ChIJP5CF7pmrQjQRY1MyLg_GRrw",
    "price_range": {
      "startPrice": {
        "currencyCode": "TWD",
        "units": "200"
      },
      "endPrice": {
        "currencyCode": "TWD",
        "units": "1200"
      }
    }
  },
  "success": true
}
```

### 解釋

- name：店家名稱
- opening_hours：每週營業時間
- place_id：檢索輸入（若從店名查詢，為店名；若直接 path 查詢，為 path 資料）
- google_place_id：Google Places 真實 place_id（可用於后續詳細資料查詢）
- price_range：Google place details 回傳的價格範圍物件，通常含 startPrice/endPrice

---

## 3️⃣a  店家營業時間查詢（直接 place_id）

**API 路徑**  
`GET http://localhost:5001/api/maps/business_info/<place_id>`

### 範例

```bash
curl -X GET "http://localhost:5001/api/maps/business_info/ChIJP5CF7pmrQjQRY1MyLg_GRrw" -H "Content-Type: application/json"
```

### 回傳範例

```json
{
  "data": {
    "name": "Simple Kaffa Sola 天空興波",
    "opening_hours": [
      "星期一: 09:00 – 19:00",
      "星期二: 09:00 – 19:00",
      "星期三: 09:00 – 19:00",
      "星期四: 09:00 – 19:00",
      "星期五: 09:00 – 19:00",
      "星期六: 09:00 – 19:00",
      "星期日: 09:00 – 19:00"
    ],
    "place_id": "ChIJP5CF7pmrQjQRY1MyLg_GRrw",
    "price_range": {
      "startPrice": {
        "currencyCode": "TWD",
        "units": "200"
      },
      "endPrice": {
        "currencyCode": "TWD",
        "units": "1200"
      }
    }
  },
  "success": true
}
```

### 解釋

- place_id：Google Places 真實 place_id
- API 路徑取自 route `/business_info/<place_id>`
- 輕鬆從名稱查到ID之後直接用此路徑重用（或前端直接給ID即可）

---

## 4️⃣ Gemini 與 Google Maps 欄位契約

這份契約用於降低 Gemini 回應時間，並把地圖真實資料交由 Google Maps API 取得。

### A. Gemini 需要生成的欄位（不呼叫 Google）

- trip_title
- overview
- total_budget_estimate
- days[].day
- days[].weekday
- days[].date_title
- days[].activities[].time
- days[].activities[].place_name
- days[].activities[].description
- days[].activities[].type
- days[].activities[].cost
- dining_recommendations[].name
- dining_recommendations[].feature
- dining_recommendations[].price_range
- transport_tips

### B. Google Maps API 需要補齊的欄位

- days[].activities[].place_id
- days[].activities[].address
- days[].activities[].location.lat
- days[].activities[].location.lng
- dining_recommendations[].place_id
- dining_recommendations[].address
- dining_recommendations[].location.lat
- dining_recommendations[].location.lng

可選擇補齊（進階）

- rating
- opening_hours
- phone
- website
- route_distance
- route_duration

### C. Gemini 初版輸出範本（不含座標）

```json
{
  "trip_title": "京都古韻三日遊",
  "overview": "以寺社與美食為主的慢旅",
  "total_budget_estimate": "JPY 45000-60000",
  "days": [
    {
      "day": 1,
      "weekday": "星期一",
      "date_title": "東山散策",
      "activities": [
        {
          "time": "09:00",
          "place_name": "清水寺",
          "description": "早晨避開人潮參觀",
          "type": "景點",
          "cost": "JPY 500"
        }
      ]
    }
  ],
  "dining_recommendations": [
    {
      "name": "錦市場美食街",
      "feature": "在地小吃集中",
      "price_range": "JPY 1000-2500"
    }
  ],
  "transport_tips": "建議使用地鐵與步行"
}
```

### D. Google 補齊後輸出範本（給前端）

```json
{
  "trip_title": "京都古韻三日遊",
  "overview": "以寺社與美食為主的慢旅",
  "total_budget_estimate": "JPY 45000-60000",
  "days": [
    {
      "day": 1,
      "weekday": "星期一",
      "date_title": "東山散策",
      "activities": [
        {
          "time": "09:00",
          "place_name": "清水寺",
          "description": "早晨避開人潮參觀",
          "type": "景點",
          "cost": "JPY 500",
          "place_id": "ChIJWzQy8M4IAWAR0Glm4Wv3K2E",
          "address": "1 Chome-294 Kiyomizu, Higashiyama Ward, Kyoto",
          "location": {
            "lat": 34.9949,
            "lng": 135.785
          }
        }
      ]
    }
  ],
  "dining_recommendations": [
    {
      "name": "錦市場美食街",
      "feature": "在地小吃集中",
      "price_range": "JPY 1000-2500",
      "place_id": "ChIJ0dQxM9oIAWARk6xkQf8VW3A",
      "address": "Nishikikoji-dori, Nakagyo Ward, Kyoto",
      "location": {
        "lat": 35.005,
        "lng": 135.765
      }
    }
  ],
  "transport_tips": "建議使用地鐵與步行",
  "unresolved_places": []
}
```

### E. 實作規則（建議）

- 查詢輸入使用 place_name + 城市，例如：清水寺 京都。
- 做去重與快取：同名地點只查一次。
- 查不到時不要中斷，將地點放入 unresolved_places。
- 前端渲染優先使用 place_id 與 address，place_name 作為備援顯示。
