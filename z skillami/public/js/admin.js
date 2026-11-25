/* Panel właściciela Ogarnij. Dane wstawiane wyłącznie przez textContent (h()). */
(() => {
  'use strict';
  const app = document.getElementById('app');
  const S = { user: null, csrf: '', view: 'dashboard' };
  const RANK = { viewer: 1, editor: 2, owner: 3 };
  const can = (role) => S.user && RANK[S.user.role] >= RANK[role];

  function h(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (k === 'class') n.className = v;
      else if (k === 'value') n.value = v;
      else if (k === 'checked') n.checked = !!v;
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat(Infinity)) if (c != null && c !== false) n.append(c instanceof Node ? c : document.createTextNode(String(c)));
    return n;
  }
  const fmtDate = (t) => (t ? new Date(t).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' }) : '—');
  const zl = (g) => `${(g / 100).toFixed(2).replace('.', ',')} zł`;
  const pct = (x) => `${(x * 100).toFixed(1).replace('.', ',')}%`;
  const ERR = {
    bad_credentials: 'Nieprawidłowy e-mail lub hasło.', rate_limited: 'Za dużo prób. Odczekaj kilka minut.', bad_code: 'Nieprawidłowy kod.',
    forbidden: 'Brak uprawnień.', csrf: 'Sesja wygasła — odśwież stronę.', invalid_code: 'Kod: 3–24 znaki A–Z, 0–9, myślnik.', invalid_percent: 'Rabat: 1–90%.',
    code_taken: 'Taki kod już istnieje.', invalid_slug: 'Slug: małe litery, cyfry, myślniki.', invalid_title: 'Podaj tytuł.', invalid_body: 'Treść jest pusta lub za długa.',
    slug_taken: 'Taki slug już istnieje.', weak_password: 'Hasło musi mieć co najmniej 12 znaków.', last_owner: 'Nie można odebrać roli ostatniemu właścicielowi.',
    email_taken: 'Ten e-mail ma już konto.', invalid_user: 'Podaj poprawny e-mail i imię.', not_paid: 'Zamówienie nie jest opłacone.', already_enabled: '2FA jest już włączone.',
  };
  const errText = (e) => ERR[e?.code] || 'Coś poszło nie tak.';

  async function api(method, url, body) {
    const opt = { method, headers: {} };
    if (body !== undefined) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
    if (method !== 'GET' && S.csrf) opt.headers['X-CSRF-Token'] = S.csrf;
    const r = await fetch(url, opt);
    let data = null;
    try { data = await r.json(); } catch {}
    if (r.status === 401 && !url.includes('/login')) { S.user = null; renderLogin(); throw Object.assign(new Error('unauthorized'), { code: 'unauthorized' }); }
    if (!r.ok) throw Object.assign(new Error(data?.error || r.status), { code: data?.error, status: r.status });
    return data;
  }

  // ---------- login ----------
  function renderLogin(step = 'password') {
    const msg = h('p', { class: 'msg', role: 'alert' });
    let form;
    if (step === 'password') {
      const email = h('input', { class: 'input', id: 'l-email', type: 'email', autocomplete: 'username', required: true });
      const pass = h('input', { class: 'input', id: 'l-pass', type: 'password', autocomplete: 'current-password', required: true });
      form = h('form', { class: 'login', onsubmit: async (e) => {
        e.preventDefault(); msg.textContent = '';
        try {
          const r = await api('POST', '/api/admin/login', { email: email.value, password: pass.value });
          if (r.twoFactor) return renderLogin('2fa');
          S.user = r.user; S.csrf = r.csrf; renderShell();
        } catch (err) { msg.textContent = errText(err); msg.className = 'msg is-error'; }
      } },
      h('h1', null, 'Panel Ogarnij'), h('div', { class: 'field' }, h('label', { for: 'l-email' }, 'E-mail'), email),
      h('div', { class: 'field' }, h('label', { for: 'l-pass' }, 'Hasło'), pass), msg, h('button', { class: 'btn btn--primary', type: 'submit' }, 'Zaloguj'));
      app.replaceChildren(form); email.focus();
    } else {
      const code = h('input', { class: 'input', id: 'l-code', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: '6', pattern: '[0-9]{6}', required: true });
      form = h('form', { class: 'login', onsubmit: async (e) => {
        e.preventDefault();
        try { const r = await api('POST', '/api/admin/login/2fa', { code: code.value.trim() }); S.user = r.user; S.csrf = r.csrf; renderShell(); }
        catch (err) { msg.textContent = err.status === 401 && err.code === 'unauthorized' ? 'Sesja logowania wygasła — zaloguj się ponownie.' : errText(err); msg.className = 'msg is-error'; }
      } }, h('h1', null, 'Kod z aplikacji'), h('p', { class: 'muted' }, 'Wpisz 6-cyfrowy kod z aplikacji uwierzytelniającej.'),
      h('div', { class: 'field' }, h('label', { for: 'l-code' }, 'Kod'), code), msg, h('button', { class: 'btn btn--primary', type: 'submit' }, 'Potwierdź'));
      app.replaceChildren(form); code.focus();
    }
    app.className = '';
  }

  // ---------- shell ----------
  const VIEWS = [
    ['dashboard', 'Pulpit', 'viewer'], ['subscribers', 'Lista oczekujących', 'viewer'], ['orders', 'Zamówienia', 'viewer'], ['codes', 'Kody rabatowe', 'viewer'],
    ['posts', 'Poradnik', 'viewer'], ['emails', 'E-maile', 'viewer'], ['health', 'Zdrowie systemu', 'viewer'], ['users', 'Użytkownicy', 'owner'],
    ['audit', 'Dziennik działań', 'owner'], ['account', 'Moje konto', 'viewer'],
  ];
  let main;
  function renderShell() {
    const nav = h('nav', { class: 'adm__nav', 'aria-label': 'Panel' }, VIEWS.filter(([, , r]) => can(r)).map(([id, label]) =>
      h('button', { type: 'button', 'aria-current': S.view === id ? 'page' : null, onclick: () => go(id) }, label)));
    main = h('main', { class: 'adm__main', id: 'main' });
    const side = h('aside', { class: 'adm__side' },
      h('div', { class: 'adm__logo' }, h('i'), 'Ogarnij'), nav,
      h('div', { class: 'adm__me' }, h('span', null, S.user.name), h('span', { class: 'mono' }, `${S.user.email} · ${S.user.role}`),
        h('button', { class: 'btn btn--secondary', type: 'button', onclick: async () => { await api('POST', '/api/admin/logout', {}).catch(() => {}); S.user = null; renderLogin(); } }, 'Wyloguj'),
        h('a', { href: '/', class: 'muted' }, '← strona')));
    app.className = 'adm';
    app.replaceChildren(side, main);
    go(S.view);
  }
  function go(view) {
    S.view = view;
    history.replaceState(null, '', '#' + view);
    document.querySelectorAll('.adm__nav button').forEach((b, i) => b.setAttribute('aria-current', VIEWS.filter(([, , r]) => can(r))[i][0] === view ? 'page' : 'false'));
    main.replaceChildren(h('p', { class: 'muted' }, 'Ładowanie…'));
    (V[view] || V.dashboard)().catch((err) => { if (err.code !== 'unauthorized') main.replaceChildren(h('p', { class: 'msg is-error' }, errText(err))); });
  }
  const head = (title, ...actions) => h('div', { class: 'adm__head' }, h('h1', null, title), h('div', { class: 'row' }, actions));
  const table = (cols, rows, empty = 'Brak danych.') => rows.length
    ? h('div', { class: 'table-wrap' }, h('table', null, h('thead', null, h('tr', null, cols.map((c) => h('th', { class: c.num ? 'num' : null, scope: 'col' }, c.label)))),
      h('tbody', null, rows.map((r) => h('tr', null, cols.map((c) => h('td', { class: c.num ? 'num' : null }, c.render ? c.render(r) : r[c.key])))))))
    : h('p', { class: 'empty' }, empty);
  const pill = (s, label) => h('span', { class: `pill pill--${s}` }, label || s);
  const bars = (entries, max, cls = '') => h('div', { class: 'bars' }, entries.map(([label, v, right]) => {
    const fill = h('div', { class: `bar__fill ${cls}` });
    fill.style.width = `${max ? Math.round((v / max) * 100) : 0}%`;
    return h('div', { class: 'bar' }, h('span', null, label), h('div', { class: 'bar__track' }, fill), h('b', null, right ?? v));
  }));

  const V = {};
  V.dashboard = async () => {
    const d = await api('GET', '/api/admin/dashboard');
    const kpi = (v, l) => h('div', { class: 'kpi' }, h('b', null, v), h('span', null, l));
    const days = [];
    for (let i = 29; i >= 0; i--) days.push(new Date(Date.now() - i * 864e5).toISOString().slice(0, 10));
    const byDay = Object.fromEntries(d.daily.map((r) => [r.d, r]));
    const max = Math.max(1, ...d.daily.map((r) => r.n));
    const spark = h('div', { class: 'spark', role: 'img', 'aria-label': 'Zapisy dziennie, ostatnie 30 dni' }, days.map((day) => {
      const r = byDay[day] || { n: 0, c: 0 };
      const col = h('span', { title: `${day}: ${r.n} zapisów, ${r.c} potwierdzonych` });
      col.style.height = `${(r.n / max) * 100}%`;
      const inner = h('i'); inner.style.height = r.n ? `${(r.c / r.n) * 100}%` : '0';
      col.append(inner);
      return col;
    }));
    const SURVEY = { kartki: 'Kartki i notatki', aplikacja: 'Aplikacja', kalendarz: 'Tylko kalendarz', glowa: 'W głowie', nic: 'Nie planuje' };
    const sMax = Math.max(1, ...Object.values(d.survey));
    const FUN = [['page_view', 'Wejścia na główną'], ['hero_impression', 'Wyświetlenia hero (A/B)'], ['demo_run', 'Uruchomienia demo'], ['demo_dictate', 'Dyktowanie w demo'], ['waitlist_submit', 'Wysłane zapisy'], ['waitlist_confirm', 'Potwierdzenia'], ['referral_copy', 'Skopiowane linki'], ['presale_start', 'Rozpoczęte zamówienia'], ['presale_paid', 'Opłacone zamówienia']];
    const fMax = Math.max(1, ...FUN.map(([k]) => d.funnel[k] || 0));
    main.replaceChildren(
      head('Pulpit'),
      h('div', { class: 'cards' }, kpi(d.totals.created, 'zapisów łącznie'), kpi(d.totals.confirmed, 'potwierdzonych'), kpi(pct(d.confirmRate), 'potwierdza e-mail'),
        kpi(d.totals.referred, 'z polecenia'), kpi(d.totals.marketing, 'zgoda na porady'), kpi(d.orders.n, 'opłacone zamówienia'), kpi(zl(d.orders.revenue), 'przychód przedsprzedaży')),
      h('div', { class: 'grid2' },
        h('section', { class: 'box' }, h('h2', null, 'Zapisy dziennie (30 dni)'), spark, h('p', { class: 'muted mono' }, 'Kolor: część potwierdzona.')),
        h('section', { class: 'box' }, h('h2', null, 'Lejek (30 dni)'), bars(FUN.map(([k, l]) => [l, d.funnel[k] || 0]), fMax))),
      h('div', { class: 'grid2' },
        h('section', { class: 'box' }, h('h2', null, 'Test A/B nagłówka'), table([
          { label: 'Wariant', render: (r) => r.variant.toUpperCase() }, { label: 'Wyświetlenia', key: 'impressions', num: true }, { label: 'Zapisy', key: 'signups', num: true },
          { label: 'Konwersja', num: true, render: (r) => pct(r.rate) }, { label: 'p (vs A)', num: true, render: (r) => (r.pValue == null ? '—' : r.pValue.toFixed(3)) },
        ], d.ab), h('p', { class: 'muted' }, 'p < 0,05 przy co najmniej kilkuset wyświetleniach na wariant = różnica raczej nieprzypadkowa.')),
        h('section', { class: 'box' }, h('h2', null, 'Ankieta: jak dziś planujesz?'), bars(Object.entries(d.survey).map(([k, v]) => [SURVEY[k] || k, v]), sMax, 'bar__fill--primary'))),
      h('section', { class: 'box' }, h('h2', null, 'Najwięcej poleceń'), table([
        { label: 'E-mail', key: 'email' }, { label: 'Polecenia', key: 'refs', num: true }, { label: 'Miejsce', key: 'position', num: true },
      ], d.topReferrers, 'Nikt jeszcze nikogo nie polecił.')),
    );
  };

  V.subscribers = async () => {
    const st = { q: '', status: '', page: 1 };
    const q = h('input', { class: 'input', id: 's-q', type: 'search', placeholder: 'fragment e-maila' });
    const status = h('select', { class: 'select', id: 's-st' }, [['', 'Wszystkie'], ['confirmed', 'Potwierdzone'], ['pending', 'Niepotwierdzone'], ['unsubscribed', 'Wypisane']].map(([v, l]) => h('option', { value: v }, l)));
    const out = h('div');
    const exportBtn = can('editor') ? h('button', { class: 'btn btn--secondary', type: 'button', onclick: () => { location.href = `/api/admin/subscribers.csv?q=${encodeURIComponent(st.q)}&status=${encodeURIComponent(st.status)}`; } }, 'Eksport CSV') : null;
    const load = async () => {
      const d = await api('GET', `/api/admin/subscribers?q=${encodeURIComponent(st.q)}&status=${encodeURIComponent(st.status)}&page=${st.page}`);
      const pages = Math.max(1, Math.ceil(d.total / d.per));
      out.replaceChildren(table([
        { label: 'E-mail', key: 'email' }, { label: 'Status', render: (r) => pill(r.status) }, { label: 'Miejsce', num: true, render: (r) => r.position ?? '—' },
        { label: 'Polecenia', key: 'referrals', num: true }, { label: 'Język', key: 'lang' }, { label: 'Wariant', render: (r) => (r.variant || '—').toUpperCase() },
        { label: 'Porady', render: (r) => (r.consent_marketing ? 'tak' : 'nie') }, { label: 'Ankieta', render: (r) => r.survey_answer || '—' },
        { label: 'Zapis', render: (r) => fmtDate(r.created_at) },
        ...(can('owner') ? [{ label: '', render: (r) => h('button', { class: 'btn btn--danger', type: 'button', onclick: async () => {
          if (!confirm(`Usunąć trwale ${r.email}? (RODO — nie da się cofnąć)`)) return;
          await api('DELETE', `/api/admin/subscribers/${r.id}`); load();
        } }, 'Usuń') }] : []),
      ], d.rows, 'Brak zapisów dla tych filtrów.'),
      h('div', { class: 'pager' }, h('button', { class: 'btn btn--secondary', type: 'button', disabled: st.page <= 1, onclick: () => { st.page--; load(); } }, '←'),
        `Strona ${d.page} z ${pages} · ${d.total} rekordów`, h('button', { class: 'btn btn--secondary', type: 'button', disabled: st.page >= pages, onclick: () => { st.page++; load(); } }, '→')));
    };
    let t;
    q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { st.q = q.value.trim(); st.page = 1; load(); }, 250); });
    status.addEventListener('change', () => { st.status = status.value; st.page = 1; load(); });
    main.replaceChildren(head('Lista oczekujących', exportBtn), h('div', { class: 'toolbar' }, h('div', { class: 'field' }, h('label', { for: 's-q' }, 'Szukaj'), q), h('div', { class: 'field' }, h('label', { for: 's-st' }, 'Status'), status)), out);
    await load();
  };

  V.orders = async () => {
    const d = await api('GET', '/api/admin/orders');
    const S_PL = { pending: 'czeka', paid: 'opłacone', failed: 'nieudane', refunded: 'zwrócone', cancelled: 'anulowane' };
    main.replaceChildren(head('Zamówienia'), table([
      { label: 'Nr', render: (r) => h('span', { class: 'mono' }, r.public_id) }, { label: 'E-mail', key: 'email' }, { label: 'Status', render: (r) => pill(r.status, S_PL[r.status]) },
      { label: 'Kwota', num: true, render: (r) => zl(r.amount) }, { label: 'Kod', render: (r) => r.discount_code || '—' }, { label: 'NIP', render: (r) => r.nip || '—' },
      { label: 'Operator', key: 'provider' }, { label: 'Złożone', render: (r) => fmtDate(r.created_at) }, { label: 'Opłacone', render: (r) => fmtDate(r.paid_at) },
      ...(can('owner') ? [{ label: '', render: (r) => (r.status === 'paid' ? h('button', { class: 'btn btn--danger', type: 'button', onclick: async () => {
        if (!confirm(`Zwrócić ${zl(r.amount)} za ${r.public_id}?`)) return;
        try { await api('POST', `/api/admin/orders/${encodeURIComponent(r.public_id)}/refund`, {}); go('orders'); } catch (e) { alert(errText(e)); }
      } }, 'Zwrot') : '') }] : []),
    ], d.rows, 'Brak zamówień.'));
  };

  V.codes = async () => {
    const d = await api('GET', '/api/admin/codes');
    const msg = h('p', { class: 'msg', role: 'alert' });
    const code = h('input', { class: 'input', id: 'c-code', maxlength: '24', placeholder: 'np. ZIMA20' });
    const percent = h('input', { class: 'input', id: 'c-pct', type: 'number', min: '1', max: '90', value: '20' });
    const max = h('input', { class: 'input', id: 'c-max', type: 'number', min: '1', placeholder: 'bez limitu' });
    const exp = h('input', { class: 'input', id: 'c-exp', type: 'date' });
    const form = can('editor') ? h('form', { class: 'box', onsubmit: async (e) => {
      e.preventDefault();
      try {
        await api('POST', '/api/admin/codes', { code: code.value.trim(), percent: Number(percent.value), max_uses: max.value ? Number(max.value) : null, expires_at: exp.value ? `${exp.value}T23:59:59+01:00` : null });
        go('codes');
      } catch (err) { msg.textContent = errText(err); msg.className = 'msg is-error'; }
    } }, h('h2', null, 'Nowy kod'), h('div', { class: 'row' },
      h('div', { class: 'field' }, h('label', { for: 'c-code' }, 'Kod'), code), h('div', { class: 'field' }, h('label', { for: 'c-pct' }, 'Rabat %'), percent),
      h('div', { class: 'field' }, h('label', { for: 'c-max' }, 'Limit użyć'), max), h('div', { class: 'field' }, h('label', { for: 'c-exp' }, 'Ważny do'), exp),
      h('button', { class: 'btn btn--primary', type: 'submit' }, 'Dodaj')), msg) : null;
    main.replaceChildren(head('Kody rabatowe'), form || '', h('p'), table([
      { label: 'Kod', render: (r) => h('span', { class: 'mono' }, r.code) }, { label: 'Rabat', num: true, render: (r) => `${r.percent}%` },
      { label: 'Użyte', num: true, render: (r) => `${r.used}${r.max_uses ? ' / ' + r.max_uses : ''}` }, { label: 'Ważny do', render: (r) => fmtDate(r.expires_at) },
      { label: 'Status', render: (r) => pill(r.active ? 'on' : 'off', r.active ? 'aktywny' : 'wyłączony') },
      ...(can('editor') ? [{ label: '', render: (r) => h('button', { class: 'btn btn--secondary', type: 'button', onclick: async () => { await api('PUT', `/api/admin/codes/${r.id}`, { active: !r.active }); go('codes'); } }, r.active ? 'Wyłącz' : 'Włącz') }] : []),
    ], d.rows, 'Brak kodów.'));
  };

  V.posts = async () => {
    const d = await api('GET', '/api/admin/posts');
    const editor = h('div');
    const open = async (id) => {
      const p = id ? await api('GET', `/api/admin/posts/${id}`) : { title: '', slug: '', lang: 'pl', excerpt: '', body_md: '', published: 0 };
      const f = {
        title: h('input', { class: 'input', id: 'p-title', value: p.title, maxlength: '160' }),
        slug: h('input', { class: 'input', id: 'p-slug', value: p.slug, maxlength: '80' }),
        lang: h('select', { class: 'select', id: 'p-lang' }, h('option', { value: 'pl' }, 'PL'), h('option', { value: 'en' }, 'EN')),
        excerpt: h('input', { class: 'input', id: 'p-ex', value: p.excerpt, maxlength: '300' }),
        body: h('textarea', { class: 'textarea', id: 'p-body' }),
        pub: h('input', { type: 'checkbox', id: 'p-pub', checked: !!p.published }),
      };
      f.lang.value = p.lang; f.body.value = p.body_md;
      f.title.addEventListener('input', () => { if (!id) f.slug.value = f.title.value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80); });
      const msg = h('p', { class: 'msg', role: 'alert' });
      const ro = !can('editor');
      Object.values(f).forEach((x) => { if (ro) x.disabled = true; });
      editor.replaceChildren(h('form', { class: 'box', onsubmit: async (e) => {
        e.preventDefault();
        const body = { title: f.title.value, slug: f.slug.value, lang: f.lang.value, excerpt: f.excerpt.value, body_md: f.body.value, published: f.pub.checked };
        try { const r = id ? await api('PUT', `/api/admin/posts/${id}`, body) : await api('POST', '/api/admin/posts', body); msg.textContent = 'Zapisano.'; msg.className = 'msg is-ok'; if (!id) { await V.posts(); } else id = r.id; }
        catch (err) { msg.textContent = errText(err); msg.className = 'msg is-error'; }
      } },
      h('div', { class: 'field' }, h('label', { for: 'p-title' }, 'Tytuł'), f.title),
      h('div', { class: 'row' }, h('div', { class: 'field' }, h('label', { for: 'p-slug' }, 'Adres (slug)'), f.slug), h('div', { class: 'field' }, h('label', { for: 'p-lang' }, 'Język'), f.lang)),
      h('div', { class: 'field' }, h('label', { for: 'p-ex' }, 'Zajawka'), f.excerpt),
      h('div', { class: 'field' }, h('label', { for: 'p-body' }, 'Treść (## nagłówek, - lista, **pogrubienie**, [link](/adres), > cytat)'), f.body),
      h('label', { class: 'check' }, f.pub, 'Opublikowany'), msg,
      ro ? '' : h('div', { class: 'row' }, h('button', { class: 'btn btn--primary', type: 'submit' }, 'Zapisz'),
        id ? h('a', { class: 'btn btn--secondary', href: `/poradnik/${p.slug}`, target: '_blank', rel: 'noopener' }, 'Podgląd') : '',
        id ? h('button', { class: 'btn btn--danger', type: 'button', onclick: async () => { if (confirm('Usunąć wpis?')) { await api('DELETE', `/api/admin/posts/${id}`); V.posts(); } } }, 'Usuń') : '')));
    };
    main.replaceChildren(head('Poradnik', can('editor') ? h('button', { class: 'btn btn--primary', type: 'button', onclick: () => open(null) }, 'Nowy wpis') : null),
      h('div', { class: 'split' }, h('div', { class: 'box list' }, d.rows.length ? d.rows.map((p) => h('button', { type: 'button', onclick: () => open(p.id) }, p.title, h('small', null, `${p.lang.toUpperCase()} · ${p.published ? 'opublikowany' : 'szkic'} · ${fmtDate(p.updated_at)}`))) : h('p', { class: 'empty' }, 'Brak wpisów.')), editor));
    if (d.rows[0]) open(d.rows[0].id);
  };

  V.emails = async () => {
    const d = await api('GET', '/api/admin/emails');
    const KIND = { confirm: 'potwierdzenie', welcome: 'powitanie', drip3: 'dzień 3', drip7: 'dzień 7', order_created: 'zamówienie', order_paid: 'opłacone', order_refunded: 'zwrot' };
    main.replaceChildren(head('E-maile'), h('p', { class: 'muted' }, 'Ostatnie 200 wiadomości w kolejce. Lokalnie treści trafiają do data/outbox.'), table([
      { label: 'Do', key: 'to_addr' }, { label: 'Rodzaj', render: (r) => KIND[r.kind] || r.kind }, { label: 'Temat', key: 'subject' },
      { label: 'Status', render: (r) => (r.cancelled_at ? pill('off', 'anulowany') : r.sent_at ? pill('on', 'wysłany') : r.attempts >= 5 ? pill('failed', 'błąd') : pill('pending', 'w kolejce')) },
      { label: 'Zaplanowany', render: (r) => fmtDate(r.send_after) }, { label: 'Wysłany', render: (r) => fmtDate(r.sent_at) }, { label: 'Błąd', render: (r) => r.last_error || '' },
    ], d.rows, 'Brak wiadomości.'));
  };

  V.health = async () => {
    const d = await api('GET', '/api/admin/health');
    const kpi = (v, l) => h('div', { class: 'kpi' }, h('b', null, v), h('span', null, l));
    main.replaceChildren(head('Zdrowie systemu', h('button', { class: 'btn btn--secondary', type: 'button', onclick: () => go('health') }, 'Odśwież')),
      h('div', { class: 'cards' }, kpi(`${Math.floor(d.uptimeS / 3600)} h ${Math.floor((d.uptimeS % 3600) / 60)} min`, 'czas działania'), kpi(`${d.memoryMb} MB`, 'pamięć'),
        kpi(`${d.dbSizeKb} kB`, 'baza danych'), kpi(d.emails.pending, 'maile w kolejce'), kpi(d.emails.failed, 'maile z błędem'), kpi(d.errors24h, 'błędy (24 h)'),
        kpi(d.lastBackup ? fmtDate(Date.parse(d.lastBackup)) : 'brak', 'ostatnia kopia'), kpi(`${d.mailTransport} / ${d.paymentProvider}`, 'maile / płatności'), kpi(d.node, 'Node.js')),
      h('section', { class: 'box' }, h('h2', null, 'Ostatnie błędy'), table([{ label: 'Kiedy', render: (r) => fmtDate(r.created_at) }, { label: 'Źródło', key: 'source' }, { label: 'Ścieżka', render: (r) => r.path || '—' }, { label: 'Komunikat', key: 'message' }], d.recentErrors, 'Brak błędów.')));
  };

  V.users = async () => {
    const d = await api('GET', '/api/admin/users');
    const msg = h('p', { class: 'msg', role: 'alert' });
    const email = h('input', { class: 'input', id: 'u-email', type: 'email' });
    const name = h('input', { class: 'input', id: 'u-name' });
    const role = h('select', { class: 'select', id: 'u-role' }, h('option', { value: 'viewer' }, 'podgląd'), h('option', { value: 'editor' }, 'edytor'), h('option', { value: 'owner' }, 'właściciel'));
    const ROLE = { viewer: 'podgląd', editor: 'edytor', owner: 'właściciel' };
    const upd = async (u, body) => { try { await api('PUT', `/api/admin/users/${u.id}`, body); go('users'); } catch (e) { alert(errText(e)); } };
    main.replaceChildren(head('Użytkownicy'),
      h('form', { class: 'box', onsubmit: async (e) => {
        e.preventDefault();
        try {
          const r = await api('POST', '/api/admin/users', { email: email.value.trim(), name: name.value.trim(), role: role.value });
          msg.className = 'msg is-ok';
          msg.replaceChildren('Konto utworzone. Tymczasowe hasło (pokazujemy je tylko raz — przekaż bezpiecznie): ', h('span', { class: 'secret' }, r.tempPassword));
          email.value = ''; name.value = '';
          setTimeout(() => V.users().then(() => main.querySelector('.msg')?.replaceWith(msg)), 0);
        } catch (err) { msg.textContent = errText(err); msg.className = 'msg is-error'; }
      } }, h('h2', null, 'Dodaj osobę'), h('div', { class: 'row' }, h('div', { class: 'field' }, h('label', { for: 'u-email' }, 'E-mail'), email), h('div', { class: 'field' }, h('label', { for: 'u-name' }, 'Imię'), name), h('div', { class: 'field' }, h('label', { for: 'u-role' }, 'Rola'), role), h('button', { class: 'btn btn--primary', type: 'submit' }, 'Utwórz')), msg),
      h('p'), table([
        { label: 'E-mail', key: 'email' }, { label: 'Imię', key: 'name' }, { label: 'Rola', render: (u) => ROLE[u.role] }, { label: '2FA', render: (u) => (u.totpEnabled ? pill('on', 'tak') : pill('off', 'nie')) },
        { label: 'Status', render: (u) => (u.active ? pill('on', 'aktywny') : pill('off', 'wyłączony')) }, { label: 'Ostatnie logowanie', render: (u) => fmtDate(u.lastLoginAt) },
        { label: '', render: (u) => (u.id === S.user.id ? h('span', { class: 'muted' }, 'to Ty') : h('div', { class: 'row' },
          h('select', { class: 'select', 'aria-label': `Rola: ${u.email}`, onchange: (e) => upd(u, { role: e.target.value }) }, Object.entries(ROLE).map(([v, l]) => { const o = h('option', { value: v }, l); o.selected = v === u.role; return o; })),
          h('button', { class: 'btn btn--secondary', type: 'button', onclick: () => upd(u, { active: !u.active }) }, u.active ? 'Wyłącz' : 'Włącz'),
          u.totpEnabled ? h('button', { class: 'btn btn--secondary', type: 'button', onclick: () => confirm('Zresetować 2FA tej osoby?') && upd(u, { reset2fa: true }) }, 'Reset 2FA') : '')) },
      ], d.rows));
  };

  V.audit = async () => {
    const d = await api('GET', '/api/admin/audit');
    main.replaceChildren(head('Dziennik działań'), table([{ label: 'Kiedy', render: (r) => fmtDate(r.created_at) }, { label: 'Kto', render: (r) => r.user_email || '—' }, { label: 'Akcja', render: (r) => h('span', { class: 'mono' }, r.action) }, { label: 'Cel', render: (r) => r.target || '' }, { label: 'Szczegóły', render: (r) => r.details || '' }, { label: 'IP', render: (r) => h('span', { class: 'mono' }, r.ip || '') }], d.rows));
  };

  V.account = async () => {
    const me = (await api('GET', '/api/admin/me')).user;
    const pm = h('p', { class: 'msg', role: 'alert' });
    const cur = h('input', { class: 'input', id: 'a-cur', type: 'password', autocomplete: 'current-password' });
    const nxt = h('input', { class: 'input', id: 'a-new', type: 'password', autocomplete: 'new-password', minlength: '12' });
    const tm = h('p', { class: 'msg', role: 'alert' });
    const tfa = h('div');
    const renderTfa = () => {
      if (me.totpEnabled) {
        const pw = h('input', { class: 'input', id: 't-pw', type: 'password', autocomplete: 'current-password' });
        tfa.replaceChildren(h('p', null, pill('on', 'włączone'), ' Logowanie wymaga kodu z aplikacji.'), h('form', { class: 'row', onsubmit: async (e) => {
          e.preventDefault();
          try { await api('POST', '/api/admin/2fa/disable', { password: pw.value }); me.totpEnabled = false; renderTfa(); } catch (err) { tm.textContent = errText(err); tm.className = 'msg is-error'; }
        } }, h('div', { class: 'field' }, h('label', { for: 't-pw' }, 'Hasło, aby wyłączyć'), pw), h('button', { class: 'btn btn--danger', type: 'submit' }, 'Wyłącz 2FA')), tm);
      } else {
        tfa.replaceChildren(h('p', { class: 'muted' }, 'Zalecane dla właściciela. Potrzebujesz aplikacji typu Google Authenticator, Aegis lub 1Password.'),
          h('button', { class: 'btn btn--primary', type: 'button', onclick: async () => {
            try {
              const s = await api('POST', '/api/admin/2fa/setup', {});
              const code = h('input', { class: 'input', id: 't-code', inputmode: 'numeric', maxlength: '6' });
              tfa.replaceChildren(h('p', null, 'Dodaj konto w aplikacji, wpisując ten klucz ręcznie (lub otwórz link na telefonie):'), h('p', { class: 'secret' }, s.secret), h('p', null, h('a', { href: s.uri }, 'otpauth://…')),
                h('form', { class: 'row', onsubmit: async (e) => {
                  e.preventDefault();
                  try { await api('POST', '/api/admin/2fa/enable', { code: code.value.trim() }); me.totpEnabled = true; renderTfa(); } catch (err) { tm.textContent = errText(err); tm.className = 'msg is-error'; }
                } }, h('div', { class: 'field' }, h('label', { for: 't-code' }, 'Kod z aplikacji'), code), h('button', { class: 'btn btn--primary', type: 'submit' }, 'Włącz 2FA')), tm);
            } catch (err) { tm.textContent = errText(err); tm.className = 'msg is-error'; }
          } }, 'Skonfiguruj 2FA'), tm);
      }
    };
    renderTfa();
    main.replaceChildren(head('Moje konto'), h('div', { class: 'grid2' },
      h('form', { class: 'box', onsubmit: async (e) => {
        e.preventDefault();
        try { await api('POST', '/api/admin/password', { current: cur.value, next: nxt.value }); pm.textContent = 'Hasło zmienione. Inne sesje zostały wylogowane.'; pm.className = 'msg is-ok'; cur.value = nxt.value = ''; }
        catch (err) { pm.textContent = errText(err); pm.className = 'msg is-error'; }
      } }, h('h2', null, 'Zmiana hasła'), h('div', { class: 'field' }, h('label', { for: 'a-cur' }, 'Obecne hasło'), cur), h('div', { class: 'field' }, h('label', { for: 'a-new' }, 'Nowe hasło (min. 12 znaków)'), nxt), pm, h('button', { class: 'btn btn--primary', type: 'submit' }, 'Zmień hasło')),
      h('section', { class: 'box' }, h('h2', null, 'Logowanie dwuetapowe (2FA)'), tfa)));
  };

  // ---------- boot ----------
  const start = location.hash.slice(1);
  if (VIEWS.some(([id]) => id === start)) S.view = start;
  fetch('/api/admin/me').then((r) => (r.ok ? r.json() : null)).then((d) => {
    if (d?.user) { S.user = d.user; S.csrf = d.csrf; if (!can(VIEWS.find(([id]) => id === S.view)[2])) S.view = 'dashboard'; renderShell(); } else renderLogin();
  }).catch(() => renderLogin());
})();
