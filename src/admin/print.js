// Impressão: mapa das mesas (para o cerimonial) e placas com nome e mesa.
// Abre uma página própria, no visual do site, pronta para imprimir ou salvar em PDF.
import { SIDES, tablesFor, tableTitle, seatKey } from './seating.js';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const BASE_CSS = `
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'DM Sans', sans-serif; color: #0b1f49; background: #fff;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  h1, h2, h3 { font-family: 'Italiana', serif; font-weight: 400; margin: 0; }
  .script { font-family: 'Cormorant Garamond', serif; font-style: italic; }
  .toolbar { position: sticky; top: 0; display: flex; gap: 10px; justify-content: center; padding: 12px;
             background: #0b1f49; }
  .toolbar button { padding: 10px 18px; border: 0; border-radius: 30px; background: #d4bb97; color: #0b1f49;
                    font: 600 13px 'DM Sans', sans-serif; cursor: pointer; }
  @media print { .toolbar { display: none; } }
`;
const FONTS =
  '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,400;1,500&family=DM+Sans:wght@400;500;600&family=Italiana&display=swap" rel="stylesheet">';

function openPrint(title, css, body) {
  const w = window.open('', '_blank');
  if (!w) {
    window.alert('O navegador bloqueou a janela de impressão. Permita pop-ups para este site e tente de novo.');
    return;
  }
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(title)}</title>${FONTS}
    <style>${BASE_CSS}${css}</style></head><body>
    <div class="toolbar"><button onclick="window.print()">Imprimir / salvar em PDF</button></div>${body}
    <script>document.fonts && document.fonts.ready.then(function(){ setTimeout(function(){ window.print(); }, 300); });<\/script>
    </body></html>`);
  w.document.close();
}

/** Mapa das mesas: uma página por lado, com cada mesa e a lista numerada. */
export function printSeatingMap(guests, config) {
  const map = new Map(guests.filter((g) => g.assento).map((g) => [seatKey(g.assento), g]));
  const pages = SIDES.map((lado) => {
    const tables = tablesFor(config, lado);
    const used = guests.filter((g) => g.assento?.lado === lado).length;
    const cap = tables.reduce((n, t) => n + t.cadeiras, 0);
    const cards = tables
      .map((t) => {
        const rows = Array.from({ length: t.cadeiras }, (_, i) => {
          const g = map.get(seatKey({ lado, mesa: t.mesa, cadeira: i + 1 }));
          const kid = g?.tags.includes('crianca') ? ' <span class="kid">criança</span>' : '';
          return `<li class="${g ? '' : 'free'}"><b>${i + 1}</b> ${g ? esc(g.nome) + kid : 'livre'}</li>`;
        }).join('');
        const n = Array.from({ length: t.cadeiras }, (_, i) => map.get(seatKey({ lado, mesa: t.mesa, cadeira: i + 1 }))).filter(Boolean).length;
        return `<article><header><h3>${esc(tableTitle(t))}</h3><small>${t.nome ? `Mesa ${t.mesa} · ` : ''}${n}/${t.cadeiras}</small></header><ol>${rows}</ol></article>`;
      })
      .join('');
    return `<section class="page"><div class="head"><p class="eyebrow">Stefania &amp; Henrique · 22.08.2027</p>
      <h1>Lado ${lado}</h1><p class="sub">${used} de ${cap} lugares</p></div><div class="grid">${cards}</div></section>`;
  }).join('');
  openPrint(
    'Mapa das mesas',
    `.page { padding: 8mm 0; page-break-after: always; }
     .page:last-child { page-break-after: auto; }
     .head { text-align: center; margin-bottom: 8mm; }
     .eyebrow { margin: 0; font-size: 9pt; letter-spacing: .3em; text-transform: uppercase; color: #86663a; }
     .head h1 { font-size: 30pt; }
     .sub { margin: 2mm 0 0; color: #5e6878; font-size: 10pt; }
     .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 5mm; }
     article { padding: 4mm 5mm; border: 1px solid #c9c2b6; border-radius: 4mm; break-inside: avoid; }
     article header { display: flex; justify-content: space-between; align-items: baseline;
                      padding-bottom: 2mm; margin-bottom: 2mm; border-bottom: 1px dashed #d8d0c2; }
     article h3 { font-size: 15pt; }
     article small { color: #86663a; font-size: 9pt; }
     ol { list-style: none; margin: 0; padding: 0; columns: 1; font-size: 10pt; line-height: 1.55; }
     li b { display: inline-block; width: 5mm; color: #9aa1ad; font-weight: 500; }
     li.free { color: #b3b8c2; font-style: italic; }
     .kid { font-size: 7.5pt; color: #c97a3c; }`,
    pages,
  );
}

/** Placas (tag "Placa"): cartão dobrável com o nome e a mesa, 4 por folha A4. */
export function printPlates(guests, config) {
  const people = guests
    .filter((g) => g.tags.includes('placa'))
    .sort((a, b) => (a.assento ? 0 : 1) - (b.assento ? 0 : 1) || a.nome.localeCompare(b.nome, 'pt-BR'));
  const cards = people
    .map((g) => {
      const t = g.assento ? tablesFor(config, g.assento.lado)[g.assento.mesa - 1] : null;
      const where = t ? `${esc(tableTitle(t))} · Lado ${g.assento.lado}` : 'Lugar a definir';
      // a metade de cima repete o nome de cabeça para baixo: depois de dobrada, lê-se dos dois lados
      const face = `<img src="${location.origin}/logo.png" alt="">
        <p class="name script">${esc(g.nome)}</p>
        <p class="table">${where}</p>`;
      return `<div class="plate"><div class="front back">${face}</div><div class="front">${face}</div></div>`;
    })
    .join('');
  openPrint(
    'Placas',
    `.sheet { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; padding: 6mm 0; }
     .plate { height: 120mm; border: 1px dashed #c9c2b6; display: grid; grid-template-rows: 1fr 1fr; break-inside: avoid; }
     .plate .back { border-top: 1px dotted #d8d0c2; transform: rotate(180deg); } /* girada: a borda fica no meio */
     .front { display: grid; justify-items: center; align-content: center; gap: 2mm; padding: 4mm; text-align: center; }
     .front img { width: 22mm; }
     .name { margin: 0; font-size: 22pt; line-height: 1.1; }
     .table { margin: 0; font-size: 9pt; letter-spacing: .22em; text-transform: uppercase; color: #86663a; }
     .hint { text-align: center; color: #5e6878; font-size: 10pt; margin: 6mm 0 0; }
     @media print { .hint { display: none; } }`,
    `<p class="hint">Recorte nas linhas tracejadas e dobre ao meio na pontilhada.</p><div class="sheet">${cards}</div>`,
  );
}
