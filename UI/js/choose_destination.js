/**
 * choose_destination.js - 目的地選擇頁面
 * 負責處理目的地的搜尋、篩選、複選和確認功能
 */

// ==================== 資料定義 ====================

/**
 * 目的地資料陣列
 * 要用 Google Maps Places API 或其他地圖 API嗎
 */
const destinations = [
    // 台灣地區
    { city: '台北', country: '台灣', region: 'taiwan' },
    { city: '新北', country: '台灣', region: 'taiwan' },
    { city: '桃園', country: '台灣', region: 'taiwan' },
    { city: '台中', country: '台灣', region: 'taiwan' },
    { city: '台南', country: '台灣', region: 'taiwan' },
    { city: '高雄', country: '台灣', region: 'taiwan' },
    { city: '花蓮', country: '台灣', region: 'taiwan' },
    { city: '台東', country: '台灣', region: 'taiwan' },
    { city: '墾丁', country: '台灣', region: 'taiwan' },
    { city: '日月潭', country: '台灣', region: 'taiwan' },
    
    // 日本地區
    { city: '東京', country: '日本', region: 'asia' },
    { city: '大阪', country: '日本', region: 'asia' },
    { city: '京都', country: '日本', region: 'asia' },
    { city: '北海道', country: '日本', region: 'asia' },
    { city: '沖繩', country: '日本', region: 'asia' },
    { city: '福岡', country: '日本', region: 'asia' },
    { city: '名古屋', country: '日本', region: 'asia' },
    
    // 韓國地區
    { city: '首爾', country: '韓國', region: 'asia' },
    { city: '釜山', country: '韓國', region: 'asia' },
    { city: '濟州島', country: '韓國', region: 'asia' },
    
    // 東南亞地區
    { city: '曼谷', country: '泰國', region: 'asia' },
    { city: '清邁', country: '泰國', region: 'asia' },
    { city: '普吉島', country: '泰國', region: 'asia' },
    { city: '新加坡', country: '新加坡', region: 'asia' },
    { city: '吉隆坡', country: '馬來西亞', region: 'asia' },
    { city: '峇里島', country: '印尼', region: 'asia' },
    { city: '河內', country: '越南', region: 'asia' },
    { city: '胡志明市', country: '越南', region: 'asia' },
    { city: '馬尼拉', country: '菲律賓', region: 'asia' },
    
    // 其他亞洲地區
    { city: '香港', country: '香港', region: 'asia' },
    { city: '澳門', country: '澳門', region: 'asia' },
    { city: '上海', country: '中國', region: 'asia' },
    { city: '北京', country: '中國', region: 'asia' },
    
    // 歐洲地區
    { city: '倫敦', country: '英國', region: 'europe' },
    { city: '巴黎', country: '法國', region: 'europe' },
    { city: '羅馬', country: '義大利', region: 'europe' },
    { city: '威尼斯', country: '義大利', region: 'europe' },
    { city: '佛羅倫斯', country: '義大利', region: 'europe' },
    { city: '巴塞隆納', country: '西班牙', region: 'europe' },
    { city: '馬德里', country: '西班牙', region: 'europe' },
    { city: '阿姆斯特丹', country: '荷蘭', region: 'europe' },
    { city: '柏林', country: '德國', region: 'europe' },
    { city: '慕尼黑', country: '德國', region: 'europe' },
    { city: '維也納', country: '奧地利', region: 'europe' },
    { city: '布拉格', country: '捷克', region: 'europe' },
    { city: '蘇黎世', country: '瑞士', region: 'europe' },
    
    // 北美洲地區
    { city: '紐約', country: '美國', region: 'america' },
    { city: '洛杉磯', country: '美國', region: 'america' },
    { city: '舊金山', country: '美國', region: 'america' },
    { city: '拉斯維加斯', country: '美國', region: 'america' },
    { city: '西雅圖', country: '美國', region: 'america' },
    { city: '邁阿密', country: '美國', region: 'america' },
    { city: '溫哥華', country: '加拿大', region: 'america' },
    { city: '多倫多', country: '加拿大', region: 'america' },
    
    // 大洋洲地區
    { city: '雪梨', country: '澳洲', region: 'oceania' },
    { city: '墨爾本', country: '澳洲', region: 'oceania' },
    { city: '黃金海岸', country: '澳洲', region: 'oceania' },
    { city: '奧克蘭', country: '紐西蘭', region: 'oceania' },
    
    // 非洲地區
    { city: '開普敦', country: '南非', region: 'africa' },
    { city: '杜拜', country: '阿聯酋', region: 'africa' },
];

// ==================== 全域變數 ====================

/**
 * 目前篩選的地區
 * 可能值：'all', 'taiwan', 'asia', 'europe', 'america', 'oceania', 'africa'
 */
let currentRegion = 'all';

/**
 * 已選擇的目的地陣列
 * 儲存使用者選擇的所有目的地物件
 */
let selectedDestinations = [];

// ==================== 初始化函數 ====================

/**
 * 在頁面載入時執行，載入已儲存的選擇並渲染畫面
 */
function init() {
    // 從 localStorage 讀取之前選擇的目的地
    const saved = localStorage.getItem('selectedDestinations');
    if (saved) {
        // 解析 JSON 並恢復選擇狀態
        selectedDestinations = JSON.parse(saved);
    }
    
    // 渲染所有目的地項目到畫面上
    renderDestinations();
    // 更新確認按鈕和已選擇區域的顯示
    updateConfirmButton();
}

// ==================== 渲染函數 ====================

/**
 * 渲染目的地列表
 * 根據 destinations 陣列動態生成所有目的地項目
 * 並根據 selectedDestinations 標記已選擇的項目
 */
function renderDestinations() {
    // 取得目的地列表容器
    const listContainer = document.getElementById('destination-list');
    // 清空現有內容
    listContainer.innerHTML = '';
    
    // 遍歷所有目的地資料
    destinations.forEach(dest => {
        // 建立目的地項目元素
        const item = document.createElement('div');
        item.className = 'destination-item';
        
        // 設定資料屬性，用於篩選和搜尋
        item.setAttribute('data-region', dest.region);
        item.setAttribute('data-search', `${dest.city}${dest.country}`.toLowerCase());
        
        // 檢查此目的地是否已被選中
        const isSelected = selectedDestinations.some(
            selected => selected.city === dest.city && selected.country === dest.country
        );
        // 如果已選中，加上 selected 樣式
        if (isSelected) {
            item.classList.add('selected');
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
        selected => selected.city === dest.city && selected.country === dest.country
    );
    
    if (index > -1) {
        // 已選擇 → 取消選擇
        selectedDestinations.splice(index, 1);
        itemElement.classList.remove('selected');
    } else {
        // 未選擇 → 加入選擇
        selectedDestinations.push(dest);
        itemElement.classList.add('selected');
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
        selected => selected.city === city && selected.country === country
    );
    
    if (index > -1) {
        // 從陣列中移除
        selectedDestinations.splice(index, 1);
        
        // 更新對應的 UI 項目，移除 selected 樣式
        const items = document.querySelectorAll('.destination-item');
        items.forEach(item => {
            const itemCity = item.querySelector('.city-name').textContent;
            const itemCountry = item.querySelector('.country-name').textContent;
            if (itemCity === city && itemCountry === country) {
                item.classList.remove('selected');
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
    const confirmBtn = document.getElementById('confirm-btn');
    const selectedList = document.getElementById('selected-list');
    
    // === 更新確認按鈕 ===
    if (confirmBtn) {
        if (selectedDestinations.length > 0) {
            // 有選擇：顯示數量並啟用按鈕
            confirmBtn.textContent = `確認選擇 (${selectedDestinations.length})`;
            confirmBtn.disabled = false;
        } else {
            // 無選擇：顯示提示並禁用按鈕
            confirmBtn.textContent = '請選擇目的地';
            confirmBtn.disabled = true;
        }
    }
    
    // === 更新已選擇列表 ===
    if (selectedList) {
        if (selectedDestinations.length > 0) {
            // 清空列表
            selectedList.innerHTML = '';
            
            // 為每個已選擇的目的地建立標籤
            selectedDestinations.forEach(dest => {
                const tag = document.createElement('span');
                tag.className = 'selected-tag';
                // 顯示城市名稱和移除按鈕
                tag.innerHTML = `${dest.city} <button class="remove-btn" onclick="removeDestination('${dest.city}', '${dest.country}')">×</button>`;
                selectedList.appendChild(tag);
            });
        } else {
            // 無選擇：顯示提示文字
            selectedList.innerHTML = '<span class="no-selection">尚未選擇</span>';
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
        alert('請至少選擇一個目的地');
        return;
    }
    
    // 將選擇儲存到 localStorage
    localStorage.setItem('selectedDestinations', JSON.stringify(selectedDestinations));
    
    // 計算返回路徑並跳轉
    const basePath = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
    window.location.href = basePath + 'setup.html';
}

// ==================== 篩選功能 ====================

/**
 * 根據地區篩選目的地
 * @param {string} region - 地區代碼 ('all', 'taiwan', 'asia', 等)
 */
function filterRegion(region) {
    // 更新目前篩選的地區
    currentRegion = region;
    
    // === 更新地區按鈕的 active 狀態 ===
    // 先移除所有按鈕的 active 樣式
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 找到對應的按鈕並設為 active
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => {
        // 根據按鈕文字判斷是否為目標按鈕
        if ((region === 'all' && btn.textContent === '全部') ||
            (region === 'taiwan' && btn.textContent === '台灣') ||
            (region === 'asia' && btn.textContent === '亞洲') ||
            (region === 'europe' && btn.textContent === '歐洲') ||
            (region === 'america' && btn.textContent === '北美洲') ||
            (region === 'oceania' && btn.textContent === '大洋洲') ||
            (region === 'africa' && btn.textContent === '非洲')) {
            btn.classList.add('active');
        }
    });
    
    // === 篩選目的地項目 ===
    const items = document.querySelectorAll('.destination-item');
    items.forEach(item => {
        // 取得項目的地區屬性
        const itemRegion = item.getAttribute('data-region');
        
        // 判斷是否顯示此項目
        if (region === 'all' || itemRegion === region) {
            // 符合篩選條件：顯示
            item.classList.remove('hidden');
        } else {
            // 不符合篩選條件：隱藏
            item.classList.add('hidden');
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
    const searchText = document.getElementById('search-input').value.toLowerCase();
    
    // 取得所有目的地項目
    const items = document.querySelectorAll('.destination-item');
    
    // 遍歷每個項目進行比對
    items.forEach(item => {
        // 取得項目的搜尋資料（城市+國家）
        const searchData = item.getAttribute('data-search');
        
        // 判斷是否包含搜尋文字
        if (searchData.includes(searchText)) {
            // 符合：顯示
            item.classList.remove('hidden');
        } else {
            // 不符合：隱藏
            item.classList.add('hidden');
        }
    });
}

// ==================== 頁面載入 ====================

/**
 * 綁定頁面載入事件
 * 當 DOM 完全載入後執行初始化
 */
window.onload = init;