// UI/js/page_transition.js

document.addEventListener('DOMContentLoaded', function() {
    const navigationType = sessionStorage.getItem('navigationType');
    
    if (navigationType) {
        const isBack = navigationType === 'back';
        
        // 1. 【關鍵】先暫時關閉動畫，避免瞬間移動的過程被看到
        document.body.style.transition = 'none';
        document.body.style.position = 'fixed'; // 鎖定位置防止跑版
        document.body.style.width = '100%';
        document.body.style.height = '100%';
        
        // 2. 設定初始位置 (純滑動，不要 opacity)
        if (isBack) {
            // 返回：新頁面從「左邊」外面準備進場
            document.body.style.transform = 'translate3d(-100%, 0, 0)';
        } else {
            // 前進：新頁面從「右邊」外面準備進場
            document.body.style.transform = 'translate3d(100%, 0, 0)';
        }
        
        // 3. 【強制重繪】讀取寬度，強迫瀏覽器立刻渲染上面的初始位置
        // 這一行非常重要，沒有它動畫會失效！
        void document.body.offsetWidth;
        
        // 4. 開啟動畫並滑入中間
        // 使用 ease-out 讓結尾減速，感覺更像原生 App
        document.body.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
        document.body.style.transform = 'translate3d(0, 0, 0)';
        
        // 5. 動畫結束後清理 style，恢復原本的滾動行為
        setTimeout(() => {
            document.body.style.transition = '';
            document.body.style.transform = '';
            document.body.style.position = '';
            document.body.style.width = '';
            document.body.style.height = '';
            sessionStorage.removeItem('navigationType');
        }, 400); // 時間要跟上面的 0.4s 匹配
    }
});

// 前進：直接跳轉，不做離場動畫（避免露出空白底）
function navigateWithTransition(url) {
    sessionStorage.setItem('navigationType', 'forward');
    window.location.href = url;
}

// 返回：直接跳轉，不做離場動畫
function goBackWithTransition(url) {
    sessionStorage.setItem('navigationType', 'back');
    // 如果沒傳 url 預設回首頁
    window.location.href = url || 'index.html';
}