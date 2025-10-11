// engine/registry.js
export const REGISTRY = {
  defaults: { template: 'template-two-col', theme: 'classic' },
  templates: {
    'template-two-col': { path: '../templates/template-two-col.js' },
    'template-grid':    { path: '../templates/template-grid.js' }
  },
  themes: {
    classic: '../themes/classic.json',
    neon:    '../themes/neon.json'
  },
  ctas: ['whatsapp','maps','share','qr']
};

export function getSelectedTemplate(name) {
  return name && REGISTRY.templates[name] ? name : REGISTRY.defaults.template;
}
export function getSelectedTheme(name) {
  return name && REGISTRY.themes[name] ? name : REGISTRY.defaults.theme;
}
