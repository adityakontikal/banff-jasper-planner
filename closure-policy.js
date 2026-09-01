/* Jasper 2026 wildfire-recovery closure policy.
 * Verified against Parks Canada on Aug 31, 2026.
 * These locations are hard exclusions: they never enter an active route/timeline,
 * even if an old import or manual edit attempts to restore them.
 */
(function () {
  const CLOSED_2026 = [
    {
      key: 'maligne-canyon',
      title: 'Maligne Canyon',
      ids: ['malignecanyon', 'malignecanyonfree'],
      pattern: /\bmaligne\s+canyon\b/i,
      status: 'Closed for the 2026 season',
      detail: 'Access to Maligne Canyon trails and surrounding land is prohibited from First Bridge parking lot to the Fifth Bridge junction during wildfire recovery.',
      official: 'https://parks.canada.ca/pn-np/ab/jasper/activ/itineraires-itineraries/canyon-maligne'
    },
    {
      key: 'cavell',
      title: 'Cavell Road / Mount Edith Cavell',
      ids: ['cavell', 'cavellroad', 'edithcavell', 'mountedithcavell', 'cavellmeadows', 'pathoftheglacier'],
      pattern: /\b(?:cavell\s+road|edith\s+cavell(?:\s+road|\s+area)?|mount\s+edith\s+cavell|cavell\s+meadows|path\s+of\s+the\s+glacier)\b/i,
      status: 'Closed for the 2026 season',
      detail: 'Edith Cavell Road and area are closed to all travel. Path of the Glacier and Cavell Meadows are also closed during wildfire recovery.',
      official: 'https://parks.canada.ca/pn-np/ab/jasper/activ/experience/sentiers-trails/cavell'
    }
  ];

  const BULLETIN = 'https://parks.canada.ca/voyage-travel/securite-safety/bulletins/76ecae58-8a63-480c-8304-dc903837eefd';
  let enforcing = false;

  function closureFor(stopOrName) {
    if (!stopOrName) return null;
    const id = typeof stopOrName === 'object' ? String(stopOrName.id || '').toLowerCase() : '';
    const name = typeof stopOrName === 'object' ? String(stopOrName.name || '') : String(stopOrName);
    return CLOSED_2026.find(function (rule) {
      return (id && rule.ids.includes(id)) || rule.pattern.test(name);
    }) || null;
  }

  function isHardClosed2026(stopOrName) {
    return !!closureFor(stopOrName);
  }

  function enforceStop(stop) {
    const rule = closureFor(stop);
    if (!rule) return false;
    let changed = false;
    if (stop.priority !== 'cut') { stop.priority = 'cut'; changed = true; }
    if (Number(stop.stayMin || 0) !== 0) { stop.stayMin = 0; changed = true; }
    if (!stop.hardClosed2026) { stop.hardClosed2026 = true; changed = true; }
    const note = 'HARD CLOSED 2026 — excluded from routing. ' + rule.detail;
    if (stop.note !== note) { stop.note = note; changed = true; }
    return changed;
  }

  function enforceState(state) {
    if (!state || !state.days) return false;
    let changed = false;
    state.days.forEach(function (day) {
      (day.stops || []).forEach(function (stop) {
        if (enforceStop(stop)) changed = true;
      });
    });
    (state.attractions || []).forEach(function (a) {
      const rule = closureFor({ id: a.id, name: a.name });
      if (!rule) return;
      if (a.selected) { a.selected = false; changed = true; }
      if (a.rec !== 'CLOSED 2026 — DO NOT ROUTE') { a.rec = 'CLOSED 2026 — DO NOT ROUTE'; changed = true; }
      if (a.time !== 0) { a.time = 0; changed = true; }
      const desc = rule.status + '. ' + rule.detail;
      if (a.desc !== desc) { a.desc = desc; changed = true; }
      if (a.link !== rule.official) { a.link = rule.official; changed = true; }
    });
    return changed;
  }

  function patchBaseData() {
    enforceState(BASE);

    const canyon = SPOT_INFO.malignecanyon || (SPOT_INFO.malignecanyon = {});
    Object.assign(canyon, {
      title: 'Maligne Canyon — CLOSED 2026',
      photoQuery: 'Maligne Canyon Jasper',
      time: 'Closed',
      rating: 'CLOSED',
      timingOptions: [],
      parking: 'Do not route to the canyon closure area.',
      parkingRating: 'CLOSED',
      bestWindow: 'No visitor access in 2026',
      restrooms: 'Do not plan canyon facilities',
      cell: 'Not relevant — closed area',
      effort: 'Access prohibited',
      desc: 'Parks Canada confirms Maligne Canyon remains closed for the 2026 season during wildfire recovery.',
      todo: 'Bypass Maligne Canyon. Continue on the legal/open Maligne Road itinerary toward Medicine Lake and Maligne Lake.',
      reviews: 'Verified Aug 31, 2026 against Parks Canada recovery information and the Aug 14 closure bulletin.',
      cut: 'Hard exclusion — this location never enters the active route or ETA chain.',
      official: 'https://parks.canada.ca/pn-np/ab/jasper/activ/itineraires-itineraries/canyon-maligne',
      tag: 'CLOSED 2026 • Wildfire recovery'
    });

    SPOT_INFO.cavellroad = {
      title: 'Cavell Road / Mount Edith Cavell — CLOSED 2026',
      photoQuery: 'Mount Edith Cavell Jasper',
      time: 'Closed',
      rating: 'CLOSED',
      timingOptions: [],
      parking: 'Do not route onto Cavell Road or into the Edith Cavell area.',
      parkingRating: 'CLOSED',
      bestWindow: 'No visitor access in 2026',
      restrooms: 'Do not plan facilities in the closed area',
      cell: 'Not relevant — closed area',
      effort: 'Access prohibited',
      desc: 'Parks Canada confirms Cavell Road and the Mount Edith Cavell area remain closed for the 2026 season during wildfire recovery.',
      todo: 'Use other Jasper/Parkway sights. Path of the Glacier and Cavell Meadows are also closed.',
      reviews: 'Verified Aug 31, 2026 against Parks Canada recovery information and the Aug 14 closure bulletin.',
      cut: 'Hard exclusion — this location never enters the active route or ETA chain.',
      official: 'https://parks.canada.ca/pn-np/ab/jasper/activ/experience/sentiers-trails/cavell',
      tag: 'CLOSED 2026 • Wildfire recovery'
    };

    // Keep the catalog focused on places the traveller can actually add.
    for (let i = CATALOG.length - 1; i >= 0; i--) {
      if (isHardClosed2026(CATALOG[i])) CATALOG.splice(i, 1);
    }
  }

  function showClosedToast(rule) {
    toast(rule.title + ' is closed for the 2026 season and cannot be added to the route.');
  }

  function closureBannerHtml() {
    return '<aside class="closure-strip">' +
      '<div><b>2026 wildfire-recovery closures</b><span>Maligne Canyon and Cavell Road / Mount Edith Cavell are hard-excluded from this itinerary. Maligne Lake and Valley of the Five Lakes remain usable.</span></div>' +
      '<div class="closure-links"><a href="' + CLOSED_2026[0].official + '" target="_blank">Maligne Canyon</a><a href="' + CLOSED_2026[1].official + '" target="_blank">Cavell</a><a href="' + BULLETIN + '" target="_blank">Parks bulletin</a></div>' +
    '</aside>';
  }

  function injectBanner(target) {
    if (!target || target.querySelector('.closure-strip')) return;
    target.insertAdjacentHTML('afterbegin', closureBannerHtml());
  }

  function injectCss() {
    if (document.getElementById('closurePolicyCss')) return;
    const st = document.createElement('style');
    st.id = 'closurePolicyCss';
    st.textContent = `
      .closure-strip{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:10px 0 12px;margin-bottom:8px;border-bottom:1px solid #6a5035;color:#d9e4ea}
      .closure-strip b{display:block;font-size:11px;color:#e7c48c;margin-bottom:2px}
      .closure-strip span{display:block;font-size:9.5px;color:#9fb2bd;line-height:1.4}
      .closure-links{display:flex;gap:12px;flex:0 0 auto}
      .closure-links a{font-size:9px;color:#c7d9e4;text-decoration:none}
      .closure-links a:hover{text-decoration:underline;color:#fff}
      .closed-2026-pill{display:inline-flex;align-items:center;border:1px solid #7a5b39;color:#e7c48c;border-radius:6px;padding:2px 5px;font-size:8px;font-weight:800}
      @media(max-width:768px){
        .closure-strip{display:block;padding:8px 2px 10px}
        .closure-links{margin-top:7px;overflow-x:auto;white-space:nowrap}
      }
    `;
    document.head.appendChild(st);
  }

  function patchRouting() {
    const oldCompute = computeDayTimeline;
    computeDayTimeline = function (day) {
      if (!day || !day.stops || !day.stops.some(isHardClosed2026)) return oldCompute(day);
      const clone = deepClone(day);
      clone.stops.forEach(enforceStop);
      return oldCompute(clone);
    };

    const oldGoogleRoute = googleRouteUrl;
    googleRouteUrl = function (stops) {
      return oldGoogleRoute((stops || []).filter(function (s) { return !isHardClosed2026(s); }));
    };

    const oldInsertStop = insertStop;
    insertStop = function (stop) {
      const rule = closureFor(stop);
      if (rule) { showClosedToast(rule); return false; }
      return oldInsertStop(stop);
    };

    const oldAddCatalogStop = addCatalogStop;
    addCatalogStop = function (id) {
      const item = CATALOG.find(function (x) { return x.id === id; });
      const rule = closureFor(item || { id: id, name: id });
      if (rule) { showClosedToast(rule); return; }
      return oldAddCatalogStop(id);
    };

    const oldAddSearchHit = addSearchHit;
    addSearchHit = function (i) {
      const hit = lastHits[i];
      const rule = hit && closureFor(hit.name);
      if (rule) { showClosedToast(rule); return; }
      return oldAddSearchHit(i);
    };

    const oldAddNamed = addNamedCustomStop;
    addNamedCustomStop = function () {
      const input = document.getElementById('customStopName');
      const rule = input && closureFor(input.value);
      if (rule) { showClosedToast(rule); return; }
      return oldAddNamed();
    };

    const oldRename = renameStop;
    renameStop = function (i, value) {
      const rule = closureFor(value);
      if (rule) { showClosedToast(rule); renderDayEditor(); return; }
      return oldRename(i, value);
    };

    const oldPriority = setPriority;
    setPriority = function (i, value) {
      const day = getDay();
      const stop = day && day.stops[i];
      const rule = closureFor(stop);
      if (rule && value !== 'cut') {
        enforceStop(stop);
        persist();
        renderAll();
        showClosedToast(rule);
        return;
      }
      return oldPriority(i, value);
    };
  }

  function patchRendering() {
    const oldRenderPlan = renderPlan;
    renderPlan = function () {
      oldRenderPlan();
      injectBanner(document.getElementById('planRoot'));
    };

    const oldRenderField = renderField;
    renderField = function () {
      oldRenderField();
      injectBanner(document.getElementById('fieldRoot'));
    };

    const oldRenderMiniMap = renderModalMiniMap;
    renderModalMiniMap = function (stop) {
      const rule = closureFor(stop);
      if (!rule) return oldRenderMiniMap(stop);
      if (modalMiniMap) { modalMiniMap.remove(); modalMiniMap = null; }
      const el = document.getElementById('modalMiniMap');
      if (!el) return;
      modalMiniMap = L.map(el, { scrollWheelZoom: false }).setView([stop.lat, stop.lng], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap contributors' }).addTo(modalMiniMap);
      L.marker([stop.lat, stop.lng]).addTo(modalMiniMap).bindPopup('<b>' + escapeHtml(rule.title) + '</b><br><span style="color:#e7c48c">Closed for 2026 — do not route here.</span><br><a href="' + rule.official + '" target="_blank">Parks Canada closure</a>').openPopup();
    };

    const oldOpenSpotModal = openSpotModal;
    openSpotModal = function (date, id) {
      oldOpenSpotModal(date, id);
      const found = findStop(date, id);
      const rule = found && closureFor(found.stop);
      if (!rule) return;
      const actions = document.getElementById('modalTopActions');
      if (actions) actions.innerHTML = '<a class="btn primary small" href="' + rule.official + '" target="_blank">Parks Canada closure</a><a class="btn small" href="' + BULLETIN + '" target="_blank">Aug 14 closure bulletin</a>';
      const mapActions = document.getElementById('modalMapActions');
      if (mapActions) mapActions.innerHTML = '<span class="closed-2026-pill">CLOSED — not routable</span>';
    };

    const oldRenderAll = renderAll;
    renderAll = function () {
      if (!enforcing) {
        enforcing = true;
        const changed = enforceState(S);
        enforcing = false;
        if (changed) persist();
      }
      oldRenderAll();
      if (document.getElementById('planview') && document.getElementById('planview').classList.contains('on')) injectBanner(document.getElementById('planRoot'));
      if (document.getElementById('fieldview') && document.getElementById('fieldview').classList.contains('on')) injectBanner(document.getElementById('fieldRoot'));
    };
  }

  patchBaseData();
  enforceState(S);
  persist();
  injectCss();
  patchRouting();
  patchRendering();

  window.isHardClosed2026 = isHardClosed2026;
  window.jasperClosed2026 = CLOSED_2026;

  renderAll();
})();