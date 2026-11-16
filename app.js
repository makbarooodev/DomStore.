/* Halaman toko — data dan konfigurasi ada di store.js */
let waNumber = CONFIG.waNumber;
const waLink = msg => `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`;
const openWA = msg => window.open(waLink(msg), '_blank', 'noopener');
let messages = { ...DEFAULT_MSG };
const catName = id => (CATEGORIES.find(c => c.id === id) || {}).name || '';
const productMsg = p => fillMsg(messages.product, { produk: p.name, kategori: catName(p.cat), harga: priceText(p), toko: CONFIG.storeName });
const thumbOf = (p, box) => {
  box.textContent = '';
  if (!p.image) { box.textContent = 'Gambar produk'; return; }
  const i = new Image(); i.src = p.image; i.alt = p.name; i.loading = 'lazy'; i.decoding = 'async';
  i.title = 'Klik untuk memperbesar'; i.tabIndex = 0; i.setAttribute('role', 'button');
  const open = () => openLB(p.image, p.name);
  i.onclick = open; i.onkeydown = e => { if (e.key === 'Enter') open(); };
  box.append(i);
};

/* Zoom foto */
const lb = $('#lb'), lbImg = $('#lbImg'), lbStage = $('#lbStage');
let zoom = 1;
const setZoom = n => { zoom = Math.min(4, Math.max(1, n)); lbStage.classList.toggle('z', zoom > 1); lbImg.style.width = zoom > 1 ? zoom * 100 + '%' : ''; };
function openLB(src, alt) { lbImg.src = src; lbImg.alt = alt; setZoom(1); lb.showModal(); }
lbImg.onclick = () => setZoom(zoom === 1 ? 2 : 1);
$('#lbIn').onclick = () => setZoom(zoom + 1);
$('#lbOut').onclick = () => setZoom(zoom - 1);
$('#lbClose').onclick = () => lb.close();

const state = { cat: 'all', q: '' };
const grid = $('#grid');
let products = [];

function renderChips() {
  const box = $('#chips'); box.innerHTML = '';
  [{ id: 'all', name: 'Semua' }, ...CATEGORIES].forEach(c => {
    const b = el('button', 'chip', c.name); b.type = 'button';
    b.setAttribute('aria-pressed', state.cat === c.id);
    b.onclick = () => { state.cat = c.id; renderChips(); renderGrid(); };
    box.append(b);
  });
}

function renderGrid() {
  const q = state.q.trim().toLowerCase();
  const list = products.filter(p => (state.cat === 'all' || p.cat === state.cat) && (!q || (p.name + ' ' + p.desc).toLowerCase().includes(q)));
  grid.innerHTML = '';
  if (!list.length) { grid.append(el('p', 'empty', 'Produk tidak ditemukan. Coba kata kunci lain, atau tanyakan ke admin.')); return; }
  list.forEach((p, n) => {
    const c = el('article', 'card pop'); c.style.animationDelay = Math.min(n, 8) * 60 + 'ms';
    const t = el('div', 'thumb'); thumbOf(p, t);
    c.append(t, el('h3', '', p.name), el('p', '', p.desc), el('div', 'status', statusText(p)), el('strong', '', priceText(p)));
    const row = el('div', 'row');
    const d = el('button', 'btn btn--sm', 'Lihat Produk'); d.onclick = () => openDetail(p);
    const o = el('button', 'btn btn--sm btn--primary', 'Pesan Sekarang'); o.onclick = () => openWA(productMsg(p));
    row.append(d, o); c.append(row); grid.append(c);
  });
}

document.querySelectorAll('.cat').forEach(c => c.addEventListener('click', () => {
  state.cat = c.dataset.cat; renderChips(); renderGrid(); $('#katalog').scrollIntoView({ behavior: 'smooth' });
}));

const dlg = $('#detail');
function openDetail(p) {
  $('#d-name').textContent = p.name; $('#d-desc').textContent = p.desc;
  $('#d-status').textContent = 'Status: ' + statusText(p); $('#d-price').textContent = priceText(p);
  thumbOf(p, $('#d-thumb'));
  const dl = $('#d-info'); dl.innerHTML = '';
  Object.entries(p.info || {}).forEach(([k, v]) => dl.append(el('dt', '', k), el('dd', '', v)));
  $('#d-order').onclick = () => openWA(productMsg(p));
  dlg.showModal();
}
$('#dClose').onclick = () => dlg.close();
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });


const burger = $('#burger'), links = $('#navLinks');
const setMenu = o => { links.classList.toggle('open', o); burger.setAttribute('aria-expanded', o); };
burger.onclick = () => setMenu(!links.classList.contains('open'));
links.addEventListener('click', e => { if (e.target.closest('a,button')) setMenu(false); });

document.querySelectorAll('[data-wa]').forEach(b => b.addEventListener('click', () => openWA(fillMsg(messages[b.dataset.wa], { toko: CONFIG.storeName }))));
$('#search').addEventListener('input', e => { state.q = e.target.value; renderGrid(); });

/* Efek: sorotan kursor pada kartu, progres scroll, marquee, reveal */
document.addEventListener('pointermove', e => {
  const c = e.target.closest('.card,.cat'); if (!c) return;
  const r = c.getBoundingClientRect(); c.style.setProperty('--mx', e.clientX - r.left + 'px'); c.style.setProperty('--my', e.clientY - r.top + 'px');
});
const bar = $('#bar');
addEventListener('scroll', () => { const h = document.documentElement; bar.style.transform = `scaleX(${scrollY / Math.max(1, h.scrollHeight - innerHeight)})`; }, { passive: true });
const heroIn = $('.hero__in');
addEventListener('scroll', () => { heroIn.style.opacity = Math.max(0, 1 - scrollY / (innerHeight * .55)); }, { passive: true });
const names = CATEGORIES.map(c => c.name); $('#marq').append(...[...names, ...names].map(n => el('span', '', n)));
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .15 });

$('#tbtn').innerHTML = THEME_ICON; bindTheme();
$('#year').textContent = new Date().getFullYear();
/* Data terstruktur untuk mesin pencari (dibuat dari konten yang tampil) */
const addLD = (id, data) => { const o = document.getElementById(id); if (o) o.remove(); const s = document.createElement('script'); s.type = 'application/ld+json'; s.id = id; s.textContent = JSON.stringify(data); document.head.append(s); };
const AVAIL = { Tersedia: 'https://schema.org/InStock', Terbatas: 'https://schema.org/LimitedAvailability', Habis: 'https://schema.org/OutOfStock' };
addLD('ld-faq', { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [...document.querySelectorAll('#faq-list details')].map(d => ({ '@type': 'Question', name: d.querySelector('summary').textContent, acceptedAnswer: { '@type': 'Answer', text: d.querySelector('p').textContent } })) });
const productLD = list => {
  const items = list.filter(p => p.price != null).slice(0, 50).map(p => ({ '@type': 'Product', name: p.name, description: p.desc || p.name, ...(p.image ? { image: p.image } : {}), offers: { '@type': 'Offer', priceCurrency: 'IDR', price: String(p.price), ...(AVAIL[p.status] ? { availability: AVAIL[p.status] } : {}) } }));
  if (items.length) addLD('ld-products', { '@context': 'https://schema.org', '@graph': items });
};

renderChips(); grid.append(el('p', 'empty', 'Memuat produk…'));
Store.getSettings().then(s => { waNumber = s.waNumber; messages = s.messages; }).catch(() => {});
Store.list().then(l => { products = l; renderGrid(); productLD(l); })
  .catch(() => { grid.innerHTML = ''; grid.append(el('p', 'empty', 'Produk gagal dimuat. Muat ulang halaman atau hubungi admin.')); });
document.querySelectorAll('.steps li,.feats div').forEach((n, i) => { n.classList.add('reveal'); n.style.setProperty('--d', i % 4); });
document.querySelectorAll('.reveal').forEach(n => io.observe(n));
