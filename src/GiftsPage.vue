<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { ArrowLeft, ArrowUpRight, X, Heart, QrCode, Sparkles, Copy, Check } from 'lucide-vue-next';
import { gifts, priceRanges, formatPrice } from './gifts.js';
import { vReveal } from './reveal.js';
import { getSiteConfig } from './api.js';
import { buildPix, pixQrSvg, pixConfigured } from './pix.js';
import GiftArt from './GiftArt.vue';

const emit = defineEmits(['rsvp']);

const range = ref('todos');
const visibleGifts = computed(() => {
  const r = priceRanges.find((x) => x.id === range.value);
  return gifts.filter((g) => r.test(g.price));
});
const selected = ref(null);

/* ---------- Dados do Pix (configurados na área dos noivos) ---------- */
const config = ref(null);
const configError = ref(false);
onMounted(async () => {
  try {
    config.value = await getSiteConfig();
  } catch {
    configError.value = true;
  }
});
const pixReady = computed(() => pixConfigured(config.value));

/* ---------- Presente com valor livre ---------- */
const customAmount = ref('');
const customValue = computed(() => {
  const n = Number(String(customAmount.value).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
});
function chooseCustom() {
  if (customValue.value < 1) return;
  selected.value = {
    id: 'livre',
    title: 'Presente com carinho',
    price: customValue.value,
  };
}

/* ---------- QR Code e copia e cola do presente escolhido ---------- */
const pixCode = ref('');
const qrSvg = ref('');
const copied = ref(false);
watch([selected, config], async ([g, c]) => {
  pixCode.value = '';
  qrSvg.value = '';
  copied.value = false;
  if (!g || !pixConfigured(c)) return;
  pixCode.value = buildPix({
    chave: c.pixChave,
    nome: c.pixNome,
    cidade: c.pixCidade,
    valor: g.price,
  });
  qrSvg.value = await pixQrSvg(pixCode.value);
});
async function copyPix() {
  try {
    await navigator.clipboard.writeText(pixCode.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 2200);
  } catch {
    window.prompt('Copie o código Pix abaixo:', pixCode.value);
  }
}

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
// o modal do Pix fecha apenas pelo X (ou pelo botão "Escolher outro presente")
watch(selected, (g) => document.documentElement.classList.toggle('no-scroll', !!g));
onUnmounted(() => {
  document.documentElement.classList.remove('no-scroll');
});
</script>

<template>
  <main class="gifts-page">
    <section class="gp-hero">
      <div class="gp-hero-content">
        <a href="#presentes" class="gp-back hero-in" style="--d: 0"><ArrowLeft :size="15" /> Voltar ao site</a>
        <p class="eyebrow hero-in" style="--d: 1">Lista de presentes</p>
        <h1 class="hero-in" style="--d: 2">Presentes para <i>sonhar alto</i></h1>
        <p class="gp-lead hero-in" style="--d: 3">
          Todos os presentes viram Pix para os noivos, mas a gente prefere imaginar que você nos deu
          mesmo uma viagem à Lua. Escolha o seu favorito.
        </p>
      </div>
      <figure class="gp-hero-photo hero-in" style="--d: 2">
        <img src="/art/presente.webp" alt="Presente embrulhado em papel branco com laço champagne e etiqueta com o monograma SH" />
      </figure>
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
          <div class="gift-art-frame"><GiftArt :name="g.id" /></div>
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

      <!-- Valor livre -->
      <form v-reveal class="gp-note gp-custom" @submit.prevent="chooseCustom">
        <div class="gp-custom-art"><GiftArt name="livre" /></div>
        <div class="gp-custom-copy">
          <h2>Prefere escolher o valor?</h2>
          <p>Fique à vontade para presentear com qualquer valor. O mais importante é celebrar com você.</p>
          <div class="gp-custom-row">
            <label class="gp-amount">
              <span>R$</span>
              <input
                v-model="customAmount"
                inputmode="decimal"
                placeholder="0,00"
                aria-label="Valor do presente em reais"
              />
            </label>
            <button class="btn btn-navy" type="submit" :disabled="customValue < 1">
              Gerar Pix <ArrowUpRight :size="14" />
            </button>
          </div>
          <button type="button" class="gp-rsvp-link" @click="emit('rsvp')">
            <Heart :size="14" /> Ainda não confirmou presença? Confirme aqui
          </button>
        </div>
      </form>
    </section>

    <!-- QR Code -->
    <Transition name="modal">
      <div v-if="selected" class="modal-backdrop">
        <div class="modal qr-modal" role="dialog" aria-modal="true" aria-labelledby="qr-title">
          <button class="modal-close" aria-label="Fechar" @click="close"><X :size="22" /></button>
          <div class="confetti" aria-hidden="true">
            <i
              v-for="(c, i) in confetti"
              :key="i"
              :style="{ '--a': c.angle, '--dist': c.dist, background: c.color, animationDelay: c.delay }"
            ></i>
          </div>
          <div class="qr-art"><GiftArt :key="selected.id" :name="selected.id" autoplay /></div>
          <p class="eyebrow">Você escolheu</p>
          <h2 id="qr-title">{{ selected.title }}</h2>
          <p class="qr-price">{{ formatPrice(selected.price) }}</p>

          <template v-if="pixReady">
            <div class="qr-box">
              <div v-if="qrSvg" class="qr-real" role="img" :aria-label="`QR Code Pix de ${formatPrice(selected.price)}`" v-html="qrSvg"></div>
            </div>
            <p class="qr-help"><QrCode :size="15" /> Aponte a câmera do app do seu banco ou copie o código.</p>
            <button class="btn btn-navy qr-copy" type="button" @click="copyPix">
              <Check v-if="copied" :size="15" /><Copy v-else :size="15" />
              {{ copied ? 'Código copiado!' : 'Copiar Pix copia e cola' }}
            </button>
          </template>
          <p v-else class="qr-warning">
            <QrCode :size="15" />
            {{ configError ? 'Não conseguimos carregar o Pix agora. Tente novamente em instantes.' : 'O Pix será disponibilizado em breve.' }}
          </p>

          <p class="qr-thanks"><Sparkles :size="15" /> Obrigado pelo carinho (e por sonhar junto com a gente)!</p>
          <button class="btn btn-outline" @click="close">Escolher outro presente</button>
        </div>
      </div>
    </Transition>
  </main>
</template>
