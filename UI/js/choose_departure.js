/**
 * choose_departure.js - 出發地選擇頁面
 * 單選出發地，存到 tripSetup（localStorage）
 *
 * 資料欄位：
 *   city      機場中文名稱
 *   code      IATA 代碼
 *   region    日本地區（用於下拉樹狀分組與顯示）
 *   area      所在縣市/地點（顯示於清單副標題，幫助辨識較陌生的機場）
 *   keywords  搜尋關鍵字（空格分隔；含中英地點、英文機場名、別名等）
 *   direct    是否台灣直飛（顯示於下拉樹狀清單）
 *   card      是否顯示為常用卡片
 */
const departures = [
  // 關東
  { city: "成田國際機場", code: "NRT", region: "關東", area: "東京/千葉", keywords: "東京 千葉 TOKYO NARITA Narita International Airport", direct: true, card: true },
  { city: "羽田機場", code: "HND", region: "關東", area: "東京", keywords: "東京 TOKYO HANEDA Haneda Airport", direct: true, card: true },
  { city: "茨城機場", code: "IBR", region: "關東", area: "茨城", keywords: "茨城 IBARAKI Ibaraki Airport", direct: true },
  { city: "靜岡機場", code: "FSZ", region: "關東", area: "靜岡", keywords: "靜岡 SHIZUOKA Shizuoka Airport" },

  // 關西
  { city: "關西國際機場", code: "KIX", region: "關西", area: "大阪", keywords: "大阪 OSAKA KANSAI Kansai International Airport", direct: true, card: true },
  { city: "大阪國際機場", code: "ITM", region: "關西", area: "大阪/伊丹", keywords: "大阪 伊丹 OSAKA ITAMI Itami Airport" },

  // 中部
  { city: "中部國際機場", code: "NGO", region: "中部", area: "名古屋", keywords: "名古屋 NAGOYA CENTRAIR Chubu Centrair International Airport", direct: true, card: true },
  { city: "小松機場", code: "KMQ", region: "中部", area: "石川/小松", keywords: "石川 小松 KOMATSU Komatsu Airport", direct: true },
  { city: "新潟機場", code: "KIJ", region: "中部", area: "新潟", keywords: "新潟 NIIGATA Niigata Airport", direct: true },
  { city: "富山機場", code: "TOY", region: "中部", area: "富山", keywords: "富山 TOYAMA Toyama Airport" },
  { city: "能登機場", code: "NTQ", region: "中部", area: "石川/能登", keywords: "石川 能登 NOTO Noto Airport" },
  { city: "信州松本機場", code: "MMJ", region: "中部", area: "長野/松本", keywords: "長野 松本 MATSUMOTO Matsumoto Airport" },

  // 北海道
  { city: "新千歲機場", code: "CTS", region: "北海道", area: "札幌/千歲", keywords: "札幌 千歲 SAPPORO CHITOSE New Chitose Airport", direct: true, card: true },
  { city: "函館機場", code: "HKD", region: "北海道", area: "函館", keywords: "函館 HAKODATE Hakodate Airport", direct: true },
  { city: "旭川機場", code: "AKJ", region: "北海道", area: "旭川", keywords: "旭川 ASAHIKAWA Asahikawa Airport", direct: true },
  { city: "釧路機場", code: "KUH", region: "北海道", area: "釧路", keywords: "釧路 KUSHIRO Kushiro Airport" },
  { city: "帶廣機場", code: "OBO", region: "北海道", area: "十勝/帶廣", keywords: "帶廣 十勝 OBIHIRO TOKACHI Obihiro Airport" },
  { city: "女滿別機場", code: "MMB", region: "北海道", area: "網走/女滿別", keywords: "女滿別 網走 MEMANBETSU Memanbetsu Airport" },
  { city: "稚內機場", code: "WKJ", region: "北海道", area: "稚內", keywords: "稚內 WAKKANAI Wakkanai Airport" },

  // 東北
  { city: "仙台機場", code: "SDJ", region: "東北", area: "宮城/仙台", keywords: "仙台 宮城 SENDAI Sendai Airport", direct: true, card: true },
  { city: "秋田機場", code: "AXT", region: "東北", area: "秋田", keywords: "秋田 AKITA Akita Airport", direct: true },
  { city: "青森機場", code: "AOJ", region: "東北", area: "青森", keywords: "青森 AOMORI Aomori Airport", direct: true },
  { city: "花卷機場", code: "HNA", region: "東北", area: "岩手/花卷", keywords: "岩手 花卷 HANAMAKI Hanamaki Airport", direct: true },
  { city: "福島機場", code: "FKS", region: "東北", area: "福島", keywords: "福島 FUKUSHIMA Fukushima Airport", direct: true },
  { city: "三澤機場", code: "MSJ", region: "東北", area: "青森/三澤", keywords: "青森 三澤 MISAWA Misawa Airport" },
  { city: "山形機場", code: "GAJ", region: "東北", area: "山形", keywords: "山形 YAMAGATA Yamagata Airport" },
  { city: "庄內機場", code: "SYO", region: "東北", area: "山形/庄內", keywords: "山形 庄內 SHONAI Shonai Airport" },

  // 中國
  { city: "廣島機場", code: "HIJ", region: "中國", area: "廣島", keywords: "廣島 HIROSHIMA Hiroshima Airport", direct: true, card: true },
  { city: "岡山機場", code: "OKJ", region: "中國", area: "岡山", keywords: "岡山 OKAYAMA Okayama Airport", direct: true },
  { city: "米子機場", code: "YGJ", region: "中國", area: "鳥取/米子", keywords: "鳥取 米子 YONAGO Yonago Airport", direct: true },
  { city: "鳥取機場", code: "TTJ", region: "中國", area: "鳥取", keywords: "鳥取 TOTTORI Tottori Airport" },
  { city: "出雲機場", code: "IZO", region: "中國", area: "島根/出雲", keywords: "島根 出雲 IZUMO Izumo Airport" },
  { city: "山口宇部機場", code: "UBJ", region: "中國", area: "山口/宇部", keywords: "山口 宇部 UBE Yamaguchi Ube Airport" },
  { city: "岩國機場", code: "IWK", region: "中國", area: "山口/岩國", keywords: "山口 岩國 IWAKUNI Iwakuni Airport" },

  // 四國
  { city: "高松機場", code: "TAK", region: "四國", area: "香川/高松", keywords: "高松 香川 TAKAMATSU Takamatsu Airport", direct: true },
  { city: "松山機場", code: "MYJ", region: "四國", area: "愛媛/松山", keywords: "愛媛 松山 MATSUYAMA Matsuyama Airport", direct: true },
  { city: "高知機場", code: "KCZ", region: "四國", area: "高知", keywords: "高知 KOCHI Kochi Ryoma Airport", direct: true },
  { city: "德島機場", code: "TKS", region: "四國", area: "德島", keywords: "德島 TOKUSHIMA Tokushima Airport" },

  // 九州
  { city: "福岡機場", code: "FUK", region: "九州", area: "福岡", keywords: "福岡 FUKUOKA Fukuoka Airport", direct: true, card: true },
  { city: "熊本機場", code: "KMJ", region: "九州", area: "熊本", keywords: "熊本 KUMAMOTO Kumamoto Airport", direct: true },
  { city: "鹿兒島機場", code: "KOJ", region: "九州", area: "鹿兒島", keywords: "鹿兒島 KAGOSHIMA Kagoshima Airport", direct: true, card: true },
  { city: "宮崎機場", code: "KMI", region: "九州", area: "宮崎", keywords: "宮崎 MIYAZAKI Miyazaki Airport", direct: true },
  { city: "佐賀機場", code: "HSG", region: "九州", area: "佐賀", keywords: "佐賀 SAGA Saga Airport", direct: true },
  { city: "大分機場", code: "OIT", region: "九州", area: "大分", keywords: "大分 OITA Oita Airport", direct: true },
  { city: "北九州機場", code: "KKJ", region: "九州", area: "北九州", keywords: "北九州 KITAKYUSHU Kitakyushu Airport" },
  { city: "長崎機場", code: "NGS", region: "九州", area: "長崎", keywords: "長崎 NAGASAKI Nagasaki Airport" },

  // 沖繩
  { city: "那霸機場", code: "OKA", region: "沖繩", area: "那霸", keywords: "那霸 沖繩 NAHA OKINAWA Naha Airport", direct: true, card: true },
  { city: "新石垣機場", code: "ISG", region: "沖繩", area: "石垣島", keywords: "石垣 沖繩 ISHIGAKI New Ishigaki Airport", direct: true },
  { city: "宮古機場", code: "MMY", region: "沖繩", area: "宮古島", keywords: "宮古 沖繩 MIYAKO Miyako Airport" },
  { city: "下地島機場", code: "SHI", region: "沖繩", area: "宮古/下地島", keywords: "宮古 下地島 SHIMOJISHIMA Shimojishima Airport" },
];

// 地區排序（與下拉樹狀清單順序一致）
const REGION_ORDER = ["北海道", "東北", "關東", "中部", "關西", "中國", "四國", "九州", "沖繩"];

const STORAGE_KEY_TRIP_SETUP = "tripSetup";

const departureToRegionMap = {
  // 關東
  "成田國際機場": ["kanto"],
  "羽田機場": ["kanto"],
  "茨城機場": ["kanto"],
  "靜岡機場": ["kanto"],
  "千葉/東京": ["kanto"],
  
  // 關西
  "關西國際機場": ["kinki"],
  "大阪國際機場": ["kinki"],
  "大阪/伊丹": ["kinki"],
  
  // 中部
  "中部國際機場": ["chubu"],
  "小松機場": ["chubu"],
  "新潟機場": ["chubu"],
  "富山機場": ["chubu"],
  "能登機場": ["chubu"],
  "信州松本機場": ["chubu"],
  
  // 北海道
  "新千歲機場": ["hokkaido"],
  "函館機場": ["hokkaido"],
  "旭川機場": ["hokkaido"],
  "釧路機場": ["hokkaido"],
  "帶廣機場": ["hokkaido"],
  "女滿別機場": ["hokkaido"],
  "稚內機場": ["hokkaido"],
  
  // 東北
  "仙台機場": ["tohoku"],
  "秋田機場": ["tohoku"],
  "青森機場": ["tohoku"],
  "花卷機場": ["tohoku"],
  "福島機場": ["tohoku"],
  "三澤機場": ["tohoku"],
  "山形機場": ["tohoku"],
  "庄內機場": ["tohoku"],
  
  // 中國
  "廣島機場": ["chugoku"],
  "岡山機場": ["chugoku"],
  "米子機場": ["chugoku"],
  "鳥取機場": ["chugoku"],
  "出雲機場": ["chugoku"],
  "山口宇部機場": ["chugoku"],
  "岩國機場": ["chugoku"],
  
  // 四國
  "高松機場": ["shikoku"],
  "松山機場": ["shikoku"],
  "高知機場": ["shikoku"],
  "德島機場": ["shikoku"],
  
  // 九州
  "福岡機場": ["kyushu"],
  "熊本機場": ["kyushu"],
  "鹿兒島機場": ["kyushu"],
  "宮崎機場": ["kyushu"],
  "佐賀機場": ["kyushu"],
  "大分機場": ["kyushu"],
  "北九州機場": ["kyushu"],
  "長崎機場": ["kyushu"],
  九州: ["kyushu"],
  
  // 沖繩
  "那霸機場": ["okinawa"],
  "新石垣機場": ["okinawa"],
  "宮古機場": ["okinawa"],
  "下地島機場": ["okinawa"],
  
  // 複合區域
  "關東/中部": ["kanto", "chubu"],
  "中國/四國": ["chugoku", "shikoku"],
  "九州/離島": ["kyushu"],
};

function loadTripSetup() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRIP_SETUP);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveTripSetup(patch) {
  const current = loadTripSetup();
  const next = { ...current, ...patch };
  localStorage.setItem(STORAGE_KEY_TRIP_SETUP, JSON.stringify(next));
  return next;
}

let selectedDepartureCity = "";

function init() {
  const tripSetup = loadTripSetup();
  selectedDepartureCity = tripSetup.departureLabel || "";

  renderCards();
  renderDropdownTree();
  setupScrollShadow();
  setupSearchEvents();
  syncSelectionUI();
}

/* ============= 常用機場卡片 ============= */
function renderCards() {
  const listContainer = document.getElementById("departure-list");
  if (!listContainer) return;
  listContainer.innerHTML = "";

  departures.filter((d) => d.card).forEach((dep) => {
    const item = document.createElement("div");
    item.className = "departure-item";
    if (dep.city === selectedDepartureCity) item.classList.add("selected");

    const codeHtml = dep.code ? `<div class="airport-code">${dep.code}</div>` : "";
    const subtitleHtml = dep.area ? `<div class="country-name">${dep.area}</div>` : "";
    item.innerHTML = `${codeHtml}<div class="city-name">${dep.city}</div>${subtitleHtml}`;
    item.onclick = () => selectDeparture(dep.city);
    listContainer.appendChild(item);
  });
}

/* ============= 階層式下拉清單（顯示直飛機場） ============= */
function renderDropdownTree() {
  const panel = document.getElementById("dropdown-panel");
  if (!panel) return;
  panel.innerHTML = "";

  const grouped = {};
  departures.filter((d) => d.direct).forEach((d) => {
    (grouped[d.region] ||= []).push(d);
  });

  REGION_ORDER.forEach((region) => {
    const list = grouped[region];
    if (!list || !list.length) return;

    const group = document.createElement("div");
    group.className = "dd-group expanded";

    const header = document.createElement("div");
    header.className = "dd-region";
    header.innerHTML =
      `<img class="dd-caret" src="assets/icons/back-arrow.svg" alt="" aria-hidden="true">` +
      `<span>${region}地區</span>`;
    header.onclick = () => group.classList.toggle("expanded");
    group.appendChild(header);

    const items = document.createElement("div");
    items.className = "dd-items";
    list.forEach((dep) => items.appendChild(buildItemRow(dep)));
    group.appendChild(items);

    panel.appendChild(group);
  });

  const hint = document.createElement("div");
  hint.className = "dd-hint";
  hint.textContent = "沒看到想要的抵達機場？試試直接搜尋名稱、代碼或地點";
  panel.appendChild(hint);
}

/* ============= 搜尋結果（平面列表，跨全部機場） ============= */
function renderSearchResults(keyword) {
  const panel = document.getElementById("dropdown-panel");
  if (!panel) return;
  panel.innerHTML = "";

  const kw = keyword.trim().toLowerCase();
  if (!kw) {
    renderDropdownTree();
    return;
  }

  // 以空白拆成多個關鍵字，全部都要命中（順序不限）
  const tokens = kw.split(/\s+/).filter(Boolean);
  const matches = departures.filter((d) => {
    const hay = `${d.city} ${d.code} ${d.region} ${d.area || ""} ${d.keywords || ""}`.toLowerCase();
    return tokens.every((t) => hay.includes(t));
  });

  if (!matches.length) {
    const empty = document.createElement("div");
    empty.className = "dd-empty";
    empty.textContent = "找不到符合的機場";
    panel.appendChild(empty);
    return;
  }

  matches.forEach((dep) => panel.appendChild(buildItemRow(dep, true)));
}

/**
 * 建立一個下拉清單項目
 * @param {object} dep   機場資料
 * @param {boolean} flat 是否平面樣式（搜尋結果用，會顯示地區）
 */
function buildItemRow(dep, flat = false) {
  const row = document.createElement("div");
  row.className = "dd-item" + (flat ? " flat" : "");

  const codeText = dep.code ? ` (${dep.code})` : "";
  const subParts = [];
  if (flat) subParts.push(dep.region);
  if (dep.area) subParts.push(dep.area);
  const subHtml = subParts.length ? `<div class="dd-sub">${subParts.join(" · ")}</div>` : "";

  row.innerHTML = `<div class="dd-name">${dep.city}${codeText}</div>${subHtml}`;
  row.onclick = () => selectFromDropdown(dep.city);
  return row;
}

/* ============= 搜尋框事件 ============= */
function setupSearchEvents() {
  const input = document.getElementById("search-input");
  const panel = document.getElementById("dropdown-panel");
  const box = input?.closest(".search-box");
  if (!input || !panel || !box) return;

  const open = () => { panel.classList.add("open"); box.classList.add("open"); };
  const close = () => {
    panel.classList.remove("open");
    box.classList.remove("open");
    input.blur();
  };

  input.addEventListener("focus", open);
  input.addEventListener("input", () => {
    open();
    renderSearchResults(input.value);
  });

  // 點右側箭頭可切換開關
  const caret = box.querySelector(".search-caret");
  if (caret) {
    caret.addEventListener("click", (e) => {
      e.stopPropagation();
      if (box.classList.contains("open")) close();
      else { input.focus(); open(); }
    });
  }

  document.addEventListener("click", (e) => {
    if (!box.contains(e.target)) close();
  });
}

// 將目前選擇同步到卡片高亮、輸入欄與確認按鈕
function syncSelectionUI() {
  document.querySelectorAll("#departure-list .departure-item").forEach((item) => {
    const itemCity = item.querySelector(".city-name")?.textContent || "";
    item.classList.toggle("selected", itemCity === selectedDepartureCity);
  });
  const input = document.getElementById("search-input");
  if (input) input.value = selectedDepartureCity;
  updateConfirmButton();
}

function selectFromDropdown(city) {
  selectedDepartureCity = city;
  document.querySelector(".search-box")?.classList.remove("open");
  document.getElementById("dropdown-panel")?.classList.remove("open");
  syncSelectionUI();
}

function selectDeparture(city) {
  // 單選：點同一個可取消
  selectedDepartureCity = (selectedDepartureCity === city) ? "" : city;
  syncSelectionUI();
}

function updateConfirmButton() {
  const confirmBtn = document.getElementById("confirm-btn");
  if (!confirmBtn) return;
  if (selectedDepartureCity) {
    confirmBtn.textContent = "確認選擇";
    confirmBtn.disabled = false;
  } else {
    confirmBtn.textContent = "請選擇出發地";
    confirmBtn.disabled = true;
  }
}

function confirmSelection() {
  if (!selectedDepartureCity) {
    alert("請選擇出發地");
    return;
  }

  // 根據選擇的機場名稱查找對應的地區
  const allowedRegions = departureToRegionMap[selectedDepartureCity] || null;
  console.log("Selected airport:", selectedDepartureCity, "allowed regions:", allowedRegions); // 調試用

  saveTripSetup({
    departure: selectedDepartureCity,
    departureLabel: selectedDepartureCity,
    allowedRegions: allowedRegions, // 儲存允許的區域
  }); 

  // 使用動畫返回 setup.html
  goBackWithTransition("setup.html");
}

function setupScrollShadow() {
  const listContainer = document.getElementById("departure-list");
  if (!listContainer) return;

  function updateScrollShadow() {
    const scrollTop = listContainer.scrollTop;
    const scrollHeight = listContainer.scrollHeight;
    const clientHeight = listContainer.clientHeight;
    const scrollBottom = scrollHeight - scrollTop - clientHeight;

    if (scrollTop > 5) listContainer.classList.add("has-scroll-top");
    else listContainer.classList.remove("has-scroll-top");

    if (scrollBottom > 5) listContainer.classList.add("has-scroll-bottom");
    else listContainer.classList.remove("has-scroll-bottom");
  }

  listContainer.addEventListener("scroll", updateScrollShadow);
  setTimeout(updateScrollShadow, 100);
}

window.onload = init;