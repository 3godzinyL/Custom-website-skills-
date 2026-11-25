import { layout, icon, e } from './layout.js';
import { COPY } from './landing-copy.js';

function signupForm(c, { id, lang, variant, ref, source, short = false, marketing = true }) {
  const f = c.form;
  return `<form class="signup js-signup" action="#" method="post" novalidate data-source="${e(source)}">
  <div class="signup__row">
    <label class="sr-only" for="${id}">${e(f.label)}</label>
    <input class="input input--pill" id="${id}" name="email" type="email" inputmode="email" autocomplete="email" placeholder="${e(f.placeholder)}" required maxlength="254" aria-describedby="${id}-msg">
    <button class="btn btn--primary" type="submit" data-sending="${e(f.sending)}">${e(short ? f.buttonShort : f.button)}</button>
  </div>
  <div class="hp" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div>
  <input type="hidden" name="lang" value="${lang}"><input type="hidden" name="variant" value="${e(variant)}"><input type="hidden" name="ref" value="${e(ref)}">
  ${marketing ? `<label class="check"><input type="checkbox" name="consentMarketing" value="1"><span>${e(f.marketing)}</span></label>` : ''}
  <p class="form-msg" id="${id}-msg" role="alert" data-err-email="${e(f.errEmail)}" data-err-server="${e(f.errServer)}" data-err-limit="${e(f.errLimit)}"></p>
  <p class="signup__micro">${f.micro}</p>
</form>`;
}

const slotsHtml = (slots) => slots.map(([t, name, meta, fixed]) =>
  `<div class="slot${fixed ? ' slot--fixed' : ''}"><time>${e(t)}</time><div class="slot__card">${e(name)}<small>${e(meta)}</small></div></div>`).join('');

const phone = (inner, cls = '') => `<div class="phone ${cls}"><div class="phone__scr">${inner}</div></div>`;

export function landing({ lang, variant, count, ref, baseUrl }) {
  const c = COPY[lang];
  const id = c.ids;
  const ph = c.phone;
  const p = lang === 'en' ? '/en' : '';
  const waves = '<span></span>'.repeat(16);

  const hero = `
<section class="hero">
  <div class="wrap hero__grid">
    <div>
      <p class="eyebrow">${e(c.eyebrow)}</p>
      <h1 data-ab="${e(variant)}" data-variant="${e(variant)}">${c.h1[variant] || c.h1.a}</h1>
      <p class="lead">${e(c.lead)}</p>
      ${signupForm(c, { id: 'email-hero', lang, variant, ref, source: 'hero', marketing: false })}
      ${count ? `<p class="hero__count">${e(c.count(count))}</p>` : ''}
      <a class="hero__more btn--ghost" href="#${id.how}">${e(c.more)} ↓</a>
    </div>
    <div class="stage" role="img" aria-label="${e(ph.alt)}">
      ${phone(`<p class="scr-title">${e(ph.closing)}</p><p class="scr-sub">${e(ph.date)}</p>
        ${ph.done.map(([a, b]) => `<div class="row-done"><span>${e(a)}</span>${b.startsWith('→') ? `<span>${e(b)}</span>` : `<b>${e(b)}</b>`}</div>`).join('')}
        <p class="scr-sub">${e(ph.doneNote)}</p>`, 'phone--back')}
      ${phone(`<p class="scr-title">${e(ph.today)}</p><p class="scr-sub js-rec-label" data-done="${e(ph.date)}">${e(ph.listening)} 0:42</p>
        <div class="wave">${waves}</div>
        <p class="transcript js-transcript" data-text="${e(ph.transcript)}">${e(ph.transcript)}</p>
        <div class="slots anim js-hero-slots">${slotsHtml(ph.slots)}</div>`, 'phone--front js-hero-phone')}
    </div>
  </div>
</section>`;

  const problem = `
<section class="section section--line problem">
  <div class="wrap-narrow">
    <h2 class="h2 reveal">${e(c.problem.h2)}</h2>
    <ul class="problem__list">${c.problem.items.map((t) => `<li class="js-strike"><span>${e(t)}</span></li>`).join('')}</ul>
    <p class="problem__end reveal">${e(c.problem.end)}</p>
  </div>
</section>`;

  const h = c.how;
  const howScreens = [
    `<p class="scr-title">${e(ph.today)}</p><p class="scr-sub">${e(ph.listening)}</p><div class="wave">${waves}</div><p class="transcript">${e(ph.transcript)}</p>`,
    `<p class="scr-title">${lang === 'en' ? 'Found 4 tasks' : '4 zadania z nagrania'}</p><p class="scr-sub">${lang === 'en' ? 'Check and confirm' : 'Sprawdź i zatwierdź'}</p><div class="step-list">${h.s2.map(([a, b]) => `<div><span>${e(a)}</span><b>${e(b)}</b></div>`).join('')}</div>`,
    `<p class="scr-title">${e(ph.today)}</p><p class="scr-sub">${e(ph.date)}</p><div class="slots">${slotsHtml(ph.slots.slice(0, 4))}</div>`,
  ];
  const how = `
<section class="section section--line" id="${id.how}">
  <div class="wrap">
    <div class="sec-head"><div><p class="eyebrow">${e(h.eyebrow)}</p><h2 class="h2 reveal">${e(h.h2)}</h2></div></div>
    <ol class="how__list">
      ${h.steps.map(([t, d], i) => `<li class="how__item reveal"><div aria-hidden="true">${phone(howScreens[i])}</div><h3>${e(t)}</h3><p>${e(d)}</p></li>`).join('')}
    </ol>
  </div>
</section>`;

  const d = c.demo;
  const demo = `
<section class="section section--surface" id="demo">
  <div class="wrap demo__grid">
    <div>
      <p class="eyebrow">${e(d.eyebrow)}</p>
      <h2 class="h2">${e(d.h2)}</h2>
      <p class="lead">${e(d.lead)}</p>
      <form class="demo__form js-demo" action="#" novalidate>
        <div class="field">
          <label for="demo-text">${e(d.label)}</label>
          <textarea class="textarea" id="demo-text" name="text" maxlength="2000" data-sample="${e(d.sample)}">${e(d.sample)}</textarea>
        </div>
        <div class="demo__actions">
          <button class="btn btn--primary" type="submit">${e(d.run)}</button>
          <button class="btn btn--secondary rec js-dictate" type="button" hidden data-stop="${e(d.stop)}" data-start="${e(d.dictate)}">${icon('mic')}<span>${e(d.dictate)}</span></button>
          <button class="btn btn--ghost js-demo-reset" type="button">${e(d.reset)}</button>
        </div>
        <p class="demo__note">${e(d.note)}</p>
      </form>
    </div>
    <div>
      <div class="demo__out">${phone(`<p class="scr-title">${e(ph.today)}</p><p class="scr-sub">${lang === 'en' ? 'Your plan (demo)' : 'Twój plan (demo)'}</p><div class="js-demo-out" aria-live="polite"><p class="demo-empty">${e(d.empty)}</p></div>`)}</div>
      <div class="demo__cta"><a class="btn btn--primary" href="#${id.join}">${e(d.cta)}</a></div>
      <p class="hint">${e(d.ctaNote)}</p>
    </div>
  </div>
</section>`;

  const fe = c.features;
  const energy = [1, 2, 5, 6, 6, 4, 2, 2, 3, 4, 3, 1];
  const visuals = [
    phone(`<p class="scr-title">${e(ph.today)}</p><p class="scr-sub">${e(ph.listening)}</p><div class="wave">${waves}</div><p class="transcript">${e(ph.transcript)}</p>`),
    phone(`<p class="scr-title">${lang === 'en' ? 'First step' : 'Pierwszy krok'}</p><p class="scr-sub">${e(h.s2[0][0])}</p><div class="step-list">${fe.steps.map(([a, b]) => `<div><span>${e(a)}</span><b>${e(b)}</b></div>`).join('')}</div>`),
    `<div class="panel"><p class="label">${e(fe.energyLabel)}</p><div class="energy">${energy.map((v) => `<span class="e${v}${v >= 5 ? ' is-high' : ''}"></span>`).join('')}</div><div class="energy-axis"><span>7:00</span><span>12:00</span><span>18:00</span></div></div>`,
    `<div class="panel"><p class="label">${e(fe.calLabel)}</p><div class="cal-list">${fe.cal.map(([a, b], i) => `<div class="${i === 2 ? 'is-later' : ''}"><span>${e(a)}</span><b>${e(b)}</b></div>`).join('')}</div></div>`,
    phone(`<p class="scr-title">${e(ph.closing)}</p><p class="scr-sub">${e(ph.date)}</p>${ph.done.map(([a, b]) => `<div class="row-done"><span>${e(a)}</span>${b.startsWith('→') ? `<span>${e(b)}</span>` : `<b>${e(b)}</b>`}</div>`).join('')}`),
  ];
  const features = `
<section class="section">
  <div class="wrap">
    <div class="sec-head"><div><p class="eyebrow">${e(fe.eyebrow)}</p><h2 class="h2">${e(fe.h2)}</h2></div></div>
    <div class="feat">
      ${fe.rows.map(([t, txt], i) => `<div class="feat__row reveal"><div class="feat__text"><p class="feat__num">0${i + 1}</p><h3>${e(t)}</h3><p>${e(txt)}</p></div><div class="feat__vis" aria-hidden="true">${visuals[i]}</div></div>`).join('')}
    </div>
  </div>
</section>`;

  const b = c.planb;
  const blk = (cls, [name, meta], extra = '') => `<div class="blk ${cls}"${extra}>${e(name)}<small>${e(meta)}</small></div>`;
  const planb = `
<section class="section section--line" id="${id.planb}">
  <div class="wrap">
    <div class="planb__head">
      <div><p class="eyebrow">${e(b.eyebrow)}</p><h2 class="h2">${e(b.h2)}</h2></div>
      <div><p>${e(b.lead)}</p><div class="planb__ctl"><button class="btn btn--secondary js-late" type="button" aria-pressed="false" aria-controls="track" data-on="${e(b.undo)}" data-off="${e(b.btn)}">${e(b.btn)}</button></div></div>
    </div>
    <div class="track" id="track">
      <div class="track__hours" aria-hidden="true">${['9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map((x) => `<span>${x}</span>`).join('')}</div>
      ${blk('b1', b.blocks.mail)}
      <div class="blk b2 blk--meet">${e(b.blocks.meet[0])}<small class="js-meet" data-on="${e(b.blocks.meet[2])}" data-off="${e(b.blocks.meet[1])}">${e(b.blocks.meet[1])}</small></div>
      <div class="blk b3">${e(b.blocks.focus[0])}<small class="js-focus" data-on="${e(b.blocks.focus[2])}" data-off="${e(b.blocks.focus[1])}">${e(b.blocks.focus[1])}</small></div>
      ${blk('b5', b.blocks.shop)}
      ${blk('b4 blk--fixed', b.blocks.pick)}
    </div>
    <p class="tomorrow js-tomorrow" aria-live="polite" data-on="${e(b.late)}" data-off="${e(b.ok)}">${e(b.ok)}</p>
  </div>
</section>`;

  const w = c.who;
  const who = `
<section class="section">
  <div class="wrap">
    <div class="sec-head"><div><p class="eyebrow">${e(w.eyebrow)}</p><h2 class="h2">${e(w.h2)}</h2></div><p class="lead">${e(w.note)}</p></div>
    <div class="who">${w.items.map(([t, scene, help]) => `<article class="who__item reveal"><h3>${e(t)}</h3><p class="who__scene">${e(scene)}</p><p class="who__help">${e(help)}</p></article>`).join('')}</div>
  </div>
</section>`;

  const pr = c.privacy;
  const privacy = `
<section class="section section--surface" id="${id.privacy}">
  <div class="wrap">
    <div class="privacy__grid">
      <div><p class="eyebrow">${e(pr.eyebrow)}</p><h2 class="h2">${e(pr.h2)}</h2><p class="lead">${e(pr.lead)}</p><p><a class="btn btn--ghost" href="${lang === 'en' ? '/en/privacy' : '/prywatnosc'}">${e(pr.link)} →</a></p></div>
      <dl class="facts">${pr.facts.map(([t, d]) => `<div><dt>${e(t)}</dt><dd>${e(d)}</dd></div>`).join('')}</dl>
    </div>
    <div class="ai">
      <div class="ai__col ai__col--yes"><h3>${e(pr.yesH)}</h3><ul>${pr.yes.map((x) => `<li>${icon('check')}<span>${e(x)}</span></li>`).join('')}</ul></div>
      <div class="ai__col ai__col--no"><h3>${e(pr.noH)}</h3><ul>${pr.no.map((x) => `<li>${icon('x')}<span>${e(x)}</span></li>`).join('')}</ul></div>
    </div>
  </div>
</section>`;

  const pc = c.pricing;
  const pricing = `
<section class="section" id="${id.pricing}">
  <div class="wrap">
    <div class="sec-head"><div><p class="eyebrow">${e(pc.eyebrow)}</p><h2 class="h2">${e(pc.h2)}</h2></div>
      <div class="billing" role="group" aria-label="${lang === 'en' ? 'Billing period' : 'Okres rozliczenia'}"><button type="button" class="js-billing" data-period="m" aria-pressed="true">${e(pc.monthly)}</button><button type="button" class="js-billing" data-period="y" aria-pressed="false">${e(pc.yearly)}</button></div>
    </div>
    <div class="plans">${pc.plans.map((pl) => `<article class="plan${pl.main ? ' plan--main' : ''}">
      <p class="plan__name">${e(pl.name)}${pl.tag ? `<span class="plan__tag">${e(pl.tag)}</span>` : ''}</p>
      <p class="plan__price"><span class="js-price" data-m="${e(pl.m)}" data-y="${e(pl.y)}">${e(pl.m)}</span> <small class="js-per" data-m="${e(pl.perM || '')}" data-y="${e(pl.perY || '')}">${e(pl.perM || '')}</small></p>
      <ul>${pl.items.map((x) => `<li>${icon('check')}<span>${e(x)}</span></li>`).join('')}</ul>
      <a class="btn ${pl.main ? 'btn--primary' : 'btn--secondary'}" href="#${id.join}">${e(pc.cta)}</a>
    </article>`).join('')}</div>
    <p class="pricing__note">${e(pc.note)}</p>
    <div class="presale-band"><div><h3>${e(pc.presaleH)}</h3><p>${e(pc.presaleP)}</p></div><a class="btn btn--secondary" href="${p}/zamow">${e(pc.presaleBtn)} ${icon('right')}</a></div>
  </div>
</section>`;

  const r = c.roadmap;
  const roadmap = `
<section class="section section--line">
  <div class="wrap">
    <div class="sec-head"><div><p class="eyebrow">${e(r.eyebrow)}</p><h2 class="h2">${e(r.h2)}</h2></div><p class="lead">${e(r.note)}</p></div>
    <ol class="road">${r.items.map(([t, h3, d, now]) => `<li class="${now ? 'is-now' : ''}"><time>${e(t)}</time><h3>${e(h3)}</h3><p>${e(d)}</p></li>`).join('')}</ol>
  </div>
</section>`;

  const fq = c.faq;
  const faq = `
<section class="section section--line" id="faq">
  <div class="wrap-narrow">
    <p class="eyebrow">${e(fq.eyebrow)}</p><h2 class="h2">${e(fq.h2)}</h2>
    <div class="faq">${fq.items.map(([q, a]) => `<details class="js-faq"><summary>${e(q)}</summary><p>${e(a)}</p></details>`).join('')}</div>
  </div>
</section>`;

  const cta = `
<section class="section cta" id="${id.join}">
  <div class="wrap cta__grid">
    <h2 class="h2">${e(c.cta.h2)}</h2>
    <div>${signupForm(c, { id: 'email-cta', lang, variant, ref, source: 'cta', short: true })}<p class="signup__micro">${e(c.cta.micro)}</p></div>
  </div>
</section>`;

  const jsonLd = [
    { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Ogarnij', applicationCategory: 'ProductivityApplication', operatingSystem: 'Android, iOS', inLanguage: lang, description: c.description,
      offers: [{ '@type': 'Offer', price: '0', priceCurrency: 'PLN', name: lang === 'en' ? 'Free' : 'Darmowy' }, { '@type': 'Offer', price: '19.00', priceCurrency: 'PLN', name: 'Plus' }] },
    { '@context': 'https://schema.org', '@type': 'Organization', name: 'Ogarnij', url: baseUrl, logo: `${baseUrl}/icons/icon-512.png` },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: fq.items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ];

  return layout({
    lang, baseUrl, home: true, page: 'home', variant, title: c.title, description: c.description,
    path: lang === 'en' ? '/en/' : '/', alt: { pl: '/', en: '/en/' }, jsonLd,
    body: hero + problem + how + demo + features + planb + who + privacy + pricing + roadmap + faq + cta,
  });
}
