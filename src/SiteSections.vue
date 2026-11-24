<script setup>
// Seções informativas do site: dress code, hospedagem e dicas, perguntas frequentes.
// Conteúdo fixo, no mesmo traço das ilustrações da lista de presentes.
import { ref } from 'vue';
import { MapPin, Plus, ExternalLink, Check, X } from 'lucide-vue-next';
import { vReveal } from './reveal.js';
import GiftArt from './GiftArt.vue';
import { MAP_URL } from './calendar.js';

const props = defineProps({ part: String, deadline: String });

const maps = (q) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);

/* ---------- Dress code ---------- */
const avoid = [
  { name: 'Branco', color: '#ffffff' },
  { name: 'Off-white', color: '#f6f0e4' },
  { name: 'Bege', color: '#e3d2b4' },
];
const welcome = ['#1b3474', '#2f6b5a', '#7a2e3a', '#c9786a', '#5d4a8a', '#c9a24a', '#3d7fae', '#1d1d24'];

/* ---------- Hospedagem e dicas (Vilas do Atlântico fica ao lado de Buraquinho) ---------- */
const tips = [
  {
    art: 'cama',
    kind: 'Hospedagem',
    title: 'Pousada Villas do Atlântico',
    text: 'A poucos passos da praia de Vilas, com piscinas, restaurante e café da manhã. Pertinho do Cerimonial.',
    link: maps('Pousada Villas do Atlântico, Lauro de Freitas - BA'),
  },
  {
    art: 'cama',
    kind: 'Hospedagem',
    title: 'Villa Flamboyan',
    text: 'Em Vilas do Atlântico, a uma caminhada da praia de Buraquinho e do shopping Villas Boulevard.',
    link: maps('Villa Flamboyan, Vilas do Atlântico, Lauro de Freitas - BA'),
  },
  {
    art: 'cama',
    kind: 'Hospedagem',
    title: 'Malibu Plaza Hotel',
    text: 'Outra opção no bairro, a poucos minutos de carro do local da cerimônia.',
    link: maps('Malibu Plaza Hotel, Lauro de Freitas - BA'),
  },
  {
    art: 'beleza',
    kind: 'Beleza',
    title: 'Salões em Vilas do Atlântico',
    text: 'Para cabelo e maquiagem no dia, há vários salões no bairro. Reserve com antecedência: domingo é dia concorrido!',
    link: maps('salão de beleza, Vilas do Atlântico, Lauro de Freitas - BA'),
  },
  {
    art: 'praia',
    kind: 'Onde comer',
    title: 'Villas Beach',
    text: 'Bar e restaurante pé na areia, com petiscos e refeições de frente para o mar.',
    link: maps('Villas Beach, Vilas do Atlântico, Lauro de Freitas - BA'),
  },
  {
    art: 'talheres',
    kind: 'Onde comer',
    title: 'ZunZunZum Pub',
    text: 'Petiscaria com toque gourmet na Av. Praia de Itapuã, em Vilas do Atlântico.',
    link: maps('ZunZunZum Pub, Av. Praia de Itapuã, 1734, Lauro de Freitas - BA'),
  },
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
    q: 'Onde posso me hospedar?',
    a: 'Separamos algumas opções em Vilas do Atlântico, bairro vizinho ao Cerimonial, na seção "Hospedagem e dicas".',
    link: { href: '#dicas', label: 'Ver dicas', internal: true },
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
  <section v-if="part === 'dress'" id="dress-code" class="ss ss-dress">
    <div class="ss-dress-card">
      <div class="ss-dress-figs" aria-hidden="true">
        <div v-reveal:left class="ss-fig"><GiftArt name="vestido" /></div>
        <div v-reveal:left="150" class="ss-fig"><GiftArt name="terno" /></div>
      </div>
      <div class="ss-dress-copy">
        <p v-reveal class="eyebrow">Dress code</p>
        <h2 v-reveal="100">Esporte fino <i>&amp;</i> social</h2>
        <p v-reveal="200" class="ss-lead">Venha elegante e confortável para celebrar com a gente à beira do lago.</p>

        <div v-reveal="300" class="ss-swatches">
          <p class="ss-label"><X :size="14" /> Por favor, evite</p>
          <ul>
            <li v-for="(c, i) in avoid" :key="c.name" :style="{ '--d': i * 120 + 'ms' }">
              <span class="ss-swatch no" :style="{ background: c.color }"></span>
              <small>{{ c.name }}</small>
            </li>
          </ul>
          <p class="ss-note">Esses tons ficam reservados para a noiva.</p>
        </div>

        <div v-reveal="400" class="ss-swatches">
          <p class="ss-label ok"><Check :size="14" /> Todas as outras cores são bem-vindas</p>
          <ul class="ss-welcome">
            <li v-for="(c, i) in welcome" :key="c" :style="{ '--d': i * 70 + 'ms' }">
              <span class="ss-swatch" :style="{ background: c }"></span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>

  <!-- ============ Hospedagem e dicas ============ -->
  <section v-else-if="part === 'dicas'" id="dicas" class="ss ss-dicas section-wrap">
    <div class="ss-head">
      <p v-reveal class="eyebrow">Para quem vem de longe</p>
      <h2 v-reveal="100">Hospedagem e <i>dicas</i></h2>
      <p v-reveal="200" class="ss-sub">
        Vilas do Atlântico fica colado em Buraquinho: dá para ficar pertinho do Cerimonial e ainda aproveitar a praia.
      </p>
    </div>
    <ul class="ss-tips">
      <li v-for="(t, i) in tips" :key="t.title" v-reveal="(i % 3) * 110" class="ss-tip">
        <div class="ss-tip-art"><GiftArt :name="t.art" /></div>
        <span class="ss-kind">{{ t.kind }}</span>
        <h3>{{ t.title }}</h3>
        <p>{{ t.text }}</p>
        <a :href="t.link" target="_blank" rel="noopener noreferrer"><MapPin :size="14" /> Ver no mapa <ExternalLink :size="12" /></a>
      </li>
    </ul>
    <p v-reveal class="ss-disclaimer">Sugestões para facilitar a sua viagem — não temos parceria com nenhum desses lugares.</p>
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
.ss-sub {
  max-width: 560px;
  margin: 8px 0 0;
  color: var(--ink-soft);
}

/* ---------- Dress code ---------- */
.ss-dress {
  padding: 40px 6% 110px;
}
.ss-dress-card {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  align-items: center;
  gap: 40px;
  max-width: 1080px;
  margin: 0 auto;
  padding: 48px clamp(22px, 4vw, 56px);
  border: 1px solid rgba(29, 58, 138, 0.16);
  border-radius: 28px;
  background:
    radial-gradient(ellipse at 20% 0%, rgba(255, 255, 255, 0.85), transparent 60%),
    #fcf1e5;
  box-shadow: 0 30px 60px -40px rgba(11, 31, 73, 0.4);
}
.ss-dress-card::before {
  content: '';
  position: absolute;
  inset: 10px;
  border: 1px solid rgba(180, 147, 104, 0.35);
  border-radius: 21px;
  pointer-events: none;
}
.ss-dress-figs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.ss-fig {
  padding: 10px;
  border: 1px solid rgba(29, 58, 138, 0.18);
  border-radius: 999px 999px 18px 18px;
  background: rgba(255, 255, 255, 0.55);
}
.ss-fig:nth-child(2) {
  margin-top: 36px;
}
.ss-dress-copy h2 {
  margin: 6px 0 10px;
}
.ss-lead {
  margin: 0 0 22px;
  color: var(--ink-soft);
}
.ss-swatches {
  margin-top: 18px;
}
.ss-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 10px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #9a3b32;
}
.ss-label.ok {
  color: #2e6b3f;
}
.ss-swatches ul {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.ss-swatches li {
  display: grid;
  justify-items: center;
  gap: 6px;
}
.ss-swatches small {
  font-size: 12px;
  color: var(--ink-soft);
}
.ss-swatch {
  position: relative;
  display: block;
  width: 52px;
  height: 52px;
  border: 1px solid rgba(11, 31, 73, 0.18);
  border-radius: 50%;
  box-shadow: inset 0 -6px 12px rgba(0, 0, 0, 0.05);
}
/* tons proibidos: um traço atravessa a bolinha quando ela aparece */
.ss-swatch.no::after {
  content: '';
  position: absolute;
  left: -4px;
  right: -4px;
  top: 50%;
  height: 2px;
  border-radius: 2px;
  background: #b3423a;
  transform: rotate(-45deg) scaleX(0);
  transition: transform 0.6s var(--d) var(--ease-out);
}
.visible .ss-swatch.no::after {
  transform: rotate(-45deg) scaleX(1);
}
.ss-welcome .ss-swatch {
  width: 34px;
  height: 34px;
  transform: scale(0.4);
  opacity: 0;
  transition:
    transform 0.6s var(--d) var(--ease-out),
    opacity 0.6s var(--d);
}
.visible .ss-welcome .ss-swatch {
  transform: none;
  opacity: 1;
}
.ss-note {
  margin: 10px 0 0;
  font-size: 13px;
  color: var(--ink-soft);
}

/* ---------- Dicas ---------- */
.ss-tips {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.ss-tip {
  display: grid;
  align-content: start;
  gap: 8px;
  padding: 18px 20px 22px;
  border: 1px solid rgba(29, 58, 138, 0.14);
  border-radius: 22px;
  background: #fffaf3;
  transition:
    transform 0.45s var(--ease-out),
    box-shadow 0.45s;
}
.ss-tip:hover {
  transform: translateY(-6px);
  box-shadow: 0 24px 48px -24px rgba(11, 31, 73, 0.35);
}
.ss-tip-art {
  margin: -4px -6px 8px;
  padding: 10px 12px 6px;
  border: 1px solid rgba(29, 58, 138, 0.18);
  border-radius: 14px;
  background: #fcf1e5;
}
.ss-kind {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--gold-ink);
}
.ss-tip h3 {
  margin: 0;
  font-family: var(--serif);
  font-size: 1.5rem;
  font-weight: 400;
  line-height: 1.15;
}
.ss-tip p {
  margin: 0;
  color: var(--ink-soft);
  font-size: 14px;
  line-height: 1.65;
}
.ss-tip a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--navy);
}
.ss-tip a:hover {
  color: var(--gold-ink);
}
.ss-disclaimer {
  margin: 22px 0 0;
  text-align: center;
  font-size: 12px;
  color: #6b7280;
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

@media (max-width: 960px) {
  .ss-tips {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .ss-dress-card {
    grid-template-columns: 1fr;
    gap: 26px;
  }
  .ss-dress-figs {
    max-width: 380px;
    margin: 0 auto;
  }
}
@media (max-width: 620px) {
  .ss-tips {
    grid-template-columns: 1fr;
  }
  .ss-dress {
    padding: 20px 16px 80px;
  }
  .ss-answer > div {
    padding: 0 18px 0 18px;
  }
  .ss-faq-list button {
    padding: 16px 18px;
  }
}
</style>
