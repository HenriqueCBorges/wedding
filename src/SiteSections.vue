<script setup>
// Seções informativas do site: dress code e perguntas frequentes.
// Conteúdo fixo, no visual das demais seções do site.
import { ref } from 'vue';
import { Plus } from 'lucide-vue-next';
import { vReveal } from './reveal.js';
import { MAP_URL } from './calendar.js';

const props = defineProps({ part: String, deadline: String });

/* ---------- Dress code ---------- */
const avoid = [
  { name: 'Branco', color: '#ffffff' },
  { name: 'Off-white', color: '#f6f0e4' },
  { name: 'Bege', color: '#e3d2b4' },
];
const looks = [
  { img: 'dress-1', caption: 'Azul-marinho & verde-esmeralda' },
  { img: 'dress-2', caption: 'Grafite & bordô' },
  { img: 'dress-3', caption: 'Azul-petróleo & índigo' },
];

/* ---------- Perguntas frequentes ---------- */
const faq = [
  {
    q: 'Onde será a cerimônia?',
    a: 'No Cerimonial Casa Rio — R. João Marques de Oliveira, 53, Buraquinho, Lauro de Freitas (BA).',
    link: { href: MAP_URL, label: 'Abrir no mapa' },
  },
  {
    q: 'Que dia e que horas?',
    a: 'Domingo, 22 de agosto de 2027, às 15h30. Sugerimos chegar uns 30 minutos antes para se acomodar com calma.',
  },
  { q: 'Qual é o traje?', a: 'Esporte fino ou social.' },
  {
    q: 'Que cores devo evitar?',
    a: 'Branco, off-white e bege — esses tons ficam para a noiva. Todas as outras cores são muito bem-vindas!',
  },
  {
    q: 'Como confirmo minha presença?',
    a: 'Pelo botão "Confirmar presença", com o código de 6 letras e números do seu convite (ou pelo link que você recebeu). Dá para mudar a resposta depois, com o mesmo código.',
    deadline: true,
  },
  {
    q: 'Posso levar acompanhante?',
    a: 'O convite é nominal: na hora de confirmar aparecem exatamente as pessoas incluídas no seu convite. Se tiver alguma dúvida, fale com a gente.',
  },
  {
    q: 'Crianças podem ir?',
    a: 'As crianças convidadas já aparecem pelo nome no convite da família, na tela de confirmação.',
  },
  {
    q: 'Como funciona a lista de presentes?',
    a: 'Cada presente da lista vira um Pix com o valor certo — é só ler o QR Code ou copiar o código. Nada é obrigatório: o melhor presente é ter você lá.',
    link: { href: '#/presentes', label: 'Ver lista de presentes', internal: true },
  },
  {
    q: 'Perdi o código do convite. E agora?',
    a: 'Fale com a gente que reenviamos o link. E se você já confirmou neste celular, o código aparece preenchido sozinho.',
  },
];
const open = ref(-1);
</script>

<template>
  <!-- ============ Dress code ============ -->
  <section v-if="part === 'dress'" id="dress-code" class="ss ss-dress section-wrap">
    <div class="section-heading">
      <p v-reveal class="eyebrow">Dress code</p>
      <h2 v-reveal="100">Esporte fino <i>&amp; social</i></h2>
      <p v-reveal="200">Venha elegante e confortável para celebrar com a gente à beira do lago.</p>
    </div>

    <ul class="ss-looks">
      <li v-for="(l, i) in looks" :key="l.img" v-reveal="i * 140">
        <figure>
          <picture>
            <source type="image/avif" :srcset="`/art/${l.img}.avif`" />
            <img :src="`/art/${l.img}.webp`" :alt="`Exemplo de traje: ${l.caption}`" loading="lazy" width="494" height="1000" />
          </picture>
          <figcaption>{{ l.caption }}</figcaption>
        </figure>
      </li>
    </ul>

    <div v-reveal="200" class="ss-colors">
      <div class="ss-colors-avoid">
        <small>Por favor, evite</small>
        <ul>
          <li v-for="(c, i) in avoid" :key="c.name" :style="{ '--d': 300 + i * 140 + 'ms' }">
            <span class="ss-swatch" :style="{ background: c.color }"></span>
            <span>{{ c.name }}</span>
          </li>
        </ul>
      </div>
      <p class="ss-colors-note">
        Esses tons ficam reservados para a noiva.<br />
        <b>Todas as outras cores são muito bem-vindas.</b>
      </p>
    </div>
  </section>

  <!-- ============ Perguntas frequentes ============ -->
  <section v-else-if="part === 'faq'" id="faq" class="ss ss-faq section-wrap">
    <div class="ss-head">
      <p v-reveal class="eyebrow">Dúvidas</p>
      <h2 v-reveal="100">Perguntas <i>frequentes</i></h2>
    </div>
    <ul class="ss-faq-list">
      <li v-for="(f, i) in faq" :key="f.q" v-reveal="Math.min(i, 6) * 60" :class="{ open: open === i }">
        <button type="button" :aria-expanded="open === i" :aria-controls="`faq-${i}`" @click="open = open === i ? -1 : i">
          <span class="ss-qn serif">{{ String(i + 1).padStart(2, '0') }}</span>
          <span class="ss-q">{{ f.q }}</span>
          <Plus class="ss-plus" :size="18" />
        </button>
        <div :id="`faq-${i}`" class="ss-answer">
          <div>
            <p>
              {{ f.a }}
              <template v-if="f.deadline && deadline"> Por favor, responda até <b>{{ deadline }}</b>.</template>
            </p>
            <a
              v-if="f.link"
              class="ss-faq-link"
              :href="f.link.href"
              :target="f.link.internal ? undefined : '_blank'"
              :rel="f.link.internal ? undefined : 'noopener noreferrer'"
            >
              {{ f.link.label }} →
            </a>
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.ss-head {
  display: grid;
  justify-items: center;
  gap: 4px;
  margin-bottom: 44px;
  text-align: center;
}
.ss-head h2 {
  margin: 0;
}
/* ---------- Dress code ---------- */
.ss-looks {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px;
  max-width: 1080px;
  margin: 0 auto;
  padding: 0;
  list-style: none;
}
.ss-looks li:nth-child(2) {
  margin-top: 40px;
}
.ss-looks figure {
  margin: 0;
}
.ss-looks picture {
  display: block;
  overflow: hidden;
  aspect-ratio: 494 / 820;
  border-radius: 999px 999px 18px 18px;
  background: #6d82a6;
  box-shadow: 0 16px 30px -22px rgba(11, 31, 73, 0.45);
}
.ss-looks img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 12%;
  transition: transform 1.2s var(--ease-out);
}
.ss-looks li:hover img {
  transform: scale(1.05);
}
.ss-looks figcaption {
  margin-top: 14px;
  text-align: center;
  font-family: var(--script);
  font-style: italic;
  font-size: 1.2rem;
  color: var(--navy);
}

/* faixa das cores: linhas finas, como os detalhes da cerimônia */
.ss-colors {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 18px 48px;
  max-width: 820px;
  margin: 64px auto 0;
  padding: 26px 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}
.ss-colors-avoid {
  display: flex;
  align-items: center;
  gap: 18px;
}
.ss-colors-avoid > small {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--gold-ink);
}
.ss-colors-avoid ul {
  display: flex;
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.ss-colors-avoid li {
  display: grid;
  justify-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--ink-soft);
}
.ss-swatch {
  position: relative;
  display: block;
  width: 38px;
  height: 38px;
  border: 1px solid rgba(11, 31, 73, 0.2);
  border-radius: 50%;
}
/* um traço atravessa cada tom quando a faixa aparece */
.ss-swatch::after {
  content: '';
  position: absolute;
  left: -3px;
  right: -3px;
  top: 50%;
  height: 1.5px;
  background: #b3423a;
  transform: rotate(-45deg) scaleX(0);
  transition: transform 0.6s var(--d) var(--ease-out);
}
.visible .ss-swatch::after {
  transform: rotate(-45deg) scaleX(1);
}
.ss-colors-note {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--ink-soft);
}
.ss-colors-note b {
  font-weight: 500;
  color: var(--navy);
}

/* ---------- Perguntas frequentes ---------- */
.ss-faq {
  max-width: 880px;
}
.ss-faq-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.ss-faq-list li {
  border: 1px solid var(--line);
  border-radius: 18px;
  background: #fff;
  transition:
    border-color 0.3s,
    box-shadow 0.3s;
}
.ss-faq-list li.open {
  border-color: rgba(180, 147, 104, 0.55);
  box-shadow: 0 16px 34px -24px rgba(11, 31, 73, 0.35);
}
.ss-faq-list button {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 18px 22px;
  border: 0;
  background: none;
  color: var(--navy);
  text-align: left;
}
.ss-qn {
  flex: none;
  width: 30px;
  font-size: 1.15rem;
  color: var(--gold-ink);
}
.ss-q {
  flex: 1;
  font-size: 15.5px;
  font-weight: 500;
}
.ss-plus {
  flex: none;
  color: var(--gold);
  transition: transform 0.45s var(--ease-out);
}
.open .ss-plus {
  transform: rotate(135deg);
}
.ss-answer {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.5s var(--ease-out);
}
.open .ss-answer {
  grid-template-rows: 1fr;
}
.ss-answer > div {
  overflow: hidden;
  padding: 0 22px 0 66px;
}
.ss-answer p {
  margin: 0 0 14px;
  color: var(--ink-soft);
  font-size: 14.5px;
}
.ss-faq-link {
  display: inline-block;
  margin: -4px 0 16px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--gold-ink);
}

@media (max-width: 620px) {
  /* no celular, os looks deslizam para o lado */
  .ss-looks {
    display: flex;
    gap: 14px;
    margin: 0 -22px;
    padding: 0 22px 8px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
  }
  .ss-looks li {
    flex: 0 0 68%;
    scroll-snap-align: center;
  }
  .ss-looks li:nth-child(2) {
    margin-top: 0;
  }
  .ss-colors {
    flex-direction: column;
    gap: 14px;
    text-align: center;
  }
  .ss-colors-avoid {
    flex-direction: column;
    gap: 10px;
  }
  .ss-answer > div {
    padding: 0 18px 0 18px;
  }
  .ss-faq-list button {
    padding: 16px 18px;
  }
}
</style>
