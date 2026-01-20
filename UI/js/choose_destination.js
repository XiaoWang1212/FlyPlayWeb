/**
 * choose_destination.js - 目的地選擇頁面
 * 負責處理目的地的搜尋、篩選、複選和確認功能
 */

// ==================== 資料定義 ====================

/**
 * 目的地資料陣列
 */
const destinations = [
    // 日本地區（先亂放圖片）
    { city: "東京", country: "日本", region: "japan", image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=300&fit=crop" },
    { city: "大阪", country: "日本", region: "japan", image: "https://images.unsplash.com/photo-1589452271712-64b8a66c7b71?w=400&h=300&fit=crop" },
    { city: "京都", country: "日本", region: "japan", image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&h=300&fit=crop" },
    { city: "北海道", country: "日本", region: "japan", image: "https://images.unsplash.com/photo-1605099846030-8f67a715a33f?w=400&h=300&fit=crop" },
    { city: "沖繩", country: "日本", region: "japan", image: "https://images.unsplash.com/photo-1544991875-5dc1b05f607d?w=400&h=300&fit=crop" },
    { city: "福岡", country: "日本", region: "japan", image: "https://images.unsplash.com/photo-1578469550956-0e16b69c6a3d?w=400&h=300&fit=crop" },
    { city: "名古屋", country: "日本", region: "japan", image: "https://images.unsplash.com/photo-1584592740039-6f6c049a5b3f?w=400&h=300&fit=crop" },
    { city: "札幌", country: "日本", region: "japan", image: "https://images.unsplash.com/photo-1576675466550-2389afd2b2c4?w=400&h=300&fit=crop" },
    { city: "橫濱", country: "日本", region: "japan", image: "https://images.unsplash.com/photo-1566398618126-16c0fd32e4eb?w=400&h=300&fit=crop" },
    { city: "神戶", country: "日本", region: "japan", image: "https://images.unsplash.com/photo-1624353187199-33b00f9bcdc4?w=400&h=300&fit=crop" },
    { city: "奈良", country: "日本", region: "japan", image: "https://images.unsplash.com/photo-1590559899731-a382839e5549?w=400&h=300&fit=crop" },
    { city: "箱根", country: "日本", region: "japan", image: "https://images.unsplash.com/photo-1578300164804-6746f6ead5c5?w=400&h=300&fit=crop" },
    { city: "熊本", country: "日本", region: "japan", image: "https://images.unsplash.com/photo-1528164344705-47542687000d?w=400&h=300&fit=crop" },
    { city: "仙台", country: "日本", region: "japan", image: "https://images.unsplash.com/photo-1582139329536-e7284fece509?w=400&h=300&fit=crop" },
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
            `${dest.city}${dest.country}`.toLowerCase()
        );

        // 如果有圖片，設定背景圖
        if (dest.image) {
            item.style.backgroundImage = `url('${dest.image}')`;
            item.classList.add('has-image');
        }

        // 檢查此目的地是否已被選中
        const isSelected = selectedDestinations.some(
            (selected) =>
                selected.city === dest.city && selected.country === dest.country
        );
        // 如果已選中，加上 selected 樣式
        if (isSelected) {
            item.classList.add("selected");
        }

        // 設定項目的 HTML 內容
        item.innerHTML = `
            <div class="city-name">${dest.city}</div>
            <div class="country-name">${dest.country}</div>
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
            selected.city === dest.city && selected.country === dest.country
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
function removeDestination(city, country) {
    // 在已選擇陣列中尋找此目的地
    const index = selectedDestinations.findIndex(
        (selected) => selected.city === city && selected.country === country
    );

    if (index > -1) {
        // 從陣列中移除
        selectedDestinations.splice(index, 1);

        // 更新對應的 UI 項目，移除 selected 樣式
        const items = document.querySelectorAll(".destination-item");
        items.forEach((item) => {
            const itemCity = item.querySelector(".city-name").textContent;
            const itemCountry = item.querySelector(".country-name").textContent;
            if (itemCity === city && itemCountry === country) {
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
                tag.innerHTML = `${dest.city} <button class="remove-btn" onclick="removeDestination('${dest.city}', '${dest.country}')">×</button>`;
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

    // 計算返回路徑並跳轉
    const basePath = window.location.href.substring(
        0,
        window.location.href.lastIndexOf("/") + 1
    );
    window.location.href = basePath + "setup.html";
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

    // 找到對應的按鈕並設為 active
    document.querySelectorAll(".tab-btn").forEach((btn) => {
        // 根據按鈕文字判斷是否為目標按鈕
        if (
            (region === "all" && btn.textContent === "全部") ||
            (region === "japan" && btn.textContent === "日本")
        ) {
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

// 修改返回按鈕的行為（在 HTML 中）
function goBack() {
    // 恢復到初始狀態（不保存當前的選擇）
    selectedDestinations = [...initialSelectedDestinations];
    localStorage.setItem(
        "selectedDestinations",
        JSON.stringify(selectedDestinations)
    );
    history.back();
}
