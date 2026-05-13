// ===== 景點搜尋功能 =====
// ===== 共用工具 =====

// 商家資訊快取（以 place_id/name 作為 key）。
const businessInfoCache = new Map();

// 取得商家資訊快取 key。
function getBusinessInfoCacheKey(spot) {
  if (!spot) return "";

  if (spot.place_id) {
    return `place:${spot.place_id}`;
  }

  const name = String(spot.name || "").trim();
  return name ? `name:${name}` : "";
}

// 讀取商家資訊快取。
function getCachedBusinessInfo(spot) {
  const key = getBusinessInfoCacheKey(spot);
  if (key && businessInfoCache.has(key)) {
    return businessInfoCache.get(key);
  }

  // 相容既有資料：若舊資料仍掛在 spot 上，轉存到 Map 後回傳。
  if (spot && spot._businessInfo && key) {
    businessInfoCache.set(key, spot._businessInfo);
    return spot._businessInfo;
  }

  return null;
}

// 寫入商家資訊快取。
function setCachedBusinessInfo(spot, businessInfo) {
  const key = getBusinessInfoCacheKey(spot);
  if (!key) return;
  businessInfoCache.set(key, businessInfo || {});
}

// 取得景點主照片網址，沒有則回傳空字串。
function getSpotPrimaryPhotoUrl(spot) {
  return spot && spot.photos && spot.photos[0] && spot.photos[0].photo_url
    ? spot.photos[0].photo_url
    : "";
}

// 關閉景點預覽資訊（資訊窗 + 預覽 marker），供關閉按鈕與外部呼叫。
function closeSpotPreviewInfo() {
  clearCurrentPopup();
  if (spotPreviewMarker) {
    spotPreviewMarker.setMap(null);
    spotPreviewMarker = null;
  }
}

// ===== 商家資訊 =====
// 取得景點商家資訊（營業時間、價位）。
async function getBusinessInfo(spot, weekday = "") {
  // 預設商家資訊。
  const getDefaultBusinessInfo = () => ({
    openingHoursText: "未提供",
    priceRangeText: "未提供",
  });

  // 將價位區間轉成顯示文字。
  const formatPriceRangeText = (priceRange) => {
    if (!priceRange || typeof priceRange !== "object") {
      return "未提供";
    }

    return `${priceRange?.startPrice?.currencyCode || ""} ${
      priceRange?.startPrice?.units || ""
    }-${priceRange?.endPrice?.units || ""}`.trim();
  };

  if (!spot) {
    return getDefaultBusinessInfo();
  }

  // 依 weekday 挑選營業時間，找不到就回第一筆。
  const selectOpeningHoursText = (openingHours) => {
    if (!Array.isArray(openingHours) || !openingHours.length) {
      return "未提供";
    }

    const weekdayText = String(weekday || "").trim();
    if (!weekdayText) {
      return openingHours[0];
    }

    const matchedLine = openingHours.find(
      (line) =>
        typeof line === "string" && line.startsWith(`${weekdayText}:`),
    );
    if (matchedLine) {
      return matchedLine;
    }

    return openingHours[0];
  };

  const storedToken = localStorage.getItem("userToken");
  const defaultHeaders = storedToken
    ? {
        "Content-Type": "application/json",
        Authorization: `Bearer ${storedToken}`,
      }
    : { "Content-Type": "application/json" };

  // 優先使用快取商家資訊。
  const cachedBusinessInfo = getCachedBusinessInfo(spot);
  if (cachedBusinessInfo) {
    const openingHours = cachedBusinessInfo.opening_hours;
    const priceRange = cachedBusinessInfo.price_range;
    const openingHoursText = selectOpeningHoursText(openingHours);
    const priceRangeText = formatPriceRangeText(priceRange);
    return { openingHoursText, priceRangeText };
  }

  try {
    let response;

    // 優先用 place_id 查詢，否則改用名稱查詢。
    if (spot.place_id) {
      response = await fetch(
        `${API_BASE}/api/maps/business_info/${encodeURIComponent(
          spot.place_id,
        )}`,
        {
          headers: defaultHeaders,
        },
      );
    } else if (spot.name) {
      response = await fetch(`${API_BASE}/api/maps/business_info`, {
        method: "POST",
        headers: defaultHeaders,
        body: JSON.stringify({ name: spot.name }),
      });
    } else {
      return getDefaultBusinessInfo();
    }

    // API 失敗或格式不符時回傳預設值。
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      return getDefaultBusinessInfo();
    }

    // 將回傳資料寫入快取。
    const fetchedBusinessInfo = payload?.data || {};
    setCachedBusinessInfo(spot, fetchedBusinessInfo);

    const openingHours = fetchedBusinessInfo.opening_hours;
    const priceRange = fetchedBusinessInfo.price_range;

    const openingHoursText = selectOpeningHoursText(openingHours);
    const priceRangeText = formatPriceRangeText(priceRange);

    return { openingHoursText, priceRangeText };
  } catch (error) {
    // 網路或解析錯誤時回傳預設值。
    return getDefaultBusinessInfo();
  }
}

// ===== 地圖資訊卡與預覽 =====
// 建立縮圖 HTML。
function buildSpotThumbHtml(photoUrl, baseClassName) {
  return `<div class="${baseClassName} ${photoUrl ? "has-photo" : ""}" ${
    photoUrl ? `style="background-image:url('${photoUrl}')"` : ""
  }>
          ${photoUrl ? "" : '<i class="far fa-image"></i>'}
        </div>`;
}

// 建立資訊卡標題區塊 HTML。
function buildSpotMapCardMainHtml(name, address, closeHandler) {
  return `<div class="custom-map-popup-main">
          <div class="custom-map-popup-title-row">
            <div class="custom-map-popup-title">${name}</div>
            <button
              type="button"
              class="custom-map-popup-card-close-btn"
              aria-label="關閉景點資訊"
              onclick="${closeHandler}"
            >
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="custom-map-popup-address">${address}</div>
        </div>`;
}

// 建立資訊卡指標區塊 HTML。
function buildSpotMapCardMetricsHtml(
  ratingText,
  openingHoursDisplay,
  priceRangeDisplay,
) {
  return `<div class="custom-map-popup-metrics">
        <div class="custom-map-popup-chip"><i class="fas fa-star"></i> 評分 ${ratingText}</div>
        <div class="custom-map-popup-chip"><i class="fas fa-clock"></i> ${openingHoursDisplay}</div>
        <div class="custom-map-popup-chip"><i class="fas fa-wallet"></i> 價位：${priceRangeDisplay}</div>
      </div>`;
}

// 建立資訊卡加入按鈕 HTML。
function buildSpotMapCardAddButtonHtml(showAddButton) {
  if (!showAddButton) return "";

  return `<button type="button" class="custom-map-popup-add-btn" onclick="addSpotToItinerary(selectedSpotForAdd, event)">
        <i class="fas fa-plus"></i> 加入行程
      </button>`;
}

// 建立景點資訊視窗 HTML。
function buildSpotPreviewInfoHtml(
  spot,
  openingHoursText = "載入中...",
  priceRangeText = "載入中...",
  options = {},
) {
  const {
    showAddButton = true,
    closeHandler = "closeSpotPreviewInfo()",
  } = options;
  const photoUrl = getSpotPrimaryPhotoUrl(spot);
  const name = escapeHtml(spot.name || "未命名地點");
  const address = escapeHtml(spot.address || "無地址資訊");
  const businessInfo = getCachedBusinessInfo(spot) || {};
  const ratingValue =
    typeof businessInfo.rating === "number"
      ? businessInfo.rating
      : spot.rating;
  const ratingCount =
    businessInfo.user_rating_count || spot.user_rating_count || 0;
  const ratingText =
    typeof ratingValue === "number"
      ? `${ratingValue.toFixed(1)}${
          ratingCount ? ` (${ratingCount})` : ""
        }`
      : "未提供";
  const openingHoursDisplay = escapeHtml(openingHoursText);
  const priceRangeDisplay = escapeHtml(priceRangeText);

  return `
    <div class="custom-map-popup-card">
      <div class="custom-map-popup-head">
        ${buildSpotThumbHtml(photoUrl, "custom-map-popup-thumb")}
        ${buildSpotMapCardMainHtml(name, address, closeHandler)}
      </div>
      ${buildSpotMapCardMetricsHtml(
        ratingText,
        openingHoursDisplay,
        priceRangeDisplay,
      )}
      ${buildSpotMapCardAddButtonHtml(showAddButton)}
    </div>
  `;
}

// 在地圖上顯示景點資訊。
function openSpotInfoOnMap(
  spot,
  openingHoursText = "載入中...",
  priceRangeText = "載入中...",
) {
  if (!map || !spot) return;

  const location = normalizePlaceLocation(spot);
  if (!location) return;

  closeSpotPreviewInfo();

  // 建立目前選中景點的 marker。
  spotPreviewMarker = new google.maps.Marker({
    map,
    position: location,
    title: spot.name || "景點",
    animation: google.maps.Animation.DROP,
  });

  currentInfoWindow = new google.maps.InfoWindow({
    content: `<div class="custom-map-popup-info-wrapper">${buildSpotPreviewInfoHtml(
      spot,
      openingHoursText,
      priceRangeText,
    )}</div>`,
    maxWidth: 360,
  });

  // 開啟資訊視窗並將地圖移到該景點。
  currentInfoWindow.open({ map, anchor: spotPreviewMarker });
  map.panTo(location);
  if ((map.getZoom() || 0) < 15) {
    map.setZoom(15);
  }
}

// 在搜尋結果區顯示提示訊息。
function showSearchMessage(message) {
  spotSearchResults.innerHTML = `<div class="spot-search-message">${escapeHtml(message)}</div>`;
}

// ===== 搜尋視窗與清單 =====
// 開啟搜尋視窗並重置狀態。
function openSpotSearchModal() {
  spotSearchState.isOpen = true;
  spotSearchState.results = [];
  spotSearchState.selectedIndex = -1;
  spotSearchState.selectionToken =
    (spotSearchState.selectionToken || 0) + 1;
  selectedSpotForAdd = null;

  spotSearchOverlay.classList.add("active");
  spotSearchOverlay.classList.remove("results-collapsed");
  spotSearchOverlay.setAttribute("aria-hidden", "false");
  spotSearchResults.innerHTML = "";
  spotSearchInput.value = "";

  // 搜尋時先收起下方面板，避免遮住地圖。
  sheet.classList.remove("expanded", "half");
  syncSheetState("sheet-collapsed");

  setTimeout(() => {
    spotSearchInput.focus();
  }, 50);
}

// 關閉搜尋視窗。
function closeSpotSearchModal() {
  spotSearchState.isOpen = false;
  spotSearchState.selectionToken =
    (spotSearchState.selectionToken || 0) + 1;
  spotSearchOverlay.classList.remove("results-collapsed");
  spotSearchOverlay.classList.remove("active");
  spotSearchOverlay.setAttribute("aria-hidden", "true");
}

// 渲染搜尋結果列表
// 依目前狀態渲染清單，並標示 active 項目。
function buildSpotSearchItemHtml(item, index, isSelected) {
  const photoUrl = getSpotPrimaryPhotoUrl(item);

  return `
        <button
          type="button"
          class="spot-search-item ${isSelected ? "active" : ""}"
          onclick="selectSpotSearchResult(${index})"
        >
          ${buildSpotThumbHtml(photoUrl, "spot-search-item-thumb")}
          <div class="spot-search-item-body">
            <div class="spot-search-item-main">${item.name || "未命名地點"}</div>
            <div class="spot-search-item-sub">${item.address || "無地址資訊"}</div>
          </div>
        </button>
      `;
}

function renderSpotSearchResults() {
  if (!spotSearchState.results.length) {
    spotSearchResults.innerHTML = "";
    return;
  }

  const html = spotSearchState.results
    .map((item, index) => {
      const isSelected = index === spotSearchState.selectedIndex;
      return buildSpotSearchItemHtml(item, index, isSelected);
    })
    .join("");

  spotSearchResults.innerHTML = html;
}

// ===== 搜尋流程 =====
// 選取搜尋結果後：更新清單、顯示地圖、補齊商家資訊。
async function selectSpotSearchResult(index) {
  spotSearchState.selectionToken =
    (spotSearchState.selectionToken || 0) + 1;
  const currentSelectionToken = spotSearchState.selectionToken;

  spotSearchState.selectedIndex = index;
  renderSpotSearchResults();

  // 根據選中的搜尋結果在地圖上顯示資訊，並準備加入行程
  const selectedSpot = spotSearchState.results[index];
  if (!selectedSpot) return;

  selectedSpotForAdd = selectedSpot;

  // 收起 bottom sheet。
  sheet.classList.remove("expanded", "half");
  syncSheetState("sheet-collapsed");

  openSpotInfoOnMap(selectedSpot, "載入中...", "載入中...");

  // 選取後收起結果列表，保留搜尋框。
  spotSearchOverlay.classList.add("results-collapsed");
  spotSearchResults.innerHTML = "";

  // 搜尋加入行程時，沿用目前所選天數的 weekday。
  const selectedWeekday =
    currentDayIndex >= 0 && currentDayIndex < allDays.length
      ? allDays[currentDayIndex]?.weekday || ""
      : "";

  const { openingHoursText, priceRangeText } =
    await getBusinessInfo(selectedSpot, selectedWeekday);

  // 只更新目前仍有效的選取結果。
  if (
    currentSelectionToken === spotSearchState.selectionToken &&
    selectedSpotForAdd === selectedSpot &&
    spotSearchState.isOpen
  ) {
    openSpotInfoOnMap(selectedSpot, openingHoursText, priceRangeText);
  }
}

// ===== 行程寫入 =====
// 將景點資料轉成行程 activity 格式。
function buildActivityFromSpot(spot) {
  const location = normalizePlaceLocation(spot) || { lat: 0, lng: 0 };
  const types = Array.isArray(spot.types) ? spot.types : [];

  return {
    activityId: spot.place_id || `${spot.name || "spot"}-${Date.now()}`,
    place_id: spot.place_id || "",
    place_name: spot.name || "未命名地點",
    time: "待安排",
    description: spot.address || "從搜尋新增的景點",
    cost: "",
    rating: spot.rating,
    user_rating_count: spot.user_rating_count,
    type: types[0] || "景點",
    address: spot.address || "",
    location,
    photos: spot.photos || [],
  };
}

// 把選中的景點加入行程。
async function addSpotToItinerary(spot, evt) {
  if (evt) evt.stopPropagation();
  if (!spot) return;

  const targetDays = getActiveDays();
  if (!Array.isArray(targetDays) || !targetDays.length) return;

  // 依目前選取日決定加入哪一天，無效時預設第一天。
  const targetDayIndex =
    currentDayIndex >= 0 && currentDayIndex < targetDays.length
      ? currentDayIndex
      : 0;

  const targetDay = targetDays[targetDayIndex];
  if (!targetDay || !Array.isArray(targetDay.activities)) return;

  const newActivity = buildActivityFromSpot(spot);
  targetDay.activities.push(newActivity);

  if (isEditMode && editedDays) {
    isDragChanged = true;
    // 編輯模式下顯示確認按鈕。
    document.getElementById("dragConfirmBtn").classList.add("show");
  }

  if (currentDayIndex === -1) {
    displayAllDays();
  } else {
    displayDay(currentDayIndex);
  }

  openSheet();
  closeSpotSearchModal();
}

// 優先使用當前日期的最後一個活動位置，若無則從所有日期的最後活動往前找
// 取得搜尋錨點（目前日優先，否則由最後一天往前找）。
function getSearchAnchorLocation() {
  const getDayLastLocation = (day) => {
    if (
      !day ||
      !Array.isArray(day.activities) ||
      !day.activities.length
    ) {
      return null;
    }

    for (let i = day.activities.length - 1; i >= 0; i--) {
      // 從後往前找最後一個有效座標。
      const normalized = normalizeActivityLocation(
        day.activities[i].location,
      );
      if (normalized) return normalized;
    }
    return null;
  };

  if (currentDayIndex >= 0 && currentDayIndex < allDays.length) {
    const byCurrentDay = getDayLastLocation(allDays[currentDayIndex]);
    if (byCurrentDay) return byCurrentDay;
  }

  for (let i = allDays.length - 1; i >= 0; i--) {
    const byLastDay = getDayLastLocation(allDays[i]);
    if (byLastDay) return byLastDay;
  }

  return null;
}

// 執行景點搜尋
// 依是否有錨點選擇 nearby/general API。
async function performSpotSearch(
  keyword,
  reqId,
  showNoResultMessage = false,
) {
  try {
    const anchorLocation = getSearchAnchorLocation();
    let response, payload;

    // 有錨點時使用 nearby 搜尋。
    if (anchorLocation) {
      response = await fetch(`${API_BASE}/api/maps/search_nearby`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          textQuery: keyword,
          location: anchorLocation,
          radius: 1500,
          languageCode: "zh-TW",
          maxResultCount: 8,
        }),
      });
    } else {
      response = await fetch(`${API_BASE}/api/maps/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          textQuery: keyword,
          languageCode: "zh-TW",
          maxResultCount: 10,
        }),
      });
    }

    payload = await response.json();

    // 丟棄過期請求。
    if (reqId !== spotSearchState.requestId || !spotSearchState.isOpen) {
      return;
    }

    const places = payload?.data?.places || [];
    spotSearchState.results = places;
    spotSearchState.selectedIndex = -1;

    if (!response.ok || !payload.success) {
      showSearchMessage(payload.error || "搜尋失敗，請稍後再試");
      return;
    }

    if (!places.length) {
      if (showNoResultMessage) {
        showSearchMessage("找不到相關景點，請嘗試其他關鍵字");
      } else {
        spotSearchResults.innerHTML = "";
      }
      return;
    }

    renderSpotSearchResults();
  } catch (error) {
    if (reqId !== spotSearchState.requestId || !spotSearchState.isOpen) {
      return;
    }
    // 搜尋失敗提示。
    showSearchMessage("搜尋失敗，請檢查網路或稍後再試");
  }
}

// 觸發搜尋：檢查關鍵字、恢復結果頁、送出請求。
function triggerSpotSearch(showNoResultMessage = false) {
  const keyword = spotSearchInput.value.trim();
  if (!keyword) {
    showSearchMessage("請先輸入關鍵字");
    return;
  }

  // 再次搜尋時恢復結果頁。
  spotSearchOverlay.classList.remove("results-collapsed");

  const anchorLocation = getSearchAnchorLocation();
  if (anchorLocation && map && typeof map.panTo === "function") {
    // 先移動地圖到搜尋錨點。
    map.panTo({
      lat: anchorLocation.latitude,
      lng: anchorLocation.longitude,
    });
  }

  spotSearchState.requestId += 1;
  const currentReqId = spotSearchState.requestId;
  spotSearchResults.innerHTML = "";
  performSpotSearch(keyword, currentReqId, showNoResultMessage);
}

// 搜尋框鍵盤互動：Enter 搜尋、Escape 關閉。
function onSpotSearchKeydown(e) {
  if (e.key === "Enter") {
    e.preventDefault();
    triggerSpotSearch(true);
    return;
  }

  if (e.key === "Escape") {
    closeSpotSearchModal();
  }
}
