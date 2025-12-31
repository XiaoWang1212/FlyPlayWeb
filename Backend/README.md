# FlyPlayWeb Backend - MVC架構

## 📚 架構概述

本項目採用標準的 **MVC (Model-View-Controller)** 架構模式，清晰地分離了數據層、業務邏輯層和表現層。

```text
Backend/
├── models/                 # M - Model層 (數據模型)
│   ├── database.py        # 數據庫配置和會話管理
│   ├── user_model.py      # 用戶模型
│   ├── trip_model.py      # 旅行計劃模型
│   └── favorite_model.py  # 收藏模型
│
├── controllers/           # C - Controller層 (業務邏輯)
│   ├── chat_controller.py # AI對話控制器
│   └── map_controller.py  # 地圖控制器
│
├── views/                 # V - View層 (響應格式化)
│   └── response_formatter.py # 統一API響應格式化
│
├── services/              # Service層 (外部服務)
│   ├── chatgpt_service.py # OpenAI API服務
│   └── googlemap_service.py # Google Maps API服務
│
├── routes/                # Routes層 (路由定義)
│   ├── chat_routes.py     # 對話路由
│   └── map_routes.py      # 地圖路由
│
├── apis/                  # 舊版API（已棄用）
├── app.py                 # 應用入口
├── config.py              # 配置管理
└── requirements.txt       # 依賴列表
```
