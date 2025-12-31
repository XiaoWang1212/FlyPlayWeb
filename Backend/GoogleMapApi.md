# GOOGLE MAP API 操作說明

---

## 1️. 距離與時間查詢

**API 路徑**  
`POST http://localhost:5000/api/maps/distance`

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
`POST http://localhost:5000/api/maps/route_details`

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
`POST http://localhost:5000/api/maps/opening_hours`

```python
from services.googlemap_service import GoogleMapService

service = GoogleMapService()
result = service.get_opening_hours("Simple Kaffa Sola 天空興波", is_name=True)
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
        "place_id": "Simple Kaffa Sola 天空興波"
    },
    "success": true
}
```

### 解釋

- name：店家名稱
- opening_hours：每週營業時間
- place_id：查詢用的店名（或 place_id）
