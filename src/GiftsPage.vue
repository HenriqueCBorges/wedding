<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { ArrowLeft, ArrowUpRight, X, Heart, QrCode, Sparkles } from 'lucide-vue-next';
import { gifts, priceRanges, formatPrice } from './gifts.js';
import { vReveal } from './reveal.js';

const emit = defineEmits(['rsvp']);

const range = ref('todos');
const visibleGifts = computed(() => {
  const r = priceRanges.find((x) => x.id === range.value);
  return gifts.filter((g) => r.test(g.price));
});
const selected = ref(null);

/* ---------- QR Code fictício (apenas visual, não é um Pix válido) ---------- */
const QR = 25;
function seeded(str) {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
function fakeQr(id) {
  const rand = seeded(id);
  const cells = [];
  const inFinder = (x, y) =>
    (x < 8 && y < 8) || (x > QR - 9 && y < 8) || (x < 8 && y > QR - 9);
  const inCenter = (x, y) => Math.abs(x - 12) <= 3 && Math.abs(y - 12) <= 3;
  for (let y = 0; y < QR; y++) {
    for (let x = 0; x < QR; x++) {
      if (inFinder(x, y) || inCenter(x, y)) continue;
      const timing = (x === 6 || y === 6) && (x + y) % 2 === 0;
      if (timing || rand() > 0.52) cells.push({ x, y });
    }
  }
  return cells;
}
const finders = [
  [0, 0],
  [QR - 7, 0],
  [0, QR - 7],
];
const qrCells = computed(() => (selected.value ? fakeQr(selected.value.id) : []));

const confetti = Array.from({ length: 26 }, (_, i) => ({
  angle: `${(i / 26) * 360}deg`,
  dist: `${120 + ((i * 37) % 90)}px`,
  color: ['#d4bb97', '#0b1f49', '#b49368', '#f3e3c8', '#8fa6d6'][i % 5],
  delay: `${(i % 6) * 0.03}s`,
}));

function choose(gift) {
  selected.value = gift;
}
function close() {
  selected.value = null;
}
function onKey(e) {
  if (e.key === 'Escape' && selected.value) close();
}
watch(selected, (g) => document.documentElement.classList.toggle('no-scroll', !!g));
onMounted(() => window.addEventListener('keydown', onKey));
onUnmounted(() => {
  window.removeEventListener('keydown', onKey);
  document.documentElement.classList.remove('no-scroll');
});
</script>

<template>
  <main class="gifts-page">
    <section class="gp-hero">
      <div class="gp-hero-bg" aria-hidden="true">
        <img src="/art/presente.webp" alt="" />
      </div>
      <div class="gp-hero-content">
        <a href="#presentes" class="gp-back hero-in" style="--d: 0"><ArrowLeft :size="15" /> Voltar ao site</a>
        <p class="eyebrow hero-in" style="--d: 1">Lista de presentes</p>
        <h1 class="hero-in" style="--d: 2">Presenteie com <i>bom humor</i></h1>
        <p class="gp-lead hero-in" style="--d: 3">
          Todos os presentes viram Pix para os noivos, mas a gente prefere imaginar que você comprou
          mesmo o iate. Escolha o seu favorito.
        </p>
      </div>
    </section>

    <section class="gp-list section-wrap">
      <div v-reveal class="gp-filters" role="tablist" aria-label="Filtrar por valor">
        <button
          v-for="r in priceRanges"
          :key="r.id"
          role="tab"
          :aria-selected="range === r.id"
          :class="['chip', { on: range === r.id }]"
          @click="range = r.id"
        >
          {{ r.label }}
        </button>
      </div>

      <TransitionGroup name="card" tag="div" class="gp-grid">
        <article v-for="(g, i) in visibleGifts" :key="g.id" class="gift-card" :style="{ '--i': i }">
          <span class="gift-emoji" aria-hidden="true">{{ g.emoji }}</span>
          <h2>{{ g.title }}</h2>
          <p>{{ g.description }}</p>
          <div class="gift-foot">
            <strong>{{ formatPrice(g.price) }}</strong>
            <button class="btn btn-navy" @click="choose(g)">
              Presentear <ArrowUpRight :size="14" />
            </button>
          </div>
        </article>
      </TransitionGroup>

      <div v-reveal class="gp-note">
        <Heart :size="18" />
        <p>
          Prefere outro valor ou só quer mandar um abraço? Tudo bem também. O mais importante é
          celebrar com você.
        </p>
        <button class="btn btn-outline" @click="emit('rsvp')">Confirmar presença <ArrowUpRight :size="14" /></button>
      </div>
    </section>

    <!-- QR Code -->
    <Transition name="modal">
      <div v-if="selected" class="modal-backdrop" @click.self="close">
        <div class="modal qr-modal" role="dialog" aria-modal="true" aria-labelledby="qr-title">
          <button class="modal-close" aria-label="Fechar" @click="close"><X :size="22" /></button>
          <div class="confetti" aria-hidden="true">
            <i
              v-for="(c, i) in confetti"
              :key="i"
              :style="{ '--a': c.angle, '--dist': c.dist, background: c.color, animationDelay: c.delay }"
            ></i>
          </div>
          <span class="qr-emoji" aria-hidden="true">{{ selected.emoji }}</span>
          <p class="eyebrow">Você escolheu</p>
          <h2 id="qr-title">{{ selected.title }}</h2>
          <p class="qr-price">{{ formatPrice(selected.price) }}</p>

          <div class="qr-box">
            <svg :viewBox="`-2 -2 ${QR + 4} ${QR + 4}`" role="img" aria-label="QR Code fictício">
              <rect x="-2" y="-2" :width="QR + 4" :height="QR + 4" fill="#fff" />
              <rect v-for="c in qrCells" :key="`${c.x}-${c.y}`" :x="c.x" :y="c.y" width="1.02" height="1.02" fill="#0b1f49" />
              <g v-for="[fx, fy] in finders" :key="`${fx}-${fy}`">
                <rect :x="fx + 0.5" :y="fy + 0.5" width="6" height="6" rx="1.4" fill="none" stroke="#0b1f49" stroke-width="1" />
                <rect :x="fx + 2" :y="fy + 2" width="3" height="3" rx="0.7" fill="#b49368" />
              </g>
              <circle cx="12.5" cy="12.5" r="3.4" fill="#fff" />
              <path
                d="M12.5 14.4 l-1.75-1.7 a1 1 0 0 1 1.75-1.25 a1 1 0 0 1 1.75 1.25 z"
                fill="#b49368"
              />
            </svg>
            <span class="qr-scan" aria-hidden="true"></span>
          </div>

          <p class="qr-warning"><QrCode :size="15" /> QR Code fictício: o Pix verdadeiro será disponibilizado em breve.</p>
          <p class="qr-thanks"><Sparkles :size="15" /> Obrigado pelo carinho (e pelo senso de humor)!</p>
          <button class="btn btn-outline" @click="close">Escolher outro presente</button>
        </div>
      </div>
    </Transition>
  </main>
</template>
