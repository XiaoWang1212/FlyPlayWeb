/**
 * setup.js 
 * 負責處理出發地選擇和目的地顯示
 */

/**
 * 導向目的地選擇頁面
 * 使用動態路徑處理，確保在不同環境都能正確跳轉
 */
function goToDestinationPage() {
    // 取得當前頁面的基礎路徑（去掉檔名部分）
    const basePath = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
    // 導向目的地選擇頁面
    window.location.href = basePath + 'choose_destination.html';
}

/**
 * 頁面載入時的初始化函數
 * 1. 監聽出發地下拉選單的變更事件
 * 2. 從 localStorage 讀取已選擇的目的地並顯示
 */
window.onload = function() {
    // === 出發地處理 ===
    // 取得出發地下拉選單元素
    const departureSelect = document.getElementById('departure');
    if (departureSelect) { 
        // 監聽下拉選單變更事件
        departureSelect.addEventListener('change', function() {
            // 記錄選擇的出發地資訊（用於除錯）
            console.log('選擇的出發地:', this.value, this.options[this.selectedIndex].text);
        });
    }

    // === 目的地顯示處理 ===
    // 從 localStorage 讀取已選擇的目的地陣列
    const savedDestinations = localStorage.getItem('selectedDestinations');
    // 取得顯示目的地的元素
    const destinationElement = document.getElementById('selected-destination');
    
    // 如果有儲存的目的地且元素存在
    if (savedDestinations && destinationElement) {
        // 解析 JSON 字串為陣列
        const destinations = JSON.parse(savedDestinations);
        
        // 如果有選擇至少一個目的地
        if (destinations.length > 0) {
            // 提取所有城市名稱並用逗號分隔
            const cityNames = destinations.map(dest => dest.city).join(', ');
            // 更新顯示文字
            destinationElement.textContent = cityNames;
        }
    }
};