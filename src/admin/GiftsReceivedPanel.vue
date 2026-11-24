<script setup>
// Presentes: registro do que chegou (o Pix estático não avisa quando é pago) e dados do Pix.
import { ref, computed, inject } from 'vue';
import { Plus, Search, Download, Pencil, Trash2, X, Heart, HandCoins, Gift, MailCheck } from 'lucide-vue-next';
import { saveGift, deleteGift, setGiftThanked } from '../api.js';
import { gifts as catalog, formatPrice } from '../gifts.js';
import { strip } from './seating.js';
import PixPanel from './PixPanel.vue';

const props = defineProps({ gifts: Array, config: Object });
const emit = defineEmits(['config-saved']);
const toast = inject('toast');

const tab = ref('recebidos'); // recebidos | pix

/* ---------- Resumo ---------- */
const total = computed(() => props.gifts.reduce((n, g) => n + (Number(g.valor) || 0), 0));
const toThank = computed(() => props.gifts.filter((g) => !g.agradecido).length);
const top = computed(() => {
  const by = new Map();
  for (const g of props.gifts) if (g.presente) by.set(g.presente, (by.get(g.presente) || 0) + 1);
  return [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
});

/* ---------- Lista ---------- */
const search = ref('');
const filter = ref('todos'); // todos | agradecer | agradecidos
const visible = computed(() => {
  const q = strip(search.value);
  return props.gifts.filter(
    (g) =>
      (filter.value === 'todos' || (filter.value === 'agradecer' ? !g.agradecido : g.agradecido)) &&
      (!q || strip(g.nome).includes(q) || strip(g.presente).includes(q)),
  );
});
async function toggleThanks(g) {
  try {
    await setGiftThanked(g.id, !g.agradecido);
    toast(!g.agradecido ? `Agradecimento a ${g.nome} marcado` : 'Agradecimento desmarcado');
  } catch {
    toast('Não foi possível atualizar', 'err');
  }
}
async function remove(g) {
  if (!window.confirm(`Excluir o registro do presente de "${g.nome}"?`)) return;
  try {
    await deleteGift(g.id);
    toast('Registro excluído');
  } catch {
    toast('Não foi possível excluir', 'err');
  }
}

/* ---------- Editor (fecha só pelo X) ---------- */
const editor = ref(null);
const busy = ref(false);
const editorError = ref('');
// data no fuso do navegador (toISOString usaria UTC e, à noite, já seria o dia seguinte)
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => ymd(new Date());
function openNew() {
  editor.value = { nome: '', presente: '', valor: '', data: today(), agradecido: false, obs: '' };
  editorError.value = '';
}
function openEdit(g) {
  editor.value = { ...g, data: g.data ? ymd(g.data) : today() };
  editorError.value = '';
}
function onPick() {
  const item = catalog.find((c) => c.title === editor.value.presente);
  if (item && !editor.value.valor) editor.value.valor = item.price;
}
async function save() {
  const e = editor.value;
  editorError.value = '';
  if (!e.nome.trim()) return (editorError.value = 'Informe quem deu o presente.');
  const valor = Number(String(e.valor).replace(',', '.'));
  if (!(valor >= 0)) return (editorError.value = 'Valor inválido.');
  busy.value = true;
  try {
    await saveGift({ ...e, valor, data: e.data ? new Date(`${e.data}T12:00:00`) : new Date() });
    toast(e.id ? 'Presente atualizado' : 'Presente registrado');
    editor.value = null;
  } catch {
    editorError.value = 'Não foi possível salvar. Verifique a conexão.';
  } finally {
    busy.value = false;
  }
}

function exportCsv() {
  const rows = [['Data', 'De', 'Presente', 'Valor', 'Agradecido', 'Observação']];
  for (const g of visible.value)
    rows.push([g.data ? g.data.toLocaleDateString('pt-BR') : '', g.nome, g.presente, String(g.valor).replace('.', ','), g.agradecido ? 'Sim' : 'Não', g.obs || '']);
  const csv = '﻿' + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `presentes-recebidos-${today()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const fmtDate = (d) => (d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '');
</script>

<template>
  <section>
    <div class="section-head">
      <div>
        <p class="eyebrow">Lista de presentes</p>
        <h1>Presentes</h1>
        <p>O Pix não avisa quando é pago: registrem aqui o que chegar (conferindo o extrato).</p>
      </div>
      <div class="segmented">
        <button :class="{ on: tab === 'recebidos' }" @click="tab = 'recebidos'"><Gift :size="15" /> Recebidos</button>
        <button :class="{ on: tab === 'pix' }" @click="tab = 'pix'"><HandCoins :size="15" /> Pix</button>
      </div>
    </div>

    <Transition name="adm-panel" mode="out-in">
      <div v-if="tab === 'recebidos'" key="r">
        <div class="gr-kpis">
          <article class="card gr-kpi rise" style="--i: 0">
            <span class="gr-ic gold"><HandCoins :size="18" /></span>
            <strong class="serif">{{ formatPrice(total) }}</strong>
            <span>arrecadado</span>
          </article>
          <article class="card gr-kpi rise" style="--i: 1">
            <span class="gr-ic accent"><Gift :size="18" /></span>
            <strong class="serif">{{ gifts.length }}</strong>
            <span>presentes registrados</span>
          </article>
          <article class="card gr-kpi rise" style="--i: 2">
            <span class="gr-ic wait"><MailCheck :size="18" /></span>
            <strong class="serif">{{ toThank }}</strong>
            <span>a agradecer</span>
          </article>
          <article class="card gr-kpi gr-top rise" style="--i: 3">
            <span class="gr-ic ok"><Heart :size="18" /></span>
            <span class="gr-top-title">Mais escolhidos</span>
            <ol v-if="top.length">
              <li v-for="[name, n] in top" :key="name">{{ name }} <b>{{ n }}×</b></li>
            </ol>
            <span v-else class="muted">Ainda nenhum</span>
          </article>
        </div>

        <div class="card gr-toolbar">
          <label class="search">
            <Search :size="16" />
            <input v-model="search" placeholder="Buscar por nome ou presente" />
          </label>
          <div class="segmented">
            <button :class="{ on: filter === 'todos' }" @click="filter = 'todos'">Todos</button>
            <button :class="{ on: filter === 'agradecer' }" @click="filter = 'agradecer'">A agradecer</button>
            <button :class="{ on: filter === 'agradecidos' }" @click="filter = 'agradecidos'">Agradecidos</button>
          </div>
          <button class="b" type="button" @click="exportCsv"><Download :size="15" /> Exportar</button>
          <button class="b gold" type="button" @click="openNew"><Plus :size="15" /> Registrar presente</button>
        </div>

        <div v-if="!gifts.length" class="empty">
          <Gift :size="26" />
          <p>Nenhum presente registrado ainda.</p>
          <p>Quando um Pix cair, use <b>Registrar presente</b>.</p>
        </div>
        <TransitionGroup v-else tag="ul" name="gr-list" class="gr-list">
          <li v-for="(g, i) in visible" :key="g.id" class="card gr-item rise" :style="{ '--i': Math.min(i, 12) }">
            <button
              type="button"
              :class="['gr-thank', { on: g.agradecido }]"
              :aria-pressed="g.agradecido"
              :title="g.agradecido ? 'Agradecido' : 'Marcar como agradecido'"
              @click="toggleThanks(g)"
            >
              <Heart :size="16" />
            </button>
            <div class="gr-main">
              <strong>{{ g.nome }}</strong>
              <small>{{ g.presente || 'Presente' }}<template v-if="g.obs"> · {{ g.obs }}</template></small>
            </div>
            <time class="muted">{{ fmtDate(g.data) }}</time>
            <b class="gr-value serif">{{ formatPrice(g.valor) }}</b>
            <div class="gr-actions">
              <button class="b icon" type="button" title="Editar" @click="openEdit(g)"><Pencil :size="14" /></button>
              <button class="b icon danger" type="button" title="Excluir" @click="remove(g)"><Trash2 :size="14" /></button>
            </div>
          </li>
        </TransitionGroup>
      </div>
      <PixPanel v-else key="p" embedded :config="config" @saved="emit('config-saved')" />
    </Transition>

    <!-- Registrar/editar presente: fecha apenas pelo X -->
    <Teleport to="body">
      <Transition name="adm-pop">
        <div v-if="editor" class="adm adm-modal-backdrop">
          <div class="adm-modal" role="dialog" aria-modal="true" aria-labelledby="gr-title">
            <button class="b icon close" type="button" aria-label="Fechar" @click="editor = null"><X :size="18" /></button>
            <p class="eyebrow">Presente</p>
            <h2 id="gr-title">{{ editor.id ? 'Editar presente' : 'Registrar presente' }}</h2>
            <form class="gr-form" @submit.prevent="save">
              <label class="field">
                De quem
                <input v-model="editor.nome" required placeholder="Ex.: Família Oliveira" />
              </label>
              <label class="field">
                Presente
                <input v-model="editor.presente" list="gr-catalog" placeholder="Escolha da lista ou escreva" @change="onPick" />
                <datalist id="gr-catalog">
                  <option v-for="c in catalog" :key="c.id" :value="c.title" />
                  <option value="Presente com carinho (valor livre)" />
                </datalist>
              </label>
              <div class="gr-row">
                <label class="field">
                  Valor (R$)
                  <input v-model="editor.valor" inputmode="decimal" placeholder="0,00" />
                </label>
                <label class="field">
                  Data
                  <input v-model="editor.data" type="date" />
                </label>
              </div>
              <label class="field">
                Observação
                <input v-model="editor.obs" placeholder="Opcional" />
              </label>
              <label class="gr-check">
                <input v-model="editor.agradecido" type="checkbox" /> Já agradecemos
              </label>
              <p v-if="editorError" class="error" role="alert">{{ editorError }}</p>
              <button class="b primary" type="submit" :disabled="busy">{{ busy ? 'Salvando…' : 'Salvar' }}</button>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<style scoped>
.gr-kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}
.gr-kpi {
  display: grid;
  gap: 2px;
  align-content: start;
  padding: 18px;
}
.gr-kpi strong {
  font-size: 1.9rem;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}
.gr-kpi > span:last-child {
  font-size: 12px;
  color: var(--muted);
}
.gr-ic {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  margin-bottom: 10px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--c) 16%, transparent);
  color: var(--c);
}
.gr-ic.gold {
  --c: var(--gold);
}
.gr-ic.accent {
  --c: var(--accent);
}
.gr-ic.wait {
  --c: var(--wait);
}
.gr-ic.ok {
  --c: var(--ok);
}
.gr-top-title {
  font-size: 13px;
  color: var(--soft);
}
.gr-top ol {
  display: grid;
  gap: 4px;
  margin: 6px 0 0;
  padding-left: 18px;
  font-size: 12px;
  color: var(--soft);
}
.gr-top b {
  color: var(--gold);
  font-weight: 500;
}
.gr-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 16px;
  padding: 14px;
}
.gr-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.gr-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
}
.gr-thank {
  display: grid;
  place-items: center;
  flex: none;
  width: 36px;
  height: 36px;
  border: 1px dashed var(--line-2);
  border-radius: 50%;
  background: transparent;
  color: var(--muted);
  transition:
    background 0.25s,
    color 0.25s,
    transform 0.3s var(--ease);
}
.gr-thank.on {
  border-style: solid;
  border-color: transparent;
  background: rgba(232, 144, 140, 0.18);
  color: #f0a3a0;
  transform: scale(1.06);
}
.gr-thank.on svg {
  fill: currentColor;
}
.gr-main {
  flex: 1;
  min-width: 0;
}
.gr-main strong {
  display: block;
  font-size: 14px;
  font-weight: 500;
}
.gr-main small {
  display: block;
  overflow: hidden;
  color: var(--muted);
  font-size: 12px;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.gr-item time {
  font-size: 12px;
  white-space: nowrap;
}
.gr-value {
  min-width: 100px;
  font-size: 1.15rem;
  font-weight: 400;
  color: var(--gold);
  text-align: right;
}
.gr-actions {
  display: flex;
  gap: 6px;
}
.gr-form {
  display: grid;
  gap: 14px;
  margin-top: 14px;
}
.gr-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.gr-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--soft);
}
.gr-check input {
  width: 16px;
  min-height: 16px;
  accent-color: #a5b6ec;
}
.gr-list-move,
.gr-list-enter-active,
.gr-list-leave-active {
  transition:
    transform 0.4s var(--ease),
    opacity 0.3s;
}
.gr-list-enter-from,
.gr-list-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
@media (max-width: 900px) {
  .gr-kpis {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 600px) {
  .gr-item {
    flex-wrap: wrap;
    gap: 10px;
  }
  .gr-main {
    flex-basis: calc(100% - 50px);
  }
  .gr-item time {
    margin-left: 50px;
  }
  .gr-value {
    min-width: 0;
    margin-left: auto;
  }
  .gr-toolbar .segmented {
    width: 100%;
  }
  .gr-toolbar .segmented button {
    flex: 1;
    justify-content: center;
    padding: 8px 6px;
  }
}
</style>
