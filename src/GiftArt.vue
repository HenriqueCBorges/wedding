<script setup>
// Ilustrações a traço dos presentes, no mesmo espírito da gravura do hero:
// tinta azul-marinho, hachuras finas e uma aguada azul-clara. Quando a ilustração
// entra na tela, cada traço é "desenhado" em sequência (stroke-dashoffset).
import { ref, onMounted, onUnmounted, useId } from 'vue';

const props = defineProps({
  name: { type: String, required: true },
  autoplay: { type: Boolean, default: false }, // desenha ao montar (ex.: no modal)
});

const root = ref(null);
const drawn = ref(false);
const uid = useId();
const penId = `pen-${uid}`;

/* ---------- Pequenos geradores de forma ---------- */
const f = (n) => +n.toFixed(2);
function star(cx, cy, R, r, n = 5, rot = -90) {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const a = ((rot + (i * 180) / n) * Math.PI) / 180;
    const rad = i % 2 ? r : R;
    d += `${i ? 'L' : 'M'}${f(cx + rad * Math.cos(a))} ${f(cy + rad * Math.sin(a))} `;
  }
  return d + 'Z';
}
const sparkle = (x, y, s = 3) => `M${x} ${y - s} V${y + s} M${x - s} ${y} H${x + s}`;
function cloud(x, y, s = 1) {
  return `M${x} ${y} a${8 * s} ${8 * s} 0 0 1 ${4 * s} ${-11 * s} a${10 * s} ${10 * s} 0 0 1 ${17 * s} ${-5 * s} a${9 * s} ${9 * s} 0 0 1 ${14 * s} ${6 * s} a${7 * s} ${7 * s} 0 0 1 ${5 * s} ${10 * s} Z`;
}
function waves(x, y, n, w = 12, h = 4) {
  let d = `M${x} ${y}`;
  for (let i = 0; i < n; i++) d += ` q${w / 2} ${-h} ${w} 0`;
  return d;
}
const circle = (cx, cy, r) => `M${f(cx - r)} ${cy} a${r} ${r} 0 1 0 ${f(2 * r)} 0 a${r} ${r} 0 1 0 ${f(-2 * r)} 0`;
function flower(cx, cy, r, n) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    d += circle(f(cx + Math.cos(a) * r * 0.72), f(cy + Math.sin(a) * r * 0.72), f(r * 0.48)) + ' ';
  }
  return d;
}
function rays(cx, cy, r1, r2, n, offset = 0) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = ((offset + (i * 360) / n) * Math.PI) / 180;
    d += `M${f(cx + Math.cos(a) * r1)} ${f(cy + Math.sin(a) * r1)} L${f(cx + Math.cos(a) * r2)} ${f(cy + Math.sin(a) * r2)} `;
  }
  return d;
}
function jar(x, w, h, base = 100) {
  const top = base - h;
  return `M${x + 3} ${top} h${w - 6} c3 2 3 5 3 8 v${h - 14} q0 6 -6 6 h${-(w - 12)} q-6 0 -6 -6 v${-(h - 14)} c0 -3 0 -6 3 -8 z`;
}
function jarSun(x, w, h, base = 100) {
  const top = base - h;
  const hy = top + h * 0.55;
  const cx = x + w / 2;
  const r = w * 0.22;
  return {
    horizon: `M${x + 4} ${hy} H${x + w - 4}`,
    sun: `M${f(cx - r)} ${hy} A${f(r)} ${f(r)} 0 0 1 ${f(cx + r)} ${hy}`,
    sunFill: `M${f(cx - r)} ${hy} A${f(r)} ${f(r)} 0 0 1 ${f(cx + r)} ${hy} Z`,
    rays: rays(cx, hy, r + 2.5, r + 5.5, 5, 200).trim(),
    sea: waves(x + 6, hy + 7, Math.floor((w - 12) / 6), 6, 2.2),
    lid: `M${x + 2} ${top - 6} h${w - 4} v6 h${-(w - 4)} z`,
  };
}
const jars = [
  { x: 24, w: 30, h: 52 },
  { x: 64, w: 32, h: 66 },
  { x: 106, w: 30, h: 48 },
].map((j) => ({ ...j, body: jar(j.x, j.w, j.h), ...jarSun(j.x, j.w, j.h) }));
function tower(x, top, w, base) {
  const s = w / 5;
  return `M${x} ${base} V${top} h${s} v-4 h${s} v4 h${s} v-4 h${s} v4 h${s} V${base}`;
}
function note(x, y) {
  return `M${x} ${y} v-14 l9 -3 v14 M${x} ${y} a3 2.2 0 1 1 -0.1 0 M${x + 9} ${y - 3} a3 2.2 0 1 1 -0.1 0`;
}
const clockTicks = rays(80, 62, 22.5, 26, 12, 0);

/* ---------- Animação de traço ---------- */
let observer;
function prepare() {
  const els = root.value?.querySelectorAll(
    '.ink path, .ink circle, .ink ellipse, .ink line, .ink rect, .ink polyline, .ink polygon',
  );
  els?.forEach((el, k) => {
    el.setAttribute('pathLength', '1');
    el.style.setProperty('--k', k);
  });
  root.value?.style.setProperty('--count', els?.length || 1);
}
onMounted(() => {
  prepare();
  if (props.autoplay || typeof IntersectionObserver === 'undefined') {
    requestAnimationFrame(() => (drawn.value = true));
    return;
  }
  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        drawn.value = true;
        observer.disconnect();
      }
    },
    { threshold: 0.35 },
  );
  observer.observe(root.value);
});
onUnmounted(() => observer?.disconnect());
</script>

<template>
  <svg ref="root" :class="['gift-art', { drawn }]" viewBox="0 0 160 110" aria-hidden="true" focusable="false">
    <defs>
      <!-- leve tremor de pena nas linhas -->
      <filter :id="penId" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" :seed="name.length" />
        <feDisplacementMap in="SourceGraphic" scale="1.6" />
      </filter>
    </defs>

    <g :filter="`url(#${penId})`">
      <!-- ============ Bate e volta na Lua ============ -->
      <template v-if="name === 'lua'">
        <g class="wash"><path d="M112 18 A32 32 0 1 0 142 66 A25 25 0 1 1 112 18 Z" /></g>
        <g class="ink">
          <path d="M112 18 A32 32 0 1 0 142 66 A25 25 0 1 1 112 18 Z" />
          <circle cx="100" cy="58" r="4" />
          <circle cx="112" cy="77" r="2.6" />
          <circle cx="95" cy="40" r="2" />
          <path class="h" d="M99 27 Q89 45 95 67" />
          <path class="h" d="M105 24 Q94 46 101 74" />
          <g transform="rotate(38 50 70)">
            <path d="M50 46 C59 55 61 70 59 86 H41 C39 70 41 55 50 46 Z" />
            <circle cx="50" cy="64" r="4.5" />
            <path d="M42 76 H58" />
            <path d="M41 80 L32 93 L42 88" />
            <path d="M59 80 L68 93 L58 88" />
            <path d="M45 88 Q50 101 55 88" />
            <path class="h" d="M47.5 88 Q50 95 52.5 88" />
          </g>
          <circle cx="33" cy="90" r="1" />
          <circle cx="27" cy="96" r="1" />
          <circle cx="21" cy="102" r="1" />
          <path :d="sparkle(22, 22, 4)" />
          <path :d="sparkle(74, 16, 3)" />
          <path :d="sparkle(142, 98, 4)" />
          <path :d="sparkle(150, 30, 2.5)" />
        </g>
      </template>

      <!-- ============ Nuvem de estimação ============ -->
      <template v-else-if="name === 'nuvem'">
        <g class="wash"><path :d="cloud(44, 64, 1.8)" /></g>
        <g class="ink">
          <path :d="cloud(44, 64, 1.8)" />
          <path d="M66 52 q2.5 -3 5 0" />
          <path d="M87 52 q2.5 -3 5 0" />
          <path d="M74 57 q5 4 10 0" />
          <path d="M80 64 C78 76 66 82 60 92" />
          <ellipse cx="57" cy="96" rx="5" ry="4" />
          <path class="h" d="M18 104 H142" />
          <path class="h" d="M52 70 H70 M88 70 H108" />
          <path :d="sparkle(28, 30, 3)" />
          <path :d="sparkle(134, 26, 3.5)" />
          <path :d="sparkle(138, 86, 2.5)" />
        </g>
      </template>

      <!-- ============ Estrela com o nome dos noivos ============ -->
      <template v-else-if="name === 'estrela'">
        <g class="wash"><path :d="star(114, 34, 18, 7.5)" /></g>
        <g class="ink">
          <path :d="star(114, 34, 18, 7.5)" />
          <path class="h" :d="rays(114, 34, 22, 27, 5, -54)" />
          <path d="M114 41 V60" />
          <path d="M100 60 h28 l-4 5 l4 5 h-28 l4 -5 z" />
          <path class="h" d="M107 65 h14" />
          <g transform="rotate(-32 56 74)">
            <rect x="36" y="68" width="42" height="12" rx="3" />
            <rect x="76" y="65" width="9" height="18" rx="2" />
            <rect x="30" y="70" width="7" height="8" rx="1.5" />
          </g>
          <path d="M58 80 L46 104" />
          <path d="M58 80 L58 104" />
          <path d="M58 80 L70 104" />
          <path class="h" d="M51 95 H65" />
          <path :d="sparkle(20, 24, 3)" />
          <path :d="sparkle(80, 16, 3.5)" />
          <path :d="sparkle(146, 76, 3)" />
          <path :d="sparkle(36, 44, 2)" />
        </g>
      </template>

      <!-- ============ Balão acima das nuvens ============ -->
      <template v-else-if="name === 'balao'">
        <g class="wash">
          <path d="M80 12 C105 12 118 30 114 50 C110 66 94 74 88 82 H72 C66 74 50 66 46 50 C42 30 55 12 80 12 Z" />
          <path :d="cloud(14, 98, 0.95)" />
          <path :d="cloud(116, 92, 0.85)" />
        </g>
        <g class="ink">
          <path d="M80 12 C105 12 118 30 114 50 C110 66 94 74 88 82 H72 C66 74 50 66 46 50 C42 30 55 12 80 12 Z" />
          <path d="M80 12 C71 30 71 60 76 82" />
          <path d="M80 12 C89 30 89 60 84 82" />
          <path d="M80 12 C60 22 54 52 67 77" />
          <path d="M80 12 C100 22 106 52 93 77" />
          <path class="h" d="M50 58 C70 64 90 64 110 58" />
          <path d="M73 82 L74 93 M87 82 L86 93" />
          <path d="M72 93 H88 L86 104 H74 Z" />
          <path class="h" d="M73 97 H87 M74 101 H86" />
          <path :d="cloud(14, 98, 0.95)" />
          <path :d="cloud(116, 92, 0.85)" />
          <path :d="sparkle(140, 24, 3)" />
          <path :d="sparkle(22, 30, 2.5)" />
        </g>
      </template>

      <!-- ============ Arco-íris particular ============ -->
      <template v-else-if="name === 'arcoiris'">
        <g class="wash">
          <path class="wash-stroke" d="M36 90 A44 44 0 0 1 124 90" />
          <path :d="cloud(6, 94, 1.05)" />
          <path :d="cloud(112, 94, 1.05)" />
        </g>
        <g class="ink">
          <path d="M24 90 A56 56 0 0 1 136 90" />
          <path d="M32 90 A48 48 0 0 1 128 90" />
          <path d="M40 90 A40 40 0 0 1 120 90" />
          <path d="M48 90 A32 32 0 0 1 112 90" />
          <path :d="cloud(6, 94, 1.05)" />
          <path :d="cloud(112, 94, 1.05)" />
          <path :d="sparkle(80, 22, 4)" />
          <path :d="sparkle(30, 28, 3)" />
          <path :d="sparkle(132, 26, 3)" />
        </g>
      </template>

      <!-- ============ Pores do sol em potes ============ -->
      <template v-else-if="name === 'potes'">
        <g class="wash">
          <path v-for="j in jars" :key="'w' + j.x" :d="j.sunFill" />
        </g>
        <g class="ink">
          <template v-for="j in jars" :key="j.x">
            <path :d="j.lid" />
            <path :d="j.body" />
            <path class="h" :d="j.horizon" />
            <path :d="j.sun" />
            <path class="h" :d="j.rays" />
            <path class="h" :d="j.sea" />
          </template>
          <path class="h" d="M12 101 H148" />
          <path :d="sparkle(60, 20, 3)" />
          <path :d="sparkle(140, 34, 2.5)" />
        </g>
      </template>

      <!-- ============ Guarda-chuva de confete ============ -->
      <template v-else-if="name === 'confete'">
        <g class="wash">
          <path d="M28 58 Q80 2 132 58 Z" />
          <circle cx="44" cy="14" r="2.2" />
          <circle cx="118" cy="20" r="2.2" />
          <circle cx="132" cy="84" r="2" />
        </g>
        <g class="ink">
          <path d="M28 58 Q80 2 132 58" />
          <path d="M28 58 q6.5 -7 13 0 t13 0 t13 0 t13 0 t13 0 t13 0 t13 0 t13 0" />
          <path d="M80 30 Q66 40 54 58" />
          <path d="M80 30 Q94 40 106 58" />
          <path d="M80 30 V58" />
          <path d="M80 30 V24" />
          <path d="M80 58 V96 q0 8 -7 8 q-6 0 -6 -6" />
          <rect x="22" y="18" width="6" height="3" transform="rotate(24 25 19.5)" />
          <circle cx="44" cy="14" r="2.2" />
          <path d="M60 8 l5 1 l-3 4 z" />
          <rect x="98" y="10" width="6" height="3" transform="rotate(-30 101 11.5)" />
          <circle cx="118" cy="20" r="2.2" />
          <path d="M136 30 q3 -3 6 0 t6 0" />
          <rect x="16" y="44" width="5" height="3" transform="rotate(-15 18.5 45.5)" />
          <path d="M24 78 l4 -2 l1 5 z" />
          <circle cx="132" cy="84" r="2" />
          <rect x="140" y="62" width="6" height="3" transform="rotate(40 143 63.5)" />
          <path d="M30 96 q3 -3 6 0" />
        </g>
      </template>

      <!-- ============ Mapa do tesouro ============ -->
      <template v-else-if="name === 'mapa'">
        <g class="wash">
          <path d="M24 22 H128 Q136 22 136 30 V82 Q136 90 128 90 H24 Q16 90 16 82 V30 Q16 22 24 22 Z" />
        </g>
        <g class="ink">
          <path d="M24 22 H128 Q136 22 136 30 V82 Q136 90 128 90 H24 Q16 90 16 82 V30 Q16 22 24 22 Z" />
          <path class="h" d="M58 22 V90 M96 22 V90" />
          <circle cx="36" cy="42" r="9" />
          <path class="h" :d="star(36, 42, 8, 2.4, 4)" />
          <path d="M33.5 29 V25 L38.5 29 V25" />
          <circle
            v-for="(p, k) in [[34,78],[40,73],[46,69],[53,68],[60,70],[67,71],[74,68],[80,63],[86,58],[93,55],[100,53],[107,50],[112,46]]"
            :key="k"
            :cx="p[0]"
            :cy="p[1]"
            r="1.1"
          />
          <path d="M113 35 L123 45 M123 35 L113 45" />
          <path class="h" d="M22 84 q3 -2.5 6 0 t6 0 t6 0" />
          <path class="h" d="M112 80 Q122 74 132 80" />
          <path d="M122 78 Q120 70 122 64" />
          <path d="M122 64 q-6 -2 -9 2 M122 64 q6 -3 9 1 M122 64 q-2 -5 -6 -6 M122 64 q3 -5 7 -5" />
        </g>
      </template>

      <!-- ============ Um dia com o tempo parado ============ -->
      <template v-else-if="name === 'relogio'">
        <g class="wash"><circle cx="80" cy="62" r="32" /></g>
        <g class="ink">
          <circle cx="80" cy="62" r="32" />
          <circle class="h" cx="80" cy="62" r="28" />
          <rect x="75" y="25" width="10" height="5" rx="1.5" />
          <circle cx="80" cy="19" r="5" />
          <path class="h" :d="clockTicks" />
          <path d="M80 62 V43" />
          <path d="M80 62 L93 69" />
          <circle cx="80" cy="62" r="2" />
          <path class="h" d="M107 48 A30 30 0 0 1 107 76" />
          <path class="h" d="M103 44 A30 30 0 0 1 103 80" />
          <path :d="sparkle(28, 32, 3.5)" />
          <path :d="sparkle(134, 34, 3)" />
          <path :d="sparkle(130, 96, 2.5)" />
          <path :d="sparkle(32, 90, 2.5)" />
        </g>
      </template>

      <!-- ============ Castelo de areia ============ -->
      <template v-else-if="name === 'castelo'">
        <g class="wash">
          <path d="M14 100 Q80 86 146 100 V104 H14 Z" />
          <path d="M62 94 V40 H98 V94 Z" />
        </g>
        <g class="ink">
          <path d="M14 100 Q80 86 146 100" />
          <path :d="tower(46, 56, 16, 96)" />
          <path :d="tower(98, 56, 16, 96)" />
          <path :d="tower(62, 40, 36, 94)" />
          <path :d="tower(72, 26, 16, 40)" />
          <path d="M80 26 V12" />
          <path d="M80 12 L92 16 L80 20" />
          <path d="M74 94 V84 A6 6 0 0 1 86 84 V94" />
          <path d="M52 72 v-4 a2 2 0 0 1 4 0 v4 M104 72 v-4 a2 2 0 0 1 4 0 v4 M78 60 v-5 a2 2 0 0 1 4 0 v5" />
          <path class="h" d="M64 50 H96 M64 66 H70 M90 66 H96" />
          <path d="M118 86 H130 L128 98 H120 Z" />
          <path d="M118 86 Q124 78 130 86" />
          <path d="M26 99 L36 84" />
          <path d="M33 82 L40 84 L38 90 L32 88 Z" />
          <path class="h" :d="waves(112, 106, 3, 10, 3)" />
          <circle cx="136" cy="22" r="7" />
          <path class="h" :d="rays(136, 22, 10, 14, 8, 10)" />
        </g>
      </template>

      <!-- ============ Serenata de golfinhos ============ -->
      <template v-else-if="name === 'golfinhos'">
        <g class="wash">
          <path d="M28 78 C34 70 40 66 46 64 C60 44 92 40 110 56 C116 54 122 54 128 58 C122 60 118 64 118 70 C114 66 110 64 106 64 C98 52 72 52 58 66 C52 70 40 74 28 78 Z" />
          <path d="M30 92 A10 10 0 0 1 50 92 Z" />
        </g>
        <g class="ink">
          <path d="M28 78 C34 70 40 66 46 64 C60 44 92 40 110 56 C116 54 122 54 128 58 C122 60 118 64 118 70 C114 66 110 64 106 64 C98 52 72 52 58 66 C52 70 40 74 28 78 Z" />
          <path d="M76 46 L82 35 L90 45" />
          <circle cx="47" cy="66" r="1.2" />
          <path class="h" d="M50 70 C64 60 84 56 100 60" />
          <path d="M30 92 A10 10 0 0 1 50 92" />
          <path class="h" :d="rays(40, 92, 13, 17, 5, 200)" />
          <path :d="waves(8, 92, 12, 12, 4)" />
          <path class="h" :d="waves(20, 100, 9, 12, 3)" />
          <path d="M24 84 q-3 -6 1 -10 M130 82 q3 -5 0 -9" />
          <path :d="note(124, 34)" />
          <path :d="note(142, 46)" />
          <path :d="sparkle(20, 26, 3)" />
        </g>
      </template>

      <!-- ============ Tapete voador ============ -->
      <template v-else-if="name === 'tapete'">
        <g class="wash">
          <path d="M24 72 Q48 62 76 70 T132 64 L124 82 Q98 76 72 86 T18 88 Z" />
          <path :d="cloud(96, 106, 0.9)" />
        </g>
        <g class="ink">
          <path d="M24 72 Q48 62 76 70 T132 64 L124 82 Q98 76 72 86 T18 88 Z" />
          <path class="h" d="M30 76 Q50 68 76 75 T126 70" />
          <path d="M76 71 L84 77 L76 83 L68 77 Z" />
          <path class="h" d="M23 74 l-6 -1 M22 78 l-6 -1 M20 82 l-6 -1 M19 86 l-6 -1" />
          <path class="h" d="M131 66 l6 -1 M129 71 l6 -1 M127 76 l6 -1 M125 80 l6 -1" />
          <path d="M58 70 Q64 56 74 58 Q84 60 88 72" />
          <rect x="69" y="54.5" width="9" height="6" rx="1.5" />
          <path class="h" d="M4 60 H20 M0 67 H14 M8 98 H24" />
          <path :d="cloud(96, 106, 0.9)" />
          <path :d="cloud(18, 40, 0.75)" />
          <path :d="sparkle(120, 28, 3.5)" />
          <path :d="sparkle(70, 22, 2.5)" />
        </g>
      </template>

      <!-- ============ Piquenique em Saturno ============ -->
      <template v-else-if="name === 'saturno'">
        <g class="wash"><circle cx="80" cy="56" r="22" /></g>
        <g class="ink">
          <circle cx="80" cy="56" r="22" />
          <path class="h" d="M61 47 Q80 53 99 45 M59 61 Q80 67 101 59" />
          <ellipse cx="80" cy="56" rx="56" ry="13" transform="rotate(-14 80 56)" />
          <g transform="rotate(-14 34 66)">
            <rect x="26" y="61" width="15" height="9" />
            <path class="h" d="M31 61 V70 M36 61 V70 M26 65.5 H41" />
          </g>
          <path d="M116 44 H130 L128 52 H118 Z" />
          <path d="M118 44 Q123 36 128 44" />
          <path :d="sparkle(20, 20, 3)" />
          <path :d="sparkle(142, 22, 3.5)" />
          <path :d="sparkle(146, 88, 2.5)" />
          <path :d="sparkle(30, 98, 3)" />
          <path :d="sparkle(96, 100, 2)" />
        </g>
      </template>

      <!-- ============ Carona de baleia ============ -->
      <template v-else-if="name === 'baleia'">
        <g class="wash">
          <path d="M22 70 C22 50 54 42 84 47 C104 51 116 58 122 66 C128 60 134 53 142 51 C138 58 136 64 138 72 C130 70 126 70 122 72 C108 86 60 90 36 82 C28 79 22 76 22 70 Z" />
        </g>
        <g class="ink">
          <path d="M22 70 C22 50 54 42 84 47 C104 51 116 58 122 66 C128 60 134 53 142 51 C138 58 136 64 138 72 C130 70 126 70 122 72 C108 86 60 90 36 82 C28 79 22 76 22 70 Z" />
          <circle cx="40" cy="65" r="1.5" />
          <path d="M24 72 Q36 76 50 74" />
          <path class="h" d="M30 78 Q44 82 58 80 M36 82 Q48 85 60 84" />
          <path d="M60 80 Q66 90 76 88 Q70 84 68 78" />
          <path d="M58 45 C56 35 50 31 44 31 M58 45 C60 35 66 31 72 31 M58 45 V29" />
          <circle cx="42" cy="35" r="1" />
          <circle cx="74" cy="35" r="1" />
          <path :d="waves(6, 94, 12, 12.5, 4)" />
          <path class="h" :d="waves(18, 102, 10, 12, 3)" />
          <path :d="sparkle(130, 26, 3)" />
        </g>
      </template>

      <!-- ============ Farol ============ -->
      <template v-else-if="name === 'farol'">
        <g class="wash">
          <path d="M88 32 L142 20 L142 48 L88 36 Z" />
          <path d="M72 32 L18 20 L18 48 L72 36 Z" />
          <path d="M44 100 Q52 90 64 94 Q72 88 82 92 Q92 86 104 94 Q112 92 118 100 Z" />
        </g>
        <g class="ink">
          <path d="M44 100 Q52 90 64 94 Q72 88 82 92 Q92 86 104 94 Q112 92 118 100" />
          <path d="M68 94 L72 40 H88 L92 94" />
          <path d="M71 58 H89 M70 76 H90" />
          <path class="h" d="M71 62 H89 M70 80 H90" />
          <path d="M68 40 H92" />
          <rect x="72" y="28" width="16" height="12" />
          <path d="M70 28 L80 17 L90 28" />
          <path d="M80 17 V13" />
          <path d="M77 94 V87 A3 3 0 0 1 83 87 V94" />
          <path class="h" d="M88 32 L142 20 M88 36 L142 48 M72 32 L18 20 M72 36 L18 48" />
          <path :d="waves(6, 104, 4, 9, 3)" />
          <path :d="waves(118, 104, 4, 9, 3)" />
          <path :d="sparkle(24, 8, 2.5)" />
          <path :d="sparkle(138, 8, 2.5)" />
        </g>
      </template>

      <!-- ============ Caravela ============ -->
      <template v-else-if="name === 'caravela'">
        <g class="wash">
          <path d="M50 24 H78 Q84 40 78 56 H50 Q56 40 50 24 Z" />
          <path d="M86 32 H110 Q115 46 110 60 H86 Q91 46 86 32 Z" />
        </g>
        <g class="ink">
          <path d="M28 74 H132 L120 92 H42 Z" />
          <path class="h" d="M34 80 H126" />
          <circle cx="56" cy="85" r="1.6" />
          <circle cx="72" cy="85" r="1.6" />
          <circle cx="88" cy="85" r="1.6" />
          <circle cx="104" cy="85" r="1.6" />
          <path d="M64 74 V16 M98 74 V26" />
          <path d="M132 74 L146 66" />
          <path d="M50 24 H78 Q84 40 78 56 H50 Q56 40 50 24 Z" />
          <path d="M86 32 H110 Q115 46 110 60 H86 Q91 46 86 32 Z" />
          <path class="h" d="M54 34 Q64 37 76 34 M54 46 Q64 49 77 46 M90 42 Q98 45 108 42" />
          <path d="M64 16 L74 19 L64 22 M98 26 L106 28.5 L98 31" />
          <path :d="waves(10, 96, 12, 12, 4)" />
          <path class="h" :d="waves(22, 103, 9, 12, 3)" />
          <path :d="sparkle(24, 24, 3)" />
          <path :d="sparkle(140, 22, 3.5)" />
        </g>
      </template>

      <!-- ============ Aurora boreal ============ -->
      <template v-else-if="name === 'aurora'">
        <g class="wash">
          <path class="wash-stroke" d="M10 46 C34 26 58 54 84 34 S130 28 152 38" />
          <rect x="117" y="89" width="5" height="5" />
        </g>
        <g class="ink">
          <path d="M10 40 C34 20 58 48 84 28 S130 22 152 32" />
          <path d="M10 52 C34 32 58 60 84 40 S130 34 152 44" />
          <path class="h" d="M22 33 V45 M36 30 V42 M50 38 V50 M66 39 V51 M80 31 V43 M96 27 V39 M112 26 V38 M128 27 V39 M142 29 V41" />
          <path d="M4 98 L42 60 L58 76 L86 44 L116 82 L132 68 L156 98" />
          <path class="h" d="M79 52 L86 44 L94 54 L89 51 L85 55 L82 51 Z" />
          <path d="M110 98 V87 L119 80 L128 87 V98" />
          <rect x="117" y="89" width="5" height="5" />
          <path class="h" d="M2 98 H158" />
          <path :d="sparkle(26, 14, 2.5)" />
          <path :d="sparkle(70, 12, 3)" />
          <path :d="sparkle(136, 12, 2.5)" />
        </g>
      </template>

      <!-- ============ Jardim que floresce o ano inteiro ============ -->
      <template v-else-if="name === 'jardim'">
        <g class="wash">
          <path :d="flower(42, 58, 7, 5)" />
          <path :d="flower(62, 46, 9, 6)" />
          <path :d="flower(92, 52, 8, 5)" />
          <path :d="flower(116, 60, 7, 6)" />
          <circle cx="134" cy="22" r="8" />
        </g>
        <g class="ink">
          <path d="M14 98 Q80 92 146 98" />
          <path d="M42 98 Q38 80 42 64 M62 98 Q66 76 62 54 M92 98 Q88 80 92 60 M116 98 Q119 82 116 66" />
          <path :d="flower(42, 58, 7, 5)" />
          <circle cx="42" cy="58" r="2.4" />
          <path :d="flower(62, 46, 9, 6)" />
          <circle cx="62" cy="46" r="3" />
          <path :d="flower(92, 52, 8, 5)" />
          <circle cx="92" cy="52" r="2.7" />
          <path :d="flower(116, 60, 7, 6)" />
          <circle cx="116" cy="60" r="2.4" />
          <path d="M41 84 q-10 -2 -12 -10 q8 0 12 10 M63 80 q10 -3 13 -11 q-9 1 -13 11 M90 86 q-9 -3 -11 -11 q8 1 11 11 M117 86 q9 -2 11 -10 q-8 0 -11 10" />
          <circle cx="134" cy="22" r="8" />
          <path class="h" :d="rays(134, 22, 11, 15, 8, 0)" />
          <path :d="sparkle(22, 30, 3)" />
        </g>
      </template>
    </g>
  </svg>
</template>

<style scoped>
.gift-art {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}
.ink {
  fill: none;
  stroke: #1b3474;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.ink .h {
  stroke-width: 0.85;
  opacity: 0.8;
}
.wash {
  fill: #c3d1ec;
  stroke: none;
  opacity: 0;
  transition: opacity 1.2s ease;
  transition-delay: calc(var(--count, 20) * 45ms);
}
.wash .wash-stroke {
  fill: none;
  stroke: #c3d1ec;
  stroke-width: 14;
  stroke-linecap: round;
}
.drawn .wash {
  opacity: 0.55;
}
/* cada traço é desenhado em sequência */
.ink :is(path, circle, ellipse, line, rect, polyline, polygon) {
  stroke-dasharray: 1 1;
  stroke-dashoffset: 1;
}
.drawn .ink :is(path, circle, ellipse, line, rect, polyline, polygon) {
  animation: ink-draw 0.9s calc(var(--k, 0) * 45ms) cubic-bezier(0.45, 0, 0.25, 1) forwards;
}
@keyframes ink-draw {
  to {
    stroke-dashoffset: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .ink :is(path, circle, ellipse, line, rect, polyline, polygon) {
    stroke-dashoffset: 0 !important;
  }
  .wash {
    opacity: 0.55;
  }
}
</style>
