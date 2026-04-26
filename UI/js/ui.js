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

function toggleBookmark(iconElement) {
	event.stopPropagation();
	if (iconElement.classList.contains("fas")) {
		iconElement.classList.remove("fas");
		iconElement.classList.add("far");
	} else {
		iconElement.classList.remove("far");
		iconElement.classList.add("fas");
	}
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

	await new Promise((resolve) => setTimeout(resolve, 100));

	const sidebarColors = [
		"#507A8A",
		"#688B58",
		"#B85438",
		"#A47E4A",
		"#513653",
	];

	let htmlContent = `
    <div style="background-color: #FAF8F5; width: 800px; font-family: 'Noto Serif TC', serif; color: #333;">
      <style>
        .pdf-cover {
          width: 800px; height: 1130px;
          background-color: #2D2722;
          background-image: linear-gradient(135deg, #1A1513, #2D2722);
          color: #FFFFFF;
          display: flex; flex-direction: column; justify-content: center; align-items: center;
        }
        .pdf-cover h1 { font-size: 56px; letter-spacing: 4px; margin-bottom: 20px; color: #FFFFFF;}
        .pdf-cover p { font-size: 18px; color: #D4C9A8; letter-spacing: 2px; }

        .pdf-day-page {
          display: flex; width: 800px; min-height: 1120px;
          background-color: #FAF8F5;
        }

        .pdf-sidebar { width: 140px; padding-top: 60px; text-align: center; color: #FFFFFF; flex-shrink: 0; }
        .pdf-sidebar .day-label { font-size: 14px; letter-spacing: 2px; opacity: 0.8; }
        .pdf-sidebar .day-num { font-size: 64px; font-weight: 700; line-height: 1; margin: 10px 0; }
        .pdf-sidebar .day-date { font-size: 14px; opacity: 0.8; }
        .pdf-content { flex-grow: 1; padding: 60px 50px; }
        .pdf-day-title { font-size: 24px; font-weight: 700; border-bottom: 1px solid #E0D8C8; padding-bottom: 20px; margin-bottom: 40px; }
        .pdf-item { display: flex; margin-bottom: 30px; }
        .pdf-item-time { width: 70px; font-size: 16px; color: #888; font-style: italic; flex-shrink: 0; }
        .pdf-item-detail { flex-grow: 1; }
        .pdf-item-title { font-size: 20px; font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 10px; }
        .pdf-item-tag { font-size: 10px; background-color: #EAE3D1; color: #665A48; padding: 2px 8px; border-radius: 4px; }
        .pdf-item-desc { font-size: 15px; color: #666; line-height: 1.6; }
        .pdf-transit { margin: 15px 0 15px 70px; padding-left: 20px; border-left: 1px dashed #CCC; font-size: 14px; color: #A09481; }
        .pdf-transit-badge { background-color: #F4EFEB; padding: 4px 12px; border-radius: 20px; display: inline-block; }
      </style>

      <div class="pdf-cover">
        <p style="margin-bottom: 10px;">JAPAN TRAVEL ITINERARY</p>
        <h1>日本九州之旅</h1>
        <p>${allDays.length} 天深度遊</p>
      </div>
  `;

	allDays.forEach((day, dayIndex) => {
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
            <div class="pdf-item-time">${act.time || "未定"}</div>
            <div class="pdf-item-detail">
              <div class="pdf-item-title">
                ${act.place_name}
                ${act.cost ? `<span class="pdf-item-tag">${act.cost}</span>` : ""}
              </div>
              <div class="pdf-item-desc">${act.description || ""}</div>
            </div>
          </div>
        `;
				if (!isLast) {
					activitiesHtml += `
            <div class="pdf-transit">
              <div class="pdf-transit-badge">
                <i class="fas fa-train"></i> 前往下一站
              </div>
            </div>
          `;
				}
			});
		}

		htmlContent += `
      <div class="pdf-day-page">
        <div class="pdf-sidebar" style="background-color: ${bgColor};">
          <div class="day-label">DAY</div>
          <div class="day-num">${String(day.day).padStart(2, "0")}</div>
          <div class="day-date">${day.weekday || ""}</div>
        </div>
        <div class="pdf-content">
          <div class="pdf-day-title">${topPlaces}</div>
          ${activitiesHtml}
        </div>
      </div>
    `;
	});

	htmlContent += `</div>`;

	const printElement = document.createElement("div");
	printElement.innerHTML = htmlContent;

	const opt = {
		margin: 0,
		filename: "飛遊_精美行程表.pdf",
		image: { type: "jpeg", quality: 0.98 },
		html2canvas: {
			scale: 2,
			useCORS: true,
			scrollY: 0,
			scrollX: 0,
			windowWidth: 800,
		},
		jsPDF: { unit: "px", format: [800, 1131], orientation: "portrait" },
		pagebreak: { mode: "css", before: ".pdf-day-page" },
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

	projects.forEach((project) => {
		const item = document.createElement("div");
		item.className = "trip-item";
		item.innerHTML = `
<div class="trip-info">
  <i class="far fa-bookmark bookmark-icon"></i>
  <div class="trip-text">
    <h4>${project.title || "未命名行程"}</h4>
    <span>${(project.created_at || "").split("T")[0] || ""}</span>
  </div>
</div>`;
		item.addEventListener("click", () => openProject(project));
		list.appendChild(item);
	});
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
		}

		// 強制重新載入資料庫資料
		await loadCoordinatesFirst();
		await initMap();
		createDayButtons();
		displayAllDays();

		// 嘗試補全詳細行程與圖片資訊，讓 openProject 也能顯示照片
		const detailedData = await generateDetailedItinerary();
		if (detailedData) {
			await enrichWithPictureInfo(detailedData);
		}
	} else {
		// 沒 itinerary -> 轉 setup
		sessionStorage.setItem("currentProjectId", project.project_id);
		sessionStorage.setItem("currentProjectTitle", project.title);
		sessionStorage.setItem("navigationType", "forward");
		window.location.href = "setup.html";
	}
}
