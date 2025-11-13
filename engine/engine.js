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
// safe DOM helper used by agent edits
function safeQueryAll(selector) {
  try { return Array.from(document.querySelectorAll(selector) || []); }
  catch (e) { return []; }
}

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
// ===== Phase-13 helpers (safe re-define) =====
window.slug = window.slug || function (s) {
  return String(s).toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

window.escapeHtml = window.escapeHtml || function (str) {
  return String(str).replace(/[&<>"']/g, m => (
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])
  ));
};

// ===== Export a standalone viewer.html (single file) — Phase 13: nav + search =====
export async function exportViewerEmbedded() {
  if (!state.menu) { alert('Load a menu first'); return; }

  const rendered = await renderTemplate(state.template, state.menu);

  // theme vars
  const root = getComputedStyle(document.documentElement);
  const keys = ['bg','ink','muted','brand','accent'];
  const cssVars = keys.map(k => `--${k}: ${root.getPropertyValue('--' + k).trim()};`).join('');

  // read business fields (JSON -> fallback sidebar)
  const getVal = (id) => (document.getElementById(id)?.value || '').trim();
  const title = escapeHtml(state.menu?.name || getVal('bizName') || 'Menu');
  const addr  = escapeHtml(state.menu?.address || getVal('bizAddress') || '');
  const phoneRaw = (state.menu?.phone || getVal('bizPhone') || '').trim();
  const phone = phoneRaw;
  const waDigits = (state.menu?.whatsapp || getVal('bizWhatsApp') || '').replace(/\D/g,'');
  const maps  = (state.menu?.maps || getVal('bizMaps') || '');

  const callHref = phoneRaw ? `tel:${phoneRaw.replace(/\s+/g,'')}` : '';
  const waHref   = waDigits ? `https://wa.me/${waDigits}?text=${encodeURIComponent(title + ' — Hi!')}` : '';
  const mapHref  = maps ? maps : '';

  // categories for nav (from data)
  const cats = Array.isArray(state.menu?.categories) ? state.menu.categories : [];
  const navHtml = cats.map(c => {
    const name = String(c?.name || '').trim();
    if (!name) return '';
    const id = slug(name);
    return `<button class="chip" data-target="sec-${id}">${escapeHtml(name)}</button>`;
  }).join('');

  const shell =
`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title}</title>
<style>
  :root{ ${cssVars} }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial}
  .wrap{max-width:1100px;margin:0 auto;padding:16px}
  /* Sticky header */
  header.viewer-hdr{position:sticky;top:0;background:linear-gradient(180deg, rgba(15,18,22,.96), rgba(15,18,22,.88));backdrop-filter: blur(4px);z-index:20;padding:10px 16px;border-bottom:1px solid #232b36}
  header.viewer-hdr h1{margin:0;font-size:20px}
  header.viewer-hdr .muted{color:#9aa3ad;font-size:13px;margin-top:4px}

  /* Top tools: search + category chips (sticky) */
  .tools{position:sticky; top:60px; z-index:15; background:rgba(15,18,22,.92); backdrop-filter: blur(4px); border-bottom:1px solid #232b36}
  .tools-inner{max-width:1100px;margin:0 auto;padding:10px 16px 8px}
  .search{width:100%; padding:10px 12px; border:1px solid #2a3240; background:#0f1216; color:var(--ink); border-radius:10px}
  .chips{display:flex; gap:8px; margin-top:8px; overflow:auto; padding-bottom:4px}
  .chip{border:1px solid #2a3240; background:#12171e; color:var(--ink); border-radius:999px; padding:8px 12px; cursor:pointer; white-space:nowrap}
  .chip:hover{border-color:#3b4657}

  /* Menu card */
  .card{background:#151a21;border:1px solid #232b36;border-radius:12px;padding:12px}
  .spacer{height:64px}

  /* Bottom CTA bar */
  .cta{position:fixed;left:8px;right:8px;bottom:8px;display:flex;gap:8px;justify-content:center;background:rgba(10,12,15,.85);backdrop-filter: blur(4px);border:1px solid #232b36;border-radius:14px;padding:10px;z-index:30}
  .btn{border:1px solid #2a3240;border-radius:14px;padding:10px 14px;text-decoration:none;color:var(--ink);font-weight:700}
  .btn.primary{background:var(--brand);color:#0b0b0b;border:0}

  /* Print */
  @media print{
    header.viewer-hdr,.tools,.cta,.spacer{display:none!important}
    body{background:#fff;color:#000}
    .card{border:0}
    .sec{break-inside:avoid}
    .wrap{padding:0}
  }
</style>
</head>
<body>
  <header class="viewer-hdr">
    <h1>${title}</h1>
    <div class="muted">${addr}${phone ? ' · ' + phone : ''}</div>
  </header>

  <div class="tools">
    <div class="tools-inner">
      <input id="q" class="search" placeholder="Search dishes… (e.g., paneer, shake)" />
      <div class="chips">${navHtml}</div>
    </div>
  </div>

  <div class="wrap">
    <div class="card" id="menu">${rendered}</div>
    <div class="spacer"></div>
  </div>

  <div class="cta">
    ${callHref ? `<a class="btn" href="${callHref}">📞 Call</a>` : ''}
    ${waHref   ? `<a class="btn primary" href="${waHref}" target="_blank">💬 WhatsApp</a>` : ''}
    ${mapHref  ? `<a class="btn" href="${mapHref}" target="_blank">📍 Map</a>` : ''}
  </div>

  <script>
  // Work inside the rendered card only
  const container = document.getElementById('menu');

  // -------- Category chips: robust scroll ----------
  document.querySelectorAll('.chip').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      const targetId = chip.getAttribute('data-target');     // e.g. sec-paneer-e-azam
      const targetName = chip.textContent.trim().toLowerCase();

      // 1) Try exact id first
      let el = container.querySelector('#'+CSS.escape(targetId));

      // 2) Try any element whose id starts with sec- and whose text matches
      if (!el) {
        const secs = container.querySelectorAll('[id^="sec-"]');
        for (const s of secs) {
          const txt = (s.querySelector('h1,h2,h3,h4')?.textContent || s.textContent || '').trim().toLowerCase();
          if (txt.includes(targetName)) { el = s; break; }
        }
      }

      // 3) Fallback: search headings by text
      if (!el) {
        const heads = container.querySelectorAll('h1,h2,h3,h4');
        for (const h of heads) {
          if ((h.textContent || '').trim().toLowerCase().includes(targetName)) {
            el = h.closest('section') || h;
            break;
          }
        }
      }

      if (el) el.scrollIntoView({behavior:'smooth', block:'start'});
    });
  });

  // -------- Search: robust selectors ----------
  const q = document.getElementById('q');

  // Helper: find all "items" with many possible class names
  function getItems() {
    // Try common patterns used across our templates
    let list = container.querySelectorAll(
      '.item, .mi, .menu-item, li.menu-item, li.item, .dish, .row'
    );
    // If nothing found, fall back to any element that has a price on the right
    if (!list.length) list = container.querySelectorAll('[data-item], .menu__item, .menuItem');
    return Array.from(list);
  }

  // Helper: extract name node from an item
  function getItemNameText(item) {
    const nameEl =
      item.querySelector('.t, .mi-name, .name, .title, .item-name, strong, b, h4, h3, .dish-name') || item;
    return (nameEl.textContent || '').trim().toLowerCase();
  }

  const items = getItems();

  q && q.addEventListener('input', ()=>{
    const needle = q.value.trim().toLowerCase();
    items.forEach(it=>{
      const match = !needle || getItemNameText(it).includes(needle);
      // Show/hide the whole row; try parent if needed
      const row = it.matches('section, .item, .mi, li, .menu-item, .row') ? it : (it.closest('.item, .mi, li, .menu-item, .row') || it);
      row.style.display = match ? '' : 'none';
    });
  });
</script>

</body>
</html>`;

  const blob = new Blob([shell], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'viewer.html';
  a.click();
  URL.revokeObjectURL(a.href);
  alert('📄 viewer.html (Phase 13: nav + search) exported');
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
// ===============================
// PHASE 14 FEATURE: Plan Detection Logic
// ===============================

document.addEventListener("DOMContentLoaded", function() {
  // Get plan from URL (e.g., ?plan=premium)
  const urlParams = new URLSearchParams(window.location.search);
  const plan = urlParams.get("plan") || "basic";
  console.log("Detected plan:", plan);

  // Load corresponding client JSON file
  fetch(`../clients/${plan}/client.json`)
    .then(response => response.json())
    .then(data => {
      console.log("Loaded client data:", data);
      // 👇 Apply loaded client configuration to UI
applyClientToUI(client);


      // Hide all optional features first (safe)
      safeQueryAll("[data-feature]").forEach(el => { try { el.classList.add("hidden"); } catch (e) {} });

      // Show only the features defined in client.json
      if (data.features) {
        data.features.forEach(feature => {
          const el = document.querySelector(`[data-feature="${feature.toLowerCase()}"]`);
          if (el) try { el.classList.remove("hidden"); } catch (e) {}
        });
      }
    })
    .catch(err => console.error("Error loading plan data:", err));
});
// ------- Phase 14: Plan Detection & Feature Toggle -------

// 1) URL se plan pick:  ?plan=basic | standard | premium
function getQueryParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}
function getPlan() {
  const p = (getQueryParam("plan") || "basic").toLowerCase();
  if (["basic","standard","premium"].includes(p)) return p;
  return "basic";
}

// 2) Client config load (from clients/<plan>/client.json)
async function loadClientConfig(plan) {
  const base = location.pathname.includes('/engine/') ? '../' : './';
  const url = `${base}clients/${plan}/client.json`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`client.json not found for plan: ${plan}`);
  return res.json();
}


// 3) Features map per plan (fallback safety) — richer config with gallery limits & flags
const PLAN_FEATURES = {
  basic: {
    features: new Set(["qr"]),
    galleryLimit: 0,
    showImages: false,
    theme: "default"
  },
  standard: {
    features: new Set(["qr","whatsapp","call","map","reviews"]),
    galleryLimit: 10,
    showImages: true,
    theme: "standard"
  },
  premium: {
    features: new Set(["qr","whatsapp","call","map","reviews","banner","theme"]),
    galleryLimit: null, // unlimited represented as null
    showImages: true,
    theme: "premium"
  }
};

// Expose a small API to switch plans at runtime (affects feature visibility and theme attr).
function setActivePlan(planName) {
  const cfg = PLAN_FEATURES[planName];
  if (!cfg) { console.warn("Unknown plan:", planName); return; }
  // Toggle feature visibility based on the plan's feature set
  setFeatureVisibility(cfg.features);
  // Apply theme attribute for CSS-level switches (templates/themes may read this)
  try { document.documentElement.setAttribute("data-menu-theme", cfg.theme || "default"); } catch (e) {}
  try { localStorage.setItem("menu_active_plan", planName); } catch (e) {}
  // make current config available for debugging or templates
  window.currentPlanConfig = cfg;
}

// 4) UI helpers
function setFeatureVisibility(featuresSet) {
  safeQueryAll("[data-feature]").forEach(el => {
    try {
      const key = el.getAttribute("data-feature");
      el.classList.toggle("hidden", !featuresSet.has(key));
    } catch (e) { /* ignore bad nodes */ }
  });
}

// 5) Wire dynamic links/values
function applyClientBindings(cfg) {
  // WhatsApp
  const waBtn = document.getElementById("btnWhatsApp");
  if (waBtn && cfg.whatsapp) {
    waBtn.onclick = () => window.open(`https://wa.me/${cfg.whatsapp}`, "_blank");
  }
  // Call
  const callBtn = document.getElementById("btnCall");
  if (callBtn && cfg.phone) {
    callBtn.onclick = () => window.location.href = `tel:${cfg.phone}`;
  }
  // Map
  const mapA = document.getElementById("btnMap");
  if (mapA && cfg.mapLink) {
    mapA.href = cfg.mapLink;
  }
  // Reviews
  const revA = document.getElementById("btnReviews");
  if (revA && cfg.reviewsLink) {
    revA.href = cfg.reviewsLink;
  }
  // Theme options (Premium)
  const themeSel = document.getElementById("themeSelect");
  if (themeSel && Array.isArray(cfg.themes)) {
    themeSel.innerHTML = cfg.themes.map(t => `<option value="${t}">${t}</option>`).join("");
    themeSel.onchange = () => applyTheme(themeSel.value);
  }
}


// -------------------- Feature Visibility Helper --------------------
function setFeatureVisible(key, on) {
  const blocks = safeQueryAll(`[data-feature="${key}"]`);
  blocks.forEach(b => { try { b.style.display = on ? '' : 'none'; } catch (e) {} });
}

// -------------------- Business + Links Apply Helper --------------------
function normalizePhone(str = '') {
  return String(str).replace(/\D/g, '').replace(/^0+/, '');
}

function applyClientToUI(cfg) {
  // 0) Debug — dekh le kaunse features aa rahe
  const fset = new Set(cfg.features || []);
  console.log('PLAN:', cfg.plan, 'FEATURES:', Array.from(fset));

  // 1) Hide EVERYTHING first
  safeQueryAll('[data-feature]').forEach(el => { try { el.style.display = 'none'; } catch (e) {} });

  // 2) Show only allowed
    for (const key of fset) {
      safeQueryAll(`[data-feature="${key}"]`).forEach(el => { try { el.style.display = ''; } catch (e) {} });
    }

  // 3) (rest of your code stays same) — links, buttons, theme select…
  const waNum = normalizePhone(cfg.whatsapp);
  const callNum = normalizePhone(cfg.phone);
  const waLink  = waNum ? `https://wa.me/${waNum}?text=${encodeURIComponent('Hi '+(cfg.restaurant||''))}` : '#';
  const telLink = callNum ? `tel:${callNum}` : '#';
  const mapLink = cfg.mapLink     || '#';
  const revLink = cfg.reviewsLink || '#';

  const btnWA   = document.getElementById('btnWhatsApp');
  const btnCall = document.getElementById('btnCall');
  const aMap    = document.getElementById('btnMap');
  const aRev    = document.getElementById('btnReviews');

  if (btnWA)   btnWA.onclick  = () => { if (waLink  !== '#') window.open(waLink,  '_blank'); };
  if (btnCall) btnCall.onclick = () => { if (telLink !== '#') window.location.href = telLink; };
  if (aMap)    aMap.href = mapLink;
  if (aRev)    aRev.href = revLink;

  const themeSel = document.getElementById('themeSelect');
  if (themeSel) {
    const themes = Array.isArray(cfg.themes) ? cfg.themes : [];
    themeSel.innerHTML =
      themes.map(t => `<option value="${t}">${t}</option>`).join('') ||
      '<option value="Classic">Classic</option>';
    themeSel.onchange = () => applyTheme(themeSel.value);
    if (themes.length) applyTheme(themes[0]);
  }
}

// 7) Boot
async function initPlanSystem() {
  try {
    const plan = getPlan(); // 'basic' | 'standard' | 'premium'
    const cfg  = await loadClientConfig(plan);
    function setFeatureVisible(key, on) {
      safeQueryAll(`[data-feature="${key}"]`).forEach(b => { try { b.style.display = on ? '' : 'none'; } catch (e) {} });
    }


  // choose features from cfg.features OR fallback map (PLAN_FEATURES now has .features)
  const featuresSet = new Set(cfg.features && cfg.features.length ? cfg.features : Array.from(PLAN_FEATURES[plan].features));

    // Toggle visibility
    setFeatureVisibility(featuresSet);

    // Bind links/buttons
    applyClientBindings(cfg);

    // Premium banner example
    if (featuresSet.has("banner")) {
      const banner = document.getElementById("offerBanner");
      if (banner) banner.textContent = "Diwali Specials: Buy 1 Get 1 – Weekend!";
    }
  } catch (e) {
    console.error(e);
  }
}

// ensure this runs after DOM ready
document.addEventListener("DOMContentLoaded", initPlanSystem);
