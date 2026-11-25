import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emailKey, validEmail, totpCode, verifyTotp, base32Encode, validNip, csvCell, hashPassword, verifyPassword,
} from '../src/security.js';
import { signPayload, verifySignature, quote, formatMoney } from '../src/payments.js';
import { renderMarkdown } from '../src/blog.js';
import { zTest } from '../src/analytics.js';
import { openDb } from '../src/db.js';

test('emailKey folds aliases and gmail dots', () => {
  assert.equal(emailKey('Ola.Nowak+beta@GMail.com'), 'olanowak@gmail.com');
  assert.equal(emailKey('ola.nowak@googlemail.com'), 'olanowak@gmail.com');
  assert.equal(emailKey('jan.kowalski+x@firma.pl'), 'jan.kowalski@firma.pl');
});

test('validEmail rejects junk', () => {
  assert.ok(validEmail('ola@poczta.pl'));
  for (const bad of ['', 'ola@poczta', 'a b@c.pl', '<x>@y.pl', 'x'.repeat(250) + '@a.pl', 123]) assert.ok(!validEmail(bad), String(bad));
});

test('TOTP matches RFC 6238 vector', () => {
  const secret = base32Encode(Buffer.from('12345678901234567890'));
  assert.equal(totpCode(secret, 59_000), '287082');
  assert.equal(totpCode(secret, 1111111109_000), '081804');
  assert.ok(verifyTotp(secret, '287082', 59_000));
  assert.ok(verifyTotp(secret, totpCode(secret, 89_000), 59_000), 'one step drift allowed');
  assert.ok(!verifyTotp(secret, '000000', 59_000));
  assert.ok(!verifyTotp(secret, 'abc', 59_000));
});

test('passwords hash and verify', () => {
  const h = hashPassword('correct horse battery');
  assert.ok(verifyPassword('correct horse battery', h));
  assert.ok(!verifyPassword('wrong', h));
});

test('NIP checksum', () => {
  assert.ok(validNip('526-000-12-46'));
  assert.ok(!validNip('5260001247'));
  assert.ok(!validNip('123'));
});

test('CSV cells cannot become formulas', () => {
  assert.equal(csvCell('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
  assert.equal(csvCell('+48 123'), "'+48 123");
  assert.equal(csvCell('a;b'), '"a;b"');
  assert.equal(csvCell('ola@poczta.pl'), 'ola@poczta.pl');
});

test('webhook signatures: valid, tampered, stale', () => {
  const raw = '{"id":"evt_1"}';
  const t = 1_800_000_000;
  const h = signPayload('s3cret', raw, t);
  assert.ok(verifySignature('s3cret', raw, h, t + 10));
  assert.ok(!verifySignature('s3cret', raw + ' ', h, t + 10), 'body changed');
  assert.ok(!verifySignature('other', raw, h, t + 10), 'wrong secret');
  assert.ok(!verifySignature('s3cret', raw, h, t + 301), 'too old');
  assert.ok(!verifySignature('s3cret', raw, '', t));
});

test('markdown renderer escapes HTML and unsafe links', () => {
  const out = renderMarkdown('<script>alert(1)</script>\n\n[x](javascript:alert(1)) [y](//evil.example) [z](/ok) **b**');
  assert.ok(!out.includes('<script>'));
  assert.ok(!out.includes('href="javascript'));
  assert.ok(!out.includes('href="//evil'));
  assert.ok(out.includes('<a href="/ok">z</a>'));
  assert.ok(out.includes('<strong>b</strong>'));
});

test('price is computed on the server from codes', () => {
  const db = openDb(':memory:');
  db.prepare("INSERT INTO discount_codes(code, percent, max_uses, used, created_at) VALUES('START20', 20, 1, 0, 0)").run();
  db.prepare("INSERT INTO discount_codes(code, percent, max_uses, used, created_at) VALUES('ZUZYTY', 50, 1, 1, 0)").run();
  db.prepare("INSERT INTO discount_codes(code, percent, expires_at, created_at) VALUES('STARY', 50, 1, 0)").run();
  assert.deepEqual([quote(db, '').amount, quote(db, 'start20').amount, quote(db, 'ZUZYTY').amount, quote(db, 'STARY').amount], [9900, 7920, 9900, 9900]);
  assert.equal(formatMoney(7920, 'pl'), '79,20 zł');
  assert.equal(formatMoney(7920, 'en'), 'PLN 79.20');
});

test('z-test', () => {
  assert.equal(zTest(0, 0, 1, 1), null);
  assert.ok(zTest(50, 1000, 100, 1000) < 0.001);
  assert.ok(zTest(50, 1000, 52, 1000) > 0.5);
});
