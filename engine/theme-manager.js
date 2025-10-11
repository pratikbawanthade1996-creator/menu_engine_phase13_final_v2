// engine/theme-manager.js
import { REGISTRY, getSelectedTheme } from './registry.js';

export async function applyTheme(name) {
  const key = getSelectedTheme(name);
  const url = REGISTRY.themes[key];
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return;
    const vars = await res.json();
    Object.entries(vars).forEach(([k, v]) => {
      document.documentElement.style.setProperty(`--${k}`, v);
    });
    document.body.dataset.theme = key;
  } catch (e) {
    console.error('Theme load failed:', e);
  }
}
