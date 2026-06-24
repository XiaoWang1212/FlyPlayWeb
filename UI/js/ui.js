// ===== UI 互動功能 =====

function syncSheetState(state) {
	mapContainer.classList.remove(
		"sheet-expanded",
		"sheet-half",
		"sheet-collapsed",
	);
	mapContainer.classList.add(state);

	fabGroup.classList.remove("horizontal", "vertical");
	if (state === "sheet-expanded") {
		fabGroup.classList.add("horizontal");
	} else {
		fabGroup.classList.add("vertical");
	}
}

function openSheet() {
	sheet.classList.add("expanded");
	sheet.classList.remove("half");

	syncSheetState("sheet-expanded");
}

function closeSheet() {
	if (isEditMode) toggleEditMode();
	sheet.classList.remove("expanded", "half");

	syncSheetState("sheet-collapsed");
}

function toggleBottomSheet() {
	if (sheet.classList.contains("expanded")) {
		closeSheet();
	} else {
		openSheet();
	}
}

let startY = 0;
const threshold = 50;

function handleTouchStart(e) {
	startY = e.touches[0].clientY;
}

function handleTouchEnd(e) {
	let endY = e.changedTouches[0].clientY;
	let distance = startY - endY;
	if (distance > threshold) openSheet();
	else if (distance < -threshold) closeSheet();
}

function toggleSidebar() {
	sidebar.classList.toggle("active");
	overlay.classList.toggle("active");
}

const PINNED_PROJECTS_KEY = "pinnedProjectIds";

function getPinnedProjectIds() {
	try {
		const raw = localStorage.getItem(PINNED_PROJECTS_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

function setPinnedProjectIds(ids) {
	localStorage.setItem(PINNED_PROJECTS_KEY, JSON.stringify(ids));
}

function togglePinProject(projectId) {
	const pinnedIds = getPinnedProjectIds();
	const isPinned = pinnedIds.includes(projectId);
	setPinnedProjectIds(
		isPinned
			? pinnedIds.filter((id) => id !== projectId)
			: [projectId, ...pinnedIds],
	);
}

function sortProjectsByPin(projects) {
	const pinnedIds = getPinnedProjectIds();
	const pinnedSet = new Set(pinnedIds);
	const pinned = pinnedIds
		.map((id) => projects.find((p) => p.project_id === id))
		.filter(Boolean);
	const unpinned = projects.filter((p) => !pinnedSet.has(p.project_id));
	return [...pinned, ...unpinned];
}

async function downloadPDF() {
	if (!allDays || allDays.length === 0) {
		alert("目前沒有行程資料可以下載喔！");
		return;
	}

	const loadingOverlay = document.createElement("div");
	loadingOverlay.innerHTML = `
    <div style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.75); z-index: 99999; display: flex; flex-direction: column; justify-content: center; align-items: center; color: white; font-family: 'Noto Serif TC', sans-serif;">
      <i class="fas fa-spinner fa-spin" style="font-size: 50px; margin-bottom: 20px; color: #D4C9A8;"></i>
      <div style="font-size: 18px; letter-spacing: 2px;">正在為您生成精美行程 PDF，請稍候...</div>
    </div>
  `;
	document.body.appendChild(loadingOverlay);

	// === Phase 1：逐天切換地圖並截圖 ===
	const savedDayIndex = currentDayIndex;

	// 關閉底部面板，讓地圖完整顯示
	closeSheet();

	const captureMsg = document.createElement("div");
	captureMsg.style.cssText = "position:fixed;bottom:24px;right:24px;background:rgba(0,0,0,0.72);color:#fff;padding:10px 18px;border-radius:8px;z-index:100000;font-size:14px;font-family:sans-serif;";
	document.body.appendChild(captureMsg);

	const mapImages = [];
	const transitInfos = [];
	const mapEl = document.getElementById("map");
	for (let i = 0; i < allDays.length; i++) {
		captureMsg.textContent = `擷取地圖中 (${i + 1} / ${allDays.length})…`;
		displayDay(i);

		// 先等路線運算（Route.computeRoutes）回應並把路線畫上地圖（異步，需要固定等待）
		await new Promise((resolve) => setTimeout(resolve, 2500));

		// 讀取行程頁面已計算好的交通方式建議，供 PDF 使用
		transitInfos.push(
			Array.from(document.querySelectorAll("#timelineList .transit-block")).map((block) => {
				const textEl = block.querySelector(".transit-text");
				const iconEl = block.querySelector(".transit-mode-icon");
				return {
					text: textEl?.textContent?.trim() || "",
					iconClass: iconEl
						? Array.from(iconEl.classList).filter((c) => c !== "transit-mode-icon").join(" ")
						: "fas fa-train",
				};
			}),
		);

		// 路線畫好後，再用 fitBounds 確保所有景點都在鏡頭內
		const validLocs = (allDays[i].activities || []).filter(
			(a) => a.location && typeof a.location.lat === "number" && typeof a.location.lng === "number" &&
				!(a.location.lat === 0 && a.location.lng === 0)
		);
		if (validLocs.length > 0 && window.google?.maps) {
			const bounds = new google.maps.LatLngBounds();
			validLocs.forEach((a) => bounds.extend({ lat: a.location.lat, lng: a.location.lng }));
			map.fitBounds(bounds, 80);
			// 等 fitBounds 動畫結束，再縮小 1 級確保所有景點有餘白
			await new Promise((resolve) => {
				const timer = setTimeout(resolve, 1500);
				google.maps.event.addListenerOnce(map, "idle", () => {
					clearTimeout(timer);
					map.setZoom(map.getZoom() - 1);
					setTimeout(resolve, 500);
				});
			});
		}

		try {
			const canvas = await html2canvas(mapEl, {
				useCORS: true,
				scale: 1.5,
				logging: false,
				allowTaint: false,
			});
			// 裁成正方形（取短邊，從中央裁切）
			const side = Math.min(canvas.width, canvas.height);
			const squareCanvas = document.createElement("canvas");
			squareCanvas.width = side;
			squareCanvas.height = side;
			squareCanvas.getContext("2d").drawImage(
				canvas,
				(canvas.width - side) / 2, (canvas.height - side) / 2,
				side, side,
				0, 0, side, side
			);
			mapImages.push(squareCanvas.toDataURL("image/jpeg", 0.88));
		} catch (e) {
			console.warn("地圖截圖失敗 day", i, e);
			mapImages.push(null);
		}
	}

	document.body.removeChild(captureMsg);

	// 還原原本的檢視狀態
	if (savedDayIndex === -1) {
		const allBtn = document.querySelector("#dayButtonContainer button:not([data-day-index])");
		if (allBtn) switchDay(-1, allBtn); else displayAllDays();
	} else {
		const dayBtn = document.querySelector(`#dayButtonContainer button[data-day-index="${savedDayIndex}"]`);
		if (dayBtn) switchDay(savedDayIndex, dayBtn); else displayDay(savedDayIndex);
	}

	await new Promise((resolve) => setTimeout(resolve, 100));

	// 用已生成行程當時綁定的目的地組出行程名稱，避免使用者回到旅程規劃頁
	// 重選了目的地卻沒有重新生成時，PDF 仍顯示尚未生成的新目的地
	const currentProjectId =
		sessionStorage.getItem("currentProjectId") ||
		localStorage.getItem("currentProjectId") ||
		"";
	const projectDestsRaw = currentProjectId
		? localStorage.getItem(`projectDestinations_${currentProjectId}`)
		: null;
	const selectedDests = JSON.parse(
		projectDestsRaw || localStorage.getItem("selectedDestinations") || "[]",
	);
	let tripTitle;
	if (selectedDests.length > 0) {
		const countries = [...new Set(selectedDests.map((d) => d.country).filter(Boolean))];
		const cities = selectedDests.map((d) => d.city).filter(Boolean).join("");
		if (cities) {
			tripTitle = countries.length === 1
				? `${countries[0]}${cities}之旅`
				: `${cities}之旅`;
		} else {
			tripTitle = sessionStorage.getItem("currentProjectTitle") || "我的旅程";
		}
	} else {
		tripTitle = sessionStorage.getItem("currentProjectTitle") || "我的旅程";
	}

	const tripSetup = JSON.parse(localStorage.getItem("tripSetup") || "{}");
	const coverMetaParts = [
		tripSetup.departureLabel,
		tripSetup.companionLabel,
		(tripSetup.travelTypeLabels && tripSetup.travelTypeLabels.length > 0
			? tripSetup.travelTypeLabels.join("、")
			: tripSetup.travelTypeLabel) || null,
		tripSetup.tripPaceLabel,
	].filter(Boolean);
	const coverMeta = coverMetaParts.join(" ・ ");

	const sidebarColors = [
		"#507A8A",
		"#688B58",
		"#B85438",
		"#A47E4A",
		"#513653",
		"#6C6F70",
		"#FE7A7B",
	];

	let htmlContent = `
    <div style="background-color: #FAF8F5; width: 800px; font-family: 'Noto Serif TC', serif; color: #333;">
      <style>
        .pdf-cover {
          width: 800px; height: 1131px;
          background-color: #2D2722;
          background-image: linear-gradient(135deg, #1A1513, #2D2722);
          color: #FFFFFF;
          display: flex; flex-direction: column; justify-content: center; align-items: center;
        }
        .pdf-cover h1 { font-size: 56px; letter-spacing: 4px; margin-bottom: 20px; color: #FFFFFF;}
        .pdf-cover p { font-size: 18px; color: #D4C9A8; letter-spacing: 2px; }
        .pdf-cover .pdf-cover-meta { font-size: 12px; color: #A89D85; letter-spacing: 1px; margin-top: 28px; }

        .pdf-day-page {
          display: flex; width: 800px; height: 1131px;
          background-color: #FAF8F5;
          overflow: hidden;
          box-sizing: border-box;
        }

        .pdf-sidebar { width: 140px; padding-top: 60px; text-align: center; color: #FFFFFF; flex-shrink: 0; box-sizing: border-box; }
        .pdf-sidebar .day-label { font-size: 14px; letter-spacing: 2px; opacity: 0.8; }
        .pdf-sidebar .day-num { font-size: 64px; font-weight: 700; line-height: 1; margin: 10px 0; }
        .pdf-sidebar .day-date { font-size: 14px; opacity: 0.8; }
        .pdf-content { flex-grow: 1; padding: 45px 40px; box-sizing: border-box; overflow: hidden; }
        .pdf-content-inner { transform-origin: top left; }
        .pdf-day-title { font-size: 22px; font-weight: 700; border-bottom: 1px solid #E0D8C8; padding-bottom: 16px; margin-bottom: 18px; }
        .pdf-item { margin-bottom: 28px; }
        .pdf-item-detail { flex-grow: 1; }
        .pdf-item-title { font-size: 16px; font-weight: 600; margin-bottom: 5px; display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
        .pdf-item-name { display: flex; align-items: center; gap: 8px; }
        .pdf-item-time { font-size: 11px; font-weight: normal; color: #666; background-color: #F0F0F0; padding: 2px 8px; border-radius: 10px; white-space: nowrap; flex-shrink: 0; }
        .pdf-item-tag { font-size: 10px; background-color: #EAE3D1; color: #665A48; padding: 2px 8px; border-radius: 4px; }
        .pdf-item-desc { font-size: 13px; color: #666; line-height: 1.5; }
        .pdf-transit { margin: 0 0 28px 0; padding-left: 16px; border-left: 1px dashed #CCC; font-size: 12px; color: #A09481; }
        .pdf-transit-badge { background-color: #F4EFEB; padding: 5px 14px; border-radius: 20px; display: inline-block; }
      </style>

      <div class="pdf-cover">
        <p style="margin-bottom: 10px;">TRAVEL ITINERARY</p>
        <h1>${tripTitle}</h1>
        <p>${allDays.length} 天深度遊</p>
        ${coverMeta ? `<p class="pdf-cover-meta">${coverMeta}</p>` : ""}
      </div>
  `;

	for (let dayIndex = 0; dayIndex < allDays.length; dayIndex++) {
		const day = allDays[dayIndex];
		const bgColor = sidebarColors[dayIndex % sidebarColors.length];
		const topPlaces =
			day.activities && day.activities.length > 0
				? day.activities
						.slice(0, 3)
						.map((a) => a.place_name)
						.join("・")
				: "自由活動";

		let activitiesHtml = "";
		if (day.activities) {
			day.activities.forEach((act, actIndex) => {
				const isLast = actIndex === day.activities.length - 1;
				activitiesHtml += `
          <div class="pdf-item">
            <div class="pdf-item-detail">
              <div class="pdf-item-title">
                <span class="pdf-item-name">
                  ${act.place_name}
                  ${act.cost ? `<span class="pdf-item-tag">${act.cost}</span>` : ""}
                </span>
                ${act.time ? `<span class="pdf-item-time">${act.time}</span>` : ""}
              </div>
              <div class="pdf-item-desc">${act.description || ""}</div>
            </div>
          </div>
        `;
				if (!isLast) {
					const transitInfo = transitInfos[dayIndex]?.[actIndex];
					const hasTransitInfo = transitInfo?.text && !transitInfo.text.includes("計算中");
					const transitIcon = hasTransitInfo ? transitInfo.iconClass : "fas fa-train";
					const transitLabel = hasTransitInfo ? transitInfo.text : "前往下一站";
					activitiesHtml += `
            <div class="pdf-transit">
              <div class="pdf-transit-badge">
                <i class="${transitIcon}"></i> ${transitLabel}
              </div>
            </div>
          `;
				}
			});
		}

		const mapImg = mapImages[dayIndex]
			? `<div style="margin-top:100px;display:flex;justify-content:center;">
               <img src="${mapImages[dayIndex]}" style="width:360px;height:360px;object-fit:cover;border-radius:12px;border:1px solid #E0D8C8;display:block;" />
             </div>`
			: "";

		htmlContent += `
      <div class="pdf-day-page">
        <div class="pdf-sidebar" style="background-color: ${bgColor};">
          <div class="day-label">DAY</div>
          <div class="day-num">${String(day.day).padStart(2, "0")}</div>
          <div class="day-date">${day.weekday || ""}</div>
        </div>
        <div class="pdf-content">
          <div class="pdf-content-inner">
            <div class="pdf-day-title">${topPlaces}</div>
            ${activitiesHtml}
            ${mapImg}
          </div>
        </div>
      </div>
    `;
	}

	htmlContent += `</div>`;

	const printElement = document.createElement("div");
	printElement.innerHTML = htmlContent;

	// 量測每天內容的實際高度，超出單頁可用空間時等比縮小至剛好一頁
	const measureContainer = document.createElement("div");
	measureContainer.style.position = "absolute";
	measureContainer.style.top = "0";
	measureContainer.style.left = "-9999px";
	measureContainer.innerHTML = htmlContent;
	document.body.appendChild(measureContainer);

	const measuredContents = measureContainer.querySelectorAll(".pdf-content");
	const printContents = printElement.querySelectorAll(".pdf-content");
	measuredContents.forEach((contentEl, i) => {
		const innerEl = contentEl.querySelector(".pdf-content-inner");
		const targetInnerEl = printContents[i]?.querySelector(".pdf-content-inner");
		if (!innerEl || !targetInnerEl) return;
		const style = window.getComputedStyle(contentEl);
		const availableHeight =
			contentEl.clientHeight -
			parseFloat(style.paddingTop) -
			parseFloat(style.paddingBottom);
		const scale = Math.min(1, availableHeight / innerEl.scrollHeight);
		if (scale < 1) {
			targetInnerEl.style.transform = `scale(${scale})`;
			targetInnerEl.style.width = `${100 / scale}%`;
		}
	});
	document.body.removeChild(measureContainer);

	const opt = {
		margin: 0,
		filename: `飛遊_${tripTitle}.pdf`,
		image: { type: "jpeg", quality: 0.98 },
		html2canvas: {
			scale: 2,
			useCORS: true,
			scrollY: 0,
			scrollX: 0,
			windowWidth: 800,
		},
		jsPDF: { unit: "px", format: [800, 1131], orientation: "portrait" },
		pagebreak: { mode: [] },
	};

	try {
		await html2pdf().set(opt).from(printElement).save();
	} catch (err) {
		console.error("PDF 生成失敗:", err);
		alert("抱歉，PDF 產生過程中發生錯誤，請看控制台 (F12) 的詳細訊息。");
	} finally {
		document.body.removeChild(loadingOverlay);
	}
}

function navigateToSetup(projectId, projectTitle) {
	if (projectId) {
		sessionStorage.setItem("currentProjectId", projectId);
		sessionStorage.setItem("currentProjectTitle", projectTitle || "");
	}
	sessionStorage.setItem("navigationType", "forward");
	window.location.href = "setup.html";
}

// 取今天日期當日期欄位的預設值
function getTodayDateValue() {
	const now = new Date();
	const offset = now.getTimezoneOffset() * 60000;
	return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

// 只更新這次建立行程需要的欄位，保留既有 tripSetup 內容
function saveTripSetupToStorage(patch) {
	const current = JSON.parse(localStorage.getItem("tripSetup") || "{}");
	const next = { ...current, ...patch };
	localStorage.setItem("tripSetup", JSON.stringify(next));
	return next;
}

// 打開新行程彈窗
function openNewTripModal() {
	const modal = document.getElementById("newTripModal");
	const titleInput = document.getElementById("newTripTitleInput");
	const dateInput = document.getElementById("newTripStartDateInput");

	if (!modal || !titleInput || !dateInput) return;

	titleInput.value = "";
	dateInput.value = getTodayDateValue();

	modal.classList.add("active");
	modal.setAttribute("aria-hidden", "false");

	setTimeout(() => {
		titleInput.focus();
	}, 50);
}

// 關閉彈窗
function closeNewTripModal() {
	const modal = document.getElementById("newTripModal");
	if (!modal) return;

	modal.classList.remove("active");
	modal.setAttribute("aria-hidden", "true");
}

// 建立新行程：先寫入日期，再導向 setup 頁
async function submitNewTripModal(event) {
	event.preventDefault();

	if (!userId) {
		alert("請先登入再新增行程");
		window.location.href = "login.html";
		return;
	}

	const titleInput = document.getElementById("newTripTitleInput");
	const dateInput = document.getElementById("newTripStartDateInput");
	const title = titleInput?.value?.trim() || "";
	const startDate = dateInput?.value || getTodayDateValue();

	if (!title) {
		alert("請輸入新行程標題");
		titleInput?.focus();
		return;
	}

	if (!startDate) {
		alert("請選擇開始日期");
		dateInput?.focus();
		return;
	}

	try {
		const resp = await fetch(`${API_BASE}/api/travel/project`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				user_id: userId,
				title,
			}),
		});

		const result = await resp.json().catch(() => ({}));
		if (redirectToLoginIfUnauthorized(resp.status, result)) return;

		if (resp.ok && result.code === 201) {
			saveTripSetupToStorage({ startDate });
			const projectId = result.data.project_id;

			closeNewTripModal();
			navigateToSetup(projectId, title);
		} else {
			alert(result.message || result.error || "新增失敗");
		}
	} catch (err) {
		console.error(err);
		alert("新增失敗，請檢查網路或後端");
	}
}

function renderProjects(projects) {
	const list = document.querySelector(".trip-list");
	if (!list) return console.error("trip-list 不存在");
	list.innerHTML = "";
	if (!Array.isArray(projects) || projects.length === 0) {
		list.innerHTML = "<div class='empty'>尚無行程</div>";
		return;
	}

	const pinnedIds = getPinnedProjectIds();
	const sortedProjects = sortProjectsByPin(projects);

	sortedProjects.forEach((project) => {
		const isPinned = pinnedIds.includes(project.project_id);
		const item = document.createElement("div");
		item.className = "trip-item";
		item.innerHTML = `
<div class="trip-info">
  <i class="${isPinned ? "fas" : "far"} fa-bookmark bookmark-icon"></i>
  <div class="trip-text">
    <h4>${project.title || "未命名行程"}</h4>
    <span>${(project.created_at || "").split("T")[0] || ""}</span>
  </div>
</div>
<button class="trip-more-btn" aria-label="更多選項"><i class="fas fa-ellipsis-v"></i></button>
<div class="trip-dropdown">
  <div class="trip-dropdown-item download-pdf-item"><i class="fas fa-download"></i> 下載PDF</div>
  <div class="trip-dropdown-item danger delete-item"><i class="fas fa-trash"></i> 刪除</div>
</div>`;

		const moreBtn = item.querySelector(".trip-more-btn");
		const dropdown = item.querySelector(".trip-dropdown");
		const bookmarkIcon = item.querySelector(".bookmark-icon");

		bookmarkIcon.addEventListener("click", (e) => {
			e.stopPropagation();
			togglePinProject(project.project_id);
			renderProjects(projects);
		});

		moreBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			const wasOpen = dropdown.classList.contains("open");
			document.querySelectorAll(".trip-dropdown.open").forEach((d) => d.classList.remove("open"));
			if (!wasOpen) {
				const rect = moreBtn.getBoundingClientRect();
				dropdown.style.top = rect.top + "px";
				dropdown.style.left = (rect.right + 4) + "px";
				dropdown.classList.add("open");
			}
		});

		item.querySelector(".download-pdf-item").addEventListener("click", async (e) => {
			e.stopPropagation();
			dropdown.classList.remove("open");
			toggleSidebar();
			await openProject(project);
			downloadPDF();
		});

		item.querySelector(".delete-item").addEventListener("click", async (e) => {
			e.stopPropagation();
			dropdown.classList.remove("open");
			if (!confirm(`確定要刪除「${project.title || "未命名行程"}」嗎？`)) return;
			await deleteProject(project.project_id);
		});

		item.addEventListener("click", () => openProject(project));
		list.appendChild(item);
	});
}

async function deleteProject(projectId) {
	try {
		const res = await fetch(`${API_BASE}/api/travel/project/${projectId}`, {
			method: "DELETE",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
		});
		const body = await res.json().catch(() => ({}));
		if (res.ok) {
			await loadProjects();
		} else {
			alert("刪除失敗，請稍後再試");
		}
	} catch (err) {
		console.error(err);
		alert("刪除失敗，請檢查網路");
	}
}

async function loadProjects() {
	if (!userId || !token) {
		console.log("userId/token 未設定，將導向 login");
		window.location.href = "login.html";
		return;
	}

	const res = await fetch(
		`${API_BASE}/api/travel/projects?user_id=${userId}`,
		{
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
		},
	);
	const body = await res.json().catch(() => ({}));
	if (redirectToLoginIfUnauthorized(res.status, body)) return;
	console.log("loadProjects", res.status, body);
	if (res.ok && body.code === 200) {
		renderProjects(body.data);
	} else {
		console.warn("loadProjects 錯誤", res.status, body);
	}
}

async function openProject(project) {
	const storedToken = localStorage.getItem("userToken");
	sessionStorage.setItem("currentProjectId", String(project.project_id));
	localStorage.setItem("currentProjectId", String(project.project_id));
	const res = await fetch(
		`${API_BASE}/api/travel/itineraries/${project.project_id}`,
		{
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${storedToken}`,
			},
		},
	);
	const body = await res.json().catch(() => ({}));
	if (redirectToLoginIfUnauthorized(res.status, body)) return;
	console.log("openProject", res.status, body);

	if (res.ok && body.code === 200 && body.data && body.data.length > 0) {
		// 更新當前專案標題，並還原此專案的目的地資料（供 downloadPDF 使用）
		sessionStorage.setItem("currentProjectTitle", project.title || "");
		const projectDests = localStorage.getItem(`projectDestinations_${project.project_id}`);
		if (projectDests) {
			localStorage.setItem("selectedDestinations", projectDests);
		} else {
			localStorage.removeItem("selectedDestinations");
		}

		// 保存目前選中的 itinerary，供後續 /data/latlng 與 /api/itinerary/detail 使用
		const latestItinerary = body.data[0];
		if (latestItinerary?.itinerary_id) {
			localStorage.setItem(
				"generatedItinerary",
				JSON.stringify({ itinerary_id: latestItinerary.itinerary_id }),
			);
			localStorage.setItem(
				"currentItineraryId",
				String(latestItinerary.itinerary_id),
			);
			// 優先用 DB 的 start_date；若 DB 為 null（舊行程），
			// 補抓生成時存入的 projectStartDate_${projectId} 本地快取
			const resolvedStartDate =
				latestItinerary.start_date ||
				localStorage.getItem(`projectStartDate_${project.project_id}`) ||
				"";
			localStorage.setItem("currentItineraryStartDate", resolvedStartDate);
			// 每次從 DB 取到有效日期時，也存入 projectStartDate 快取，
			// 確保下次切換行程時 getWeekdayLabel 能直接由專案 id 取到
			if (resolvedStartDate) {
				localStorage.setItem(`projectStartDate_${project.project_id}`, resolvedStartDate);
				saveTripSetupToStorage({ startDate: resolvedStartDate });
			}
		}

		// 強制重新載入資料庫資料
		await loadCoordinatesFirst();
		await initMap();
		createDayButtons();
		displayAllDays();

		// 從 DB 載入 detailed_itinerary 並更新 allDays（補圖已在 setup 階段完成）
		await generateDetailedItinerary();

		if (typeof resetChatConversation === "function") {
			resetChatConversation();
		}
		if (typeof queueChatInitialMessage === "function" && typeof buildChatInitialMessage === "function") {
			queueChatInitialMessage(buildChatInitialMessage(project.title || ""));
		}
	} else {
		// 沒 itinerary -> 轉 setup
		sessionStorage.setItem("currentProjectId", project.project_id);
		sessionStorage.setItem("currentProjectTitle", project.title);
		sessionStorage.setItem("navigationType", "forward");
		window.location.href = "setup.html";
	}
}
