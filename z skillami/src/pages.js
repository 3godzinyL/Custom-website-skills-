import { landing } from './pages/landing.js';
import * as inner from './pages/inner.js';
import { legal } from './pages/legal.js';

const ADMIN = `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Panel · Ogarnij</title>
<link rel="icon" href="/icons/icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/css/tokens.css">
<link rel="stylesheet" href="/css/admin.css">
<script src="/js/admin.js" defer></script>
</head>
<body>
<div id="app" class="adm-boot">Ładowanie panelu…</div>
<noscript>Panel wymaga JavaScriptu.</noscript>
</body>
</html>`;

export function createPages({ config }) {
  const baseUrl = config.baseUrl;
  const withBase = (fn) => (o = {}) => fn({ ...o, baseUrl });
  return {
    landing: withBase(landing),
    thanks: withBase(inner.thanks),
    confirm: withBase(inner.confirm),
    queue: withBase(inner.queue),
    presale: withBase(inner.presale),
    order: withBase(inner.order),
    sandboxPay: withBase(inner.sandboxPay),
    unsubscribe: withBase(inner.unsubscribe),
    blogIndex: withBase(inner.blogIndex),
    blogPost: withBase(inner.blogPost),
    legal: withBase(legal),
    offline: withBase(inner.offline),
    notFound: withBase(inner.notFound),
    error: withBase(inner.error),
    admin: () => ADMIN,
  };
}
