# 在 Docker 內執行資料庫初始化（init_db）

## 資料庫table初始化

### 啟動 container

```bash
docker compose up -d
```

### 執行初始化

```bash
docker compose exec backend python /app/init_db.py
```

## 前端 API 接入指南

### 1) Auth 登入註冊

- POST `/api/auth/login`
  - 請求 Body (JSON):

    ```json
    {
      "email": "test@gmail.com",
      "password": "password123"
    }
    ```

  - 成功回應:

    ```json
    {
      "code": 200,
      "message": "登入成功",
      "data": { "user_id": 1, "email": "test@gmail.com", "name": "測試用戶" }
    }
    ```

- POST `/api/auth/register`
  - 請求 Body (JSON):

    ```json
    {
      "email": "newuser@gmail.com",
      "password": "password123",
      "name": "新使用者"
    }
    ```

### 2) Travel 專案 + 行程 API

- POST `/api/travel/project`
  - Body (JSON):

    ```json
    {
      "user_id": 1,
      "title": "東京五日遊"
    }
    ```

- GET `/api/travel/projects?user_id=1`
  - 回傳使用者專案列表

- POST `/api/travel/itinerary`
  - Body (JSON):

    ```json
    {
      "project_id": 1,
      "days": 3,
      "destination": "東京",
      "type": "情侶",
      "money": 15000,
      "data_json": {}
    }
    ```

- GET `/api/travel/itinerary/<itinerary_id>`
  - 取行程詳情

- GET `/api/travel/itineraries/<project_id>`
  - 取專案所有行程

- PUT `/api/travel/itinerary/<itinerary_id>`
  - Body (JSON): 可更新欄位 `days`, `destination`, `type`, `money`, `data_json`

- DELETE `/api/travel/itinerary/<itinerary_id>`

- DELETE `/api/travel/project/<project_id>`

### 3) Chat / AI 相關（已存在）

- POST `/api/chat/message`（對話）
- POST `/api/chat/recommendation`（簡要旅遊推薦）
- POST `/api/chat/itinerary`（AI 生成行程）
- POST `/api/chat/refine`（優化行程）
- POST `/api/chat/tips`（旅遊提示）
- POST `/api/chat/clear-history`（清除會話歷史）

### 4) 範例 curl 測試

```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@gmail.com","password":"password123"}'

curl -X GET "http://localhost:5001/api/travel/projects?user_id=1"

curl -X POST http://localhost:5001/api/travel/project \
  -H "Content-Type: application/json" \
  -d '{"user_id":1, "title":"環球行程"}'
```
