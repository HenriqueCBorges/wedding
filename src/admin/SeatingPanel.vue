<script setup>
// Mesas: Lado A e Lado B, 10 mesas de 7 cadeiras cada.
// - Computador: arraste da lista "Sem lugar" para uma cadeira (ou de uma cadeira para outra — troca).
// - Celular: toque na pessoa e depois na cadeira; ou toque numa cadeira livre para escolher quem senta.
import { ref, computed, inject } from 'vue';
import { LayoutGrid, List, Search, X, UserMinus, Move, Armchair, Download, Users, ChevronUp } from 'lucide-vue-next';
import { saveGuestsBatch } from '../api.js';
import TableCard from './TableCard.vue';
import {
  SIDES,
  TABLES_PER_SIDE,
  SEATS_PER_TABLE,
  STATUS,
  TAGS,
  tagById,
  seatKey,
  seatLabel,
  strip,
} from './seating.js';

const props = defineProps({ invites: Array, guests: Array });
const toast = inject('toast');

const lado = ref('A');
const view = ref('mesas'); // mesas | lista

/* ---------- Mapa de lugares ---------- */
const seatMap = computed(() => {
  const m = new Map();
  for (const g of props.guests) if (g.assento) m.set(seatKey(g.assento), g);
  return m;
});
const tables = computed(() =>
  Array.from({ length: TABLES_PER_SIDE }, (_, t) => ({
    mesa: t + 1,
    seats: Array.from({ length: SEATS_PER_TABLE }, (_, c) =>
      seatMap.value.get(seatKey({ lado: lado.value, mesa: t + 1, cadeira: c + 1 })) || null,
    ),
  })),
);
const sideCount = (l) => props.guests.filter((g) => g.assento?.lado === l).length;
const capacity = TABLES_PER_SIDE * SEATS_PER_TABLE;

/* ---------- Sem lugar ---------- */
const search = ref('');
const showDeclined = ref(false);
const order = { sim: 0, pendente: 1, nao: 2 };
const unseated = computed(() => {
  const q = strip(search.value);
  return props.guests
    .filter((g) => !g.assento && (showDeclined.value || g.status !== 'nao'))
    .filter((g) => !q || strip(g.nome).includes(q) || strip(g.familia).includes(q))
    .sort((a, b) => order[a.status] - order[b.status] || a.nome.localeCompare(b.nome, 'pt-BR'));
});
const sheetOpen = ref(false); // gaveta "Sem lugar" no celular

/* ---------- Salvar mudanças ---------- */
const saving = ref(false);
async function applyMoves(moves) {
  const byCode = new Map();
  for (const { guest, assento } of moves) {
    if (!byCode.has(guest.code)) {
      const inv = props.invites.find((i) => i.code === guest.code);
      byCode.set(guest.code, inv.convidados.map((g) => ({ ...g })));
    }
    const g = byCode.get(guest.code).find((x) => x.id === guest.id);
    if (g) g.assento = assento;
  }
  saving.value = true;
  try {
    await saveGuestsBatch(byCode);
    return true;
  } catch {
    toast('Não foi possível salvar o lugar. Verifique a conexão.', 'err');
    return false;
  } finally {
    saving.value = false;
  }
}
async function place(guest, seat) {
  const occupant = seatMap.value.get(seatKey(seat));
  if (occupant?.key === guest.key) return;
  const moves = [{ guest, assento: seat }];
  if (occupant) moves.push({ guest: occupant, assento: guest.assento || null });
  if (await applyMoves(moves))
    toast(occupant ? `${first(guest)} e ${first(occupant)} trocaram de lugar` : `${first(guest)} → Mesa ${seat.mesa}, cadeira ${seat.cadeira}`);
}
async function unseat(guest) {
  if (await applyMoves([{ guest, assento: null }])) toast(`${first(guest)} saiu da mesa`);
}
const first = (g) => g.nome.split(' ')[0];

/* ---------- Toque: escolher pessoa → escolher cadeira ---------- */
const picking = ref(null);
function pick(g) {
  picking.value = picking.value?.key === g.key ? null : g;
  sheetOpen.value = false;
}

const detail = ref(null); // { guest, seat } — cadeira ocupada
const chooser = ref(null); // { seat } — cadeira livre, escolher quem senta
const chooserSearch = ref('');
const chooserList = computed(() => {
  const q = strip(chooserSearch.value);
  return props.guests
    .filter((g) => g.status !== 'nao' || showDeclined.value)
    .filter((g) => !q || strip(g.nome).includes(q) || strip(g.familia).includes(q))
    .sort((a, b) => (a.assento ? 1 : 0) - (b.assento ? 1 : 0) || order[a.status] - order[b.status] || a.nome.localeCompare(b.nome, 'pt-BR'))
    .slice(0, 60);
});

function onChair(mesa, i) {
  const seat = { lado: lado.value, mesa, cadeira: i + 1 };
  const g = seatMap.value.get(seatKey(seat));
  if (picking.value) {
    const who = picking.value;
    picking.value = null;
    place(who, seat);
    return;
  }
  if (g) detail.value = { guest: g, seat };
  else {
    chooserSearch.value = '';
    chooser.value = { seat };
  }
}
function onDrop(mesa, i, key) {
  const g = props.guests.find((x) => x.key === key);
  if (g) place(g, { lado: lado.value, mesa, cadeira: i + 1 });
}
const dropOver = ref(false);
function onDropUnseat(e) {
  dropOver.value = false;
  const g = props.guests.find((x) => x.key === e.dataTransfer.getData('text/plain'));
  if (g?.assento) unseat(g);
}
function onDragStart(e, g) {
  e.dataTransfer.setData('text/plain', g.key);
  e.dataTransfer.effectAllowed = 'move';
}
function startMove() {
  picking.value = detail.value.guest;
  detail.value = null;
}
async function freeChair() {
  const g = detail.value.guest;
  detail.value = null;
  await unseat(g);
}
function chooseFor(g) {
  const seat = chooser.value.seat;
  chooser.value = null;
  place(g, seat);
}

/* ---------- Lista ---------- */
const listRows = computed(() =>
  tables.value.flatMap((t) =>
    t.seats.map((g, i) => ({ mesa: t.mesa, cadeira: i + 1, g, first: i === 0 })),
  ),
);
function exportCsv() {
  const rows = [['Lado', 'Mesa', 'Cadeira', 'Convidado', 'Família', 'Resposta', 'Tags']];
  for (const l of SIDES)
    for (let m = 1; m <= TABLES_PER_SIDE; m++)
      for (let c = 1; c <= SEATS_PER_TABLE; c++) {
        const g = seatMap.value.get(seatKey({ lado: l, mesa: m, cadeira: c }));
        rows.push([l, m, c, g?.nome || '(livre)', g?.familia || '', g ? STATUS[g.status].label : '', (g?.tags || []).map((t) => tagById[t]?.label).join(', ')]);
      }
  const csv = '﻿' + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `mesas-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
</script>

<template>
  <section class="sp">
    <div class="section-head">
      <div>
        <p class="eyebrow">Recepção</p>
        <h1>Mesas</h1>
        <p>{{ sideCount(lado) }} de {{ capacity }} lugares ocupados no Lado {{ lado }}</p>
      </div>
      <div class="sp-controls">
        <div class="segmented">
          <button v-for="l in SIDES" :key="l" :class="{ on: lado === l }" @click="lado = l">
            Lado {{ l }} <small>{{ sideCount(l) }}</small>
          </button>
        </div>
        <div class="segmented">
          <button :class="{ on: view === 'mesas' }" aria-label="Ver mesas" @click="view = 'mesas'"><LayoutGrid :size="15" /> Mesas</button>
          <button :class="{ on: view === 'lista' }" aria-label="Ver lista" @click="view = 'lista'"><List :size="15" /> Lista</button>
        </div>
        <button class="b" type="button" @click="exportCsv"><Download :size="15" /> Exportar</button>
      </div>
    </div>

    <!-- legenda -->
    <div class="sp-legend">
      <span><i class="lg sim"></i> Confirmado</span>
      <span><i class="lg pendente"></i> A confirmar</span>
      <span><i class="lg nao"></i> Não vai</span>
      <span><i class="lg free"></i> Livre</span>
      <span v-for="t in TAGS" :key="t.id"><i class="lg tagdot" :style="{ '--c': t.color }"></i> {{ t.short }}</span>
    </div>

    <!-- modo "escolha uma cadeira" -->
    <Transition name="adm-panel">
      <div v-if="picking" class="sp-picking">
        <Move :size="16" />
        <span>Escolha uma cadeira para <b>{{ picking.nome }}</b></span>
        <button class="b" type="button" @click="picking = null">Cancelar</button>
      </div>
    </Transition>

    <div class="sp-layout">
      <div class="sp-main">
        <Transition name="adm-panel" mode="out-in">
          <!-- Vista em mesas -->
          <div v-if="view === 'mesas'" :key="'m' + lado" class="sp-tables">
            <TableCard
              v-for="(t, i) in tables"
              :key="lado + t.mesa"
              :lado="lado"
              :mesa="t.mesa"
              :seats="t.seats"
              :picking="picking"
              :index="i"
              @chair="(c) => onChair(t.mesa, c)"
              @drop="(c, key) => onDrop(t.mesa, c, key)"
            />
          </div>

          <!-- Vista em lista -->
          <div v-else :key="'l' + lado" class="card sp-list">
            <table>
              <thead>
                <tr>
                  <th>Mesa</th>
                  <th>Cadeira</th>
                  <th>Convidado</th>
                  <th class="hide-sm">Família</th>
                  <th>Resposta</th>
                  <th class="hide-sm">Tags</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="r in listRows"
                  :key="r.mesa + '-' + r.cadeira"
                  :class="{ first: r.first, free: !r.g }"
                  @click="onChair(r.mesa, r.cadeira - 1)"
                >
                  <td><span v-if="r.first" class="serif sp-mesa">Mesa {{ r.mesa }}</span></td>
                  <td class="num">{{ r.cadeira }}</td>
                  <td>{{ r.g ? r.g.nome : 'livre' }}</td>
                  <td class="hide-sm muted">{{ r.g?.familia || '' }}</td>
                  <td><span v-if="r.g" :class="['pill', r.g.status]">{{ STATUS[r.g.status].short }}</span></td>
                  <td class="hide-sm">
                    <span class="sp-tags">
                      <i v-for="t in r.g?.tags || []" :key="t" class="tag" :style="{ '--c': tagById[t]?.color }">{{ tagById[t]?.short }}</i>
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Transition>
      </div>

      <!-- Sem lugar -->
      <aside
        :class="['card sp-pool', { open: sheetOpen, over: dropOver }]"
        @dragover.prevent="dropOver = true"
        @dragleave="dropOver = false"
        @drop.prevent="onDropUnseat"
      >
        <button class="sp-pool-head" type="button" @click="sheetOpen = !sheetOpen">
          <Users :size="16" />
          <strong>Sem lugar</strong>
          <span class="sp-count">{{ unseated.length }}</span>
          <ChevronUp class="sp-chev" :size="16" />
        </button>
        <div class="sp-pool-body">
          <label class="search">
            <Search :size="15" />
            <input v-model="search" placeholder="Buscar" />
          </label>
          <label class="sp-check">
            <input v-model="showDeclined" type="checkbox" /> Mostrar quem não vai
          </label>
          <p class="sp-hint muted">Arraste para uma cadeira, ou toque na pessoa e depois na cadeira. Solte aqui para tirar alguém da mesa.</p>
          <TransitionGroup tag="ul" name="sp-item" class="sp-pool-list">
            <li
              v-for="g in unseated"
              :key="g.key"
              :class="['sp-person', g.status, { picked: picking?.key === g.key }]"
              draggable="true"
              @dragstart="onDragStart($event, g)"
              @click="pick(g)"
            >
              <span :class="['sp-dot', g.status]"></span>
              <div>
                <strong>{{ g.nome }}</strong>
                <small>{{ g.familia || 'Individual' }} · {{ STATUS[g.status].short }}</small>
              </div>
              <span class="sp-tags">
                <i v-for="t in g.tags" :key="t" class="sp-tagdot" :style="{ '--c': tagById[t]?.color }" :title="tagById[t]?.label"></i>
              </span>
            </li>
          </TransitionGroup>
          <p v-if="!unseated.length" class="muted sp-done">
            <Armchair :size="18" /> Todo mundo já tem lugar.
          </p>
        </div>
      </aside>
    </div>

    <div v-if="saving" class="sp-saving"><span></span> Salvando…</div>

    <!-- Cadeira ocupada (fecha só pelo X) -->
    <Teleport to="body">
      <Transition name="adm-pop">
        <div v-if="detail" class="adm adm-modal-backdrop">
          <div class="adm-modal sp-detail" role="dialog" aria-modal="true" aria-labelledby="sp-d-title">
            <button class="b icon close" type="button" aria-label="Fechar" @click="detail = null"><X :size="18" /></button>
            <p class="eyebrow">{{ seatLabel(detail.seat) }}</p>
            <h2 id="sp-d-title">{{ detail.guest.nome }}</h2>
            <p class="muted">{{ detail.guest.familia || 'Convite individual' }}</p>
            <div class="sp-d-meta">
              <span :class="['pill', detail.guest.status]">{{ STATUS[detail.guest.status].label }}</span>
              <i v-for="t in detail.guest.tags" :key="t" class="tag" :style="{ '--c': tagById[t]?.color }">{{ tagById[t]?.label }}</i>
            </div>
            <div class="sp-d-actions">
              <button class="b primary" type="button" @click="startMove"><Move :size="15" /> Mudar de lugar</button>
              <button class="b danger" type="button" @click="freeChair"><UserMinus :size="15" /> Liberar cadeira</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Cadeira livre: escolher quem senta (fecha só pelo X) -->
    <Teleport to="body">
      <Transition name="adm-pop">
        <div v-if="chooser" class="adm adm-modal-backdrop">
          <div class="adm-modal sp-chooser" role="dialog" aria-modal="true" aria-labelledby="sp-c-title">
            <button class="b icon close" type="button" aria-label="Fechar" @click="chooser = null"><X :size="18" /></button>
            <p class="eyebrow">{{ seatLabel(chooser.seat) }}</p>
            <h2 id="sp-c-title">Quem senta aqui?</h2>
            <label class="search">
              <Search :size="15" />
              <input v-model="chooserSearch" placeholder="Buscar convidado" />
            </label>
            <ul class="sp-chooser-list">
              <li v-for="g in chooserList" :key="g.key">
                <button type="button" @click="chooseFor(g)">
                  <span :class="['sp-dot', g.status]"></span>
                  <div>
                    <strong>{{ g.nome }}</strong>
                    <small>{{ g.familia || 'Individual' }}</small>
                  </div>
                  <span :class="['seat-badge', { none: !g.assento }]">{{ g.assento ? `${g.assento.lado}${g.assento.mesa}·${g.assento.cadeira}` : 'sem lugar' }}</span>
                </button>
              </li>
            </ul>
            <p v-if="!chooserList.length" class="muted">Nenhum convidado encontrado.</p>
          </div>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<style scoped>
.sp-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.sp-controls small {
  padding: 1px 7px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.07);
  font-size: 10.5px;
}
.sp-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin-bottom: 18px;
  font-size: 12px;
  color: var(--muted);
}
.sp-legend span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.lg {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
}
.lg.sim {
  background: linear-gradient(145deg, #c3cff5, #93a7e4);
}
.lg.pendente {
  border: 1.5px dashed rgba(165, 182, 236, 0.6);
}
.lg.nao {
  border: 1.5px dashed rgba(232, 144, 140, 0.7);
}
.lg.free {
  border: 1.5px dashed rgba(255, 255, 255, 0.2);
}
.lg.tagdot {
  width: 9px;
  height: 9px;
  background: var(--c);
}
.sp-picking {
  position: sticky;
  top: 12px;
  z-index: 15;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding: 10px 12px 10px 16px;
  border: 1px solid rgba(217, 191, 143, 0.4);
  border-radius: 14px;
  background: rgba(40, 34, 22, 0.92);
  backdrop-filter: blur(10px);
  color: var(--gold);
  font-size: 13px;
}
.sp-picking span {
  flex: 1;
  color: var(--text);
}
.sp-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 18px;
  align-items: start;
}
.sp-tables {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(214px, 1fr));
  gap: 14px;
}

/* lista */
.sp-list {
  overflow-x: auto;
}
.sp-list table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.sp-list th {
  position: sticky;
  top: 0;
  padding: 12px 14px;
  border-bottom: 1px solid var(--line-2);
  background: var(--panel);
  color: var(--muted);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-align: left;
  text-transform: uppercase;
}
.sp-list td {
  padding: 9px 14px;
  border-bottom: 1px solid var(--line);
}
.sp-list tr {
  cursor: pointer;
  transition: background 0.2s;
}
.sp-list tbody tr:hover {
  background: rgba(165, 182, 236, 0.06);
}
.sp-list tr.first td {
  border-top: 1px solid var(--line-2);
}
.sp-list tr.free td:nth-child(3) {
  color: #5f6a83;
  font-style: italic;
}
.sp-mesa {
  font-size: 1.05rem;
  color: var(--gold);
  white-space: nowrap;
}
.num {
  font-variant-numeric: tabular-nums;
  color: var(--muted);
}
.sp-tags {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
}
.sp-tags .tag {
  font-style: normal;
}

/* sem lugar */
.sp .sp-pool {
  position: sticky;
  top: 20px;
  max-height: calc(100svh - 40px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition:
    border-color 0.25s,
    box-shadow 0.25s;
}
.sp .sp-pool.over {
  border-color: rgba(232, 144, 140, 0.6);
  box-shadow: 0 0 0 4px rgba(232, 144, 140, 0.12);
}
.sp .sp-pool-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 16px 10px;
  border: 0;
  background: none;
  color: var(--text);
  text-align: left;
  cursor: default;
}
.sp .sp-pool-head strong {
  flex: 1;
  font-family: var(--serif);
  font-size: 1.3rem;
  font-weight: 400;
}
.sp-count {
  padding: 2px 9px;
  border-radius: 20px;
  background: rgba(217, 191, 143, 0.16);
  color: var(--gold);
  font-size: 12px;
}
.sp-chev {
  display: none;
}
.sp .sp-pool-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  padding: 0 14px 14px;
}
.sp-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--muted);
}
.sp-check input {
  width: 16px;
  min-height: 16px;
  accent-color: #a5b6ec;
}
.sp-hint {
  font-size: 11.5px;
  line-height: 1.5;
}
.sp .sp-pool-list {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0 2px 0 0;
  list-style: none;
  overflow-y: auto;
  min-height: 0;
}
.sp-person {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.025);
  cursor: grab;
  transition:
    border-color 0.2s,
    background 0.2s,
    transform 0.25s var(--ease);
}
.sp-person:hover {
  border-color: var(--line-2);
  transform: translateX(-2px);
}
.sp-person:active {
  cursor: grabbing;
}
.sp-person.picked {
  border-color: var(--gold);
  background: rgba(217, 191, 143, 0.1);
}
.sp-person > div {
  flex: 1;
  min-width: 0;
}
.sp-person strong {
  display: block;
  overflow: hidden;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.sp-person small {
  color: var(--muted);
  font-size: 11px;
}
.sp-dot {
  flex: none;
  width: 9px;
  height: 9px;
  border-radius: 50%;
}
.sp-dot.sim {
  background: var(--ok);
  box-shadow: 0 0 8px var(--ok);
}
.sp-dot.pendente {
  border: 1.5px solid var(--wait);
}
.sp-dot.nao {
  background: var(--no);
}
.sp-tagdot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--c);
}
.sp-done {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.sp-item-move,
.sp-item-enter-active,
.sp-item-leave-active {
  transition:
    transform 0.4s var(--ease),
    opacity 0.3s;
}
.sp-item-enter-from,
.sp-item-leave-to {
  opacity: 0;
  transform: translateX(14px);
}
.sp-item-leave-active {
  position: absolute;
  width: calc(100% - 4px);
}
.sp-saving {
  position: fixed;
  left: 50%;
  top: 16px;
  z-index: 90;
  translate: -50% 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  border-radius: 30px;
  background: var(--panel-2);
  border: 1px solid var(--line-2);
  font-size: 12px;
  color: var(--soft);
}
.sp-saving span {
  width: 12px;
  height: 12px;
  border: 2px solid var(--line-2);
  border-top-color: var(--gold);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* modais */
.sp-d-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 16px 0 22px;
}
.sp-d-meta .tag {
  font-style: normal;
}
.sp-d-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.sp-chooser .search {
  display: block;
  margin: 14px 0 10px;
}
.sp-chooser-list {
  display: grid;
  gap: 6px;
  max-height: 52vh;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}
.sp-chooser-list button {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  color: var(--text);
  text-align: left;
  transition:
    border-color 0.2s,
    background 0.2s;
}
.sp-chooser-list button:hover {
  border-color: rgba(165, 182, 236, 0.5);
  background: rgba(165, 182, 236, 0.07);
}
.sp-chooser-list div {
  flex: 1;
  min-width: 0;
}
.sp-chooser-list strong {
  display: block;
  font-size: 14px;
  font-weight: 500;
}
.sp-chooser-list small {
  color: var(--muted);
  font-size: 11.5px;
}

/* ---------- Responsivo ---------- */
@media (max-width: 1100px) {
  .sp-layout {
    grid-template-columns: 1fr;
  }
  /* "Sem lugar" vira uma gaveta presa embaixo */
  .sp .sp-pool {
    position: fixed;
    left: 10px;
    right: 10px;
    top: auto;
    bottom: calc(86px + env(safe-area-inset-bottom));
    z-index: 25;
    max-height: 58px;
    transition: max-height 0.45s var(--ease);
  }
  .sp .sp-pool.open {
    max-height: min(70svh, 560px);
  }
  .sp .sp-pool-head {
    cursor: pointer;
    padding: 14px 16px;
  }
  .sp-chev {
    display: block;
    transition: rotate 0.3s var(--ease);
  }
  .sp .sp-pool.open .sp-chev {
    rotate: 180deg;
  }
  .sp-main {
    padding-bottom: 70px;
  }
}
@media (min-width: 901px) and (max-width: 1100px) {
  .sp .sp-pool {
    bottom: 16px;
    left: auto;
    width: 340px;
  }
}
@media (max-width: 760px) {
  .sp-controls {
    width: 100%;
  }
  .sp-controls .segmented {
    flex: 1;
  }
  .sp-controls .segmented button {
    flex: 1;
    justify-content: center;
  }
  .sp-tables {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 10px;
  }
  .hide-sm {
    display: none;
  }
  .sp-legend {
    gap: 6px 12px;
    font-size: 11px;
  }
}
@media (max-width: 380px) {
  .sp-tables {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
