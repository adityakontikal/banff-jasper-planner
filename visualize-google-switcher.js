/* visualize-google-switcher.js
 * Optional renderer switch between the default free/open MapLibre world and
 * Google Maps 3D photorealistic imagery. This file must load before
 * visualize-free.js so the original Google renderer entry points can be kept.
 */
(function (root) {
  'use strict';

  if (!root || !root.Visualize3D || typeof document === 'undefined') return;
  if (root.__ROCKIES_GOOGLE_SWITCHER_LOADED) return;
  root.__ROCKIES_GOOGLE_SWITCHER_LOADED = true;

  const googleObject = root.Visualize3D;
  const rawGoogleOnActivate = googleObject.onVisualizeTabActivated;
  const rawGoogleChooseDay = googleObject.chooseVisualizeDay;
  const rawGoogleCancelFlight = googleObject.cancelRouteFlyThrough;
  const rawGoogleToggleMapOnly = googleObject.toggleMapOnly;
  const googleOriginal = {
    onVisualizeTabActivated: typeof rawGoogleOnActivate === 'function'
      ? rawGoogleOnActivate.bind(googleObject) : null,
    chooseVisualizeDay: typeof rawGoogleChooseDay === 'function'
      ? rawGoogleChooseDay.bind(googleObject) : null,
    cancelRouteFlyThrough: typeof rawGoogleCancelFlight === 'function'
      ? rawGoogleCancelFlight.bind(googleObject) : null,
    toggleMapOnly: typeof rawGoogleToggleMapOnly === 'function'
      ? rawGoogleToggleMapOnly.bind(googleObject) : null
  };

  let freeApi = null;
  let renderer = 'open';
  let rememberedDay = null;
  let observer = null;

  function selectedDay() {
    try {
      const active = document.querySelector('#visualizeview [data-free-day].on, #visualizeview [data-vis-day].on, #visualizeview .vis-daybtn.on');
      const value = active && (active.dataset.freeDay || active.dataset.visDay || active.textContent);
      if (value && String(value).trim()) return String(value).trim();
    } catch (_) {}
    try {
      if (typeof S !== 'undefined' && S && S.selectedDay && S.selectedDay !== 'all') return String(S.selectedDay);
    } catch (_) {}
    return rememberedDay || 'Sep 27';
  }

  function captureFreeApi() {
    if (freeApi || !root.Visualize3D) return;
    const current = root.Visualize3D;
    if (current.onVisualizeTabActivated === rawGoogleOnActivate &&
        current.chooseVisualizeDay === rawGoogleChooseDay) return;
    if (typeof current.onVisualizeTabActivated !== 'function') return;
    freeApi = {
      onVisualizeTabActivated: current.onVisualizeTabActivated.bind(current),
      chooseVisualizeDay: typeof current.chooseVisualizeDay === 'function'
        ? current.chooseVisualizeDay.bind(current) : null,
      cancelRouteFlyThrough: typeof current.cancelRouteFlyThrough === 'function'
        ? current.cancelRouteFlyThrough.bind(current) : null
    };
  }

  function ensureStyle() {
    if (document.getElementById('rockiesRendererSwitcherStyle')) return;
    const style = document.createElement('style');
    style.id = 'rockiesRendererSwitcherStyle';
    style.textContent = `
      #visualizeview{position:relative}
      .rockies-renderer-switcher{position:absolute;z-index:1200;top:10px;right:58px;display:flex;align-items:center;gap:3px;padding:3px;background:rgba(5,17,26,.90);border:1px solid rgba(255,255,255,.18);border-radius:10px;box-shadow:0 5px 18px rgba(0,0,0,.34);backdrop-filter:blur(12px)}
      .rockies-renderer-switcher button{border:1px solid transparent;background:transparent;color:#a9bfce;border-radius:7px;padding:6px 9px;font:700 10.5px/1.1 Inter,ui-sans-serif,system-ui,sans-serif;cursor:pointer;white-space:nowrap}
      .rockies-renderer-switcher button:hover{color:#fff;background:rgba(255,255,255,.07)}
      .rockies-renderer-switcher button.active{color:#fff;background:#173d54;border-color:#4d7894}
      .rockies-renderer-switcher button[data-rockies-renderer="google"].active{background:#2c4563;border-color:#6a91bd}
      .rockies-renderer-cost{font-size:9px;color:#8ea7b8;padding:0 4px 0 2px;white-space:nowrap}
      @media(max-width:720px){.rockies-renderer-switcher{top:7px;right:7px}.rockies-renderer-switcher button{padding:6px 7px}.rockies-renderer-cost{display:none}}
    `;
    document.head.appendChild(style);
  }

  function setButtonState(host) {
    if (!host) return;
    host.querySelectorAll('[data-rockies-renderer]').forEach(function (button) {
      button.classList.toggle('active', button.dataset.rockiesRenderer === renderer);
      button.setAttribute('aria-pressed', button.classList.contains('active') ? 'true' : 'false');
    });
  }

  function injectSwitcher() {
    const view = document.getElementById('visualizeview');
    if (!view) return;
    captureFreeApi();
    ensureStyle();

    let host = view.querySelector('.rockies-renderer-switcher');
    if (!host) {
      host = document.createElement('div');
      host.className = 'rockies-renderer-switcher';
      host.setAttribute('role', 'group');
      host.setAttribute('aria-label', '3D renderer');
      host.innerHTML = `
        <button type="button" data-rockies-renderer="open">Open World</button>
        <button type="button" data-rockies-renderer="google" title="Google Maps 3D photorealistic imagery; API key/billing may be required">Google 3D</button>
        <span class="rockies-renderer-cost">Google optional</span>
      `;
      host.addEventListener('click', function (event) {
        const button = event.target && event.target.closest ? event.target.closest('[data-rockies-renderer]') : null;
        if (!button) return;
        if (button.dataset.rockiesRenderer === 'google') switchToGoogle();
        else switchToOpen();
      });
      view.appendChild(host);
    }
    setButtonState(host);
  }

  function clearVisualizeView() {
    const view = document.getElementById('visualizeview');
    if (!view) return null;
    const switcher = view.querySelector('.rockies-renderer-switcher');
    if (switcher) switcher.remove();
    view.innerHTML = '';
    return view;
  }

  function switchToGoogle() {
    if (renderer === 'google') return;
    captureFreeApi();
    rememberedDay = selectedDay();

    try {
      if (root.VisualizeWorld && typeof root.VisualizeWorld.stop === 'function') root.VisualizeWorld.stop(false);
    } catch (_) {}
    try {
      if (freeApi && freeApi.cancelRouteFlyThrough) freeApi.cancelRouteFlyThrough(false);
    } catch (_) {}

    renderer = 'google';
    clearVisualizeView();

    if (!googleOriginal.onVisualizeTabActivated) {
      renderer = 'open';
      if (freeApi && freeApi.onVisualizeTabActivated) freeApi.onVisualizeTabActivated();
      setTimeout(injectSwitcher, 60);
      return;
    }

    googleOriginal.onVisualizeTabActivated();
    if (rememberedDay && googleOriginal.chooseVisualizeDay) {
      setTimeout(function () {
        try { googleOriginal.chooseVisualizeDay(rememberedDay); } catch (_) {}
      }, 80);
    }
    setTimeout(injectSwitcher, 30);
    setTimeout(injectSwitcher, 500);
  }

  function switchToOpen() {
    if (renderer === 'open') return;
    rememberedDay = selectedDay();
    try { if (googleOriginal.cancelRouteFlyThrough) googleOriginal.cancelRouteFlyThrough(); } catch (_) {}

    captureFreeApi();
    renderer = 'open';
    clearVisualizeView();

    if (freeApi && freeApi.onVisualizeTabActivated) {
      freeApi.onVisualizeTabActivated();
      if (rememberedDay && freeApi.chooseVisualizeDay) {
        setTimeout(function () {
          try { freeApi.chooseVisualizeDay(rememberedDay); } catch (_) {}
        }, 30);
      }
    } else if (root.Visualize3D && typeof root.Visualize3D.onVisualizeTabActivated === 'function') {
      root.Visualize3D.onVisualizeTabActivated();
    }

    setTimeout(injectSwitcher, 30);
    setTimeout(injectSwitcher, 350);
  }

  function watch() {
    if (observer || !document.documentElement) return;
    observer = new MutationObserver(function () {
      captureFreeApi();
      if (document.getElementById('visualizeview')) injectSwitcher();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  root.ROCKIES_RENDERER_SWITCHER = {
    getRenderer: function () { return renderer; },
    switchToGoogle: switchToGoogle,
    switchToOpen: switchToOpen,
    googleRenderer: 'Google Maps JavaScript API 3D Maps',
    googleMayRequireBilling: true
  };

  ensureStyle();
  watch();
  setTimeout(injectSwitcher, 0);
  setTimeout(injectSwitcher, 400);
})(typeof window !== 'undefined' ? window : null);
