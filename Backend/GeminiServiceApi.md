# Gemini Service API 文件

這份文件說明目前專案中 `GeminiService` 的用途、對外方法，以及相關 Flask 路由。

---

## 1. 服務概覽

`GeminiService` 位於 [Backend/services/gemini_service.py](Backend/services/gemini_service.py)，負責把使用者輸入組成 prompt，交給 Google Gemini 生成結構化 JSON，並在回傳前做基本清理與解析。

目前使用的模型與設定：

- 模型：`gemini-2.5-flash`
- API Key：從 `Config.GEMINI_API_KEY` 讀取
- 生成參數：
	- `temperature: 0.5`
	- `top_p: 0.95`
	- `top_k: 40`
	- `max_output_tokens: 9999`

---

## 2. 共用處理邏輯

服務內有三個共用 helper：

- `_clean_json_response(response_text)`
	- 移除 Gemini 可能回傳的 Markdown code block 標記。
	- 去掉 `json` 標籤與多餘空白。
- `_parse_response_json(response)`
	- 取得 `response.text`。
	- 清理後再用 `json.loads()` 解析。
	- 回傳 `raw_content`、`cleaned_json`、`parsed_json`。
- `_extract_token_usage(response)`
	- 從 `response.usage_metadata` 擷取 token 使用量。
	- 目前回傳欄位只有 `total_tokens`，若無法取得則回傳 `null`。

---

## 3. 對外方法

### 3.1 `get_travel_recommendation(location, days, transportation, preferences)`

用途：產生簡要旅遊推薦。

輸入：

- `location`：目的地
- `days`：天數
- `transportation`：主要交通方式
- `preferences`：偏好活動

輸出格式：

```json
{
	"success": true,
	"data": {
		"raw_output": "...",
		"parsed": {
			"recommendation_summary": "...",
			"highlights": ["..."],
			"daily_outline": [
				{
					"day": 1,
					"weekday": "星期幾",
					"focus": "...",
					"places": ["..."]
				}
			]
		},
		"token_usage": {
			"total_tokens": 1234
		}
	}
}
```

---

### 3.2 `generate_itinerary(location, days, budget, traveler_type, interests, start_date=None)`

用途：生成行程骨架版 JSON，讓前端可直接渲染。

輸入：

- `location`：目的地
- `days`：天數
- `budget`：預算等級
- `traveler_type`：旅伴類型
- `interests`：興趣清單
- `start_date`：可選出發日期

輸出重點：

- 回傳 `parsed`。
- JSON 結構以 `days[].location[]` 為主。
- 每個景點只保留 `time` 與 `location_name`。
- 服務提示中要求：
	- 不要輸出 Markdown
	- 一天最多四個景點
	- 景點不重複
	- `location_name` 只允許景點名稱

範例結構：

```json
{
	"days": [
		{
			"day": 1,
			"weekday": "星期一",
			"location": [
				{
					"time": "09:00",
					"location_name": "清水寺"
				}
			]
		}
	]
}
```

---

### 3.3 `generate_itinerary_detail(location, days, budget, traveler_type, interests, start_date=None, existing_itinerary=None)`

用途：以既有行程為基礎，補充更完整的細節資訊。

輸入：

- `existing_itinerary`：可選，若有則先正規化成 Gemini 可讀格式。

行為：

- 若 `existing_itinerary` 存在，會先轉成 `{ "days": [...] }`。
- 若沒有，會使用 `test.json` 作為 fallback。
- 會要求 Gemini 保留原始日期與基本結構。
- 每天的 `location` 數量需對應原始資料。

輸出結構：

```json
{
	"days": [
		{
			"day": 1,
			"weekday": "星期一",
			"location": [
				{
					"time": "09:00",
					"place_name": "清水寺",
					"description": "...",
					"type": "景點",
					"cost": "JPY 500"
				}
			]
		}
	]
}
```

規則重點：

- `place_name` 只能是地點名稱。
- `description` 必須簡短。
- `type` 只能是 `景點`、`美食`、`交通`、`住宿`。
- `cost` 需符合幣別格式，例如 `JPY 3,000`、`JPY 1,000 - 2,500`、`免費`。

---

### 3.4 `refine_itinerary(itinerary, feedback)`

用途：根據使用者回饋微調行程。

輸入：

- `itinerary`：原始行程 JSON
- `feedback`：使用者回饋內容

輸出：

- `raw_output`：清理後的 JSON 字串
- `parsed`：解析後的 JSON 物件
- `token_usage`：token 使用量

特性：

- 要求 Gemini 保持與原始 JSON 結構一致。
- 會保留 `weekday` 欄位。

---

### 3.5 `get_travel_tips(location, travel_time=None)`

用途：提供目的地旅遊提示。

輸入：

- `location`：目的地
- `travel_time`：可選旅遊時間描述

輸出欄位：

- `best_time_to_visit`
- `entry_requirements`
- `currency_info`
- `cultural_etiquette`
- `transportation_guide`
- `must_visit_spots`

---

## 4. Flask 路由對應

目前與 GeminiService 關聯的路由主要有以下幾個：

- `POST /recommendation`
	- 對應 `handle_travel_recommendation()`
- `POST /itinerary`
	- 對應 `handle_generate_itinerary()`
- `POST /refine`
	- 對應 `handle_refine_itinerary()`
- `POST /clear-history`
	- 對應 `handle_clear_history()`
- `POST /api/itinerary/detail`
	- 由 [Backend/app.py](Backend/app.py) 直接呼叫 `generate_itinerary_detail()`

其中 `/recommendation`、`/itinerary`、`/refine`、`/clear-history` 都有 `login_required` 保護。

---

## 5. 目前回傳格式特色

- 成功時統一回傳：`{"success": true, "data": ...}`
- 失敗時統一回傳：`{"success": false, "error": "..."}`
- Gemini 內容會先做 JSON 清理，再進行解析。
- 若回傳不是合法 JSON，會直接進入例外處理。

---

## 6. 開發注意事項

- Gemini prompt 已明確要求只輸出純 JSON，不要帶 Markdown。
- `generate_itinerary_detail()` 會嘗試保留原始行程結構，不會任意改名。
- `generate_itinerary()` 與 `generate_itinerary_detail()` 對資料格式要求不同，前端串接時要區分。
- 若要調整輸出格式，建議先改 prompt，再同步調整前端解析邏輯。

