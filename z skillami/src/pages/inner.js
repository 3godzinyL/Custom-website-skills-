import { layout, icon, e } from './layout.js';

const t = (lang, pl, en) => (lang === 'en' ? en : pl);
const pre = (lang) => (lang === 'en' ? '/en' : '');

export function thanks({ lang, baseUrl }) {
  return layout({ lang, baseUrl, page: 'thanks', noindex: true, title: t(lang, 'Sprawdź skrzynkę', 'Check your inbox'), path: `${pre(lang)}/dziekujemy`,
    langHref: lang === 'en' ? '/dziekujemy' : '/en/dziekujemy',
    body: `<section class="page"><div class="wrap-narrow">
  <p class="eyebrow">${t(lang, 'Krok 1 z 2 gotowy', 'Step 1 of 2 done')}</p>
  <h1>${t(lang, 'Sprawdź skrzynkę.', 'Check your inbox.')}</h1>
  <p class="lead">${t(lang, 'Wysłaliśmy link potwierdzający. Kliknij go, żeby dostać miejsce w kolejce i własny link dla znajomych.', 'We sent a confirmation link. Click it to get your place in the queue and your own link for friends.')}</p>
  <ol class="steps-next">
    <li>${t(lang, 'Otwórz e-mail od Ogarnij (tytuł: „Potwierdź zapis na betę Ogarnij”).', 'Open the e-mail from Ogarnij (“Confirm your spot on the Ogarnij beta”).')}</li>
    <li>${t(lang, 'Nie ma go po 5 minutach? Zajrzyj do Spamu albo Ofert.', 'Not there after 5 minutes? Check Spam or Promotions.')}</li>
    <li>${t(lang, 'Link działa 72 godziny. Jeśli wygaśnie — zapisz się ponownie tym samym adresem.', 'The link works for 72 hours. If it expires, sign up again with the same address.')}</li>
  </ol>
  <p class="hint">${t(lang, 'Wersja lokalna: e-maile trafiają do folderu data/outbox.', 'Local version: e-mails go to the data/outbox folder.')}</p>
</div></section>` });
}

export function confirm({ lang, baseUrl, token, failed }) {
  const msg = failed === 'expired'
    ? t(lang, 'Link wygasł. Zapisz się ponownie tym samym adresem — wyślemy nowy.', 'This link has expired. Sign up again with the same address and we’ll send a new one.')
    : t(lang, 'Ten link jest nieprawidłowy albo został już użyty. Jeśli to Ty — sprawdź najnowszy e-mail od nas.', 'This link is invalid or already used. If it’s you, check our most recent e-mail.');
  return layout({ lang, baseUrl, page: 'confirm', noindex: true, title: t(lang, 'Potwierdzenie zapisu', 'Confirm signup'), path: `${pre(lang)}/potwierdz`, langHref: null,
    body: `<section class="page"><div class="wrap-narrow">
  <div class="js-confirm" data-token="${e(token)}" data-fail-invalid="${e(t(lang, 'Ten link jest nieprawidłowy albo został już użyty.', 'This link is invalid or already used.'))}" data-fail-expired="${e(t(lang, 'Link wygasł. Zapisz się ponownie tym samym adresem — wyślemy nowy.', 'This link has expired. Sign up again and we’ll send a new one.'))}">
    ${failed ? `<h1>${t(lang, 'Nie udało się potwierdzić', 'Couldn’t confirm')}</h1><p class="lead">${e(msg)}</p><a class="btn btn--primary" href="${pre(lang) || '/'}#${lang === 'en' ? 'join' : 'zapisz'}">${t(lang, 'Zapisz się ponownie', 'Sign up again')}</a>`
    : `<h1 class="js-confirm-title">${t(lang, 'Potwierdzamy zapis…', 'Confirming…')}</h1>
    <p class="lead js-confirm-msg">${t(lang, 'To potrwa sekundę.', 'This takes a second.')}</p>
    <noscript><form method="post" action="/potwierdz"><input type="hidden" name="token" value="${e(token)}"><input type="hidden" name="lang" value="${lang}"><button class="btn btn--primary">${t(lang, 'Potwierdzam zapis', 'Confirm my signup')}</button></form></noscript>`}
  </div>
</div></section>` });
}

export function queue({ lang, baseUrl, me, key }) {
  if (!me) return notFound({ lang, baseUrl, title: t(lang, 'Nie znaleziono miejsca w kolejce', 'Queue spot not found'), text: t(lang, 'Link jest nieprawidłowy albo adres został wypisany. Najnowszy link znajdziesz w ostatnim e-mailu od nas.', 'The link is invalid or the address was unsubscribed. Your latest link is in our most recent e-mail.') });
  const opts = lang === 'en'
    ? [['kartki', 'Paper notes'], ['aplikacja', 'A to-do app'], ['kalendarz', 'Calendar only'], ['glowa', 'In my head'], ['nic', 'I don’t plan']]
    : [['kartki', 'Kartki i notatki'], ['aplikacja', 'Aplikacja z listą zadań'], ['kalendarz', 'Tylko kalendarz'], ['glowa', 'W głowie'], ['nic', 'Nie planuję']];
  const shareText = t(lang, 'Zapisuję się na betę Ogarnij — planera dnia, któremu mówisz, co masz na głowie. Dołącz z mojego linku:', 'I’m on the Ogarnij beta list — a daily planner you just talk to. Join with my link:');
  return layout({ lang, baseUrl, page: 'queue', noindex: true, title: t(lang, 'Twoje miejsce w kolejce', 'Your place in the queue'), path: `${pre(lang)}/kolejka`, langHref: null,
    body: `<section class="page"><div class="wrap-narrow">
  <p class="eyebrow">${t(lang, 'Jesteś na liście', 'You’re on the list')}</p>
  <div class="status-card">
    <p class="big-num-label">${t(lang, 'Twoje miejsce w kolejce', 'Your place in the queue')}</p>
    <p class="big-num">${e(me.position)}</p>
    <div class="stats-row">
      <div><b>${e(me.referrals)}</b><span>${t(lang, 'potwierdzone polecenia', 'confirmed referrals')}</span></div>
      <div><b>${e(me.total)}</b><span>${t(lang, 'osób na liście', 'people on the list')}</span></div>
    </div>
    <p>${t(lang, `Każda osoba, która potwierdzi zapis z Twojego linku, przesuwa Cię o ${me.boost} miejsc w górę.`, `Everyone who confirms from your link moves you up ${me.boost} spots.`)}</p>
    <label class="label sr-only" for="ref-link">${t(lang, 'Twój link polecający', 'Your referral link')}</label>
    <div class="copy-row">
      <input class="input" id="ref-link" readonly value="${e(me.refUrl)}">
      <button class="btn btn--primary js-copy" type="button" data-target="ref-link" data-done="${t(lang, 'Skopiowano', 'Copied')}">${icon('copy')}${t(lang, 'Kopiuj', 'Copy')}</button>
      <button class="btn btn--secondary js-share" type="button" hidden data-text="${e(shareText)}" data-url="${e(me.refUrl)}">${icon('share')}${t(lang, 'Udostępnij', 'Share')}</button>
    </div>
  </div>
  ${me.surveyAnswered ? '' : `<form class="survey js-survey" data-key="${e(key)}" data-thanks="${e(t(lang, 'Dzięki! To nam bardzo pomaga.', 'Thanks! That really helps.'))}">
    <fieldset><legend>${t(lang, 'Jedno pytanie: jak dziś planujesz dzień?', 'One question: how do you plan your day today?')}</legend>
      <div class="chips">${opts.map(([v, l]) => `<button type="button" value="${v}" aria-pressed="false">${e(l)}</button>`).join('')}</div>
    </fieldset><p class="form-msg" role="status"></p>
  </form>`}
  <p class="hint">${t(lang, 'Zachowaj tę stronę — link do niej masz też w e-mailu powitalnym. Nie udostępniaj jej adresu (zawiera prywatny klucz); udostępniaj tylko link polecający.', 'Keep this page — the link is also in your welcome e-mail. Don’t share its address (it contains a private key); share only your referral link.')}</p>
</div></section>` });
}

export function presale({ lang, baseUrl, quote, provider, enabled = true }) {
  const m = (v) => (lang === 'en' ? `PLN ${(v / 100).toFixed(2)}` : `${(v / 100).toFixed(2).replace('.', ',')} zł`);
  if (!enabled) {
    return layout({ lang, baseUrl, page: 'presale', noindex: true, title: t(lang, 'Pakiet założycielski', 'Founder pack'), path: `${pre(lang)}/zamow`, langHref: null,
      body: `<section class="page"><div class="wrap-narrow"><p class="eyebrow">${t(lang, 'Przedsprzedaż', 'Pre-sale')}</p><h1>${t(lang, 'Przedsprzedaż jest chwilowo wstrzymana.', 'The pre-sale is paused for now.')}</h1><p class="lead">${t(lang, 'Zapisz się na listę — napiszemy, gdy pakiet będzie znów dostępny.', 'Join the list and we’ll tell you when the pack is back.')}</p><a class="btn btn--primary" href="${pre(lang) || '/'}#${lang === 'en' ? 'join' : 'zapisz'}">${t(lang, 'Zapisz się', 'Join the list')}</a></div></section>` });
  }
  return layout({ lang, baseUrl, page: 'presale', title: t(lang, 'Pakiet założycielski', 'Founder pack'), path: `${pre(lang)}/zamow`,
    description: t(lang, 'Ogarnij Plus na 12 miesięcy za 99 zł — przedsprzedaż przed startem bety.', '12 months of Ogarnij Plus for PLN 99 — pre-sale before the beta.'),
    alt: { pl: '/zamow', en: '/en/zamow' }, langHref: lang === 'en' ? '/zamow' : '/en/zamow',
    body: `<section class="page"><div class="wrap">
  <p class="eyebrow">${t(lang, 'Przedsprzedaż', 'Pre-sale')}</p>
  <h1>${t(lang, 'Pakiet założycielski', 'Founder pack')}</h1>
  <p class="lead">${t(lang, '12 miesięcy Ogarnij Plus, aktywowane w dniu startu bety. Wspierasz start, a my dotrzymujemy słowa: 14 dni na zwrot bez podawania przyczyny.', '12 months of Ogarnij Plus, activated when the beta starts. You back the launch; we keep our word: 14 days for a refund, no questions asked.')}</p>
  ${provider === 'sandbox' ? `<p class="notice">${t(lang, 'Tryb testowy: płatność jest symulowana, żadne pieniądze nie są pobierane.', 'Test mode: payment is simulated, no money is charged.')}</p>` : ''}
  <div class="order-grid">
    <form class="form-grid js-order" novalidate data-lang="${lang}">
      <div class="field"><label for="o-email">E-mail *</label><input class="input" id="o-email" name="email" type="email" autocomplete="email" required maxlength="254"><p class="hint">${t(lang, 'Na ten adres wyślemy potwierdzenie i aktywujemy pakiet.', 'We’ll send the confirmation and activate the pack for this address.')}</p></div>
      <div class="two">
        <div class="field"><label for="o-name">${t(lang, 'Imię i nazwisko lub firma', 'Name or company')}</label><input class="input" id="o-name" name="name" autocomplete="name" maxlength="120"></div>
        <div class="field"><label for="o-nip">${t(lang, 'NIP (opcjonalnie, do faktury)', 'Polish VAT ID (optional)')}</label><input class="input" id="o-nip" name="nip" inputmode="numeric" maxlength="13"></div>
      </div>
      <div class="field"><label for="o-code">${t(lang, 'Kod rabatowy', 'Discount code')}</label><div class="code-row"><input class="input" id="o-code" name="code" maxlength="24" autocomplete="off"><button class="btn btn--secondary js-apply-code" type="button">${t(lang, 'Zastosuj', 'Apply')}</button></div><p class="form-msg js-code-msg" role="status"></p></div>
      <label class="check"><input type="checkbox" name="acceptTerms" required><span>${t(lang, 'Akceptuję <a href="/regulamin-przedsprzedazy">regulamin przedsprzedaży</a> i <a href="/prywatnosc">politykę prywatności</a>. Wiem, że mam 14 dni na odstąpienie od umowy. *', 'I accept the <a href="/en/presale-terms">pre-sale terms</a> and <a href="/en/privacy">privacy policy</a>. I know I have 14 days to withdraw. *')}</span></label>
      <p class="form-msg js-order-msg" role="alert" data-err-email="${e(t(lang, 'Wpisz poprawny e-mail.', 'Enter a valid e-mail.'))}" data-err-terms="${e(t(lang, 'Zaznacz akceptację regulaminu.', 'Please accept the terms.'))}" data-err-nip="${e(t(lang, 'NIP jest nieprawidłowy.', 'Invalid VAT ID.'))}" data-err-code="${e(t(lang, 'Kod jest nieprawidłowy lub wygasł.', 'Code is invalid or expired.'))}" data-err-server="${e(t(lang, 'Nie udało się utworzyć zamówienia. Spróbuj ponownie.', 'Couldn’t create the order. Try again.'))}"></p>
      <div><button class="btn btn--primary" type="submit">${t(lang, 'Zamawiam i płacę', 'Order and pay')}</button></div>
    </form>
    <aside class="summary" aria-label="${t(lang, 'Podsumowanie', 'Summary')}">
      <h2 class="h3">${t(lang, 'Podsumowanie', 'Summary')}</h2>
      <dl>
        <div><dt>${t(lang, 'Ogarnij Plus, 12 miesięcy', 'Ogarnij Plus, 12 months')}</dt><dd class="js-base">${m(quote.base)}</dd></div>
        <div class="js-disc-row" hidden><dt>${t(lang, 'Rabat', 'Discount')} <span class="js-disc-code"></span></dt><dd class="js-disc">−0</dd></div>
        <div class="total"><dt>${t(lang, 'Razem (z VAT)', 'Total (incl. VAT)')}</dt><dd class="js-total" data-lang="${lang}">${m(quote.amount)}</dd></div>
      </dl>
      <p class="hint">${t(lang, 'Cena po becie: 149 zł / rok. Płacisz raz, bez automatycznego odnowienia.', 'Price after the beta: PLN 149 / year. One-time payment, no auto-renewal.')}</p>
    </aside>
  </div>
</div></section>` });
}

const STATUS = {
  pl: { pending: 'czeka na płatność', paid: 'opłacone', failed: 'płatność nieudana', refunded: 'zwrócone', cancelled: 'anulowane' },
  en: { pending: 'awaiting payment', paid: 'paid', failed: 'payment failed', refunded: 'refunded', cancelled: 'cancelled' },
};

export function order({ lang, baseUrl, order: o, key, money }) {
  const date = (ts) => (ts ? new Date(ts).toLocaleString(lang === 'en' ? 'en-GB' : 'pl-PL', { timeZone: 'Europe/Warsaw' }) : '—');
  return layout({ lang, baseUrl, page: 'order', noindex: true, title: `${t(lang, 'Zamówienie', 'Order')} ${o.public_id}`, path: `${pre(lang)}/zamowienie/${o.public_id}`, langHref: null,
    body: `<section class="page"><div class="wrap-narrow">
  <p class="eyebrow">${t(lang, 'Potwierdzenie zamówienia', 'Order confirmation')}</p>
  <h1>${e(o.public_id)}</h1>
  <p><span class="badge badge--${e(o.status)}">${e(STATUS[lang][o.status] || o.status)}</span></p>
  <div class="status-card summary">
    <dl>
      <div><dt>${t(lang, 'Produkt', 'Product')}</dt><dd>${t(lang, 'Pakiet założycielski: Ogarnij Plus, 12 mies.', 'Founder pack: Ogarnij Plus, 12 months')}</dd></div>
      <div><dt>E-mail</dt><dd>${e(o.email)}</dd></div>
      ${o.name ? `<div><dt>${t(lang, 'Nabywca', 'Buyer')}</dt><dd>${e(o.name)}</dd></div>` : ''}
      ${o.nip ? `<div><dt>NIP</dt><dd>${e(o.nip)}</dd></div>` : ''}
      <div><dt>${t(lang, 'Cena', 'Price')}</dt><dd>${e(money(o.base_amount))}</dd></div>
      ${o.discount_amount ? `<div><dt>${t(lang, 'Rabat', 'Discount')} ${e(o.discount_code)}</dt><dd>−${e(money(o.discount_amount))}</dd></div>` : ''}
      <div class="total"><dt>${t(lang, 'Razem', 'Total')}</dt><dd>${e(money(o.amount))}</dd></div>
      <div><dt>${t(lang, 'Złożone', 'Placed')}</dt><dd>${e(date(o.created_at))}</dd></div>
      ${o.paid_at ? `<div><dt>${t(lang, 'Opłacone', 'Paid')}</dt><dd>${e(date(o.paid_at))}</dd></div>` : ''}
      ${o.refunded_at ? `<div><dt>${t(lang, 'Zwrot', 'Refunded')}</dt><dd>${e(date(o.refunded_at))}</dd></div>` : ''}
    </dl>
  </div>
  <p class="lead">${o.status === 'paid' ? t(lang, 'Dziękujemy! Pakiet aktywujemy na tym adresie w dniu startu bety. Masz 14 dni na odstąpienie — odpisz na e-mail z potwierdzeniem.', 'Thank you! We’ll activate the pack for this address when the beta starts. You have 14 days to withdraw — reply to the confirmation e-mail.')
      : o.status === 'pending' || o.status === 'failed' ? t(lang, 'Płatność nie została jeszcze potwierdzona. Jeśli właśnie zapłacono, odśwież stronę za chwilę.', 'Payment hasn’t been confirmed yet. If you just paid, refresh in a moment.') : ''}</p>
  <p class="no-print"><button class="btn btn--secondary js-print" type="button">${icon('print')}${t(lang, 'Drukuj potwierdzenie', 'Print confirmation')}</button>
  ${(o.status === 'pending' || o.status === 'failed') && o.provider === 'sandbox' ? ` <a class="btn btn--primary" href="/platnosc-testowa/${e(o.public_id)}?key=${encodeURIComponent(key)}">${t(lang, 'Dokończ płatność', 'Finish payment')}</a>` : ''}</p>
  <p class="hint">${t(lang, 'To potwierdzenie zamówienia, nie faktura VAT (projekt fikcyjny).', 'This is an order confirmation, not a VAT invoice (fictional project).')}</p>
</div></section>` });
}

export function sandboxPay({ baseUrl, order: o, key, money }) {
  return layout({ lang: 'pl', baseUrl, page: 'sandbox', noindex: true, title: 'Płatność testowa', path: `/platnosc-testowa/${o.public_id}`, langHref: null,
    body: `<section class="page"><div class="wrap-narrow">
  <p class="eyebrow">Symulator operatora płatności</p>
  <h1>Płatność testowa</h1>
  <p class="notice">To nie jest prawdziwa bramka. Ta strona udaje operatora płatności: wysyła do sklepu podpisane powiadomienie (webhook), dokładnie tak jak zrobiłby to Stripe. Żadne pieniądze nie są pobierane.</p>
  <div class="status-card sandbox">
    <p class="big-num-label">${e(o.public_id)} · ${e(o.email)}</p>
    <p class="plan__price">${e(money(o.amount))}</p>
    <div class="demo__actions js-sandbox" data-order="${e(o.public_id)}" data-key="${e(key)}">
      <button class="btn btn--primary" type="button" value="success">Zapłać (test)</button>
      <button class="btn btn--secondary" type="button" value="failure">Odrzuć płatność</button>
    </div>
    <p class="form-msg" role="alert"></p>
  </div>
</div></section>` });
}

export function unsubscribe({ baseUrl, key, done, failed }) {
  const body = done
    ? '<h1>Wypisano.</h1><p class="lead">Nie wyślemy już żadnych wiadomości na ten adres. Jeśli to pomyłka — zapisz się ponownie na stronie głównej.</p><a class="btn btn--secondary" href="/">Strona główna</a>'
    : failed
      ? '<h1>Nie znaleziono adresu.</h1><p class="lead">Link jest nieprawidłowy albo adres został już usunięty z listy.</p>'
      : `<h1>Wypisać Cię z listy?</h1><p class="lead">Stracisz miejsce w kolejce i nie dostaniesz zaproszenia do bety.</p>
  <form method="post" action="/wypisz"><input type="hidden" name="key" value="${e(key)}"><button class="btn btn--primary" type="submit">Tak, wypisz mnie</button> <a class="btn btn--ghost" href="/">Zostaję na liście</a></form>`;
  return layout({ lang: 'pl', baseUrl, page: 'unsub', noindex: true, title: 'Wypis z listy', path: '/wypisz', langHref: null, body: `<section class="page"><div class="wrap-narrow">${body}</div></section>` });
}

export function blogIndex({ baseUrl, posts }) {
  const d = (ts) => new Date(ts).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
  return layout({ lang: 'pl', baseUrl, page: 'blog', title: 'Poradnik planowania dnia', description: 'Krótkie, praktyczne poradniki: jak ratować plan, który się sypie, jak ruszyć z odkładanym zadaniem i kiedy robić trudne rzeczy.', path: '/poradnik', langHref: null,
    body: `<section class="page"><div class="wrap-narrow">
  <p class="eyebrow">Poradnik</p><h1>Planowanie dnia bez spiny</h1>
  <p class="lead">Krótkie teksty o tym, co działa, kiedy dzień nie idzie zgodnie z planem.</p>
  <div class="posts">${posts.map((p) => `<a class="post-item" href="/poradnik/${e(p.slug)}"><time datetime="${new Date(p.published_at).toISOString()}">${e(d(p.published_at))}</time><div><h2>${e(p.title)}</h2><p>${e(p.excerpt)}</p></div></a>`).join('') || '<p class="muted">Wkrótce pierwsze teksty.</p>'}</div>
</div></section>` });
}

export function blogPost({ baseUrl, post, body, more }) {
  const d = (ts) => new Date(ts).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
  const jsonLd = { '@context': 'https://schema.org', '@type': 'Article', headline: post.title, description: post.excerpt, datePublished: new Date(post.published_at).toISOString(), dateModified: new Date(post.updated_at).toISOString(), author: { '@type': 'Organization', name: post.author }, inLanguage: 'pl' };
  return layout({ lang: 'pl', baseUrl, page: 'blog', title: post.title, description: post.excerpt, path: `/poradnik/${post.slug}`, langHref: null, jsonLd,
    body: `<article class="page"><div class="wrap-narrow">
  <p class="eyebrow"><a href="/poradnik">Poradnik</a></p>
  <h1>${e(post.title)}</h1>
  <p class="meta">${e(post.author)} · <time datetime="${new Date(post.published_at).toISOString()}">${e(d(post.published_at))}</time>${post.updated_at > post.published_at + 86_400_000 ? ` · aktualizacja ${e(d(post.updated_at))}` : ''}</p>
  <div class="prose">${body}</div>
  <div class="presale-band"><div><h3>Ogarnij robi to za Ciebie</h3><p>Powiedz, co masz na głowie — dostaniesz plan dnia z pierwszymi krokami.</p></div><a class="btn btn--primary" href="/#zapisz">Zapisz się na betę</a></div>
  ${more.length ? `<h2 class="h3 section">Przeczytaj też</h2><div class="posts">${more.map((p) => `<a class="post-item" href="/poradnik/${e(p.slug)}"><time>${e(d(p.published_at))}</time><div><h2>${e(p.title)}</h2><p>${e(p.excerpt)}</p></div></a>`).join('')}</div>` : ''}
</div></article>` });
}

export function offline({ baseUrl }) {
  return layout({ lang: 'pl', baseUrl, page: 'offline', noindex: true, title: 'Brak połączenia', path: '/offline', langHref: null,
    body: '<section class="page"><div class="wrap-narrow"><h1>Brak połączenia.</h1><p class="lead">Ta strona nie jest zapisana na urządzeniu. Sprawdź internet i spróbuj ponownie.</p><a class="btn btn--primary" href="/">Spróbuj ponownie</a></div></section>' });
}

export function notFound({ lang = 'pl', baseUrl, title, text }) {
  return layout({ lang, baseUrl, page: '404', noindex: true, title: title || t(lang, 'Nie znaleziono strony', 'Page not found'), path: '/404', langHref: null,
    body: `<section class="page"><div class="wrap-narrow"><p class="eyebrow">404</p><h1>${e(title || t(lang, 'Tej strony tu nie ma.', 'This page isn’t here.'))}</h1><p class="lead">${e(text || t(lang, 'Może link jest stary albo ma literówkę.', 'The link may be old or mistyped.'))}</p><a class="btn btn--primary" href="${lang === 'en' ? '/en/' : '/'}">${t(lang, 'Strona główna', 'Home')}</a></div></section>` });
}

export function error({ lang = 'pl', baseUrl, status, code }) {
  const msg = status === 429 ? t(lang, 'Za dużo prób w krótkim czasie. Odczekaj kilka minut.', 'Too many attempts. Wait a few minutes.')
    : status >= 500 ? t(lang, 'Coś poszło nie tak po naszej stronie. Zapisaliśmy błąd i sprawdzimy go.', 'Something went wrong on our side. We logged it.')
      : t(lang, 'Nie udało się wykonać tej akcji.', 'This action couldn’t be completed.');
  return layout({ lang, baseUrl, page: 'error', noindex: true, title: t(lang, 'Błąd', 'Error'), path: '/', langHref: null,
    body: `<section class="page"><div class="wrap-narrow"><p class="eyebrow">${e(status)} · ${e(code)}</p><h1>${e(msg)}</h1><a class="btn btn--primary" href="${lang === 'en' ? '/en/' : '/'}">${t(lang, 'Strona główna', 'Home')}</a></div></section>` });
}
