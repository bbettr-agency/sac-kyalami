/* =========================================================
   SAC KYALAMI — Presentation Engine
   Navigation + GSAP choreography + interactive instruments
   ========================================================= */
(function () {
  'use strict';

  const SVGNS = 'http://www.w3.org/2000/svg';
  const HAS_GSAP = !!window.gsap;

  const slides   = Array.from(document.querySelectorAll('[data-slide]'));
  const count    = slides.length;
  const deck     = document.getElementById('deck');
  const dotnav   = document.getElementById('dotnav');
  const prevBtn  = document.getElementById('prevBtn');
  const nextBtn  = document.getElementById('nextBtn');
  const curNum   = document.getElementById('curNum');
  const totNum   = document.getElementById('totNum');
  const label    = document.getElementById('slideLabel');
  const progress = document.getElementById('progressBar');

  let current   = 0;
  let animating = false;

  const EASE = 'power3.out';
  const pad  = (n) => String(n + 1).padStart(2, '0');
  const fmt  = (n) => Math.round(n).toLocaleString('en-US');

  /* ---------- Build dot nav ---------- */
  slides.forEach((s, i) => {
    const dot = document.createElement('button');
    dot.className = 'dotnav__dot';
    dot.setAttribute('aria-label', 'Go to slide ' + (i + 1) + ' — ' + s.dataset.label);
    dot.addEventListener('click', () => navigate(i));
    dotnav.appendChild(dot);
  });
  const dots = Array.from(dotnav.children);
  totNum.textContent = pad(count - 1);

  /* ---------- Count-up helper ---------- */
  function showNum(el, v) {
    const dec = el.dataset.dec ? parseInt(el.dataset.dec, 10) : 0;
    const body = dec ? v.toFixed(dec) : fmt(v);
    el.textContent = (el.dataset.prefix || '') + body + (el.dataset.suffix || '');
  }
  function countUp(el, tl, at) {
    const end = parseFloat(el.dataset.count);
    const dur = parseFloat(el.dataset.dur) || 1.8;
    const obj = { v: 0 };
    tl.to(obj, { v: end, duration: dur, ease: 'power2.out', onUpdate: () => showNum(el, obj.v) }, at);
  }
  function finalizeCounts() {
    document.querySelectorAll('[data-count]').forEach((el) => showNum(el, parseFloat(el.dataset.count)));
  }

  /* =========================================================
     SLIDE 7 — asset dot matrix
     ========================================================= */
  function buildAssetGrid() {
    const grid = document.getElementById('assetGrid');
    if (!grid) return;
    const COLS = 18, ROWS = 9;
    grid.style.setProperty('--cols', COLS);
    for (let i = 0; i < COLS * ROWS; i++) {
      const d = document.createElement('span');
      d.className = 'asset__node';
      if ((i * 7) % 10 < 7) d.classList.add('is-live'); // ~70% deterministic
      grid.appendChild(d);
    }
  }

  /* =========================================================
     SLIDE 14 — service-reminder calendar
     ========================================================= */
  function buildCalendar() {
    const cal = document.getElementById('remCal');
    if (!cal) return;
    for (let i = 0; i < 28; i++) {
      const d = document.createElement('span');
      d.className = 'cal__d';
      if (i === 17) d.classList.add('is-on'); // the confirmed booking day
      cal.appendChild(d);
    }
  }

  /* =========================================================
     SLIDE 15 — review growth area (closes the line path)
     ========================================================= */
  function buildReviewArea() {
    const line = document.getElementById('rgLine');
    const area = document.getElementById('rgArea');
    if (!line || !area) return;
    area.setAttribute('d', line.getAttribute('d') + ' L 520 220 L 0 220 Z');
  }

  let loopTween = null; // continuous retain-loop pulse

  /* =========================================================
     SLIDE 18 — visibility signal meters
     ========================================================= */
  function buildSignals() {
    document.querySelectorAll('.signal').forEach((sig) => {
      const max = parseInt(sig.dataset.max, 10) || 6;
      for (let i = 0; i < max; i++) sig.appendChild(document.createElement('i'));
    });
  }
  function setSignalsOn() {
    document.querySelectorAll('.signal').forEach((sig) => {
      const cur = parseInt(sig.dataset.cur, 10) || 0;
      Array.from(sig.children).forEach((b, i) => b.classList.toggle('is-on', i < cur));
    });
  }

  /* =========================================================
     SLIDE 22 — reactivation cluster (closing CTA)
     ========================================================= */
  function buildCtaGrid() {
    const grid = document.getElementById('ctaGrid');
    if (!grid) return;
    const COLS = 30, ROWS = 9;
    grid.style.setProperty('--cols', COLS);
    for (let i = 0; i < COLS * ROWS; i++) {
      const d = document.createElement('span');
      d.className = 'cta__node';
      grid.appendChild(d);
    }
  }

  /* =========================================================
     SLIDE 20 — 12-month revenue model
     ========================================================= */
  // Live business-case calculator. Pulls Customer Value (Slide 8) + Database/Reach/Return
  // (Slide 9), adds its own editable inputs, and computes three revenue streams.
  const MONTHS = 12;
  // component ramps across the year (front-loaded reactivation, back-loaded acquisition)
  const wR = [], wT = [], wA = [];
  for (let m = 0; m < MONTHS; m++) { wR.push(Math.max(1, 12 - m)); wT.push(Math.min(m + 2, 8)); wA.push(Math.max(0, m - 1)); }
  const sumArr = (a) => a.reduce((x, y) => x + y, 0);
  const sR = sumArr(wR), sT = sumArr(wT), sA = sumArr(wA);
  let modelOverridden = false; // true once the owner edits Slide-20 invoice/visits directly

  function buildModelBars() {
    const wrap = document.getElementById('modelBars');
    if (!wrap) return;
    for (let m = 0; m < MONTHS; m++) {
      const bar = document.createElement('div');
      bar.className = 'mbar';
      ['acquire', 'retain', 'reclaim'].forEach((k) => {
        const seg = document.createElement('span');
        seg.className = 'mseg mseg--' + k;
        bar.appendChild(seg);
      });
      wrap.appendChild(bar);
    }
  }

  function computeModel() {
    const inv    = numFrom(gid('inInvoiceM'));
    const vis    = numFrom(gid('inVisitsM'));
    const arpc   = inv * vis;                             // annual revenue per customer
    const newPM  = numFrom(gid('inNew'));
    const review = numFrom(gid('inReview')) / 100;
    const conv   = numFrom(gid('inConv')) / 100;
    const db       = numFrom(gid('inDb'));
    const reachPct = numFrom(gid('inReach')) / 100;
    const retPct   = numFrom(gid('inReturn')) / 100;
    const reactivated  = db * reachPct * retPct;          // from Slide 9 inputs
    const reactivation = reactivated * arpc;              // annual revenue from reactivated customers
    const retention    = reactivation * review;           // review/retention systems uplift
    const acquisition  = newPM * 12 * arpc * (1 + conv);  // new customers/yr, lifted by conversion
    return { arpc, reactivation, retention, acquisition, combined: reactivation + retention + acquisition };
  }

  function renderModelChart(st) {
    const rows = [];
    for (let m = 0; m < MONTHS; m++) rows.push({
      reclaim: st.reactivation * wR[m] / sR,
      retain:  st.retention   * wT[m] / sT,
      acquire: st.acquisition * wA[m] / sA
    });
    const maxMonth = Math.max(1, ...rows.map((r) => r.reclaim + r.retain + r.acquire));
    const bars = document.querySelectorAll('#modelBars .mbar');
    rows.forEach((r, m) => {
      const bar = bars[m]; if (!bar) return;
      const tot = (r.reclaim + r.retain + r.acquire) || 1;
      bar.style.height = (tot / maxMonth * 100) + '%';
      bar.children[0].style.height = (r.acquire / tot * 100) + '%';
      bar.children[1].style.height = (r.retain  / tot * 100) + '%';
      bar.children[2].style.height = (r.reclaim / tot * 100) + '%';
    });
  }

  function renderModel() {
    if (!gid('modelTotal')) return;
    const st = computeModel();
    renderModelChart(st);
    setText('mCalcCV', fmtR(st.arpc));
    setText('outReact', fmtMoney(st.reactivation));
    setText('outRetain', fmtMoney(st.retention));
    setText('outAcq', fmtMoney(st.acquisition));
    setText('modelTotal', fmtMoney(st.combined));
    setText('lkDb', fmt(numFrom(gid('inDb'))));
    setText('lkReach', Math.round(numFrom(gid('inReach'))) + '%');
    setText('lkReturn', Math.round(numFrom(gid('inReturn'))) + '%');
  }

  function initModel() {
    buildModelBars();
    // editing invoice/visits here detaches them from the Slide-8 mirror
    ['inInvoiceM', 'inVisitsM'].forEach((id) => { const el = gid(id); if (el) el.addEventListener('input', () => { modelOverridden = true; renderModel(); }); });
    ['inNew', 'inReview', 'inConv'].forEach((id) => { const el = gid(id); if (el) el.addEventListener('input', renderModel); });
    renderModel();
  }

  /* =========================================================
     SLIDE 9 — recoverable opportunity (gauge + scenarios)
     ========================================================= */
  const GMAX  = 10000000;               // gauge ceiling (R10M annual); needle pegs at redline beyond this
  const GR    = 118;                    // gauge radius
  // 270° gauge, 90° gap at the bottom: sweep clockwise from 225° to 135° (clock degrees from top)
  const A0    = 225, SWEEP = 270;
  function gpt(r, deg) {
    const a = (deg - 90) * Math.PI / 180;
    return [150 + r * Math.cos(a), 150 + r * Math.sin(a)];
  }
  function arcPath(r, a0, a1) {
    const p0 = gpt(r, a0), p1 = gpt(r, a1);
    const large = Math.abs(a1 - a0) % 360 > 180 ? 1 : 0;
    return 'M ' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) +
           ' A ' + r + ' ' + r + ' 0 ' + large + ' 1 ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1);
  }
  // Annual revenue per customer is calculated live on Slide 8 and consumed here on Slide 9.
  let annualRevPerCustomer = 5250; // R3,500 invoice × 1.5 visits/yr
  const gid      = (id) => document.getElementById(id);
  const setText  = (id, t) => { const e = gid(id); if (e) e.textContent = t; };
  const numFrom  = (el) => { if (!el) return 0; const n = parseFloat(String(el.value).replace(/[^\d.]/g, '')); return isNaN(n) ? 0 : n; };
  const fmtR     = (v) => 'R' + fmt(v);
  const fmtMoney = (v) => v >= 1e5 ? 'R' + (v / 1e6).toFixed(2) + 'M' : 'R' + fmt(v);

  function buildGauge() {
    const track   = document.getElementById('gaugeTrack');
    const redline = document.getElementById('gaugeRedline');
    if (track)   track.setAttribute('d', arcPath(GR, A0, A0 + SWEEP));
    if (redline) redline.setAttribute('d', arcPath(GR, A0 + 0.85 * SWEEP, A0 + SWEEP));

    const g = document.getElementById('gaugeTicks');
    if (!g) return;
    const N = 28;
    for (let i = 0; i <= N; i++) {
      const f = i / N;
      const deg = A0 + f * SWEEP;
      const r1 = 102, r2 = (i % 4 === 0) ? 112 : 107;
      const p1 = gpt(r1, deg), p2 = gpt(r2, deg);
      const ln = document.createElementNS(SVGNS, 'line');
      ln.setAttribute('x1', p1[0].toFixed(1)); ln.setAttribute('y1', p1[1].toFixed(1));
      ln.setAttribute('x2', p2[0].toFixed(1)); ln.setAttribute('y2', p2[1].toFixed(1));
      if (f > 0.84) ln.setAttribute('stroke', '#e10600');
      g.appendChild(ln);
    }
  }

  function applyGauge(f) {
    const needle = document.getElementById('gaugeNeedle');
    const fill   = document.getElementById('gaugeFill');
    if (needle) needle.setAttribute('transform', 'rotate(' + (A0 + f * SWEEP - 360).toFixed(2) + ' 150 150)');
    if (fill)   fill.setAttribute('d', f > 0.001 ? arcPath(GR, A0, A0 + f * SWEEP) : '');
  }

  function styleSlider(el, val, max) {
    if (!el) return;
    const p = Math.max(0, Math.min(100, (val / max) * 100));
    el.style.background = 'linear-gradient(90deg, var(--red) ' + p + '%, rgba(255,255,255,0.12) ' + p + '%)';
  }

  function computeOpp() {
    const db       = numFrom(gid('inDb'));
    const reachPct = numFrom(gid('inReach'));
    const retPct   = numFrom(gid('inReturn'));
    const reachable = db * reachPct / 100;
    const returning = reachable * retPct / 100;          // reactivated customers
    const recovered = returning * annualRevPerCustomer;  // annual reactivation revenue
    return { db, reachPct, retPct, reachable, returning, recovered, f: Math.min(recovered / GMAX, 1) };
  }

  function renderOpp(v) {
    setText('oppDb', fmt(v.db));
    setText('oppReach', fmt(v.reachable));
    setText('oppReact', fmt(v.returning));
    setText('oppReachPct', '· ' + Math.round(v.reachPct) + '%');
    setText('oppRetPct', '· ' + Math.round(v.retPct) + '%');
    setText('oppRev', fmtMoney(v.recovered));
    setText('gaugeVal', fmtMoney(v.recovered));
    setText('oppCV', fmtR(annualRevPerCustomer));
    setText('inReachOut', Math.round(v.reachPct) + '%');
    setText('inReturnOut', Math.round(v.retPct) + '%');
    const reachBar = gid('oppReachBar'); if (reachBar) reachBar.style.width = v.reachPct + '%';
    const reactBar = gid('oppReactBar'); if (reactBar) reactBar.style.width = (v.reachPct * v.retPct / 100) + '%';
    const revBar   = gid('oppRevBar');   if (revBar)   revBar.style.width   = (v.f * 100) + '%';
    applyGauge(v.f);
    styleSlider(gid('inReach'), v.reachPct, 100);
    styleSlider(gid('inReturn'), v.retPct, 50);
  }

  function syncOpp() { renderOpp(computeOpp()); renderModel(); /* Slide 20 pulls DB/reach/return */ }

  function initOpp() {
    buildGauge();
    ['inDb', 'inReach', 'inReturn'].forEach((id) => { const el = gid(id); if (el) el.addEventListener('input', syncOpp); });
    syncOpp();
  }

  /* =========================================================
     SLIDE 8 — live customer-value calculator (feeds Slide 9)
     ========================================================= */
  function initWorth() {
    const total   = gid('worthTotal');
    const invoice = gid('inInvoice'), visits = gid('inVisits');
    if (!total) return;
    function recompute() {
      const inv = numFrom(invoice), v = numFrom(visits);
      annualRevPerCustomer = inv * v;                    // true 12-month revenue per customer
      window.SAC = { annualRevPerCustomer: annualRevPerCustomer, invoice: inv, visits: v };
      total.textContent = fmtR(annualRevPerCustomer);
      // mirror invoice/visits into Slide 20 unless the presenter has overridden them there
      if (!modelOverridden) {
        const im = gid('inInvoiceM'), vm = gid('inVisitsM');
        if (im) im.value = String(inv);
        if (vm) vm.value = String(v);
      }
      syncOpp();     // Slide 9 live
      renderModel(); // Slide 20 live
    }
    [invoice, visits].forEach((el) => { if (el) el.addEventListener('input', recompute); });
    recompute();
  }

  /* =========================================================
     Per-slide intro choreography
     ========================================================= */
  function buildIntro(i) {
    if (!HAS_GSAP) return null;
    const s  = slides[i];
    const tl = gsap.timeline({ defaults: { ease: EASE } });
    const q  = (sel) => Array.from(s.querySelectorAll(sel));
    const ups   = q('[data-an="up"]');
    const masks = q('[data-an="mask"]');

    switch (i) {
      /* ---- COVER ---- */
      case 0: {
        tl.from(s.querySelector('.cover__media'), { autoAlpha: 0, scale: 1.04, duration: 1.5 }, 0.1);
        tl.from(masks, { yPercent: 115, duration: 1.2, stagger: 0.12 }, 0.25);
        tl.from(ups, { y: 26, autoAlpha: 0, duration: 1, stagger: 0.12 }, 0.5);
        break;
      }

      /* ---- TIMELINE ---- */
      case 1: {
        const valEl = s.querySelector('[data-count]');
        const line  = s.querySelector('[data-tl-line]');
        const ticks = s.querySelector('[data-tl-ticks]');
        const nodes = q('[data-node]');
        tl.from(ups, { y: 24, autoAlpha: 0, duration: 0.9, stagger: 0.1 }, 0);
        tl.set(valEl, { textContent: '0' }, 0);
        countUp(valEl, tl, 0.2);
        tl.from(valEl, { autoAlpha: 0, y: 30, duration: 1 }, 0.2);
        tl.from(line,  { scaleX: 0, duration: 1.5, ease: 'power2.inOut' }, 0.5);
        tl.from(ticks, { autoAlpha: 0, duration: 1.2 }, 0.7);
        tl.from(nodes, { autoAlpha: 0, y: 22, duration: 0.7, stagger: 0.18 }, 0.9);
        tl.from(nodes.map(n => n.querySelector('.tl-node__dot')), { scale: 0, duration: 0.5, ease: 'back.out(2)', stagger: 0.18 }, 0.95);
        break;
      }

      /* ---- QUESTION ---- */
      case 2: {
        const rule = s.querySelector('[data-an="rule"]');
        tl.from(ups, { y: 20, autoAlpha: 0, duration: 0.9 }, 0);
        tl.from(masks, { yPercent: 110, duration: 1.05, stagger: 0.14 }, 0.3);
        if (rule) tl.fromTo(rule, { width: 0 }, { width: 'min(420px, 60%)', duration: 1.1, ease: 'power2.inOut' }, '-=0.4');
        break;
      }

      /* ---- TENSION ---- */
      case 3: {
        tl.from(ups, { y: 24, autoAlpha: 0, duration: 0.9, stagger: 0.1 }, 0);
        tl.from(q('[data-panel]'), { autoAlpha: 0, y: 40, duration: 1, stagger: 0.18 }, 0.35);
        tl.from(q('[data-row]'),   { autoAlpha: 0, x: -14, duration: 0.6, stagger: 0.07 }, 0.7);
        break;
      }

      /* ---- LEAKAGE / CHART ---- */
      case 4: {
        const vals = q('[data-count]');
        tl.from(ups, { y: 24, autoAlpha: 0, duration: 0.9, stagger: 0.1 }, 0);
        tl.from(q('.bar__fill'), { scaleY: 0, duration: 1.3, ease: 'power3.out', stagger: 0.12 }, 0.4);
        tl.from(q('.bar__cat'),  { autoAlpha: 0, y: 8, duration: 0.6, stagger: 0.12 }, 0.6);
        vals.forEach((v, idx) => {
          gsap.set(v, { autoAlpha: 0 });
          tl.to(v, { autoAlpha: 1, duration: 0.4 }, 0.55 + idx * 0.12);
          countUp(v, tl, 0.55 + idx * 0.12);
        });
        break;
      }

      /* ---- DIAGNOSTICS ---- */
      case 5: {
        const faults = s.querySelector('[data-count]');
        const tts    = q('[data-tt]');
        tl.from(ups, { y: 24, autoAlpha: 0, duration: 0.9, stagger: 0.1 }, 0);
        tl.from(s.querySelector('[data-cluster]'), { autoAlpha: 0, y: 30, duration: 0.9 }, 0.2);
        tl.set(faults, { textContent: '0' }, 0.2);
        countUp(faults, tl, 0.4);
        // telltales reveal + "ignite" one at a time, like a dash self-test
        tts.forEach((tt, idx) => {
          const at = 0.6 + idx * 0.22;
          tl.from(tt, { autoAlpha: 0, x: -16, duration: 0.6 }, at);
          tl.from(tt.querySelector('.telltale__icon'), { scale: 0.4, autoAlpha: 0, duration: 0.45, ease: 'power2.out' }, at + 0.05);
          tl.fromTo(tt.querySelector('.telltale__icon'),
            { boxShadow: '0 0 0 rgba(225,6,0,0)' },
            { boxShadow: '0 0 22px rgba(225,6,0,0.55)', duration: 0.3, yoyo: true, repeat: 1 }, at + 0.1);
          tl.from(tt.querySelector('.telltale__tag'), { autoAlpha: 0, duration: 0.4 }, at + 0.15);
        });
        break;
      }

      /* ---- THE ASSET ---- */
      case 6: {
        const num   = s.querySelector('[data-count]');
        const grid  = s.querySelector('.asset__grid');
        const nodes = q('.asset__node');
        const live  = q('.asset__node.is-live');
        tl.from(ups, { y: 24, autoAlpha: 0, duration: 0.9, stagger: 0.1 }, 0);
        tl.set(num, { textContent: '0' }, 0);
        countUp(num, tl, 0.3);
        tl.from(grid, { autoAlpha: 0, duration: 0.7 }, 0.1);
        tl.from(nodes, { scale: 0.3, autoAlpha: 0, duration: 0.5, stagger: { each: 0.004, grid: [9, 18], from: 'start' } }, 0.25);
        // dormant -> active sweep
        tl.set(live, { backgroundColor: '#1d1d22', borderColor: 'rgba(255,255,255,0.16)', boxShadow: '0 0 0 rgba(225,6,0,0)' }, 0.25);
        tl.to(live, {
          backgroundColor: '#e10600', borderColor: '#e10600', boxShadow: '0 0 9px rgba(225,6,0,0.75)',
          duration: 0.5, stagger: { each: 0.012, grid: [9, 18], from: 'edges' }
        }, 0.9);
        break;
      }

      /* ---- TRUE VALUE / ASSEMBLY (live calculator) ---- */
      case 7: {
        const layers = q('[data-layer]');
        const total  = gid('worthTotal');
        tl.from(ups, { y: 24, autoAlpha: 0, duration: 0.9, stagger: 0.1 }, 0);
        // each component drops in and locks — engine assembly
        layers.forEach((ly, idx) => {
          const at = 0.3 + idx * 0.28;
          tl.from(ly, { y: -34, autoAlpha: 0, duration: 0.55, ease: 'power3.out' }, at);
          tl.fromTo(ly, { scaleX: 1.015 }, { scaleX: 1, duration: 0.3, ease: 'power2.out' }, at + 0.45);
          const bolts = ly.querySelectorAll('.layer__bolt');
          if (bolts.length) tl.from(bolts, { scale: 0, duration: 0.3, ease: 'back.out(2)', stagger: 0.06 }, at + 0.4);
        });
        // count the computed annual revenue per customer up from zero
        const cv = annualRevPerCustomer, o = { v: 0 };
        tl.set(total, { textContent: 'R0' }, 0.3);
        tl.to(o, { v: cv, duration: 1.2, ease: 'power2.out', onUpdate: () => { total.textContent = fmtR(o.v); } }, 0.3 + (layers.length - 1) * 0.28);
        break;
      }

      /* ---- RECOVERABLE OPPORTUNITY (live, uses Slide 8 value) ---- */
      case 8: {
        const fin = computeOpp();
        tl.from(ups, { y: 24, autoAlpha: 0, duration: 0.9, stagger: 0.1 }, 0);
        tl.from(q('[data-fstep]'), { autoAlpha: 0, x: -18, duration: 0.7, stagger: 0.12 }, 0.2);
        tl.from(q('.fstep__bar i'), { scaleX: 0, transformOrigin: 'left', duration: 0.9, ease: 'power3.out', stagger: 0.12 }, 0.35);
        tl.from(s.querySelector('.gauge'), { autoAlpha: 0, scale: 0.9, duration: 0.9 }, 0.3);
        tl.from(s.querySelector('.opp__controls'), { autoAlpha: 0, y: 16, duration: 0.7 }, 0.6);
        // sweep funnel figures + needle up from zero
        applyGauge(0);
        const o = { t: 0 };
        tl.to(o, {
          t: 1, duration: 1.3, ease: 'power3.out',
          onUpdate: () => {
            setText('oppDb',   fmt(fin.db * o.t));
            setText('oppReach', fmt(fin.reachable * o.t));
            setText('oppReact', fmt(fin.returning * o.t));
            setText('oppRev',   fmtMoney(fin.recovered * o.t));
            setText('gaugeVal', fmtMoney(fin.recovered * o.t));
            applyGauge(fin.f * o.t);
          }
        }, 0.55);
        tl.add(() => syncOpp(), '>'); // settle to exact final state + labels
        break;
      }

      /* ---- STRATEGIC SEQUENCE / RACING LINE ---- */
      case 9: {
        const path = s.querySelector('#racingLine');
        const car  = s.querySelector('#racingCar');
        const apex = q('[data-apex]');
        const phases = q('[data-phase]');
        tl.from(ups, { y: 24, autoAlpha: 0, duration: 0.9, stagger: 0.1 }, 0);
        if (path && car) {
          const len = path.getTotalLength();
          gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
          gsap.set(car, { autoAlpha: 1 });
          const o = { p: 0 };
          tl.to(o, {
            p: 1, duration: 2.0, ease: 'power2.inOut',
            onUpdate: () => {
              path.style.strokeDashoffset = (len * (1 - o.p)).toFixed(1);
              const pt = path.getPointAtLength(len * o.p);
              car.setAttribute('cx', pt.x.toFixed(1));
              car.setAttribute('cy', pt.y.toFixed(1));
            }
          }, 0.3);
        }
        tl.from(apex,   { scale: 0, transformOrigin: 'center', duration: 0.5, ease: 'back.out(2)', stagger: 0.55 }, 0.6);
        tl.from(phases, { autoAlpha: 0, y: 22, duration: 0.8, stagger: 0.55 }, 0.7);
        break;
      }

      /* ---- RECLAIM: WAKE THE 9,000 ---- */
      case 10: {
        const boots = q('[data-boot]');
        const segs  = q('[data-seg]');
        const fills = q('.seg__bar i');
        const counts= q('[data-count]');
        tl.from(ups, { y: 24, autoAlpha: 0, duration: 0.9, stagger: 0.1 }, 0);
        tl.from(s.querySelector('[data-console]'), { autoAlpha: 0, y: 26, duration: 0.8 }, 0.2);
        // boot lines come online one at a time
        boots.forEach((b, idx) => {
          const at = 0.45 + idx * 0.2;
          tl.from(b, { autoAlpha: 0, x: -14, duration: 0.5 }, at);
          tl.from(b.querySelector('.boot__status'), { autoAlpha: 0, scale: 0.7, duration: 0.35, ease: 'back.out(2)' }, at + 0.12);
        });
        // segments build
        const segStart = 0.45 + boots.length * 0.2;
        tl.from(segs, { autoAlpha: 0, x: 14, duration: 0.6, stagger: 0.12 }, segStart);
        tl.from(fills, { scaleX: 0, transformOrigin: 'left', duration: 1, ease: 'power3.out', stagger: 0.12 }, segStart + 0.1);
        counts.forEach((c) => { tl.set(c, { textContent: '0' }, segStart); countUp(c, tl, segStart + 0.1); });
        break;
      }

      /* ---- REACTIVATION IN ACTION ---- */
      case 11: {
        const cards = q('[data-msgcard]');
        const fnodes= q('[data-fnode]');
        const arrs  = q('[data-arr]');
        tl.from(ups, { y: 24, autoAlpha: 0, duration: 0.9, stagger: 0.1 }, 0);
        tl.from(cards, { autoAlpha: 0, y: 36, duration: 0.8, stagger: 0.18 }, 0.25);
        // bubbles populate per card, like a live conversation
        cards.forEach((card, ci) => {
          const bubbles = card.querySelectorAll('[data-bubble]');
          bubbles.forEach((b, bi) => {
            tl.from(b, { autoAlpha: 0, y: 12, scale: 0.96, duration: 0.4, ease: 'power2.out' }, 0.6 + ci * 0.18 + bi * 0.28);
          });
        });
        // flow illuminates left to right
        const flowAt = 1.5;
        fnodes.forEach((f, idx) => tl.from(f, { autoAlpha: 0, y: 14, duration: 0.5 }, flowAt + idx * 0.22));
        arrs.forEach((a, idx) => tl.from(a, { scaleX: 0, transformOrigin: 'left', duration: 0.3 }, flowAt + 0.12 + idx * 0.22));
        break;
      }

      /* ---- RETAIN: STOP THE LEAK ---- */
      case 12: {
        const leaks = q('[data-leaknode]');
        const drip  = s.querySelector('[data-drip]');
        const states= q('[data-state]');
        const ring  = s.querySelector('#loopRing');
        const car   = s.querySelector('#loopCar');
        const pts   = q('.lpt');
        const legs  = q('[data-lleg]');
        tl.from(ups, { y: 24, autoAlpha: 0, duration: 0.9, stagger: 0.1 }, 0);
        tl.from(states, { autoAlpha: 0, y: 30, duration: 0.8, stagger: 0.15 }, 0.2);
        tl.from(leaks, { autoAlpha: 0, x: -14, duration: 0.5, stagger: 0.16 }, 0.5);
        if (drip) tl.fromTo(drip, { autoAlpha: 0, y: -6 }, { autoAlpha: 1, y: 8, duration: 0.8, ease: 'power1.in' }, 1.1);
        // closed loop draws + nodes pop + legend
        if (ring) {
          const len = ring.getTotalLength();
          gsap.set(ring, { strokeDasharray: len, strokeDashoffset: len });
          tl.to(ring, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut' }, 0.6);
        }
        tl.from(pts, { scale: 0, transformOrigin: 'center', duration: 0.45, ease: 'back.out(2)', stagger: 0.16 }, 0.9);
        tl.from(legs, { autoAlpha: 0, x: 14, duration: 0.5, stagger: 0.12 }, 1.0);
        // continuous pulse travelling the loop
        if (ring && car) {
          const len = ring.getTotalLength();
          if (loopTween) loopTween.kill();
          const o = { p: 0 };
          loopTween = gsap.to(o, {
            p: 1, duration: 6, ease: 'none', repeat: -1,
            onUpdate: () => { const pt = ring.getPointAtLength(((o.p + 0.75) % 1) * len); car.setAttribute('cx', pt.x.toFixed(1)); car.setAttribute('cy', pt.y.toFixed(1)); }
          });
        }
        break;
      }

      /* ---- SERVICE REMINDERS IN ACTION ---- */
      case 13: {
        const stages = q('[data-pstage]');
        const wires  = q('[data-pwire]');
        const meter  = s.querySelector('.pmeter i');
        const cells  = q('.cal__d');
        const onCell = s.querySelector('.cal__d.is-on');
        wires.forEach((w) => w.classList.remove('is-live'));
        tl.from(ups, { y: 24, autoAlpha: 0, duration: 0.9, stagger: 0.1 }, 0);
        // signal flows through the pipeline triggering each stage, wires pulsing between them
        stages.forEach((st, idx) => {
          tl.from(st, { autoAlpha: 0, y: 22, duration: 0.55, ease: 'power3.out' }, 0.3 + idx * 0.32);
        });
        wires.forEach((w, idx) => {
          tl.call(() => w.classList.add('is-live'), null, 0.55 + idx * 0.32);
        });
        if (meter) tl.fromTo(meter, { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: 'power3.out' }, 0.7);
        if (cells.length) tl.from(cells, { autoAlpha: 0, scale: 0.6, duration: 0.3, stagger: 0.01 }, 1.7);
        if (onCell) tl.fromTo(onCell, { boxShadow: '0 0 0 rgba(225,6,0,0)' }, { boxShadow: '0 0 14px rgba(225,6,0,0.85)', duration: 0.4, yoyo: true, repeat: 1 }, 2.1);
        tl.from(q('.remind__note'), { autoAlpha: 0, y: 14, duration: 0.6 }, 2.0);
        break;
      }

      /* ---- REVIEWS IN ACTION ---- */
      case 14: {
        const review = s.querySelector('[data-review]');
        const chain  = q('[data-rchain]');
        const stats  = q('[data-rstat]');
        const counts = q('[data-count]');
        const line   = s.querySelector('#rgLine');
        const area   = s.querySelector('#rgArea');
        tl.from(ups, { y: 24, autoAlpha: 0, duration: 0.9, stagger: 0.1 }, 0);
        tl.from(review, { autoAlpha: 0, y: 28, duration: 0.8 }, 0.25);
        tl.from(review.querySelector('.review__stars'), { autoAlpha: 0, scale: 0.8, duration: 0.5, ease: 'back.out(2)' }, 0.6);
        tl.from(chain, { autoAlpha: 0, y: 12, duration: 0.45, stagger: 0.14 }, 0.7);
        tl.from(stats, { autoAlpha: 0, y: 18, duration: 0.6, stagger: 0.12 }, 0.6);
        counts.forEach((c) => { tl.set(c, { textContent: '0' }, 0.6); countUp(c, tl, 0.7); });
        // compounding growth curve draws + area fades up
        if (line) {
          const len = line.getTotalLength();
          gsap.set(line, { strokeDasharray: len, strokeDashoffset: len });
          tl.to(line, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut' }, 0.7);
        }
        if (area) tl.from(area, { autoAlpha: 0, duration: 1.2 }, 1.1);
        break;
      }

      /* ---- ACQUIRE: WIN THE NEXT 9,000 ---- */
      case 15: {
        const levers = q('[data-lever]');
        tl.from(ups, { y: 24, autoAlpha: 0, duration: 0.9, stagger: 0.1 }, 0);
        tl.from(levers, { autoAlpha: 0, x: -18, duration: 0.6, stagger: 0.14 }, 0.3);
        tl.from(q('.lever__trend i'), { scaleY: 0, transformOrigin: 'bottom', duration: 0.5, ease: 'power3.out', stagger: 0.03 }, 0.6);
        break;
      }

      /* ---- WEBSITE PERFORMANCE ---- */
      case 16: {
        const rings = q('[data-score-ring]');
        const counts = q('[data-count]');
        const C = 2 * Math.PI * 52;
        tl.from(ups, { y: 24, autoAlpha: 0, duration: 0.9, stagger: 0.1 }, 0);
        tl.from(rings, { autoAlpha: 0, scale: 0.9, duration: 0.8, stagger: 0.15 }, 0.25);
        rings.forEach((r, idx) => {
          const bar = r.querySelector('.score__bar');
          const p = (parseFloat(r.style.getPropertyValue('--p')) || 0) / 100;
          gsap.set(bar, { strokeDasharray: C, strokeDashoffset: C });
          tl.to(bar, { strokeDashoffset: C * (1 - p), duration: 1.4, ease: 'power3.out' }, 0.5 + idx * 0.15);
        });
        counts.forEach((c) => { tl.set(c, { textContent: '0' }, 0.4); countUp(c, tl, 0.6); });
        tl.from(q('[data-wmetric]'), { autoAlpha: 0, x: 14, duration: 0.5, stagger: 0.1 }, 0.7);
        break;
      }

      /* ---- SEARCH & AI VISIBILITY ---- */
      case 17: {
        const rows = q('[data-visrow]');
        const sigs = q('.signal');
        sigs.forEach((sg) => Array.from(sg.children).forEach((b) => b.classList.remove('is-on')));
        tl.from(ups, { y: 24, autoAlpha: 0, duration: 0.9, stagger: 0.1 }, 0);
        tl.from(rows, { autoAlpha: 0, x: -16, duration: 0.55, stagger: 0.12 }, 0.3);
        sigs.forEach((sg, si) => {
          const cur = parseInt(sg.dataset.cur, 10) || 0;
          for (let i = 0; i < cur; i++) {
            const bar = sg.children[i];
            tl.call(() => bar.classList.add('is-on'), null, 0.65 + si * 0.12 + i * 0.07);
          }
        });
        break;
      }

      /* ---- REPORTING DASHBOARD ---- */
      case 18: {
        const tiles  = q('[data-tile]');
        const counts = q('[data-count]');
        tl.from(ups, { y: 24, autoAlpha: 0, duration: 0.9, stagger: 0.1 }, 0);
        tl.from(s.querySelector('[data-dash]'), { autoAlpha: 0, y: 26, duration: 0.8 }, 0.2);
        tl.from(tiles, { autoAlpha: 0, y: 18, duration: 0.5, stagger: 0.08 }, 0.4);
        counts.forEach((c) => { tl.set(c, { textContent: '0' }, 0.4); countUp(c, tl, 0.5); });
        tl.from(q('.tile__bars i'), { scaleY: 0, transformOrigin: 'bottom', duration: 0.6, ease: 'power3.out', stagger: 0.06 }, 0.7);
        tl.from(s.querySelector('.dashboard__photo'), { autoAlpha: 0, scale: 1.03, duration: 1 }, 0.35);
        break;
      }

      /* ---- 12-MONTH MODEL (live calculator) ---- */
      case 19: {
        const bars = q('.mbar');
        const fin = computeModel();
        tl.from(ups, { y: 24, autoAlpha: 0, duration: 0.9, stagger: 0.1 }, 0);
        tl.from(s.querySelector('.model__calc'), { autoAlpha: 0, y: 20, duration: 0.8 }, 0.2);
        tl.from(bars, { scaleY: 0, transformOrigin: 'bottom', duration: 0.8, ease: 'power3.out', stagger: 0.045 }, 0.3);
        tl.from(q('.cinput'), { autoAlpha: 0, y: 10, duration: 0.4, stagger: 0.07 }, 0.5);
        tl.from(q('.cout'), { autoAlpha: 0, x: 10, duration: 0.4, stagger: 0.1 }, 0.7);
        // count the revenue streams + combined total up from zero
        const o = { t: 0 };
        tl.to(o, {
          t: 1, duration: 1.2, ease: 'power3.out',
          onUpdate: () => {
            setText('outReact', fmtMoney(fin.reactivation * o.t));
            setText('outRetain', fmtMoney(fin.retention * o.t));
            setText('outAcq', fmtMoney(fin.acquisition * o.t));
            setText('modelTotal', fmtMoney(fin.combined * o.t));
          }
        }, 0.6);
        tl.add(() => renderModel(), '>');
        break;
      }

      /* ---- CURRENT vs GROWTH ---- */
      case 20: {
        const cards = q('[data-ccard]');
        const delta = s.querySelector('.compare__delta');
        tl.from(ups, { y: 24, autoAlpha: 0, duration: 0.9, stagger: 0.1 }, 0);
        tl.from(cards, { autoAlpha: 0, y: 34, duration: 0.85, stagger: 0.2 }, 0.3);
        tl.from(q('.ccard__list li'), { autoAlpha: 0, x: -8, duration: 0.4, stagger: 0.04 }, 0.6);
        tl.from(q('.ccard__price'), { autoAlpha: 0, y: 10, duration: 0.5, stagger: 0.2 }, 0.9);
        // the emotional takeaway lands last
        tl.from(delta, { autoAlpha: 0, y: 18, duration: 0.7 }, 1.2);
        tl.from(s.querySelector('.compare__delta-v'), { scale: 0.9, duration: 0.7, ease: 'power3.out' }, 1.25);
        break;
      }

      /* ---- WHAT HAPPENS AFTER YOU SAY YES (roadmap) ---- */
      case 21: {
        const phases = q('[data-rphase]');
        const track  = s.querySelector('[data-rmap-track]');
        const ms     = q('[data-rms]');
        tl.from(ups, { y: 24, autoAlpha: 0, duration: 0.9, stagger: 0.1 }, 0);
        // phases reveal one at a time, like a journey unfolding
        phases.forEach((p, idx) => {
          const at = 0.3 + idx * 0.22;
          tl.from(p, { autoAlpha: 0, y: 28, duration: 0.6, ease: 'power3.out' }, at);
          tl.from(p.querySelectorAll('.rphase__list li'), { autoAlpha: 0, x: -8, duration: 0.35, stagger: 0.04 }, at + 0.15);
        });
        // milestone track draws, dots ignite in sequence
        if (track) tl.from(track, { scaleX: 0, transformOrigin: 'left', duration: 1.2, ease: 'power2.inOut' }, 1.1);
        tl.from(ms, { autoAlpha: 0, y: 16, duration: 0.5, stagger: 0.16 }, 1.2);
        tl.from(ms.map((m) => m.querySelector('.rms__dot')), { scale: 0, duration: 0.4, ease: 'back.out(2)', stagger: 0.16 }, 1.3);
        break;
      }

      /* ---- FINAL CTA ---- */
      case 22: {
        const nodes = q('.cta__node');
        tl.from(s.querySelector('.cta__grid'), { autoAlpha: 0, duration: 0.9 }, 0);
        tl.from(ups, { y: 22, autoAlpha: 0, duration: 0.9, stagger: 0.12 }, 0.4);
        tl.from(masks, { yPercent: 115, duration: 1.15, ease: EASE }, 0.5);
        tl.set(nodes, { backgroundColor: '#1d1d22', borderColor: 'rgba(255,255,255,0.08)', boxShadow: '0 0 0 rgba(225,6,0,0)' }, 0);
        tl.to(nodes, {
          backgroundColor: '#e10600', borderColor: '#e10600', boxShadow: '0 0 8px rgba(225,6,0,0.7)',
          duration: 0.5, stagger: { each: 0.006, grid: [9, 30], from: 'center' }
        }, 0.6);
        break;
      }
    }
    return tl;
  }

  /* =========================================================
     Navigation
     ========================================================= */
  function navigate(index) { HAS_GSAP ? goTo(index) : goToSimple(index); }

  function goTo(index) {
    if (animating || index === current || index < 0 || index >= count) return;
    animating = true;
    const cur = slides[current];
    const nxt = slides[index];
    const forward = index > current;

    gsap.set(nxt, { zIndex: 2 });
    gsap.set(cur, { zIndex: 1 });
    nxt.classList.add('is-active');

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(cur, { autoAlpha: 0, clearProps: 'zIndex' });
        cur.classList.remove('is-active');
        animating = false;
      }
    });
    tl.to(cur, { autoAlpha: 0, y: forward ? -40 : 40, duration: 0.6, ease: 'power2.inOut' }, 0);
    tl.fromTo(nxt, { autoAlpha: 0, y: forward ? 50 : -50 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: EASE }, 0.25);
    tl.add(buildIntro(index), 0.45);

    current = index;
    updateChrome();
  }

  function goToSimple(index) {
    if (index === current || index < 0 || index >= count) return;
    slides[current].classList.remove('is-active');
    slides[index].classList.add('is-active');
    current = index;
    updateChrome();
  }

  function updateChrome() {
    curNum.textContent = pad(current);
    label.textContent  = slides[current].dataset.label;
    prevBtn.disabled   = current === 0;
    nextBtn.disabled   = current === count - 1;
    dots.forEach((d, i) => d.classList.toggle('is-active', i === current));
    progress.style.width = (((current + 1) / count) * 100) + '%';
  }

  /* ---------- Input ---------- */
  prevBtn.addEventListener('click', () => navigate(current - 1));
  nextBtn.addEventListener('click', () => navigate(current + 1));

  document.addEventListener('keydown', (e) => {
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); navigate(current + 1); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key))      { e.preventDefault(); navigate(current - 1); }
    else if (e.key === 'Home') { navigate(0); }
    else if (e.key === 'End')  { navigate(count - 1); }
  });

  let wheelLock = false;
  deck.addEventListener('wheel', (e) => {
    if (wheelLock || animating) return;
    if (Math.abs(e.deltaY) < 24) return;
    wheelLock = true;
    navigate(current + (e.deltaY > 0 ? 1 : -1));
    setTimeout(() => { wheelLock = false; }, 1100);
  }, { passive: true });

  // Horizontal swipe navigates; vertical is left free for scrolling tall slides on mobile.
  let touchX = null, touchY = null;
  deck.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; touchY = e.touches[0].clientY; }, { passive: true });
  deck.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = touchX - e.changedTouches[0].clientX;
    const dy = touchY - e.changedTouches[0].clientY;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) navigate(current + (dx > 0 ? 1 : -1));
    touchX = touchY = null;
  }, { passive: true });

  /* ---------- Init ---------- */
  function applyScoreRing(ring) {
    const bar = ring.querySelector('.score__bar');
    if (!bar) return;
    const C = 2 * Math.PI * 52;
    const p = (parseFloat(ring.style.getPropertyValue('--p')) || 0) / 100;
    bar.style.strokeDasharray = C;
    bar.style.strokeDashoffset = C * (1 - p);
  }
  function finalizeStatics() {
    setSignalsOn();
    document.querySelectorAll('#ctaGrid .cta__node').forEach((n) => n.classList.add('is-live'));
    document.querySelectorAll('[data-score-ring]').forEach(applyScoreRing);
  }

  function init() {
    buildAssetGrid();
    initWorth();   // Slide 8 — sets annualRevPerCustomer
    initOpp();     // Slide 9 — consumes annualRevPerCustomer
    buildCalendar();
    buildReviewArea();
    buildSignals();
    buildCtaGrid();
    initModel();

    if (HAS_GSAP) {
      gsap.set(slides, { autoAlpha: 0 });
      gsap.set(slides[0], { autoAlpha: 1, zIndex: 2 });
      slides.forEach((s, i) => s.classList.toggle('is-active', i === 0));
      updateChrome();
      requestAnimationFrame(() => buildIntro(0));
    } else {
      // Fallback: no animation engine — reveal everything, navigate via CSS class only.
      document.documentElement.classList.add('no-gsap');
      finalizeCounts();
      finalizeStatics();
      slides.forEach((s, i) => s.classList.toggle('is-active', i === 0));
      updateChrome();
    }
  }

  init();
})();
