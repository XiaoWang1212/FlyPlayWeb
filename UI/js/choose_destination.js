/**
 * choose_destination.js
 * 目的地選擇頁
 *
 * 核心行為：
 * - 從 localStorage 讀取 tripSetup.allowedRegions
 * - 只顯示該機場允許的地區
 * - 讓使用者可多選目的地並存回 localStorage
 */

    const destinations = [
    { city: "東京", english: "tokyo", region: "kanto", label: "關東" },
    { city: "大阪", english: "osaka", region: "kinki", label: "近畿" },
    { city: "京都", english: "kyoto", region: "kinki", label: "近畿" },
    { city: "北海道", english: "hokkaido", region: "hokkaido", label: "北海道" },
    { city: "函館", english: "hakodate", region: "hokkaido", label: "北海道" },
    { city: "札幌", english: "sapporo", region: "hokkaido", label: "北海道" },
    { city: "旭川", english: "asahikawa", region: "hokkaido", label: "北海道" },
    { city: "沖繩", english: "okinawa", region: "okinawa", label: "沖繩" },
    { city: "福岡", english: "fukuoka", region: "kyushu", label: "九州" },
    { city: "奈良", english: "nara", region: "kinki", label: "近畿" },
    { city: "神奈川", english: "kanagawa", region: "kanto", label: "關東" },
    { city: "千葉", english: "chiba", region: "kanto", label: "關東" },
    { city: "廣島", english: "hiroshima", region: "chugoku", label: "中國" },
    { city: "長崎", english: "nagasaki", region: "kyushu", label: "九州" },
    { city: "石川", english: "ishikawa", region: "chubu", label: "中部" },
    { city: "山梨", english: "yamanashi", region: "chubu", label: "中部" },
    { city: "兵庫", english: "hyogo", region: "kinki", label: "近畿" },
    { city: "愛知", english: "aichi", region: "chubu", label: "中部" },
    { city: "熊本", english: "kumamoto", region: "kyushu", label: "九州" },
    { city: "岐阜", english: "gifu", region: "chubu", label: "中部" },
    { city: "長野", english: "nagano", region: "chubu", label: "中部" },
    { city: "大分", english: "oita", region: "kyushu", label: "九州" },
    { city: "三重", english: "mie", region: "kinki", label: "近畿" },
    { city: "靜岡", english: "shizuoka", region: "kanto", label: "關東" },
    { city: "宮城", english: "miyagi", region: "tohoku", label: "東北" },
    { city: "埼玉", english: "saitama", region: "kanto", label: "關東" },
    { city: "栃木", english: "tochigi", region: "kanto", label: "關東" },
    { city: "岡山", english: "okayama", region: "chugoku", label: "中國" },
    { city: "香川", english: "kagawa", region: "shikoku", label: "四國" },
    { city: "鹿兒島", english: "kagoshima", region: "kyushu", label: "九州" },
    { city: "滋賀", english: "shiga", region: "kinki", label: "近畿" },
    { city: "新潟", english: "niigata", region: "chubu", label: "中部" },
    { city: "愛媛", english: "ehime", region: "shikoku", label: "四國" },
    { city: "和歌山", english: "wakayama", region: "kinki", label: "近畿" },
    { city: "群馬", english: "gunma", region: "kanto", label: "關東" },
    { city: "富山", english: "toyama", region: "chubu", label: "中部" },
    { city: "山口", english: "yamaguchi", region: "chugoku", label: "中國" },
    { city: "宮崎", english: "miyazaki", region: "kyushu", label: "九州" },
    { city: "青森", english: "aomori", region: "tohoku", label: "東北" },
    { city: "福井", english: "fukui", region: "chubu", label: "中部" },
    { city: "佐賀", english: "saga", region: "kyushu", label: "九州" },
    { city: "岩手", english: "iwate", region: "tohoku", label: "東北" },
    { city: "秋田", english: "akita", region: "tohoku", label: "東北" },
    { city: "山形", english: "yamagata", region: "tohoku", label: "東北" },
    { city: "鳥取", english: "tottori", region: "chugoku", label: "中國" },
    { city: "茨城", english: "ibaraki", region: "kanto", label: "關東" },
    { city: "島根", english: "shimane", region: "chugoku", label: "中國" },
    { city: "高知", english: "kochi", region: "shikoku", label: "四國" },
    { city: "福島", english: "fukushima", region: "tohoku", label: "東北" },
    { city: "徳島", english: "tokushima", region: "shikoku", label: "四國" },
    ];

    // 47 個日本城市的坐標（經緯度）
    const cityCoordinates = {
    "東京": { lat: 35.6762, lng: 139.6503 },
    "大阪": { lat: 34.6937, lng: 135.5023 },
    "京都": { lat: 35.0116, lng: 135.7681 },
    "北海道": { lat: 43.0642, lng: 141.3469 },
    "函館": { lat: 41.7687, lng: 140.7288 },
    "札幌": { lat: 43.0618, lng: 141.3545 },
    "旭川": { lat: 43.7708, lng: 142.3650 },
    "沖繩": { lat: 26.2128, lng: 127.6798 },
    "福岡": { lat: 33.5904, lng: 130.4017 },
    "奈良": { lat: 34.6851, lng: 135.8048 },
    "神奈川": { lat: 35.4437, lng: 139.6380 },
    "千葉": { lat: 35.6063, lng: 140.1060 },
    "廣島": { lat: 34.3853, lng: 132.4548 },
    "長崎": { lat: 32.7503, lng: 129.8737 },
    "石川": { lat: 36.5946, lng: 136.6361 },
    "山梨": { lat: 35.6640, lng: 138.5674 },
    "兵庫": { lat: 34.6901, lng: 135.1955 },
    "愛知": { lat: 35.1815, lng: 136.9066 },
    "熊本": { lat: 32.8031, lng: 130.7073 },
    "岐阜": { lat: 35.3916, lng: 136.7261 },
    "長野": { lat: 36.6516, lng: 138.1942 },
    "大分": { lat: 33.2383, lng: 131.6126 },
    "三重": { lat: 34.7306, lng: 136.5086 },
    "靜岡": { lat: 34.9794, lng: 138.3828 },
    "宮城": { lat: 38.2688, lng: 140.8694 },
    "埼玉": { lat: 35.8617, lng: 139.6455 },
    "栃木": { lat: 36.5561, lng: 139.8835 },
    "岡山": { lat: 34.6550, lng: 133.9196 },
    "香川": { lat: 34.3404, lng: 134.0432 },
    "鹿兒島": { lat: 31.5969, lng: 130.5579 },
    "滋賀": { lat: 35.0084, lng: 135.8677 },
    "新潟": { lat: 37.9155, lng: 139.0364 },
    "愛媛": { lat: 33.8416, lng: 132.7657 },
    "和歌山": { lat: 34.2264, lng: 135.1671 },
    "群馬": { lat: 36.3903, lng: 139.0621 },
    "富山": { lat: 36.6953, lng: 137.2113 },
    "山口": { lat: 34.1861, lng: 131.4730 },
    "宮崎": { lat: 31.9111, lng: 131.4230 },
    "青森": { lat: 40.8244, lng: 140.7469 },
    "福井": { lat: 36.0641, lng: 136.2202 },
    "佐賀": { lat: 33.8491, lng: 130.2997 },
    "岩手": { lat: 39.7031, lng: 141.1468 },
    "秋田": { lat: 39.7186, lng: 140.1026 },
    "山形": { lat: 38.2400, lng: 140.3636 },
    "鳥取": { lat: 35.5308, lng: 134.2356 },
    "茨城": { lat: 36.3426, lng: 140.4468 },
    "島根": { lat: 35.4730, lng: 133.0501 },
    "高知": { lat: 33.5543, lng: 133.5315 },
    "福島": { lat: 37.7597, lng: 140.4675 },
    "徳島": { lat: 34.0656, lng: 134.5593 },
    };
    let currentRegion = "all";
    let selectedDestinations = [];
    let allowedRegions = null;
    let baseDestination = null;
    let disabledDestinations = [];

    // -------------------- 工具：距離計算 --------------------

    function calculateDistance(lat1, lng1, lat2, lng2) {
        const toRad = (deg) => (deg * Math.PI) / 180;
        const R = 6371;

        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);

        return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // -------------------- 禁用計算（純邏輯） --------------------

    function calculateDisabledDestinations(list) {
        disabledDestinations = [];

        if (!baseDestination) return;
        const base = cityCoordinates[baseDestination.city];
        if (!base) return;

        list.forEach((dest) => {
            if (dest.city === baseDestination.city) return;

            const coord = cityCoordinates[dest.city];
            if (!coord) return;

            const distance = calculateDistance(base.lat, base.lng, coord.lat, coord.lng);

            if (distance > 300) { // 先關閉這功能 
                disabledDestinations.push(dest.city);
            }
        });
    }

    // -------------------- storage --------------------

    function loadTripSetup() {
        try {
            const raw = localStorage.getItem("tripSetup");
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    }

    function saveSelectedDestinations() {
        localStorage.setItem("selectedDestinations", JSON.stringify(selectedDestinations));
    }

    // -------------------- 初始化 --------------------

    function init() {
        const tripSetup = loadTripSetup();
        allowedRegions = Array.isArray(tripSetup.allowedRegions)
            ? tripSetup.allowedRegions
            : null;

        const saved = localStorage.getItem("selectedDestinations");

        selectedDestinations = saved ? JSON.parse(saved) : [];
        baseDestination = selectedDestinations.length > 0 ? selectedDestinations[0] : null;

        refreshUI();
        setupScrollShadow();
    }

    // -------------------- 篩選可見 --------------------

    function getVisibleDestinations() {
        if (!Array.isArray(allowedRegions) || allowedRegions.length === 0) {
            return destinations;
        }

        const filtered = destinations.filter((d) =>
            allowedRegions.includes(d.region)
        );

        return filtered.length ? filtered : destinations;
    }

    // -------------------- 統一 UI 更新入口 --------------------

    function refreshUI() {
        const visible = getVisibleDestinations();

        calculateDisabledDestinations(visible);
        saveSelectedDestinations();
        renderDestinations();
        updateConfirmButton();
    }

    // -------------------- render --------------------

    function renderDestinations() {
        const listContainer = document.getElementById("destination-list");
        if (!listContainer) return;

        listContainer.innerHTML = "";

        const visibleDestinations = getVisibleDestinations();

        visibleDestinations.forEach((dest) => {
            const item = document.createElement("div");
            item.className = "destination-item";
            item.setAttribute("data-region", dest.region);

            item.setAttribute(
                "data-search",
                `${dest.city}${dest.english}${dest.label}${dest.region}`.toLowerCase()
            );

            if (dest.english) {
                item.style.backgroundImage = `url('assets/destinations/${dest.english}.jpeg')`;
                item.classList.add("has-image");
            }

            const isDisabled = disabledDestinations.includes(dest.city);
            const isSelected = selectedDestinations.some(
                (s) => s.city === dest.city && s.region === dest.region
            );

            if (isDisabled) item.classList.add("disabled");
            if (isSelected) item.classList.add("selected");

            item.innerHTML = `
                <div class="city-name">${dest.city}</div>
                <div class="country-name">${dest.label}</div>
            `;

            if (!isDisabled) {
                item.onclick = () => toggleDestination(dest);
            }

            listContainer.appendChild(item);
        });

        filterRegion(currentRegion);
    }

    // -------------------- toggle（核心修正） --------------------

    function toggleDestination(dest) {
        const index = selectedDestinations.findIndex(
            (s) => s.city === dest.city && s.region === dest.region
        );

        if (index > -1) {
            selectedDestinations.splice(index, 1);
        } else {
            // 如果已設定天數，目的地數量不能超過天數
            const tripSetup = JSON.parse(localStorage.getItem("tripSetup") || "{}");
            const daysValue = Number(tripSetup.daysValue || 0);
            if (daysValue > 0 && selectedDestinations.length >= daysValue) {
                showDestinationLimitHint(`已達上限，目前天數為 ${daysValue} 天，最多選擇 ${daysValue} 個目的地`);
                return;
            }
            if (selectedDestinations.length === 0) {
                baseDestination = dest;
            }
            selectedDestinations.push(dest);
        }

        if (selectedDestinations.length === 0) {
            baseDestination = null;
        }

        refreshUI();
    }

    function showDestinationLimitHint(message) {
        const hint = document.getElementById("destination-limit-hint");
        if (!hint) return;
        hint.textContent = message;
        hint.style.display = "block";
        clearTimeout(hint._hideTimer);
        hint._hideTimer = setTimeout(() => { hint.style.display = "none"; }, 3000);
    }

    // -------------------- remove（同步修正） --------------------

        function removeDestination(city, region) {
        const index = selectedDestinations.findIndex(
            (s) => s.city === city && s.region === region
        );

        if (index === -1) return;

        selectedDestinations.splice(index, 1);
        baseDestination = selectedDestinations.length > 0 
            ? selectedDestinations[0] 
            : null;

        if (!baseDestination) {
            disabledDestinations = [];
        }

        calculateDisabledDestinations(getVisibleDestinations());
        saveSelectedDestinations();

        renderDestinations();
        updateConfirmButton();
    }
    // -------------------- confirm UI --------------------

    function updateConfirmButton() {
        const confirmBtn = document.getElementById("confirm-btn");
        const selectedList = document.getElementById("selected-list");

        if (confirmBtn) {
            if (selectedDestinations.length > 0) {
                confirmBtn.textContent = `確認選擇 (${selectedDestinations.length})`;
                confirmBtn.disabled = false;
            } else {
                confirmBtn.textContent = "確認選擇目的地";
                confirmBtn.disabled = true;
            }
        }

        if (selectedList) {
            if (selectedDestinations.length > 0) {
                selectedList.innerHTML = "";

                selectedDestinations.forEach((dest) => {
                    const tag = document.createElement("span");
                    tag.className = "selected-tag";

                    tag.innerHTML = `
                        ${dest.city}
                        <button class="remove-btn"
                            onclick="removeDestination('${dest.city}', '${dest.region}')">
                            ×
                        </button>
                    `;

                    selectedList.appendChild(tag);
                });
            } else {
                selectedList.innerHTML =
                    '<span class="no-selection">尚未選擇目的地</span>';
            }
        }
    }

    // -------------------- filter --------------------

    function filterRegion(region) {
        currentRegion = region;

        document.querySelectorAll(".destination-item").forEach((item) => {
            const itemRegion = item.getAttribute("data-region");

            if (region === "all" || itemRegion === region) {
                item.classList.remove("hidden");
            } else {
                item.classList.add("hidden");
            }
        });
    }

    // -------------------- search --------------------

    function searchDestination() {
        const searchText =
            document.getElementById("search-input")?.value.toLowerCase().trim() || "";

        const items = document.querySelectorAll(".destination-item");

        if (!searchText) {
            items.forEach((i) => i.classList.remove("hidden"));
            return;
        }

        items.forEach((item) => {
            const data = item.getAttribute("data-search") || "";

            if (data.includes(searchText.replace(/\s+/g, ""))) {
                item.classList.remove("hidden");
            } else {
                item.classList.add("hidden");
            }
        });
    }

    // -------------------- scroll shadow --------------------

    function setupScrollShadow() {
        const listContainer = document.getElementById("destination-list");
        if (!listContainer) return;

        function update() {
            const top = listContainer.scrollTop;
            const bottom =
                listContainer.scrollHeight - top - listContainer.clientHeight;

            listContainer.classList.toggle("has-scroll-top", top > 5);
            listContainer.classList.toggle("has-scroll-bottom", bottom > 5);
        }

        listContainer.addEventListener("scroll", update);
        setTimeout(update, 100);
    }

    // -------------------- start --------------------

    function confirmSelection() {
        saveSelectedDestinations();
        goBackWithTransition("setup.html");
    }

    window.onload = init;

    window.confirmSelection = confirmSelection;
    window.removeDestination = removeDestination;
    window.toggleDestination = toggleDestination;
    window.searchDestination = searchDestination;
    window.filterRegion = filterRegion;