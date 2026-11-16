/* ===== Konfigurasi global — ubah di sini ===== */
const CONFIG = {
  waNumber: '628993383985', // GANTI: format 62..., tanpa + atau spasi (bisa juga diubah dari dasbor admin)
  storeName: 'DomStore',
  supabaseUrl: 'https://uxmmmpetfqevtbfqqrpl.supabase.co', // ISI: contoh https://abcdxyz.supabase.co  (kosong = mode lokal tanpa database)
  supabaseKey: 'sb_publishable_2fpMrFowo-iCEgJ_JULD5Q_6wE31iq4', // ISI: anon public key dari Supabase (aman dipublikasikan)
  adminEmail: 'makbarooo2009@gmail.com',  // ISI (mode database): email admin Supabase. PIN = kata sandi akun itu (min. 6 karakter)
  adminPin: '',  // hanya mode lokal (tanpa database). Di mode database PIN = kata sandi akun Supabase, JANGAN ditulis di sini.
  priceFallback: 'Tanya admin',
  statusFallback: 'Cek ketersediaan ke admin'
};

const CATEGORIES = [
  { id: 'akun-game', name: 'Jual Beli Akun Game', desc: 'Marketplace akun game dengan detail akun, status, dan harga.' },
  { id: 'top-up', name: 'Top Up Game', desc: 'Pilihan game, nominal top up, harga, dan status layanan.' },
  { id: 'sosmed', name: 'Suntik Sosmed', desc: 'Followers, likes, views, dan layanan sosial media lainnya.' },
  { id: 'rekber', name: 'Jasa Rekber', desc: 'Rekening bersama: biaya jasa, alur, dan ketentuan transaksi.' },
  { id: 'post-akun', name: 'Jasa Post Akun', desc: 'Promosi listing akun: biaya publikasi dan platform.' },
  { id: 'app-premium', name: 'App Premium', desc: 'Aplikasi premium dengan pilihan paket dan durasi.' }
];

/* Teks WhatsApp otomatis (bisa diubah dari dasbor admin).
   Variabel: {produk} {kategori} {harga} {toko} */
const DEFAULT_MSG = {
  product: 'Halo {toko}, saya ingin memesan {produk}. Mohon informasi harga dan ketersediaannya.',
  admin: 'Halo {toko}, saya ingin bertanya tentang produk dan layanan digital.',
  store: 'Halo {toko}, saya butuh bantuan untuk kebutuhan digital saya.',
  receipt: 'Halo {nama}, terima kasih telah berbelanja di {toko}. Berikut struk pembelianmu (total {total}).'
};
const fillMsg = (tpl, v) => String(tpl).replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));

/* Data awal (placeholder). price: angka Rupiah atau null. status: 'Tersedia' | 'Terbatas' | 'Habis' | null */
const DEFAULT_PRODUCTS = [
  { id: 1, cat: 'akun-game', name: '[Contoh] Akun Game', desc: 'Placeholder listing akun. Detail diisi admin.', price: null, status: null, image: '', info: { Level: '—', Server: '—' } },
  { id: 2, cat: 'top-up', name: '[Contoh] Top Up Game', desc: 'Placeholder top up. Pilih game dan nominal lewat admin.', price: null, status: null, image: '', info: { Game: '—', Nominal: '—' } },
  { id: 3, cat: 'sosmed', name: '[Contoh] Followers', desc: 'Placeholder layanan followers.', price: null, status: null, image: '', info: { Platform: '—', Jumlah: '—' } },
  { id: 4, cat: 'rekber', name: '[Contoh] Jasa Rekber', desc: 'Placeholder rekber. Biaya dan ketentuan dikonfirmasi admin sebelum transaksi.', price: null, status: null, image: '', info: { Biaya: 'Dikonfirmasi admin' } },
  { id: 5, cat: 'post-akun', name: '[Contoh] Post Akun', desc: 'Placeholder promosi listing akun.', price: null, status: null, image: '', info: { Platform: '—' } },
  { id: 6, cat: 'app-premium', name: '[Contoh] App Premium', desc: 'Placeholder paket aplikasi premium.', price: null, status: null, image: '', info: { Paket: '—', Durasi: '—' } }
];

/* ===== Penyimpanan =====
   Semua halaman hanya memakai objek Store (async). Jika supabaseUrl & supabaseKey diisi,
   data disimpan di database Supabase; jika kosong, memakai localStorage (mode coba-coba). */
const LocalStore = {
  remote: false,
  _get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
  _set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { throw new Error('Penyimpanan browser penuh'); } },
  async list() { return this._get('ds_products', DEFAULT_PRODUCTS); },
  async save(p) { const l = await this.list(); if (p.id) l.splice(l.findIndex(x => x.id === p.id), 1, p); else { p = { ...p, id: Date.now() }; l.unshift(p); } this._set('ds_products', l); return p; },
  async remove(id) { this._set('ds_products', (await this.list()).filter(x => x.id !== id)); },
  async getSettings() { const x = this._get('ds_settings', {}); return { waNumber: x.waNumber || CONFIG.waNumber, messages: { ...DEFAULT_MSG, ...(x.messages || {}) } }; },
  async saveSettings(s) { this._set('ds_settings', s); },
  async uploadImage(dataUrl) { return dataUrl; },
  async login(_, pin) { if (pin !== CONFIG.adminPin) throw new Error('PIN salah'); localStorage.setItem('ds_admin', '1'); },
  logout() { localStorage.removeItem('ds_admin'); },
  isAdmin() { return sessionStorage.getItem('ds_admin') === '1'; },
  async sales(f, t) { return this._get('ds_sales', []).filter(x => x.at >= f && x.at < t).sort((a, b) => b.at.localeCompare(a.at)); },
  async addSale(x) { const l = this._get('ds_sales', []), r = { ...x, id: Date.now(), at: new Date().toISOString() }; l.push(r); this._set('ds_sales', l); return r; },
  async removeSale(id) { this._set('ds_sales', this._get('ds_sales', []).filter(x => x.id !== id)); },
  async expenses(f, t) { return this._get('ds_exp', []).filter(x => x.at >= f && x.at < t).sort((a, b) => b.at.localeCompare(a.at)); },
  async addExpense(x) { const l = this._get('ds_exp', []), r = { ...x, id: Date.now(), at: new Date().toISOString() }; l.push(r); this._set('ds_exp', l); return r; },
  async removeExpense(id) { this._set('ds_exp', this._get('ds_exp', []).filter(x => x.id !== id)); },
  reset() { localStorage.removeItem('ds_products'); }
};

const RemoteStore = {
  remote: true,
  base: CONFIG.supabaseUrl.replace(/\/$/, ''),
  _tok() { try { return JSON.parse(localStorage.getItem('ds_sess')); } catch { return null; } },
  async _req(path, { method = 'GET', body, auth = false, headers = {}, retry = true } = {}) {
    const s = this._tok();
    const h = { apikey: CONFIG.supabaseKey, ...headers };
    const bearer = auth && s ? s.access_token : (CONFIG.supabaseKey.startsWith('eyJ') ? CONFIG.supabaseKey : null); // key baru (sb_publishable_) bukan JWT
    if (bearer) h.Authorization = 'Bearer ' + bearer;
    const blob = body instanceof Blob;
    if (body && !blob) h['Content-Type'] = 'application/json';
    const r = await fetch(this.base + path, { method, headers: h, body: blob ? body : body && JSON.stringify(body) });
    if (r.status === 401 && auth && s && s.refresh_token && retry) {
      try { await this._auth('refresh_token', { refresh_token: s.refresh_token }); return this._req(path, { method, body, auth, headers, retry: false }); } catch {}
    }
    if (!r.ok) { const t = await r.text(); let m = t; try { const j = JSON.parse(t); m = j.message || j.msg || j.error_description || j.error || t; } catch {} const e = new Error(m || r.status); e.status = r.status; throw e; }
    return r.status === 204 ? null : r.json().catch(() => null);
  },
  async _auth(grant, body) {
    const r = await fetch(`${this.base}/auth/v1/token?grant_type=${grant}`, { method: 'POST', headers: { apikey: CONFIG.supabaseKey, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) throw new Error(CONFIG.adminEmail ? 'PIN salah. Coba lagi.' : 'Email atau PIN salah');
    sessionStorage.setItem('ds_sess', JSON.stringify({ access_token: d.access_token, refresh_token: d.refresh_token }));
  },
  _in: r => ({ id: r.id, cat: r.cat, name: r.name, desc: r.description || '', price: r.price, status: r.status, image: r.image || '', info: r.info || {} }),
  _out: p => ({ cat: p.cat, name: p.name, description: p.desc, price: p.price, status: p.status, image: p.image, info: p.info }),
  async list(withCost) {
    const l = (await this._req('/rest/v1/products?select=*&order=created_at.desc')).map(this._in);
    if (withCost) { const c = await this._req('/rest/v1/product_costs?select=*', { auth: true }); const m = Object.fromEntries(c.map(x => [x.product_id, Number(x.cost)])); l.forEach(p => { p.cost = m[p.id] ?? null; }); }
    return l;
  },
  async _setCost(id, cost) {
    if (cost == null) await this._req('/rest/v1/product_costs?product_id=eq.' + encodeURIComponent(id), { method: 'DELETE', auth: true });
    else await this._req('/rest/v1/product_costs', { method: 'POST', auth: true, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: { product_id: id, cost } });
  },
  async save(p) {
    const w = { auth: true, headers: { Prefer: 'return=representation' }, body: this._out(p) };
    const r = p.id ? await this._req('/rest/v1/products?id=eq.' + encodeURIComponent(p.id), { ...w, method: 'PATCH' }) : await this._req('/rest/v1/products', { ...w, method: 'POST' });
    if (!r || !r[0]) throw Object.assign(new Error('Tidak diizinkan'), { status: 403 });
    const saved = this._in(r[0]);
    if (p.cost !== undefined) { await this._setCost(saved.id, p.cost); saved.cost = p.cost; }
    return saved;
  },
  async remove(id) { await this._req('/rest/v1/products?id=eq.' + encodeURIComponent(id), { method: 'DELETE', auth: true }); },
  async getSettings() { const r = await this._req('/rest/v1/settings?id=eq.1&select=*'); const x = (r && r[0]) || {}; return { waNumber: x.wa_number || CONFIG.waNumber, messages: { ...DEFAULT_MSG, ...(x.wa_templates || {}) } }; },
  async saveSettings(s) { await this._req('/rest/v1/settings?id=eq.1', { method: 'PATCH', auth: true, body: { wa_number: s.waNumber, wa_templates: s.messages } }); },
  async uploadImage(dataUrl) {
    const blob = await (await fetch(dataUrl)).blob(), name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    await this._req('/storage/v1/object/products/' + name, { method: 'POST', auth: true, body: blob, headers: { 'Content-Type': 'image/jpeg' } });
    return `${this.base}/storage/v1/object/public/products/${name}`;
  },
  _range: (t, f, to) => `/rest/v1/${t}?select=*&created_at=gte.${encodeURIComponent(f)}&created_at=lt.${encodeURIComponent(to)}&order=created_at.desc`,
  _sale: r => ({ id: r.id, at: r.created_at, customer: r.customer, phone: r.phone, method: r.method, note: r.note, items: r.items || [], total: Number(r.total), costTotal: Number(r.cost_total) }),
  _exp: r => ({ id: r.id, at: r.created_at, label: r.label, amount: Number(r.amount) }),
  async sales(f, t) { return (await this._req(this._range('sales', f, t), { auth: true })).map(this._sale); },
  async addSale(x) { const r = await this._req('/rest/v1/sales', { method: 'POST', auth: true, headers: { Prefer: 'return=representation' }, body: { customer: x.customer, phone: x.phone, method: x.method, note: x.note, items: x.items, total: x.total, cost_total: x.costTotal } }); return this._sale(r[0]); },
  async removeSale(id) { await this._req('/rest/v1/sales?id=eq.' + encodeURIComponent(id), { method: 'DELETE', auth: true }); },
  async expenses(f, t) { return (await this._req(this._range('expenses', f, t), { auth: true })).map(this._exp); },
  async addExpense(x) { const r = await this._req('/rest/v1/expenses', { method: 'POST', auth: true, headers: { Prefer: 'return=representation' }, body: { label: x.label, amount: x.amount } }); return this._exp(r[0]); },
  async removeExpense(id) { await this._req('/rest/v1/expenses?id=eq.' + encodeURIComponent(id), { method: 'DELETE', auth: true }); },
  login(email, pass) { return this._auth('password', { email: email || CONFIG.adminEmail, password: pass }); },
  logout() { sessionStorage.removeItem('ds_sess'); },
  isAdmin() { return !!this._tok(); }
};
const Store = CONFIG.supabaseUrl && CONFIG.supabaseKey ? RemoteStore : LocalStore;

/* ===== Util bersama ===== */
const $ = (s, e = document) => e.querySelector(s);
const rupiah = n => 'Rp ' + Number(n).toLocaleString('id-ID');
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const priceText = p => (p.price != null ? rupiah(p.price) : CONFIG.priceFallback);
const statusText = p => p.status || CONFIG.statusFallback;

/* ===== Tema gelap / terang ===== */
(function () {
  let t = null; try { t = localStorage.getItem('ds_theme'); } catch {}
  if (!t) t = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  document.documentElement.dataset.theme = t;
})();
function bindTheme() {
  document.querySelectorAll('[data-theme-toggle]').forEach(b => b.addEventListener('click', () => {
    const n = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = n;
    try { localStorage.setItem('ds_theme', n); } catch {}
  }));
}
const THEME_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>';
