/* templates/template-two-col.js */
export function render(menu = { name:'Menu', categories:[] }) {
  const head = `
    <header class="hdr">
      <h2>${menu.name || 'Menu'}</h2>
      <div class="muted">${menu.address||''} ${menu.phone?'· '+menu.phone:''}</div>
    </header>`;
  const css = `
    <style>
      :root{ --muted:#9aa3ad }
      .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px}
      h2{margin:0}
      .muted{color:var(--muted)}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
      .cat h3{margin:8px 0 6px;text-transform:uppercase;letter-spacing:.4px}
      .item{display:flex;justify-content:space-between;border-bottom:1px dashed #2a3240;padding:6px 0}
      .p{margin-left:12px;white-space:nowrap}
    </style>`;
  const [left,right] = split(menu.categories||[]);
  const col = (cats)=>`
    <div>
      ${cats.map(cat=>`
        <section class="cat">
          <h3>${cat.name||''}</h3>
          ${(cat.items||[]).map(it=>`
            <div class="item">
              <span>${it.name||''}${it.desc?` <small class="muted">– ${it.desc}</small>`:''}</span>
              <span class="p">${it.price!=null && it.price!==''?`₹ ${it.price}`:''}</span>
            </div>`).join('')}
        </section>`).join('')}
    </div>`;
  return `${css}${head}<div class="grid">${col(left)}${col(right)}</div>`;
}
function split(arr){ const m = Math.ceil((arr.length||0)/2); return [arr.slice(0,m), arr.slice(m)]; }
