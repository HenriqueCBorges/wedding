<script setup>
// Uma mesa redonda com 7 cadeiras ao redor e a lista numerada abaixo.
// Cadeira cheia = confirmado · tracejada = a confirmar · vermelha = não vai · número = livre.
// Ponto laranja = criança · anel dourado = padrinho/madrinha · anel lilás = pais · selo verde = placa.
import { computed, ref } from 'vue';
import { chairPosition, initials, tableSummary, STATUS } from './seating.js';

const props = defineProps({
  lado: String,
  mesa: Number,
  seats: Array, // 7 posições: convidado | null
  picking: Object, // convidado sendo posicionado (modo "escolha uma cadeira")
  index: Number,
});
const emit = defineEmits(['chair', 'drop', 'drag']);

const occupied = computed(() => props.seats.filter(Boolean));
const summary = computed(() => tableSummary(occupied.value));
const full = computed(() => occupied.value.length === props.seats.length);
const over = ref(-1);

function onDrop(e, i) {
  over.value = -1;
  const key = e.dataTransfer.getData('text/plain');
  if (key) emit('drop', i, key);
}
function onDragStart(e, g) {
  e.dataTransfer.setData('text/plain', g.key);
  e.dataTransfer.effectAllowed = 'move';
  emit('drag', g);
}
const tip = (g, i) => (g ? `${g.nome} · ${STATUS[g.status].label}` : `Cadeira ${i + 1} livre`);
</script>

<template>
  <article :class="['card tc rise', { full }]" :style="{ '--i': index }">
    <div class="tc-stage">
      <div class="tc-table">
        <strong class="serif">Mesa {{ mesa }}</strong>
        <span>{{ occupied.length }}/{{ seats.length }}</span>
      </div>
      <button
        v-for="(g, i) in seats"
        :key="i"
        type="button"
        :class="[
          'tc-chair',
          g ? g.status : 'free',
          {
            over: over === i,
            target: picking && (!g || g.key !== picking.key),
            self: picking && g && g.key === picking.key,
            padrinho: g?.tags.includes('padrinho'),
            pais: g?.tags.includes('pais'),
          },
        ]"
        :style="{ ...chairPosition(i), '--d': `${index * 40 + i * 35}ms` }"
        :title="tip(g, i)"
        :aria-label="tip(g, i)"
        :draggable="!!g"
        @click="emit('chair', i)"
        @dragstart="g && onDragStart($event, g)"
        @dragover.prevent="over = i"
        @dragleave="over === i && (over = -1)"
        @drop.prevent="onDrop($event, i)"
      >
        <template v-if="g">{{ initials(g.nome) }}</template>
        <template v-else>{{ i + 1 }}</template>
        <i v-if="g?.tags.includes('crianca')" class="tc-kid" aria-hidden="true"></i>
        <i v-if="g?.tags.includes('placa')" class="tc-plate" aria-hidden="true"></i>
      </button>
    </div>

    <ol class="tc-list">
      <li v-for="(g, i) in seats" :key="i" :class="g ? g.status : 'free'" @click="emit('chair', i)">
        <span class="tc-n">{{ i + 1 }}</span>
        <span class="tc-name">{{ g ? g.nome : 'livre' }}</span>
        <i v-if="g?.tags.includes('crianca')" class="tc-kid-inline"></i>
      </li>
    </ol>

    <footer class="tc-foot">
      <span>{{ summary.text }}</span>
      <span v-if="summary.pending" class="tc-pending">{{ summary.pending }} a confirmar</span>
    </footer>
  </article>
</template>

<style scoped>
.tc {
  display: flex;
  flex-direction: column;
  padding: 14px 14px 12px;
  transition:
    border-color 0.3s,
    transform 0.4s var(--ease);
}
.tc:hover {
  border-color: var(--line-2);
}
.tc.full {
  border-color: rgba(165, 182, 236, 0.22);
}
.tc-stage {
  position: relative;
  width: 100%;
  max-width: 230px;
  aspect-ratio: 1;
  margin: 0 auto 8px;
}
.tc-table {
  position: absolute;
  inset: 22%;
  display: grid;
  place-content: center;
  text-align: center;
  border-radius: 50%;
  border: 1px solid var(--line-2);
  background: radial-gradient(circle at 35% 30%, #253255, #1a2440 70%);
  box-shadow:
    0 0 0 6px rgba(255, 255, 255, 0.015),
    inset 0 -10px 24px rgba(0, 0, 0, 0.35),
    0 18px 30px -18px rgba(0, 0, 0, 0.8);
}
.tc-table strong {
  font-size: clamp(1.05rem, 2vw, 1.35rem);
  font-weight: 400;
  line-height: 1.05;
}
.tc-table span {
  font-size: 11px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.tc-chair {
  position: absolute;
  width: 19%;
  aspect-ratio: 1;
  translate: -50% -50%;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1.5px dashed rgba(165, 182, 236, 0.45);
  border-radius: 50%;
  background: rgba(20, 30, 54, 0.9);
  color: var(--soft);
  font-size: clamp(10px, 1.1vw, 12px);
  font-weight: 600;
  letter-spacing: 0.02em;
  animation: chair-in 0.55s var(--d) var(--ease) both;
  transition:
    scale 0.25s var(--ease),
    box-shadow 0.25s,
    background 0.25s,
    border-color 0.25s;
}
@keyframes chair-in {
  from {
    opacity: 0;
    transform: scale(0.4);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.tc-chair:hover {
  scale: 1.12;
  z-index: 2;
}
.tc-chair.sim {
  border: 0;
  background: linear-gradient(145deg, #c3cff5, #93a7e4);
  color: var(--accent-ink);
  box-shadow: 0 6px 14px -6px rgba(147, 167, 228, 0.8);
}
.tc-chair.pendente {
  color: var(--text);
}
.tc-chair.nao {
  border-color: rgba(232, 144, 140, 0.55);
  color: var(--no);
  opacity: 0.75;
}
.tc-chair.free {
  border-color: rgba(255, 255, 255, 0.16);
  background: transparent;
  color: #5f6a83;
  font-weight: 400;
}
.tc-chair.padrinho {
  box-shadow:
    0 0 0 2px var(--bg),
    0 0 0 3.5px var(--gold);
}
.tc-chair.pais {
  box-shadow:
    0 0 0 2px var(--bg),
    0 0 0 3.5px #c7a6e8;
}
.tc-chair.over,
.tc-chair.target:hover {
  scale: 1.18;
  border-color: var(--gold);
  border-style: solid;
  box-shadow: 0 0 0 4px rgba(217, 191, 143, 0.22);
}
.tc-chair.target {
  animation:
    chair-in 0.55s var(--d) var(--ease) both,
    chair-pulse 1.6s ease-in-out infinite;
}
.tc-chair.self {
  outline: 2px solid var(--gold);
  outline-offset: 3px;
}
@keyframes chair-pulse {
  50% {
    box-shadow: 0 0 0 5px rgba(217, 191, 143, 0.18);
  }
}
.tc-kid {
  position: absolute;
  right: -1px;
  top: -1px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--kid);
  box-shadow: 0 0 0 2px var(--panel);
}
.tc-plate {
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 9px;
  height: 7px;
  border-radius: 2px;
  background: #7fcab5;
  box-shadow: 0 0 0 2px var(--panel);
}
.tc-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3px 12px;
  margin: 0 0 10px;
  padding: 0;
  list-style: none;
  font-size: 12.5px;
}
.tc-list li {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  padding: 2px 0;
  cursor: pointer;
}
.tc-n {
  width: 12px;
  flex: none;
  color: #5f6a83;
  font-size: 11px;
  text-align: right;
}
.tc-name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.tc-list li.sim .tc-name {
  color: var(--text);
  font-weight: 600;
}
.tc-list li.pendente .tc-name {
  color: var(--soft);
}
.tc-list li.nao .tc-name {
  color: var(--no);
  text-decoration: line-through;
  opacity: 0.8;
}
.tc-list li.free .tc-name {
  color: #5f6a83;
  font-style: italic;
}
.tc-kid-inline {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--kid);
}
.tc-foot {
  display: grid;
  gap: 2px;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid var(--line);
  font-size: 12px;
  color: var(--muted);
}
.tc-pending {
  color: var(--wait);
}
</style>
