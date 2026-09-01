/* Adaptive map route clock.
 * Visualizes the existing live road-routing + timeline engine directly on the map.
 * No itinerary schema changes: stop order, priority, coordinates, start time and stayMin remain authoritative.
 */
(function () {
  const UI_KEY = 'bj-route-clock-expanded-v1';
  let routeClockExpanded = localStorage.getItem(UI_KEY) !== '0';

  function isMapActive() {
    const v = document.getElementById('mapview');
    return !!v && v.classList.contains('on');
  }

  function timedItemsFor(day) {
    const tl = computeDayTimeline(day);
    return {
      timeline: tl,
      timed: tl.items.filter(function (it) {
        return !it.isCut && !it.isOptionPending && it.arrMin != null && it.depMin != null;
      }),
      options: tl.items.filter(function (it) { return !!it.isOptionPending; })
    };
  }

  function roadStatusForItems(items) {
    let pending = 0;
    let ready = 0;
    for (let i = 1; i < items.length; i++) {
      const leg = getLeg(items[i - 1].stop, items[i].stop);
      if (leg.status === 'ready') ready++;
      else pending++;
    }
    return { pending: pending, ready: ready, total: Math.max(0, items.length - 1) };
  }

  function extraBefore(item, previousItem) {
    if (!item || !previousItem || !item.prevLeg || item.arrMin == null || previousItem.depMin == null) return 0;
    return Math.max(0, Math.round(item.arrMin - previousItem.depMin - item.prevLeg.driveMin));
  }

  function extraLabel(extra) {
    if (!extra) return '';
    const buffer = Math.max(0, Number(S.settings.bufferMin || 0));
    if (extra > buffer + 2) {
      const meal = Math.max(0, extra - buffer);
      return (buffer ? '+' + buffer + 'm buffer' : '') + (meal ? (buffer ? ' + ' : '+') + meal + 'm meal/wait' : '');
    }
    return '+' + extra + 'm buffer';
  }

  function shortName(stop) {
    const inf = getSpotInfo(stop);
    return inf.title || stop.name;
  }

  function renderAllDaysClock(root) {
    const days = S.days.map(function (d, i) {
      const data = timedItemsFor(d);
      const status = roadStatusForItems(data.timed);
      const tl = data.timeline;
      return '<button class="route-clock-day" onclick="chooseDay(\'' + d.date + '\')">' +
        '<span class="route-clock-day-num">D' + (i + 1) + '</span>' +
        '<span class="route-clock-day-copy"><b>' + escapeHtml(d.date + ' • ' + d.label) + '</b><small>' +
        escapeHtml(formatMinutesToTime(tl.startMin).display) + ' → ' + escapeHtml(tl.finishTime.display) +
        ' • ' + escapeHtml(tl.totalDistKm) + ' km • ' + escapeHtml(formatDuration(tl.totalDriveMin)) + ' drive' +
        (status.pending ? ' • updating' : '') +
        '</small></span><span>›</span></button>';
    }).join('');

    root.innerHTML =
      '<div class="route-clock-head"><div><small>ADAPTIVE ROUTE CLOCK</small><b>Whole trip</b></div>' +
      '<button class="route-clock-collapse" onclick="toggleAdaptiveRouteClock()">' + (routeClockExpanded ? '−' : '+') + '</button></div>' +
      (routeClockExpanded ? '<div class="route-clock-days">' + days + '</div>' : '');
  }

  function renderDayClock(root, day) {
    const data = timedItemsFor(day);
    const tl = data.timeline;
    const items = data.timed;
    const status = roadStatusForItems(items);
    const cutCount = day.stops.filter(function (s) { return s.priority === 'cut'; }).length;

    let rows = '';
    let previous = null;
    items.forEach(function (it, visibleIndex) {
      const stop = it.stop;
      const extra = extraBefore(it, previous);
      const leg = it.prevLeg;
      const legState = previous ? getLeg(previous.stop, stop).status : 'ready';
      const legLine = previous && leg
        ? '<div class="route-clock-leg ' + (legState === 'ready' ? 'ready' : 'pending') + '">' +
            '<span>' + (legState === 'ready' ? '↳' : '↳ ~') + ' ' + escapeHtml(leg.durText) + ' drive</span>' +
            '<span>' + escapeHtml(leg.distKm) + ' km</span>' +
            (extra ? '<span>' + escapeHtml(extraLabel(extra)) + '</span>' : '') +
          '</div>'
        : '';

      rows += '<div class="route-clock-row" onclick="focusAdaptiveStop(' + stop.lat + ',' + stop.lng + ')">' +
        legLine +
        '<div class="route-clock-stop">' +
          '<div class="route-clock-number">' + (visibleIndex + 1) + '</div>' +
          '<div class="route-clock-name"><b>' + escapeHtml(shortName(stop)) + '</b><small>' + escapeHtml(stop.priority.toUpperCase()) + '</small></div>' +
          '<div class="route-clock-time"><small>ARRIVE</small><b>' + escapeHtml(it.arrTime.display) + '</b></div>' +
          '<label class="route-clock-stay" onclick="event.stopPropagation()"><small>STAY</small><span><input type="number" min="0" step="5" value="' + Number(it.stayMin || 0) + '" onchange="setAdaptiveRouteStay(\'' + day.date + '\',\'' + escapeAttr(stop.id) + '\',this.value)"> min</span></label>' +
          '<div class="route-clock-time depart"><small>LEAVE</small><b>' + escapeHtml(it.depTime.display) + '</b></div>' +
        '</div>' +
      '</div>';
      previous = it;
    });

    const options = data.options.length
      ? '<div class="route-clock-options"><b>Not timed until chosen:</b> ' + data.options.map(function (it) { return escapeHtml(shortName(it.stop)); }).join(' • ') + '</div>'
      : '';

    const statusText = status.pending
      ? status.pending + ' road leg' + (status.pending === 1 ? '' : 's') + ' updating — ETAs currently use temporary estimates'
      : (status.total ? 'Road times loaded for all ' + status.total + ' legs' : 'No driving leg yet');

    const sunWarn = tl.afterSunset
      ? '<span class="route-clock-warn">Finishes after sunset</span>'
      : '';

    root.innerHTML =
      '<div class="route-clock-head">' +
        '<div><small>ADAPTIVE ROUTE CLOCK • ' + escapeHtml(day.date) + '</small><b>' + escapeHtml(formatMinutesToTime(tl.startMin).display) + ' → ' + escapeHtml(tl.finishTime.display) + '</b></div>' +
        '<button class="route-clock-collapse" onclick="toggleAdaptiveRouteClock()">' + (routeClockExpanded ? '−' : '+') + '</button>' +
      '</div>' +
      (routeClockExpanded
        ? '<div class="route-clock-summary">' +
            '<label><small>START DAY</small><input type="time" value="' + escapeAttr(day.start) + '" onchange="setAdaptiveDayStart(\'' + day.date + '\',this.value)"></label>' +
            '<div><small>DRIVE</small><b>' + escapeHtml(formatDuration(tl.totalDriveMin)) + '</b></div>' +
            '<div><small>STOPS</small><b>' + escapeHtml(formatDuration(tl.totalStayMin)) + '</b></div>' +
            '<div><small>DISTANCE</small><b>' + escapeHtml(tl.totalDistKm) + ' km</b></div>' +
          '</div>' +
          '<div class="route-clock-status ' + (status.pending ? 'pending' : 'ready') + '"><span class="route-clock-dot"></span>' + escapeHtml(statusText) + sunWarn + '</div>' +
          '<div class="route-clock-note">Uses the exact current stop order. MUST + NICE are timed; CUT is bypassed. Reorder, reverse, move, add or delete stops and every downstream ETA recalculates.</div>' +
          '<div class="route-clock-list">' + rows + '</div>' +
          options +
          (cutCount ? '<div class="route-clock-cut">' + cutCount + ' CUT stop' + (cutCount === 1 ? '' : 's') + ' bypassed from timing.</div>' : '')
        : '<div class="route-clock-collapsed">' + escapeHtml(tl.totalDistKm) + ' km • ' + escapeHtml(formatDuration(tl.totalDriveMin)) + ' drive • finish ' + escapeHtml(tl.finishTime.display) + (status.pending ? ' • updating…' : '') + '</div>');
  }

  function renderRouteClock() {
    const root = document.getElementById('adaptiveRouteClock');
    if (!root) return;
    if (S.selectedDay === 'all') {
      renderAllDaysClock(root);
      return;
    }
    renderDayClock(root, getDay());
  }

  function injectRouteClock() {
    if (document.getElementById('adaptiveRouteClock')) return;
    const mapEl = document.getElementById('map');
    if (!mapEl) return;
    mapEl.insertAdjacentHTML('afterend', '<aside id="adaptiveRouteClock" class="adaptive-route-clock"></aside>');
  }

  function injectCss() {
    if (document.getElementById('adaptiveRouteClockCss')) return;
    const style = document.createElement('style');
    style.id = 'adaptiveRouteClockCss';
    style.textContent = `
      .adaptive-route-clock{
        position:absolute;z-index:650;top:52px;right:10px;width:min(390px,calc(100% - 20px));
        max-height:calc(100% - 78px);overflow:hidden;border:1px solid rgba(255,255,255,.14);
        border-radius:14px;background:rgba(7,24,36,.96);backdrop-filter:blur(18px);
        box-shadow:0 18px 40px rgba(0,0,0,.48);color:#eef7fb;
      }
      .route-clock-head{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px 10px;border-bottom:1px solid var(--line);background:#10283a}
      .route-clock-head small{display:block;font-size:8.5px;color:var(--accent);font-weight:850;letter-spacing:.07em}
      .route-clock-head b{display:block;font-size:14px;margin-top:1px}
      .route-clock-collapse{width:31px;height:31px;border-radius:9px;border:1px solid var(--line);background:#071925;color:#fff;font-size:19px;cursor:pointer}
      .route-clock-summary{display:grid;grid-template-columns:1.15fr repeat(3,1fr);gap:5px;padding:7px}
      .route-clock-summary>div,.route-clock-summary>label{background:#091e2c;border:1px solid var(--line);border-radius:8px;padding:6px;min-width:0}
      .route-clock-summary small{display:block;color:var(--muted);font-size:7.5px;font-weight:800}
      .route-clock-summary b{font-size:11px;white-space:nowrap}
      .route-clock-summary input{width:100%;border:0;background:transparent;color:#fff;font-weight:800;font-size:11px;padding:0;margin-top:1px}
      .route-clock-status{display:flex;align-items:center;gap:5px;padding:5px 9px;font-size:9px;border-top:1px solid rgba(255,255,255,.05);border-bottom:1px solid rgba(255,255,255,.05)}
      .route-clock-status.ready{color:#b9f0cd}.route-clock-status.pending{color:#ffe2a2}
      .route-clock-dot{width:7px;height:7px;border-radius:50%;background:currentColor;box-shadow:0 0 7px currentColor;flex:0 0 auto}
      .route-clock-status.pending .route-clock-dot{animation:pulse-dot 1.4s infinite}
      .route-clock-warn{margin-left:auto;color:#ffbf9c;font-weight:800}
      .route-clock-note{padding:6px 9px;color:#9eb4c2;font-size:8.5px;line-height:1.35}
      .route-clock-list{overflow-y:auto;max-height:calc(100vh - 300px);padding:0 7px 7px}
      .route-clock-row{border:1px solid var(--line);border-radius:10px;background:#0b2130;margin-top:6px;overflow:hidden;cursor:pointer}
      .route-clock-row:hover{border-color:#4e7994}
      .route-clock-leg{display:flex;gap:7px;align-items:center;padding:4px 7px;background:#071925;color:#8faaba;font-size:8.5px;border-bottom:1px solid rgba(255,255,255,.05)}
      .route-clock-leg.pending{color:#e7c680}.route-clock-leg span:last-child{margin-left:auto}
      .route-clock-stop{display:grid;grid-template-columns:24px minmax(90px,1fr) 58px 62px 58px;gap:5px;align-items:center;padding:6px}
      .route-clock-number{width:23px;height:23px;border-radius:50%;display:grid;place-items:center;background:var(--accent);color:#07131d;font-size:10px;font-weight:900}
      .route-clock-name{min-width:0}.route-clock-name b{display:block;font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.route-clock-name small{font-size:7px;color:var(--muted)}
      .route-clock-time small,.route-clock-stay small{display:block;font-size:7px;color:var(--muted);font-weight:800}.route-clock-time b{font-size:9.5px;white-space:nowrap}
      .route-clock-stay span{display:flex;align-items:center;font-size:8px;color:var(--muted)}
      .route-clock-stay input{width:36px;background:#071925;border:1px solid var(--line);border-radius:6px;color:#fff;padding:3px;font-size:9px;text-align:center;margin-right:2px}
      .route-clock-options,.route-clock-cut,.route-clock-collapsed{padding:7px 9px;font-size:9px;color:#afc2cf;border-top:1px solid var(--line)}
      .route-clock-options b{color:#c5a6ff}.route-clock-cut{color:#e3c581}
      .route-clock-days{padding:6px;overflow-y:auto;max-height:60vh}
      .route-clock-day{width:100%;display:grid;grid-template-columns:34px 1fr 14px;gap:6px;align-items:center;text-align:left;background:#0b2130;color:#fff;border:1px solid var(--line);border-radius:9px;padding:7px;margin-bottom:5px;cursor:pointer}
      .route-clock-day-num{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:#143d55;font-size:10px;font-weight:850}
      .route-clock-day-copy{min-width:0}.route-clock-day-copy b{display:block;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.route-clock-day-copy small{display:block;font-size:8.5px;color:var(--muted);margin-top:2px}

      @media(max-width:768px){
        .adaptive-route-clock{
          position:static!important;width:100%!important;max-height:none!important;margin:8px 0 0!important;
          border-radius:12px!important;box-shadow:none!important;
        }
        #mapview .adaptive-route-clock{order:2}
        #mapview .sidebar{order:3!important}
        .route-clock-list{max-height:none!important;overflow:visible!important}
        .route-clock-summary{grid-template-columns:repeat(2,1fr)}
        .route-clock-stop{grid-template-columns:24px minmax(90px,1fr) 58px 58px}
        .route-clock-time.depart{display:none}
        .route-clock-row{touch-action:pan-y}
        .route-clock-head{position:sticky;top:0;z-index:2}
        .route-clock-note{font-size:9px}
        .route-clock-days{max-height:none;overflow:visible}
      }
    `;
    document.head.appendChild(style);
  }

  function toggleRouteClock() {
    routeClockExpanded = !routeClockExpanded;
    localStorage.setItem(UI_KEY, routeClockExpanded ? '1' : '0');
    renderRouteClock();
  }

  function setDayStart(date, value) {
    const day = S.days.find(function (d) { return d.date === date; });
    if (!day || !/^\d{2}:\d{2}$/.test(value)) return;
    day.start = value;
    save();
  }

  function setStay(date, id, value) {
    const n = Math.max(0, Math.min(720, Number(value || 0)));
    setStopStay(date, id, n);
  }

  function focusStop(lat, lng) {
    if (!map) return;
    map.setView([lat, lng], Math.max(map.getZoom(), 12), { animate: true });
  }

  function patchRenderers() {
    const oldRenderDayEditor = renderDayEditor;
    renderDayEditor = function () {
      oldRenderDayEditor();
      renderRouteClock();
    };

    const oldRenderMap = renderMap;
    renderMap = function () {
      oldRenderMap();
      renderRouteClock();
    };

    const oldSetView = setView;
    setView = function (id) {
      oldSetView(id);
      if (id === 'mapview') setTimeout(renderRouteClock, 0);
    };
  }

  injectCss();
  injectRouteClock();
  patchRenderers();

  window.toggleAdaptiveRouteClock = toggleRouteClock;
  window.setAdaptiveDayStart = setDayStart;
  window.setAdaptiveRouteStay = setStay;
  window.focusAdaptiveStop = focusStop;
  window.renderAdaptiveRouteClock = renderRouteClock;

  renderRouteClock();
})();