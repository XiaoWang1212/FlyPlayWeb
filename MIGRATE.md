# FlyPlayWeb Docker 執行方式

## 1) 啟動服務

要先確定docker有打開：

```bash
docker compose up
```

## 2) 執行資料庫 migration

本專案已提供獨立 migration 腳本：`Backend/migrate.py`

請在根目錄執行：

```bash
docker compose exec backend python migrate.py
```

這支會處理：

- 新增 `interests`（JSONB，預設 `[]`）
- 新增 `start_date`（DATE）
- 移除 `travel_style`
- 新增 `is_pinned`（projects）
- 新增 `morning_departure`（itineraries）
- 新增 `data_latlng`（JSONB，itineraries）
- 新增 `detailed_itinerary`（JSONB，itineraries）
- 新增 `is_tutorial`（projects，用來識別教學專案，取代舊版 title 判斷）

> **注意**：`is_tutorial` 已自動將舊版 title=`__tutorial__` 的專案標記為 TRUE，無須手動處理。
