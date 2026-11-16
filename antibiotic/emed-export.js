(() => {
  'use strict';
  const ROOT = document.querySelector('main, article, #mw-content-text, .wiki-content, .entry-content') || document.body;
  const nodes = [...ROOT.querySelectorAll('h1,h2,h3,h4,h5,h6,img')];
  const drugs = [];
  let current = null;
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
  for (const node of nodes) {
    if (/^H[1-6]$/.test(node.tagName)) {
      const name = clean(node.textContent);
      if (!name || /hướng dẫn liều|hướng dẫn sử dụng|kháng sinh.*liều/i.test(name)) { current = null; continue; }
      current = { name, aliases: [], summary: {}, images: [], sourceUrl: location.href.split('#')[0] };
      drugs.push(current);
    } else if (node.tagName === 'IMG' && current) {
      const src = node.currentSrc || node.src;
      if (!src || !/^https:/.test(src)) continue;
      if (!current.images.some(item => item.src === src)) current.images.push({ src, alt: clean(node.alt) || current.name });
    }
  }
  const usable = drugs.filter(drug => drug.images.length);
  if (!usable.length) {
    alert('PANTHER eMed Export: Không tìm thấy nhóm thuốc kèm ảnh. Em hãy mở đúng trang bảng liều kháng sinh rồi chạy lại.');
    return;
  }
  const payload = { schema: 'panther-antibiotic-catalog-v1', exportedAt: new Date().toISOString(), source: location.href, drugs: usable };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'panther-emed-antibiotics.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  alert('Đã xuất ' + usable.length + ' mục thuốc có ảnh bảng liều. Tệp chỉ chứa tên thuốc và ảnh nguồn, chưa có tóm tắt liều dạng chữ.');
})();