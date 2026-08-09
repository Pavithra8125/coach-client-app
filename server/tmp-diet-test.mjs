import { config } from './src/config.js';

const BASE = 'http://localhost:4000';
const u = config.coach.username;
const p = config.coach.password;

const jar = {};
async function api(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { 'content-type': 'application/json', ...(opts.headers ?? {}), ...(jar.cookie ? { cookie: jar.cookie } : {}) },
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) jar.cookie = setCookie.split(';')[0];
  return { status: res.status, body };
}

const login = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: u, password: p }) });
console.log('login:', login.status, JSON.stringify(login.body));

const me = await api('/api/auth/me');
console.log('me:', me.status, JSON.stringify(me.body));

const CID = 4;
const D = '2026-08-09';
const checks = {
  'get meal-plan': () => api(`/api/clients/${CID}/meal-plan`),
  'get food-log': () => api(`/api/clients/${CID}/food-log?date=${D}`),
  'get water': () => api(`/api/clients/${CID}/water?date=${D}`),
  'get supplements': () => api(`/api/clients/${CID}/supplements`),
  'get supplement-log': () => api(`/api/clients/${CID}/supplement-log?date=${D}`),
};
for (const [name, fn] of Object.entries(checks)) {
  const r = await fn();
  console.log(name + ':', r.status, JSON.stringify(r.body));
}

// Now exercise the writes (on a throwaway date so we don't disturb real data):
const T = '2020-01-01';
console.log('--- writes on throwaway date', T, '---');
let r = await api(`/api/clients/${CID}/meal-plan`, { method: 'PUT', body: JSON.stringify({ name: 'Test', protein: 150, carbs: 200, fat: 70, calories: 2200, notes: 'tmp' }) });
console.log('put meal-plan:', r.status, JSON.stringify(r.body));
r = await api(`/api/clients/${CID}/food-log`, { method: 'POST', body: JSON.stringify({ date: T, food_name: 'Oats', meal_label: 'breakfast', protein: 10, carbs: 30, fat: 5, calories: 200 }) });
console.log('post food-log:', r.status, JSON.stringify(r.body));
const entryId = r.body?.entry?.id;
r = await api(`/api/clients/${CID}/water`, { method: 'PUT', body: JSON.stringify({ date: T, glasses: 8 }) });
console.log('put water:', r.status, JSON.stringify(r.body));
r = await api(`/api/clients/${CID}/supplements`, { method: 'POST', body: JSON.stringify({ name: 'Creatine' }) });
console.log('post supplement:', r.status, JSON.stringify(r.body));
const suppId = r.body?.supplement?.id;
r = await api(`/api/clients/${CID}/supplement-log`, { method: 'PUT', body: JSON.stringify({ date: T, supplement_ids: [suppId] }) });
console.log('put supplement-log:', r.status, JSON.stringify(r.body));
r = await api(`/api/clients/${CID}/food-log?date=${T}`);
console.log('get food-log (T):', r.status, JSON.stringify(r.body));
