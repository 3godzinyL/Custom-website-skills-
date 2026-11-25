import { escapeHtml } from './security.js';
import { now } from './db.js';
import { HttpError } from './http.js';

// Small, safe Markdown subset: everything is escaped first, then a few constructs are re-enabled.
// Supported: ## / ### headings, paragraphs, - lists, 1. lists, **bold**, *italic*, [text](https://… or /path), > quotes.
function inline(s) {
  return escapeHtml(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/(?!\/))[^)\s]*)\)/g, (_, t, href) => {
      const ext = href.startsWith('http');
      return `<a href="${href}"${ext ? ' rel="noopener noreferrer" target="_blank"' : ''}>${t}</a>`;
    });
}

export function renderMarkdown(md) {
  const lines = String(md).replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let list = null, para = [];
  const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } };
  const flushList = () => { if (list) { out.push(`<${list.tag}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.tag}>`); list = null; } };
  for (const raw of lines) {
    const line = raw.trimEnd();
    let m;
    if (!line.trim()) { flushPara(); flushList(); continue; }
    if ((m = line.match(/^(#{2,3})\s+(.*)$/))) { flushPara(); flushList(); const n = m[1].length; out.push(`<h${n}>${inline(m[2])}</h${n}>`); continue; }
    if ((m = line.match(/^>\s?(.*)$/))) { flushPara(); flushList(); out.push(`<blockquote><p>${inline(m[1])}</p></blockquote>`); continue; }
    if ((m = line.match(/^-\s+(.*)$/))) { flushPara(); if (list?.tag !== 'ul') { flushList(); list = { tag: 'ul', items: [] }; } list.items.push(m[1]); continue; }
    if ((m = line.match(/^\d+\.\s+(.*)$/))) { flushPara(); if (list?.tag !== 'ol') { flushList(); list = { tag: 'ol', items: [] }; } list.items.push(m[1]); continue; }
    flushList();
    para.push(line.trim());
  }
  flushPara(); flushList();
  return out.join('\n');
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function listPosts(db, lang, { includeDrafts = false } = {}) {
  return db.prepare(`SELECT id, slug, lang, title, excerpt, author, published, published_at, updated_at FROM posts
    WHERE (? = '' OR lang = ?) AND (? = 1 OR published = 1) ORDER BY COALESCE(published_at, updated_at) DESC`)
    .all(lang || '', lang || '', includeDrafts ? 1 : 0);
}

export function getPost(db, slug, lang) {
  return db.prepare('SELECT * FROM posts WHERE slug = ? AND lang = ? AND published = 1').get(slug, lang) || null;
}

export function savePost(db, input, id = null) {
  const title = String(input.title || '').trim();
  const slug = String(input.slug || '').trim().toLowerCase();
  const body = String(input.body_md || '');
  const lang = input.lang === 'en' ? 'en' : 'pl';
  if (!title || title.length > 160) throw new HttpError(422, 'invalid_title');
  if (!SLUG_RE.test(slug) || slug.length > 80) throw new HttpError(422, 'invalid_slug');
  if (!body.trim() || body.length > 50_000) throw new HttpError(422, 'invalid_body');
  const excerpt = String(input.excerpt || '').slice(0, 300);
  const author = String(input.author || 'Zespół Ogarnij').slice(0, 80);
  const published = input.published ? 1 : 0;
  const t = now();
  try {
    if (id) {
      const cur = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
      if (!cur) throw new HttpError(404, 'not_found');
      db.prepare(`UPDATE posts SET slug=?, lang=?, title=?, excerpt=?, body_md=?, author=?, published=?, published_at=?, updated_at=? WHERE id=?`)
        .run(slug, lang, title, excerpt, body, author, published, published ? (cur.published_at || t) : null, t, id);
      return Number(id);
    }
    return Number(db.prepare(`INSERT INTO posts(slug, lang, title, excerpt, body_md, author, published, published_at, updated_at)
      VALUES(?,?,?,?,?,?,?,?,?)`).run(slug, lang, title, excerpt, body, author, published, published ? t : null, t).lastInsertRowid);
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) throw new HttpError(409, 'slug_taken');
    throw e;
  }
}

export function seedPosts(db) {
  if (db.prepare('SELECT COUNT(*) n FROM posts').get().n) return;
  const t = now();
  const posts = [
    {
      slug: 'plan-b-kiedy-dzien-sie-sypie', title: 'Plan B: co zrobić, kiedy dzień się sypie o 11:00',
      excerpt: 'Spotkanie się przeciągnęło i cały plan przestał mieć sens? Trzy decyzje, które ratują resztę dnia.',
      body: `Większość planów dnia nie upada przez lenistwo. Upada, bo jedno spotkanie trwa 45 minut dłużej, a wszystko po nim jest zaplanowane „na styk”.

## Trzy decyzje zamiast paniki

1. **Co ma stałą godzinę?** Odbiór dziecka, wizyta, pociąg. Tego nie przesuwasz — reszta układa się wokół.
2. **Co da się skrócić?** Duże zadanie często ma sensowny pierwszy krok na 10–20 minut. Zrób krok, nie całość.
3. **Co uczciwie przechodzi na jutro?** Lepiej świadomie przenieść jedną rzecz, niż udawać, że zmieszczą się wszystkie.

## Zapas to nie strata czasu

Planuj najwyżej 70–80% dnia. Wolne bloki między zadaniami pochłaniają przeciągnięte spotkania, zanim zrobią efekt domina.

> Ogarnij robi te trzy kroki za Ciebie: przelicza dzień i pokazuje, co się nie zmieści. Decyzja zostaje po Twojej stronie.`,
    },
    {
      slug: 'pierwszy-krok-10-minut', title: 'Pierwszy krok na 10 minut: jak ruszyć z zadaniem, które odkładasz',
      excerpt: '„Napisać raport” to nie zadanie, tylko projekt. Jak rozbić go na krok, który da się zacząć od razu.',
      body: `Zadania, które odkładamy najdłużej, zwykle nie są trudne — są niejasne. „Napisać raport” nie mówi, od czego zacząć.

## Zasada pierwszego kroku

Pierwszy krok powinien:

- trwać 10–15 minut,
- zaczynać się od czasownika („otwórz”, „wypisz”, „wklej”),
- dać się zrobić bez dodatkowych decyzji.

## Przykłady

- „Napisać raport” → „Otwórz plik i wpisz trzy nagłówki”.
- „Ogarnąć podatki” → „Znajdź PIT-11 w mailu i zapisz go w jednym folderze”.
- „Przygotować prezentację” → „Wklej wykres z ostatniego raportu na slajd 2”.

Po pierwszym kroku zwykle wiesz, jaki jest następny. To wystarczy.`,
    },
    {
      slug: 'godziny-energii', title: 'Godziny energii: kiedy robić trudne rzeczy',
      excerpt: 'Ten sam raport pisze się dwa razy szybciej w dobrej godzinie. Jak znaleźć swoją i chronić ją w kalendarzu.',
      body: `Nie każda godzina dnia jest równa. U większości osób są 2–3 godziny, w których myślenie idzie wyraźnie łatwiej.

## Jak znaleźć swoje godziny

Przez tydzień zapisuj co 2 godziny jedną liczbę od 1 do 5: jak łatwo Ci się teraz myśli. Po tygodniu zobaczysz wzór.

## Jak je chronić

- Wpisz je do kalendarza jako blok „Skupienie”, zanim zrobią to inni.
- Maile, telefony i zakupy przenieś na godziny o niższej energii.
- Jeśli blok przepadł przez spotkanie — przenieś trudne zadanie na jutro w tę samą godzinę, zamiast robić je wieczorem na siłę.

W Ogarnij ustawiasz te godziny raz, a najtrudniejsze zadania trafiają tam automatycznie.`,
    },
  ];
  const ins = db.prepare(`INSERT INTO posts(slug, lang, title, excerpt, body_md, author, published, published_at, updated_at) VALUES(?,?,?,?,?,?,1,?,?)`);
  posts.forEach((p, i) => ins.run(p.slug, 'pl', p.title, p.excerpt, p.body, 'Zespół Ogarnij', t - i * 86_400_000 * 4, t));
}
