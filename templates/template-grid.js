/* templates/template-grid.js */
export function render(menu = { name:'Menu', categories:[] }) {
  const css = `
    <style>
      :root{ --muted:#9aa3ad }
      .hdr{text-align:center;margin-bottom:12px}
      h2{margin:0}
      .muted{color:var(--muted)}
      .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
      .card{border:1px dashed #2a3240;border-radius:12px;padding:10px}
      .card h3{margin:0 0 6px;text-transform:uppercase;letter-spacing:.4px}
      .row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dotted #2a3240}
      .row:last-child{border-bottom:0}
    </style>`;
  const head = `<header class="hdr"><h2>${menu.name||'Menu'}</h2>
    <div class="muted">${menu.address||''} ${menu.phone?'· '+menu.phone:''}</div></header>`;
  const cards = (menu.categories||[]).map(c=>`
    <div class="card">
      <h3>${c.name||''}</h3>
      ${(c.items||[]).map(it=>`
        <div class="row">
          <span>${it.name||''}${it.desc?` <small class="muted">– ${it.desc}</small>`:''}</span>
          <span>${it.price!=null && it.price!==''?`₹ ${it.price}`:''}</span>
        </div>`).join('')}
    </div>`).join('');
  return `${css}${head}<div class="grid">${cards}</div>`;
}
