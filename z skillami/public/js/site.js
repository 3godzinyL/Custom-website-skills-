/* Ogarnij — skrypt strony (bez zależności). Dane od użytkownika wstawiamy tylko przez textContent. */
(() => {
  'use strict';
  const doc = document.documentElement;
  doc.classList.remove('no-js');
  const body = document.body;
  const LANG = body.dataset.lang === 'en' ? 'en' : 'pl';
  const VARIANT = body.dataset.variant || '';
  const EN = LANG === 'en';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

  // ---------- telemetry (cookieless, aggregated) ----------
  const track = (name) => {
    try {
      const data = JSON.stringify({ name, variant: VARIANT, lang: LANG });
      fetch('/api/e', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: data, keepalive: true }).catch(() => {});
    } catch {}
  };
  let errCount = 0;
  addEventListener('error', (ev) => {
    if (++errCount > 3) return;
    fetch('/api/e/error', { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ message: String(ev.message || 'error').slice(0, 300), source: String(ev.filename || '').slice(0, 200), line: ev.lineno, path: location.pathname }) }).catch(() => {});
  });
  const postJson = async (url, data) => {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    let json = null;
    try { json = await r.json(); } catch {}
    return { ok: r.ok, status: r.status, data: json };
  };
  const toast = (msg) => {
    const t = el('div', 'toast', msg);
    t.setAttribute('role', 'status');
    body.append(t);
    setTimeout(() => t.remove(), 2200);
  };

  // ---------- header & menu ----------
  const hdr = $('#hdr');
  if (hdr) addEventListener('scroll', () => hdr.classList.toggle('is-scrolled', scrollY > 30), { passive: true });
  const menuBtn = $('#menuBtn'), nav = $('#nav');
  const setMenu = (open) => {
    nav.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    body.classList.toggle('menu-open', open);
    if (open) nav.querySelector('a')?.focus();
  };
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); } });
    nav.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab' || !nav.classList.contains('is-open')) return;
      const items = $$('a', nav); const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); menuBtn.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); menuBtn.focus(); }
    });
  }

  // ---------- reveal & strike ----------
  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver((entries) => entries.forEach((x) => {
      if (x.isIntersecting) { x.target.classList.add(x.target.classList.contains('js-strike') ? 'is-on' : 'is-on'); io.unobserve(x.target); }
    }), { threshold: 0.25 });
    $$('.reveal, .js-strike').forEach((n) => io.observe(n));
  } else {
    $$('.reveal, .js-strike').forEach((n) => n.classList.add('is-on'));
  }

  // ---------- waitlist forms ----------
  $$('.js-signup').forEach((form) => {
    const input = form.querySelector('input[name="email"]');
    const btn = form.querySelector('button[type="submit"]');
    const msg = form.querySelector('.form-msg');
    const label = btn.textContent;
    const setErr = (text) => { msg.textContent = text || ''; msg.classList.toggle('is-error', !!text); input.setAttribute('aria-invalid', text ? 'true' : 'false'); };
    input.addEventListener('input', () => { if (input.getAttribute('aria-invalid') === 'true' && input.validity.valid) setErr(''); });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = input.value.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { setErr(msg.dataset.errEmail); input.focus(); return; }
      setErr('');
      btn.setAttribute('aria-busy', 'true'); btn.disabled = true; btn.textContent = btn.dataset.sending;
      const fd = new FormData(form);
      try {
        const r = await postJson('/api/waitlist', {
          email, lang: fd.get('lang'), variant: fd.get('variant'), ref: fd.get('ref'), website: fd.get('website'),
          consentMarketing: fd.get('consentMarketing') === '1', source: form.dataset.source,
        });
        if (r.ok && r.data?.next) { location.assign(r.data.next); return; }
        setErr(r.status === 422 ? msg.dataset.errEmail : r.status === 429 ? msg.dataset.errLimit : msg.dataset.errServer);
      } catch { setErr(msg.dataset.errServer); }
      btn.removeAttribute('aria-busy'); btn.disabled = false; btn.textContent = label;
    });
  });

  // ---------- hero phone loop ----------
  const heroPhone = $('.js-hero-phone');
  if (heroPhone) {
    const slots = $$('.slot', heroPhone);
    const tr = $('.js-transcript', heroPhone);
    const rec = $('.js-rec-label', heroPhone);
    const full = tr.dataset.text;
    const recText = rec.textContent;
    let timer = null, visible = true, running = false;
    const showAll = () => { tr.textContent = full; slots.forEach((s) => s.classList.add('is-in')); heroPhone.classList.add('is-done'); rec.textContent = rec.dataset.done; };
    const cycle = () => {
      if (!visible) { running = false; return; }
      running = true;
      heroPhone.classList.remove('is-done');
      slots.forEach((s) => s.classList.remove('is-in'));
      rec.textContent = recText;
      let i = 0;
      const typing = setInterval(() => {
        i += 3; tr.textContent = full.slice(0, i);
        if (i >= full.length) {
          clearInterval(typing);
          heroPhone.classList.add('is-done');
          rec.textContent = rec.dataset.done;
          slots.forEach((s, k) => setTimeout(() => s.classList.add('is-in'), 250 + k * 280));
          timer = setTimeout(cycle, 5200);
        }
      }, 40);
    };
    if (reduced) showAll();
    else {
      new IntersectionObserver(([x]) => { visible = x.isIntersecting; if (visible && !running) { clearTimeout(timer); cycle(); } }).observe(heroPhone);
    }
  }

  // ---------- demo: parser ----------
  const WORDS_H = { pierwszej: 1, drugiej: 2, trzeciej: 3, czwartej: 4, piątej: 5, szóstej: 6, siódmej: 7, ósmej: 8, dziewiątej: 9, dziesiątej: 10, jedenastej: 11, dwunastej: 12, trzynastej: 13, czternastej: 14, piętnastej: 15, szesnastej: 16, siedemnastej: 17, osiemnastej: 18, dziewiętnastej: 19, dwudziestej: 20 };
  const BIG = /(prezentacj|raport|projekt|prac[aęy]\b|pracę|esej|artykuł|referat|magistersk|licencjack|slides|report|project|essay|presentation|thesis)/i;
  // `\b` doesn't treat Polish letters (ę, ą, ż…) as word characters, so words are bounded with Unicode classes.
  const W = (body) => new RegExp(`(?<![\\p{L}\\d])(?:${body})(?![\\p{L}\\d])`, 'iu');
  const DAYS = W('(?:na|do|for|by)\\s+(poniedziałek|poniedziałku|wtorek|wtorku|środę|środy|czwartek|czwartku|piątek|piątku|sobotę|soboty|niedzielę|niedzieli|jutro|monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow)');
  const PART = [
    [W('rano|z rana|in the morning|morning'), 'morning'],
    [W('przed południem|przedpołudniem|before noon'), 'late-morning'],
    [W('po południu|popołudniu|in the afternoon|afternoon|po obiedzie|after lunch'), 'afternoon'],
    [W('wieczorem|wieczór|in the evening|evening|tonight'), 'evening'],
  ];
  const RE_AT = W('(?:o|at|na|od)\\s+(\\d{1,2})(?:[:.](\\d{2}))?(?!\\s*(?:min|minut|h(?![\\p{L}])|godz|zł|%|nagł|slajd|kart|stron))');
  const RE_HHMM = W('(\\d{1,2})[:.](\\d{2})');
  const RE_AT_WORD = W('o\\s+(pierwszej|drugiej|trzeciej|czwartej|piątej|szóstej|siódmej|ósmej|dziewiątej|dziesiątej|jedenastej|dwunastej|trzynastej|czternastej|piętnastej|szesnastej|siedemnastej|osiemnastej|dziewiętnastej|dwudziestej)');
  const RE_MIN = W('(\\d{1,3})\\s*(?:min|minut|minuty|minutes|mins)');
  const RE_HOURS = W('(\\d(?:[.,]5)?)\\s*(?:h|godz|godziny|godzin|hours?)');
  const RE_HALF = W('pół godziny|half an hour');
  const RE_HOUR = W('przez godzinę|godzinę|godzinkę|godzinke|an hour|one hour|for an hour|hour');
  const PART_START = { morning: 7 * 60, 'late-morning': 9 * 60, afternoon: 14 * 60, evening: 18 * 60 };
  const guessDuration = (s, big) => {
    if (big) return 90;
    if (/(siłowni|trening|basen|bieg|gym|workout|run\b)/i.test(s)) return 60;
    if (/(zadzwoni|telefon|call\b|phone|zadzwoń)/i.test(s)) return 15;
    if (/(call|spotkani|meeting|wizyt|dentyst|lekarz|doctor)/i.test(s)) return 60;
    if (/(zakup|kupić|kupic|sklep|buy|shop|groceries)/i.test(s)) return 30;
    if (/(mail|e-mail|odpisa|reply)/i.test(s)) return 15;
    if (/(prani|pranie|laundry|odkurz|sprząt|clean)/i.test(s)) return 20;
    return 30;
  };
  const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

  function parseTasks(text) {
    const parts = text.replace(/\s+(?:a potem|potem|następnie|then|and then)\s+/gi, ',').split(/[,;\n]+|\.\s+/).map((s) => s.trim()).filter(Boolean).slice(0, 40);
    return parts.map((raw) => {
      let s = ` ${raw} `;
      let at = null, dur = null, part = null, due = null;
      let m;
      if ((m = s.match(RE_AT)) && +m[1] < 24) { at = +m[1] * 60 + (+m[2] || 0); s = s.replace(m[0], ' '); }
      else if ((m = s.match(RE_HHMM)) && +m[1] < 24) { at = +m[1] * 60 + +m[2]; s = s.replace(m[0], ' '); }
      else if ((m = s.match(RE_AT_WORD))) {
        let h = WORDS_H[m[1].toLowerCase()];
        if (h < 7) h += 12;
        at = h * 60; s = s.replace(m[0], ' ');
      }
      if ((m = s.match(RE_MIN))) { dur = +m[1]; s = s.replace(m[0], ' '); }
      else if ((m = s.match(RE_HOURS))) { dur = Math.round(parseFloat(m[1].replace(',', '.')) * 60); s = s.replace(m[0], ' '); }
      else if ((m = s.match(RE_HALF))) { dur = 30; s = s.replace(m[0], ' '); }
      else if ((m = s.match(RE_HOUR))) { dur = 60; s = s.replace(m[0], ' '); }
      for (const [re, p] of PART) if ((m = s.match(re))) { part = p; s = s.replace(m[0], ' '); break; }
      if ((m = s.match(DAYS))) { due = m[1]; s = s.replace(m[0], ' '); }
      const big = BIG.test(s);
      let title = s.replace(/\s{2,}/g, ' ').replace(/^\s*(?:i|oraz|and|też|also)\s+/i, '').trim();
      if (!title) title = raw.trim();
      title = title.charAt(0).toUpperCase() + title.slice(1);
      if (title.length > 60) title = title.slice(0, 57) + '…';
      return { title, at, dur: dur || guessDuration(raw, big), part, due, big, fixed: at != null };
    });
  }

  function schedule(tasks) {
    const DAY_START = 7 * 60, DAY_END = 21 * 60, BUF = 10;
    const busy = [];
    const free = (start, dur) => start >= DAY_START && start + dur <= DAY_END && busy.every((b) => start + dur + BUF <= b.s || start >= b.e + BUF);
    const place = (t, s) => { t.start = s; busy.push({ s, e: s + t.dur }); };
    const out = [], tomorrow = [];
    for (const t of tasks.filter((x) => x.fixed)) { place(t, t.at); out.push(t); }
    const rest = tasks.filter((x) => !x.fixed).sort((a, b) => (b.big - a.big) || ((a.part ? 0 : 1) - (b.part ? 0 : 1)));
    for (const t of rest) {
      const pref = t.part ? PART_START[t.part] : t.big ? 9 * 60 : 8 * 60;
      let s = null;
      for (let m = pref; m <= DAY_END - t.dur; m += 5) if (free(m, t.dur)) { s = m; break; }
      if (s == null) for (let m = DAY_START; m < pref; m += 5) if (free(m, t.dur)) { s = m; break; }
      if (s == null) tomorrow.push(t); else { place(t, s); out.push(t); }
    }
    out.sort((a, b) => a.start - b.start);
    return { out, tomorrow };
  }

  const demoForm = $('.js-demo');
  if (demoForm) {
    const ta = $('#demo-text');
    const outBox = $('.js-demo-out');
    const runBtn = demoForm.querySelector('button[type="submit"]');
    const T = EN
      ? { fixed: 'fixed', first: 'first step', due: 'due', focus: 'focus block', tomorrow: 'Tomorrow (no room today)', tooMany: (n) => `That’s too much for one day — ${n} moved to tomorrow.`, step: 'First 10 min: open it and jot down 3 points', empty: 'Your plan will appear here.' }
      : { fixed: 'stałe', first: 'pierwszy krok', due: 'termin', focus: 'blok skupienia', tomorrow: 'Jutro (dziś zabrakło miejsca)', tooMany: (n) => `Na jeden dzień to za dużo — ${n} przechodzi na jutro.`, step: 'Pierwsze 10 min: otwórz i zapisz 3 punkty', empty: 'Tu pojawi się Twój plan.' };
    const render = () => {
      const text = ta.value.trim();
      outBox.replaceChildren();
      if (!text) { outBox.append(el('p', 'demo-empty', T.empty)); return; }
      const { out, tomorrow } = schedule(parseTasks(text));
      const list = el('div', 'slots');
      for (const t of out) {
        const row = el('div', `slot${t.fixed ? ' slot--fixed' : ''}`);
        row.append(el('time', null, fmt(t.start)));
        const card = el('div', 'slot__card', t.title);
        const meta = [t.fixed ? T.fixed : null, t.big ? T.focus : null, `${t.dur} min`, t.due ? `${T.due}: ${t.due}` : null].filter(Boolean).join(' · ');
        card.append(el('small', null, meta));
        if (t.big) card.append(el('small', null, `${T.first}: ${T.step}`));
        row.append(card);
        list.append(row);
      }
      outBox.append(list);
      if (tomorrow.length) {
        const w = el('div', 'demo-warn');
        w.append(el('strong', null, T.tomorrow), el('br'));
        w.append(document.createTextNode(tomorrow.map((t) => t.title).join(', ')));
        if (tomorrow.length > 3) { w.append(el('br')); w.append(document.createTextNode(T.tooMany(tomorrow.length))); }
        outBox.append(w);
      }
    };
    demoForm.addEventListener('submit', (e) => { e.preventDefault(); render(); track('demo_run'); });
    render(); // show the example result right away so the phone is never empty
    ta.addEventListener('input', () => { runBtn.disabled = !ta.value.trim(); });
    $('.js-demo-reset')?.addEventListener('click', () => { ta.value = ta.dataset.sample; runBtn.disabled = false; render(); });

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const dict = $('.js-dictate');
    if (SR && dict) {
      dict.hidden = false;
      let rec = null, base = '';
      const label = dict.querySelector('span');
      const stop = () => { rec?.stop(); };
      dict.addEventListener('click', () => {
        if (rec) { stop(); return; }
        rec = new SR();
        rec.lang = EN ? 'en-GB' : 'pl-PL';
        rec.interimResults = true;
        rec.continuous = true;
        base = ta.value.trim() ? ta.value.trim() + ', ' : '';
        rec.onresult = (ev) => {
          let txt = '';
          for (const r of ev.results) txt += r[0].transcript;
          ta.value = (base + txt).slice(0, 2000);
          runBtn.disabled = !ta.value.trim();
        };
        rec.onend = () => { rec = null; dict.classList.remove('is-recording'); label.textContent = dict.dataset.start; if (ta.value.trim()) render(); };
        rec.onerror = () => { rec = null; dict.classList.remove('is-recording'); label.textContent = dict.dataset.start; };
        rec.start();
        dict.classList.add('is-recording');
        label.textContent = dict.dataset.stop;
        track('demo_dictate');
      });
    }
  }

  // ---------- plan B ----------
  const late = $('.js-late');
  if (late) {
    const track_ = $('#track');
    const swap = (sel, on) => $$(sel).forEach((n) => { n.textContent = on ? n.dataset.on : n.dataset.off; });
    late.addEventListener('click', () => {
      const on = !track_.classList.contains('is-late');
      track_.classList.toggle('is-late', on);
      late.setAttribute('aria-pressed', String(on));
      late.textContent = on ? late.dataset.on : late.dataset.off;
      swap('.js-meet', on); swap('.js-focus', on);
      const tom = $('.js-tomorrow');
      tom.replaceChildren();
      if (on) {
        // data-on contains trusted server markup: "<b>…</b> rest"
        const m = tom.dataset.on.match(/^<b>(.*?)<\/b>\s*(.*)$/);
        if (m) tom.append(el('b', null, m[1]), document.createTextNode(' ' + m[2])); else tom.textContent = tom.dataset.on;
      } else tom.textContent = tom.dataset.off;
    });
  }

  // ---------- pricing toggle ----------
  $$('.js-billing').forEach((b) => b.addEventListener('click', () => {
    const p = b.dataset.period;
    $$('.js-billing').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    $$('.js-price').forEach((n) => { n.textContent = n.dataset[p]; });
    $$('.js-per').forEach((n) => { n.textContent = n.dataset[p]; });
    track('pricing_toggle');
  }));
  $$('.js-faq').forEach((d) => d.addEventListener('toggle', () => { if (d.open) track('faq_open'); }));

  // ---------- confirmation page ----------
  const conf = $('.js-confirm');
  if (conf && conf.dataset.token && $('.js-confirm-title')) {
    postJson('/api/waitlist/confirm', { token: conf.dataset.token }).then((r) => {
      if (r.data?.ok && r.data.next) { location.replace(r.data.next); return; }
      $('.js-confirm-title').textContent = EN ? 'Couldn’t confirm' : 'Nie udało się potwierdzić';
      $('.js-confirm-msg').textContent = r.data?.reason === 'expired' ? conf.dataset.failExpired : conf.dataset.failInvalid;
    }).catch(() => { $('.js-confirm-msg').textContent = conf.dataset.failInvalid; });
  }

  // ---------- queue page ----------
  $$('.js-copy').forEach((b) => b.addEventListener('click', async () => {
    const input = document.getElementById(b.dataset.target);
    try { await navigator.clipboard.writeText(input.value); } catch { input.select(); document.execCommand?.('copy'); }
    toast(b.dataset.done);
    track('referral_copy');
  }));
  $$('.js-share').forEach((b) => {
    if (!navigator.share) return;
    b.hidden = false;
    b.addEventListener('click', () => { navigator.share({ title: 'Ogarnij', text: b.dataset.text, url: b.dataset.url }).then(() => track('referral_share')).catch(() => {}); });
  });
  const survey = $('.js-survey');
  if (survey) {
    survey.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[value]');
      if (!btn) return;
      $$('button', survey).forEach((x) => { x.setAttribute('aria-pressed', String(x === btn)); x.disabled = true; });
      const r = await postJson('/api/survey', { key: survey.dataset.key, answer: btn.value }).catch(() => ({}));
      $('.form-msg', survey).textContent = r.ok ? survey.dataset.thanks : (EN ? 'Couldn’t save.' : 'Nie udało się zapisać.');
      if (!r.ok) $$('button', survey).forEach((x) => { x.disabled = false; });
    });
  }

  // ---------- presale ----------
  const orderForm = $('.js-order');
  if (orderForm) {
    const money = (v) => (EN ? `PLN ${(v / 100).toFixed(2)}` : `${(v / 100).toFixed(2).replace('.', ',')} zł`);
    const codeMsg = $('.js-code-msg');
    const msg = $('.js-order-msg');
    const applyQuote = (q) => {
      $('.js-disc-row').hidden = !q.discount;
      $('.js-disc').textContent = '−' + money(q.discount);
      $('.js-disc-code').textContent = q.code || '';
      $('.js-total').textContent = money(q.amount);
    };
    $('.js-apply-code').addEventListener('click', async () => {
      const code = orderForm.code.value.trim();
      const r = await fetch('/api/quote?code=' + encodeURIComponent(code)).then((x) => x.json()).catch(() => null);
      if (!r) return;
      applyQuote(r);
      codeMsg.classList.toggle('is-error', !!r.invalidCode);
      codeMsg.textContent = r.invalidCode ? msg.dataset.errCode : r.code ? (EN ? `Code ${r.code}: −${r.percent}%` : `Kod ${r.code}: −${r.percent}%`) : '';
    });
    orderForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = orderForm;
      const setErr = (t) => { msg.textContent = t || ''; msg.classList.toggle('is-error', !!t); };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.value.trim())) { setErr(msg.dataset.errEmail); f.email.focus(); return; }
      if (!f.acceptTerms.checked) { setErr(msg.dataset.errTerms); f.acceptTerms.focus(); return; }
      const btn = f.querySelector('button[type="submit"]');
      btn.disabled = true; btn.setAttribute('aria-busy', 'true');
      try {
        const r = await postJson('/api/orders', { email: f.email.value.trim(), name: f.name.value.trim(), nip: f.nip.value.trim(), code: f.code.value.trim(), acceptTerms: true, lang: orderForm.dataset.lang });
        if (r.ok && r.data?.redirectUrl) { location.assign(r.data.redirectUrl); return; }
        const errs = { invalid_email: 'errEmail', terms_required: 'errTerms', invalid_nip: 'errNip', invalid_code: 'errCode' };
        setErr(msg.dataset[errs[r.data?.error] || 'errServer']);
      } catch { setErr(msg.dataset.errServer); }
      btn.disabled = false; btn.removeAttribute('aria-busy');
    });
  }

  // ---------- sandbox payment ----------
  const sb = $('.js-sandbox');
  if (sb) {
    sb.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[value]');
      if (!btn) return;
      $$('button', sb).forEach((x) => { x.disabled = true; });
      const r = await postJson('/api/sandbox/pay', { orderId: sb.dataset.order, key: sb.dataset.key, outcome: btn.value }).catch(() => ({}));
      if (r.ok && r.data?.next) { location.assign(r.data.next); return; }
      sb.parentElement.querySelector('.form-msg').textContent = 'Operator odrzucił powiadomienie. Spróbuj ponownie.';
      $$('button', sb).forEach((x) => { x.disabled = false; });
    });
  }
  $$('.js-print').forEach((b) => b.addEventListener('click', () => print()));

  // ---------- PWA ----------
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  }
  if (body.dataset.page === 'home') track('page_view');
})();
