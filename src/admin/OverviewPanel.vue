<script setup>
import { computed, inject, onMounted, ref, watch } from 'vue';
import { Users, CheckCircle2, Clock3, XCircle, Armchair, ArrowUpRight, CalendarHeart } from 'lucide-vue-next';
import { TAGS, SIDES, TABLES_PER_SIDE, SEATS_PER_TABLE, TOTAL_SEATS, STATUS } from './seating.js';

const props = defineProps({ guests: Array, invites: Array });
const go = inject('go');

const total = computed(() => props.guests.length);
const count = (s) => props.guests.filter((g) => g.status === s).length;
const sim = computed(() => count('sim'));
const nao = computed(() => count('nao'));
const pend = computed(() => count('pendente'));
const seated = computed(() => props.guests.filter((g) => g.assento).length);

/* contadores que sobem */
const shown = ref({ total: 0, sim: 0, pend: 0, nao: 0, seated: 0 });
function animateTo(target) {
  const from = { ...shown.value };
  const t0 = performance.now();
  const dur = 900;
  const step = (now) => {
    const k = Math.min(1, (now - t0) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    for (const key in target) shown.value[key] = Math.round(from[key] + (target[key] - from[key]) * e);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
const targets = computed(() => ({ total: total.value, sim: sim.value, pend: pend.value, nao: nao.value, seated: seated.value }));
onMounted(() => animateTo(targets.value));
watch(targets, (t) => animateTo(t));

const kpis = computed(() => [
  { key: 'total', label: 'Convidados', icon: Users, tone: 'accent', sub: `${props.invites.length} convites` },
  { key: 'sim', label: 'Confirmados', icon: CheckCircle2, tone: 'ok', sub: pct(sim.value) },
  { key: 'pend', label: 'A confirmar', icon: Clock3, tone: 'wait', sub: pct(pend.value) },
  { key: 'nao', label: 'Não vão', icon: XCircle, tone: 'no', sub: pct(nao.value) },
  { key: 'seated', label: 'Com lugar', icon: Armchair, tone: 'gold', sub: `de ${TOTAL_SEATS} cadeiras` },
]);
function pct(n) {
  return total.value ? `${Math.round((n / total.value) * 100)}% do total` : '—';
}

/* rosca das respostas */
const R = 52;
const C = 2 * Math.PI * R;
const ring = computed(() => {
  const t = total.value || 1;
  let offset = 0;
  return [
    { key: 'sim', color: 'var(--ok)', v: sim.value },
    { key: 'pendente', color: 'var(--wait)', v: pend.value },
    { key: 'nao', color: 'var(--no)', v: nao.value },
  ].map((s) => {
    const len = (s.v / t) * C;
    const seg = { ...s, dash: `${len} ${C - len}`, offset: -offset };
    offset += len;
    return seg;
  });
});
const drawn = ref(false);
onMounted(() => requestAnimationFrame(() => (drawn.value = true)));

/* tags */
const tagStats = computed(() =>
  TAGS.map((t) => {
    const list = props.guests.filter((g) => g.tags.includes(t.id));
    return { ...t, n: list.length, ok: list.filter((g) => g.status === 'sim').length };
  }),
);

/* ocupação por lado */
const sides = computed(() =>
  SIDES.map((lado) => {
    const cap = TABLES_PER_SIDE * SEATS_PER_TABLE;
    const n = props.guests.filter((g) => g.assento?.lado === lado).length;
    return { lado, n, cap, pct: Math.round((n / cap) * 100) };
  }),
);

/* respostas recentes */
const recent = computed(() =>
  props.invites
    .filter((i) => i.respondidoEm)
    .sort((a, b) => b.respondidoEm - a.respondidoEm)
    .slice(0, 6)
    .map((i) => ({
      code: i.code,
      title: i.familia || i.convidados[0]?.nome,
      when: i.respondidoEm,
      sim: i.convidados.filter((g) => i.respostas[g.id] === 'sim').length,
      nao: i.convidados.filter((g) => i.respostas[g.id] === 'nao').length,
    })),
);
function ago(d) {
  const s = Math.round((Date.now() - d) / 1000);
  if (s < 60) return 'agora';
  if (s < 3600) return `há ${Math.round(s / 60)} min`;
  if (s < 86400) return `há ${Math.round(s / 3600)} h`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

/* dias até o casamento (horário de Brasília) */
const days = computed(() => Math.max(0, Math.ceil((Date.UTC(2027, 7, 22, 18, 30) - Date.now()) / 86400000)));
</script>

<template>
  <section>
    <div class="section-head">
      <div>
        <p class="eyebrow">Painel</p>
        <h1>Visão geral</h1>
        <p>Tudo o que está acontecendo com os convidados, em tempo real.</p>
      </div>
      <div class="ov-count card">
        <CalendarHeart :size="20" />
        <div>
          <strong class="serif">{{ days }}</strong>
          <span>dias para o grande dia</span>
        </div>
      </div>
    </div>

    <div class="ov-kpis">
      <article v-for="(k, i) in kpis" :key="k.key" :class="['card ov-kpi rise', k.tone]" :style="{ '--i': i }">
        <span class="ov-kpi-icon"><component :is="k.icon" :size="18" /></span>
        <strong class="serif">{{ shown[k.key] }}</strong>
        <span class="ov-kpi-label">{{ k.label }}</span>
        <small>{{ k.sub }}</small>
      </article>
    </div>

    <div class="ov-grid">
      <!-- Respostas -->
      <article class="card ov-box rise" style="--i: 5">
        <header>
          <h2>Respostas</h2>
          <button class="b" type="button" @click="go('convidados')">Ver lista <ArrowUpRight :size="14" /></button>
        </header>
        <div class="ov-donut">
          <svg viewBox="0 0 140 140" :class="{ drawn }">
            <circle cx="70" cy="70" :r="R" class="ov-track" />
            <circle
              v-for="s in ring"
              :key="s.key"
              cx="70"
              cy="70"
              :r="R"
              class="ov-seg"
              :stroke="s.color"
              :stroke-dasharray="s.dash"
              :stroke-dashoffset="s.offset"
            />
          </svg>
          <div class="ov-donut-center">
            <strong class="serif">{{ total ? Math.round((sim / total) * 100) : 0 }}%</strong>
            <span>confirmados</span>
          </div>
        </div>
        <ul class="ov-legend">
          <li><i style="background: var(--ok)"></i>{{ STATUS.sim.label }}<b>{{ sim }}</b></li>
          <li><i style="background: var(--wait)"></i>{{ STATUS.pendente.label }}<b>{{ pend }}</b></li>
          <li><i style="background: var(--no)"></i>{{ STATUS.nao.label }}<b>{{ nao }}</b></li>
        </ul>
      </article>

      <!-- Mesas -->
      <article class="card ov-box rise" style="--i: 6">
        <header>
          <h2>Mesas</h2>
          <button class="b" type="button" @click="go('mesas')">Organizar <ArrowUpRight :size="14" /></button>
        </header>
        <div v-for="s in sides" :key="s.lado" class="ov-side">
          <div class="ov-side-head">
            <span class="serif">Lado {{ s.lado }}</span>
            <small>{{ s.n }} de {{ s.cap }} lugares</small>
          </div>
          <div class="ov-bar"><i :style="{ width: drawn ? s.pct + '%' : '0%' }"></i></div>
        </div>
        <div class="ov-unseated">
          <strong class="serif">{{ total - seated }}</strong>
          <span>convidado(s) ainda sem lugar</span>
        </div>
      </article>

      <!-- Tags -->
      <article class="card ov-box rise" style="--i: 7">
        <header><h2>Grupos</h2></header>
        <ul class="ov-tags">
          <li v-for="t in tagStats" :key="t.id" :style="{ '--c': t.color }">
            <span class="ov-tag-dot"></span>
            <div>
              <strong>{{ t.short }}</strong>
              <small>{{ t.ok }} confirmado(s)</small>
            </div>
            <b class="serif">{{ t.n }}</b>
          </li>
        </ul>
        <p class="muted ov-hint">Marque as tags de cada pessoa em <b>Convidados</b>.</p>
      </article>

      <!-- Recentes -->
      <article class="card ov-box ov-recent rise" style="--i: 8">
        <header><h2>Respostas recentes</h2></header>
        <p v-if="!recent.length" class="muted">Assim que alguém responder, aparece aqui.</p>
        <ul v-else>
          <li v-for="r in recent" :key="r.code">
            <span class="ov-recent-dot" :class="r.sim ? 'sim' : 'nao'"></span>
            <div>
              <strong>{{ r.title }}</strong>
              <small>
                <template v-if="r.sim">{{ r.sim }} vai{{ r.sim > 1 ? 'm' : '' }}</template>
                <template v-if="r.sim && r.nao"> · </template>
                <template v-if="r.nao">{{ r.nao }} não vai{{ r.nao > 1 ? 'm' : '' }}</template>
              </small>
            </div>
            <time>{{ ago(r.when) }}</time>
          </li>
        </ul>
      </article>
    </div>
  </section>
</template>

<style scoped>
.ov-count {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  color: var(--gold);
}
.ov-count strong {
  display: block;
  font-size: 1.8rem;
  line-height: 1;
  color: var(--text);
}
.ov-count span {
  font-size: 11px;
  color: var(--muted);
}
.ov-kpis {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}
.ov-kpi {
  display: grid;
  gap: 2px;
  padding: 18px;
  overflow: hidden;
  transition:
    transform 0.4s var(--ease),
    border-color 0.3s;
}
.ov-kpi:hover {
  transform: translateY(-4px);
  border-color: var(--line-2);
}
.ov-kpi::after {
  content: '';
  position: absolute;
  right: -30px;
  top: -30px;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--tone), transparent 70%);
  opacity: 0.16;
}
.ov-kpi.accent {
  --tone: var(--accent);
}
.ov-kpi.ok {
  --tone: var(--ok);
}
.ov-kpi.wait {
  --tone: var(--wait);
}
.ov-kpi.no {
  --tone: var(--no);
}
.ov-kpi.gold {
  --tone: var(--gold);
}
.ov-kpi-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  margin-bottom: 10px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--tone) 16%, transparent);
  color: var(--tone);
}
.ov-kpi strong {
  font-size: 2.3rem;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.ov-kpi-label {
  font-size: 13px;
  color: var(--soft);
}
.ov-kpi small {
  font-size: 11px;
  color: var(--muted);
}
.ov-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.ov-box {
  padding: 20px;
}
.ov-box header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 16px;
}
.ov-box h2 {
  font-size: 1.45rem;
}
.ov-donut {
  position: relative;
  width: 180px;
  margin: 0 auto 14px;
}
.ov-donut svg {
  display: block;
  width: 100%;
  transform: rotate(-90deg);
}
.ov-track {
  fill: none;
  stroke: rgba(255, 255, 255, 0.06);
  stroke-width: 14;
}
.ov-seg {
  fill: none;
  stroke-width: 14;
  stroke-linecap: butt;
  transition:
    stroke-dasharray 1.2s var(--ease),
    stroke-dashoffset 1.2s var(--ease),
    opacity 0.6s;
  opacity: 0;
}
.drawn .ov-seg {
  opacity: 1;
}
.ov-donut-center {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  text-align: center;
}
.ov-donut-center strong {
  font-size: 2.2rem;
  line-height: 1;
}
.ov-donut-center span {
  font-size: 11px;
  color: var(--muted);
}
.ov-legend {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 13px;
  color: var(--soft);
}
.ov-legend li {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ov-legend i {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}
.ov-legend b {
  margin-left: auto;
  font-weight: 500;
  color: var(--text);
}
.ov-side {
  margin-bottom: 16px;
}
.ov-side-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
}
.ov-side-head span {
  font-size: 1.2rem;
}
.ov-side-head small {
  color: var(--muted);
  font-size: 12px;
}
.ov-bar {
  height: 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}
.ov-bar i {
  display: block;
  height: 100%;
  border-radius: 10px;
  background: linear-gradient(90deg, #8fa3e2, #c4cff5);
  box-shadow: 0 0 14px rgba(165, 182, 236, 0.6);
  transition: width 1.3s var(--ease);
}
.ov-unseated {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px dashed var(--line-2);
  color: var(--muted);
  font-size: 13px;
}
.ov-unseated strong {
  font-size: 1.8rem;
  color: var(--gold);
}
.ov-tags {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.ov-tags li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
}
.ov-tag-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--c);
  box-shadow: 0 0 10px var(--c);
}
.ov-tags strong {
  display: block;
  font-size: 13px;
  font-weight: 500;
}
.ov-tags small {
  color: var(--muted);
  font-size: 11px;
}
.ov-tags b {
  margin-left: auto;
  font-size: 1.5rem;
  font-weight: 400;
  color: var(--c);
}
.ov-hint {
  margin-top: 12px;
  font-size: 12px;
}
.ov-recent ul {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.ov-recent li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 4px;
  border-bottom: 1px solid var(--line);
}
.ov-recent li:last-child {
  border: 0;
}
.ov-recent strong {
  display: block;
  font-size: 13px;
  font-weight: 500;
}
.ov-recent small {
  color: var(--muted);
  font-size: 11px;
}
.ov-recent time {
  margin-left: auto;
  color: var(--muted);
  font-size: 11px;
  white-space: nowrap;
}
.ov-recent-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: none;
}
.ov-recent-dot.sim {
  background: var(--ok);
  box-shadow: 0 0 10px var(--ok);
}
.ov-recent-dot.nao {
  background: var(--no);
}
@media (max-width: 1180px) {
  .ov-kpis {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 760px) {
  .ov-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .ov-kpi:first-child {
    grid-column: span 2;
  }
  .ov-grid {
    grid-template-columns: 1fr;
  }
  .ov-kpi strong {
    font-size: 2rem;
  }
}
</style>
