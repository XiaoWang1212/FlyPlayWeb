from optimizer import MultiModalItineraryOptimizer, json_to_locations_adapter

# 1. 準備原始 JSON

response_json = { ... } (json檔內需包含hotel)

# 2. 透過 Adapter 轉換為優化器格式

locations = json_to_locations_adapter(response_json)

# 3. 初始化優化器

optimizer = MultiModalItineraryOptimizer(
locations=len(response_json['data']['parsed']['days']),
transport_mode='driving'
)

# 4. 執行運算

result = optimizer.solve()

# 5.輸出資料結構

{
"Day 1": [
{
"location": "地點名稱",
"arrival": "10:00",
"travel_time_from_previous": "15 min",
"transport_mode": "driving",
"lat": 35.6951,
"lng": 139.7022
},
{
"location": "下一個地點",
"arrival": "11:30",
"travel_time_from_previous": "20 min",
"status": "..."
}
],
"Day 2": [ ... ]
}
