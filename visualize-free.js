/* visualize-free.js
 * Zero-cost Visualize controller.
 *
 * This file intentionally sits after visualize-3d.js and replaces only the public
 * Visualize entrypoints used by the planner. The old Google 3D implementation is
 * kept in the branch as optional/reference code, but the default user experience
 * requires no API key, no billing account and no paid map service.
 */
(function (root) {
  'use strict';

  if (!root || !root.Visualize3D || !root.VisualizeWorld) return;

  const legacy = root.Visualize3D;
  const World = root.VisualizeWorld;
  const Elevation = root.VisualizeElevation;

  let shellReady = false;
  let activeDay = null;
  let activeRouteStatus = null;
  let worldReadyDay = null;
  let renderToken = 0;
  let renderTimer = null;
  let isPlaying = false;
  let speed = 1;
  let cameraMode = 'scenic';
  let stopsWithDistances = [];
  let currentDayData = null;
  let daySchedule = [];
  let currentDriveSeconds = 0;
  let lastHudStopKey = null;
  let toastTimer = 0;
  let currentCardEntry = null;
  let allMode = false;
  let playlist = [];
  let playlistIdx = 0;

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' })[ch];
    });
  }

  function clamp01(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(1, n));
  }

  function dayColorSafe(date) {
    try {
      if (typeof dayColor === 'function') return dayColor(date);
    } catch (_) {}
    return '#56c6a5';
  }

  function dayList() {
    try {
      return (typeof S !== 'undefined' && Array.isArray(S.days)) ? S.days : [];
    } catch (_) {
      return [];
    }
  }

  function selectedDayLabel() {
    try {
      const current = typeof S !== 'undefined' ? S.selectedDay : null;
      if (current && current !== 'all' && dayList().some(function (d) { return d.date === current; })) return current;
    } catch (_) {}

    const preferred = dayList().find(function (d) { return d.date === 'Sep 27'; });
    if (preferred) return preferred.date;
    const routeDay = dayList().find(function (d) { return d.stops && d.stops.length > 1; });
    return routeDay ? routeDay.date : (dayList()[0] ? dayList()[0].date : 'Sep 27');
  }

  function getDayData(date) {
    if (!legacy || typeof legacy.getVisualizeDayData !== 'function') return null;
    return legacy.getVisualizeDayData(date);
  }

  function buildFallbackProfile(dayData, mappedStops) {
    const entries = (mappedStops || []).map(function (entry) {
      const stop = entry.stop || entry;
      let elevation = null;
      try {
        if (legacy && typeof legacy.getLandmarkCameraProfile === 'function') {
          const profile = legacy.getLandmarkCameraProfile(stop);
          elevation = profile && Number(profile.elevation);
        }
      } catch (_) {}
      if (!Number.isFinite(elevation)) elevation = 1500;
      return {
        fraction: Number(entry.fraction || 0),
        elevation: elevation,
        location: { lat: Number(stop.lat), lng: Number(stop.lng) },
        resolution: null
      };
    }).filter(function (s) { return Number.isFinite(s.fraction); });

    entries.sort(function (a, b) { return a.fraction - b.fraction; });
    if (!entries.length) return null;
    if (entries[0].fraction > 0.001) entries.unshift(Object.assign({}, entries[0], { fraction: 0 }));
    if (entries[entries.length - 1].fraction < 0.999) {
      entries.push(Object.assign({}, entries[entries.length - 1], { fraction: 1 }));
    }

    const elevations = entries.map(function (s) { return s.elevation; });
    const min = Math.min.apply(Math, elevations);
    const max = Math.max.apply(Math, elevations);
    return {
      samples: entries,
      stats: {
        minElevation: Math.round(min),
        maxElevation: Math.round(max),
        elevationRange: Math.round(max - min),
        gain: 0,
        loss: 0
      },
      resolution: null,
      status: 'fallback',
      isEstimated: true
    };
  }

  function resolveDayIso(dateLabel) {
    try {
      if (typeof DATE_ISO !== 'undefined' && DATE_ISO && DATE_ISO[dateLabel]) return DATE_ISO[dateLabel];
    } catch (_) {}
    const match = String(dateLabel || '').match(/([A-Za-z]{3})\s+(\d{1,2})/);
    const months = { Jan:'01', Feb:'02', Mar:'03', Apr:'04', May:'05', Jun:'06', Jul:'07', Aug:'08', Sep:'09', Oct:'10', Nov:'11', Dec:'12' };
    if (!match) return '2026-09-27';
    return '2026-' + (months[match[1]] || '09') + '-' + String(Number(match[2])).padStart(2, '0');
  }

  function buildStopSchedule(dayData, mappedStops) {
    const schedule = [];
    if (!dayData || !dayData.day || typeof computeDayTimeline !== 'function') return schedule;
    try {
      const timeline = computeDayTimeline(dayData.day);
      if (!timeline || !Array.isArray(timeline.items)) return schedule;
      const byId = new Map();
      timeline.items.forEach(function (item) {
        if (item && !item.isCut && item.stop && item.stop.id != null) byId.set(String(item.stop.id), item);
      });
      (mappedStops || []).forEach(function (entry) {
        const stop = entry.stop || entry;
        const item = byId.get(String(stop.id));
        if (!item || !Number.isFinite(Number(item.arrMin))) return;
        schedule.push({
          entry: entry,
          stop: stop,
          fraction: Number(entry.fraction || 0),
          elapsedSeconds: Math.max(0, (Number(item.arrMin) - Number(timeline.startMin || 0)) * 60),
          arrDisplay: (item.arrTime && item.arrTime.display) || '',
          stayMin: Number(item.stayMin || 0)
        });
      });
    } catch (_) {}
    schedule.sort(function (a, b) { return a.fraction - b.fraction; });
    return schedule;
  }

  function stopMetaFor(stopId) {
    const key = String(stopId);
    for (let i = 0; i < daySchedule.length; i++) {
      if (String(daySchedule[i].stop.id) === key) return daySchedule[i];
    }
    return null;
  }

  function elapsedAtProgress(progress) {
    const sched = daySchedule;
    const f = clamp01(progress);
    if (!sched.length) return Math.max(0, Number(currentDriveSeconds || 0) * f);
    if (f <= sched[0].fraction) return sched[0].elapsedSeconds;
    for (let i = 1; i < sched.length; i++) {
      if (f <= sched[i].fraction) {
        const a = sched[i - 1];
        const b = sched[i];
        const span = Math.max(1e-9, b.fraction - a.fraction);
        const t = Math.max(0, Math.min(1, (f - a.fraction) / span));
        return a.elapsedSeconds + (b.elapsedSeconds - a.elapsedSeconds) * t;
      }
    }
    return sched[sched.length - 1].elapsedSeconds;
  }

  function formatEta(mins) {
    const m = Math.round(Number(mins || 0));
    if (m < 1) return 'now';
    if (m < 60) return '+' + m + ' min';
    return '+' + Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0') + 'm';
  }

  function cameraLabel(mode) {
    return mode.charAt(0).toUpperCase() + mode.slice(1);
  }

  function buildTimeAnchors(dayData, mappedStops) {
    if (!dayData || !dayData.day || typeof computeDayTimeline !== 'function') return [];
    try {
      const timeline = computeDayTimeline(dayData.day);
      if (!timeline || !Array.isArray(timeline.items)) return [];
      const byId = new Map();
      timeline.items.forEach(function (item) {
        if (item && !item.isCut && item.stop && item.stop.id != null && Number.isFinite(Number(item.arrMin))) {
          byId.set(String(item.stop.id), item);
        }
      });
      return (mappedStops || []).map(function (entry) {
        const stop = entry.stop || entry;
        const item = byId.get(String(stop.id));
        if (!item) return null;
        return {
          fraction: Number(entry.fraction || 0),
          elapsedSeconds: Math.max(0, (Number(item.arrMin) - Number(timeline.startMin || 0)) * 60)
        };
      }).filter(Boolean);
    } catch (_) {
      return [];
    }
  }

  function renderShell() {
    const rootEl = document.getElementById('visualizeview');
    if (!rootEl) return false;

    let noteSeen = false;
    try { noteSeen = !!localStorage.getItem('rockiesFreeNoteSeen'); } catch (_) {}

    const camModes = ['road', 'scenic', 'aerial'].map(function (m) {
      return `<button class="vis-world-mode ${cameraMode === m ? 'active' : ''}" data-free-camera="${m}">${cameraLabel(m)}</button>`;
    }).join('');

    rootEl.innerHTML = `
      <div class="visualize-workspace free-world-workspace" id="visualizeWorkspace">
        <aside class="visualize-sidebar glass" id="visualizeSidebar">
          <div class="vis-sidehead">
            <div class="row">
              <div>
                <div class="ey">FREE 3D ROCKIES WORLD</div>
                <h2 class="vis-sidetitle" id="freeVisTitle">Select a day</h2>
              </div>
              <button class="btn small" id="freeFitBtn">Fit</button>
            </div>
            <div class="vis-dayswitch" id="freeDaySwitch"></div>
          </div>

          <div class="vis-sidebody">
            <div class="vis-free-source-note ${noteSeen ? 'collapsed' : ''}" id="freeSourceNote" title="Tap to expand/collapse">
              <b>$0 terrain world</b>
              <span>OpenStreetMap/OpenFreeMap + AWS Open Terrain. No API key. No billing account.</span>
            </div>

            <div class="vis-day-metric-card" id="freeMetricCard"></div>

            <div class="vis-actions-row free-world-actions">
              <button class="btn primary small" id="freeDriveBtn">▶ Drive route</button>
              <button class="btn small" id="freeMapOnlyBtn">Map only</button>
            </div>

            <div class="vis-free-playback-row">
              <div class="vis-flight-speed-group" role="group" aria-label="Preview speed">
                <button class="vis-speed-btn" data-free-speed="0.5">0.5x</button>
                <button class="vis-speed-btn active" data-free-speed="1">1x</button>
                <button class="vis-speed-btn" data-free-speed="2">2x</button>
              </div>
              <button class="btn small" id="freePauseBtn" disabled>⏸ Pause</button>
              <button class="btn small danger" id="freeStopBtn" disabled>⏹ Stop</button>
            </div>
            <div class="vis-free-preview-note" id="freePreviewNote">Preview speed (not realtime)</div>

            <div class="ey" style="margin:12px 0 6px;">Camera</div>
            <div class="vis-world-camera-modes free-world-camera-modes" role="group" aria-label="World camera height">
              ${camModes}
            </div>
            <div class="vis-free-help">Drag = pan • Right-drag = rotate • Scroll = turn + look • Ctrl-scroll = zoom • Shift-scroll = pan</div>

            <div class="vis-free-live-card" id="freeLiveCard">
              <div class="vis-free-live-top">
                <span class="vis-world-badge">OPEN WORLD</span>
                <span id="freeClock">Trip time</span>
              </div>
              <div class="vis-free-live-main" id="freeLiveMain">Real terrain mesh • real route • real sun-aware relief</div>
              <div class="vis-free-live-detail" id="freeLiveDetail"></div>
              <div class="vis-flight-progress-bar" id="freeProgressBar" role="slider" tabindex="0" aria-label="Drive progress — click or use arrow keys to seek" title="Click to seek"><div class="vis-flight-progress-fill" id="freeProgress"></div></div>
              <div class="vis-free-stopnav">
                <button class="btn small" id="freePrevBtn">‹ Prev stop</button>
                <button class="btn small" id="freeNextBtn">Next stop ›</button>
              </div>
            </div>

            <div class="ey" style="margin:12px 0 6px;">Stops</div>
            <div class="vis-stoplist" id="freeStopList" aria-label="Day stops"></div>
          </div>
        </aside>

        <main class="visualize-main world-mode free-world-main" id="visualizeMain">
          <div class="visualize-world-container" id="visualizeWorldContainer" aria-label="Free 3D terrain world"></div>
          <div class="visualize-overlay hidden" id="freeWorldOverlay"></div>

          <div class="vis-free-map-hud" id="freeMapHud">
            <span class="vis-world-badge">FREE / OPEN DATA</span>
            <span id="freeMapHudText">Terrain model</span>
          </div>
          <button class="btn small hidden" id="freeExitMapOnlyBtn">✕ Show panel</button>
          <div class="vis-stop-toast hidden" id="freeStopToast"></div>
          <div class="vis-map-stop-card hidden" id="freeStopCard"></div>
        </main>
      </div>
    `;

    bindShell();
    shellReady = true;
    return true;
  }

  function ensureShell() {
    const rootEl = document.getElementById('visualizeview');
    if (!rootEl) return false;
    if (!rootEl.querySelector('.free-world-workspace')) return renderShell();
    shellReady = true;
    return true;
  }

  function showOverlay(message, isError) {
    const overlay = document.getElementById('freeWorldOverlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    overlay.innerHTML = `
      <div class="vis-overlay-card glass">
        ${isError ? '<div class="vis-overlay-icon">⚠️</div>' : '<div class="vis-spinner"></div>'}
        <p style="margin-top:12px;">${escapeHtml(message)}</p>
        ${isError ? '<button class="btn" id="freeRetryBtn">Retry free terrain</button><p style="margin-top:10px;font-size:11px;color:#8ba2b5;">You can also pick another day above — the world reloads when its road route is ready.</p>' : ''}
      </div>`;
    if (isError) {
      const retry = document.getElementById('freeRetryBtn');
      if (retry) retry.onclick = function () { renderCurrentDay(false); };
    }
  }

  function hideOverlay() {
    const overlay = document.getElementById('freeWorldOverlay');
    if (overlay) overlay.classList.add('hidden');
  }

  function resetCameraOffsets() {
    try {
      if (root.ROCKIES_FINAL_CAMERA_RIGS && typeof root.ROCKIES_FINAL_CAMERA_RIGS.resetControls === 'function') {
        root.ROCKIES_FINAL_CAMERA_RIGS.resetControls();
      } else if (root.ROCKIES_CAMERA_GESTURES && typeof root.ROCKIES_CAMERA_GESTURES.resetViewOffsets === 'function') {
        root.ROCKIES_CAMERA_GESTURES.resetViewOffsets();
      }
    } catch (_) {}
  }

  function bindShell() {
    const fit = document.getElementById('freeFitBtn');
    if (fit) fit.onclick = function () {
      resetCameraOffsets();
      World.fitRoute(1);
    };

    const drive = document.getElementById('freeDriveBtn');
    if (drive) drive.onclick = function () { startDrive(); };

    const pause = document.getElementById('freePauseBtn');
    if (pause) pause.onclick = function () { togglePause(); };

    const stop = document.getElementById('freeStopBtn');
    if (stop) stop.onclick = function () { stopDrive(true); };

    const mapOnly = document.getElementById('freeMapOnlyBtn');
    if (mapOnly) mapOnly.onclick = function () { toggleMapOnly(); };

    const exitMapOnly = document.getElementById('freeExitMapOnlyBtn');
    if (exitMapOnly) {
      exitMapOnly.onclick = function () { toggleMapOnly(false); };
      const workspace = document.getElementById('visualizeWorkspace');
      if (workspace && workspace.classList.contains('map-only')) exitMapOnly.classList.remove('hidden');
    }

    const note = document.getElementById('freeSourceNote');
    if (note) note.onclick = function () {
      note.classList.toggle('collapsed');
      try { localStorage.setItem('rockiesFreeNoteSeen', '1'); } catch (_) {}
    };

    document.querySelectorAll('[data-free-speed]').forEach(function (btn) {
      btn.onclick = function () {
        setSpeed(Number(btn.dataset.freeSpeed));
      };
    });

    document.querySelectorAll('[data-free-camera]').forEach(function (btn) {
      btn.onclick = function () {
        setCameraMode(btn.dataset.freeCamera);
      };
    });

    const bar = document.getElementById('freeProgressBar');
    if (bar && !bar.__freeSeekBound) {
      bar.__freeSeekBound = true;
      bar.addEventListener('click', function (ev) {
        const rect = bar.getBoundingClientRect();
        if (!rect.width) return;
        seekToFraction((ev.clientX - rect.left) / rect.width);
      });
      bar.addEventListener('keydown', function (ev) {
        if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') {
          ev.preventDefault();
          nudgeProgress(-0.02);
        } else if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') {
          ev.preventDefault();
          nudgeProgress(0.02);
        }
      });
    }

    const prev = document.getElementById('freePrevBtn');
    if (prev) prev.onclick = function () { stepStop(-1); };
    const next = document.getElementById('freeNextBtn');
    if (next) next.onclick = function () { stepStop(1); };
  }

  function renderDayButtons(loadedDate) {
    const switcher = document.getElementById('freeDaySwitch');
    if (!switcher) return;
    const current = allMode ? loadedDate : (activeDay || selectedDayLabel());
    const pills = dayList().map(function (day) {
      const iso = resolveDayIso(day.date);
      const isSelected = day.date === current || iso === current;
      return `<button class="vis-daybtn ${isSelected ? 'on' : ''}" data-free-day="${escapeHtml(day.date)}" data-free-iso="${escapeHtml(iso)}" data-iso="${escapeHtml(iso)}">${escapeHtml(day.date)}</button>`;
    }).join('');
    switcher.innerHTML = `<button class="vis-daybtn ${allMode ? 'on' : ''}" data-free-day="__all" title="Play every day in order">All days</button>` + pills;
    switcher.querySelectorAll('[data-free-day]').forEach(function (btn) {
      btn.onclick = function () { chooseDay(btn.dataset.freeDay); };
    });
  }

  function renderMetrics(dayData) {
    const el = document.getElementById('freeMetricCard');
    if (!el || !dayData) return;
    const color = dayColorSafe(dayData.date);
    const duration = Number(dayData.driveDurationMin || 0);
    const h = Math.floor(duration / 60);
    const m = duration % 60;
    el.innerHTML = `
      <div class="vis-metric-chip" style="border-left:3px solid ${color}">
        <div class="vis-met-val">${Number(dayData.distanceKm || 0).toFixed(1)} km</div>
        <div class="vis-met-lbl">Road</div>
      </div>
      <div class="vis-metric-chip">
        <div class="vis-met-val">${h}h ${m}m</div>
        <div class="vis-met-lbl">Drive</div>
      </div>
      <div class="vis-metric-chip">
        <div class="vis-met-val">${dayData.activeStops.length}</div>
        <div class="vis-met-lbl">Stops</div>
      </div>`;
  }

  function renderStops(dayData) {
    const list = document.getElementById('freeStopList');
    if (!list || !dayData) return;
    if (!dayData.activeStops.length) {
      list.innerHTML = '<div class="vis-empty-stops">No active stops.</div>';
      return;
    }

    list.innerHTML = dayData.activeStops.map(function (stop, index) {
      const isHotel = stop.isHotel || /hotel|sleep/i.test(stop.name || '');
      const badge = isHotel ? 'HOTEL' : (stop.priority === 'must' ? 'MUST' : 'NICE');
      const badgeClass = isHotel ? 'hotel' : (stop.priority === 'must' ? 'must' : 'nice');
      const meta = stopMetaFor(stop.id);
      const sub = meta && (meta.arrDisplay || meta.stayMin)
        ? `<span class="vis-stop-sub">${escapeHtml([meta.arrDisplay, meta.stayMin ? meta.stayMin + ' min' : ''].filter(Boolean).join(' • '))}</span>`
        : '';
      return `
        <button class="vis-stop-item free-stop-button" data-free-stop="${escapeHtml(String(stop.id))}">
          <span class="vis-stop-num">${index + 1}</span>
          <span class="vis-stop-info">
            <span class="vis-stop-name">${escapeHtml(stop.name)}</span>
            <span class="vis-stop-meta"><span class="vis-badge ${badgeClass}">${badge}</span>${sub}</span>
          </span>
        </button>`;
    }).join('');

    list.querySelectorAll('[data-free-stop]').forEach(function (btn) {
      btn.onclick = function () { focusStop(btn.dataset.freeStop); };
    });
  }

  function formatClock(date) {
    if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return 'Trip time';
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Edmonton',
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit'
      }).format(date);
    } catch (_) {
      return date.toLocaleTimeString();
    }
  }

  function markVisitedStops(progress) {
    const key = Math.round(clamp01(progress) * 200);
    if (key === lastHudStopKey) return;
    lastHudStopKey = key;
    document.querySelectorAll('[data-free-stop]').forEach(function (btn) {
      const idx = stopsWithDistances.findIndex(function (entry) {
        const stop = entry.stop || entry;
        return String(stop.id) === btn.dataset.freeStop;
      });
      const frac = idx >= 0 ? Number(stopsWithDistances[idx].fraction || 0) : 1;
      btn.classList.toggle('visited', frac <= progress + 0.001);
    });
  }

  function updateHud(info) {
    if (!info) return;
    const clock = document.getElementById('freeClock');
    const main = document.getElementById('freeLiveMain');
    const progress = document.getElementById('freeProgress');
    const mapHud = document.getElementById('freeMapHudText');
    const clockText = formatClock(info.date);
    if (clock) clock.textContent = clockText;

    const sched = daySchedule;
    let passed = null;
    let next = null;
    for (let i = 0; i < sched.length; i++) {
      if (sched[i].fraction <= info.progress + 0.001) passed = sched[i];
      else if (!next) next = sched[i];
    }
    const nowElapsed = elapsedAtProgress(info.progress);
    if (main) {
      if (passed && next) {
        main.textContent = `Near ${passed.stop.name} • ${clockText} • next ${next.stop.name} ${formatEta((next.elapsedSeconds - nowElapsed) / 60)}`;
      } else if (next) {
        main.textContent = `${clockText} • first up ${next.stop.name} ${formatEta((next.elapsedSeconds - nowElapsed) / 60)}`;
      } else if (passed) {
        main.textContent = `Final stop ${passed.stop.name} • ${clockText}`;
      } else {
        main.textContent = `${clockText} • ${cameraLabel(info.cameraMode || cameraMode)} camera`;
      }
    }
    if (progress) progress.style.width = `${Math.round((info.progress || 0) * 100)}%`;
    if (mapHud) {
      if (next) {
        mapHud.textContent = `${clockText} • → ${next.stop.name} ${formatEta((next.elapsedSeconds - nowElapsed) / 60)}`;
      } else {
        mapHud.textContent = `${clockText} • ${Math.round((info.distanceMeters || 0) / 1000)} / ${Math.round((info.totalDistanceMeters || 0) / 1000)} km • ${cameraLabel(info.cameraMode || cameraMode)}`;
      }
    }
    markVisitedStops(info.progress);
  }

  function updatePlaybackUi() {
    const drive = document.getElementById('freeDriveBtn');
    const pause = document.getElementById('freePauseBtn');
    const stop = document.getElementById('freeStopBtn');
    if (drive) drive.textContent = isPlaying ? 'Driving…' : '▶ Drive route';
    if (pause) {
      pause.disabled = !isPlaying;
      pause.textContent = World.isPaused() ? '▶ Resume' : '⏸ Pause';
    }
    if (stop) stop.disabled = !isPlaying;
  }

  function updatePreviewNote() {
    const el = document.getElementById('freePreviewNote');
    if (!el) return;
    let mins = null;
    try {
      const st = World.getStatus ? World.getStatus() : {};
      const total = Number(st.totalDistanceMeters || 0);
      if (total > 0) {
        if (root.ROCKIES_FINAL_CAMERA_RIGS && typeof root.ROCKIES_FINAL_CAMERA_RIGS.cinematicDurationMs === 'function') {
          mins = Math.round(root.ROCKIES_FINAL_CAMERA_RIGS.cinematicDurationMs(total) / 60000);
        } else {
          mins = Math.max(1, Math.round((total / 1000) * 2.5 / 60));
        }
      }
    } catch (_) {}
    el.textContent = mins ? `Preview speed • ~${mins} min for this day at 1x` : 'Preview speed (not realtime)';
  }

  function setSpeed(value) {
    speed = Number(value) > 0 ? Number(value) : 1;
    World.setSpeed(speed);
    document.querySelectorAll('[data-free-speed]').forEach(function (btn) {
      btn.classList.toggle('active', Number(btn.dataset.freeSpeed) === speed);
    });
  }

  function setCameraMode(mode) {
    cameraMode = ['road', 'scenic', 'aerial'].includes(mode) ? mode : 'road';
    World.setCameraMode(cameraMode);
    document.querySelectorAll('[data-free-camera]').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.freeCamera === cameraMode);
    });
  }

  function toggleMapOnly(force) {
    const workspace = document.getElementById('visualizeWorkspace');
    const btn = document.getElementById('freeMapOnlyBtn');
    const exitBtn = document.getElementById('freeExitMapOnlyBtn');
    if (!workspace) return;
    const next = force === undefined ? !workspace.classList.contains('map-only') : !!force;
    workspace.classList.toggle('map-only', next);
    if (btn) btn.textContent = next ? 'Show panel' : 'Map only';
    if (exitBtn) exitBtn.classList.toggle('hidden', !next);
    World.show();
  }

  function entryIndex(entry) {
    const id = String((entry.stop || entry).id);
    return stopsWithDistances.findIndex(function (e) {
      return String((e.stop || e).id) === id;
    });
  }

  function sortedStops() {
    return stopsWithDistances.slice().sort(function (a, b) {
      return Number(a.fraction || 0) - Number(b.fraction || 0);
    });
  }

  function showStopToast(title, sub) {
    const toast = document.getElementById('freeStopToast');
    if (!toast) return;
    toast.innerHTML = `<div class="vis-stop-toast-title">${escapeHtml(title)}</div>${sub ? `<div class="vis-stop-toast-sub">${escapeHtml(sub)}</div>` : ''}`;
    toast.classList.remove('hidden');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.add('hidden'); }, 2600);
  }

  function hideStopCard() {
    const card = document.getElementById('freeStopCard');
    if (card) card.classList.add('hidden');
    currentCardEntry = null;
    const detail = document.getElementById('freeLiveDetail');
    if (detail) detail.textContent = '';
  }

  function showStopCard(entry) {
    const card = document.getElementById('freeStopCard');
    if (!card || !entry) return;
    const stop = entry.stop || entry;
    const idx = entryIndex(entry);
    const total = stopsWithDistances.length;
    const meta = stopMetaFor(stop.id);
    const isHotel = stop.isHotel || /hotel|sleep/i.test(stop.name || '');
    const badge = isHotel ? 'HOTEL' : (stop.priority === 'must' ? 'MUST' : 'NICE');
    const badgeClass = isHotel ? 'hotel' : (stop.priority === 'must' ? 'must' : 'nice');
    let context = '';
    try {
      if (legacy && typeof legacy.getLandmarkCameraProfile === 'function') {
        const prof = legacy.getLandmarkCameraProfile(stop);
        if (prof && prof.viewContext) context = prof.viewContext;
      }
    } catch (_) {}
    const when = meta && (meta.arrDisplay || meta.stayMin)
      ? [meta.arrDisplay, meta.stayMin ? 'stay ' + meta.stayMin + ' min' : ''].filter(Boolean).join(' • ')
      : '';
    currentCardEntry = entry;
    card.innerHTML = `
      <div class="vis-stop-card-step">Stop ${idx + 1} of ${total}${allMode ? ' • ' + escapeHtml(activeDayLabel()) : ''}</div>
      <div class="vis-stop-card-title">${escapeHtml(stop.name || 'Stop')}</div>
      <div class="vis-stop-card-tags"><span class="vis-badge ${badgeClass}">${badge}</span>${when ? `<span class="vis-pill">${escapeHtml(when)}</span>` : ''}</div>
      ${context ? `<div class="vis-stop-card-context"><span class="vis-context-icon">🏔️</span><span class="vis-context-text">${escapeHtml(context)}</span></div>` : ''}
      <div class="vis-stop-card-actions">
        <button class="btn small" id="freeCardPrevBtn">‹ Prev</button>
        <button class="btn small" id="freeCardNextBtn">Next ›</button>
        <button class="btn small primary" id="freeCardDriveBtn">▶ Drive here</button>
        <button class="btn small" id="freeCardCloseBtn">Close</button>
      </div>`;
    card.classList.remove('hidden');
    const prev = document.getElementById('freeCardPrevBtn');
    const nextBtn = document.getElementById('freeCardNextBtn');
    const driveBtn = document.getElementById('freeCardDriveBtn');
    const close = document.getElementById('freeCardCloseBtn');
    if (prev) prev.onclick = function () { stepStop(-1); };
    if (nextBtn) nextBtn.onclick = function () { stepStop(1); };
    if (driveBtn) driveBtn.onclick = function () {
      hideStopCard();
      seekToFraction(Number(entry.fraction || 0));
      startDrive();
    };
    if (close) close.onclick = function () { hideStopCard(); };
    const detail = document.getElementById('freeLiveDetail');
    if (detail) detail.textContent = context || (stop.name || '');
    document.querySelectorAll('[data-free-stop]').forEach(function (btn) {
      btn.classList.toggle('selected', btn.dataset.freeStop === String(stop.id));
    });
  }

  function activeDayLabel() {
    if (allMode) {
      const day = playlist[playlistIdx];
      return day ? day.date : '';
    }
    return activeDay || '';
  }

  function seekToFraction(fraction) {
    if (!currentDayData || worldReadyDay !== currentDayData.date) return;
    World.setProgress(clamp01(fraction));
    try { if (World.getMap) { const map = World.getMap(); if (map) map.triggerRepaint(); } } catch (_) {}
  }

  function nudgeProgress(delta) {
    let current = 0;
    try {
      const st = World.getStatus ? World.getStatus() : {};
      current = Number(st.progress || 0);
    } catch (_) {}
    seekToFraction(current + delta);
  }

  function stepStop(delta) {
    const ordered = sortedStops();
    if (!ordered.length) return;
    let anchor = null;
    if (currentCardEntry) anchor = Number(currentCardEntry.fraction || 0);
    else {
      try {
        const st = World.getStatus ? World.getStatus() : {};
        anchor = Number(st.progress || 0);
      } catch (_) { anchor = 0; }
    }
    let target = null;
    if (delta > 0) {
      target = ordered.find(function (e) { return Number(e.fraction || 0) > anchor + 0.005; }) || ordered[ordered.length - 1];
    } else {
      for (let i = ordered.length - 1; i >= 0; i--) {
        if (Number(ordered[i].fraction || 0) < anchor - 0.005) { target = ordered[i]; break; }
      }
      target = target || ordered[0];
    }
    seekToFraction(Number(target.fraction || 0));
    showStopCard(target);
  }

  function focusStop(stopId) {
    const idx = stopsWithDistances.findIndex(function (entry) {
      const stop = entry.stop || entry;
      return String(stop.id) === String(stopId);
    });
    if (idx < 0) return;
    const entry = stopsWithDistances[idx];
    const stop = entry.stop || entry;
    World.stop(false);
    isPlaying = false;
    if (World.focusLandmark) {
      World.focusLandmark(stop, null, entry.arrivalDate, Number(entry.fraction || 0));
    } else {
      World.setProgress(Number(entry.fraction || 0));
    }
    updatePlaybackUi();
    showStopCard(entry);
    document.querySelectorAll('[data-free-stop]').forEach(function (btn) {
      const isMatch = btn.dataset.freeStop === String(stopId);
      if (isMatch && typeof btn.scrollIntoView === 'function') {
        try { btn.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (_) {}
      }
    });
  }

  async function renderCurrentDay(autoPlay) {
    if (!ensureShell()) return;
    const token = ++renderToken;
    let date = activeDay || selectedDayLabel();
    if (allMode) {
      if (!playlist.length) {
        showOverlay('All-days tour needs at least one day with stops.', true);
        return;
      }
      playlistIdx = Math.max(0, Math.min(playlistIdx, playlist.length - 1));
      date = playlist[playlistIdx].date;
    }
    const dayData = getDayData(date);
    if (!dayData) return;

    activeRouteStatus = dayData.routeStatus;

    stopsWithDistances = Elevation && typeof Elevation.mapStopsToDistances === 'function'
      ? Elevation.mapStopsToDistances(dayData.activeStops, dayData.routeCoordinates)
      : [];
    daySchedule = buildStopSchedule(dayData, stopsWithDistances);
    currentDriveSeconds = Math.max(60, Number(dayData.driveDurationMin || 0) * 60);
    lastHudStopKey = null;

    activeDay = allMode ? '__all' : date;
    currentDayData = dayData;
    renderDayButtons(date);

    const title = document.getElementById('freeVisTitle');
    if (title) {
      title.textContent = allMode
        ? `All days ${playlistIdx + 1}/${playlist.length} • ${date}: ${dayData.label || ''}`
        : `${date}: ${dayData.label || ''}`;
    }
    renderMetrics(dayData);
    renderStops(dayData);
    hideStopCard();

    if (!dayData.routeCoordinates || dayData.routeCoordinates.length < 2) {
      worldReadyDay = null;
      showOverlay(`Road route for ${date} is still loading. Retry, or pick another day — this view updates automatically when directions finish.`, true);
      return;
    }

    try {
      showOverlay('Loading free Canadian Rockies terrain mesh…', false);
      await World.initialize(document.getElementById('visualizeWorldContainer'));
      if (token !== renderToken) return;

      const fallbackProfile = buildFallbackProfile(dayData, stopsWithDistances);
      const timeAnchors = daySchedule.map(function (s) {
        return { fraction: s.fraction, elapsedSeconds: s.elapsedSeconds };
      });

      World.loadDay({
        routeCoordinates: dayData.routeCoordinates,
        elevationProfile: fallbackProfile,
        stopsWithDistances: stopsWithDistances,
        dateISO: resolveDayIso(dayData.date),
        startTime: dayData.start || '08:00',
        driveDurationSeconds: currentDriveSeconds,
        timeAnchors: timeAnchors,
        handlers: {
          onProgress: updateHud,
          onStop: function (stop, i) {
            if (!stop) return;
            document.querySelectorAll('[data-free-stop]').forEach(function (btn) {
              btn.classList.toggle('selected', btn.dataset.freeStop === String(stop.id));
            });
            const total = stopsWithDistances.length;
            const meta = stopMetaFor(stop.id);
            showStopToast(
              `Stop ${(Number(i) || 0) + 1} of ${total} • ${stop.name || ''}`,
              meta && meta.arrDisplay ? `Planned arrival ${meta.arrDisplay}` : ''
            );
          },
          onEnd: function () {
            if (allMode && playlistIdx < playlist.length - 1) {
              playlistIdx += 1;
              const nextDay = playlist[playlistIdx];
              showStopToast(`Day complete • next: ${nextDay.date}`, nextDay.label || '');
              renderCurrentDay(true);
              return;
            }
            if (allMode) showStopToast('All-days tour complete', 'Pick a day to replay it.');
            isPlaying = false;
            updatePlaybackUi();
          }
        }
      });
      World.setCameraMode(cameraMode);
      World.setSpeed(speed);
      worldReadyDay = dayData.date;
      updatePreviewNote();
      hideOverlay();

      if (autoPlay) {
        isPlaying = true;
        World.setProgress(0);
        World.play({ speed: speed, cameraMode: cameraMode });
      } else {
        isPlaying = false;
        World.fitRoute(0);
      }
      updatePlaybackUi();
    } catch (err) {
      if (token !== renderToken) return;
      isPlaying = false;
      updatePlaybackUi();
      showOverlay('Free terrain could not load. Check network access to OpenFreeMap/AWS Open Data and retry. ' + (err && err.message ? err.message : String(err)), true);
    }
  }

  function scheduleRender(autoPlay) {
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(function () { renderCurrentDay(!!autoPlay); }, 180);
  }

  function chooseDay(date) {
    if (!date || date === 'all') date = selectedDayLabel();
    if (date === '__all') {
      const previous = activeDay;
      allMode = true;
      playlist = dayList().filter(function (d) { return d.stops && d.stops.length; });
      playlistIdx = 0;
      if (isPlaying && previous !== '__all') stopDrive(false);
      renderCurrentDay(false);
      return;
    }
    const previous = activeDay;
    const matched = dayList().find(function (d) {
      return d.date === date || resolveDayIso(d.date) === date;
    });
    if (matched) date = matched.date;
    allMode = false;
    playlist = [];
    playlistIdx = 0;
    activeDay = date;

    try {
      if (typeof S !== 'undefined') {
        const changed = S.selectedDay !== date;
        S.selectedDay = date;
        if (changed && typeof persist === 'function') persist();
      }
    } catch (_) {}

    if (isPlaying && previous !== date) stopDrive(false);
    renderCurrentDay(false);
  }

  function onActivate() {
    ensureShell();
    if (!allMode) {
      const desired = selectedDayLabel();
      if (!activeDay) activeDay = desired;
    }
    renderCurrentDay(false);
  }

  function startDrive() {
    if (!currentDayData || worldReadyDay !== currentDayData.date) {
      renderCurrentDay(true);
      return;
    }
    if (isPlaying) return;
    isPlaying = true;
    World.setSpeed(speed);
    World.setCameraMode(cameraMode);
    World.play({ speed: speed, cameraMode: cameraMode });
    updatePlaybackUi();
  }

  function togglePause() {
    if (!isPlaying) return;
    World.togglePause();
    updatePlaybackUi();
  }

  function stopDrive(restoreFit) {
    World.stop(!!restoreFit);
    isPlaying = false;
    updatePlaybackUi();
  }

  function publicChooseDay(date) {
    // app.js calls this when OSRM legs finish. Avoid a camera reset for every
    // partial leg; only rebuild when the same day's final route becomes ready.
    if (allMode) {
      const loaded = playlist[playlistIdx];
      if (!loaded || String(date) !== String(loaded.date)) return;
      const latest = getDayData(date);
      if (!latest) return;
      if (!isPlaying && latest.routeStatus === 'ready' && activeRouteStatus !== 'ready') {
        activeRouteStatus = 'ready';
        scheduleRender(false);
      }
      return;
    }
    const sameDay = String(date) === String(activeDay);
    if (!sameDay) {
      chooseDay(date);
      return;
    }
    const latest = getDayData(date);
    if (!latest) return;
    if (!isPlaying && latest.routeStatus === 'ready' && activeRouteStatus !== 'ready') {
      activeRouteStatus = 'ready';
      scheduleRender(false);
    }
  }

  function findDayWithStop(stopId) {
    const days = dayList();
    for (let i = 0; i < days.length; i++) {
      const stops = days[i].stops || [];
      for (let j = 0; j < stops.length; j++) {
        if (String(stops[j].id) === String(stopId)) return days[i].date;
      }
    }
    return null;
  }

  function selectStopById(stopId) {
    if (!shellReady) onActivate();
    const ownerDay = findDayWithStop(stopId);
    if (ownerDay && !allMode && String(activeDay) !== String(ownerDay)) {
      chooseDay(ownerDay);
    }
    let tries = 0;
    (function attempt() {
      const idx = stopsWithDistances.findIndex(function (entry) {
        const stop = entry.stop || entry;
        return String(stop.id) === String(stopId);
      });
      if (idx >= 0 && worldReadyDay) {
        focusStop(stopId);
        return;
      }
      tries += 1;
      if (tries < 32) setTimeout(attempt, 250);
    })();
  }

  // Replace only public entry points used by app.js/hash navigation. The old
  // Google implementation remains available in source history, but no paid API
  // is required by the active Visualize experience.
  legacy.onVisualizeTabActivated = onActivate;
  legacy.chooseVisualizeDay = publicChooseDay;
  legacy.startRouteFlyThrough = startDrive;
  legacy.cancelRouteFlyThrough = stopDrive;
  legacy.togglePauseFlyThrough = togglePause;
  legacy.toggleMapOnly = toggleMapOnly;
  legacy.selectStopById = selectStopById;
  legacy.setFlightSpeed = setSpeed;
  legacy.setWorldCameraMode = setCameraMode;

  legacy.getFreeWorldStatus = function () {
    return {
      activeDay: activeDay,
      readyDay: worldReadyDay,
      playing: isPlaying,
      speed: speed,
      cameraMode: cameraMode,
      allMode: allMode,
      renderer: World.getStatus(),
      paidApiRequired: false
    };
  };

  function maybeActivateFromHash() {
    const vis = document.getElementById('visualizeview');
    const hash = (root.location && root.location.hash || '').replace(/^#/, '');
    if ((vis && vis.classList.contains('on')) || hash.indexOf('visualizeview') === 0) {
      onActivate();
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        setTimeout(maybeActivateFromHash, 0);
      });
    } else {
      setTimeout(maybeActivateFromHash, 0);
    }
    root.addEventListener('hashchange', function () { setTimeout(maybeActivateFromHash, 0); });
    document.addEventListener('keydown', function (ev) {
      const vis = document.getElementById('visualizeview');
      if (!vis || !vis.classList.contains('on')) return;
      const target = ev.target;
      if (target && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target.tagName)) return;
      if (ev.code === 'Space') {
        if (isPlaying) {
          ev.preventDefault();
          togglePause();
        }
      } else if (ev.key === 'Escape') {
        const workspace = document.getElementById('visualizeWorkspace');
        if (workspace && workspace.classList.contains('map-only')) {
          toggleMapOnly(false);
        } else if (root.ROCKIES_CAMERA_GESTURES && typeof root.ROCKIES_CAMERA_GESTURES.isOrbiting === 'function') {
          try {
            if (root.ROCKIES_CAMERA_GESTURES.isOrbiting()) root.ROCKIES_CAMERA_GESTURES.stopOrbit();
          } catch (_) {}
        }
      }
    });
  }
})(typeof window !== 'undefined' ? window : null);
