import { escapeHtml as e } from '../security.js';

export { e };

// One icon set (Lucide-style strokes), inline so CSP needs no extra sources.
const P = {
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  down: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
  right: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>',
  print: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
};
export const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name]}</svg>`;

export const NAV = {
  pl: { how: 'Jak działa', demo: 'Demo', planb: 'Plan B', privacy: 'Prywatność', pricing: 'Cennik', faq: 'FAQ', guide: 'Poradnik', cta: 'Zapisz się', menu: 'Menu', skip: 'Przejdź do treści', lang: 'EN', langHref: '/en/', langLabel: 'English version' },
  en: { how: 'How it works', demo: 'Demo', planb: 'Plan B', privacy: 'Privacy', pricing: 'Pricing', faq: 'FAQ', guide: null, cta: 'Join the list', menu: 'Menu', skip: 'Skip to content', lang: 'PL', langHref: '/', langLabel: 'Wersja polska' },
};

const FOOT = {
  pl: {
    about: 'Planer dnia, który rozumie polski głos. Zamknięta beta wiosną 2027.',
    product: 'Produkt', company: 'Informacje', legal: 'Zasady',
    links: [['/#jak', 'Jak działa'], ['/#demo', 'Wypróbuj demo'], ['/#cennik', 'Cennik'], ['/zamow', 'Pakiet założycielski']],
    info: [['/poradnik', 'Poradnik'], ['/#faq', 'FAQ'], ['mailto:kontakt@ogarnij.example', 'kontakt@ogarnij.example']],
    rules: [['/prywatnosc', 'Polityka prywatności'], ['/zasady-listy', 'Zasady listy i poleceń'], ['/regulamin-przedsprzedazy', 'Regulamin przedsprzedaży']],
    bottom: '© 2026 Ogarnij · projekt fikcyjny — strona demonstracyjna',
    company2: 'Dane firmy: [DO UZUPEŁNIENIA: nazwa, NIP, adres]',
  },
  en: {
    about: 'A daily planner that understands your voice. Closed beta in spring 2027.',
    product: 'Product', company: 'Info', legal: 'Legal',
    links: [['/en/#how', 'How it works'], ['/en/#demo', 'Try the demo'], ['/en/#pricing', 'Pricing'], ['/en/zamow', 'Founder pack']],
    info: [['/en/#faq', 'FAQ'], ['mailto:kontakt@ogarnij.example', 'kontakt@ogarnij.example']],
    rules: [['/en/privacy', 'Privacy policy'], ['/en/waitlist-rules', 'Waitlist rules'], ['/en/presale-terms', 'Pre-sale terms']],
    bottom: '© 2026 Ogarnij · fictional project — demo website',
    company2: 'Company details: [TO BE COMPLETED]',
  },
};

export function layout(o) {
  const lang = o.lang === 'en' ? 'en' : 'pl';
  const n = NAV[lang];
  const base = o.baseUrl;
  const anchors = o.home ? '' : (lang === 'en' ? '/en/' : '/');
  const ids = lang === 'en' ? { how: 'how', planb: 'plan-b', privacy: 'privacy', pricing: 'pricing' } : { how: 'jak', planb: 'planb', privacy: 'prywatnosc', pricing: 'cennik' };
  const title = o.title.includes('Ogarnij') ? o.title : `${o.title} · Ogarnij`;
  const canonical = `${base}${o.path || '/'}`;
  const alt = o.alt ? `<link rel="alternate" hreflang="pl" href="${base}${o.alt.pl}"><link rel="alternate" hreflang="en" href="${base}${o.alt.en}"><link rel="alternate" hreflang="x-default" href="${base}${o.alt.pl}">` : '';
  const f = FOOT[lang];
  const list = (arr) => `<ul>${arr.map(([h, t]) => `<li><a href="${e(h)}">${e(t)}</a></li>`).join('')}</ul>`;
  const langSwitch = o.langHref === null ? '' : `<a class="nav__lang" href="${e(o.langHref || n.langHref)}" hreflang="${lang === 'en' ? 'pl' : 'en'}" aria-label="${e(n.langLabel)}">${n.lang}</a>`;
  return `<!doctype html>
<html lang="${lang}" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(title)}</title>
<meta name="description" content="${e(o.description || '')}">
${o.noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${e(canonical)}">`}
${alt}
<meta name="theme-color" content="#0f0e17">
<meta property="og:type" content="website">
<meta property="og:title" content="${e(title)}">
<meta property="og:description" content="${e(o.description || '')}">
<meta property="og:url" content="${e(canonical)}">
<meta property="og:image" content="${base}/og.png">
<meta property="og:locale" content="${lang === 'en' ? 'en_GB' : 'pl_PL'}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/icons/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/icons/icon-192.png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Manrope:wght@400..700&family=JetBrains+Mono:wght@500&display=swap">
<link rel="stylesheet" href="/css/tokens.css">
<link rel="stylesheet" href="/css/site.css">
${o.jsonLd ? `<script type="application/ld+json">${JSON.stringify(o.jsonLd).replace(/</g, '\\u003c')}</script>` : ''}
<script src="/js/site.js" defer></script>
</head>
<body data-lang="${lang}" data-page="${e(o.page || '')}"${o.variant ? ` data-variant="${e(o.variant)}"` : ''}>
<a class="skip" href="#tresc">${e(n.skip)}</a>
<header class="hdr" id="hdr">
  <div class="wrap hdr__in">
    <a class="logo" href="${lang === 'en' ? '/en/' : '/'}" aria-label="Ogarnij — ${lang === 'en' ? 'home' : 'strona główna'}"><span class="logo__mark" aria-hidden="true"></span>Ogarnij</a>
    <nav class="nav" id="nav" aria-label="${lang === 'en' ? 'Main' : 'Główna'}">
      <a href="${anchors}#${ids.how}">${e(n.how)}</a>
      <a href="${anchors}#demo">${e(n.demo)}</a>
      <a href="${anchors}#${ids.planb}">${e(n.planb)}</a>
      <a href="${anchors}#${ids.privacy}">${e(n.privacy)}</a>
      <a href="${anchors}#${ids.pricing}">${e(n.pricing)}</a>
      <a href="${anchors}#faq">${e(n.faq)}</a>
      ${n.guide ? `<a href="/poradnik"${o.page === 'blog' ? ' aria-current="page"' : ''}>${e(n.guide)}</a>` : ''}
      ${langSwitch}
    </nav>
    <a class="btn btn--primary btn--sm hdr__cta" href="${anchors}#${lang === 'en' ? 'join' : 'zapisz'}">${e(n.cta)}</a>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="nav" id="menuBtn">${icon('menu')}<span class="sr-only">${e(n.menu)}</span></button>
  </div>
</header>
<main id="tresc">
${o.body}
</main>
<footer class="ftr">
  <div class="wrap">
    <div class="ftr__grid">
      <div class="ftr__brand"><a class="logo" href="${lang === 'en' ? '/en/' : '/'}"><span class="logo__mark" aria-hidden="true"></span>Ogarnij</a><p>${e(f.about)}</p></div>
      <div><h2>${e(f.product)}</h2>${list(f.links)}</div>
      <div><h2>${e(f.company)}</h2>${list(f.info)}</div>
      <div><h2>${e(f.legal)}</h2>${list(f.rules)}</div>
    </div>
    <div class="ftr__bottom"><span>${e(f.bottom)}</span><span>${e(f.company2)}</span></div>
  </div>
</footer>
</body>
</html>`;
}
