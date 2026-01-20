/**
 * choose_departure.js - 出發地選擇頁面
 * 單選出發地，存到 tripSetup（localStorage）
 */

const departures = [
  { city: "東京", image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=300&fit=crop" },
  { city: "大阪", image: "https://images.unsplash.com/photo-1589452271712-64b8a66c7b71?w=400&h=300&fit=crop" },
  { city: "京都", image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&h=300&fit=crop" },
  { city: "北海道", image: "https://images.unsplash.com/photo-1605099846030-8f67a715a33f?w=400&h=300&fit=crop" },
  { city: "沖繩", image: "https://images.unsplash.com/photo-1544991875-5dc1b05f607d?w=400&h=300&fit=crop" },
  { city: "福岡", image: "https://images.unsplash.com/photo-1578469550956-0e16b69c6a3d?w=400&h=300&fit=crop" },
  { city: "名古屋", image: "https://images.unsplash.com/photo-1584592740039-6f6c049a5b3f?w=400&h=300&fit=crop" },
  { city: "札幌", image: "https://images.unsplash.com/photo-1576675466550-2389afd2b2c4?w=400&h=300&fit=crop" },
  { city: "橫濱", image: "https://images.unsplash.com/photo-1566398618126-16c0fd32e4eb?w=400&h=300&fit=crop" },
  { city: "神戶", image: "https://images.unsplash.com/photo-1624353187199-33b00f9bcdc4?w=400&h=300&fit=crop" },
  { city: "奈良", image: "https://images.unsplash.com/photo-1590559899731-a382839e5549?w=400&h=300&fit=crop" },
  { city: "箱根", image: "https://images.unsplash.com/photo-1578300164804-6746f6ead5c5?w=400&h=300&fit=crop" },
  { city: "熊本", image: "https://images.unsplash.com/photo-1528164344705-47542687000d?w=400&h=300&fit=crop" },
  { city: "仙台", image: "https://images.unsplash.com/photo-1582139329536-e7284fece509?w=400&h=300&fit=crop" },
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
    item.setAttribute("data-search", dep.city.toLowerCase());

    if (dep.image) {
      item.style.backgroundImage = `url('${dep.image}')`;
      item.classList.add("has-image");
    }

    if (dep.city === selectedDepartureCity) item.classList.add("selected");

    item.innerHTML = `<div class="city-name">${dep.city}</div>`;
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

  const basePath = window.location.href.substring(0, window.location.href.lastIndexOf("/") + 1);
  window.location.href = basePath + "setup.html";
}

function searchDeparture() {
  const searchText = document.getElementById("search-input").value.toLowerCase();
  document.querySelectorAll("#departure-list .departure-item").forEach((item) => {
    const searchData = item.getAttribute("data-search") || "";
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