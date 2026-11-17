(() => {
  'use strict';
  const VERSION = '0.3.1';
  const CATALOG_URL = 'https://blackbear2406.github.io/his_bear/antibiotic/panther-emed-antibiotics.json';
  const STORE = 'PANTHER_EMED_ANTIBIOTICS_V1';
  const PANEL_ID = 'panther-antibiotic-lookup';
  const old = document.getElementById(PANEL_ID);
  if (old) { old.remove(); return; }

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
      catalog = saved && saved.schema === 'panther-antibiotic-catalog-v1' && Array.isArray(saved.drugs)
        ? saved.drugs.filter(d => d && typeof d.name === 'string' && d.name.trim())
        : [];
    } catch (_) { catalog = []; }
  };
  readCatalog();
  const loadRemoteCatalog = async () => {
    try {
      const response = await fetch(CATALOG_URL, { cache: 'no-store', credentials: 'omit' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      if (!data || data.schema !== 'panther-antibiotic-catalog-v1' || !Array.isArray(data.drugs)) throw new Error('Sai định dạng danh mục.');
      const valid = data.drugs.filter(d => d && typeof d.name === 'string' && d.name.trim());
      if (!valid.length) throw new Error('Danh mục rỗng.');
      localStorage.setItem(STORE, JSON.stringify({ schema: data.schema, drugs: valid }));
      catalog = valid;
      status.textContent = 'Đã tự đồng bộ ' + catalog.length + ' mục thuốc từ eMed.';
      console.info('[PANTHER Antibiotic Lookup] Remote catalog loaded:', catalog.length);
    } catch (error) {
      console.warn('[PANTHER Antibiotic Lookup] Remote catalog unavailable; using local cache.', error);
      if (!catalog.length) status.textContent = 'Không tải được danh mục trực tuyến. Có thể nạp JSON thủ công.';
    }
  };

  const panel = el('section', { id: PANEL_ID });
  panel.innerHTML = '<style>' +
    '#panther-antibiotic-lookup{position:fixed;z-index:2147483647;right:14px;top:88px;width:min(390px,calc(100vw - 22px));max-height:78vh;overflow:auto;background:#fff;color:#25232a;border:1px solid #ead9e2;border-radius:13px;box-shadow:0 8px 30px #0003;font:13px/1.45 Arial,sans-serif}' +
    '#panther-antibiotic-lookup *{box-sizing:border-box}#panther-antibiotic-lookup .head{position:sticky;top:0;background:#fff2f7;padding:10px 12px;border-bottom:1px solid #eedde5;display:flex;justify-content:space-between;align-items:center;font-weight:700;z-index:2}' +
    '#panther-antibiotic-lookup .body{padding:10px 12px}#panther-antibiotic-lookup button{font:inherit;cursor:pointer;border:1px solid #e6d7df;border-radius:7px;background:#fff;padding:7px 9px;color:#352b32}' +
    '#panther-antibiotic-lookup button:hover{background:#fff2f7}#panther-antibiotic-lookup .muted{color:#70717a;font-size:11px}#panther-antibiotic-lookup .result{display:block;width:100%;text-align:left;margin-top:5px}' +
    '#panther-antibiotic-lookup .detail{border-top:1px solid #eee;margin-top:9px;padding-top:9px}#panther-antibiotic-lookup .classbox{background:#fff6fa;border:1px solid #efdce6;border-radius:8px;padding:8px;margin-top:8px}#panther-antibiotic-lookup .classbox p{margin:4px 0}#panther-antibiotic-lookup .warn{background:#fff8e8;border:1px solid #efdfb6;border-radius:7px;padding:8px;margin-top:8px;font-size:11px}' +
    '#panther-antibiotic-lookup img{display:block;width:100%;height:auto;border:1px solid #eee;border-radius:7px;margin-top:7px}#panther-antibiotic-lookup a{color:#8d315e;font-size:11px}' +
    '</style><div class="head"><span>🐾 PANTHER · KHÁNG SINH</span><button type="button" data-close>Đóng</button></div><div class="body"><div class="muted" data-status></div><div data-results></div><div data-detail></div></div>';
  (document.body || document.documentElement).appendChild(panel);
  const $ = selector => panel.querySelector(selector);
  const status = $('[data-status]');
  const results = $('[data-results]');
  const detail = $('[data-detail]');
  $('[data-close]').addEventListener('click', () => panel.remove());


  const showDrug = drug => {
    detail.replaceChildren();
    const wrap = el('div', { class: 'detail' });
    wrap.appendChild(el('strong', {}, drug.name));
    const classification = drug.classification && typeof drug.classification === 'object' ? drug.classification : {};
    const classificationRows = [
      ['Nhóm dược lý', classification.group],
      ['Phân nhóm / thế hệ', classification.subgroup],
      ['WHO AWaRe', classification.aware],
      ['Bậc quản lý tại bệnh viện', classification.localTier]
    ];
    const classBox = el('div', { class: 'classbox' });
    classBox.appendChild(el('strong', {}, 'Phân loại kháng sinh'));
    for (const [label, value] of classificationRows) {
      const p = el('p');
      p.append(el('strong', {}, label + ': '), document.createTextNode(value ? String(value) : 'Chưa được xác minh'));
      classBox.appendChild(p);
    }
    const note = classification.note;
    if (note) classBox.appendChild(el('div', { class: 'muted' }, String(note)));
    wrap.appendChild(classBox);
    const summary = drug.summary && typeof drug.summary === 'object' ? drug.summary : {};
    const entries = Object.entries(summary).filter(([, value]) => value !== null && value !== undefined && String(value).trim());
    if (entries.length) {
      for (const [label, value] of entries) {
        const p = el('p');
        p.append(el('strong', {}, label + ': '), document.createTextNode(String(value)));
        wrap.appendChild(p);
      }
    } else {
      wrap.appendChild(el('div', { class: 'warn' }, 'Chưa có tóm tắt liều dạng chữ được xác minh. Vui lòng đối chiếu bảng liều gốc eMed; PANTHER không tự suy diễn liều.'));
    }
    const images = Array.isArray(drug.images) ? drug.images : [];
    let shown = 0;
    for (const item of images) {
      const src = safeImage(item && item.src);
      if (!src) continue;
      shown++;
      const link = el('a', { href: src, target: '_blank', rel: 'noopener' }, 'Mở ảnh bảng liều gốc eMed');
      const img = el('img', { src, alt: String((item && item.alt) || drug.name), loading: 'lazy' });
      img.title = 'Nhấn để phóng to bảng liều';
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
    if (!shown) wrap.appendChild(el('div', { class: 'warn' }, 'Danh mục này chưa có ảnh bảng liều.'));
    const source = drug.sourceUrl && /^https:\/\/emed\.bvbnd\.vn\//.test(drug.sourceUrl) ? drug.sourceUrl : 'https://emed.bvbnd.vn/wiki/duoc/khang-sinh/lieu/';
    wrap.appendChild(el('p')).appendChild(el('a', { href: source, target: '_blank', rel: 'noopener' }, 'Mở hướng dẫn kháng sinh trên eMed'));
    detail.appendChild(wrap);
  };

  const matchesFor = raw => {
    const q = norm(raw);
    if (q.length < 3 || !catalog.length) return [];
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
      if (lastField === field || field === field.ownerDocument.activeElement) {
        lastField = field;
        results.replaceChildren();
        status.textContent = activeDrug
          ? 'Đang giữ thông tin: ' + activeDrug.name + ' · Nhập thuốc khác để đổi nội dung.'
          : (catalog.length ? 'Chưa tìm thấy thuốc trong ô đang nhập.' : 'Danh mục thuốc chưa sẵn sàng; đang thử đồng bộ dữ liệu.');
      }
      return;
    }
    lastField = field;
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
      ? 'Đã nạp ' + catalog.length + ' mục thuốc. Gõ ít nhất 3 ký tự tên thuốc trong ô kê thuốc.'
      : 'Đang tải danh mục thuốc từ máy chủ.';
  };
  attach(document);
  refreshStatus();
  loadRemoteCatalog();
  console.info('[PANTHER Antibiotic Lookup]', { version: VERSION, catalogCount: catalog.length, readOnly: true });
})();