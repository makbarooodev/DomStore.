/* Dasbor admin — memakai Store dari store.js (database Supabase atau mode lokal) */
let products = [], editing = null, image = '';
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600); };
const catName = id => (CATEGORIES.find(c => c.id === id) || {}).name || id;
const num = v => (v === '' || v == null ? null : Number(v));
const fail = e => {
  if (e.status === 401) { Store.logout(); gate(); toast('Sesi habis. Masuk lagi.'); }
  else toast('Gagal: ' + (e.message || 'coba lagi').slice(0, 140));
};

/* Mode & login */
const needEmail = Store.remote && !CONFIG.adminEmail;
$('#emailWrap').hidden = !needEmail; $('#email').required = needEmail;
$('#passLbl').textContent = 'PIN';
$('#modeNote').textContent = Store.remote ? 'Terhubung ke database Supabase. Perubahan tampil untuk semua pengunjung.' : 'Mode lokal: data hanya tersimpan di browser ini. Isi supabaseUrl dan supabaseKey di store.js untuk memakai database.';
$('#reset').hidden = Store.remote;

async function gate() {
  const ok = Store.isAdmin();
  $('#login').hidden = ok; $('#dash').hidden = !ok;
  if (!ok) { $('#pin').focus(); return; }
  try { products = await Store.list(true); render(); setRange(new Date(), new Date()); } catch (e) { fail(e); }
}
$('#login').addEventListener('submit', async e => {
  e.preventDefault(); $('#loginErr').textContent = '';
  try { await Store.login($('#email').value.trim(), $('#pin').value); $('#pin').value = ''; gate(); }
  catch (err) { $('#loginErr').textContent = err.message; }
});
$('#logout').onclick = () => { Store.logout(); gate(); };

/* Tab */
document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', t === b));
  document.querySelectorAll('.pane').forEach(p => { p.hidden = p.id !== 'tab-' + b.dataset.tab; });
  if (b.dataset.tab === 'rekap') refreshRekap();
}));

/* Daftar produk */
function render() {
  const q = $('#search').value.trim().toLowerCase();
  const n = s => products.filter(p => p.status === s).length;
  $('#stats').innerHTML = '';
  [['Total produk', products.length], ['Tersedia', n('Tersedia')], ['Terbatas', n('Terbatas')], ['Habis', n('Habis')]].forEach(([l, v]) => {
    const d = el('div', 'stat'); d.append(el('b', '', v), el('span', '', l)); $('#stats').append(d);
  });
  const list = $('#list'); list.innerHTML = '';
  const shown = products.filter(p => !q || (p.name + ' ' + catName(p.cat)).toLowerCase().includes(q));
  if (!shown.length) list.append(el('p', 'empty', 'Belum ada produk. Tekan Tambah Produk untuk mulai.'));
  shown.forEach(p => {
    const r = el('div', 'prow'), t = el('div', 'thumb');
    if (p.image) { const i = new Image(); i.src = p.image; i.alt = ''; t.append(i); } else t.textContent = 'Tanpa gambar';
    const m = el('div'); m.append(el('h3', '', p.name));
    const s = el('small', '', `${catName(p.cat)} · Jual ${priceText(p)}` + (p.cost != null ? ` · Modal ${rupiah(p.cost)}` + (p.price != null ? ` · Untung ${rupiah(p.price - p.cost)}` : '') : '') + ' ');
    s.append(el('span', 'badge' + (p.status === 'Tersedia' ? ' ok' : ''), statusText(p))); m.append(s);
    const a = el('div', 'row');
    const e = el('button', 'btn btn--sm', 'Ubah'); e.onclick = () => openForm(p);
    const d = el('button', 'btn btn--sm', 'Hapus');
    d.onclick = async () => { if (!confirm(`Hapus "${p.name}"?`)) return; try { await Store.remove(p.id); products = products.filter(x => x.id !== p.id); render(); toast('Produk dihapus'); } catch (er) { fail(er); } };
    a.append(e, d); r.append(t, m, a); list.append(r);
  });
  renderPos();
}
$('#search').addEventListener('input', render);

/* Form produk */
const f = $('#f');
$('#fcat').append(...CATEGORIES.map(c => { const o = el('option', '', c.name); o.value = c.id; return o; }));
const setPrev = () => { const p = $('#prev'); p.textContent = ''; if (image) { const i = new Image(); i.src = image; i.alt = ''; p.append(i); } else p.textContent = 'Belum ada gambar'; };
f.cost.oninput = f.profit.oninput = () => { const c = num(f.cost.value), pr = num(f.profit.value); if (c != null || pr != null) f.price.value = (c || 0) + (pr || 0); };
f.price.oninput = () => { const pr = num(f.price.value), c = num(f.cost.value); if (pr != null && c != null) f.profit.value = pr - c; };
function openForm(p) {
  editing = p; f.reset();
  $('#pTitle').textContent = p ? 'Ubah Produk' : 'Tambah Produk';
  if (p) {
    f.name.value = p.name; f.cat.value = p.cat; f.price.value = p.price ?? ''; f.cost.value = p.cost ?? '';
    f.profit.value = p.cost != null && p.price != null ? p.price - p.cost : ''; f.status.value = p.status || '';
    f.desc.value = p.desc || ''; f.info.value = Object.entries(p.info || {}).map(([k, v]) => `${k}: ${v}`).join('\n');
  }
  image = p ? p.image || '' : ''; setPrev(); $('#pform').showModal();
}
$('#add').onclick = () => openForm(null);
$('#pClose').onclick = () => $('#pform').close();
$('#rmImg').onclick = () => { image = ''; $('#img').value = ''; setPrev(); };
$('#img').addEventListener('change', async e => {
  const file = e.target.files[0]; if (!file) return;
  const out = await cropImage(file); e.target.value = '';
  if (out) { image = out; setPrev(); }
});
f.addEventListener('submit', async e => {
  e.preventDefault(); const btn = f.querySelector('.btn--primary'); btn.disabled = true;
  try {
    const info = {}; f.info.value.split('\n').forEach(l => { const i = l.indexOf(':'); if (i > 0) info[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });
    if (image.startsWith('data:')) image = await Store.uploadImage(image);
    const saved = await Store.save({ ...(editing ? { id: editing.id } : {}), name: f.name.value.trim(), cat: f.cat.value, price: num(f.price.value), cost: num(f.cost.value), status: f.status.value || null, desc: f.desc.value.trim(), info, image });
    products = editing ? products.map(x => x.id === saved.id ? saved : x) : [saved, ...products];
    render(); $('#pform').close(); toast('Produk disimpan');
  } catch (er) { fail(er); } finally { btn.disabled = false; }
});

/* Pengaturan WhatsApp */
const sf = $('#sf');
const prevMsg = () => { $('#mPrev').textContent = fillMsg(sf.mProduct.value, { produk: 'Contoh Produk', kategori: 'Top Up Game', harga: 'Rp 10.000', toko: CONFIG.storeName }); };
const fillSF = (wa, m) => { sf.wa.value = wa; sf.mProduct.value = m.product; sf.mAdmin.value = m.admin; sf.mStore.value = m.store; sf.mReceipt.value = m.receipt; prevMsg(); };
$('#settings').onclick = async () => { try { const s = await Store.getSettings(); fillSF(s.waNumber, s.messages); $('#sform').showModal(); } catch (e) { fail(e); } };
$('#sClose').onclick = () => $('#sform').close();
sf.mProduct.addEventListener('input', prevMsg);
$('#mReset').onclick = () => fillSF(sf.wa.value, DEFAULT_MSG);
sf.addEventListener('submit', async e => {
  e.preventDefault(); const wa = sf.wa.value.replace(/\D/g, '');
  if (wa.length < 8) return toast('Nomor tidak valid');
  try { await Store.saveSettings({ waNumber: wa, messages: { product: sf.mProduct.value.trim(), admin: sf.mAdmin.value.trim(), store: sf.mStore.value.trim(), receipt: sf.mReceipt.value.trim() } }); $('#sform').close(); toast('Pengaturan disimpan'); } catch (er) { fail(er); }
});

/* Ekspor, impor, reset */
$('#export').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(products, null, 2)], { type: 'application/json' }));
  a.download = 'domstore-produk.json'; a.click(); URL.revokeObjectURL(a.href);
};
$('#import').onclick = () => $('#impFile').click();
$('#impFile').addEventListener('change', async e => {
  const file = e.target.files[0]; e.target.value = ''; if (!file) return;
  try {
    const d = JSON.parse(await file.text());
    if (!Array.isArray(d) || d.some(p => !p || typeof p.name !== 'string' || !p.cat)) throw new Error('File tidak valid');
    for (const p of d) products.unshift(await Store.save({ name: p.name, cat: p.cat, price: p.price ?? null, cost: p.cost ?? null, status: p.status || null, desc: p.desc || '', info: p.info || {}, image: p.image || '' }));
    render(); toast('Impor berhasil');
  } catch (er) { er instanceof SyntaxError ? toast('File tidak valid') : fail(er); }
});
$('#reset').onclick = async () => { if (confirm('Kembalikan semua produk ke data contoh awal?')) { Store.reset(); products = await Store.list(true); render(); toast('Data direset'); } };

$('#tbtn').innerHTML = THEME_ICON; bindTheme(); gate();
