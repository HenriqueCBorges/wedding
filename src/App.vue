<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import {
  Menu,
  X,
  ArrowUpRight,
  ArrowDown,
  MapPin,
  CalendarDays,
  Clock3,
  Heart,
  Gift,
  Check,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Expand,
  ArrowLeft,
} from 'lucide-vue-next';
import { findInvite, normalizeCode } from './guests.js';
import { vReveal, reducedMotion } from './reveal.js';
import GiftsPage from './GiftsPage.vue';
import { startHandDrawing } from './handDrawing.js';

/* ---------- Estado geral ---------- */
const mobileMenu = ref(false);
const rsvpOpen = ref(false);
// Abertura: a ilustração do hero é desenhada à mão antes de a interface aparecer.
// Não acontece com movimento reduzido nem quando o site abre direto na lista de presentes.
const startsOnGifts = typeof location !== 'undefined' && location.hash === '#/presentes';
const willDraw = !reducedMotion && !startsOnGifts;
const introDone = ref(!willDraw); // interface (menu, nomes, contador) liberada
const drawing = ref(willDraw); // desenho centralizado na tela, ainda sem a interface
const revealed = ref(!willDraw); // ilustração final (com aquarela e água animada) visível
const scrolled = ref(false);
const headerHidden = ref(false);
const progress = ref(0);
const activeSection = ref('inicio');
const lightbox = ref(-1);

const navLinks = [
  { id: 'inicio', label: 'Início' },
  { id: 'cerimonia', label: 'O grande dia' },
  { id: 'galeria', label: 'Galeria' },
  { id: 'presentes', label: 'Presentes', href: '#/presentes' },
];

/* ---------- Páginas: início e lista de presentes (#/presentes) ---------- */
const GIFTS_HASH = '#/presentes';
const page = ref(typeof location !== 'undefined' && location.hash === GIFTS_HASH ? 'gifts' : 'home');
const activeNav = computed(() => (page.value === 'gifts' ? 'presentes' : activeSection.value));
function onHashChange() {
  const hash = location.hash;
  if (hash === GIFTS_HASH) {
    page.value = 'gifts';
    window.scrollTo({ top: 0, behavior: 'instant' });
    return;
  }
  const wasGifts = page.value === 'gifts';
  page.value = 'home';
  if (!wasGifts) return;
  // a página inicial estava oculta: rola até a âncora depois que ela reaparecer
  nextTick(() => {
    const target = hash && document.getElementById(hash.slice(1));
    if (target) target.scrollIntoView({ behavior: 'instant' });
    else window.scrollTo({ top: 0, behavior: 'instant' });
  });
}

/* ---------- Contagem regressiva (anos, meses, dias, horas, minutos, segundos) ---------- */
// Cálculo feito no "relógio de parede" de Brasília (UTC-3), independente do fuso do visitante.
const BRT = -3 * 3600e3;
const wedding = Date.UTC(2027, 7, 22, 15, 30) - BRT;
const now = ref(Date.now());

function addMonths(t, n) {
  const d = new Date(t);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + n;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return Date.UTC(
    y,
    m,
    Math.min(d.getUTCDate(), lastDay),
    d.getUTCHours(),
    d.getUTCMinutes(),
    d.getUTCSeconds(),
    d.getUTCMilliseconds(),
  );
}

function timeUntil(from, to) {
  const a = from + BRT;
  const b = to + BRT;
  if (b <= a) return [0, 0, 0, 0, 0, 0];
  const da = new Date(a);
  const db = new Date(b);
  let months =
    (db.getUTCFullYear() - da.getUTCFullYear()) * 12 +
    (db.getUTCMonth() - da.getUTCMonth());
  if (addMonths(a, months) > b) months--;
  let s = Math.floor((b - addMonths(a, months)) / 1000);
  const days = Math.floor(s / 86400);
  s %= 86400;
  const hours = Math.floor(s / 3600);
  s %= 3600;
  return [
    Math.floor(months / 12),
    months % 12,
    days,
    hours,
    Math.floor(s / 60),
    s % 60,
  ];
}

const countdownLabels = [
  ['ano', 'anos'],
  ['mês', 'meses'],
  ['dia', 'dias'],
  ['hora', 'horas'],
  ['minuto', 'minutos'],
  ['segundo', 'segundos'],
];
const countdown = computed(() =>
  timeUntil(now.value, wedding).map((n, i) => ({
    n: String(n).padStart(2, '0'),
    label: countdownLabels[i][n === 1 ? 0 : 1],
  })),
);
const weddingArrived = computed(() => now.value >= wedding);

/* ---------- Conteúdo ---------- */
const mapUrl =
  'https://www.google.com/maps/search/?api=1&query=' +
  encodeURIComponent(
    'Cerimonial Casa Rio, R. João Marques de Oliveira, 53, Buraquinho, Lauro de Freitas, BA',
  );
const pictures = [
  { src: '/art/buque.webp', caption: 'Cada pequeno detalhe', cls: 'tall' },
  { src: '/art/mesa-decorada.webp', caption: 'Feito com amor', cls: 'wide' },
  { src: '/art/maos.webp', caption: 'Lado a lado, sempre', cls: '' },
  { src: '/art/cerimonia-editorial.webp', caption: 'Um dia para celebrar', cls: '' },
];
const titleFirst = 'Stefania'.split('');
const titleSecond = 'Henrique'.split('');
const quoteWords = '“O amor é paciente, o amor é bondoso.”'.split(' ');
const marquee = Array.from({ length: 6 });
const petals = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  delay: `${(i * 1.7) % 12}s`,
  duration: `${11 + ((i * 3) % 9)}s`,
  scale: 0.55 + ((i * 7) % 10) / 18,
}));

/* ---------- Ações ---------- */
function closeMenu() {
  mobileMenu.value = false;
}
function openRSVP() {
  rsvpOpen.value = true;
  closeMenu();
}

/* ---------- RSVP: código → convidados → confirmação ---------- */
// Demonstração local: não salva nem envia dados.
const rsvpStep = ref('code'); // 'code' | 'guests' | 'done'
const inviteCode = ref('');
const codeError = ref('');
const invite = ref(null);
const answers = ref([]); // 'sim' | 'nao' | null, um por convidado
const allAnswered = computed(() => answers.value.length > 0 && answers.value.every(Boolean));
const confirmedGuests = computed(() =>
  invite.value ? invite.value.guests.filter((_, i) => answers.value[i] === 'sim') : [],
);
const declinedGuests = computed(() =>
  invite.value ? invite.value.guests.filter((_, i) => answers.value[i] === 'nao') : [],
);

function onCodeInput(e) {
  inviteCode.value = normalizeCode(e.target.value);
  e.target.value = inviteCode.value;
  codeError.value = '';
}
function submitCode() {
  const found = findInvite(inviteCode.value);
  if (!found) {
    codeError.value = 'Código não encontrado. Confira o código do seu convite.';
    return;
  }
  invite.value = found;
  answers.value = found.guests.map(() => null);
  rsvpStep.value = 'guests';
}
function setAnswer(i, value) {
  answers.value[i] = value;
}
function setAllAnswers(value) {
  answers.value = answers.value.map(() => value);
}
function submitRSVP() {
  if (allAnswered.value) rsvpStep.value = 'done';
}
function backToCode() {
  rsvpStep.value = 'code';
  codeError.value = '';
}
function closeRSVP() {
  rsvpOpen.value = false;
  setTimeout(() => {
    rsvpStep.value = 'code';
    inviteCode.value = '';
    codeError.value = '';
    invite.value = null;
    answers.value = [];
  }, 400);
}
function openLightbox(i) {
  lightbox.value = i;
}
function stepLightbox(dir) {
  lightbox.value = (lightbox.value + dir + pictures.length) % pictures.length;
}
function onKey(e) {
  if (e.key === 'Escape') {
    if (lightbox.value >= 0) lightbox.value = -1;
    else if (rsvpOpen.value) closeRSVP();
    else closeMenu();
  }
  if (lightbox.value >= 0 && e.key === 'ArrowRight') stepLightbox(1);
  if (lightbox.value >= 0 && e.key === 'ArrowLeft') stepLightbox(-1);
}
watch(
  [rsvpOpen, lightbox, mobileMenu, introDone],
  ([r, l, m, intro]) => {
    document.documentElement.classList.toggle('no-scroll', r || l >= 0 || m || !intro);
  },
  { immediate: true },
);

/* ---------- Rolagem: header, progresso e parallax ---------- */
let lastY = 0;
let ticking = false;
let parallaxEls = [];
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.value = max > 0 ? y / max : 0;
    scrolled.value = y > 40;
    headerHidden.value = y > 500 && y > lastY && !mobileMenu.value;
    lastY = y;
    if (!reducedMotion) {
      const vh = window.innerHeight;
      for (const el of parallaxEls) {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) continue;
        const offset = (r.top + r.height / 2 - vh / 2) * Number(el.dataset.parallax);
        el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
      }
    }
    ticking = false;
  });
}

/* ---------- Parallax suave da ilustração com o mouse ---------- */
const hero = ref(null);
const pointer = { x: 0, y: 0 };
function onPointer(e) {
  pointer.x = e.clientX / window.innerWidth - 0.5;
  pointer.y = e.clientY / window.innerHeight - 0.5;
  if (hero.value) {
    hero.value.style.setProperty('--mx', pointer.x.toFixed(3));
    hero.value.style.setProperty('--my', pointer.y.toFixed(3));
  }
}

/* ---------- Abertura: desenho à mão ---------- */
const drawCanvas = ref(null);
const drawNib = ref(null);
let drawCtl = null;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function runDrawing() {
  // Primeira visita na sessão: ritmo completo. Recarregando: versão acelerada.
  let speed = 1;
  try {
    if (sessionStorage.getItem('abertura-vista') === '1' && !location.search.includes('abertura')) speed = 0.3;
    sessionStorage.setItem('abertura-vista', '1');
  } catch {
    /* armazenamento indisponível */
  }
  const wide = (drawCanvas.value?.clientWidth || 0) * Math.min(window.devicePixelRatio || 1, 2) > 1300;
  drawCtl = startHandDrawing({
    canvas: drawCanvas.value,
    nib: drawNib.value,
    imageSrc: wide ? '/art/casa-rio-ilustracao.webp' : '/art/casa-rio-ilustracao-1200.webp',
    strokesUrl: '/art/tracos-casa-rio.json',
    speed,
  });
  await drawCtl.done;
  revealed.value = true; // sombras, aquarela e água assentam por cima do traço
  await wait(drawCtl.skipped ? 300 : 1000 * Math.max(speed, 0.5));
  drawing.value = false; // o desenho desliza para o lugar
  await wait(500);
  introDone.value = true; // surgem menu, nomes, data e contador
}
function skipDrawing() {
  if (!drawCtl) return;
  drawCtl.skipped = true;
  drawCtl.skip();
}

/* ---------- Seção ativa no menu ---------- */
let sectionObserver;

let interval;
onMounted(() => {
  interval = setInterval(() => (now.value = Date.now()), 1000);
  parallaxEls = [...document.querySelectorAll('[data-parallax]')];
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('keydown', onKey);
  window.addEventListener('hashchange', onHashChange);
  onScroll();
  sectionObserver = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) activeSection.value = e.target.id;
      }),
    { rootMargin: '-45% 0px -50% 0px' },
  );
  navLinks.forEach(({ id }) => {
    const el = document.getElementById(id);
    if (el) sectionObserver.observe(el);
  });
  if (willDraw) requestAnimationFrame(runDrawing);
});
onUnmounted(() => {
  clearInterval(interval);
  sectionObserver?.disconnect();
  window.removeEventListener('scroll', onScroll);
  window.removeEventListener('pointermove', onPointer);
  window.removeEventListener('keydown', onKey);
  window.removeEventListener('hashchange', onHashChange);
});
</script>

<template>
  <div :class="['page', { ready: introDone }]">
    <Transition name="fade">
      <button v-if="drawing" class="draw-skip" type="button" @click="skipDrawing">Pular abertura</button>
    </Transition>

    <div class="scroll-progress" :style="{ transform: `scaleX(${progress})` }"></div>

    <header
      :class="[
        'site-header',
        { scrolled, hidden: headerHidden, 'menu-open': mobileMenu, 'on-light': true },
      ]"
    >
      <a href="#inicio" class="brand" aria-label="Voltar ao início" @click="closeMenu">
        <img class="brand-logo brand-light" src="/logo-light.png" alt="" />
        <img class="brand-logo brand-dark" src="/logo.png" alt="Monograma SH — Stefania e Henrique" />
      </a>
      <nav :class="['nav', { 'nav-open': mobileMenu }]" aria-label="Navegação principal">
        <a
          v-for="(link, i) in navLinks"
          :key="link.id"
          :href="link.href || `#${link.id}`"
          :class="{ active: activeNav === link.id }"
          :style="{ '--i': i }"
          @click="closeMenu"
          >{{ link.label }}</a
        >
        <button class="nav-mobile-rsvp" :style="{ '--i': navLinks.length }" @click="openRSVP">
          Confirmar presença
        </button>
      </nav>
      <button class="btn btn-glass header-cta" @click="openRSVP">
        Confirmar presença <ArrowUpRight :size="15" />
      </button>
      <button
        class="menu-toggle"
        :aria-label="mobileMenu ? 'Fechar menu' : 'Abrir menu'"
        :aria-expanded="mobileMenu"
        @click="mobileMenu = !mobileMenu"
      >
        <X v-if="mobileMenu" /><Menu v-else />
      </button>
    </header>

    <main v-show="page === 'home'">
      <!-- Hero -->
      <section id="inicio" ref="hero" :class="['hero', { drawing, revealed }]">
        <!-- Ondulação dos reflexos na água (deslocamento só na horizontal) -->
        <svg class="hero-filters" width="0" height="0" aria-hidden="true" focusable="false">
          <filter id="water-ripple" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.004 0.06" numOctaves="2" seed="7" result="noise">
              <animate
                v-if="!reducedMotion"
                attributeName="baseFrequency"
                dur="10s"
                values="0.004 0.06;0.0048 0.072;0.004 0.06"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feColorMatrix
              in="noise"
              type="matrix"
              values="1 0 0 0 0  0 0 0 0 0.5  0 0 1 0 0  0 0 0 0 1"
              result="flow"
            />
            <feDisplacementMap in="SourceGraphic" in2="flow" scale="9" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>

        <!-- Ilustração da Casa Rio -->
        <div class="hero-scene-wrap" data-parallax="-0.14" aria-hidden="true">
          <div class="hero-scene">
            <img
              class="scene-img"
              src="/art/casa-rio-ilustracao.webp"
              srcset="/art/casa-rio-ilustracao-1200.webp 1200w, /art/casa-rio-ilustracao.webp 2400w"
              sizes="(max-width: 720px) 116vw, min(1600px, 100vw)"
              alt=""
              fetchpriority="high"
            />
            <div class="scene-water">
              <img
                src="/art/casa-rio-ilustracao.webp"
                srcset="/art/casa-rio-ilustracao-1200.webp 1200w, /art/casa-rio-ilustracao.webp 2400w"
                sizes="(max-width: 720px) 116vw, min(1600px, 100vw)"
                alt=""
              />
              <span class="scene-glint"></span>
            </div>
            <canvas v-if="willDraw" ref="drawCanvas" class="scene-draw"></canvas>
            <span v-if="willDraw" ref="drawNib" class="draw-nib"></span>
          </div>
        </div>

        <img class="hero-orn left" src="/art/flores.webp" alt="" aria-hidden="true" />
        <img class="hero-orn right" src="/art/flores.webp" alt="" aria-hidden="true" />

        <div class="hero-content">
          <p class="eyebrow hero-in" style="--d: 0">O nosso grande dia</p>
          <h1 aria-label="Stefania e Henrique">
            <span class="word" aria-hidden="true">
              <span v-for="(c, i) in titleFirst" :key="'a' + i" class="char" :style="{ '--c': i }">{{ c }}</span>
            </span>
            <em class="amp hero-in" style="--d: 4" aria-hidden="true">&amp;</em>
            <span class="word" aria-hidden="true">
              <span v-for="(c, i) in titleSecond" :key="'b' + i" class="char" :style="{ '--c': i + 10 }">{{ c }}</span>
            </span>
          </h1>
          <p class="hero-date hero-in" style="--d: 6">
            <b></b><span>22</span><i></i><span>agosto</span><i></i><span>2027</span><b></b>
          </p>
        </div>

        <div class="hero-bottom">
          <div class="countdown hero-in" style="--d: 7" role="timer" aria-label="Contagem regressiva para o casamento">
            <template v-if="!weddingArrived">
              <div v-for="item in countdown" :key="item.label" class="count-item">
                <div class="count-num">
                  <Transition name="tick">
                    <strong :key="item.n">{{ item.n }}</strong>
                  </Transition>
                </div>
                <span>{{ item.label }}</span>
              </div>
            </template>
            <p v-else class="count-done">Hoje é o grande dia! ♡</p>
          </div>

          <a href="#cerimonia" class="scroll-cue hero-in" style="--d: 8">
            <span>Descubra nosso grande dia</span>
            <ArrowDown :size="16" />
          </a>
        </div>
      </section>

      <!-- Faixa animada -->
      <div class="marquee" aria-hidden="true">
        <div class="marquee-track">
          <span v-for="(_, i) in marquee" :key="i">
            Stefania <em>&amp;</em> Henrique <b>✦</b> 22 . 08 . 2027 <b>✦</b> Lauro de Freitas <b>✦</b>
          </span>
        </div>
      </div>

      <!-- Cerimônia -->
      <section id="cerimonia" class="ceremony section-wrap">
        <div class="ceremony-copy">
          <p v-reveal class="eyebrow">22 . 08 . 2027</p>
          <h2 v-reveal="100">O dia em que<br /><i>diremos sim.</i></h2>
          <p v-reveal="200" class="lead">
            Com muito amor, estamos preparando um dia especial para celebrar nossa união. Será uma
            alegria ter você ao nosso lado.
          </p>
          <div class="details">
            <div v-reveal:left="250" class="detail">
              <span class="detail-icon"><CalendarDays :size="20" /></span>
              <div><small>Data</small><strong>Domingo, 22 de agosto de 2027</strong></div>
            </div>
            <div v-reveal:left="350" class="detail">
              <span class="detail-icon"><Clock3 :size="20" /></span>
              <div><small>Horário</small><strong>15h30</strong></div>
            </div>
          </div>
          <div v-reveal:scale="450" class="venue-card">
            <span class="venue-label"><MapPin :size="16" /> Local</span>
            <strong class="venue-name">Cerimônia · <i>Cerimonial Casa Rio</i></strong>
            <p class="venue-address">R. João Marques de Oliveira, 53<br />Buraquinho — Lauro de Freitas, BA</p>
          </div>
          <div v-reveal="550" class="ceremony-actions">
            <a class="btn btn-outline" :href="mapUrl" target="_blank" rel="noopener noreferrer">
              Como chegar <ExternalLink :size="16" />
            </a>
            <button class="btn btn-navy" @click="openRSVP">
              Confirmar presença <ArrowUpRight :size="16" />
            </button>
          </div>
        </div>
        <div class="ceremony-art">
          <div v-reveal:clip class="arch">
            <img
              data-parallax="-0.08"
              src="/art/casa-rio-foto.webp"
              alt="Cerimonial Casa Rio: casarão entre coqueiros refletido no lago"
              loading="lazy"
            />
          </div>
          <div v-reveal:scale="500" class="art-stamp">Um dia<br /><i>inesquecível</i></div>
          <p class="art-note">Cerimonial Casa Rio · Lauro de Freitas, BA</p>
        </div>
      </section>

      <!-- Citação -->
      <section class="quote-band">
        <div class="quote-glow" aria-hidden="true"></div>
        <div v-reveal class="quote-inner">
          <Heart class="quote-heart" :size="24" stroke-width="1.2" />
          <p class="quote-text">
            <span v-for="(w, i) in quoteWords" :key="i" :style="{ '--w': i }">{{ w }}</span>
          </p>
          <span class="quote-ref">1 Coríntios 13:4</span>
        </div>
      </section>

      <!-- Galeria -->
      <section id="galeria" class="gallery section-wrap">
        <div class="section-heading">
          <p v-reveal class="eyebrow">Memórias e detalhes</p>
          <h2 v-reveal="100">Instantes de <i>amor</i></h2>
          <p v-reveal="200">Uma pequena inspiração visual para o dia que estamos preparando.</p>
        </div>
        <div class="gallery-grid">
          <figure
            v-for="(pic, i) in pictures"
            :key="pic.src"
            v-reveal:clip="i * 120"
            :class="pic.cls"
          >
            <button class="gallery-btn" :aria-label="`Ampliar: ${pic.caption}`" @click="openLightbox(i)">
              <img :src="pic.src" :alt="pic.caption" loading="lazy" />
              <span class="gallery-overlay">
                <span>{{ pic.caption }}</span>
                <Expand :size="18" />
              </span>
            </button>
          </figure>
        </div>
        <p class="gallery-note">Imagens conceituais de inspiração. Fotos reais poderão ser adicionadas depois.</p>
      </section>

      <!-- Presentes -->
      <section id="presentes" class="gifts">
        <div class="gift-art">
          <img data-parallax="-0.06" src="/art/presente.webp" alt="Presente elegante com laço champagne e etiqueta com o monograma SH" loading="lazy" />
        </div>
        <div class="gift-copy">
          <span v-reveal:scale class="gift-icon"><Gift :size="26" stroke-width="1.3" /></span>
          <p v-reveal="100" class="eyebrow">Com carinho</p>
          <h2 v-reveal="200">O melhor presente<br />é ter <i>você aqui.</i></h2>
          <p v-reveal="300">
            O mais importante é celebrar este momento ao seu lado. Mas, se quiser nos presentear,
            preparamos uma lista de presentes de outro mundo — de um bate e volta na Lua a um piquenique nos anéis de Saturno.
          </p>
          <a v-reveal="400" href="#/presentes" class="btn btn-navy">
            Ver lista de presentes <ArrowUpRight :size="16" />
          </a>
        </div>
      </section>

      <!-- RSVP -->
      <section id="presenca" class="rsvp-section">
        <div class="petals" aria-hidden="true">
          <span
            v-for="(p, i) in petals"
            :key="i"
            :style="{ left: p.left, animationDelay: p.delay, animationDuration: p.duration, '--s': p.scale }"
          ></span>
        </div>
        <div class="rsvp-inner">
          <img v-reveal:scale class="rsvp-logo" src="/logo-light.png" alt="" />
          <p v-reveal="100" class="eyebrow">Confirmação de presença</p>
          <h2 v-reveal="200">Esperamos por <i>você.</i></h2>
          <p v-reveal="300">
            Sua presença fará nosso dia ainda mais especial. Conte para nós se poderá celebrar conosco.
          </p>
          <button v-reveal="400" class="btn btn-champagne" @click="openRSVP">
            Confirmar presença <ArrowUpRight :size="16" />
          </button>
        </div>
      </section>
    </main>

    <GiftsPage v-if="page === 'gifts'" @rsvp="openRSVP" />

    <footer>
      <img v-reveal:scale src="/logo.png" alt="Monograma SH" />
      <p>Stefania &amp; Henrique</p>
      <small>22 de agosto de 2027 · Lauro de Freitas, BA</small>
      <span>Feito com amor <Heart :size="12" class="beat" /></span>
    </footer>

    <!-- Modal RSVP -->
    <Transition name="modal">
      <div v-if="rsvpOpen" class="modal-backdrop" @click.self="closeRSVP">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="rsvp-title">
          <button class="modal-close" aria-label="Fechar" @click="closeRSVP"><X :size="22" /></button>
          <Transition name="swap" mode="out-in">
            <!-- Etapa 1: código do convite -->
            <div v-if="rsvpStep === 'code'" key="code">
              <p class="eyebrow">RSVP · Etapa 1 de 2</p>
              <h2 id="rsvp-title">Confirme sua <i>presença</i></h2>
              <p class="modal-lead">Digite o código de 6 caracteres que está no seu convite.</p>
              <form @submit.prevent="submitCode">
                <label for="invite-code">Código do convite</label>
                <input
                  id="invite-code"
                  :class="['code-input', { invalid: codeError }]"
                  :value="inviteCode"
                  required
                  minlength="6"
                  maxlength="6"
                  autocomplete="off"
                  autocapitalize="characters"
                  spellcheck="false"
                  placeholder="ABC123"
                  :aria-invalid="!!codeError"
                  aria-describedby="code-error"
                  @input="onCodeInput"
                />
                <Transition name="fade-height">
                  <p v-if="codeError" id="code-error" class="form-error" role="alert">{{ codeError }}</p>
                </Transition>
                <button class="btn btn-navy" type="submit" :disabled="inviteCode.length < 6">
                  Continuar <ArrowUpRight :size="16" />
                </button>
              </form>
              <small class="modal-disclaimer"
                >Protótipo: a confirmação não é enviada nem armazenada. Para testar, use os códigos
                <b>ABC123</b>, <b>XYZ789</b> ou <b>FAM456</b>.</small
              >
            </div>

            <!-- Etapa 2: convidados do convite -->
            <div v-else-if="rsvpStep === 'guests'" key="guests">
              <button class="back-link" type="button" @click="backToCode">
                <ArrowLeft :size="15" /> Trocar código
              </button>
              <p class="eyebrow">RSVP · Etapa 2 de 2</p>
              <h2 id="rsvp-title">Olá, <i>{{ invite.label }}</i></h2>
              <p class="modal-lead">
                {{
                  invite.guests.length > 1
                    ? 'Este convite inclui as pessoas abaixo. Conte para nós quem poderá celebrar conosco.'
                    : 'Conte para nós se poderá celebrar conosco.'
                }}
              </p>
              <form @submit.prevent="submitRSVP">
                <div v-if="invite.guests.length > 1" class="bulk-actions">
                  <button type="button" @click="setAllAnswers('sim')">Todos vão</button>
                  <button type="button" @click="setAllAnswers('nao')">Ninguém poderá ir</button>
                </div>
                <ul class="guest-list">
                  <li
                    v-for="(name, i) in invite.guests"
                    :key="name"
                    class="guest-row"
                    :style="{ '--i': i }"
                  >
                    <span class="guest-name">{{ name }}</span>
                    <div class="choice" role="radiogroup" :aria-label="`Presença de ${name}`">
                      <button
                        type="button"
                        role="radio"
                        :aria-checked="answers[i] === 'sim'"
                        :class="['choice-btn yes', { on: answers[i] === 'sim' }]"
                        @click="setAnswer(i, 'sim')"
                      >
                        <Check :size="14" /> Vou
                      </button>
                      <button
                        type="button"
                        role="radio"
                        :aria-checked="answers[i] === 'nao'"
                        :class="['choice-btn no', { on: answers[i] === 'nao' }]"
                        @click="setAnswer(i, 'nao')"
                      >
                        <X :size="14" /> Não vou
                      </button>
                    </div>
                  </li>
                </ul>
                <button class="btn btn-navy" type="submit" :disabled="!allAnswered">
                  Confirmar resposta <ArrowUpRight :size="16" />
                </button>
                <p v-if="!allAnswered" class="form-hint">Responda para cada convidado para continuar.</p>
              </form>
            </div>

            <!-- Concluído -->
            <div v-else key="done" class="modal-success">
              <span class="success-check"><Check :size="34" /></span>
              <h2 id="rsvp-title">{{ confirmedGuests.length ? 'Obrigado!' : 'Sentiremos sua falta' }}</h2>
              <p v-if="confirmedGuests.length">
                Que alegria! Estamos ansiosos para celebrar com
                {{ confirmedGuests.length > 1 ? 'vocês' : 'você' }}.
              </p>
              <p v-else>Obrigado por nos avisar. Você estará em nossos corações nesse dia.</p>
              <div class="rsvp-summary">
                <div v-if="confirmedGuests.length">
                  <small>Presença confirmada</small>
                  <span v-for="name in confirmedGuests" :key="name" class="tag yes">{{ name }}</span>
                </div>
                <div v-if="declinedGuests.length">
                  <small>Não poderão ir</small>
                  <span v-for="name in declinedGuests" :key="name" class="tag no">{{ name }}</span>
                </div>
              </div>
              <small class="modal-disclaimer"
                >Demonstração: para receber confirmações reais, será necessário conectar o formulário a um
                serviço de dados.</small
              >
              <button class="btn btn-outline" @click="closeRSVP">Fechar</button>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>

    <!-- Lightbox -->
    <Transition name="modal">
      <div v-if="lightbox >= 0" class="lightbox" @click.self="lightbox = -1">
        <button class="lb-close" aria-label="Fechar" @click="lightbox = -1"><X :size="26" /></button>
        <button class="lb-nav prev" aria-label="Anterior" @click="stepLightbox(-1)"><ChevronLeft :size="30" /></button>
        <Transition name="swap" mode="out-in">
          <figure :key="lightbox">
            <img :src="pictures[lightbox].src" :alt="pictures[lightbox].caption" />
            <figcaption>{{ pictures[lightbox].caption }}</figcaption>
          </figure>
        </Transition>
        <button class="lb-nav next" aria-label="Próxima" @click="stepLightbox(1)"><ChevronRight :size="30" /></button>
      </div>
    </Transition>
  </div>
</template>
