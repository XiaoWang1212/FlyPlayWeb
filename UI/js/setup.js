/**
 * setup.js
 * 把使用者的選擇先存到 localStorage。
 * 之後 AI 生成行程的入口會放在 AI 推薦 按鈕
 * 
 * {
 * departure: "taipei",     // 出發地
 * daysValue: 4,            // 遊玩天數
 * companion: "family",     // 旅伴類型
 * travelType: "relax",     // 旅遊偏好
 * destinations: [{...}]    // 從目的地頁面傳過來的陣列
 * }
 */

let scrollEndTimeout;

// 跳轉頁面
function goToDestinationPage() {
    const basePath = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
    navigateWithTransition(basePath + 'choose_destination.html');
}

// 跳轉到出發地選擇頁面
function goToDeparturePage() {
    const basePath = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
    navigateWithTransition(basePath + 'choose_departure.html');
}

function goBack() {
    goBackWithTransition();
}

// 那個像 iOS 的滾輪天數選取器
function toggleDaysPicker() {
    const pickerGroup = document.getElementById('days-picker-group');
    const pickerScroll = document.getElementById('days-picker-scroll');
    
    // 如果目前是關閉的，先關閉其他所有的，再打開這個
    const wasActive = pickerGroup.classList.contains('active');
    
    if (!wasActive) {
        closeAllPickers();
        // 要打開選擇器時，先把 AI 按鈕收起來
        hideAIRecommendButton();
    }

    // 首次打開時生成選項 + 綁定點擊
    if (pickerScroll.children.length === 0) {
        generateDaysOptions(pickerScroll);
        bindDaysPickerClick(pickerScroll);  
    }

    pickerGroup.classList.toggle('active');

    if (pickerGroup.classList.contains('active')) {
        // 打開時：把目前顯示的值設為 active，然後滾過去
        const selectedValue = document.getElementById('selected-days').textContent;
        const targetItem = Array.from(pickerScroll.children).find(i => i.textContent === selectedValue) || pickerScroll.children[0];

        Array.from(pickerScroll.children).forEach(i => i.classList.remove('active'));
        if (targetItem) {
            targetItem.classList.add('active');
            // 等展開動畫結束再滾（不然會卡在中間）
            setTimeout(() => {
                targetItem.scrollIntoView({ block: 'center', behavior: 'instant' });
                updatePickerHighlight(pickerScroll);
            }, 350);  
        }

        pickerScroll.addEventListener('scroll', handlePickerScroll);
    } else {
        pickerScroll.removeEventListener('scroll', handlePickerScroll);
        
        // 關閉選擇器時，檢查是否該顯示 AI 按鈕
        showAIRecommendButton();
    }
}

// 生成天數選項（1-7 天）
function generateDaysOptions(container) {
    container.innerHTML = '';

    const anyDayItem = document.createElement('div');
    anyDayItem.className = 'picker-item';
    anyDayItem.textContent = '任何天數';
    anyDayItem.dataset.value = '0';
    container.appendChild(anyDayItem);

    for (let i = 1; i <= 7; i++) {
        const item = document.createElement('div');
        item.className = 'picker-item';
        item.textContent = `${i}`;
        item.dataset.value = String(i);
        container.appendChild(item);
    }
}

// 綁定點擊事件
function bindDaysPickerClick(pickerScroll) {
    if (pickerScroll.dataset.clickBound === '1') return;
    pickerScroll.dataset.clickBound = '1';

    pickerScroll.addEventListener('click', (e) => {
        const item = e.target.closest('.picker-item');
        if (!item) return;

        pickerScroll.querySelectorAll('.picker-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        // 點了之後滑到中間
        item.scrollIntoView({ block: 'center', behavior: 'smooth' });

        updateSelectedDay(pickerScroll);
    });
}

// 偵測滾輪停在哪裡
function handlePickerScroll() {
    const pickerScroll = this;
    clearTimeout(scrollEndTimeout);
    scrollEndTimeout = setTimeout(() => {
        updatePickerHighlight(pickerScroll);
        updateSelectedDay(pickerScroll);
    }, 100);
}

// 找出滾輪中心點最近的選項，設為 active
function updatePickerHighlight(pickerScroll) {
    const items = pickerScroll.querySelectorAll('.picker-item');
    const containerRect = pickerScroll.getBoundingClientRect();
    const centerY = containerRect.top + containerRect.height / 2;

    let closestItem = null;
    let minDistance = Infinity;

    items.forEach(item => {
        item.classList.remove('active');

        const itemRect = item.getBoundingClientRect();
        const itemCenterY = itemRect.top + itemRect.height / 2;
        const distance = Math.abs(itemCenterY - centerY);

        if (distance < minDistance) {
            minDistance = distance;
            closestItem = item;
        }
    });

    if (closestItem) closestItem.classList.add('active');
}

// 把 active 的天數存到 localStorage
function updateSelectedDay(pickerScroll) {
    const activeItem = pickerScroll.querySelector('.picker-item.active');
    if (activeItem) {
        const label = activeItem.textContent;
        const value = Number(activeItem.dataset.value ?? 0);
        document.getElementById('selected-days').textContent = label;

        saveTripSetup({
            daysValue: value,
            daysLabel: label,
        });
        
    }
}

// 頁面初始化：讀取之前存過的選擇紀錄
window.onload = function() {
    // 讀取從「目的地頁面」存過來的景點陣列
    const saved = localStorage.getItem('selectedDestinations');
    if (saved) {
        const selectedDestinations = JSON.parse(saved);
        const destinationText = document.getElementById('selected-destination');

        if (selectedDestinations.length > 0) {
            const cities = selectedDestinations.map(dest => dest.city).join('、');
            destinationText.textContent = cities;
        }
    }

    // 回填之前選過的出發地、天數、旅伴等資料
    const tripSetup = loadTripSetup();

    // 回填出發地（從 choose_departure 存來的）
    if (tripSetup.departureLabel) {
        document.getElementById('selected-departure').textContent = tripSetup.departureLabel;
    }

    // 回填天數
    if (tripSetup.daysLabel) {
        document.getElementById('selected-days').textContent = tripSetup.daysLabel;
    }

    // 回填旅伴
    if (tripSetup.companionLabel) {
        document.getElementById('selected-companion').textContent = tripSetup.companionLabel;
    }

    // 回填旅遊類型
    if (tripSetup.travelTypeLabel) {
        document.getElementById('selected-travel-type').textContent = tripSetup.travelTypeLabel;
    }

    // 只要出發地有變動就自動存到 localStorage
    departureSelect.addEventListener('change', function() { 
        saveTripSetup({
            departure: this.value,
            departureLabel: this.options[this.selectedIndex]?.textContent ?? '',
        });
        
        // 出發地選完後，檢查是否該顯示 AI 推薦按鈕
        showAIRecommendButton();
    });
};


// ========== 旅伴卡片 picker ==========

const companionOptions = [
    { value: '', label: '任何旅伴' },
    { value: 'solo', label: '個人' },
    { value: 'couple', label: '約會' },
    { value: 'family', label: '家庭' },
    { value: 'friends', label: '朋友' },
];

function toggleCompanionPicker() {
    const pickerGroup = document.getElementById('companion-picker-group');
    const cardsContainer = document.getElementById('companion-cards');
    
    const wasActive = pickerGroup.classList.contains('active');
    
    if (!wasActive) {
        closeAllPickers();
        hideAIRecommendButton();
    }

    if (cardsContainer.children.length === 0) {
        generateCompanionCards(cardsContainer);
    }

    pickerGroup.classList.toggle('active');
    
    if (!pickerGroup.classList.contains('active')) {
        showAIRecommendButton();
    }
}

function generateCompanionCards(container) {
    container.innerHTML = '';
    companionOptions.forEach(opt => {
        const card = document.createElement('div');
        card.className = 'picker-card';
        card.innerHTML = `
            <div class="picker-card-label">${opt.label}</div>
        `;
        card.dataset.value = opt.value;
        card.dataset.label = opt.label;

        card.addEventListener('click', () => {
            container.querySelectorAll('.picker-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');

            document.getElementById('selected-companion').textContent = opt.label;

            saveTripSetup({
                companion: opt.value,
                companionLabel: opt.label,
            });

            showAIRecommendButton();
        });

        container.appendChild(card);
    });

    // 回填已選項目
    const tripSetup = loadTripSetup();
    if (tripSetup.companion) {
        const selectedCard = container.querySelector(`[data-value="${tripSetup.companion}"]`);
        if (selectedCard) selectedCard.classList.add('selected');
    }
}

// ========== 旅遊類型 picker ==========

const travelTypeOptions = [
    { value: '', label: '任何類型' },
    { value: 'food', label: '美食' },
    { value: 'nature', label: '自然' },
    { value: 'culture', label: '文化' },
    { value: 'shopping', label: '購物' },
    { value: 'relax', label: '放鬆' },
];

function toggleTravelTypePicker() {
    const pickerGroup = document.getElementById('travel-type-picker-group');
    const cardsContainer = document.getElementById('travel-type-cards');
    
    const wasActive = pickerGroup.classList.contains('active');
    
    if (!wasActive) {
        closeAllPickers();
        hideAIRecommendButton();
    }

    if (cardsContainer.children.length === 0) {
        generateTravelTypeCards(cardsContainer);
    }

    pickerGroup.classList.toggle('active');
}

function generateTravelTypeCards(container) {
    container.innerHTML = '';
    travelTypeOptions.forEach(opt => {
        const card = document.createElement('div');
        card.className = 'picker-card';
        card.innerHTML = `
            <div class="picker-card-label">${opt.label}</div>
        `;
        card.dataset.value = opt.value;
        card.dataset.label = opt.label;

        card.addEventListener('click', () => {
            container.querySelectorAll('.picker-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');

            document.getElementById('selected-travel-type').textContent = opt.label;

            saveTripSetup({
                travelType: opt.value,
                travelTypeLabel: opt.label,
            });

            showAIRecommendButton();
        });

        container.appendChild(card);
    });

    // 回填已選項目
    const tripSetup = loadTripSetup();
    if (tripSetup.travelType) {
        const selectedCard = container.querySelector(`[data-value="${tripSetup.travelType}"]`);
        if (selectedCard) selectedCard.classList.add('selected');
    }
}


const STORAGE_KEY_TRIP_SETUP = 'tripSetup';

// 拿目前存的所有設定（出發地、天數、旅伴等）
function loadTripSetup() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_TRIP_SETUP);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

// 存使用者的設定（出發地、天數、旅伴等）
function saveTripSetup(patch) {
    const current = loadTripSetup();
    const next = { ...current, ...patch };
    localStorage.setItem(STORAGE_KEY_TRIP_SETUP, JSON.stringify(next));
    return next;
}

// 新增一個統一的關閉函數 要用在手風琴效果的
function closeAllPickers() {
    document.getElementById('days-picker-group')?.classList.remove('active');
    document.getElementById('companion-picker-group')?.classList.remove('active');
    document.getElementById('travel-type-picker-group')?.classList.remove('active');
}

// 顯示 AI 推薦按鈕
// 但要先確認必填欄位都有填
function showAIRecommendButton() {
    const tripSetup = loadTripSetup();
    
    // 檢查必填欄位：出發地、目的地
    const hasDeparture = tripSetup.departure && tripSetup.departure !== '';
    
    const destinationsRaw = localStorage.getItem('selectedDestinations');
    const destinations = destinationsRaw ? JSON.parse(destinationsRaw) : [];
    const hasDestination = destinations.length > 0;
    
    const btn = document.getElementById('ai-recommend-btn');
    const hint = document.getElementById('missing-field-hint');
    
    // 兩個必填欄位都有填才顯示按鈕
    if (hasDeparture && hasDestination) {
        if (btn) {
            // 只有在按鈕目前是隱藏狀態時，才關閉所有選擇器
            const wasHidden = !btn.classList.contains('show');
            if (wasHidden) {
                closeAllPickers();
            }
            btn.classList.add('show');
        }
        if (hint) {
            hint.classList.remove('show');
        }
    } else {
        // 有缺欄位：隱藏按鈕，顯示提醒
        if (btn) {
            btn.classList.remove('show');
        }
        
        if (hint) {
            // 根據缺少的欄位顯示不同提醒
            let message = '';
            if (!hasDeparture && !hasDestination) {
                message = '請選擇出發地和目的地';
            } else if (!hasDeparture) {
                message = '請選擇出發地';
            } else if (!hasDestination) {
                message = '請選擇目的地';
            }
            
            hint.textContent = message;
            hint.classList.add('show');
        }
    }
}

// 隱藏 AI 推薦按鈕（當使用者重新打開選擇器時）
function hideAIRecommendButton() {
    const btn = document.getElementById('ai-recommend-btn');
    if (btn) {
        btn.classList.remove('show');
    }
    
    // 同時隱藏提醒文字
    const hint = document.getElementById('missing-field-hint');
    if (hint) {
        hint.classList.remove('show');
    }
}

// 按下「AI 推薦行程」後，確認資料格式並準備送到後端
function submitAIRecommendation() {
    const tripSetup = loadTripSetup();
    const destinationsRaw = localStorage.getItem('selectedDestinations');
    const destinations = destinationsRaw ? JSON.parse(destinationsRaw) : [];
    
    const fullData = {
        ...tripSetup,
        destinations: destinations
    };
    
    console.log('準備傳送給 AI 的資料:', fullData);
    
    const basePath = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
    navigateWithTransition(basePath + 'index.html');
}