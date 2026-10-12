<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';
import {
  Menu,
  X,
  ArrowUpRight,
  MapPin,
  CalendarDays,
  Clock3,
  Heart,
  Gift,
  Camera,
  Check,
  ExternalLink,
} from 'lucide-vue-next';
const mobileMenu = ref(false);
const rsvpOpen = ref(false);
const submitted = ref(false);
const guestName = ref('');
const guestCount = ref('1');
const attendance = ref('sim');
const now = ref(Date.now());
const wedding = new Date('2027-08-22T15:30:00-03:00').getTime();
const countdown = computed(() => {
  let seconds = Math.max(0, Math.floor((wedding - now.value) / 1000));
  const days = Math.floor(seconds / 86400);
  seconds %= 86400;
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  return [
    { n: days, label: 'dias' },
    { n: hours, label: 'horas' },
    { n: Math.floor(seconds / 60), label: 'minutos' },
    { n: seconds % 60, label: 'segundos' },
  ];
});
const mapUrl =
  'https://www.google.com/maps/search/?api=1&query=' +
  encodeURIComponent(
    'Cerimonial Casa Rio, R. João Marques de Oliveira, 53, Buraquinho, Lauro de Freitas, BA',
  );
const pictures = [
  { src: '/art/cerimonia-editorial.webp', caption: 'Um dia para celebrar' },
  { src: '/art/galeria.webp', caption: 'Cada pequeno detalhe' },
  { src: '/art/mesa-decorada.webp', caption: 'Feito com amor' },
];
let interval,
  observer,
  renderer,
  scene,
  camera,
  points,
  frame,
  resizeListener,
  motionListener;
const canvasWrap = ref(null);
const reducedMotion = ref(false);
function closeMenu() {
  mobileMenu.value = false;
}
function submitRSVP() {
  submitted.value = true;
} // Demonstração local: não salva nem envia dados.
function initThree() {
  if (!canvasWrap.value || reducedMotion.value) return;
  const width = canvasWrap.value.clientWidth,
    height = canvasWrap.value.clientHeight;
  if (!width || !height) return;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
  camera.position.z = 14;
  renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: false,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(width, height);
  renderer.setClearColor(0x000000, 0);
  canvasWrap.value.appendChild(renderer.domElement);
  const count = 85,
    vertices = new Float32Array(count * 3),
    speeds = [];
  for (let i = 0; i < count; i++) {
    vertices[i * 3] = (Math.random() - 0.5) * 23;
    vertices[i * 3 + 1] = (Math.random() - 0.5) * 15;
    vertices[i * 3 + 2] = (Math.random() - 0.5) * 8;
    speeds.push(0.12 + Math.random() * 0.32);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  const material = new THREE.PointsMaterial({
    color: 0xc8ac83,
    size: 0.055,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
  });
  points = new THREE.Points(geometry, material);
  scene.add(points);
  let previous = 0;
  function animate(t) {
    frame = requestAnimationFrame(animate);
    if (document.hidden) return;
    const dt = Math.min((t - previous) / 1000 || 0, 0.04);
    previous = t;
    const positions = geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 1] += speeds[i] * dt;
      if (positions[i * 3 + 1] > 8) positions[i * 3 + 1] = -8;
    }
    geometry.attributes.position.needsUpdate = true;
    points.rotation.z = Math.sin(t * 0.00012) * 0.035;
    renderer.render(scene, camera);
  }
  frame = requestAnimationFrame(animate);
  resizeListener = () => {
    if (!canvasWrap.value) return;
    const w = canvasWrap.value.clientWidth,
      h = canvasWrap.value.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', resizeListener);
}
onMounted(() => {
  interval = setInterval(() => (now.value = Date.now()), 1000);
  reducedMotion.value = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;
  observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          observer.unobserve(e.target);
        }
      }),
    { threshold: 0.12 },
  );
  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
  initThree();
});
onUnmounted(() => {
  clearInterval(interval);
  observer?.disconnect();
  cancelAnimationFrame(frame);
  if (resizeListener) window.removeEventListener('resize', resizeListener);
  points?.geometry.dispose();
  points?.material.dispose();
  renderer?.dispose();
  renderer?.domElement?.remove();
});
</script>

<template>
  <div>
    <header class="site-header">
      <a
        href="#inicio"
        class="brand"
        aria-label="Voltar ao início"
        @click="closeMenu"
        ><span>S<span class="brand-amp">&</span>H</span></a
      >
      <nav
        :class="['nav', { 'nav-open': mobileMenu }]"
        aria-label="Navegação principal"
      >
        <a href="#inicio" @click="closeMenu">Início</a
        ><a href="#cerimonia" @click="closeMenu">O grande dia</a
        ><a href="#galeria" @click="closeMenu">Galeria</a
        ><a href="#presentes" @click="closeMenu">Presentes</a>
        <button
          class="nav-mobile-rsvp"
          @click="
            rsvpOpen = true;
            closeMenu();
          "
        >
          Confirmar presença
        </button>
      </nav>
      <button class="btn btn-navy header-cta" @click="rsvpOpen = true">
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
    <main>
      <section id="inicio" class="hero">
        <div class="three-layer" ref="canvasWrap" aria-hidden="true"></div>
        <div class="hero-photo">
          <img
            src="/art/cerimonia-editorial.webp"
            alt="Arte romântica de cerimônia com flores claras ao ar livre"
          />
        </div>
        <div class="hero-content reveal">
          <p class="eyebrow">O nosso grande dia</p>
          <img
            class="hero-logo"
            src="/logo-original.png"
            alt="Monograma floral SH — Stefania e Henrique"
          />
          <h1>Stefania <em>&</em> Henrique</h1>
          <p class="hero-date">22 de agosto de 2027</p>
          <div class="tiny-line"></div>
          <p class="hero-quote">
            Dois corações, uma promessa.<br />Uma vida inteira pela frente.
          </p>
          <div
            class="countdown"
            aria-label="Contagem regressiva para o casamento"
          >
            <div v-for="item in countdown" :key="item.label" class="count-item">
              <strong>{{ String(item.n).padStart(2, '0') }}</strong
              ><span>{{ item.label }}</span>
            </div>
          </div>
          <a href="#cerimonia" class="text-link"
            >Descubra nosso grande dia <span>↗</span></a
          >
        </div>
      </section>
      <section id="cerimonia" class="ceremony section-wrap">
        <div class="ceremony-copy reveal">
          <p class="eyebrow">22 . 08 . 2027</p>
          <h2>O dia em que<br /><i>diremos sim.</i></h2>
          <p>
            Com muito amor, estamos preparando um dia especial para celebrar
            nossa união. Será uma alegria ter você ao nosso lado.
          </p>
          <div class="detail">
            <CalendarDays :size="21" />
            <div>
              <small>Data</small><strong>Domingo, 22 de agosto de 2027</strong>
            </div>
          </div>
          <div class="detail">
            <Clock3 :size="21" />
            <div><small>Horário</small><strong>15h30</strong></div>
          </div>
          <div class="detail">
            <MapPin :size="21" />
            <div>
              <small>Cerimônia · Cerimonial Casa Rio</small
              ><strong
                >R. João Marques de Oliveira, 53<br />Buraquinho — Lauro de
                Freitas, BA</strong
              >
            </div>
          </div>
          <a
            class="btn btn-outline"
            :href="mapUrl"
            target="_blank"
            rel="noopener noreferrer"
            >Como chegar <ExternalLink :size="16"
          /></a>
        </div>
        <div class="ceremony-art reveal">
          <img
            src="/art/espaco-aquarela.webp"
            alt="Arte ilustrativa em aquarela de espaço de celebração"
          />
          <div class="art-stamp">Um dia<br /><i>inesquecível</i></div>
          <p>Arte conceitual · não é fotografia do local</p>
        </div>
      </section>
      <section class="quote-band">
        <div class="reveal">
          <Heart :size="22" stroke-width="1.2" />
          <p>“O amor é paciente, o amor é bondoso.”</p>
          <span>1 Coríntios 13:4</span>
        </div>
      </section>
      <section id="galeria" class="gallery section-wrap">
        <div class="section-heading reveal">
          <p class="eyebrow">Memórias e detalhes</p>
          <h2>Instantes de <i>amor</i></h2>
          <p>
            Uma pequena inspiração visual para o dia que estamos preparando.
          </p>
        </div>
        <div class="gallery-grid">
          <figure v-for="(pic, i) in pictures" :key="pic.src" class="reveal">
            <img :src="pic.src" :alt="pic.caption" loading="lazy" />
            <figcaption>{{ pic.caption }}</figcaption>
          </figure>
        </div>
        <p class="gallery-note">
          Imagens conceituais de inspiração. Fotos reais poderão ser adicionadas
          depois.
        </p>
      </section>
      <section id="presentes" class="gifts">
        <div class="gift-art">
          <img
            src="/art/presente.webp"
            alt="Presente elegante com laço champagne"
            loading="lazy"
          />
        </div>
        <div class="gift-copy reveal">
          <Gift :size="28" stroke-width="1.2" />
          <p class="eyebrow">Com carinho</p>
          <h2>O melhor presente<br />é ter <i>você aqui.</i></h2>
          <p>
            O mais importante é celebrar este momento ao seu lado. Em breve,
            disponibilizaremos nossa lista de presentes.
          </p>
          <span class="coming-soon">Lista de presentes em preparação</span>
        </div>
      </section>
      <section id="presenca" class="rsvp-section">
        <div class="reveal">
          <p class="eyebrow">Confirmação de presença</p>
          <h2>Esperamos por <i>você.</i></h2>
          <p>
            Sua presença fará nosso dia ainda mais especial. Conte para nós se
            poderá celebrar conosco.
          </p>
          <button class="btn btn-champagne" @click="rsvpOpen = true">
            Confirmar presença <ArrowUpRight :size="16" />
          </button>
        </div>
      </section>
    </main>
    <footer>
      <img src="/logo-original.png" alt="Monograma SH" />
      <p>Stefania & Henrique</p>
      <small>22 de agosto de 2027 · Lauro de Freitas, BA</small
      ><span>Feito com amor ♡</span>
    </footer>
    <div v-if="rsvpOpen" class="modal-backdrop" @click.self="rsvpOpen = false">
      <div
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rsvp-title"
      >
        <button
          class="modal-close"
          aria-label="Fechar"
          @click="rsvpOpen = false"
        >
          <X :size="22" /></button
        ><template v-if="!submitted"
          ><p class="eyebrow">RSVP</p>
          <h2 id="rsvp-title">Confirme sua <i>presença</i></h2>
          <p>
            Preencha os dados abaixo para visualizar a confirmação de
            demonstração.
          </p>
          <form @submit.prevent="submitRSVP">
            <label
              >Seu nome completo<input
                v-model.trim="guestName"
                required
                minlength="2"
                maxlength="100"
                placeholder="Nome e sobrenome" /></label
            ><label
              >Você estará presente?<select v-model="attendance">
                <option value="sim">Sim, estarei presente!</option>
                <option value="nao">Infelizmente não poderei ir</option>
              </select></label
            ><label v-if="attendance === 'sim'"
              >Quantidade de pessoas (incluindo você)<select
                v-model="guestCount"
              >
                <option value="1">1 pessoa</option>
                <option value="2">2 pessoas</option>
                <option value="3">3 pessoas</option>
                <option value="4">4 pessoas</option>
              </select></label
            ><button class="btn btn-navy" type="submit">
              Continuar <ArrowUpRight :size="16" />
            </button>
          </form>
          <small class="modal-disclaimer"
            >Protótipo: esta confirmação não é enviada nem armazenada. A
            quantidade de acompanhantes depende de validação futura.</small
          ></template
        >
        <div v-else class="modal-success">
          <Check :size="38" />
          <h2>Obrigado, {{ guestName.split(' ')[0] }}!</h2>
          <p>
            Esta é uma demonstração visual. Para receber confirmações reais,
            será necessário conectar o formulário a um serviço de dados.
          </p>
          <button
            class="btn btn-outline"
            @click="
              rsvpOpen = false;
              submitted = false;
            "
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
