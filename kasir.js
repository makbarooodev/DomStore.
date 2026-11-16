/* Kasir, struk JPG, dan rekap laba. Memakai Store/$/el/rupiah dari store.js, serta
   `products`, `toast`, `fail` dari admin.js (dipanggil saat dijalankan, bukan saat dimuat). */
let cart = [], rcp = null;
const sumBy = (a, f) => a.reduce((t, x) => t + f(x), 0);
const ymd = d => new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const dayStart = s => new Date(s + 'T00:00:00');
const shortId = s => String(s.id).replace(/\W/g, '').slice(-8).toUpperCase();
const fmtTime = iso => new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

/* ---------- Kasir ---------- */
function renderPos() {
  const q = $('#posSearch').value.trim().toLowerCase(), box = $('#posList'); box.innerHTML = '';
  const list = products.filter(p => !q || p.name.toLowerCase().includes(q));
  if (!list.length) box.append(el('p', 'empty', 'Produk tidak ditemukan. Tambah di Kelola Produk atau pakai Item manual.'));
  list.forEach(p => {
    const r = el('div', 'posrow'), m = el('div'); m.append(el('b', '', p.name), el('small', '', ' ' + priceText(p)));
    const b = el('button', 'btn btn--sm', 'Tambah'); b.type = 'button'; b.onclick = () => addToCart({ key: 'p' + p.id, name: p.name, price: p.price || 0, cost: p.cost ?? null });
    r.append(m, b); box.append(r);
  });
}
$('#posSearch').addEventListener('input', renderPos);

function addToCart(it) { const c = cart.find(x => x.key === it.key); if (c) c.qty++; else cart.push({ ...it, qty: 1 }); renderCart(); }
function cartTotal() { return sumBy(cart, c => c.price * c.qty); }
function renderCart() {
  const box = $('#cartList'); box.innerHTML = '';
  if (!cart.length) box.append(el('p', 'empty', 'Keranjang kosong.'));
  cart.forEach((c, i) => {
    const r = el('div', 'crow'), n = el('b', '', c.name);
    const pr = el('input', 'inp'); pr.type = 'number'; pr.min = 0; pr.value = c.price; pr.setAttribute('aria-label', 'Harga ' + c.name);
    pr.onchange = () => { c.price = Math.max(0, +pr.value || 0); renderCart(); };
    const q = el('div', 'qty'), mi = el('button', 'btn btn--sm', '−'), pl = el('button', 'btn btn--sm', '+');
    mi.type = pl.type = 'button';
    mi.onclick = () => { if (--c.qty <= 0) cart.splice(i, 1); renderCart(); };
    pl.onclick = () => { c.qty++; renderCart(); };
    q.append(mi, el('span', '', c.qty), pl);
    const rm = el('button', 'link', 'Hapus'); rm.type = 'button'; rm.onclick = () => { cart.splice(i, 1); renderCart(); };
    r.append(n, pr, q, el('span', 'sub1', rupiah(c.price * c.qty)), rm); box.append(r);
  });
  $('#cartTotal').textContent = rupiah(cartTotal());
}
$('#posManual').onclick = () => { $('#itemF').reset(); $('#itemDlg').showModal(); };
$('#itemClose').onclick = () => $('#itemDlg').close();
$('#itemF').addEventListener('submit', e => {
  e.preventDefault(); const f = e.target;
  addToCart({ key: 'm' + Date.now(), name: f.name.value.trim(), price: +f.price.value || 0, cost: f.cost.value === '' ? null : +f.cost.value });
  $('#itemDlg').close();
});
$('#checkout').onclick = async () => {
  if (!cart.length) return toast('Keranjang masih kosong');
  const items = cart.map(({ name, price, cost, qty }) => ({ name, price, cost, qty }));
  try {
    const sale = await Store.addSale({ customer: $('#cCust').value.trim(), phone: $('#cPhone').value.trim(), method: $('#cMethod').value, note: $('#cNote').value.trim(), items, total: sumBy(items, i => i.price * i.qty), costTotal: sumBy(items, i => (i.cost || 0) * i.qty) });
    cart = []; ['#cCust', '#cPhone', '#cNote'].forEach(s => { $(s).value = ''; }); renderCart(); toast('Transaksi tersimpan');
    await showReceipt(sale);
  } catch (e) { fail(e); }
};

/* ---------- Struk JPG ---------- */
function receiptCanvas(sale) {
  const W = 480, P = 28, F = '"DM Sans", Arial, sans-serif', ops = [];
  const m = document.createElement('canvas').getContext('2d'); let y = P;
  const wrap = (t, font, max) => { m.font = font; const out = []; let line = ''; String(t).split(' ').forEach(w => { const n = line ? line + ' ' + w : w; if (m.measureText(n).width > max && line) { out.push(line); line = w; } else line = n; }); out.push(line); return out; };
  const txt = (t, o = {}) => { const font = `${o.b ? '700 ' : ''}${o.s || 16}px ${F}`; wrap(t, font, W - 2 * P).forEach(l => { ops.push({ t: l, x: o.c ? W / 2 : P, y, font, a: o.c ? 'center' : 'left', col: o.col || '#111' }); y += (o.s || 16) + 10; }); };
  const two = (l, r, o = {}) => { const font = `${o.b ? '700 ' : ''}${o.s || 16}px ${F}`; ops.push({ t: l, x: P, y, font, a: 'left', col: '#111' }, { t: r, x: W - P, y, font, a: 'right', col: '#111' }); y += (o.s || 16) + 10; };
  const dash = () => { ops.push({ dash: true, y: y - 2 }); y += 14; };
  txt('DOMSTORE', { c: 1, b: 1, s: 30 }); txt('Struk Pembelian', { c: 1, col: '#555' }); txt(fmtTime(sale.at), { c: 1, s: 14, col: '#555' }); txt('No. ' + shortId(sale), { c: 1, s: 14, col: '#555' }); dash();
  if (sale.customer) txt('Pelanggan: ' + sale.customer); txt('Pembayaran: ' + sale.method); dash();
  sale.items.forEach(i => { txt(i.name, { b: 1 }); two(`${i.qty} × ${rupiah(i.price)}`, rupiah(i.price * i.qty), { s: 15 }); });
  dash(); two('TOTAL', rupiah(sale.total), { b: 1, s: 22 });
  if (sale.note) { y += 4; txt('Catatan: ' + sale.note, { s: 14, col: '#555' }); }
  y += 6; dash(); txt('Terima kasih telah berbelanja', { c: 1, s: 14, col: '#555' });
  const c = document.createElement('canvas'), k = 2; c.width = W * k; c.height = (y + P) * k;
  const g = c.getContext('2d'); g.scale(k, k); g.fillStyle = '#fff'; g.fillRect(0, 0, W, y + P);
  ops.forEach(o => { if (o.dash) { g.strokeStyle = '#999'; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(P, o.y); g.lineTo(W - P, o.y); g.stroke(); } else { g.font = o.font; g.textAlign = o.a; g.textBaseline = 'top'; g.fillStyle = o.col; g.fillText(o.t, o.x, o.y); } });
  return c;
}
async function showReceipt(sale) {
  const blob = await new Promise(r => receiptCanvas(sale).toBlob(r, 'image/jpeg', .92));
  let msgs = DEFAULT_MSG; try { msgs = (await Store.getSettings()).messages; } catch {}
  if (rcp) URL.revokeObjectURL(rcp.url);
  rcp = { sale, blob, url: URL.createObjectURL(blob), name: `struk-domstore-${shortId(sale)}.jpg`, text: fillMsg(msgs.receipt, { nama: sale.customer || 'Kak', toko: CONFIG.storeName, total: rupiah(sale.total) }) };
  $('#rcpImg').src = rcp.url; $('#rcpDlg').showModal();
}
const downloadRcp = () => { const a = document.createElement('a'); a.href = rcp.url; a.download = rcp.name; a.click(); };
const waPhone = p => { const d = String(p || '').replace(/\D/g, ''); return d.startsWith('0') ? '62' + d.slice(1) : d; };
$('#rcpClose').onclick = () => $('#rcpDlg').close();
$('#rcpDl').onclick = () => downloadRcp();
$('#rcpWa').onclick = async () => {
  const file = new File([rcp.blob], rcp.name, { type: 'image/jpeg' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], text: rcp.text }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  downloadRcp(); window.open(`https://wa.me/${waPhone(rcp.sale.phone)}?text=${encodeURIComponent(rcp.text)}`, '_blank', 'noopener');
  toast('Struk diunduh. Lampirkan file JPG di chat WhatsApp yang terbuka.');
};

/* ---------- Rekap ---------- */
function setRange(f, t) { $('#rFrom').value = ymd(f); $('#rTo').value = ymd(t); refreshRekap(); }
$('#rToday').onclick = () => setRange(new Date(), new Date());
$('#r7').onclick = () => { const a = new Date(); a.setDate(a.getDate() - 6); setRange(a, new Date()); };
$('#rMonth').onclick = () => { const n = new Date(); setRange(new Date(n.getFullYear(), n.getMonth(), 1), n); };
$('#rFrom').onchange = $('#rTo').onchange = () => refreshRekap();

async function refreshRekap() {
  const f = $('#rFrom').value, t = $('#rTo').value; if (!f || !t) return;
  const a = dayStart(f), b = dayStart(t); b.setDate(b.getDate() + 1);
  try {
    const [sales, exps] = await Promise.all([Store.sales(a.toISOString(), b.toISOString()), Store.expenses(a.toISOString(), b.toISOString())]);
    const rev = sumBy(sales, s => s.total), hpp = sumBy(sales, s => s.costTotal), gross = rev - hpp, biaya = sumBy(exps, e => e.amount), net = gross - biaya;
    const st = $('#rStats'); st.innerHTML = '';
    [['Penghasilan (penjualan)', rupiah(rev)], ['Modal barang', rupiah(hpp)], ['Laba kotor', rupiah(gross)], ['Biaya operasional', rupiah(biaya)], ['Laba bersih', rupiah(net)], ['Jumlah transaksi', sales.length]].forEach(([l, v]) => { const d = el('div', 'stat'); d.append(el('b', '', v), el('span', '', l)); st.append(d); });
    const miss = sumBy(sales, s => s.items.filter(i => i.cost == null).length);
    $('#rNote').textContent = 'Laba kotor = penjualan − modal barang. Laba bersih = laba kotor − biaya operasional.' + (miss ? ` Ada ${miss} item tanpa harga asli; modalnya dihitung Rp 0, jadi laba bisa terlihat lebih besar.` : '');
    const sl = $('#rSales'); sl.innerHTML = ''; if (!sales.length) sl.append(el('p', 'empty', 'Belum ada transaksi pada periode ini.'));
    sales.forEach(s => {
      const r = el('div', 'prow2'), m = el('div'); m.append(el('b', '', `${rupiah(s.total)} · ${s.customer || 'Tanpa nama'}`), el('small', '', `${fmtTime(s.at)} · ${s.method} · ` + s.items.map(i => `${i.name} ×${i.qty}`).join(', ')));
      const row = el('div', 'row'), sb = el('button', 'btn btn--sm', 'Struk'), db = el('button', 'btn btn--sm', 'Hapus');
      sb.onclick = () => showReceipt(s);
      db.onclick = async () => { if (!confirm('Hapus transaksi ini dari rekap?')) return; try { await Store.removeSale(s.id); refreshRekap(); } catch (e) { fail(e); } };
      row.append(sb, db); r.append(m, row); sl.append(r);
    });
    const ex = $('#rExp'); ex.innerHTML = ''; if (!exps.length) ex.append(el('p', 'empty', 'Belum ada biaya pada periode ini.'));
    exps.forEach(x => {
      const r = el('div', 'prow2'), m = el('div'); m.append(el('b', '', `${rupiah(x.amount)} · ${x.label}`), el('small', '', fmtTime(x.at)));
      const db = el('button', 'btn btn--sm', 'Hapus');
      db.onclick = async () => { if (!confirm('Hapus biaya ini?')) return; try { await Store.removeExpense(x.id); refreshRekap(); } catch (e) { fail(e); } };
      r.append(m, db); ex.append(r);
    });
  } catch (e) { fail(e); }
}
$('#expF').addEventListener('submit', async e => {
  e.preventDefault();
  try { await Store.addExpense({ label: $('#expLabel').value.trim(), amount: +$('#expAmt').value || 0 }); e.target.reset(); toast('Biaya dicatat'); refreshRekap(); } catch (er) { fail(er); }
});
renderCart();
