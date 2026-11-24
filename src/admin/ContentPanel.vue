<script setup>
// Conteúdo do site editável pelos noivos. Cada seção só aparece no site quando preenchida.
import { ref, watch, inject, computed } from 'vue';
import { BookHeart, Shirt, MapPinned, HelpCircle, CalendarClock, Plus, Trash2, ExternalLink, ArrowUp, ArrowDown } from 'lucide-vue-next';
import { saveSiteConfig } from '../api.js';

const props = defineProps({ config: Object });
const emit = defineEmits(['saved']);
const toast = inject('toast');

const blank = () => ({
  prazoConfirmacao: '',
  historiaTitulo: '',
  historiaTexto: '',
  dressTitulo: '',
  dressTexto: '',
  dicas: [],
  faq: [],
});
const form = ref(blank());
const dirty = ref(false);
watch(
  () => props.config,
  (c) => {
    if (dirty.value) return; // não apaga o que está sendo digitado
    form.value = {
      ...blank(),
      ...Object.fromEntries(Object.keys(blank()).map((k) => [k, c?.[k] ?? blank()[k]])),
      dicas: (c?.dicas || []).map((d) => ({ ...d })),
      faq: (c?.faq || []).map((f) => ({ ...f })),
    };
    dirty.value = false; // carregar do banco não conta como alteração
  },
  { immediate: true },
);
watch(form, () => (dirty.value = true), { deep: true, flush: 'sync' });
dirty.value = false;

const addTip = () => form.value.dicas.push({ titulo: '', texto: '', link: '' });
const addFaq = () => form.value.faq.push({ pergunta: '', resposta: '' });
function move(list, i, d) {
  const j = i + d;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
}
const filledSections = computed(() => [
  { label: 'Nossa história', on: !!form.value.historiaTexto.trim() },
  { label: 'Dress code', on: !!(form.value.dressTitulo.trim() || form.value.dressTexto.trim()) },
  { label: 'Hospedagem e dicas', on: form.value.dicas.some((d) => d.titulo.trim()) },
  { label: 'Perguntas frequentes', on: form.value.faq.some((f) => f.pergunta.trim() && f.resposta.trim()) },
]);

const busy = ref(false);
async function save() {
  busy.value = true;
  const f = form.value;
  try {
    await saveSiteConfig({
      prazoConfirmacao: f.prazoConfirmacao || '',
      historiaTitulo: f.historiaTitulo.trim(),
      historiaTexto: f.historiaTexto.trim(),
      dressTitulo: f.dressTitulo.trim(),
      dressTexto: f.dressTexto.trim(),
      dicas: f.dicas.filter((d) => d.titulo.trim()).map((d) => ({ titulo: d.titulo.trim(), texto: d.texto.trim(), link: d.link.trim() })),
      faq: f.faq.filter((q) => q.pergunta.trim()).map((q) => ({ pergunta: q.pergunta.trim(), resposta: q.resposta.trim() })),
    });
    dirty.value = false;
    toast('Conteúdo do site salvo');
    emit('saved');
  } catch {
    toast('Não foi possível salvar o conteúdo', 'err');
  } finally {
    busy.value = false;
  }
}
const siteUrl = typeof location !== 'undefined' ? location.origin + '/' : '/';
</script>

<template>
  <section class="cp">
    <div class="section-head">
      <div>
        <p class="eyebrow">Site dos convidados</p>
        <h1>Conteúdo</h1>
        <p>Cada seção só aparece no site depois de preenchida.</p>
      </div>
      <div class="cp-head-actions">
        <a class="b" :href="siteUrl" target="_blank" rel="noopener"><ExternalLink :size="15" /> Ver site</a>
        <button class="b primary" type="button" :disabled="busy" @click="save">{{ busy ? 'Salvando…' : dirty ? 'Salvar alterações' : 'Salvar' }}</button>
      </div>
    </div>

    <div class="cp-status">
      <span v-for="s in filledSections" :key="s.label" :class="['cp-chip', { on: s.on }]">{{ s.on ? '●' : '○' }} {{ s.label }}</span>
    </div>

    <div class="cp-grid">
      <article class="card cp-box rise" style="--i: 0">
        <h2><CalendarClock :size="18" /> Prazo para confirmar</h2>
        <p class="muted">Aparece na confirmação de presença ("Por favor, responda até…").</p>
        <label class="field">
          Data limite
          <input v-model="form.prazoConfirmacao" type="date" />
        </label>
      </article>

      <article class="card cp-box rise" style="--i: 1">
        <h2><Shirt :size="18" /> Dress code</h2>
        <label class="field">
          Traje
          <input v-model="form.dressTitulo" maxlength="40" placeholder="Ex.: Esporte fino" />
        </label>
        <label class="field">
          Observações <small>(opcional)</small>
          <textarea v-model="form.dressTexto" rows="3" placeholder="Ex.: a cerimônia é ao ar livre, à beira do lago…"></textarea>
        </label>
      </article>

      <article class="card cp-box cp-wide rise" style="--i: 2">
        <h2><BookHeart :size="18" /> Nossa história</h2>
        <label class="field">
          Título <small>(opcional — padrão: "Como tudo começou")</small>
          <input v-model="form.historiaTitulo" maxlength="60" />
        </label>
        <label class="field">
          Texto <small>(deixe uma linha em branco entre os parágrafos)</small>
          <textarea v-model="form.historiaTexto" rows="7" placeholder="Conte como vocês se conheceram…"></textarea>
        </label>
      </article>

      <article class="card cp-box cp-wide rise" style="--i: 3">
        <h2><MapPinned :size="18" /> Hospedagem e dicas</h2>
        <p class="muted">Hotéis, salões de beleza, onde comer, transporte… para quem vem de fora.</p>
        <TransitionGroup tag="div" name="cp-item" class="cp-items">
          <div v-for="(d, i) in form.dicas" :key="i" class="cp-item">
            <div class="cp-item-row">
              <input v-model="d.titulo" placeholder="Título (ex.: Hotel Vila Galé)" />
              <button class="b icon" type="button" aria-label="Subir" @click="move(form.dicas, i, -1)"><ArrowUp :size="14" /></button>
              <button class="b icon" type="button" aria-label="Descer" @click="move(form.dicas, i, 1)"><ArrowDown :size="14" /></button>
              <button class="b icon danger" type="button" aria-label="Remover" @click="form.dicas.splice(i, 1)"><Trash2 :size="14" /></button>
            </div>
            <textarea v-model="d.texto" rows="2" placeholder="Descrição (opcional)"></textarea>
            <input v-model="d.link" type="url" placeholder="Link (opcional): https://…" />
          </div>
        </TransitionGroup>
        <button class="b" type="button" @click="addTip"><Plus :size="15" /> Adicionar dica</button>
      </article>

      <article class="card cp-box cp-wide rise" style="--i: 4">
        <h2><HelpCircle :size="18" /> Perguntas frequentes</h2>
        <p class="muted">Ex.: "Posso levar acompanhante?", "Tem estacionamento?", "Crianças são bem-vindas?"</p>
        <TransitionGroup tag="div" name="cp-item" class="cp-items">
          <div v-for="(q, i) in form.faq" :key="i" class="cp-item">
            <div class="cp-item-row">
              <input v-model="q.pergunta" placeholder="Pergunta" />
              <button class="b icon" type="button" aria-label="Subir" @click="move(form.faq, i, -1)"><ArrowUp :size="14" /></button>
              <button class="b icon" type="button" aria-label="Descer" @click="move(form.faq, i, 1)"><ArrowDown :size="14" /></button>
              <button class="b icon danger" type="button" aria-label="Remover" @click="form.faq.splice(i, 1)"><Trash2 :size="14" /></button>
            </div>
            <textarea v-model="q.resposta" rows="2" placeholder="Resposta"></textarea>
          </div>
        </TransitionGroup>
        <button class="b" type="button" @click="addFaq"><Plus :size="15" /> Adicionar pergunta</button>
      </article>
    </div>

    <div v-if="dirty" class="cp-savebar card">
      <span>Há alterações não salvas.</span>
      <button class="b primary" type="button" :disabled="busy" @click="save">{{ busy ? 'Salvando…' : 'Salvar alterações' }}</button>
    </div>
  </section>
</template>

<style scoped>
.cp-head-actions {
  display: flex;
  gap: 8px;
}
.cp-head-actions .b {
  text-decoration: none;
}
.cp-status {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}
.cp-chip {
  padding: 5px 12px;
  border: 1px solid var(--line);
  border-radius: 30px;
  color: var(--muted);
  font-size: 12px;
}
.cp-chip.on {
  border-color: rgba(127, 202, 160, 0.4);
  color: var(--ok);
}
.cp-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  padding-bottom: 80px;
}
.cp-box {
  display: grid;
  align-content: start;
  gap: 12px;
  padding: 20px;
}
.cp-wide {
  grid-column: 1 / -1;
}
.cp-box h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.4rem;
}
.cp-box h2 svg {
  color: var(--gold);
}
.cp-box > .muted {
  font-size: 13px;
}
.cp-box small {
  font-size: 11px;
  opacity: 0.8;
}
.cp-box textarea {
  resize: vertical;
  line-height: 1.6;
}
.cp-box > .b {
  justify-self: start;
}
.cp-items {
  display: grid;
  gap: 10px;
}
.cp-item {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.18);
}
.cp-item-row {
  display: flex;
  gap: 6px;
  align-items: center;
}
.cp-item-row .b.icon {
  flex: none;
  width: 34px;
  min-height: 34px;
}
.cp-item-enter-active,
.cp-item-leave-active {
  transition:
    opacity 0.3s,
    transform 0.35s var(--ease);
}
.cp-item-enter-from,
.cp-item-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
.cp-savebar {
  position: fixed;
  left: 50%;
  bottom: 22px;
  z-index: 40;
  translate: -50% 0;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 12px 10px 18px;
  border-color: rgba(217, 191, 143, 0.4);
  background: rgba(26, 38, 66, 0.96);
  font-size: 13px;
  color: var(--gold);
  box-shadow: 0 24px 50px -20px rgba(0, 0, 0, 0.9);
}
@media (max-width: 900px) {
  .cp-grid {
    grid-template-columns: 1fr;
    padding-bottom: 150px;
  }
  .cp-savebar {
    bottom: calc(92px + env(safe-area-inset-bottom));
    width: calc(100vw - 20px);
    justify-content: space-between;
  }
}
</style>
