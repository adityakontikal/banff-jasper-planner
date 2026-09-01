/* Global scroll contract.
 * Loaded LAST. This is the only authoritative page-scroll policy.
 *
 * Desktop/laptop:
 *   - app remains viewport-sized
 *   - normal content views scroll inside the app
 *   - Map and Days keep their purpose-built internal layouts
 *
 * Phone/tablet:
 *   - the DOCUMENT is the only page scroller
 *   - active views never own vertical scrolling
 *   - only true overlays (modals / More sheet) scroll internally
 */
(function () {
  const MOBILE_QUERY = '(max-width: 768px)';

  function injectScrollContract() {
    if (document.getElementById('globalScrollContractCss')) return;
    const st = document.createElement('style');
    st.id = 'globalScrollContractCss';
    st.textContent = `
      /* ---------------- Desktop / laptop contract ---------------- */
      @media (min-width: 769px) {
        html, body {
          height: 100vh !important;
          min-height: 0 !important;
          overflow: hidden !important;
        }

        body {
          position: static !important;
        }

        .app {
          height: calc(100vh - 51px) !important;
          min-height: 0 !important;
          max-height: none !important;
          overflow: hidden !important;
        }

        .view {
          min-height: 0 !important;
        }

        .view:not(.on) {
          display: none !important;
        }

        /* Every ordinary desktop page owns one clean vertical scroller. */
        #planview.view.on,
        #bookings.view.on,
        #hotels.view.on,
        #attractions.view.on,
        #packview.view.on,
        #fieldview.view.on,
        #budget.view.on,
        #settings.view.on,
        #finalize.view.on {
          display: block !important;
          height: 100% !important;
          min-height: 0 !important;
          max-height: 100% !important;
          overflow-x: hidden !important;
          overflow-y: auto !important;
          overscroll-behavior-y: auto !important;
          scrollbar-gutter: stable;
          touch-action: pan-y pinch-zoom !important;
          padding-right: 6px;
        }

        /* Map is viewport-contained; sidebar owns its editor scroll. */
        #mapview.view.on {
          display: flex !important;
          flex-direction: column !important;
          height: 100% !important;
          min-height: 0 !important;
          overflow: hidden !important;
        }

        #mapview .workspace {
          min-height: 0 !important;
          height: 100% !important;
          overflow: hidden !important;
        }

        #mapview .sidebar,
        #mapview .mapwrap {
          min-height: 0 !important;
          height: 100% !important;
        }

        #mapview .sidebody {
          min-height: 0 !important;
          overflow-x: hidden !important;
          overflow-y: auto !important;
          overscroll-behavior-y: auto !important;
          touch-action: pan-y pinch-zoom !important;
        }

        /* Days keeps its left list + right detail panel, each independently scrollable. */
        #overview.view.on {
          display: block !important;
          height: 100% !important;
          min-height: 0 !important;
          overflow: hidden !important;
        }

        #overview .overview-layout,
        #overview .overview-sidebar,
        #overview .overview-main {
          height: 100% !important;
          min-height: 0 !important;
          max-height: 100% !important;
        }

        #overview .overview-daylist,
        #overview .overview-main {
          overflow-x: hidden !important;
          overflow-y: auto !important;
          overscroll-behavior-y: auto !important;
          touch-action: pan-y pinch-zoom !important;
        }
      }

      /* ---------------- Phone / tablet contract ---------------- */
      @media (max-width: 768px) {
        html {
          width: 100% !important;
          height: auto !important;
          min-height: 100% !important;
          max-height: none !important;
          overflow-x: hidden !important;
          overflow-y: auto !important;
          overscroll-behavior-y: auto !important;
          touch-action: pan-y pinch-zoom !important;
          -webkit-overflow-scrolling: touch;
        }

        body {
          position: static !important;
          width: 100% !important;
          height: auto !important;
          min-height: 100dvh !important;
          max-height: none !important;
          overflow-x: hidden !important;
          overflow-y: auto !important;
          overscroll-behavior-x: none !important;
          overscroll-behavior-y: auto !important;
          touch-action: pan-y pinch-zoom !important;
          -webkit-overflow-scrolling: touch !important;
          padding-bottom: calc(72px + env(safe-area-inset-bottom)) !important;
        }

        .top {
          position: static !important;
          top: auto !important;
        }

        .app {
          display: block !important;
          width: 100% !important;
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          overflow: visible !important;
          padding: 8px !important;
        }

        .view,
        .view.on,
        #mobilequick.view.on,
        #planview.view.on,
        #overview.view.on,
        #mapview.view.on,
        #bookings.view.on,
        #hotels.view.on,
        #attractions.view.on,
        #packview.view.on,
        #fieldview.view.on,
        #budget.view.on,
        #settings.view.on,
        #finalize.view.on {
          position: static !important;
          width: 100% !important;
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          overflow-x: visible !important;
          overflow-y: visible !important;
          overscroll-behavior: auto !important;
          touch-action: pan-y pinch-zoom !important;
          -webkit-overflow-scrolling: auto !important;
        }

        .view:not(.on) {
          display: none !important;
        }

        #mobilequick.view.on,
        #planview.view.on,
        #overview.view.on,
        #mapview.view.on,
        #bookings.view.on,
        #hotels.view.on,
        #attractions.view.on,
        #packview.view.on,
        #fieldview.view.on,
        #budget.view.on,
        #settings.view.on,
        #finalize.view.on {
          display: block !important;
        }

        /* No nested vertical page scrollers on mobile. */
        .workspace,
        .sidebar,
        .sidebody,
        .overview-layout,
        .overview-sidebar,
        .overview-main,
        .lock-grid,
        .lock-timeline,
        .cards,
        .attgrid,
        .editorGrid,
        .product-plan,
        .pp-days,
        .pp-section,
        #planRoot,
        #overviewRoot,
        #fieldRoot,
        #bookingRows,
        #hotelCards,
        #attractionCards,
        #budgetRoot,
        #settings {
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          overflow-y: visible !important;
          overscroll-behavior-y: auto !important;
          touch-action: pan-y pinch-zoom !important;
        }

        /* Horizontal controls may scroll sideways but must not steal vertical page swipes. */
        .tabs,
        .dayswitch,
        .overview-daylist,
        .mobile-chip-row,
        .pp-subnav,
        .closure-links,
        .maptoolbar {
          overflow-x: auto !important;
          overflow-y: hidden !important;
          touch-action: auto !important;
          -webkit-overflow-scrolling: touch !important;
        }

        /* Days: horizontal day picker, normal document-scroll content. */
        #overview .overview-layout {
          display: block !important;
        }

        #overview .overview-sidebar {
          display: block !important;
          margin-bottom: 8px !important;
        }

        #overview .overview-daylist {
          display: flex !important;
          flex-direction: row !important;
          max-height: none !important;
          padding: 7px !important;
        }

        #overview .overview-main {
          display: block !important;
          padding-right: 0 !important;
        }

        /* Map: fixed usable map surface, everything else participates in page flow. */
        #mapview .workspace {
          display: flex !important;
          flex-direction: column !important;
          gap: 8px !important;
        }

        #mapview .mapwrap {
          order: 1 !important;
          display: block !important;
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          overflow: visible !important;
        }

        #mapview #map {
          position: relative !important;
          inset: auto !important;
          width: 100% !important;
          height: 58dvh !important;
          min-height: 360px !important;
          max-height: 620px !important;
          overflow: hidden !important;
          touch-action: none !important;
        }

        #mapview .adaptive-route-clock {
          position: static !important;
          order: 2 !important;
          width: 100% !important;
          max-height: none !important;
          overflow: visible !important;
        }

        #mapview .route-clock-list,
        #mapview .route-clock-days {
          max-height: none !important;
          overflow: visible !important;
        }

        #mapview .sidebar {
          order: 3 !important;
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          overflow: visible !important;
        }

        #mapview .sidebar:not(.mobile-editor-open) {
          display: none !important;
        }

        #mapview .sidebar.mobile-editor-open {
          display: flex !important;
          flex-direction: column !important;
        }

        #mapview .sidebody {
          flex: none !important;
          overflow: visible !important;
        }

        /* True overlays are the ONLY internal vertical scrollers on phones. */
        .modal-backdrop {
          position: fixed !important;
          inset: 0 !important;
          overflow: hidden !important;
          touch-action: none !important;
        }

        .modal-dialog {
          width: 100% !important;
          height: auto !important;
          max-height: 94dvh !important;
          overflow: hidden !important;
          touch-action: pan-y !important;
        }

        .modal-body {
          min-height: 0 !important;
          max-height: none !important;
          overflow-x: hidden !important;
          overflow-y: auto !important;
          overscroll-behavior-y: contain !important;
          touch-action: pan-y pinch-zoom !important;
          -webkit-overflow-scrolling: touch !important;
        }

        .mobile-more-sheet {
          position: fixed !important;
          inset: 0 !important;
          overflow: hidden !important;
        }

        .mobile-more-panel {
          max-height: 82dvh !important;
          overflow-x: hidden !important;
          overflow-y: auto !important;
          overscroll-behavior-y: contain !important;
          touch-action: pan-y pinch-zoom !important;
          -webkit-overflow-scrolling: touch !important;
        }

        /* Inputs should allow normal page gestures when the finger begins on them. */
        input,
        textarea,
        select,
        button,
        a,
        label {
          touch-action: manipulation;
        }

        textarea,
        #rawJson {
          touch-action: pan-y !important;
        }
      }
    `;
    document.head.appendChild(st);
  }

  function clearScrollInlineStyles(el) {
    if (!el) return;
    ['height','min-height','max-height','overflow','overflow-x','overflow-y','touch-action'].forEach(function (prop) {
      el.style.removeProperty(prop);
    });
  }

  function normalizeViewport() {
    const mobile = window.matchMedia(MOBILE_QUERY).matches;
    document.documentElement.dataset.scrollMode = mobile ? 'document' : 'app';

    if (mobile) {
      // Clear stale inline scroll state left by earlier view-specific fixes.
      ['height','min-height','max-height','overflow','overflow-x','overflow-y','touch-action'].forEach(function (prop) {
        document.documentElement.style.removeProperty(prop);
        document.body.style.removeProperty(prop);
      });

      const app = document.querySelector('.app');
      clearScrollInlineStyles(app);

      // The retired Lock page must never remain as a hidden scroll owner.
      const lock = document.getElementById('lockview');
      if (lock && !lock.classList.contains('on')) clearScrollInlineStyles(lock);
      return;
    }

    // Returning from a narrow/mobile viewport must restore CSS ownership to desktop.
    clearScrollInlineStyles(document.documentElement);
    clearScrollInlineStyles(document.body);
    clearScrollInlineStyles(document.querySelector('.app'));
    document.querySelectorAll('.view').forEach(clearScrollInlineStyles);
  }

  function enforceMobileDocumentScroll() {
    if (!window.matchMedia(MOBILE_QUERY).matches) return;

    const root = document.documentElement;
    const body = document.body;
    const app = document.querySelector('.app');
    const active = document.querySelector('.view.on');

    [
      [root, 'height', 'auto'],
      [root, 'min-height', '100%'],
      [root, 'overflow-x', 'hidden'],
      [root, 'overflow-y', 'auto'],
      [body, 'height', 'auto'],
      [body, 'min-height', '100dvh'],
      [body, 'overflow-x', 'hidden'],
      [body, 'overflow-y', 'scroll']
    ].forEach(function (entry) {
      if (entry[0]) entry[0].style.setProperty(entry[1], entry[2], 'important');
    });

    if (app) {
      app.style.setProperty('height', 'auto', 'important');
      app.style.setProperty('min-height', '0', 'important');
      app.style.setProperty('max-height', 'none', 'important');
      app.style.setProperty('overflow', 'visible', 'important');
    }

    if (active) {
      active.style.setProperty('height', 'auto', 'important');
      active.style.setProperty('min-height', '0', 'important');
      active.style.setProperty('max-height', 'none', 'important');
      active.style.setProperty('overflow-x', 'visible', 'important');
      active.style.setProperty('overflow-y', 'visible', 'important');
      active.style.setProperty('touch-action', 'pan-y pinch-zoom', 'important');
    }

    requestAnimationFrame(function () {
      const scrolling = document.scrollingElement || root;
      const viewport = window.innerHeight || root.clientHeight;
      const activeHeight = active ? active.scrollHeight : 0;
      const appHeight = app ? app.scrollHeight : 0;
      const expected = Math.max(activeHeight, appHeight) + 90;

      // Safari/PWA safety net: if an earlier layout rule prevents the document
      // from inheriting a long active view's height, force enough body height.
      if (expected > viewport + 20 && scrolling.scrollHeight < expected - 20) {
        body.style.setProperty('min-height', expected + 'px', 'important');
      }

      if (activeHeight > viewport + 20 && scrolling.scrollHeight <= viewport + 20) {
        console.warn('[Rockies Planner] Scroll contract violation', {
          activeView: active.id,
          viewport: viewport,
          activeHeight: activeHeight,
          documentHeight: scrolling.scrollHeight,
          bodyOverflow: getComputedStyle(body).overflowY,
          activeOverflow: getComputedStyle(active).overflowY
        });
      }
    });
  }

  function queueMobileScrollEnforcement() {
    if (!window.matchMedia(MOBILE_QUERY).matches) return;
    enforceMobileDocumentScroll();
    requestAnimationFrame(enforceMobileDocumentScroll);
    setTimeout(enforceMobileDocumentScroll, 80);
  }

  function resetActiveScroll() {
    if (window.matchMedia(MOBILE_QUERY).matches) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      return;
    }

    const active = document.querySelector('.view.on');
    if (!active) return;

    if (active.id === 'overview') {
      const main = active.querySelector('.overview-main');
      if (main) main.scrollTop = 0;
      return;
    }

    if (active.id !== 'mapview') active.scrollTop = 0;
  }

  function patchViewNavigation() {
    const oldSetView = setView;
    setView = function (id) {
      oldSetView(id);
      normalizeViewport();
      queueMobileScrollEnforcement();
      requestAnimationFrame(resetActiveScroll);
    };
  }

  injectScrollContract();
  normalizeViewport();
  patchViewNavigation();
  const oldRenderAllForScroll = renderAll;
  renderAll = function () {
    oldRenderAllForScroll();
    queueMobileScrollEnforcement();
  };


  window.addEventListener('resize', function () {
    normalizeViewport();
    queueMobileScrollEnforcement();
  }, { passive: true });
  window.addEventListener('orientationchange', function () {
    setTimeout(function () {
      normalizeViewport();
      queueMobileScrollEnforcement();
    }, 80);
  });
  window.addEventListener('load', queueMobileScrollEnforcement, { once: true });

  // Expose a tiny diagnostic for future regressions.
  window.getPlannerScrollState = function () {
    const mobile = window.matchMedia(MOBILE_QUERY).matches;
    const active = document.querySelector('.view.on');
    return {
      mode: mobile ? 'document' : 'app',
      activeView: active ? active.id : null,
      windowScrollY: window.scrollY,
      bodyScrollHeight: document.body.scrollHeight,
      bodyClientHeight: document.body.clientHeight,
      activeScrollHeight: active ? active.scrollHeight : null,
      activeClientHeight: active ? active.clientHeight : null,
      bodyOverflowY: getComputedStyle(document.body).overflowY,
      activeOverflowY: active ? getComputedStyle(active).overflowY : null,
      canWindowScroll: (document.scrollingElement || document.documentElement).scrollHeight > window.innerHeight + 1
    };
  };
})();