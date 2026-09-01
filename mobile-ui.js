/* Mobile-first quick planner layer.
 * Keeps the full desktop UI intact while giving phones a condensed workflow.
 */
(function () {
  const MOBILE_BREAKPOINT = 768;
  const isMobile = () => window.matchMedia('(max-width: ' + MOBILE_BREAKPOINT + 'px)').matches;

  function moneySafe(n) {
    try { return money(n); } catch (_) { return 'C$' + Number(n || 0).toFixed(0); }
  }

  function mobilePendingBookings() {
    const ids = ['outbound','return','rental','h25','h26','h27','h28','h29','park','shuttle'];
    return ids.map(id => S.bookings.find(b => b.id === id)).filter(Boolean).filter(b => !['Booked','Paid','Done'].includes(b.status));
  }

  function shortBookingLabel(b) {
    if (!b) return '';
    if (b.id === 'outbound') return 'Outbound flight';
    if (b.id === 'return') return 'Return flight';
    if (b.id === 'rental') return 'Rental car';
    if (/^h\d+/.test(b.id)) return b.item.replace(/^Hotel\s+/,'').replace(/\s+—.*$/,'');
    if (b.id === 'park') return 'Park admission';
    if (b.id === 'shuttle') return 'Moraine/Louise shuttle';
    return b.item;
  }

  function dayMusts(d) {
    return d.stops.filter(s => s.priority === 'must' && !s.isHotel && !/Airport|Park & Ride — Back|Fuel \/ Rest|Fuel \+|Hotel/i.test(s.name));
  }

  function decisionSummary() {
    const d = S.decisions || {};
    const out = [];
    if (d.maligne === 'book') out.push('Maligne cruise');
    if (d.lakeLouise === 'shoreline') out.push('Louise lakeshore');
    if (d.icefield === 'nice-no-pass' || d.icefield === 'skip') out.push('Icefield free view');
    if (d.gondola === 'weather') out.push('Gondola weather-call');
    if (d.sep29bonus === 'pending') out.push('Sep 29 bonus pending');
    return out;
  }

  function nextActionHtml() {
    const pending = mobilePendingBookings();
    if (pending.length) {
      const b = pending[0];
      return '<div class="mobile-next-card"><div><small>NEXT TO LOCK</small><b>' + escapeHtml(shortBookingLabel(b)) + '</b><span>' + escapeHtml(b.status || 'Not started') + '</span></div><button class="btn primary" onclick="setView(\'bookings\')">Open</button></div>';
    }
    const d = S.decisions || {};
    if (d.shuttle === 'pending') {
      return '<div class="mobile-next-card"><div><small>NEXT DECISION</small><b>Moraine / Lake Louise shuttle</b><span>Book the Sep 27 transport window.</span></div><button class="btn primary" onclick="setView(\'lockview\')">Lock</button></div>';
    }
    if (d.sep29bonus === 'pending') {
      return '<div class="mobile-next-card"><div><small>LATER DECISION</small><b>Choose Sep 29 bonus</b><span>Valley hike, Icefield Adventure, Yoho, or just core route.</span></div><button class="btn primary" onclick="setView(\'lockview\')">Choose</button></div>';
    }
    return '<div class="mobile-next-card done"><div><small>PLAN STATUS</small><b>Core plan is locked</b><span>Use the checklist and weather calls closer to departure.</span></div><button class="btn" onclick="setView(\'lockview\')">Review</button></div>';
  }

  function renderMobileQuick() {
    const root = document.getElementById('mobileQuickRoot');
    if (!root) return;
    const pending = mobilePendingBookings();
    const pct = Math.round(ready() * 100);
    const totalNow = total();
    const pp = totalNow / Math.max(1, S.settings.travellers || 1);
    const decisions = decisionSummary();

    const days = S.days.map(d => {
      const tl = computeDayTimeline(d);
      const musts = dayMusts(d);
      const show = musts.slice(0, 4);
      const rest = musts.length - show.length;
      const route = googleRouteUrl(d.stops);
      return '<article class="mobile-day-card">' +
        '<div class="mobile-day-head"><div><small>' + escapeHtml(d.date) + '</small><b>' + escapeHtml(d.label) + '</b></div><span>' + escapeHtml(d.start) + '</span></div>' +
        '<div class="mobile-day-meta">~' + escapeHtml(tl.totalDistKm) + ' km • ~' + escapeHtml(formatDuration(tl.totalDriveMin)) + ' drive • sleep: ' + escapeHtml(d.sleep) + '</div>' +
        '<div class="mobile-must-list">' + show.map(s => '<span>★ ' + escapeHtml(getSpotInfo(s).title || s.name) + '</span>').join('') + (rest > 0 ? '<span class="muted">+' + rest + ' more must</span>' : '') + '</div>' +
        '<div class="mobile-card-actions"><button class="btn primary" onclick="openDayGuide(\'' + d.date + '\')">Quick look</button><button class="btn" onclick="chooseDay(\'' + d.date + '\')">Map</button>' + (route ? '<a class="btn" href="' + route + '" target="_blank">Google Maps</a>' : '') + '</div>' +
      '</article>';
    }).join('');

    root.innerHTML =
      '<div class="mobile-quick-hero">' +
        '<div><div class="ey">PHONE QUICK PLAN</div><h1>' + escapeHtml(S.settings.title) + '</h1><p>Only the things you need to make decisions and move through the trip.</p></div>' +
        '<div class="mobile-quick-stats"><div><small>Budget</small><b>' + moneySafe(totalNow) + '</b><span>' + moneySafe(pp) + '/person</span></div><div><small>Locked</small><b>' + pct + '%</b><span>' + pending.length + ' booking items left</span></div></div>' +
      '</div>' +
      nextActionHtml() +
      '<div class="mobile-section"><div class="mobile-section-head"><div><small>CORE PLAN</small><h2>Day by day</h2></div><button class="btn" onclick="setView(\'lockview\')">Lock choices</button></div><div class="mobile-day-list">' + days + '</div></div>' +
      '<div class="mobile-section mobile-summary-card"><small>LOCKED / PENDING</small><div class="mobile-chip-row">' + (decisions.length ? decisions.map(x => '<span>' + escapeHtml(x) + '</span>').join('') : '<span>Core decisions set</span>') + '</div></div>' +
      '<div class="mobile-section"><div class="mobile-section-head"><div><small>TRIP READY</small><h2>Fast checklist</h2></div></div>' +
        '<div class="mobile-check-grid">' +
          '<button onclick="setView(\'bookings\')"><b>' + (pending.length ? pending.length : '✓') + '</b><span>Bookings</span></button>' +
          '<button onclick="setView(\'lockview\')"><b>' + ((S.decisions && S.decisions.sep29bonus !== 'pending') ? '✓' : '1') + '</b><span>Decision</span></button>' +
          '<button onclick="setView(\'packview\')"><b>→</b><span>Pack</span></button>' +
          '<button onclick="setView(\'fieldview\')"><b>→</b><span>Road rules</span></button>' +
        '</div>' +
      '</div>';
  }

  function showMobileMore(open) {
    const sheet = document.getElementById('mobileMoreSheet');
    if (!sheet) return;
    sheet.classList.toggle('open', open !== false);
  }

  function goMobile(view) {
    showMobileMore(false);
    setView(view);
    if (view === 'mobilequick') renderMobileQuick();
  }

  function toggleMobileMapEditor() {
    const side = document.querySelector('#mapview .sidebar');
    if (!side) return;
    side.classList.toggle('mobile-editor-open');
    if (side.classList.contains('mobile-editor-open')) {
      setTimeout(() => side.scrollIntoView({behavior:'smooth', block:'start'}), 60);
    }
  }

  function injectMobileUi() {
    if (!document.getElementById('mobilequick')) {
      const plan = document.getElementById('planview');
      if (plan) plan.insertAdjacentHTML('beforebegin','<section class="view" id="mobilequick"><div id="mobileQuickRoot"></div></section>');
    }

    if (!document.getElementById('mobileBottomNav')) {
      document.body.insertAdjacentHTML('beforeend',
        '<nav class="mobile-bottom-nav" id="mobileBottomNav">' +
          '<button data-mobile-view="mobilequick" onclick="goMobilePlanner(\'mobilequick\')"><span>⌂</span><b>Quick</b></button>' +
          '<button data-mobile-view="overview" onclick="goMobilePlanner(\'overview\')"><span>☰</span><b>Days</b></button>' +
          '<button data-mobile-view="mapview" onclick="goMobilePlanner(\'mapview\')"><span>⌖</span><b>Map</b></button>' +
          '<button data-mobile-view="lockview" onclick="goMobilePlanner(\'lockview\')"><span>✓</span><b>Lock</b></button>' +
          '<button onclick="showMobilePlannerMore(true)"><span>•••</span><b>More</b></button>' +
        '</nav>' +
        '<div class="mobile-more-sheet" id="mobileMoreSheet" onclick="if(event.target===this)showMobilePlannerMore(false)"><div class="mobile-more-panel"><div class="mobile-more-head"><b>More</b><button onclick="showMobilePlannerMore(false)">×</button></div><div class="mobile-more-grid">' +
          '<button onclick="goMobilePlanner(\'planview\')">Full plan</button>' +
          '<button onclick="goMobilePlanner(\'bookings\')">Bookings</button>' +
          '<button onclick="goMobilePlanner(\'hotels\')">Hotels</button>' +
          '<button onclick="goMobilePlanner(\'attractions\')">Attractions</button>' +
          '<button onclick="goMobilePlanner(\'budget\')">Budget</button>' +
          '<button onclick="goMobilePlanner(\'packview\')">Pack</button>' +
          '<button onclick="goMobilePlanner(\'fieldview\')">Road / Field</button>' +
          '<button onclick="goMobilePlanner(\'settings\')">Data / Presets</button>' +
          '<button onclick="goMobilePlanner(\'finalize\')">Print / Export</button>' +
        '</div></div></div>');
    }

    const toolbar = document.querySelector('#mapview .maptoolbar');
    if (toolbar && !document.getElementById('mobileMapEditBtn')) {
      toolbar.insertAdjacentHTML('afterbegin',
        '<button class="btn small primary mobile-essential" id="mobileMapEditBtn" onclick="toggleMobilePlannerMapEditor()">Edit stops</button>' +
        '<button class="btn small mobile-essential" onclick="openGoogleRoute()">Google route</button>');
    }
  }

  function injectMobileCss() {
    if (document.getElementById('mobilePlannerCss')) return;
    const st = document.createElement('style');
    st.id = 'mobilePlannerCss';
    st.textContent = `
      .mobile-bottom-nav,.mobile-more-sheet{display:none}
      #mobilequick{display:none}
      @media(max-width:768px){
        html,body{overscroll-behavior-y:none}
        body{padding-bottom:72px}
        .top{position:sticky}
        .topin{padding:7px 10px;flex-direction:row!important;align-items:center!important;gap:8px!important}
        .brand{min-width:0}
        .brand-text small{display:none}
        .brand-text b{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:190px}
        .logo{width:30px;height:30px}
        .top .tabs,.top .top-stats{display:none!important}
        .app{padding:8px 8px 0!important;overflow:visible!important}
        .view.on{height:auto!important;min-height:calc(100vh - 118px)!important;overflow:visible!important}
        #mobilequick.view.on{display:block!important}
        #planview.view.on,#bookings.view.on,#hotels.view.on,#attractions.view.on,#packview.view.on,#fieldview.view.on,#budget.view.on,#settings.view.on,#finalize.view.on,#lockview.view.on{padding-right:0!important;overflow:visible!important}

        .mobile-bottom-nav{position:fixed;display:grid;grid-template-columns:repeat(5,1fr);left:0;right:0;bottom:0;z-index:5000;background:rgba(7,19,29,.98);border-top:1px solid rgba(255,255,255,.12);padding:6px max(7px,env(safe-area-inset-right)) calc(6px + env(safe-area-inset-bottom)) max(7px,env(safe-area-inset-left));box-shadow:0 -8px 24px rgba(0,0,0,.4)}
        .mobile-bottom-nav button{border:0;background:transparent;color:#90a8b8;min-height:52px;border-radius:10px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:2px;font-size:10px}
        .mobile-bottom-nav button span{font-size:19px;line-height:18px}
        .mobile-bottom-nav button b{font-size:10px}
        .mobile-bottom-nav button.on{color:#fff;background:#143348}

        .mobile-more-sheet{position:fixed;inset:0;z-index:6000;background:rgba(0,0,0,.62);align-items:flex-end}
        .mobile-more-sheet.open{display:flex}
        .mobile-more-panel{width:100%;background:#0b1e2c;border-radius:20px 20px 0 0;border:1px solid var(--line);padding:12px 12px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -20px 50px rgba(0,0,0,.55)}
        .mobile-more-head{display:flex;justify-content:space-between;align-items:center;padding:4px 4px 10px}
        .mobile-more-head b{font-size:18px}
        .mobile-more-head button{width:38px;height:38px;border-radius:50%;border:1px solid var(--line);background:#10283a;color:#fff;font-size:22px}
        .mobile-more-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .mobile-more-grid button{min-height:52px;text-align:left;padding:10px 12px;background:#10283a;color:#eaf4fa;border:1px solid var(--line);border-radius:12px;font-weight:700}

        .mobile-quick-hero{background:linear-gradient(145deg,#12364b,#0c2637);border:1px solid var(--line);border-radius:16px;padding:14px;margin-bottom:10px}
        .mobile-quick-hero h1{font-size:22px;line-height:1.15;margin:4px 0 5px}
        .mobile-quick-hero p{font-size:11px;color:var(--muted);margin:0 0 12px}
        .mobile-quick-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .mobile-quick-stats>div{background:#071925;border:1px solid var(--line);border-radius:11px;padding:9px}
        .mobile-quick-stats small,.mobile-quick-stats span{display:block;color:var(--muted);font-size:9px}
        .mobile-quick-stats b{display:block;font-size:17px;margin:2px 0}

        .mobile-next-card{display:flex;justify-content:space-between;align-items:center;gap:10px;background:#221d0f;border:1px solid #735e2f;border-radius:14px;padding:11px 12px;margin-bottom:10px}
        .mobile-next-card.done{background:#0c2820;border-color:#3d765f}
        .mobile-next-card small,.mobile-next-card span{display:block;color:#b8c9d4;font-size:9px}
        .mobile-next-card b{display:block;font-size:14px;margin:2px 0}

        .mobile-section{margin:10px 0}
        .mobile-section-head{display:flex;align-items:center;justify-content:space-between;margin:0 2px 7px}
        .mobile-section-head small{font-size:9px;color:var(--accent);font-weight:800}
        .mobile-section-head h2{font-size:17px;margin:1px 0}
        .mobile-day-list{display:flex;flex-direction:column;gap:8px}
        .mobile-day-card{background:#0b1e2c;border:1px solid var(--line);border-radius:14px;padding:11px}
        .mobile-day-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
        .mobile-day-head small{display:block;color:var(--accent);font-weight:800;font-size:10px}
        .mobile-day-head b{display:block;font-size:13px;line-height:1.25;margin-top:2px}
        .mobile-day-head>span{font-size:11px;font-weight:800;background:#102e43;border-radius:999px;padding:5px 8px;white-space:nowrap}
        .mobile-day-meta{font-size:10px;color:var(--muted);margin:7px 0}
        .mobile-must-list{display:flex;flex-direction:column;gap:3px;padding:8px;background:#071925;border-radius:9px}
        .mobile-must-list span{font-size:11px}
        .mobile-must-list .muted{color:var(--muted)}
        .mobile-card-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px}
        .mobile-card-actions .btn{min-height:40px;padding:7px 6px;font-size:10px;display:flex;align-items:center;justify-content:center;text-align:center}
        .mobile-summary-card{background:#0b1e2c;border:1px solid var(--line);border-radius:13px;padding:10px}
        .mobile-summary-card>small{font-size:9px;color:var(--accent);font-weight:800}
        .mobile-chip-row{display:flex;gap:5px;overflow-x:auto;padding-top:7px}
        .mobile-chip-row span{white-space:nowrap;padding:5px 8px;border-radius:999px;background:#10283a;border:1px solid var(--line);font-size:10px}
        .mobile-check-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
        .mobile-check-grid button{border:1px solid var(--line);background:#0b1e2c;color:#fff;border-radius:11px;min-height:70px;display:flex;flex-direction:column;align-items:center;justify-content:center}
        .mobile-check-grid b{font-size:18px;color:var(--accent)}
        .mobile-check-grid span{font-size:9px;color:#c1d1dc;margin-top:3px}

        /* Day guide: make each place a quick card, not a desktop article. */
        #overview.view.on{height:auto!important;overflow:visible!important}
        .overview-layout{display:block!important;height:auto!important}
        .overview-sidebar{height:auto!important;margin-bottom:8px}
        .overview-daylist{display:flex!important;flex-direction:row!important;overflow-x:auto!important;padding:7px!important}
        .overview-daycard{min-width:132px;padding:8px!important}
        .overview-daycard .overview-meta{display:none}
        .overview-main{height:auto!important;overflow:visible!important;padding:0!important}
        .overview-main>.glass.panel{padding:10px}
        #overviewNote{display:none}
        #overviewChips{overflow-x:auto;flex-wrap:nowrap}
        #overviewChips .chip{white-space:nowrap}
        .spot-grid{grid-template-columns:1fr!important;gap:7px!important}
        .spot-card{display:grid;grid-template-columns:94px 1fr;min-height:94px}
        .spot-img{height:100%!important;min-height:94px}
        .spot-body{padding:9px!important}
        .spot-card h3{font-size:13px!important;margin:3px 0!important}
        .spot-card p,.spot-card .review-card,.spot-card .dwell-picker{display:none!important}
        .spot-card .badge-pill{display:none}
        .spot-card .rating-pill{font-size:9px!important}
        .spot-card .actions{margin-top:5px!important}
        .spot-card .actions .btn,.spot-card .quick-map{min-height:36px;padding:6px 7px;font-size:9px}
        .overview-schedule{margin:5px 0!important;padding:5px 7px!important}

        /* Spot details become a phone bottom sheet with only essential intel first. */
        .modal-backdrop{padding:0!important;align-items:flex-end!important}
        .modal-dialog{max-height:94vh!important;border-radius:18px 18px 0 0!important}
        .modal-header{padding:10px 12px!important}
        .modal-body{padding:10px 12px!important}
        .modal-footer{padding:8px 12px calc(8px + env(safe-area-inset-bottom))!important}
        .detail-layout{grid-template-columns:1fr!important}
        .detail-copy p{font-size:12px!important}
        #modalReviews{display:none!important}
        #modalFacts{grid-template-columns:1fr 1fr!important}
        #modalFacts .fact:nth-child(1),#modalFacts .fact:nth-child(2),#modalFacts .fact:nth-child(7),#modalFacts .fact:nth-child(8){display:none!important}
        #modalDwellControls .dwell-btn:not(.active):not(:last-child){display:none!important}
        .photo-grid{display:block!important;height:160px!important}
        .photo-grid .photo{display:none!important}
        .photo-grid .photo:first-child{display:block!important;height:160px!important}
        .tips{grid-template-columns:1fr!important}
        .mini-map{height:180px!important}
        #modalTopActions{display:grid!important;grid-template-columns:1fr 1fr}
        #modalTopActions .btn:nth-child(3){grid-column:1/-1}

        /* Map first; editor only when asked for. */
        #mapview.view.on{overflow:visible!important;height:auto!important}
        #mapview .workspace{display:flex!important;flex-direction:column!important;height:auto!important}
        #mapview .mapwrap{order:1;height:58vh!important;min-height:390px!important}
        #mapview .sidebar{order:2;height:auto!important;display:none!important;margin-top:8px}
        #mapview .sidebar.mobile-editor-open{display:flex!important}
        #mapview .maptoolbar{overflow-x:auto;white-space:nowrap;padding:6px!important}
        #mapview .maptoolbar .btn:not(.mobile-essential){display:none!important}
        #mapview .maphint{display:none!important}
        .sidebody{overflow:visible!important}
        .stoprow-top{grid-template-columns:16px 24px 1fr 70px 24px 24px 24px!important}

        /* Lock: one recommendation plus compact alternatives. */
        .lock-hero{padding:12px!important}
        .lock-hero h1{font-size:20px!important}
        .lock-hero p{font-size:11px}
        .lock-metrics{grid-template-columns:1fr 1fr!important}
        .lock-grid{display:block!important}
        .lock-step{display:block!important;padding-bottom:9px!important}
        .lock-time{display:inline-block!important;margin-bottom:5px;font-size:9px!important}
        .lock-copy{padding:9px!important}
        .lock-copy h3{font-size:13px!important}
        .lock-copy p{font-size:10px!important}
        .lock-choices{display:flex!important;overflow-x:auto;gap:5px!important}
        .lock-choice{min-width:76%;padding:8px!important}
        .lock-choice.selected{order:-1;min-width:84%}
        .lock-copy:not(.mobile-show-alts) .lock-choice:not(.selected){display:none!important}
        .lock-copy.mobile-show-alts .lock-choice{display:block!important;min-width:78%}
        .mobile-change-choice{margin-top:6px!important;min-height:34px!important;font-size:10px!important}

        .lock-choice small{font-size:9px!important}
        .final-lock-item{font-size:10px!important}

        /* Secondary screens stay usable but dense desktop chrome disappears. */
        .plan-hero{display:block!important}
        .metrics{grid-template-columns:1fr 1fr!important}
        .ph{align-items:flex-start}
        .panel{padding:10px!important}
        .action-card{grid-template-columns:auto 1fr!important}
        .action-card .due{grid-column:2}
        .bookrow{grid-template-columns:1fr 110px!important;padding:9px 0!important}
        .bookrow>*:nth-child(1),.bookrow>*:nth-child(4),.bookrow>*:nth-child(5),.bookrow>*:nth-child(6),.bookrow>*:nth-child(7){display:none!important}
        .bookrow.head>*:nth-child(2){display:block!important}
        .hotelprice{grid-template-columns:1fr 92px!important}
        .attgrid{grid-template-columns:1fr!important}
        .att{min-height:0!important}
        .preset-cards{grid-template-columns:1fr!important}
        #rawJson{min-height:250px!important}
        .foot{padding-bottom:78px!important}

        /* Scroll ownership: the document scrolls on phones, never an individual page. */
        html{
          height:auto!important;
          min-height:100%!important;
          overflow-x:hidden!important;
          overflow-y:auto!important;
        }
        body{
          position:static!important;
          height:auto!important;
          min-height:100dvh!important;
          max-height:none!important;
          overflow-x:hidden!important;
          overflow-y:auto!important;
          -webkit-overflow-scrolling:touch;
        }
        .app{
          display:block!important;
          height:auto!important;
          min-height:calc(100dvh - 48px)!important;
          max-height:none!important;
          overflow:visible!important;
        }
        .view,
        .view.on,
        #overview.view.on,
        #mapview.view.on,
        #planview.view.on,
        #bookings.view.on,
        #hotels.view.on,
        #attractions.view.on,
        #packview.view.on,
        #fieldview.view.on,
        #budget.view.on,
        #settings.view.on,
        #finalize.view.on,
        #lockview.view.on,
        #mobilequick.view.on{
          height:auto!important;
          min-height:0!important;
          max-height:none!important;
          overflow:visible!important;
        }
        .view:not(.on){display:none!important}
        #mobilequick.view.on,
        #overview.view.on,
        #mapview.view.on,
        #planview.view.on,
        #bookings.view.on,
        #hotels.view.on,
        #attractions.view.on,
        #packview.view.on,
        #fieldview.view.on,
        #budget.view.on,
        #settings.view.on,
        #finalize.view.on,
        #lockview.view.on{display:block!important}

        .overview-layout,.overview-main,.overview-sidebar,
        .lock-grid,.lock-timeline,.cards,.attgrid,.editorGrid{
          height:auto!important;
          max-height:none!important;
        }
        .overview-main,.overview-daylist,.sidebody{
          overflow:visible!important;
          max-height:none!important;
        }
        .overview-daylist{
          overflow-x:auto!important;
          overflow-y:hidden!important;
          -webkit-overflow-scrolling:touch;
        }

        /* Keep only true overlays internally scrollable. */
        .modal-dialog{
          height:auto!important;
          max-height:94dvh!important;
          overflow:hidden!important;
        }
        .modal-body{
          overflow-y:auto!important;
          overscroll-behavior:contain;
          -webkit-overflow-scrolling:touch;
        }
        .mobile-more-panel{
          max-height:82dvh;
          overflow-y:auto;
          -webkit-overflow-scrolling:touch;
        }

        /* Inputs/editors must not create invisible full-height scroll traps. */
        textarea,.textarea,#rawJson{
          touch-action:auto;
        }
      }
    `;
    document.head.appendChild(st);
  }

  function enhanceMobileLock() {
    if (!isMobile()) return;
    document.querySelectorAll('#lockview .lock-copy').forEach(function (card) {
      const choices = card.querySelector('.lock-choices');
      if (!choices || card.querySelector('.mobile-change-choice')) return;
      const btn = document.createElement('button');
      btn.className = 'btn mobile-change-choice';
      btn.type = 'button';
      btn.textContent = 'Change choice';
      btn.onclick = function () {
        card.classList.toggle('mobile-show-alts');
        btn.textContent = card.classList.contains('mobile-show-alts') ? 'Hide alternatives' : 'Change choice';
      };
      choices.insertAdjacentElement('afterend', btn);
    });
  }

  function updateMobileNav(viewId) {
    document.querySelectorAll('#mobileBottomNav [data-mobile-view]').forEach(b => b.classList.toggle('on', b.dataset.mobileView === viewId));
  }

  function patchSetView() {
    const oldSetView = setView;
    setView = function (id) {
      oldSetView(id);
      if (id === 'mobilequick') renderMobileQuick();
      if (isMobile()) {
        updateMobileNav(id);
        if (id === 'lockview') setTimeout(enhanceMobileLock, 0);
        requestAnimationFrame(function () {
          window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        });
      }
    };
  }

  function patchRenderAll() {
    const oldRenderAll = renderAll;
    renderAll = function () {
      oldRenderAll();
      renderMobileQuick();
      enhanceMobileLock();
    };
  }

  function initialMobileView() {
    if (!isMobile()) return;
    const active = document.querySelector('.view.on');
    if (!active || active.id === 'planview') setView('mobilequick');
  }

  injectMobileCss();
  injectMobileUi();
  patchSetView();
  patchRenderAll();

  window.goMobilePlanner = goMobile;
  window.showMobilePlannerMore = showMobileMore;
  window.toggleMobilePlannerMapEditor = toggleMobileMapEditor;
  window.renderMobileQuick = renderMobileQuick;

  renderMobileQuick();
  enhanceMobileLock();
  initialMobileView();

  window.addEventListener('resize', function () {
    if (isMobile()) {
      renderMobileQuick();
    } else {
      showMobileMore(false);
      const q = document.getElementById('mobilequick');
      if (q && q.classList.contains('on')) setView('planview');
    }
  });
})();