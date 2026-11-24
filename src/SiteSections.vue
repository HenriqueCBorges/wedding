<script setup>
// Seções editáveis pelo painel (aba "Site"). Cada uma só aparece quando tem conteúdo.
//   historia  { historiaTitulo, historiaTexto }
//   dress     { dressTitulo, dressTexto }
//   dicas     { dicas: [{ titulo, texto, link }] }
//   faq       { faq: [{ pergunta, resposta }] }
import { computed, ref } from 'vue';
import { Shirt, MapPinned, HelpCircle, ExternalLink, Plus, BookHeart } from 'lucide-vue-next';
import { vReveal } from './reveal.js';

const props = defineProps({ part: String, config: Object });
const c = computed(() => props.config || {});
const paragraphs = (text) =>
  String(text || '')
    .split(/\n\s*\n|\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);

const hasHistoria = computed(() => !!c.value.historiaTexto?.trim());
const hasDress = computed(() => !!(c.value.dressTitulo?.trim() || c.value.dressTexto?.trim()));
const dicas = computed(() => (c.value.dicas || []).filter((d) => d.titulo?.trim()));
const faq = computed(() => (c.value.faq || []).filter((f) => f.pergunta?.trim() && f.resposta?.trim()));
const open = ref(-1);
</script>

<template>
  <!-- Nossa história -->
  <section v-if="part === 'historia' && hasHistoria" id="historia" class="ss ss-historia section-wrap">
    <div class="ss-head">
      <span v-reveal:scale class="ss-icon"><BookHeart :size="22" stroke-width="1.4" /></span>
      <p v-reveal="100" class="eyebrow">Nossa história</p>
      <h2 v-reveal="200">{{ c.historiaTitulo || 'Como tudo ' }}<i v-if="!c.historiaTitulo">começou</i></h2>
    </div>
    <div v-reveal="300" class="ss-story">
      <p v-for="(p, i) in paragraphs(c.historiaTexto)" :key="i">{{ p }}</p>
    </div>
  </section>

  <!-- Dress code -->
  <section v-else-if="part === 'dress' && hasDress" id="dress-code" class="ss ss-dress">
    <div v-reveal class="ss-dress-card">
      <span class="ss-icon"><Shirt :size="22" stroke-width="1.4" /></span>
      <p class="eyebrow">Dress code</p>
      <h2>{{ c.dressTitulo || 'Traje' }}</h2>
      <p v-for="(p, i) in paragraphs(c.dressTexto)" :key="i" class="ss-dress-text">{{ p }}</p>
    </div>
  </section>

  <!-- Hospedagem e dicas -->
  <section v-else-if="part === 'dicas' && dicas.length" id="dicas" class="ss ss-dicas section-wrap">
    <div class="ss-head">
      <span v-reveal:scale class="ss-icon"><MapPinned :size="22" stroke-width="1.4" /></span>
      <p v-reveal="100" class="eyebrow">Para quem vem de longe</p>
      <h2 v-reveal="200">Hospedagem e <i>dicas</i></h2>
    </div>
    <ul class="ss-tips">
      <li v-for="(d, i) in dicas" :key="i" v-reveal="i * 90" class="ss-tip">
        <h3>{{ d.titulo }}</h3>
        <p v-if="d.texto">{{ d.texto }}</p>
        <a v-if="d.link" :href="d.link" target="_blank" rel="noopener noreferrer">Ver mais <ExternalLink :size="13" /></a>
      </li>
    </ul>
  </section>

  <!-- Perguntas frequentes -->
  <section v-else-if="part === 'faq' && faq.length" id="faq" class="ss ss-faq section-wrap">
    <div class="ss-head">
      <span v-reveal:scale class="ss-icon"><HelpCircle :size="22" stroke-width="1.4" /></span>
      <p v-reveal="100" class="eyebrow">Dúvidas</p>
      <h2 v-reveal="200">Perguntas <i>frequentes</i></h2>
    </div>
    <ul class="ss-faq-list">
      <li v-for="(f, i) in faq" :key="i" v-reveal="i * 70" :class="{ open: open === i }">
        <button type="button" :aria-expanded="open === i" @click="open = open === i ? -1 : i">
          <span>{{ f.pergunta }}</span>
          <Plus class="ss-plus" :size="18" />
        </button>
        <div class="ss-answer">
          <div>
            <p v-for="(p, j) in paragraphs(f.resposta)" :key="j">{{ p }}</p>
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
  margin-bottom: 40px;
  text-align: center;
}
.ss-head h2 {
  margin: 0;
}
.ss-icon {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  margin-bottom: 8px;
  border: 1px solid rgba(29, 58, 138, 0.2);
  border-radius: 50%;
  background: #fcf1e5;
  color: var(--navy);
}
.ss-historia {
  max-width: 900px;
}
.ss-story {
  max-width: 680px;
  margin: 0 auto;
  font-size: 17px;
  color: var(--ink-soft);
  text-align: center;
}
.ss-story p:first-child::first-letter {
  float: left;
  margin: 6px 10px 0 0;
  font-family: var(--serif);
  font-size: 3.4em;
  line-height: 0.8;
  color: var(--gold-ink);
}
.ss-story p:first-child {
  text-align: left;
}

/* dress code: cartão de papel com moldura fina */
.ss-dress {
  padding: 40px 7% 100px;
}
.ss-dress-card {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 6px;
  max-width: 620px;
  margin: 0 auto;
  padding: 44px 36px;
  border: 1px solid rgba(29, 58, 138, 0.18);
  border-radius: 24px;
  background:
    radial-gradient(ellipse at 50% 0%, rgba(255, 255, 255, 0.8), transparent 70%),
    #fcf1e5;
  text-align: center;
}
.ss-dress-card::before {
  content: '';
  position: absolute;
  inset: 8px;
  border: 1px solid rgba(180, 147, 104, 0.35);
  border-radius: 18px;
  pointer-events: none;
}
.ss-dress-card h2 {
  margin: 0 0 6px;
  font-size: clamp(2.2rem, 4vw, 3.2rem);
}
.ss-dress-text {
  max-width: 460px;
  margin: 0;
  color: var(--ink-soft);
}

/* dicas */
.ss-tips {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.ss-tip {
  display: grid;
  align-content: start;
  gap: 8px;
  padding: 24px;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: #fff;
  transition:
    transform 0.4s var(--ease-out),
    box-shadow 0.4s;
}
.ss-tip:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px #0b1f4912;
}
.ss-tip h3 {
  margin: 0;
  font-family: var(--serif);
  font-size: 1.5rem;
  font-weight: 400;
}
.ss-tip p {
  margin: 0;
  color: var(--ink-soft);
  font-size: 14.5px;
  line-height: 1.7;
}
.ss-tip a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--gold-ink);
}

/* perguntas frequentes */
.ss-faq {
  max-width: 860px;
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
  border-radius: 16px;
  background: #fff;
  transition: border-color 0.3s;
}
.ss-faq-list li.open {
  border-color: rgba(180, 147, 104, 0.5);
}
.ss-faq-list button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  padding: 18px 22px;
  border: 0;
  background: none;
  color: var(--navy);
  font-size: 15.5px;
  font-weight: 500;
  text-align: left;
}
.ss-plus {
  flex: none;
  color: var(--gold);
  transition: transform 0.4s var(--ease-out);
}
.open .ss-plus {
  transform: rotate(45deg);
}
.ss-answer {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.45s var(--ease-out);
}
.open .ss-answer {
  grid-template-rows: 1fr;
}
.ss-answer > div {
  overflow: hidden;
}
.ss-answer p {
  margin: 0;
  padding: 0 22px 16px;
  color: var(--ink-soft);
  font-size: 14.5px;
}
</style>
