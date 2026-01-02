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

## 方式二：Python venv 虛擬環境

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

## 方式三：conda 虛擬環境

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
