// ===== 景點搜尋功能 =====

function clearSpotPreview() {
  if (spotPreviewMarker) {
    spotPreviewMarker.setMap(null);
    spotPreviewMarker = null;
  }
}

function closeSpotPreviewInfo() {
  clearCurrentPopup();
  clearSpotPreview();
}

async function getBusinessInfo(spot, weekday = "") {
  if (!spot) {
    return {
      openingHoursText: "未提供",
      priceRangeText: "未提供",
    };
  }

  // 營業時間選擇 用 weekday 比對
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

  if (spot._businessInfo) {
    const openingHours = spot._businessInfo.opening_hours;
    const priceRange = spot._businessInfo.price_range;
    const openingHoursText = selectOpeningHoursText(openingHours);
    const priceRangeText =
      priceRange && typeof priceRange === "object"
        ? `${priceRange?.startPrice?.currencyCode || ""} ${
            priceRange?.startPrice?.units || ""
          }-${priceRange?.endPrice?.units || ""}`.trim()
        : "未提供";
    return { openingHoursText, priceRangeText };
  }

  try {
    let response;

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
      return {
        openingHoursText: "未提供",
        priceRangeText: "未提供",
      };
    }

    // API失敗或回傳非成功格式的統一回傳預設值
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      return {
        openingHoursText: "未提供",
        priceRangeText: "未提供",
      };
    }

    // 將回傳資料暫存到 spot，讓同一景點下次可直接使用。
    spot._businessInfo = payload?.data || {};
    const openingHours = spot._businessInfo.opening_hours;
    const priceRange = spot._businessInfo.price_range;

    const openingHoursText = selectOpeningHoursText(openingHours);
    const priceRangeText =
      priceRange && typeof priceRange === "object"
        ? `${priceRange?.startPrice?.currencyCode || ""} ${
            priceRange?.startPrice?.units || ""
          }-${priceRange?.endPrice?.units || ""}`.trim()
        : "未提供";

    return { openingHoursText, priceRangeText };
  } catch (error) {
    // 網路錯誤或解析錯誤時顯示
    return {
      openingHoursText: "未提供",
      priceRangeText: "未提供",
    };
  }
}

// 根據景點資料建立資訊視窗的 HTML 內容
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
  const photoUrl =
    spot.photos && spot.photos[0] && spot.photos[0].photo_url
      ? spot.photos[0].photo_url
      : "";
  const name = escapeHtml(spot.name || "未命名地點");
  const address = escapeHtml(spot.address || "無地址資訊");
  const businessInfo = spot._businessInfo || {};
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
    <div class="spot-map-card">
      <div class="spot-map-card-head">
        <div class="spot-map-card-thumb ${photoUrl ? "has-photo" : ""}" ${
          photoUrl ? `style="background-image:url('${photoUrl}')"` : ""
        }>
          ${photoUrl ? "" : '<i class="far fa-image"></i>'}
        </div>
        <div class="spot-map-card-main">
          <div class="spot-map-card-title-row">
            <div class="spot-map-card-title">${name}</div>
            <button
              type="button"
              class="spot-map-close-btn"
              aria-label="關閉景點資訊"
              onclick="${closeHandler}"
            >
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="spot-map-card-address">${address}</div>
        </div>
      </div>
      <div class="spot-map-card-metrics">
        <div class="spot-map-chip"><i class="fas fa-star"></i> 評分 ${ratingText}</div>
        <div class="spot-map-chip"><i class="fas fa-clock"></i> ${openingHoursDisplay}</div>
        <div class="spot-map-chip"><i class="fas fa-wallet"></i> 價位：${priceRangeDisplay}</div>
      </div>
      ${
        showAddButton
          ? `<button type="button" class="spot-map-add-btn" onclick="addSpotToItinerary(selectedSpotForAdd, event)">
        <i class="fas fa-plus"></i> 加入行程
      </button>`
          : ""
      }
    </div>
  `;
}

// 搜尋結果點擊後在地圖上顯示景點資訊
function openSpotInfoOnMap(
  spot,
  openingHoursText = "載入中...",
  priceRangeText = "載入中...",
) {
  if (!map || !spot) return;

  const location = normalizePlaceLocation(spot);
  if (!location) return;

  clearSpotPreview();
  clearCurrentPopup();

  // 新增一個 marker 來顯示目前選中的景點
  spotPreviewMarker = new google.maps.Marker({
    map,
    position: location,
    title: spot.name || "景點",
    animation: google.maps.Animation.DROP,
  });

  currentInfoWindow = new google.maps.InfoWindow({
    content: `<div class="spot-map-info-wrapper">${buildSpotPreviewInfoHtml(
      spot,
      openingHoursText,
      priceRangeText,
    )}</div>`,
    maxWidth: 360,
  });

  // 打開資訊視窗並把地圖中心移到這個景點
  currentInfoWindow.open({ map, anchor: spotPreviewMarker });
  map.panTo(location);
  if ((map.getZoom() || 0) < 15) {
    map.setZoom(15);
  }
}

// 在搜尋結果區顯示提示訊息
function showSearchMessage(message) {
  spotSearchResults.innerHTML = `<div class="spot-search-message">${escapeHtml(message)}</div>`;
}

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

// 把選中的景點加入行程
async function addSpotToItinerary(spot, evt) {
  if (evt) evt.stopPropagation();
  if (!spot) return;

  const targetDays = getActiveDays();
  if (!Array.isArray(targetDays) || !targetDays.length) return;

  // 看 currentDayIndex 決定要加到哪一天
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

function openSpotSearchModal() {
  spotSearchState.isOpen = true;
  spotSearchState.results = [];
  spotSearchState.selectedIndex = -1;
  selectedSpotForAdd = null;

  spotSearchOverlay.classList.add("active");
  spotSearchOverlay.setAttribute("aria-hidden", "false");
  spotSearchResults.innerHTML = "";
  spotSearchInput.value = "";

  // 搜尋時先收起下方面板，避免遮住地圖
  sheet.classList.remove("expanded", "half");
  syncSheetState("sheet-collapsed");

  setTimeout(() => {
    spotSearchInput.focus();
  }, 50);
}

// 關閉搜尋視窗
function closeSpotSearchModal() {
  spotSearchState.isOpen = false;
  spotSearchOverlay.classList.remove("active");
  spotSearchOverlay.setAttribute("aria-hidden", "true");
}

// 渲染搜尋結果列表
function renderSpotSearchResults() {
  if (!spotSearchState.results.length) {
    spotSearchResults.innerHTML = "";
    return;
  }

  const html = spotSearchState.results
    .map((item, index) => {
      const isSelected = index === spotSearchState.selectedIndex;
      const photoUrl =
        item.photos && item.photos[0] && item.photos[0].photo_url
          ? item.photos[0].photo_url
          : "";
      return `
        <button
          type="button"
          class="spot-search-item ${isSelected ? "active" : ""}"
          onclick="selectSpotSearchResult(${index})"
        >
          <div class="spot-search-item-thumb ${photoUrl ? "has-photo" : ""}" ${photoUrl ? `style="background-image:url('${photoUrl}')"` : ""}>
            ${photoUrl ? "" : '<i class="far fa-image"></i>'}
          </div>
          <div class="spot-search-item-body">
            <div class="spot-search-item-main">${item.name || "未命名地點"}</div>
            <div class="spot-search-item-sub">${item.address || "無地址資訊"}</div>
          </div>
        </button>
      `;
    })
    .join("");

  spotSearchResults.innerHTML = html;
}

async function selectSpotSearchResult(index) {
  spotSearchState.selectedIndex = index;
  renderSpotSearchResults();

  // 根據選中的搜尋結果在地圖上顯示資訊，並準備加入行程
  const selectedSpot = spotSearchState.results[index];
  if (!selectedSpot) return;

  selectedSpotForAdd = selectedSpot;
  // 只收起景點清單，不關閉搜尋框
  spotSearchResults.innerHTML = "";

  // 收起 bottom sheet
  sheet.classList.remove("expanded", "half");
  syncSheetState("sheet-collapsed");

  openSpotInfoOnMap(selectedSpot, "載入中...", "載入中...");

  // 搜尋加入行程時，沿用目前所選天數的 weekday。
  const selectedWeekday =
    currentDayIndex >= 0 && currentDayIndex < allDays.length
      ? allDays[currentDayIndex]?.weekday || ""
      : "";

  const { openingHoursText, priceRangeText } =
    await getBusinessInfo(selectedSpot, selectedWeekday);
  if (selectedSpotForAdd === selectedSpot) {
    openSpotInfoOnMap(selectedSpot, openingHoursText, priceRangeText);
  }
}

// 優先使用當前日期的最後一個活動位置，若無則從所有日期的最後活動往前找
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
async function performSpotSearch(
  keyword,
  reqId,
  showNoResultMessage = false,
) {
  try {
    const anchorLocation = getSearchAnchorLocation();
    let response, payload;

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
    showSearchMessage("搜尋失敗，請檢查網路或稍後再試");
  }
}

function triggerSpotSearch(showNoResultMessage = false) {
  const keyword = spotSearchInput.value.trim();
  if (!keyword) {
    showSearchMessage("請先輸入關鍵字");
    return;
  }

  const anchorLocation = getSearchAnchorLocation();
  if (anchorLocation && map && typeof map.panTo === "function") {
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
