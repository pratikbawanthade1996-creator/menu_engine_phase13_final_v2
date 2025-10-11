// engine/engine.js — Phase 11 Stable (robust JSON upload, business fields, single-file export)

// ===== Imports =====
import { renderTemplate } from './template-manager.js';
import { applyTheme } from './theme-manager.js';
import { REGISTRY, getSelectedTemplate, getSelectedTheme } from './registry.js';

// ===== Local storage keys =====
const STORAGE_MENU  = 'menuEngineData_v1';
const STORAGE_THEME = 'me:theme';
const STORAGE_TPL   = 'me:template';

// ===== App state =====
export const state = {
  menu: null,
  theme:    localStorage.getItem(STORAGE_THEME) || REGISTRY.defaults.theme,
  template: localStorage.getItem(STORAGE_TPL)   || REGISTRY.defaults.template,
};

// ===== Sample fallback (for “Load sample”) =====
const SAMPLE = {
  name: 'Junk House',
  address: 'Civil Lines, Gondia, MH',
  phone: '+91 98765 43210',
  maps: 'https://maps.google.com/?q=Junk+House+Gondia',
  whatsapp: '919876543210',
  template: 'template-two-col',
  theme: 'classic',
  categories: [
    { name: 'Starters', items: [
      { name: 'Crispy Corn', price: 129, desc: 'Golden fried sweet corn' },
      { name: 'Veg Manchurian', price: 149 }
    ]},
    { name: 'Main Course', items: [
      { name: 'Paneer Butter Masala', price: 199 },
      { name: 'Dal Tadka', price: 159 }
    ]},
  ]
};

// ===== Tolerant JSON parser (BOM, comments, smart quotes, trailing commas) =====
function parseJSONRelaxed(txt) {
  if (!txt) throw new Error('Empty file');
  if (txt.charCodeAt(0) === 0xFEFF) txt = txt.slice(1);            // strip BOM
  txt = txt.replace(/\/\/.*?$|\/\*[\s\S]*?\*\//gm, '');             // comments
  txt = txt.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");            // smart quotes
  txt = txt.replace(/,\s*([}\]])/g, '$1');                          // trailing commas
  try { return JSON.parse(txt); }
  catch {
    const maybe = txt.replace(/'([^'\\]*(\\.[^'\\]*)*)'/g, '"$1"'); // single→double (best effort)
    return JSON.parse(maybe);
  }
}

// ===== Normalizer (map arbitrary keys into our model) =====
function normalizeMenu(raw) {
  const src = raw?.menu ? raw.menu : (raw || {});

  const out = {
    name:     src.name || src.restaurant || src.title || 'Menu',
    address:  src.address || src.location || '',
    phone:    src.phone || src.contact || src.mobile || '',
    whatsapp: (src.whatsapp || '').toString().replace(/\D/g,''),
    maps:     src.maps || src.map || '',
    template: src.template || state.template || 'template-two-col',
    theme:    src.theme || state.theme || 'classic',
    categories: []
  };

  let cats = src.categories;
  if (!Array.isArray(cats)) cats = src.sections || src.category || src.groups || src.menus || [];
  out.categories = (cats || []).map((sec, i) => {
    const cname = sec?.name || sec?.title || sec?.category || sec?.heading || `Category ${i+1}`;
    let items = sec?.items || sec?.dishes || sec?.entries || sec?.menu || sec?.products || sec?.list || [];
    if (!Array.isArray(items)) items = [];
    const norm = items.map(it => {
      const nm = it?.name || it?.title || it?.item || it?.dish || it?.product || it?.label || '';
      if (!nm) return null;
      let price = it?.price ?? it?.cost ?? it?.rate ?? it?.amount ?? it?.mrp ?? '';
      if (typeof price === 'string') {
        const cleaned = price.replace(/[^\d.]/g,'');
        price = cleaned ? Number(cleaned) : '';
      }
      const desc = it?.desc || it?.description || it?.details || it?.about || '';
      return { name: nm, price, desc };
    }).filter(Boolean);
    return { name: cname, items: norm };
  });

  return out;
}

// ===== Drafts & selectors =====
export function saveDraft(menuData = state.menu) {
  try { localStorage.setItem(STORAGE_MENU, JSON.stringify(menuData)); alert('✅ Draft saved'); }
  catch (e) { console.error(e); alert('Save failed'); }
}
export function loadDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_MENU);
    if (!raw) return alert('No draft found');
    setMenu(normalizeMenu(parseJSONRelaxed(raw)));
    alert('📂 Draft loaded');
  } catch (e) { console.error(e); alert('Load failed'); }
}
export function clearDraft() { localStorage.removeItem(STORAGE_MENU); alert('🗑️ Draft cleared'); }

export function setTheme(name)   { state.theme    = getSelectedTheme(name);   localStorage.setItem(STORAGE_THEME, state.theme);   applyTheme(state.theme); render(); }
export function setTemplate(name){ state.template = getSelectedTemplate(name); localStorage.setItem(STORAGE_TPL,   state.template); render(); }

// ===== Init (wire UI) =====
export function initApp() {
  // expose for sidebar buttons
  Object.assign(window, { saveDraft, loadDraft, clearDraft });

  const $ = (id) => document.getElementById(id);

  // Business inputs
  const fName  = $('bizName');
  const fAddr  = $('bizAddress');
  const fPhone = $('bizPhone');
  const fWa    = $('bizWhatsApp');
  const fMaps  = $('bizMaps');

  function pushBizToState() {
    if (!state.menu) state.menu = {};
    if (fName)  state.menu.name     = fName.value.trim();
    if (fAddr)  state.menu.address  = fAddr.value.trim();
    if (fPhone) state.menu.phone    = fPhone.value.trim();
    if (fWa)    state.menu.whatsapp = (fWa.value || '').replace(/\D/g,'');
    if (fMaps)  state.menu.maps     = fMaps.value.trim();
    render();
  }
  [fName,fAddr,fPhone,fWa,fMaps].forEach(el => el && el.addEventListener('blur', pushBizToState));

  // File loader
  const file = $('file');
  if (file) {
    file.addEventListener('change', async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      try {
        const txt  = await f.text();
        const json = parseJSONRelaxed(txt);
        setMenu(normalizeMenu(json));
        alert('menu.json loaded');
      } catch (err) {
        console.error('Upload parse error:', err);
        alert('Invalid JSON file');
      }
    });
  }

  // Buttons
  const btnSample = $('btnLoadSample');          if (btnSample) btnSample.onclick = () => setMenu(SAMPLE);
  const btnTpl    = $('btnDownloadTemplate');    if (btnTpl) btnTpl.onclick = () => {
    const blob = new Blob([JSON.stringify(SAMPLE, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'menu-template.json'; a.click(); URL.revokeObjectURL(a.href);
  };

  const selTheme = $('themeSelect'); if (selTheme) { selTheme.value = state.theme;    selTheme.onchange = (e)=>setTheme(e.target.value); }
  const selTpl   = $('templateSelect'); if (selTpl) { selTpl.value   = state.template; selTpl.onchange   = (e)=>setTemplate(e.target.value); }

  const btnExportViewer = $('btnExportViewer');  if (btnExportViewer) btnExportViewer.onclick = () => exportViewerEmbedded();
  const btnPrint        = $('btnPrint');         if (btnPrint)        btnPrint.onclick        = () => window.print();
  const btnQR           = $('btnQR');            if (btnQR)           btnQR.onclick           = () => generateQR();

  const btnMap   = $('btnViewMap'); if (btnMap) btnMap.onclick = () =>
    state.menu?.maps ? window.open(state.menu.maps, '_blank') : alert('No maps link');

  const btnShare = $('btnShareLoc'); if (btnShare) btnShare.onclick = async () => {
    const url = state.menu?.maps || '';
    const shareData = { title: state.menu?.name || 'Menu', text: (state.menu?.address || '') + '\n' + (state.menu?.phone || ''), url };
    if (navigator.share) { try { await navigator.share(shareData); } catch {} }
    else { await navigator.clipboard.writeText(url); alert('Link copied'); }
  };

  const btnWa = $('btnWhatsApp'); if (btnWa) btnWa.onclick = () => {
    const n = (state.menu?.whatsapp || '').replace(/\D/g,'');
    if (!n) return alert('No WhatsApp number');
    const msg = encodeURIComponent(`${state.menu?.name || 'Restaurant'} - Requesting today menu/prices`);
    window.open(`https://wa.me/${n}?text=${msg}`, '_blank');
  };

  // Boot: draft → sample
  const saved = loadDraftSilent();
  if (saved) setMenu(saved); else setMenu(SAMPLE);
}

// ===== Internals =====
function setMenu(menu) {
  const merged = normalizeMenu(menu || {});
  state.menu = { ...merged };

  // remember/validate selections
  state.template = getSelectedTemplate(state.menu.template || state.template);
  state.theme    = getSelectedTheme(state.menu.theme || state.theme);

  // expose & apply theme, then render
  window.currentMenu = state.menu;
  applyTheme(state.theme);
  render();

  // sync sidebar fields from state
  const $ = (id) => document.getElementById(id);
  const fName  = $('bizName'), fAddr = $('bizAddress'), fPhone = $('bizPhone'), fWa = $('bizWhatsApp'), fMaps = $('bizMaps');
  if (fName)  fName.value  = state.menu.name || '';
  if (fAddr)  fAddr.value  = state.menu.address || '';
  if (fPhone) fPhone.value = state.menu.phone || '';
  if (fWa)    fWa.value    = state.menu.whatsapp || '';
  if (fMaps)  fMaps.value  = state.menu.maps || '';
}

function render() {
  const mount =
    document.getElementById('preview') ||
    document.getElementById('app')     ||
    document.getElementById('mount');

  if (!mount) { console.warn('No mount element (#preview/#app/#mount) found'); return; }

  renderTemplate(state.template, state.menu)
    .then(html => { mount.innerHTML = html; })
    .catch(err => {
      console.error('Render error:', err);
      mount.innerHTML =
        `<div style="padding:12px;border:1px solid #ef4444;color:#ef4444;border-radius:8px;background:#1b1111">
           Failed to render template. Check console for details.
         </div>`;
    });
}

function loadDraftSilent() {
  try {
    const raw = localStorage.getItem(STORAGE_MENU);
    return raw ? normalizeMenu(parseJSONRelaxed(raw)) : null;
  } catch { return null; }
}

// ===== Export a standalone viewer.html (single file) =====
export async function exportViewerEmbedded() {
  if (!state.menu) return alert('Load a menu first');

  const rendered = await renderTemplate(state.template, state.menu);

  // collect current CSS custom properties safely (no nested backticks)
  const root = getComputedStyle(document.documentElement);
  const keys = ['bg','ink','muted','brand','accent'];
  const cssVars = keys.map(k => `--${k}: ${root.getPropertyValue('--' + k).trim()};`).join('');

  const title = escapeHtml(state.menu?.name || 'Menu');
  const addr  = escapeHtml(state.menu?.address || '');
  const phone = state.menu?.phone ? ' · ' + escapeHtml(state.menu.phone) : '';

  const shell =
`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title}</title>
<style>
  :root{ ${cssVars} }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;padding:16px}
  a{color:var(--accent)}
  .wrap{max-width:1100px;margin:0 auto}
  header.viewer-hdr{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px}
  header.viewer-hdr h1{margin:0;font-size:22px}
  header.viewer-hdr .muted{color:#9aa3ad;font-size:14px}
  .card{background:#151a21;border:1px solid #232b36;border-radius:12px;padding:12px}
</style>
</head>
<body>
  <div class="wrap">
    <header class="viewer-hdr">
      <h1>${title}</h1>
      <div class="muted">${addr}${phone}</div>
    </header>
    <div class="card" id="menu">${rendered}</div>
    <p class="muted" style="margin-top:12px">Offline viewer • generated by Menu Engine.</p>
  </div>
</body>
</html>`;

  const blob = new Blob([shell], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'viewer.html';
  a.click();
  URL.revokeObjectURL(a.href);
  alert('📄 viewer.html (single-file) exported');
}

// ===== QR (optional; safe if lib missing) =====
export function generateQR() {
  let text = '';
  const slugInput = document.getElementById('slugInput');
  const domainInput = document.getElementById('domainInput');

  if (slugInput?.value && domainInput?.value) {
    text = `${domainInput.value.replace(/\/$/,'')}/${slugInput.value}/index.html`;
  } else {
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(state.menu || {}))));
    text = `${location.origin}${location.pathname}?data=${b64}`;
  }

  if (!window.QRCode) { alert('QR library not loaded (add ../libs/qrcode.min.js).'); return; }

  const holder = document.getElementById('qrHolder') || document.body;
  holder.innerHTML = '';
  const div = document.createElement('div'); holder.appendChild(div);
  // eslint-disable-next-line no-undef
  new QRCode(div, { text, width: 256, height: 256, correctLevel: QRCode.CorrectLevel.M });
  setTimeout(() => {
    const img = div.querySelector('img');
    const link = document.createElement('a');
    link.download = 'menu-qr.png';
    link.href = img ? img.src : div.querySelector('canvas')?.toDataURL('image/png') || '';
    if (link.href) link.click();
  }, 300);
}

// ===== utils =====
function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, s => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[s]));
}
