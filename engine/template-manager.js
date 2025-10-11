// engine/template-manager.js
import { REGISTRY, getSelectedTemplate } from './registry.js';

const cache = new Map();

export async function renderTemplate(templateName, menu) {
  const key = getSelectedTemplate(templateName);
  const modPath = REGISTRY.templates[key].path;
  try {
    let mod = cache.get(modPath);
    if (!mod) { mod = await import(modPath); cache.set(modPath, mod); }
    if (typeof mod.render !== 'function') return errorBox(`Template "${key}" missing render()`);
    return mod.render(menu);
  } catch (err) {
    console.error('Template load error:', err);
    return errorBox(`Failed to load "${key}" from ${modPath}. Check paths & run via Live Server.`);
  }
}

function errorBox(msg) {
  return `<div style="padding:12px;border:1px solid #ef4444;color:#ef4444;border-radius:8px;background:#1b1111">${msg}</div>`;
}
