// ===== 交通方式選擇器 =====

let _currentTransitBlock = null;
let _defaultTransitMode = 'WALKING';

const _MODES = {
  DRIVING:  { label: '駕車',         icon: 'fas fa-car',     gmMode: 'driving'  },
  TRANSIT:  { label: '搭乘大眾運輸', icon: 'fas fa-train',   gmMode: 'transit'  },
  WALKING:  { label: '步行',         icon: 'fas fa-walking', gmMode: 'walking'  },
  STRAIGHT: { label: '直線距離',     icon: 'fas fa-ruler',   gmMode: 'walking'  },
};

function openTransitModal(block) {
  _currentTransitBlock = block;
  document.getElementById('transitOverlay').classList.add('show');

  Object.keys(_MODES).forEach(k => {
    document.getElementById('tm_' + k)?.classList.remove('selected', 'disabled');
    const info = document.getElementById('tmi_' + k);
    if (info) info.innerHTML = '<span class="tno-route">計算中…</span>';
  });
  document.getElementById('tm_' + _defaultTransitMode)?.classList.add('selected');

  const oLat = parseFloat(block.dataset.originLat);
  const oLng = parseFloat(block.dataset.originLng);
  const dLat = parseFloat(block.dataset.destLat);
  const dLng = parseFloat(block.dataset.destLng);

  if (!isNaN(oLat) && !isNaN(dLat)) {
    _fetchTransitData(oLat, oLng, dLat, dLng);
  } else {
    ['DRIVING', 'TRANSIT', 'WALKING', 'STRAIGHT'].forEach(k => {
      const el = document.getElementById('tmi_' + k);
      if (el) el.innerHTML = '<span class="tno-route">無位置資訊</span>';
    });
  }
}

function closeTransitModal() {
  document.getElementById('transitOverlay').classList.remove('show');
}

function selectTransitMode(mode) {
  if (document.getElementById('tm_' + mode)?.classList.contains('disabled')) return;
  _defaultTransitMode = mode;
  Object.keys(_MODES).forEach(k =>
    document.getElementById('tm_' + k)?.classList.toggle('selected', k === mode)
  );
  if (_currentTransitBlock) _updateBlockDisplay(_currentTransitBlock);
  closeTransitModal();
}

function openGoogleMapsRoute(event, block) {
  event.stopPropagation();
  const gmMode = _MODES[_defaultTransitMode]?.gmMode || 'walking';
  const oLat = block.dataset.originLat;
  const oLng = block.dataset.originLng;
  const dLat = block.dataset.destLat;
  const dLng = block.dataset.destLng;
  let url;
  if (oLat && !isNaN(parseFloat(oLat))) {
    url = `https://www.google.com/maps/dir/?api=1&origin=${oLat},${oLng}&destination=${dLat},${dLng}&travelmode=${gmMode}`;
  } else {
    url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(block.dataset.originName)}&destination=${encodeURIComponent(block.dataset.destName)}&travelmode=${gmMode}`;
  }
  window.open(url, '_blank');
}

function _fetchTransitData(oLat, oLng, dLat, dLng) {
  // 直線距離（Haversine）
  const toRad = x => x * Math.PI / 180;
  const dLa = toRad(dLat - oLat), dLo = toRad(dLng - oLng);
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(toRad(oLat)) * Math.cos(toRad(dLat)) * Math.sin(dLo / 2) ** 2;
  const dist = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const sText = dist < 1 ? `${Math.round(dist * 1000)} 公尺` : `${dist.toFixed(1)} 公里`;
  const sEl = document.getElementById('tmi_STRAIGHT');
  if (sEl) sEl.innerHTML = `<span class="tdist">${sText}</span>`;
  if (_currentTransitBlock) _currentTransitBlock.dataset.cachedSTRAIGHT = sText;

  if (!window.google?.maps) return;
  const ds = new google.maps.DirectionsService();
  const origin = new google.maps.LatLng(oLat, oLng);
  const destination = new google.maps.LatLng(dLat, dLng);

  const now = new Date();
  [
    { key: 'DRIVING', mode: google.maps.TravelMode.DRIVING,  extra: {} },
    { key: 'TRANSIT', mode: google.maps.TravelMode.TRANSIT,  extra: { transitOptions: { departureTime: now } } },
    { key: 'WALKING', mode: google.maps.TravelMode.WALKING,  extra: {} },
  ].forEach(({ key, mode, extra }) => {
    ds.route({ origin, destination, travelMode: mode, ...extra }, (result, status) => {
      const el = document.getElementById('tmi_' + key);
      if (!el) return;
      if (status === 'OK') {
        const leg = result.routes[0].legs[0];
        el.innerHTML = `<span class="tdur">${leg.duration.text}</span><span class="tdist">${leg.distance.text}</span>`;
        if (_currentTransitBlock) {
          _currentTransitBlock.dataset['cached_' + key] = JSON.stringify({ dur: leg.duration.text, dist: leg.distance.text });
          if (key === _defaultTransitMode) _updateBlockDisplay(_currentTransitBlock);
        }
      } else {
        if (key === 'TRANSIT' && _currentTransitBlock) {
          const oLat = _currentTransitBlock.dataset.originLat;
          const oLng = _currentTransitBlock.dataset.originLng;
          const dLat = _currentTransitBlock.dataset.destLat;
          const dLng = _currentTransitBlock.dataset.destLng;
          const url = `https://www.google.com/maps/dir/?api=1&origin=${oLat},${oLng}&destination=${dLat},${dLng}&travelmode=transit`;
          el.innerHTML = `<a class="tdetail-link" href="${url}" target="_blank" onclick="event.stopPropagation()">點選查看詳情</a>`;
        } else {
          el.innerHTML = '<span class="tno-route">目前沒有適用路線</span>';
          document.getElementById('tm_' + key)?.classList.add('disabled');
        }
      }
    });
  });
}

function _updateBlockDisplay(block) {
  const textEl = block.querySelector('.transit-text');
  const iconEl = block.querySelector('.transit-mode-icon');
  if (!textEl || !iconEl) return;

  const mode = _MODES[_defaultTransitMode];
  if (!mode) return;
  iconEl.className = mode.icon + ' transit-mode-icon';

  if (_defaultTransitMode === 'STRAIGHT') {
    const dist = block.dataset.cachedSTRAIGHT || '';
    textEl.textContent = dist ? `直線距離 ${dist}` : '直線距離';
    return;
  }
  const raw = block.dataset['cached_' + _defaultTransitMode];
  if (raw) {
    try {
      const { dur, dist } = JSON.parse(raw);
      const prefix = _defaultTransitMode === 'WALKING' ? '步行距離 ' : '';
      textEl.textContent = `${dur}・${prefix}${dist}`;
    } catch (e) { textEl.textContent = '計算中…'; }
  }
}

async function initTransitBlocks() {
  if (!window.google?.maps?.DirectionsService) return;
  const blocks = document.querySelectorAll('.transit-block[data-origin-lat]');
  if (!blocks.length) return;

  const ds = new google.maps.DirectionsService();
  await Promise.allSettled(Array.from(blocks).map(block => {
    const oLat = parseFloat(block.dataset.originLat);
    const oLng = parseFloat(block.dataset.originLng);
    const dLat = parseFloat(block.dataset.destLat);
    const dLng = parseFloat(block.dataset.destLng);
    if (isNaN(oLat) || isNaN(dLat)) return Promise.resolve();

    return new Promise(resolve => {
      ds.route({
        origin: { lat: oLat, lng: oLng },
        destination: { lat: dLat, lng: dLng },
        travelMode: google.maps.TravelMode.WALKING,
      }, (result, status) => {
        if (status === 'OK') {
          const leg = result.routes[0].legs[0];
          block.dataset['cached_WALKING'] = JSON.stringify({ dur: leg.duration.text, dist: leg.distance.text });
          if (_defaultTransitMode === 'WALKING') _updateBlockDisplay(block);
        }
        resolve();
      });
    });
  }));
}
