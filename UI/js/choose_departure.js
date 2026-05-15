/**
 * choose_departure.js - 出發地選擇頁面
 * 單選出發地，存到 tripSetup（localStorage）
 */

// 只有前面幾個機場會顯示 其他的不顯示但是搜尋的時候找得到
const departures = [
  { city: "成田國際機場", code: "NRT", subtitle: "千葉/東京", display: true, image: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=300&fit=crop" },
  { city: "羽田國際機場", code: "HND", subtitle: "東京", display: true },
  { city: "關西國際機場", code: "KIX", subtitle: "大阪", display: true },
  { city: "中部國際機場", code: "NGO", subtitle: "名古屋", display: true },
  { city: "福岡機場", code: "FUK", subtitle: "九州", display: true },

  { city: "新千歲機場", code: "CTS", subtitle: "北海道", display: true },
  { city: "那霸機場", code: "OKA", subtitle: "沖繩", display: true },
  { city: "大阪國際機場", code: "ITM", subtitle: "大阪/伊丹", display: true },
  { city: "鹿兒島機場", code: "KOJ", subtitle: "九州", display: true },
  { city: "仙台機場", code: "SDJ", subtitle: "東北", display: true },

  { city: "函館機場", code: "HKD", subtitle: "北海道", display: false },
  { city: "旭川機場", code: "AKJ", subtitle: "北海道", display: false },
  { city: "釧路機場", code: "KUH", subtitle: "北海道", display: false },
  { city: "帶廣機場", code: "OBO", subtitle: "北海道", display: false },
  { city: "女滿別機場", code: "MMB", subtitle: "北海道", display: false },
  { city: "稚內機場", code: "WKJ", subtitle: "北海道", display: false },
  { city: "中標津機場", code: "", subtitle: "北海道", display: false },
  { city: "紋別機場", code: "", subtitle: "北海道", display: false },
  { city: "利尻機場", code: "", subtitle: "北海道", display: false },

  { city: "青森機場", code: "AOJ", subtitle: "東北", display: false },
  { city: "三澤機場", code: "MSJ", subtitle: "東北", display: false },
  { city: "秋田機場", code: "AXT", subtitle: "東北", display: false },
  { city: "花卷機場", code: "HNA", subtitle: "東北", display: false },
  { city: "山形機場", code: "GAJ", subtitle: "東北", display: false },
  { city: "庄內機場", code: "SYO", subtitle: "東北", display: false },
  { city: "福島機場", code: "FKS", subtitle: "東北", display: false },

  { city: "茨城機場", code: "IBR", subtitle: "關東/中部", display: false },
  { city: "靜岡機場", code: "FSZ", subtitle: "關東/中部", display: false },
  { city: "新潟機場", code: "KIJ", subtitle: "關東/中部", display: false },
  { city: "富山機場", code: "TOY", subtitle: "關東/中部", display: false },
  { city: "小松機場", code: "KMQ", subtitle: "關東/中部", display: false },
  { city: "能登機場", code: "NTQ", subtitle: "關東/中部", display: false },
  { city: "信州松本機場", code: "MMJ", subtitle: "關東/中部", display: false },

  { city: "廣島機場", code: "HIJ", subtitle: "中國/四國", display: false },
  { city: "岡山機場", code: "OKJ", subtitle: "中國/四國", display: false },
  { city: "鳥取機場", code: "TTJ", subtitle: "中國/四國", display: false },
  { city: "米子機場", code: "YGJ", subtitle: "中國/四國", display: false },
  { city: "出雲機場", code: "IZO", subtitle: "中國/四國", display: false },
  { city: "山口宇部機場", code: "UBJ", subtitle: "中國/四國", display: false },
  { city: "岩國機場", code: "IWK", subtitle: "中國/四國", display: false },
  { city: "德島機場", code: "TKS", subtitle: "中國/四國", display: false },
  { city: "高松機場", code: "TAK", subtitle: "中國/四國", display: false },
  { city: "松山機場", code: "MYJ", subtitle: "中國/四國", display: false },
  { city: "高知機場", code: "KCZ", subtitle: "中國/四國", display: false },

  { city: "北九州機場", code: "KKJ", subtitle: "九州/離島", display: false },
  { city: "佐賀機場", code: "HSG", subtitle: "九州/離島", display: false },
  { city: "長崎機場", code: "NGS", subtitle: "九州/離島", display: false },
  { city: "大分機場", code: "OIT", subtitle: "九州/離島", display: false },
  { city: "熊本機場", code: "KMJ", subtitle: "九州/離島", display: false },
  { city: "宮崎機場", code: "KMI", subtitle: "九州/離島", display: false },
  { city: "對馬機場", code: "", subtitle: "九州/離島", display: false },
  { city: "五島福江機場", code: "", subtitle: "九州/離島", display: false },
  { city: "屋久島機場", code: "", subtitle: "九州/離島", display: false },
  { city: "奄美大島機場", code: "", subtitle: "九州/離島", display: false },
  { city: "宮古機場", code: "MMY", subtitle: "九州/離島", display: false },
  { city: "下地島機場", code: "SHI", subtitle: "九州/離島", display: false },
  { city: "新石垣機場", code: "ISG", subtitle: "九州/離島", display: false },

  { city: "奧尻機場", code: "", subtitle: "冷門/離島", display: false },
  { city: "隱岐機場", code: "", subtitle: "冷門/離島", display: false },
  { city: "種子島機場", code: "", subtitle: "冷門/離島", display: false },
  { city: "喜界機場", code: "", subtitle: "冷門/離島", display: false },
  { city: "德之島機場", code: "", subtitle: "冷門/離島", display: false },
  { city: "沖永良部機場", code: "", subtitle: "冷門/離島", display: false },
  { city: "與論機場", code: "", subtitle: "冷門/離島", display: false },
  { city: "大島機場", code: "", subtitle: "伊豆諸島", display: false },
  { city: "新島機場", code: "", subtitle: "伊豆諸島", display: false },
  { city: "神津島機場", code: "", subtitle: "伊豆諸島", display: false },
  { city: "三宅島機場", code: "", subtitle: "伊豆諸島", display: false },
  { city: "八丈島機場", code: "", subtitle: "伊豆諸島", display: false },
  { city: "粟國機場", code: "", subtitle: "沖繩離島", display: false },
  { city: "久米島機場", code: "", subtitle: "沖繩離島", display: false },
  { city: "北大東機場", code: "", subtitle: "沖繩離島", display: false },
  { city: "南大東機場", code: "", subtitle: "沖繩離島", display: false },
  { city: "多良間機場", code: "", subtitle: "沖繩離島", display: false },
  { city: "與那國機場", code: "", subtitle: "沖繩離島", display: false },

  { city: "調布飛行場", code: "", subtitle: "特殊/停航", display: false },
  { city: "八尾機場", code: "", subtitle: "特殊/停航", display: false },
  { city: "福井機場", code: "", subtitle: "特殊/停航", display: false },
  { city: "但馬飛行場", code: "", subtitle: "特殊/停航", display: false },
  { city: "佐渡機場", code: "", subtitle: "特殊/停航", display: false },
  { city: "岡南飛行場", code: "", subtitle: "特殊/停航", display: false },
  { city: "大分縣央機場", code: "", subtitle: "特殊/停航", display: false },
  { city: "百里機場", code: "", subtitle: "共用基地", display: false },
  { city: "小牧機場", code: "", subtitle: "共用基地", display: false },
  { city: "美保機場", code: "", subtitle: "共用基地", display: false },
  { city: "禮文機場", code: "", subtitle: "特殊/停航", display: false },
  { city: "小值賀機場", code: "", subtitle: "特殊/停航", display: false },
  { city: "上五島機場", code: "", subtitle: "特殊/停航", display: false },
  { city: "慶良間機場", code: "", subtitle: "特殊/停航", display: false },
  { city: "伊江島機場", code: "", subtitle: "特殊/停航", display: false },
  { city: "波照間機場", code: "", subtitle: "特殊/停航", display: false },
  { city: "薩摩硫黃島機場", code: "", subtitle: "特殊/停航", display: false },
  { city: "諏訪之瀨島機場", code: "", subtitle: "特殊/停航", display: false },
];

const STORAGE_KEY_TRIP_SETUP = "tripSetup";

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

  renderDepartures();
  updateConfirmButton();
  setupScrollShadow();
}

function renderDepartures() {
  const listContainer = document.getElementById("departure-list");
  if (!listContainer) return;

  listContainer.innerHTML = "";

  departures.forEach((dep) => {
    const item = document.createElement("div");
    item.className = "departure-item";
    const searchData = [dep.code, dep.city, dep.subtitle]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    item.setAttribute("data-search", searchData);
    item.setAttribute("data-display", dep.display ? "1" : "0");

    if (dep.image) {
      item.style.backgroundImage = `url('${dep.image}')`;
      item.classList.add("has-image");
    }

    if (!dep.display) item.classList.add("hidden");
    if (dep.city === selectedDepartureCity) item.classList.add("selected");

    const codeHtml = dep.code ? `<div class="airport-code">${dep.code}</div>` : "";
    const subtitleHtml = dep.subtitle ? `<div class="country-name">${dep.subtitle}</div>` : "";
    item.innerHTML = `${codeHtml}<div class="city-name">${dep.city}</div>${subtitleHtml}`;
    item.onclick = () => selectDeparture(dep.city);

    listContainer.appendChild(item);
  });
}

function selectDeparture(city) {
  // 單選：點同一個可取消
  selectedDepartureCity = (selectedDepartureCity === city) ? "" : city;

  document.querySelectorAll("#departure-list .departure-item").forEach((item) => {
    const itemCity = item.querySelector(".city-name")?.textContent || "";
    item.classList.toggle("selected", itemCity === selectedDepartureCity);
  });

  updateConfirmButton();
}

function removeDeparture() {
  selectedDepartureCity = "";
  document.querySelectorAll("#departure-list .departure-item").forEach((item) => item.classList.remove("selected"));
  updateConfirmButton();
}

function updateConfirmButton() {
  const confirmBtn = document.getElementById("confirm-btn");
  const selectedList = document.getElementById("selected-list");

  if (confirmBtn) {
    if (selectedDepartureCity) {
      confirmBtn.textContent = "確認選擇";
      confirmBtn.disabled = false;
    } else {
      confirmBtn.textContent = "請選擇出發地";
      confirmBtn.disabled = true;
    }
  }

  if (selectedList) {
    if (selectedDepartureCity) {
      selectedList.innerHTML = "";
      const tag = document.createElement("span");
      tag.className = "selected-tag";
      tag.innerHTML = `${selectedDepartureCity} <button class="remove-btn" onclick="removeDeparture()">×</button>`;
      selectedList.appendChild(tag);
    } else {
      selectedList.innerHTML = '<span class="no-selection">尚未選擇</span>';
    }
  }
}

function confirmSelection() {
  if (!selectedDepartureCity) {
    alert("請選擇出發地");
    return;
  }

  saveTripSetup({
    departure: selectedDepartureCity,
    departureLabel: selectedDepartureCity,
  });

  // 使用動畫返回 setup.html
  goBackWithTransition('setup.html');
}

function searchDeparture() {
  const searchText = document.getElementById("search-input").value.toLowerCase();
  document.querySelectorAll("#departure-list .departure-item").forEach((item) => {
    const searchData = item.getAttribute("data-search") || "";
    const isDisplay = item.getAttribute("data-display") === "1";
    if (!searchText) {
      // 沒有輸入搜尋時只顯示主畫面要看的機場
      item.classList.toggle("hidden", !isDisplay);
      return;
    }
    // 有搜尋時顯示所有可匹配的機場（含平常隱藏的）
    item.classList.toggle("hidden", !searchData.includes(searchText));
  });
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