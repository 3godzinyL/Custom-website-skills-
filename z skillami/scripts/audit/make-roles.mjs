// Creates QA viewer/editor accounts on the local QA server and writes roles.json (cookies per role).
import fs from 'node:fs';
const BASE = 'http://127.0.0.1:3710';
const out = process.argv[2];
async function login(email, password) {
  const r = await fetch(`${BASE}/api/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  const j = await r.json();
  return { cookie: r.headers.get('set-cookie')?.split(';')[0], csrf: j.csrf, status: r.status };
}
const owner = await login('qa@ogarnij.local', 'qa-password-12345');
const roles = { guest: {}, owner: { headers: { Cookie: owner.cookie } } };
for (const role of ['viewer', 'editor']) {
  const email = `qa-${role}@ogarnij.local`;
  const r = await fetch(`${BASE}/api/admin/users`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: owner.cookie, 'X-CSRF-Token': owner.csrf }, body: JSON.stringify({ email, name: role, role }) });
  const j = await r.json();
  if (!j.tempPassword) { console.log('user exists or failed', role, r.status, j); continue; }
  const s = await login(email, j.tempPassword);
  roles[role] = { headers: { Cookie: s.cookie } };
  fs.writeFileSync(out.replace('roles.json', `${role}.json`), JSON.stringify({ email, password: j.tempPassword, csrf: s.csrf, cookie: s.cookie }));
}
fs.writeFileSync(out.replace('roles.json', 'owner.json'), JSON.stringify(owner));
fs.writeFileSync(out, JSON.stringify(roles, null, 2));
console.log('roles:', Object.keys(roles).join(', '));
