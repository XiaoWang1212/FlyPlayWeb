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
  });
  // 讀取該 block 的最佳模式
  const bestMode = block.dataset.bestMode || 'WALKING';
  document.getElementById('tm_' + bestMode)?.classList.add('selected');

  // 檢查是否已有計算結果
  const hasResults = ['DRIVING', 'TRANSIT', 'WALKING'].some(mode => block.dataset['cached_' + mode]);
  
  if (hasResults) {
    // 已有數據，從 block 讀取並顯示
    ['DRIVING', 'TRANSIT', 'WALKING'].forEach(modeKey => {
      const el = document.getElementById('tmi_' + modeKey);
      const raw = block.dataset['cached_' + modeKey];
      if (el && raw) {
        try {
          const { dur, dist } = JSON.parse(raw);
          
          // 如果是大眾運輸，檢查走路時間是否 <= 5 分鐘
          if (modeKey === 'TRANSIT') {
            const walkingRaw = block.dataset['cached_WALKING'];
            if (walkingRaw) {
              try {
                const { dur: walkDur } = JSON.parse(walkingRaw);
                const _wh = String(walkDur).match(/(\d+)\s*小時/);
                const _wm = String(walkDur).match(/(\d+)\s*分/);
                const walkMinutes = (_wh ? parseInt(_wh[1], 10) * 60 : 0) + (_wm ? parseInt(_wm[1], 10) : 0);
                if (walkMinutes <= 5) {
                  el.innerHTML = `<span class="tno-route">建議步行</span>`;
                  document.getElementById('tm_TRANSIT')?.classList.add('disabled');
                  return;
                }
              } catch (e) {}
            }
          }
          
          el.innerHTML = `<span class="ttime">${dur}</span> <span class="tdist">${dist}</span>`;
        } catch (e) {
          el.innerHTML = '<span class="tno-route">無法計算</span>';
        }
      }
    });
    // 直線距離
    const sEl = document.getElementById('tmi_STRAIGHT');
    if (sEl && block.dataset.cached_STRAIGHT) {
      sEl.innerHTML = `<span class="tdist">${block.dataset.cached_STRAIGHT}</span>`;
    }
  } else {
    // 沒有數據，重新計算
    Object.keys(_MODES).forEach(k => {
      const info = document.getElementById('tmi_' + k);
      if (info) info.innerHTML = '<span class="tno-route">計算中…</span>';
    });

    const oLat = parseFloat(block.dataset.originLat);
    const oLng = parseFloat(block.dataset.originLng);
    const dLat = parseFloat(block.dataset.destLat);
    const dLng = parseFloat(block.dataset.destLng);

    if (!isNaN(oLat) && !isNaN(dLat)) {
      _fetchTransitDataForModal(oLat, oLng, dLat, dLng);
    } else {
      ['DRIVING', 'TRANSIT', 'WALKING', 'STRAIGHT'].forEach(k => {
        const el = document.getElementById('tmi_' + k);
        if (el) el.innerHTML = '<span class="tno-route">無位置資訊</span>';
      });
    }
  }
}

function closeTransitModal() {
  document.getElementById('transitOverlay').classList.remove('show');
}

function selectTransitMode(mode) {
  if (document.getElementById('tm_' + mode)?.classList.contains('disabled')) return;
  // 保存到該 block 的 dataset
  if (_currentTransitBlock) {
    _currentTransitBlock.dataset.bestMode = mode;
  }
  Object.keys(_MODES).forEach(k =>
    document.getElementById('tm_' + k)?.classList.toggle('selected', k === mode)
  );
  if (_currentTransitBlock) _updateBlockDisplay(_currentTransitBlock);
  closeTransitModal();
}

function openGoogleMapsRoute(event, block) {
  event.stopPropagation();
  const bestMode = block.dataset.bestMode || 'WALKING';
  const gmMode = _MODES[bestMode]?.gmMode || 'walking';
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

async function _fetchTransitData(oLat, oLng, dLat, dLng, block = null, autoSelectFastest = false) {
  // 直線距離（Haversine）
  const toRad = x => x * Math.PI / 180;
  const dLa = toRad(dLat - oLat), dLo = toRad(dLng - oLng);
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(toRad(oLat)) * Math.cos(toRad(dLat)) * Math.sin(dLo / 2) ** 2;
  const dist = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const sText = dist < 1 ? `${Math.round(dist * 1000)} 公尺` : `${dist.toFixed(1)} 公里`;
  if (block) block.dataset.cached_STRAIGHT = sText;

  const origin = { latitude: oLat, longitude: oLng };
  const destination = { latitude: dLat, longitude: dLng };

  // 記錄各模式的耗時（分鐘），用於判斷最快模式
  const modeDurations = {};

  const promises = ['DRIVING', 'TRANSIT', 'WALKING'].map(async (modeKey) => {
    try {
      const isTransit = modeKey === 'TRANSIT';
      const endpoint = isTransit ? 'estimate_transit' : 'route_details';
      const bodyPayload = { origin, destination };
      if (!isTransit) bodyPayload.mode = modeKey.toLowerCase();

      const response = await fetch(`${API_BASE}/api/maps/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('userToken')}`
        },
        body: JSON.stringify(bodyPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        let durationText, distanceText, durationMinutes;

        if (isTransit) {
          durationMinutes = data.duration_minutes;
          const _th = Math.floor(durationMinutes / 60);
          const _tm = durationMinutes % 60;
          durationText = _th > 0 ? `${_th} 小時 ${_tm} 分` : `${_tm} 分`;
          distanceText = `(估算)`;
        } else {
          durationText = data.duration;
          distanceText = data.distance;
          let hours = 0, minutes = 0;
          const hourMatch = durationText.match(/(\d+)\s*小時/);
          const minMatch = durationText.match(/(\d+)\s*分/);
          if (hourMatch) hours = parseInt(hourMatch[1], 10);
          if (minMatch) minutes = parseInt(minMatch[1], 10);
          durationMinutes = (hourMatch || minMatch) ? hours * 60 + minutes : 999;
        }

        modeDurations[modeKey] = durationMinutes;
        if (block) {
          block.dataset['cached_' + modeKey] = JSON.stringify({ dur: durationText, dist: distanceText });
        }
      } else {
        throw new Error(data.error || '計算失敗');
      }
    } catch (error) {
      console.error(`Route calculation failed for mode ${modeKey}:`, error);
    }
  });

  await Promise.all(promises);

  if (block && autoSelectFastest) {
    if (modeDurations['WALKING'] !== undefined && modeDurations['WALKING'] <= 15) {
      block.dataset.bestMode = 'WALKING';
    } else {
      // 否則選擇最快的模式
      const validModes = Object.entries(modeDurations)
        .filter(([_, minutes]) => minutes < 999)
        .sort(([_, a], [__, b]) => a - b);
      
      if (validModes.length > 0) {
        block.dataset.bestMode = validModes[0][0];
      }
    }
  }
}

function _updateBlockDisplay(block) {
  const textEl = block.querySelector('.transit-text');
  const iconEl = block.querySelector('.transit-mode-icon');
  if (!textEl || !iconEl) return;

  // 使用該 block 的 bestMode
  const bestMode = block.dataset.bestMode || 'WALKING';
  const mode = _MODES[bestMode];
  if (!mode) return;
  iconEl.className = mode.icon + ' transit-mode-icon';

  if (bestMode === 'STRAIGHT') {
    const dist = block.dataset.cachedSTRAIGHT || '';
    textEl.textContent = dist ? `直線距離 ${dist}` : '直線距離';
    return;
  }
  const raw = block.dataset['cached_' + bestMode];
  if (raw) {
    try {
      const { dur, dist } = JSON.parse(raw);
      const prefix = bestMode === 'WALKING' ? '步行距離 ' : '';
      textEl.textContent = `${dur}・${prefix}${dist}`;
    } catch (e) { textEl.textContent = '計算中…'; }
  }
}

async function _fetchTransitDataForModal(oLat, oLng, dLat, dLng) {
  const origin = { latitude: oLat, longitude: oLng };
  const destination = { latitude: dLat, longitude: dLng };

  const promises = ['DRIVING', 'TRANSIT', 'WALKING'].map(async (modeKey) => {
    const el = document.getElementById('tmi_' + modeKey);
    if (!el) return;

    try {
      const isTransit = modeKey === 'TRANSIT';
      const endpoint = isTransit ? 'estimate_transit' : 'route_details';
      const bodyPayload = { origin, destination };
      if (!isTransit) bodyPayload.mode = modeKey.toLowerCase();

      const response = await fetch(`${API_BASE}/api/maps/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('userToken')}`
        },
        body: JSON.stringify(bodyPayload)
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      if (data.success) {
        let durationText, distanceText;
        if (isTransit) {
          const _th = Math.floor(data.duration_minutes / 60);
          const _tm = data.duration_minutes % 60;
          durationText = _th > 0 ? `${_th} 小時 ${_tm} 分` : `${_tm} 分`;
          distanceText = `(估算)`;
        } else {
          durationText = data.duration;
          distanceText = data.distance;
        }
        el.innerHTML = `<span class="ttime">${durationText}</span> <span class="tdist">${distanceText}</span>`;
      } else {
        throw new Error(data.error || '計算失敗');
      }
    } catch (error) {
      console.error(`Route calculation failed for mode ${modeKey}:`, error);
      el.innerHTML = `<span class="tno-route">無法計算</span>`;
      document.getElementById('tm_' + modeKey)?.classList.add('disabled');
    }
  });

  await Promise.all(promises);
  
  // 計算完成後，檢查走路時間，如果 <= 5 分鐘，在大眾運輸顯示「建議步行」
  const walkingEl = document.getElementById('tmi_WALKING');
  const transitEl = document.getElementById('tmi_TRANSIT');
  if (walkingEl && transitEl) {
    const walkingText = walkingEl.textContent || '';
    const _wh = walkingText.match(/(\d+)\s*小時/);
    const _wm = walkingText.match(/(\d+)\s*分/);
    const walkMinutes = (_wh ? parseInt(_wh[1], 10) * 60 : 0) + (_wm ? parseInt(_wm[1], 10) : 0);
    if (walkMinutes <= 5) {
      transitEl.innerHTML = `<span class="tno-route">建議步行</span>`;
      document.getElementById('tm_TRANSIT')?.classList.add('disabled');
    }
  }
}

async function initTransitBlocks() {
  // 頁面載入完成時，自動計算所有 transit block 的時間並選擇最佳方案
  const transitBlocks = document.querySelectorAll('.transit-block');
  
  for (const block of transitBlocks) {
    const oLat = parseFloat(block.dataset.originLat);
    const oLng = parseFloat(block.dataset.originLng);
    const dLat = parseFloat(block.dataset.destLat);
    const dLng = parseFloat(block.dataset.destLng);

    // 確保坐標有效
    if (!isNaN(oLat) && !isNaN(oLng) && !isNaN(dLat) && !isNaN(dLng)) {
      // 自動計算並選擇最佳模式，將 block 傳入
      await _fetchTransitData(oLat, oLng, dLat, dLng, block, true);
      _updateBlockDisplay(block);
    }
  }
}
