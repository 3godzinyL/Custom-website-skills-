import { layout } from './layout.js';

const COMPANY_PL = '[DO UZUPEŁNIENIA: nazwa firmy, adres, NIP, KRS/CEIDG]';
const COMPANY_EN = '[TO BE COMPLETED: company name, address, VAT ID]';

const DOCS = {
  privacy: {
    pl: { title: 'Polityka prywatności', path: '/prywatnosc', alt: '/en/privacy', body: `
<h2>1. Administrator</h2><p>Administratorem danych jest ${COMPANY_PL}, e-mail: kontakt@ogarnij.example.</p>
<h2>2. Jakie dane i po co</h2>
<ul>
<li><strong>Lista oczekujących:</strong> adres e-mail, język, data zapisu i potwierdzenia, kod polecający, informacja, kto Cię polecił, odpowiedź na ankietę (opcjonalnie). Cel: zaproszenie do bety i informacje o niej (art. 6 ust. 1 lit. b i f RODO).</li>
<li><strong>Porady o planowaniu:</strong> tylko gdy zaznaczysz osobną zgodę (art. 6 ust. 1 lit. a RODO). Zgodę wycofasz linkiem w każdym mailu.</li>
<li><strong>Przedsprzedaż:</strong> e-mail, imię i nazwisko lub firma, NIP (opcjonalnie), dane zamówienia. Cel: realizacja umowy i obowiązki księgowe (art. 6 ust. 1 lit. b i c RODO). Danych karty nie przetwarzamy — robi to operator płatności.</li>
<li><strong>Statystyki strony:</strong> zliczamy zdarzenia (np. „uruchomiono demo”) w dziennych sumach, bez adresu IP, ciasteczek i identyfikatora osoby.</li>
</ul>
<h2>3. Ciasteczka</h2><p>Strona publiczna nie używa ciasteczek analitycznych ani marketingowych, dlatego nie pokazujemy banera zgód. Panel administracyjny używa jednego niezbędnego ciasteczka sesji. Czcionki ładowane są z Google Fonts (Google otrzymuje adres IP przeglądarki) — w wersji produkcyjnej przeniesiemy je na nasz serwer.</p>
<h2>4. Odbiorcy</h2><p>Dostawca hostingu, dostawca wysyłki e-maili, operator płatności — wyłącznie w zakresie potrzebnym do działania usługi, na podstawie umów powierzenia.</p>
<h2>5. Jak długo</h2><ul><li>niepotwierdzone zapisy — 30 dni, potem usuwamy je automatycznie;</li><li>lista oczekujących — do startu bety i 12 miesięcy po nim albo do wypisu;</li><li>zamówienia — 5 lat od końca roku (przepisy podatkowe);</li><li>kopie zapasowe — 14 dni.</li></ul>
<h2>6. Twoje prawa</h2><p>Dostęp, sprostowanie, usunięcie, ograniczenie, przeniesienie danych, sprzeciw, wycofanie zgody oraz skarga do Prezesa UODO. Napisz na kontakt@ogarnij.example — odpowiemy w ciągu 30 dni.</p>
<h2>7. Aplikacja i AI</h2><p>W aplikacji nagrania głosowe kasujemy po transkrypcji, a tekst zadań przechowujemy w UE i nie używamy go do trenowania modeli. Szczegółową politykę aplikacji opublikujemy przed startem bety.</p>` },
    en: { title: 'Privacy policy', path: '/en/privacy', alt: '/prywatnosc', body: `
<h2>1. Controller</h2><p>${COMPANY_EN}, e-mail: kontakt@ogarnij.example.</p>
<h2>2. What we collect and why</h2><ul><li><strong>Waitlist:</strong> e-mail, language, signup and confirmation dates, referral code and referrer, optional survey answer — to invite you to the beta (GDPR art. 6(1)(b),(f)).</li><li><strong>Planning tips:</strong> only with separate consent; withdraw via any e-mail.</li><li><strong>Pre-sale:</strong> e-mail, name or company, optional VAT ID, order details. Card data is handled by the payment provider only.</li><li><strong>Site statistics:</strong> daily event totals with no IP, cookies or personal identifiers.</li></ul>
<h2>3. Cookies</h2><p>The public site uses no analytics or marketing cookies. The admin panel uses one essential session cookie. Fonts are loaded from Google Fonts (Google receives your IP address); production will self-host them.</p>
<h2>4. Retention</h2><p>Unconfirmed signups: 30 days. Waitlist: until 12 months after the beta or until you unsubscribe. Orders: 5 years (tax law). Backups: 14 days.</p>
<h2>5. Your rights</h2><p>Access, rectification, erasure, restriction, portability, objection, withdrawal of consent, and a complaint to the Polish DPA (UODO). Write to kontakt@ogarnij.example.</p>` },
  },
  rules: {
    pl: { title: 'Zasady listy oczekujących i poleceń', path: '/zasady-listy', alt: '/en/waitlist-rules', body: `
<h2>1. Zapis</h2><p>Na listę zapisujesz się adresem e-mail i potwierdzasz zapis linkiem z wiadomości (ważnym 72 godziny). Jeden adres = jedno miejsce. Adresy z dopiskiem „+” i warianty z kropkami w Gmailu traktujemy jak ten sam adres.</p>
<h2>2. Kolejka</h2><p>Miejsce zależy od kolejności potwierdzenia. Każda osoba, która potwierdzi zapis z Twojego linku polecającego, przesuwa Cię o 5 miejsc w górę. Miejsce liczymy na serwerze; strona pokazuje je na bieżąco.</p>
<h2>3. Polecenia</h2><ul><li>Polecenie liczy się dopiero po potwierdzeniu e-maila przez poleconą osobę.</li><li>Nie płacimy za polecenia i nie przyznajemy nagród pieniężnych.</li><li>Zakładanie fikcyjnych adresów, automatyczne zapisy lub spam z linkiem polecającym skutkują usunięciem z listy.</li></ul>
<h2>4. Zaproszenia</h2><p>Zaproszenia do testów i bety wysyłamy według kolejki. Możemy zaprosić wcześniej osoby z grup, których brakuje w testach (np. inny system telefonu) — powiemy o tym otwarcie.</p>
<h2>5. Wypis</h2><p>Link „Wypisz mnie” jest w każdym mailu. Po wypisie tracisz miejsce w kolejce.</p>` },
    en: { title: 'Waitlist and referral rules', path: '/en/waitlist-rules', alt: '/zasady-listy', body: `
<h2>1. Signing up</h2><p>Sign up with your e-mail and confirm via the link (valid 72 hours). One address = one spot; “+tag” and Gmail dot variants count as the same address.</p>
<h2>2. The queue</h2><p>Your place depends on when you confirmed. Each person who confirms from your referral link moves you up 5 spots. Positions are calculated on the server.</p>
<h2>3. Referrals</h2><ul><li>A referral counts only after the referred person confirms.</li><li>No cash rewards.</li><li>Fake addresses, automated signups or spamming your link get you removed.</li></ul>
<h2>4. Unsubscribe</h2><p>Every e-mail has an “Unsubscribe” link. Unsubscribing removes your spot.</p>` },
  },
  terms: {
    pl: { title: 'Regulamin przedsprzedaży', path: '/regulamin-przedsprzedazy', alt: '/en/presale-terms', body: `
<h2>1. Sprzedawca</h2><p>${COMPANY_PL}, e-mail: kontakt@ogarnij.example.</p>
<h2>2. Przedmiot</h2><p>„Pakiet założycielski” to dostęp do planu Ogarnij Plus przez 12 miesięcy, liczonych od dnia startu zamkniętej bety (planowany termin: wiosna 2027). Cena: 99 zł brutto (zawiera VAT), płatna jednorazowo, bez automatycznego odnowienia.</p>
<h2>3. Zamówienie i płatność</h2><p>Zamówienie składasz formularzem „Zamawiam i płacę”. Umowa zostaje zawarta z chwilą potwierdzenia płatności przez operatora. Potwierdzenie wysyłamy e-mailem.</p>
<h2>4. Odstąpienie od umowy</h2><p>Konsument (i przedsiębiorca na prawach konsumenta) może odstąpić od umowy w ciągu 14 dni od jej zawarcia bez podawania przyczyny — wystarczy odpisać na e-mail z potwierdzeniem lub napisać na kontakt@ogarnij.example. Zwrot nastąpi w ciągu 14 dni tą samą metodą płatności.</p>
<h2>5. Gdy start się opóźni</h2><p>Jeśli beta nie wystartuje do 31 grudnia 2027 r., zwrócimy pełną kwotę bez wniosku. Na Twój wniosek zwrócimy ją także wcześniej, w dowolnym momencie przed startem.</p>
<h2>6. Reklamacje</h2><p>Reklamacje przyjmujemy e-mailem; odpowiadamy w ciągu 14 dni.</p>
<h2>7. Dane osobowe</h2><p>Zasady opisuje <a href="/prywatnosc">polityka prywatności</a>.</p>` },
    en: { title: 'Pre-sale terms', path: '/en/presale-terms', alt: '/regulamin-przedsprzedazy', body: `
<h2>1. Seller</h2><p>${COMPANY_EN}, e-mail: kontakt@ogarnij.example.</p>
<h2>2. What you buy</h2><p>The “Founder pack” is 12 months of Ogarnij Plus counted from the closed-beta launch (planned: spring 2027). Price: PLN 99 incl. VAT, one-time, no auto-renewal.</p>
<h2>3. Withdrawal</h2><p>Consumers may withdraw within 14 days without giving a reason — reply to the confirmation e-mail. Refunds within 14 days to the original payment method.</p>
<h2>4. If the launch slips</h2><p>If the beta hasn’t launched by 31 December 2027, we refund in full automatically. You can also ask for a refund any time before launch.</p>` },
  },
};

export function legal({ name, lang, baseUrl }) {
  const d = DOCS[name][lang];
  const other = DOCS[name][lang === 'en' ? 'pl' : 'en'];
  return layout({
    lang, baseUrl, page: 'legal', title: d.title, description: d.title, path: d.path,
    alt: lang === 'en' ? { pl: other.path, en: d.path } : { pl: d.path, en: other.path }, langHref: d.alt,
    body: `<article class="page"><div class="wrap-narrow">
  <p class="eyebrow">${lang === 'en' ? 'Last updated: 24 November 2026' : 'Ostatnia aktualizacja: 24 listopada 2026'}</p>
  <h1>${d.title}</h1>
  <p class="notice">${lang === 'en' ? 'Draft for a fictional project — to be reviewed by a lawyer before real use.' : 'Szkic dla projektu fikcyjnego — przed prawdziwym użyciem do weryfikacji przez prawnika.'}</p>
  <div class="prose">${d.body}</div>
</div></article>`,
  });
}
