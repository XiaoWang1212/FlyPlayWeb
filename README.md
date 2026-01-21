# 專案環境設置

## 一鍵啟動（推薦 Docker）

前提：需安裝 Docker Desktop

在專案根目錄執行：

```bash
docker compose up
```

- 第一次執行會自動 build 環境並啟動服務。
- 以後每次只要這一行即可。
- 若有原始碼或 Dockerfile 變動，建議加 `--build`：

```bash
docker compose up --build
```

### 常見問題

- 若遇到 port 衝突，請確認沒有其他 container 佔用 5000 port。
- 若要停止服務，按下 Ctrl+C 或執行：

```bash
docker compose down
```

---

## 方式二：uv 包管理（推薦 - 團隊協作）

**為什麼選擇 uv？** 它比 pip 快 10-100 倍，自動管理虛擬環境，確保團隊開發環境一致。

### 首次設置

1. 安裝 uv（如果尚未安裝）：

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

2. 進入 Backend 資料夾並初始化環境：

```bash
uv sync
```

這會根據 `pyproject.toml` 和 `uv.lock` 自動建立虛擬環境並安裝所有依賴。

### 日常使用

#### 啟動虛擬環境

- macOS/Linux：

```bash
source .venv/bin/activate
```

- Windows：

```bash
.venv\Scripts\activate
```

#### 運行專案

```bash
python Backend/app.py
```

### 什麼時候需要跑 uv sync？

#### 場景 1：隊友更新了套件（Git Pull 後）

```bash
# 發現 pyproject.toml 有變動？
uv sync
```

**一秒完成** ⚡ - 如果 `uv.lock` 版本一致，uv 會直接告訴你 `Already synced`。

#### 場景 2：剛換電腦或 Clone 新專案

```bash
git clone <repo>
cd Backend
uv sync
```

#### 場景 3：不小心刪掉虛擬環境

```bash
# .venv 被刪除或損壞？
uv sync
```

uv 會自動重建並補齊所有依賴。

### 新增套件

```bash
# 新增生產套件
uv add requests

# 新增開發套件
uv add --dev pytest

# 移除套件
uv remove requests
```

新增/移除後，`pyproject.toml` 和 `uv.lock` 會自動更新，**推送到 GitHub** 讓隊友同步。

### 為什麼 uv 這麼快？

---

## 方式三：Python venv 虛擬環境

1. 安裝 Python（建議 3.12）
2. 在 Backend 資料夾建立虛擬環境：

```bash
cd Backend
python -m venv venv
```

3. 啟動虛擬環境：

- Windows：

```bash
venv\Scripts\activate
```

- macOS/Linux：

```bash
source venv/bin/activate
```

4. 安裝依賴：

```bash
pip install -r requirements.txt
```

5. 啟動專案：

```bash
python app.py
```

---

## 方式四：conda 虛擬環境

1. 安裝 Anaconda 或 Miniconda
2. 建立並啟動 conda 環境：

```bash
conda create -n flyPlayWeb python=3.12
conda activate flyPlayWeb
```

3. 進入 Backend 資料夾，安裝依賴：

```bash
cd Backend
pip install -r requirements.txt
```

4. 啟動專案：

```bash
python app.py
```
