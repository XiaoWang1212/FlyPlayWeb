// ===== 編輯模式 =====

function getActiveDays() {
	return isEditMode && editedDays ? editedDays : allDays;
}

function saveCurrentDayOrder(dayIndex) {
	if (dayIndex < 0 || !editedDays || !editedDays[dayIndex]) return;

	const items = Array.from(
		document.querySelectorAll("#timelineList .timeline-item"),
	);
	const ids = items.map((item) => item.dataset.activityId).filter((id) => id);

	if (!ids.length) return;

	const oldActivities = editedDays[dayIndex].activities;
	const newOrder = ids
		.map((id) =>
			oldActivities.find(
				(act) => act.activityId === id || act.place_name === id,
			),
		)
		.filter(Boolean);

	if (newOrder.length === oldActivities.length) {
		editedDays[dayIndex].activities = newOrder;
	}
}

function saveAllDayOrder() {
	if (!editedDays) return;

	const daySections = [];
	let currentSection = null;

	document.querySelectorAll("#timelineList > *").forEach((node) => {
		if (node.matches("[data-day-title]")) {
			currentSection = { activityIds: [] };
			daySections.push(currentSection);
		} else if (
			node.classList &&
			node.classList.contains("timeline-item") &&
			currentSection
		) {
			const activityId = node.dataset.activityId;
			if (activityId) {
				currentSection.activityIds.push(activityId);
			}
		}
	});

	if (!daySections.length) return;

	daySections.forEach((section, idx) => {
		const day = editedDays[idx];
		if (!day || !day.activities) return;

		const ordered = section.activityIds
			.map((id) =>
				day.activities.find(
					(act) => act.activityId === id || act.place_name === id,
				),
			)
			.filter(Boolean);

		if (ordered.length === day.activities.length) {
			day.activities = ordered;
		}
	});
}

function toggleEditMode() {
	event.stopPropagation();

	if (!isEditMode) {
		editedDays = JSON.parse(JSON.stringify(allDays));
		originalTimelineHTML = timelineList.innerHTML;
		isDragChanged = false;
		isEditMode = true;

		timelineView.classList.add("editing");
		editFab.classList.remove("fa-pen");
		editFab.classList.add("fa-times");
		openSheet();
		sortable.option("disabled", false);
		document.getElementById("dragConfirmBtn").classList.remove("show");
	} else {
		if (isDragChanged) {
			timelineList.innerHTML = originalTimelineHTML;
			isDragChanged = false;
		}
		editedDays = null;

		isEditMode = false;
		timelineView.classList.remove("editing");
		editFab.classList.remove("fa-times");
		editFab.classList.add("fa-pen");
		sortable.option("disabled", true);
		document.getElementById("dragConfirmBtn").classList.remove("show");

		if (currentDayIndex === -1) {
			displayAllDays();
		} else {
			displayDay(currentDayIndex);
		}
	}
}

function deleteItem(btnElement) {
	const item = btnElement.closest(".timeline-item");
	if (item) {
		const activityId = item.dataset.activityId;
		item.style.opacity = "0";
		item.style.transform = "translateX(-20px)";
		setTimeout(() => {
			item.remove();
			if (isEditMode && editedDays && currentDayIndex !== -1) {
				editedDays[currentDayIndex].activities = editedDays[
					currentDayIndex
				].activities.filter(
					(act) =>
						act.activityId !== activityId &&
						act.place_name !== activityId,
				);
				isDragChanged = true;
			}
		}, 300);
	}
}

// 新增行程項目（打開搜尋視窗）
function addItem() {
	openSpotSearchModal();
}

function confirmDrag() {
	console.log("新排序已確認，準備更新後端資料...");

	if (currentDayIndex === -1) {
		saveAllDayOrder();
	} else {
		saveCurrentDayOrder(currentDayIndex);
	}

	if (editedDays) {
		allDays = JSON.parse(JSON.stringify(editedDays));
		editedDays = null;
	}

	document.getElementById("dragConfirmBtn").classList.remove("show");
	sortable.option("disabled", true);
	isDragChanged = false;

	isEditMode = false;
	timelineView.classList.remove("editing");
	editFab.classList.remove("fa-times");
	editFab.classList.add("fa-pen");

	if (currentDayIndex === -1) {
		displayAllDays();
	} else {
		displayDay(currentDayIndex);
	}
}
