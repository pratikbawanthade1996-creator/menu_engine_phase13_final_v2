// src/js/ui-handlers.js
// Central delegated click handlers and helper functions for Menu Engine dashboards & viewer.
// Safe to include via a <script src="/src/js/ui-handlers.js"></script> in your HTML (owner dashboard + viewer).

function getEl(selector) { try { return document.querySelector(selector); } catch (e) { return null; } }

function safeCall(fn, ...args) {
  try {
    if (typeof fn === 'function') return fn(...args);
  } catch (err) {
    console.error('Safe call error', err);
  }
}

/* Basic actions implementations - adapt these if your project uses module system */
function saveDraft() {
  safeCall(() => {
    const data = window.currentMenuData || {};
    // Example: save into localStorage (or call your API)
    localStorage.setItem('menu_draft', JSON.stringify(data));
    alert('Draft saved locally');
  });
}

function loadDraft() {
  safeCall(() => {
    const raw = localStorage.getItem('menu_draft');
    if (!raw) return alert('No draft found');
    const data = JSON.parse(raw);
    // Hook: replace this with your app state hydration
    window.currentMenuData = data;
    // If you have a render function, call it
    if (typeof window.renderPreview === 'function') window.renderPreview(data);
    alert('Draft loaded');
  });
}

function clearDraft() {
  localStorage.removeItem('menu_draft');
  alert('Draft cleared');
  if (typeof window.renderPreview === 'function') window.renderPreview(null);
}

function getInlineStylesForExport() {
  // Keep minimal fallback styles; you may extend this to inline actual CSS from your project
  return `body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:12px} .item-card{margin:8px 0;padding:8px;border-bottom:1px solid #eee}`;
}

function exportViewerHtml() {
  const previewEl = document.querySelector('#viewer-preview') || document.querySelector('.viewer-root');
  if (!previewEl) { alert('Preview missing'); return; }

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${document.title || 'Menu'}</title><style>${getInlineStylesForExport()}</style></head><body>${previewEl.innerHTML}</body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(document.querySelector('.business-name')?.textContent||'menu')}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function slugify(text) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function generateQR() {
  const name = (document.querySelector('#business-name')?.value || document.querySelector('.business-name')?.textContent || 'menu');
  const slug = slugify(name);
  const host = (window.CONFIG && window.CONFIG.host) ? window.CONFIG.host : 'https://menu.clientfirst.digital';
  const fullUrl = `${host}/${slug}`;
  const qrEl = document.querySelector('#qr-canvas') || document.querySelector('#qr');
  if (!qrEl) return console.error('QR element not found');
  try {
    qrEl.innerHTML = '';
    if (window.QRCode) {
      new window.QRCode(qrEl, { text: fullUrl, width: 200, height: 200 });
    } else if (window.qrcode) {
      // some libs expose qrcode API
      window.qrcode.toCanvas && window.qrcode.toCanvas(qrEl, fullUrl);
    } else {
      // fallback: show url text
      qrEl.textContent = fullUrl;
    }
    const urlEl = document.querySelector('#generated-url');
    if (urlEl) urlEl.textContent = fullUrl;
  } catch (err) { console.error('QR generation failed', err); }
}

function openWhatsApp(phone, text = '') {
  if (!phone) return alert('Phone number missing');
  const cleaned = phone.toString().replace(/[^\d+]/g, '');
  const encoded = encodeURIComponent(text || `Hi, I'm checking the menu for ${document.querySelector('.business-name')?.textContent || ''}`);
  const url = `https://wa.me/${cleaned}?text=${encoded}`;
  window.open(url, '_blank');
}

function openMap() {
  const addr = document.querySelector('#business-address')?.textContent || document.querySelector('#business-address-input')?.value;
  if (!addr) return alert('Address missing');
  const q = encodeURIComponent(addr);
  const url = `https://www.google.com/maps/search/?api=1&query=${q}`;
  window.open(url, '_blank');
}

function applyPlanFeatures(plan) {
  document.querySelectorAll('[data-feature]').forEach(el => {
    const feature = el.dataset.feature;
    const allowed = {
      basic: ['qr','basic-menu'],
      standard: ['qr','whatsapp','map','reviews'],
      premium: ['qr','whatsapp','map','reviews','banner','themes']
    }[plan] || [];
    if (allowed.includes(feature)) el.style.display = '';
    else el.style.display = 'none';
  });
}

// attach to window for usage anywhere
window.MenuEngine = window.MenuEngine || {};
window.MenuEngine.utils = {
  saveDraft, loadDraft, clearDraft, exportViewerHtml, generateQR,
  openWhatsApp, openMap, applyPlanFeatures, slugify
};

// Delegated click handler based on data-action
document.addEventListener('click', function (e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  e.preventDefault();

  const action = btn.dataset.action;
  const phone = btn.dataset.phone || btn.getAttribute('data-phone');
  switch (action) {
    case 'save-draft':
      saveDraft(); break;
    case 'load-draft':
      loadDraft(); break;
    case 'clear-draft':
      clearDraft(); break;
    case 'generate-qr':
      generateQR(); break;
    case 'export-viewer':
      exportViewerHtml(); break;
    case 'print-viewer':
      window.print(); break;
    case 'view-map':
      openMap(); break;
    case 'share-whatsapp':
      openWhatsApp(phone, btn.dataset.text || ''); break;
    default:
      console.warn('No handler for action', action);
  }

});

/*
  applyPlanFeatures(plan)
  - Non-destructive: does not remove elements or classes; only toggles visibility/important inline display.
  - Expects elements to use data-feature="<feature>" attributes.
  - Known features: whatsapp, map, call, qr, export, banner, gallery, reviews, themes
*/
(function(){
  // Helper: safe query all features
  function allFeatureEls(feature){
    return Array.from(document.querySelectorAll('[data-feature="'+feature+'"]'));
  }

  // Helper: force hide element (non-destructive)
  function forceHide(el){
    try{
      // remove any visible-by-agent marker if present
      el.classList.remove('visible-by-agent');
    }catch(e){}
    try{ el.style.setProperty('display','none','important'); }catch(e){ el.style.display='none'; }
  }

  // Helper: force show element (non-destructive)
  function forceShow(el){
    try{
      // remove known hide classes safely
      ['hidden','hidden-by-agent','section--hidden','muted','ghost','hide','is-hidden'].forEach(c=>{
        try{ if(el.classList && el.classList.contains(c)) el.classList.remove(c); }catch(e){}
      });
    }catch(e){}
    try{ el.style.removeProperty('display'); }catch(e){}
    // Ensure visible via important if necessary
    try{ el.style.setProperty('display', (el.tagName.toLowerCase() === 'button' ? 'inline-block' : (el.tagName.toLowerCase()==='section'?'block':'')) || 'block','important'); }catch(e){}
    // mark as shown by agent (for diagnostics)
    try{ el.classList.add('visible-by-agent'); }catch(e){}
  }

  // Main exported function
  window.applyPlanFeatures = window.applyPlanFeatures || function(plan){
    try{
      var allowed = {
        basic:   ['call','qr','export'],
        standard:['call','qr','export','whatsapp','map'],
        premium: ['call','qr','export','whatsapp','map','banner','gallery','reviews','themes']
      };
      var allKnown = ['whatsapp','map','call','qr','export','banner','gallery','reviews','themes'];
      var allow = allowed[plan] || allowed.basic;

      // For each known feature, show or hide elements
      allKnown.forEach(function(feature){
        var els = allFeatureEls(feature);
        if(!els || !els.length) return;
        var shouldShow = allow.indexOf(feature) !== -1;
        els.forEach(function(el){
          if(shouldShow) forceShow(el); else forceHide(el);
        });
      });

      // Update plan switcher UI: add active class on selected plan
      try{
        var planBtns = Array.from(document.querySelectorAll('[data-action="plan-switch"], .plan-switch, .plan-btn, [data-plan]'));
        planBtns.forEach(function(b){
          // standardize detection: any element with data-plan attribute or text
          var attr = b.getAttribute && b.getAttribute('data-plan');
          if(attr && attr === plan) b.classList.add('active');
          else b.classList.remove('active');
        });
        // also look for explicit ids like #planBasic etc
        Array.from(document.querySelectorAll('.plan, .plan-btn, .plan-switcher button, [data-plan-toggle]')).forEach(function(b){
          try{
            if((b.getAttribute && b.getAttribute('data-plan') === plan) || (b.textContent || '').toLowerCase().indexOf(plan) !== -1) b.classList.add('active');
            else b.classList.remove('active');
          }catch(e){}
        });
      }catch(e){ console.warn('plan UI update error',e); }

      // Trigger viewer render if available
      try{
        if(typeof window.render === 'function') { window.render(); }
        if(typeof window.buildItemsTable === 'function') { try{ window.buildItemsTable(); }catch(e){} }
        if(typeof window.MenuEngine === 'object' && typeof window.MenuEngine.render === 'function') { window.MenuEngine.render(); }
      }catch(e){ console.warn('render trigger failed',e); }

      return true;
    }catch(err){
      console.error('applyPlanFeatures ERROR',err);
      return false;
    }
  };
})();
