# GeminiService 文件

## 檔案位置
- Python 服務：`Backend/services/gemini_service.py`
- 說明文件：`Backend/gemini_service.md`

## 功能概述
`GeminiService` 是一個封裝 Google Gemini API 的旅遊規劃服務，提供：
- 旅遊建議摘要生成
- 行程（簡版）生成
- 行程（詳細版）生成與既有行程優化
- 依使用者回饋再次微調行程
- 目的地旅遊提示生成

服務核心特色：
- 統一清理與解析 Gemini 回傳 JSON
- 統一提取 token 使用量
- 自動補齊行程 `time` 欄位（由系統而非模型輸出）

## 依賴與設定

### 主要依賴
- `google.generativeai`
- `json`
- `datetime`
- `config.Config`

### 必要設定
- `Config.GEMINI_API_KEY` 必須存在且有效。
- 模型固定為：`gemini-2.5-flash`

### 生成參數（`generation_config`）
- `temperature`: `0.5`
- `top_p`: `0.95`
- `top_k`: `40`
- `max_output_tokens`: `9999`

## 初始化行為
在模組載入時會讀取：
- `test.json`（UTF-8）並存到 `test_data`

用途：
- `generate_itinerary_detail()` 在沒有傳入 `existing_itinerary` 時，會使用 `test_data` 作為預設原始行程。

## 內部方法

### `_clean_json_response(response_text)`
清理模型回傳字串，移除可能包裹的 markdown code fence 與 `json` 標籤。

### `_parse_response_json(response)`
統一處理回傳內容：
1. 讀取 `response.text`
2. 呼叫 `_clean_json_response()`
3. `json.loads()` 解析

回傳三元組：
- `raw_content`
- `cleaned_json`
- `parsed_json`

### `_extract_token_usage(response)`
從 `response.usage_metadata` 取出 token 用量。
目前輸出欄位：
- `total_tokens`

若 SDK 回傳中沒有 usage metadata，則 `total_tokens` 為 `None`。

### `_time_slots_for_count(count)`
依每天地點數量產生固定時間點。
- 1~5 筆使用預設時段
- 超過 5 筆時使用從 08:00 開始、每 2 小時一個時段

### `_attach_generated_times(parsed_json)`
為行程中的每個地點補上 `time`。
支援兩種頂層格式：
- `{"days": [...]}`
- `{"data": [...]}`

每一天會讀取 `location` 陣列，依順序寫入 `time`。

## 對外方法

<!-- ### `get_travel_recommendation(location, days, transportation, preferences)`
生成「簡要版」旅遊建議。

輸入：
- `location`: 目的地
- `days`: 天數
- `transportation`: 主要交通方式
- `preferences`: 活動偏好

模型要求輸出 JSON 結構：
- `recommendation_summary`
- `highlights[]`
- `daily_outline[]`

成功回傳：
- `success: True`
- `data.raw_output`
- `data.parsed`
- `data.token_usage`

失敗回傳：
- `success: False`
- `error` -->

### `generate_itinerary(location, days, budget, traveler_type, interests, start_date=None)`
生成「結構化簡版行程」。

輸入：
- `location`
- `days`
- `budget`
- `traveler_type`
- `interests`（list）
- `start_date`（可選）

模型目標結構（精簡）：
- `data[]`
  - `day`
  - `weekday`
  - `location[]`
    - `location_name`

後處理：
- 系統會呼叫 `_attach_generated_times()` 補 `time`。

成功回傳：
- `success: True`
- `data.parsed`
- `data.token_usage`

### `generate_itinerary_detail(location, days, budget, traveler_type, interests, start_date=None, existing_itinerary=None)`
生成或修改「詳細行程」，可根據既有行程優化。

重要行為：
- 若有 `existing_itinerary`，先正規化成模型容易理解的 `days/location` 結構。
- 若沒有 `existing_itinerary`，會用模組載入時的 `test_data`。
- 規則要求模型輸出 `place_name/description/type/cost`。
- 後處理補上 `time`。

成功回傳：
- `success: True`
- `data.parsed`
- `data.token_usage`

失敗回傳：
- `success: False`
- `error`

### `refine_itinerary(itinerary, feedback)`
依使用者回饋微調既有行程。

輸入：
- `itinerary`: 原始行程 JSON
- `feedback`: 使用者反饋

要求模型維持原結構回傳，並解析後回傳：
- `data.raw_output`
- `data.parsed`
- `data.token_usage`

<!-- ### `get_travel_tips(location, travel_time=None)`
生成目的地旅遊提示。

輸出 JSON 欄位：
- `best_time_to_visit`
- `entry_requirements`
- `currency_info`
- `cultural_etiquette[]`
- `transportation_guide`
- `must_visit_spots[]` -->

## 回傳格式慣例
所有公開方法大致遵守：
- 成功：
  - `{"success": True, "data": {...}}`
- 失敗：
  - `{"success": False, "error": "..."}`

## 錯誤處理
- 主要由各方法 `try/except` 包裹。
- 常見失敗來源：
  - API Key 無效或未設定
  - 模型回傳不是合法 JSON（`json.loads` 失敗）
  - `test.json` 檔案不存在或格式錯誤

## 注意事項
- `test.json` 在 import 階段就會讀取，部署時需確保檔案存在。
- 方法內 Prompt 使用繁體中文規則，前端依賴輸出結構欄位名。
- `time` 欄位由程式補齊，不依賴模型輸出。
- 若要擴充 token 統計，可在 `_extract_token_usage()` 增加欄位（例如 input/output token）。
