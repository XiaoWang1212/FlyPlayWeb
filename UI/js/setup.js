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
  const basePath = window.location.href.substring(
    0,
    window.location.href.lastIndexOf("/") + 1,
  );
  navigateWithTransition(basePath + "choose_destination.html");
}

// 跳轉到出發地選擇頁面
function goToDeparturePage() {
  const basePath = window.location.href.substring(
    0,
    window.location.href.lastIndexOf("/") + 1,
  );
  navigateWithTransition(basePath + "choose_departure.html");
}

function goBack() {
  goBackWithTransition();
}

// 那個像 iOS 的滾輪天數選取器
function toggleDaysPicker() {
  const pickerGroup = document.getElementById("days-picker-group");
  const pickerScroll = document.getElementById("days-picker-scroll");

  // 如果目前是關閉的，先關閉其他所有的，再打開這個
  const wasActive = pickerGroup.classList.contains("active");

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

  pickerGroup.classList.toggle("active");

  if (pickerGroup.classList.contains("active")) {
    // 打開時：把目前顯示的值設為 active，然後滾過去
    const selectedValue = document.getElementById("selected-days").textContent;
    const targetItem =
      Array.from(pickerScroll.children).find(
        (i) => i.textContent === selectedValue,
      ) || pickerScroll.children[0];

    Array.from(pickerScroll.children).forEach((i) =>
      i.classList.remove("active"),
    );
    if (targetItem) {
      targetItem.classList.add("active");
      // 等展開動畫結束再滾（不然會卡在中間）
      setTimeout(() => {
        targetItem.scrollIntoView({ block: "center", behavior: "instant" });
        updatePickerHighlight(pickerScroll);
      }, 350);
    }

    pickerScroll.addEventListener("scroll", handlePickerScroll);
  } else {
    pickerScroll.removeEventListener("scroll", handlePickerScroll);

    // 關閉選擇器時，檢查是否該顯示 AI 按鈕
    showAIRecommendButton();
  }
}

// 生成天數選項（1-15 天）
function generateDaysOptions(container) {
  container.innerHTML = "";

  const anyDayItem = document.createElement("div");
  anyDayItem.className = "picker-item";
  anyDayItem.textContent = "任何天數";
  anyDayItem.dataset.value = "0";
  container.appendChild(anyDayItem);

  for (let i = 1; i <= 15; i++) {
    const item = document.createElement("div");
    item.className = "picker-item";
    item.textContent = `${i}`;
    item.dataset.value = String(i);
    container.appendChild(item);
  }
}

// 綁定點擊事件
function bindDaysPickerClick(pickerScroll) {
  if (pickerScroll.dataset.clickBound === "1") return;
  pickerScroll.dataset.clickBound = "1";

  pickerScroll.addEventListener("click", (e) => {
    const item = e.target.closest(".picker-item");
    if (!item) return;

    pickerScroll
      .querySelectorAll(".picker-item")
      .forEach((i) => i.classList.remove("active"));
    item.classList.add("active");

    // 點了之後滑到中間
    item.scrollIntoView({ block: "center", behavior: "smooth" });

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
  const items = pickerScroll.querySelectorAll(".picker-item");
  const containerRect = pickerScroll.getBoundingClientRect();
  const centerY = containerRect.top + containerRect.height / 2;

  let closestItem = null;
  let minDistance = Infinity;

  items.forEach((item) => {
    item.classList.remove("active");

    const itemRect = item.getBoundingClientRect();
    const itemCenterY = itemRect.top + itemRect.height / 2;
    const distance = Math.abs(itemCenterY - centerY);

    if (distance < minDistance) {
      minDistance = distance;
      closestItem = item;
    }
  });

  if (closestItem) closestItem.classList.add("active");
}

// 把 active 的天數存到 localStorage
function updateSelectedDay(pickerScroll) {
  const activeItem = pickerScroll.querySelector(".picker-item.active");
  if (activeItem) {
    const label = activeItem.textContent;
    const value = Number(activeItem.dataset.value ?? 0);
    document.getElementById("selected-days").textContent = label;

    saveTripSetup({
      daysValue: value,
      daysLabel: label,
    });
  }
}

// 頁面初始化：讀取之前存過的選擇紀錄
window.onload = function () {
  // 讀取從「目的地頁面」存過來的景點陣列
  const saved = localStorage.getItem("selectedDestinations");
  if (saved) {
    const selectedDestinations = JSON.parse(saved);
    const destinationText = document.getElementById("selected-destination");

    if (selectedDestinations.length > 0) {
      const cities = selectedDestinations.map((dest) => dest.city).join("、");
      destinationText.textContent = cities;
    }
  }

  // 回填之前選過的出發地、天數、旅伴等資料
  const tripSetup = loadTripSetup();

  // 回填出發地（從 choose_departure 存來的）
  if (tripSetup.departureLabel) {
    document.getElementById("selected-departure").textContent =
      tripSetup.departureLabel;
  }

  // 回填天數
  if (tripSetup.daysLabel) {
    document.getElementById("selected-days").textContent = tripSetup.daysLabel;
  }

  // 回填旅伴
  if (tripSetup.companionLabel) {
    document.getElementById("selected-companion").textContent =
      tripSetup.companionLabel;
  }

  // 回填旅遊類型
  if (tripSetup.travelTypeLabel) {
    document.getElementById("selected-travel-type").textContent =
      tripSetup.travelTypeLabel;
  }

  // 回填預算
  if (tripSetup.budgetLabel) {
    document.getElementById("selected-budget").textContent =
      tripSetup.budgetLabel;
  }

  initBudgetPicker();
  updateAIRecommendButtonState();
};

// ========== 旅伴卡片 picker ==========

const companionOptions = [
  { value: "", label: "任何旅伴" },
  { value: "solo", label: "個人" },
  { value: "couple", label: "約會" },
  { value: "family", label: "家庭" },
  { value: "friends", label: "朋友" },
];

function toggleCompanionPicker() {
  const pickerGroup = document.getElementById("companion-picker-group");
  const cardsContainer = document.getElementById("companion-cards");

  const wasActive = pickerGroup.classList.contains("active");

  if (!wasActive) {
    closeAllPickers();
    hideAIRecommendButton();
  }

  if (cardsContainer.children.length === 0) {
    generateCompanionCards(cardsContainer);
  }

  pickerGroup.classList.toggle("active");

  if (!pickerGroup.classList.contains("active")) {
    showAIRecommendButton();
  }
}

function generateCompanionCards(container) {
  container.innerHTML = "";
  companionOptions.forEach((opt) => {
    const card = document.createElement("div");
    card.className = "picker-card";
    card.innerHTML = `
            <div class="picker-card-label">${opt.label}</div>
        `;
    card.dataset.value = opt.value;
    card.dataset.label = opt.label;

    card.addEventListener("click", () => {
      container
        .querySelectorAll(".picker-card")
        .forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");

      document.getElementById("selected-companion").textContent = opt.label;

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
    const selectedCard = container.querySelector(
      `[data-value="${tripSetup.companion}"]`,
    );
    if (selectedCard) selectedCard.classList.add("selected");
  }
}

// ========== 旅遊類型 picker ==========

const travelTypeOptions = [
  { value: "", label: "任何類型" },
  { value: "food", label: "美食" },
  { value: "nature", label: "自然" },
  { value: "culture", label: "文化" },
  { value: "shopping", label: "購物" },
  { value: "relax", label: "放鬆" },
];

function toggleTravelTypePicker() {
  const pickerGroup = document.getElementById("travel-type-picker-group");
  const cardsContainer = document.getElementById("travel-type-cards");

  const wasActive = pickerGroup.classList.contains("active");

  if (!wasActive) {
    closeAllPickers();
    hideAIRecommendButton();
  }

  if (cardsContainer.children.length === 0) {
    generateTravelTypeCards(cardsContainer);
  }

  pickerGroup.classList.toggle("active");
}

function generateTravelTypeCards(container) {
  container.innerHTML = "";
  travelTypeOptions.forEach((opt) => {
    const card = document.createElement("div");
    card.className = "picker-card";
    card.innerHTML = `
            <div class="picker-card-label">${opt.label}</div>
        `;
    card.dataset.value = opt.value;
    card.dataset.label = opt.label;

    card.addEventListener("click", () => {
      container
        .querySelectorAll(".picker-card")
        .forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");

      document.getElementById("selected-travel-type").textContent = opt.label;

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
    const selectedCard = container.querySelector(
      `[data-value="${tripSetup.travelType}"]`,
    );
    if (selectedCard) selectedCard.classList.add("selected");
  }
}

const API_BASE = "http://127.0.0.1:5001";
const STORAGE_KEY_TRIP_SETUP = "tripSetup";

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
  const current = loadTripSetup() || {};
  const next = { ...current, ...patch };
  localStorage.setItem(STORAGE_KEY_TRIP_SETUP, JSON.stringify(next));
  updateAIRecommendButtonState();
  return next;
}

// 新增一個統一的關閉函數 要用在手風琴效果的
function closeAllPickers() {
  document.getElementById("days-picker-group")?.classList.remove("active");
  document.getElementById("companion-picker-group")?.classList.remove("active");
  document
    .getElementById("travel-type-picker-group")
    ?.classList.remove("active");
  document.getElementById("budget-picker-group")?.classList.remove("active");
}

// 顯示 AI 推薦按鈕
// 但要先確認必填欄位都有填
function showAIRecommendButton() {
  const tripSetup = loadTripSetup();

  // 檢查必填欄位：出發地、目的地
  const hasDeparture = tripSetup.departure && tripSetup.departure !== "";

  const destinationsRaw = localStorage.getItem("selectedDestinations");
  const destinations = destinationsRaw ? JSON.parse(destinationsRaw) : [];
  const hasDestination = destinations.length > 0;

  const btn = document.getElementById("ai-recommend-btn");
  const hint = document.getElementById("missing-field-hint");

  // 兩個必填欄位都有填才顯示按鈕
  if (hasDeparture && hasDestination) {
    if (btn) {
      // 只有在按鈕目前是隱藏狀態時，才關閉所有選擇器
      const wasHidden = !btn.classList.contains("show");
      if (wasHidden) {
        closeAllPickers();
      }
      btn.classList.add("show");
    }
    if (hint) {
      hint.classList.remove("show");
    }
  } else {
    // 有缺欄位：隱藏按鈕，顯示提醒
    if (btn) {
      btn.classList.remove("show");
    }

    if (hint) {
      // 根據缺少的欄位顯示不同提醒
      let message = "";
      if (!hasDeparture && !hasDestination) {
        message = "請選擇出發地和目的地";
      } else if (!hasDeparture) {
        message = "請選擇出發地";
      } else if (!hasDestination) {
        message = "請選擇目的地";
      }

      hint.textContent = message;
      hint.classList.add("show");
    }
  }
}

// 隱藏 AI 推薦按鈕（當使用者重新打開選擇器時）
function hideAIRecommendButton() {
  const btn = document.getElementById("ai-recommend-btn");
  if (btn) {
    btn.classList.remove("show");
  }

  // 同時隱藏提醒文字
  const hint = document.getElementById("missing-field-hint");
  if (hint) {
    hint.classList.remove("show");
  }
}

// ========== 預算 picker ==========
function toggleBudgetPicker() {
  const pickerGroup = document.getElementById("budget-picker-group");
  const wasActive = pickerGroup.classList.contains("active");

  if (!wasActive) {
    closeAllPickers();
    hideAIRecommendButton();
  }

  pickerGroup.classList.toggle("active");

  if (!pickerGroup.classList.contains("active")) {
    showAIRecommendButton();
  }
}

function initBudgetPicker() {
  const cards = document.querySelectorAll("#budget-cards .picker-card");
  const selectedText = document.getElementById("selected-budget");
  const tripSetup = loadTripSetup();

  // 回填
  const savedBudget = tripSetup.budgetLabel || "中等";
  if (selectedText) selectedText.textContent = savedBudget;
  cards.forEach((card) => {
    card.classList.toggle("selected", card.dataset.budget === savedBudget);
    card.classList.toggle("active", card.dataset.budget === savedBudget);
  });

  // 綁定
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      cards.forEach((c) => {
        c.classList.remove("selected");
        c.classList.remove("active");
      });
      card.classList.add("selected");
      card.classList.add("active");

      const budgetLabel = card.dataset.budget || "中等";
      if (selectedText) selectedText.textContent = budgetLabel;

      saveTripSetup({
        budget: budgetLabel,
        budgetLabel,
      });

      showAIRecommendButton();
    });
  });
}

// 頁面初始化
window.onload = function () {
  // 讀取從「目的地頁面」存過來的景點陣列
  const saved = localStorage.getItem("selectedDestinations");
  if (saved) {
    const selectedDestinations = JSON.parse(saved);
    const destinationText = document.getElementById("selected-destination");

    if (selectedDestinations.length > 0) {
      const cities = selectedDestinations.map((dest) => dest.city).join("、");
      destinationText.textContent = cities;
    }
  }

  // 回填之前選過的出發地、天數、旅伴等資料
  const tripSetup = loadTripSetup();

  // 回填出發地（從 choose_departure 存來的）
  if (tripSetup.departureLabel) {
    document.getElementById("selected-departure").textContent =
      tripSetup.departureLabel;
  }

  // 回填天數
  if (tripSetup.daysLabel) {
    document.getElementById("selected-days").textContent = tripSetup.daysLabel;
  }

  // 回填旅伴
  if (tripSetup.companionLabel) {
    document.getElementById("selected-companion").textContent =
      tripSetup.companionLabel;
  }

  // 回填旅遊類型
  if (tripSetup.travelTypeLabel) {
    document.getElementById("selected-travel-type").textContent =
      tripSetup.travelTypeLabel;
  }

  // 回填預算
  if (tripSetup.budgetLabel) {
    document.getElementById("selected-budget").textContent =
      tripSetup.budgetLabel;
  }

  // 重要：不要再使用不存在的 departureSelect.addEventListener(...)
  // 出發地請由 choose_departure 頁寫入 localStorage，這裡只做回填

  initBudgetPicker();
  updateAIRecommendButtonState();
};

function getGenerateBtn() {
  return (
    document.getElementById("ai-recommend-btn") ||
    document.querySelector(".ai-recommend-btn") ||
    document.querySelector('button[onclick*="submitAIRecommendation"]')
  );
}

function setGeneratingState(isLoading) {
  const btn = getGenerateBtn();
  if (!btn) return;

  if (!btn.dataset.originalText) {
    btn.dataset.originalText = btn.textContent.trim();
  }

  btn.disabled = isLoading;
  btn.classList.toggle("is-loading", isLoading);
  btn.setAttribute("aria-busy", isLoading ? "true" : "false");
  btn.textContent = isLoading ? "生成中…" : btn.dataset.originalText;
}

function buildItineraryPayload() {
  const tripSetup = loadTripSetup() || {};
  const destinations = JSON.parse(
    localStorage.getItem("selectedDestinations") || "[]",
  );

  const location = destinations?.[0]?.city || destinations?.[0]?.name || "";
  const days = Number(tripSetup.daysValue || 0);

  return {
    location,
    days,
    budget: tripSetup.budgetLabel || tripSetup.budget || "中等",
    travelerType: tripSetup.companionLabel || tripSetup.companion || "個人",
    interests: tripSetup.travelTypeLabel ? [tripSetup.travelTypeLabel] : [],
    startDate: tripSetup.startDate || null,
  };
}

async function submitAIRecommendation() {
  const btn = getGenerateBtn();
  if (btn?.disabled) return;

  const payload = buildItineraryPayload();
  if (!payload.location || !payload.days) {
    alert("請先完成目的地與天數");
    return;
  }

  setGeneratingState(true);
  try {
    const res = await fetch(`${API_BASE}/api/chat/itinerary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await res.json();

    if (!res.ok || result.code !== 200) {
      throw new Error(result.message || `HTTP ${res.status}`);
    }

    // 給地圖/行程使用
    localStorage.setItem(
      "ai_itinerary",
      JSON.stringify(result.data?.parsed || result.data),
    );

    // 完整回應（含 raw_output）給 index.html 顯示
    localStorage.setItem("last_itinerary_response", JSON.stringify(result));

    window.location.href = "index.html";
  } catch (err) {
    console.error("itinerary 生成失敗:", err);
    alert("AI 行程生成失敗，請稍後再試");
  } finally {
    setGeneratingState(false);
  }
}

function isSetupComplete() {
  const tripSetup = loadTripSetup() || {};
  const selectedDestinations = JSON.parse(
    localStorage.getItem("selectedDestinations") || "[]",
  );

  const hasBudget = !!(tripSetup.budget || tripSetup.budgetLabel || "中等");

  return (
    selectedDestinations.length > 0 &&
    !!tripSetup.departure &&
    Number(tripSetup.daysValue) > 0 &&
    !!tripSetup.companion &&
    !!tripSetup.travelType &&
    hasBudget
  );
}

function updateAIRecommendButtonState() {
  const btn = document.getElementById("ai-recommend-btn");
  if (!btn) return;

  const ready = isSetupComplete();

  // 你原本是用 show 控制可見，這裡一起處理
  btn.classList.add("show");
  btn.disabled = !ready;
  btn.classList.toggle("disabled", !ready);
  btn.classList.toggle("enabled", ready);
}

// 只保留一個 window.onload（或改 DOMContentLoaded）
window.onload = function () {
  // 讀取從「目的地頁面」存過來的景點陣列
  const saved = localStorage.getItem("selectedDestinations");
  if (saved) {
    const selectedDestinations = JSON.parse(saved);
    const destinationText = document.getElementById("selected-destination");

    if (selectedDestinations.length > 0) {
      const cities = selectedDestinations.map((dest) => dest.city).join("、");
      destinationText.textContent = cities;
    }
  }

  // 回填之前選過的出發地、天數、旅伴等資料
  const tripSetup = loadTripSetup();

  // 回填出發地（從 choose_departure 存來的）
  if (tripSetup.departureLabel) {
    document.getElementById("selected-departure").textContent =
      tripSetup.departureLabel;
  }

  // 回填天數
  if (tripSetup.daysLabel) {
    document.getElementById("selected-days").textContent = tripSetup.daysLabel;
  }

  // 回填旅伴
  if (tripSetup.companionLabel) {
    document.getElementById("selected-companion").textContent =
      tripSetup.companionLabel;
  }

  // 回填旅遊類型
  if (tripSetup.travelTypeLabel) {
    document.getElementById("selected-travel-type").textContent =
      tripSetup.travelTypeLabel;
  }

  // 回填預算
  if (tripSetup.budgetLabel) {
    document.getElementById("selected-budget").textContent =
      tripSetup.budgetLabel;
  }

  // 重要：不要再使用不存在的 departureSelect.addEventListener(...)
  // 出發地請由 choose_departure 頁寫入 localStorage，這裡只做回填

  initBudgetPicker();
  updateAIRecommendButtonState();
};

// 確保預算預設值會被存進 localStorage（不點也算已選）
const tripSetup = loadTripSetup();
if (!tripSetup.budget && !tripSetup.budgetLabel) {
  saveTripSetup({ budget: "中等", budgetLabel: "中等" });
}
