(() => {
  'use strict';
  const VERSION = '1.2.1';
  const CATALOG_URL = 'https://blackbear2406.github.io/his_bear/antibiotic/panther-emed-antibiotics.json';
  const STORE = 'PANTHER_ANTIBIOTICS_V2';
  const PANEL_ID = 'panther-antibiotic-lookup';
  const old = document.getElementById(PANEL_ID);
  if (old) { old.remove(); return; }

  // Show indexed medicines for lookup, but never treat source-found data as approved prescribing guidance.
  const isUsableDrug = drug => !!drug && typeof drug.name === 'string' &&
    drug.name.trim().length > 0 && drug.name.length <= 160;

  const norm = value => String(value ?? '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
  const el = (tag, attrs = {}, text = '') => {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'class') node.className = value;
      else if (key === 'style') node.style.cssText = value;
      else if (key.startsWith('data-')) node.setAttribute(key, value);
      else node[key] = value;
    }
    if (text !== '') node.textContent = text;
    return node;
  };
  const safeImage = value => {
    try {
      const url = new URL(value, 'https://emed.bvbnd.vn/');
      return url.protocol === 'https:' && (url.hostname === 'emed.bvbnd.vn' || url.hostname.endsWith('.emed.bvbnd.vn')) ? url.href : '';
    } catch (_) { return ''; }
  };
  let catalog = [];
  const readCatalog = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
      catalog = saved && saved.schema === 'panther-antibiotic-catalog-v2' && Array.isArray(saved.drugs)
        ? saved.drugs.filter(isUsableDrug)
        : [];
    } catch (_) { catalog = []; }
  };
  readCatalog();
  const loadRemoteCatalog = async () => {
    try {
      const response = await fetch(CATALOG_URL, { cache: 'no-store', credentials: 'omit' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      if (!data || data.schema !== 'panther-antibiotic-catalog-v2' || !Array.isArray(data.drugs)) throw new Error('Sai định dạng danh mục.');
      const valid = data.drugs.filter(isUsableDrug);
      localStorage.setItem(STORE, JSON.stringify({ schema: data.schema, version: data.version || '', savedAt: new Date().toISOString(), drugs: valid }));
      catalog = valid;
      status.textContent = 'Đã đồng bộ ' + catalog.length + '/' + data.drugs.length + ' mục tra cứu · Dữ liệu tham khảo, chưa mặc định được phê duyệt kê đơn.';
      if (searchInput.value.trim()) renderSearch(searchInput.value);
      console.info('[PANTHER Antibiotic Lookup] Remote catalog loaded:', catalog.length);
    } catch (error) {
      console.warn('[PANTHER Antibiotic Lookup] Remote catalog unavailable; using local cache.', error);
      if (!catalog.length) status.textContent = 'Không tải được danh mục và chưa có dữ liệu lưu trên máy. Kiểm tra GitHub Pages/kết nối mạng.';
    }
  };

  const panel = el('section', { id: PANEL_ID });
  panel.innerHTML = '<style>' +
    '#panther-antibiotic-lookup{position:fixed;z-index:2147483647;right:14px;top:88px;width:min(390px,calc(100vw - 22px));max-height:78vh;overflow:auto;background:#fff;color:#25232a;border:1px solid #ead9e2;border-radius:13px;box-shadow:0 8px 30px #0003;font:13px/1.45 Arial,sans-serif}' +
    '#panther-antibiotic-lookup *{box-sizing:border-box}#panther-antibiotic-lookup .head{position:sticky;top:0;background:#fff2f7;padding:10px 12px;border-bottom:1px solid #eedde5;display:flex;justify-content:space-between;align-items:center;font-weight:700;z-index:2}' +
    '#panther-antibiotic-lookup .body{padding:10px 12px}#panther-antibiotic-lookup .search{display:flex;gap:6px;margin:9px 0}#panther-antibiotic-lookup .search input{min-width:0;flex:1;border:1px solid #e5cbd8;border-radius:8px;padding:9px 10px;font:13px Arial,sans-serif;outline:none}#panther-antibiotic-lookup .search input:focus{border-color:#c65b8d;box-shadow:0 0 0 2px #f8dce9}#panther-antibiotic-lookup button{font:inherit;cursor:pointer;border:1px solid #e6d7df;border-radius:7px;background:#fff;padding:7px 9px;color:#352b32}' +
    '#panther-antibiotic-lookup button:hover{background:#fff2f7}#panther-antibiotic-lookup .muted{color:#70717a;font-size:11px}#panther-antibiotic-lookup .result{display:block;width:100%;text-align:left;margin-top:5px}' +
    '#panther-antibiotic-lookup .detail{border-top:1px solid #eee;margin-top:9px;padding-top:9px}#panther-antibiotic-lookup .classbox{background:#fff6fa;border:1px solid #efdce6;border-radius:8px;padding:8px;margin-top:8px}#panther-antibiotic-lookup .classbox p{margin:4px 0}#panther-antibiotic-lookup .warn{background:#fff8e8;border:1px solid #efdfb6;border-radius:7px;padding:8px;margin-top:8px;font-size:11px}' +
    '#panther-antibiotic-lookup img{display:block;width:100%;height:auto;border:1px solid #eee;border-radius:7px;margin-top:7px}#panther-antibiotic-lookup a{color:#8d315e;font-size:11px}' +
    '</style><div class="head"><span>🐾 PANTHER · TRA CỨU KHÁNG NHIỄM</span><button type="button" data-close>Đóng</button></div><div class="body"><div class="search"><input type="search" data-search placeholder="Tìm tên thuốc, hoạt chất, biệt dược…" autocomplete="off" aria-label="Tìm kiếm thuốc"><button type="button" data-clear title="Xóa tìm kiếm">Xóa</button></div><div class="muted" data-status></div><div data-results></div><div data-detail></div></div>';
  (document.body || document.documentElement).appendChild(panel);
  const $ = selector => panel.querySelector(selector);
  const status = $('[data-status]');
  const results = $('[data-results]');
  const detail = $('[data-detail]');
  $('[data-close]').addEventListener('click', () => panel.remove());
  const searchInput = $('[data-search]');
  const clearSearch = () => { searchInput.value = ''; results.replaceChildren(); detail.replaceChildren(); status.textContent = catalog.length ? 'Nhập tên thuốc hoặc hoạt chất để tra cứu.' : 'Đang tải danh mục tra cứu…'; searchInput.focus(); };
  $('[data-clear]').addEventListener('click', clearSearch);


  const showDrug = drug => {
    detail.replaceChildren();
    const wrap = el('div', { class: 'detail' });
    wrap.appendChild(el('strong', {}, drug.name));
    const statusText = value => ({
      'not-reviewed': 'Chưa thẩm định',
      'source-found': 'Có nguồn tra cứu · Chưa thẩm định lâm sàng',
      'clinically-reviewed': 'Đã rà soát chuyên môn',
      'approved-for-release': 'Đã phê duyệt phát hành'
    }[value] || 'Chưa xác định trạng thái');
    const category = drug.category || {};
    const spectrum = drug.spectrum || {};
    const dosing = drug.dosing || {};
    const hasApprovedDosing = dosing.status === 'approved-for-release' &&
      drug.releaseStatus === 'approved-for-release' && !!drug.reviewedAt && !!drug.reviewer;
    const sourceFound = (Array.isArray(drug.sources) ? drug.sources : []).some(x => x && x.status === 'source-found') ||
      category.status === 'source-found' || spectrum.status === 'source-found';
    wrap.appendChild(el('div', { class: 'warn' },
      sourceFound
        ? 'THAM KHẢO SƠ BỘ · Có dữ liệu trích nguồn nhưng chưa được thẩm định/phê duyệt sử dụng kê đơn. Không dùng riêng nội dung này để quyết định điều trị.'
        : 'CHƯA THẨM ĐỊNH · Mục này mới có tên trong danh mục. Cần đối chiếu tài liệu chính thức và quy trình bệnh viện.'));
    const section = (title, rows) => {
      const visibleRows = rows.filter(([, value]) => value !== null && value !== undefined && value !== '');
      if (!visibleRows.length) return;
      const box = el('div', { class: 'classbox' });
      box.appendChild(el('strong', {}, title));
      for (const [label, value] of visibleRows) {
        const p = el('p');
        p.append(el('strong', {}, label + ': '), document.createTextNode(String(value)));
        box.appendChild(p);
      }
      wrap.appendChild(box);
    };
    section('Nhóm thuốc', [
      ['Nhóm dược lý', category.pharmacologicClass],
      ['Phân nhóm', category.subclass],
      ['Trạng thái dữ liệu', statusText(category.status)]
    ]);
    section('Phổ tác dụng · Tham khảo, chưa phê duyệt', [
      ['Gram dương', spectrum.gramPositive],
      ['Gram âm', spectrum.gramNegative],
      ['Vi khuẩn kỵ khí', spectrum.anaerobes],
      ['Vi khuẩn không điển hình', spectrum.atypicals],
      ['Vi sinh vật khác', spectrum.otherOrganisms],
      ['Giới hạn phổ / lưu ý', spectrum.limitations],
      ['Trạng thái dữ liệu', statusText(spectrum.status)]
    ]);
    const listSection = (title, items) => {
      if (!Array.isArray(items) || !items.length) return;
      const box = el('div', { class: 'classbox' });
      box.appendChild(el('strong', {}, title + ' · Tham khảo sơ bộ'));
      for (const item of items) {
        const value = typeof item === 'string' ? item : (item && (item.text || item.description || item.name)) || '';
        if (value) box.appendChild(el('p', {}, '• ' + value));
      }
      wrap.appendChild(box);
    };
    listSection('Chỉ định được ghi nhận', drug.indications);
    listSection('Chống chỉ định được ghi nhận', drug.contraindications);
    listSection('Thận trọng được ghi nhận', drug.precautions);
    if (hasApprovedDosing) {
      section('Liều dùng người lớn · Đã phê duyệt', [
        ['Liều thường dùng', dosing.adultUsual],
        ['Đường dùng', dosing.route],
        ['Khoảng cách liều', dosing.interval],
        ['Chỉnh liều suy thận', dosing.renalAdjustment],
        ['Cách dùng', dosing.administration]
      ]);
    } else {
      const box = el('div', { class: 'warn' });
      box.appendChild(el('strong', {}, 'LIỀU DÙNG: CHƯA ĐƯỢC PHÊ DUYỆT'));
      box.appendChild(el('p', {}, dosing.status === 'source-found'
        ? 'Có thông tin liều ở nguồn tham khảo nhưng chưa được rà soát độc lập; hệ thống chủ động không hiển thị liều.'
        : 'Chưa có dữ liệu liều được thẩm định. Tra cứu Dược thư chính thức, hướng dẫn bệnh viện và hiệu chỉnh theo người bệnh.'));
      wrap.appendChild(box);
    }
    const sources = Array.isArray(drug.sources) ? drug.sources.filter(x => x && x.url && /^https:\/\//.test(x.url)) : [];
    if (sources.length) {
      const box = el('div', { class: 'classbox' });
      box.appendChild(el('strong', {}, 'Nguồn tra cứu · Chưa đồng nghĩa phê duyệt'));
      for (const item of sources) {
        const p = el('p');
        const label = item.title || item.organization || item.name || item.url;
        p.appendChild(el('a', { href: item.url, target: '_blank', rel: 'noopener noreferrer' }, String(label)));
        const meta = [item.publishedAt, item.pages ? 'tr. ' + item.pages : '', item.accessedAt ? 'truy cập ' + item.accessedAt : '', statusText(item.status)].filter(Boolean).join(' · ');
        if (meta) p.appendChild(el('span', { class: 'muted' }, ' · ' + meta));
        box.appendChild(p);
      }
      wrap.appendChild(box);
    }
    const emed = drug.eMed || {};
    const images = Array.isArray(emed.images) ? emed.images : [];
    for (const item of images) {
      const src = safeImage(item && item.src);
      if (!src) continue;
      wrap.appendChild(el('p', { class: 'muted' }, 'Ảnh tham khảo từ eMed · Cần kiểm tra trực tiếp nội dung và phiên bản trước khi sử dụng.'));
      const link = el('a', { href: src, target: '_blank', rel: 'noopener noreferrer' }, 'Mở ảnh bảng liều gốc eMed');
      const img = el('img', { src, alt: String((item && item.alt) || drug.name), loading: 'lazy' });
      img.title = 'Nhấn để phóng to ảnh tham khảo';
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', () => {
        const overlay = el('div');
        Object.assign(overlay.style, {
          position: 'fixed', inset: '0', zIndex: '2147483647',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '18px', boxSizing: 'border-box',
          background: 'rgba(20, 15, 20, .88)', cursor: 'zoom-out'
        });
        const enlarged = el('img', { src, alt: String((item && item.alt) || drug.name) });
        Object.assign(enlarged.style, {
          display: 'block', maxWidth: '96vw', maxHeight: '94vh',
          width: 'auto', height: 'auto', objectFit: 'contain',
          background: '#fff', borderRadius: '8px', boxShadow: '0 8px 36px #0008'
        });
        overlay.appendChild(enlarged);
        overlay.addEventListener('click', () => overlay.remove());
        document.body.appendChild(overlay);
      });
      wrap.append(link, img);
    }
    const emedUrl = emed.sourceUrl;
    if (emedUrl && /^https:\/\/emed\.bvbnd\.vn\//.test(emedUrl)) {
      wrap.appendChild(el('p')).appendChild(el('a', { href: emedUrl, target: '_blank', rel: 'noopener noreferrer' }, 'Mở trang eMed nguồn'));
    }
    detail.appendChild(wrap);
  };

  const matchesFor = raw => {
    const q = norm(raw);
    if (q.length < 2 || !catalog.length) return [];
    return catalog.map(drug => {
      const names = [drug.name, ...(Array.isArray(drug.aliases) ? drug.aliases : [])].map(norm);
      const score = names.reduce((best, name) => {
        if (!name) return best;
        if (name === q) return Math.min(best, 0);
        if (name.startsWith(q)) return Math.min(best, 1);
        if (name.includes(q)) return Math.min(best, 2);
        if (q.includes(name) && name.length >= 4) return Math.min(best, 3);
        return best;
      }, 99);
      return { drug, score };
    }).filter(x => x.score < 99)
      .sort((a, b) => a.score - b.score || a.drug.name.localeCompare(b.drug.name))
      .slice(0, 8).map(x => x.drug);
  };

  const renderSearch = raw => {
    const query = String(raw || '').trim();
    results.replaceChildren();
    detail.replaceChildren();
    if (!query) { status.textContent = catalog.length ? 'Nhập tên thuốc hoặc hoạt chất để tra cứu.' : 'Đang tải danh mục tra cứu…'; return; }
    if (norm(query).length < 2) { status.textContent = 'Nhập ít nhất 2 ký tự để tìm kiếm.'; return; }
    const matches = matchesFor(query);
    if (!matches.length) { status.textContent = 'Không tìm thấy thuốc phù hợp trong danh mục.'; return; }
    status.textContent = 'Tìm thấy ' + matches.length + ' kết quả · Chọn thuốc để xem thông tin.';
    for (const drug of matches) {
      const button = el('button', { type: 'button', class: 'result' }, drug.name);
      button.addEventListener('click', () => { activeDrug = drug; showDrug(drug); status.textContent = 'Đang xem: ' + drug.name + ' · Dữ liệu tham khảo.'; });
      results.appendChild(button);
    }
    if (matches.length === 1) { activeDrug = matches[0]; showDrug(matches[0]); status.textContent = 'Đang xem: ' + matches[0].name + ' · Dữ liệu tham khảo.'; }
  };
  searchInput.addEventListener('input', () => renderSearch(searchInput.value));

  let lastField = null;
  let activeDrug = null;
  const fieldValue = field => field.isContentEditable ? (field.innerText || field.textContent || '') : field.value || '';
  const candidate = field => {
    if (!field || panel.contains(field)) return false;
    const tag = (field.tagName || '').toUpperCase();
    if (!['INPUT', 'TEXTAREA'].includes(tag) && !field.isContentEditable) return false;
    if (field.disabled || field.readOnly) return false;
    if (tag === 'INPUT' && !['text', 'search', ''].includes(String(field.type || 'text').toLowerCase())) return false;
    return true;
  };
  const inspect = field => {
    if (!candidate(field)) return;
    const value = fieldValue(field);
    const matches = matchesFor(value);
    if (!matches.length) {
      lastField = field;
      activeDrug = null;
      results.replaceChildren();
      detail.replaceChildren();
      status.textContent = catalog.length
        ? 'Chưa tìm thấy thuốc phù hợp trong ô đang nhập.'
        : 'Danh mục thuốc chưa sẵn sàng; đang thử đồng bộ dữ liệu.';
      return;
    }
    lastField = field;
    activeDrug = null;
    detail.replaceChildren();
    results.replaceChildren();
    status.textContent = 'Nhận diện từ ô nhập · ' + matches.length + ' gợi ý';
    for (const drug of matches) {
      const button = el('button', { type: 'button', class: 'result' }, drug.name);
      button.addEventListener('click', () => {
        activeDrug = drug;
        showDrug(drug);
        status.textContent = 'Đang xem: ' + drug.name + ' · Nhập/chọn thuốc khác để đổi.';
      });
      results.appendChild(button);
    }
    if (matches.length === 1) {
      activeDrug = matches[0];
      showDrug(matches[0]);
      status.textContent = 'Đang xem: ' + matches[0].name + ' · Nhập/chọn thuốc khác để đổi.';
    }
  };
  const roots = new WeakSet();
  const frames = new WeakSet();
  const attach = root => {
    if (!root || roots.has(root)) return;
    roots.add(root);
    for (const type of ['input', 'change', 'keyup', 'compositionend']) root.addEventListener(type, event => inspect(event.target), true);
    root.addEventListener('focusin', event => { if (candidate(event.target)) inspect(event.target); }, true);
    const scan = () => {
      if (lastField) {
        let visible = false;
        try {
          const view = lastField.ownerDocument.defaultView;
          const style = view && view.getComputedStyle(lastField);
          visible = lastField.isConnected && !!lastField.getClientRects().length &&
            (!style || (style.display !== 'none' && style.visibility !== 'hidden'));
        } catch (_) {}
        if (!visible) { panel.remove(); return; }
      }
      let nodes = [];
      try { nodes = root.querySelectorAll('*'); } catch (_) {}
      for (const node of nodes) {
        if (node.shadowRoot) attach(node.shadowRoot);
        if (node.matches && node.matches('iframe,frame') && !frames.has(node)) {
          frames.add(node);
          const hook = () => { try { if (node.contentDocument) attach(node.contentDocument); } catch (_) {} };
          node.addEventListener('load', hook);
          hook();
        }
      }
    };
    scan();
    try { new MutationObserver(scan).observe(root.documentElement || root, { childList: true, subtree: true }); } catch (_) {}
  };
  const refreshStatus = () => {
    status.textContent = catalog.length
      ? 'Đã nạp ' + catalog.length + ' mục tra cứu. Nhập tên thuốc ở ô tìm kiếm phía trên; dữ liệu tham khảo, liều chưa phê duyệt sẽ không hiển thị.'
      : 'Đang tải danh mục tra cứu…';
  };
  attach(document);
  refreshStatus();
  loadRemoteCatalog();
  console.info('[PANTHER Antibiotic Lookup]', { version: VERSION, catalogCount: catalog.length, readOnly: true, dosingGate: 'approved-for-release only' });
})();