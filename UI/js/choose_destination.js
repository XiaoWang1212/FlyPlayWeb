/**
 * choose_destination.js - 目的地選擇頁面
 * 負責處理目的地的搜尋、篩選、複選和確認功能
 */

// ==================== 資料定義 ====================

/**
 * 目的地資料陣列
 */
const destinations = [
    { city: "東京", region: "kanto", label: "關東", image: "https://images.unsplash.com/photo-1606044466411-207a9a49711f?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "大阪", region: "kinki", label: "近畿", image: "https://images.unsplash.com/photo-1680061337399-a175cebe51b1?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "京都", region: "kinki", label: "近畿", image: "https://images.unsplash.com/photo-1598157016767-34bd1c718528?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "北海道", region: "hokkaido", label: "北海道", image: "https://images.unsplash.com/photo-1545105511-839f4a45a030?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "沖繩", region: "kyushu", label: "九州", image: "https://images.unsplash.com/photo-1612476919598-a233d3692cc6?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "福岡", region: "kyushu", label: "九州", image: "https://images.unsplash.com/photo-1573045736319-913a18c8ee27?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "奈良", region: "kinki", label: "近畿", image: "https://images.unsplash.com/photo-1693380767492-00fb0bcc4ce6?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "神奈川", region: "kanto", label: "關東", image: "https://images.unsplash.com/photo-1587474064565-922e1178ec8f?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "千葉", region: "kanto", label: "關東", image: "https://images.unsplash.com/photo-1652963212851-bfc736ce2ff3?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "廣島", region: "chugoku", label: "中國", image: "https://images.unsplash.com/photo-1504109586057-7a2ae83d1338?q=80&w=3133&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "長崎", region: "kyushu", label: "九州", image: "https://images.unsplash.com/photo-1624517608619-6403e09ba80a?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "石川", region: "chubu", label: "中部", image: "https://images.unsplash.com/photo-1778225453431-d918eb1e964a?q=80&w=2338&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "山梨", region: "chubu", label: "中部", image: "https://images.unsplash.com/photo-1635215278333-639a0576fe3d?q=80&w=1973&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "兵庫", region: "kinki", label: "近畿", image: "https://images.unsplash.com/photo-1573416033034-e42e14b545d2?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "愛知", region: "chubu", label: "中部", image: "https://images.unsplash.com/photo-1661054782263-a9cc56a4e565?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "熊本", region: "kyushu", label: "九州", image: "https://images.unsplash.com/photo-1705695464723-56195396666b?q=80&w=2890&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "岐阜", region: "chubu", label: "中部", image: "https://images.unsplash.com/photo-1617284349156-26a70e5cece0?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "長野", region: "chubu", label: "中部", image: "https://images.unsplash.com/photo-1705573383653-b574d7100a56?q=80&w=2342&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "大分", region: "kyushu", label: "九州", image: "https://images.unsplash.com/photo-1624517607060-b0bfafdb19a9?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "三重", region: "kinki", label: "近畿", image: "https://images.unsplash.com/photo-1609333728948-8faa8fffdca1?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "靜岡", region: "chubu", label: "中部", image: "https://images.unsplash.com/photo-1578271887552-5ac3a72752bc?q=80&w=2338&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "宮城", region: "tohoku", label: "東北", image: "https://images.unsplash.com/photo-1774946480290-f9a968b62692?q=80&w=2338&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "埼玉", region: "kanto", label: "關東", image: "https://images.unsplash.com/photo-1659190570975-d8af5b024917?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "栃木", region: "kanto", label: "關東", image: "https://images.unsplash.com/photo-1614651857407-9b22acceb43a?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "岡山", region: "chugoku", label: "中國", image: "https://images.unsplash.com/photo-1562887059-f11cd4f5e989?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "香川", region: "shikoku", label: "四國", image: "https://images.unsplash.com/photo-1696329706614-2ac0f0076986?q=80&w=2338&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "鹿兒島", region: "kyushu", label: "九州", image: "https://images.unsplash.com/photo-1704686508379-8ee92cad45f6?q=80&w=2324&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "滋賀", region: "kinki", label: "近畿", image: "https://images.unsplash.com/photo-1592024343449-9476e446f038?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "新潟", region: "chubu", label: "中部", image: "https://images.unsplash.com/photo-1694116865986-32660110ee0d?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "愛媛", region: "shikoku", label: "四國", image: "https://images.unsplash.com/photo-1754685725795-77b5305e74bd?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "和歌山", region: "kinki", label: "近畿", image: "https://images.unsplash.com/photo-1614913501059-9fb836fe1769?q=80&w=2342&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "群馬", region: "kanto", label: "關東", image: "https://images.unsplash.com/photo-1764057145939-0d197221c00e?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "富山", region: "chubu", label: "中部", image: "https://images.unsplash.com/photo-1758540531176-be45aad3ab0e?q=80&w=3088&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "山口", region: "chugoku", label: "中國", image: "https://images.unsplash.com/photo-1609474294819-b18d936efbfa?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "宮崎", region: "kyushu", label: "九州", image: "https://images.unsplash.com/photo-1650861063389-8197786fb2df?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "青森", region: "tohoku", label: "東北", image: "https://images.unsplash.com/photo-1602159649231-08f18550512d?q=80&w=3131&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "福井", region: "chubu", label: "中部", image: "https://images.unsplash.com/photo-1627099177620-7755ca6705b8?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "佐賀", region: "kyushu", label: "九州", image: "https://images.unsplash.com/photo-1513863640767-1605e79998a1?q=80&w=2338&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "岩手", region: "tohoku", label: "東北", image: "https://images.unsplash.com/photo-1628927072757-f425cad8dace?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "秋田", region: "tohoku", label: "東北", image: "https://images.unsplash.com/photo-1707090061775-5217dcaad6f0?q=80&w=2336&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "山形", region: "tohoku", label: "東北", image: "https://images.unsplash.com/photo-1670736990625-ac75a09397cd?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "鳥取", region: "chugoku", label: "中國", image: "https://images.unsplash.com/photo-1693188074158-00e5edb3d0ac?q=80&w=3132&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "茨城", region: "kanto", label: "關東", image: "https://images.unsplash.com/photo-1682394578396-f911e730d913?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "島根", region: "chugoku", label: "中國", image: "https://images.unsplash.com/photo-1765692102119-06822b6b8235?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "高知", region: "shikoku", label: "四國", image: "https://images.unsplash.com/photo-1712829313451-b54bd4ed6b1a?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "福島", region: "tohoku", label: "東北", image: "https://images.unsplash.com/photo-1628926867153-b6bad577f000?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { city: "德島", region: "shikoku", label: "四國", image: "https://images.unsplash.com/photo-1776101419357-4a21565eb14d?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
];

// ==================== 全域變數 ====================

/**
 * 目前篩選的地區
 */
let currentRegion = "all";

/**
 * 已選擇的目的地陣列
 * 儲存使用者選擇的所有目的地物件
 */
let selectedDestinations = [];

// 新增全域變數
let initialSelectedDestinations = [];

// ==================== 初始化函數 ====================

/**
 * 在頁面載入時執行，載入已儲存的選擇並渲染畫面
 */
function init() {
    // 從 localStorage 讀取之前選擇的目的地
    const saved = localStorage.getItem("selectedDestinations");
    if (saved) {
        // 解析 JSON 並恢復選擇狀態
        selectedDestinations = JSON.parse(saved);
        // 備份初始狀態
        initialSelectedDestinations = JSON.parse(saved);
    }

    // 渲染所有目的地項目到畫面上
    renderDestinations();
    // 更新確認按鈕和已選擇區域的顯示
    updateConfirmButton();
    
    // 綁定滾動陰影效果
    setupScrollShadow();
}

// ==================== 渲染函數 ====================

/**
 * 渲染目的地列表
 * 根據 destinations 陣列動態生成所有目的地項目
 * 並根據 selectedDestinations 標記已選擇的項目
 */
function renderDestinations() {
    // 取得目的地列表容器
    const listContainer = document.getElementById("destination-list");
    // 清空現有內容
    listContainer.innerHTML = "";

    // 遍歷所有目的地資料
    destinations.forEach((dest) => {
        // 建立目的地項目元素
        const item = document.createElement("div");
        item.className = "destination-item";

        // 設定資料屬性，用於篩選和搜尋
        item.setAttribute("data-region", dest.region);
        item.setAttribute(
            "data-search",
            `${dest.city}${dest.label}`.toLowerCase()
        );

        // 如果有圖片，設定背景圖
        if (dest.image) {
            item.style.backgroundImage = `url('${dest.image}')`;
            item.classList.add('has-image');
        }

        // 檢查此目的地是否已被選中
        const isSelected = selectedDestinations.some(
            (selected) =>
                selected.city === dest.city && selected.region === dest.region
        );
        // 如果已選中，加上 selected 樣式
        if (isSelected) {
            item.classList.add("selected");
        }

        // 設定項目的 HTML 內容
        item.innerHTML = `
            <div class="city-name">${dest.city}</div>
            <div class="country-name">${dest.label}</div>
        `;

        // 綁定點擊事件
        item.onclick = () => toggleDestination(dest, item);

        // 加入到列表容器中
        listContainer.appendChild(item);
    });

    // 套用目前的地區篩選
    filterRegion(currentRegion);
}

// ==================== 選擇處理函數 ====================

/**
 * 切換目的地的選擇狀態
 * @param {Object} dest - 目的地物件 {city, country, region}
 * @param {HTMLElement} itemElement - 對應的 DOM 元素
 */
function toggleDestination(dest, itemElement) {
    // 在已選擇陣列中尋找此目的地
    const index = selectedDestinations.findIndex(
        (selected) =>
            selected.city === dest.city && selected.region === dest.region
    );

    if (index > -1) {
        // 已選擇 → 取消選擇
        selectedDestinations.splice(index, 1);
        itemElement.classList.remove("selected");
    } else {
        // 未選擇 → 加入選擇
        selectedDestinations.push(dest);
        itemElement.classList.add("selected");
    }

    // 更新確認按鈕和已選擇區域
    updateConfirmButton();
}

/**
 * 從已選擇列表中移除指定目的地
 * 由已選擇區域的 × 按鈕觸發
 * @param {string} city - 城市名稱
 * @param {string} country - 國家名稱
 */
function removeDestination(city, region) {
    // 在已選擇陣列中尋找此目的地
    const index = selectedDestinations.findIndex(
        (selected) => selected.city === city && selected.region === region
    );

    if (index > -1) {
        // 從陣列中移除
        selectedDestinations.splice(index, 1);

        // 更新對應的 UI 項目，移除 selected 樣式
        const items = document.querySelectorAll(".destination-item");
        items.forEach((item) => {
            if (item.getAttribute("data-region") === region &&
                item.querySelector(".city-name").textContent === city) {
                item.classList.remove("selected");
            }
        });

        // 更新確認按鈕和已選擇區域
        updateConfirmButton();
    }
}

// ==================== UI 更新函數 ====================

/**
 * 更新確認按鈕文字和已選擇區域顯示
 * 當選擇狀態改變時調用
 */
function updateConfirmButton() {
    // 取得確認按鈕和已選擇列表元素
    const confirmBtn = document.getElementById("confirm-btn");
    const selectedList = document.getElementById("selected-list");

    // === 更新確認按鈕 ===
    if (confirmBtn) {
        if (selectedDestinations.length > 0) {
            // 有選擇：顯示數量並啟用按鈕
            confirmBtn.textContent = `確認選擇 (${selectedDestinations.length})`;
            confirmBtn.disabled = false;
        } else {
            // 無選擇：顯示提示並禁用按鈕
            confirmBtn.textContent = "請選擇目的地";
            confirmBtn.disabled = true;
        }
    }

    // === 更新已選擇列表 ===
    if (selectedList) {
        if (selectedDestinations.length > 0) {
            // 清空列表
            selectedList.innerHTML = "";

            // 為每個已選擇的目的地建立標籤
            selectedDestinations.forEach((dest) => {
                const tag = document.createElement("span");
                tag.className = "selected-tag";
                // 顯示城市名稱和移除按鈕
                tag.innerHTML = `${dest.city} <button class="remove-btn" onclick="removeDestination('${dest.city}', '${dest.region}')">×</button>`;
                selectedList.appendChild(tag);
            });
        } else {
            // 無選擇：顯示提示文字
            selectedList.innerHTML =
                '<span class="no-selection">尚未選擇</span>';
        }
    }
}

// ==================== 確認選擇函數 ====================

/**
 * 確認選擇並返回主頁面
 * 將選擇結果儲存到 localStorage 並跳轉
 */
function confirmSelection() {
    // 驗證是否至少選擇一個目的地
    if (selectedDestinations.length === 0) {
        alert("請至少選擇一個目的地");
        return;
    }

    // 將選擇儲存到 localStorage
    localStorage.setItem(
        "selectedDestinations",
        JSON.stringify(selectedDestinations)
    );

    // 使用動畫返回 setup.html
    goBackWithTransition('setup.html');
}

// ==================== 篩選功能 ====================

/**
 * 根據地區篩選目的地
 * @param {string} region - 地區代碼 ('all', 'japan', 等)
 */
function filterRegion(region) {
    // 更新目前篩選的地區
    currentRegion = region;

    // === 更新地區按鈕的 active 狀態 ===
    // 先移除所有按鈕的 active 樣式
    document.querySelectorAll(".tab-btn").forEach((btn) => {
        btn.classList.remove("active");
    });

    // 找到對應的按鈕並設為 active（用 data-region 屬性比對）
    document.querySelectorAll(".tab-btn").forEach((btn) => {
        if (btn.getAttribute("data-region") === region) {
            btn.classList.add("active");
        }
    });

    // === 篩選目的地項目 ===
    const items = document.querySelectorAll(".destination-item");
    items.forEach((item) => {
        // 取得項目的地區屬性
        const itemRegion = item.getAttribute("data-region");

        // 判斷是否顯示此項目
        if (region === "all" || itemRegion === region) {
            // 符合篩選條件：顯示
            item.classList.remove("hidden");
        } else {
            // 不符合篩選條件：隱藏
            item.classList.add("hidden");
        }
    });
}

// ==================== 搜尋功能 ====================

/**
 * 根據搜尋文字篩選目的地
 * 在搜尋框輸入時即時觸發
 */
function searchDestination() {
    // 取得搜尋框的文字並轉為小寫
    const searchText = document
        .getElementById("search-input")
        .value.toLowerCase();

    // 取得所有目的地項目
    const items = document.querySelectorAll(".destination-item");

    // 遍歷每個項目進行比對
    items.forEach((item) => {
        // 取得項目的搜尋資料（城市+國家）
        const searchData = item.getAttribute("data-search");

        // 判斷是否包含搜尋文字
        if (searchData.includes(searchText)) {
            // 符合：顯示
            item.classList.remove("hidden");
        } else {
            // 不符合：隱藏
            item.classList.add("hidden");
        }
    });
}

// ==================== 滾動陰影效果 ====================

/**
 * 設定滾動區域的動態陰影效果
 * 根據滾動位置動態顯示/隱藏上下陰影
 */
function setupScrollShadow() {
    const listContainer = document.getElementById('destination-list');
    
    if (!listContainer) return;
    
    // 更新陰影狀態的函數
    function updateScrollShadow() {
        const scrollTop = listContainer.scrollTop;
        const scrollHeight = listContainer.scrollHeight;
        const clientHeight = listContainer.clientHeight;
        const scrollBottom = scrollHeight - scrollTop - clientHeight;
        
        // 判斷上方是否還有內容（容許 5px 的誤差）
        if (scrollTop > 5) {
            listContainer.classList.add('has-scroll-top');
        } else {
            listContainer.classList.remove('has-scroll-top');
        }
        
        // 判斷下方是否還有內容（容許 5px 的誤差）
        if (scrollBottom > 5) {
            listContainer.classList.add('has-scroll-bottom');
        } else {
            listContainer.classList.remove('has-scroll-bottom');
        }
    }
    
    // 綁定滾動事件
    listContainer.addEventListener('scroll', updateScrollShadow);
    
    // 初始化時也檢查一次（可能一開始就有內容可滾動）
    setTimeout(updateScrollShadow, 100);
}

// ==================== 頁面載入 ====================

/**
 * 綁定頁面載入事件
 * 當 DOM 完全載入後執行初始化
 */
window.onload = init;

