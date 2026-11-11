// Desenho à mão da ilustração do hero.
//
// As linhas centrais de cada traço foram extraídas da própria ilustração
// (public/art/tracos-casa-rio.json). Uma "pena" percorre esses caminhos, um a um,
// pintando uma máscara; a ilustração original aparece por baixo só onde a pena passou.
//
// Formato do JSON: { w, h, stages: [contornos, detalhes] }, cada traço = [zona, x0, y0, x1, y1, ...]
// Zonas: 0 chão · 1 casa · 2 coqueiros · 3 vegetação · 4 nuvens · 5 água

// Quanto tempo (ms) a pena passa em cada parte do desenho, na ordem em que um desenhista faria.
const ZONE_TIME = { 0: 500, 1: 2300, 2: 2100, 3: 900, 4: 900, 5: 1400 }; // ~8 s no total
const DETAIL_TIME = 2600; // hachuras e linhas finas, começam antes dos contornos terminarem
const OUTLINE_WIDTH = 5; // espessura da máscara, em pixels da ilustração original
const DETAIL_WIDTH = 4;

const easeInOut = (x) => 0.5 - Math.cos(Math.PI * x) / 2;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/* Converte os traços brutos em objetos com comprimento e tempo de início/duração. */
function prepare(raw, budgetFor) {
  const strokes = raw.map(([zone, ...p]) => {
    const pts = [];
    for (let i = 0; i < p.length; i += 2) pts.push([p[i], p[i + 1]]);
    const cum = [0];
    for (let i = 1; i < pts.length; i++)
      cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { zone, pts, cum, len: cum[cum.length - 1] || 1 };
  });

  // agrupa traços consecutivos da mesma zona e distribui o tempo da zona entre eles
  let t = 0;
  let i = 0;
  while (i < strokes.length) {
    let j = i;
    while (j < strokes.length && strokes[j].zone === strokes[i].zone) j++;
    const group = strokes.slice(i, j);
    const budget = budgetFor(strokes[i].zone, group.length);
    // pequenas pausas de "levantar a pena" quando ela salta para longe
    const pauses = group.map((s, k) => {
      if (!k) return 0;
      const a = group[k - 1].pts.at(-1);
      const b = s.pts[0];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      return d < 14 ? 0 : Math.min(40, d / 6);
    });
    const pauseTotal = pauses.reduce((x, y) => x + y, 0);
    const pauseBudget = Math.min(pauseTotal, budget * 0.2);
    const pauseScale = pauseTotal ? pauseBudget / pauseTotal : 0;
    const weights = group.map((s) => Math.max(s.len, 8));
    const wTotal = weights.reduce((x, y) => x + y, 0);
    group.forEach((s, k) => {
      t += pauses[k] * pauseScale;
      s.t0 = t;
      s.dur = (weights[k] / wTotal) * (budget - pauseBudget);
      t += s.dur;
    });
    i = j;
  }
  return { strokes, total: t };
}

function pointAt(s, dist) {
  const { pts, cum } = s;
  let i = 1;
  while (i < cum.length - 1 && cum[i] < dist) i++;
  const seg = cum[i] - cum[i - 1] || 1;
  const k = Math.min(1, Math.max(0, (dist - cum[i - 1]) / seg));
  return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k, i];
}

/* Uma "pena": percorre seus traços no tempo e pinta na máscara compartilhada. */
function makePen(maskCtx, strokes, lineWidth) {
  const done = new Float32Array(strokes.length);
  let first = 0;
  return {
    // t = ms desde o início desta pena. Devolve a posição atual da ponta (ou null).
    update(t) {
      let tip = null;
      maskCtx.lineWidth = lineWidth;
      for (let i = first; i < strokes.length; i++) {
        const s = strokes[i];
        if (s.t0 > t) break;
        const p = s.dur ? easeInOut(Math.min(1, (t - s.t0) / s.dur)) : 1;
        const target = p * s.len;
        if (target > done[i] + 0.01) {
          const [x0, y0, i0] = pointAt(s, done[i]);
          const [x1, y1, i1] = pointAt(s, target);
          maskCtx.beginPath();
          maskCtx.moveTo(x0, y0);
          for (let k = i0; k < i1; k++) maskCtx.lineTo(s.pts[k][0], s.pts[k][1]);
          maskCtx.lineTo(x1, y1);
          maskCtx.stroke();
          done[i] = target;
          tip = [x1, y1];
        }
        if (p >= 1 && i === first) first++;
      }
      return tip;
    },
    finished: () => first >= strokes.length,
  };
}

/**
 * Desenha a ilustração no canvas. Devolve { done: Promise, skip() }.
 * - speed: 1 = ritmo normal; < 1 acelera (ex.: 0.3 ao recarregar a página).
 * - nib: elemento opcional que segue a ponta da pena.
 */
export function startHandDrawing({ canvas, nib, imageSrc, strokesUrl, speed = 1 }) {
  let raf = 0;
  let resolveDone;
  let skipped = false;
  const done = new Promise((r) => (resolveDone = r));
  const finish = () => {
    cancelAnimationFrame(raf);
    if (nib) nib.style.opacity = '0';
    resolveDone();
  };

  (async () => {
    let image;
    let data;
    try {
      [image, data] = await Promise.all([
        loadImage(imageSrc),
        fetch(strokesUrl).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
      ]);
    } catch {
      return finish(); // sem dados: a ilustração simplesmente aparece
    }
    if (skipped) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    const ctx = canvas.getContext('2d');
    const mask = document.createElement('canvas');
    mask.width = canvas.width;
    mask.height = canvas.height;
    const m = mask.getContext('2d');
    m.setTransform(canvas.width / data.w, 0, 0, canvas.height / data.h, 0, 0);
    m.lineCap = 'round';
    m.lineJoin = 'round';
    m.strokeStyle = '#fff';

    const outline = prepare(data.stages[0], (zone) => (ZONE_TIME[zone] ?? 1500) * speed);
    const detail = prepare(data.stages[1] || [], () => 0);
    // os detalhes dividem o mesmo intervalo, proporcional ao comprimento
    const detailTime = DETAIL_TIME * speed;
    const detailLen = detail.strokes.reduce((x, s) => x + s.len, 0) || 1;
    let acc = 0;
    detail.strokes.forEach((s) => {
      s.t0 = (acc / detailLen) * detailTime;
      s.dur = (s.len / detailLen) * detailTime;
      acc += s.len;
    });
    const detailStart = Math.max(0, outline.total - detailTime * 0.85);
    const penA = makePen(m, outline.strokes, OUTLINE_WIDTH);
    const penB = makePen(m, detail.strokes, DETAIL_WIDTH);
    const sx = rect.width / data.w;
    const sy = rect.height / data.h;

    const t0 = performance.now();
    function frame(now) {
      const t = now - t0;
      const tip = penA.update(t);
      if (t >= detailStart) penB.update(t - detailStart);
      ctx.globalCompositeOperation = 'copy';
      ctx.drawImage(mask, 0, 0);
      ctx.globalCompositeOperation = 'source-in';
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';
      if (nib) {
        if (tip) {
          nib.style.opacity = '1';
          nib.style.transform = `translate(${(tip[0] * sx).toFixed(1)}px, ${(tip[1] * sy).toFixed(1)}px)`;
        } else if (penA.finished()) nib.style.opacity = '0';
      }
      if (penA.finished() && penB.finished()) return finish();
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
  })();

  return {
    done,
    skip() {
      skipped = true;
      finish();
    },
  };
}
