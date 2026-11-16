/* Potong foto: geser dan perbesar di dalam bingkai. cropImage(file) → Promise<dataURL | null> */
function cropImage(file) {
  return new Promise(res => {
    const dlg = $('#cropDlg'), fr = $('#cropFrame'), im = $('#cropImg'), zr = $('#cropZoom');
    let ratio = 4 / 3, fw, fh, iw, ih, base, z = 1, x = 0, y = 0, done = false, drag = null;
    const clamp = () => { const s = base * z; x = Math.min(0, Math.max(fw - iw * s, x)); y = Math.min(0, Math.max(fh - ih * s, y)); };
    const draw = () => { const s = base * z; im.style.cssText = `width:${iw * s}px;height:${ih * s}px;transform:translate(${x}px,${y}px)`; };
    const layout = () => {
      fr.style.aspectRatio = ratio; const r = fr.getBoundingClientRect(); fw = r.width; fh = r.height;
      base = Math.max(fw / iw, fh / ih); z = 1; zr.value = 1; x = (fw - iw * base) / 2; y = (fh - ih * base) / 2; clamp(); draw();
    };
    const finish = v => { if (done) return; done = true; URL.revokeObjectURL(im.src); if (dlg.open) dlg.close(); res(v); };
    const zoomTo = v => { const s0 = base * z, cx = (fw / 2 - x) / s0, cy = (fh / 2 - y) / s0; z = Math.min(3, Math.max(1, v)); zr.value = z; const s = base * z; x = fw / 2 - cx * s; y = fh / 2 - cy * s; clamp(); draw(); };
    zr.oninput = () => zoomTo(+zr.value);
    fr.onwheel = e => { e.preventDefault(); zoomTo(z - e.deltaY * 0.002); };
    fr.onpointerdown = e => { drag = { px: e.clientX, py: e.clientY, x, y }; fr.setPointerCapture(e.pointerId); };
    fr.onpointermove = e => { if (!drag) return; x = drag.x + e.clientX - drag.px; y = drag.y + e.clientY - drag.py; clamp(); draw(); };
    fr.onpointerup = fr.onpointercancel = () => { drag = null; };
    $('#cropAsp').onclick = e => {
      const b = e.target.closest('[data-a]'); if (!b) return; ratio = +b.dataset.a;
      document.querySelectorAll('#cropAsp .chip').forEach(c => c.setAttribute('aria-pressed', c === b)); layout();
    };
    $('#cropCancel').onclick = () => finish(null);
    dlg.onclose = () => finish(null);
    $('#cropOk').onclick = () => {
      const s = base * z, c = document.createElement('canvas'); c.width = 800; c.height = Math.round(800 / ratio);
      c.getContext('2d').drawImage(im, -x / s, -y / s, fw / s, fh / s, 0, 0, c.width, c.height);
      finish(c.toDataURL('image/jpeg', .82));
    };
    im.onload = () => { iw = im.naturalWidth; ih = im.naturalHeight; dlg.showModal(); layout(); };
    im.onerror = () => finish(null);
    im.src = URL.createObjectURL(file);
  });
}
