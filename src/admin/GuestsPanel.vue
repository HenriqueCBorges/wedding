<script setup>
import { ref, computed, inject, watch, onMounted, onUnmounted } from 'vue';
import {
  Search,
  Plus,
  Download,
  Copy,
  Check,
  Pencil,
  Trash2,
  X,
  Link2,
  Armchair,
  Upload,
  SlidersHorizontal,
  CheckSquare,
  MessageCircle,
  BellRing,
  Tag,
  UserMinus,
  CalendarClock,
  UserCheck,
  LayoutGrid,
  List,
} from 'lucide-vue-next';
import { saveInvite, deleteInvite, inviteExists, randomCode, randomId, saveGuestsBatch, saveSiteConfig, saveResponsesBatch } from '../api.js';
import { TAGS, tagById, STATUS, SIDES, seatShort, seatLabel, seatKey, strip, tablesFor, tableTitle } from './seating.js';
import { waLink, inviteMessage, reminderMessage, inviteLink } from './whatsapp.js';

const props = defineProps({ invites: Array, guests: Array, tables: Object, config: Object });
const emit = defineEmits(['config-saved']);

/* ---------- Prazo para responder (aparece na confirmação de presença do site) ---------- */
const deadline = ref('');
watch(
  () => props.config?.prazoConfirmacao,
  (v) => (deadline.value = v || ''),
  { immediate: true },
);
const deadlineBusy = ref(false);
async function saveDeadline() {
  deadlineBusy.value = true;
  try {
    await saveSiteConfig({ prazoConfirmacao: deadline.value || '' });
    toast(deadline.value ? 'Prazo para responder salvo' : 'Prazo removido');
    emit('config-saved');
  } catch {
    toast('Não foi possível salvar o prazo', 'err');
  } finally {
    deadlineBusy.value = false;
  }
}
const toast = inject('toast');
const go = inject('go');

/* ---------- Filtros e ordenação ---------- */
const search = ref('');
const status = ref('todos');
const tag = ref('todas');
const more = ref(false); // painel de filtros extras
const seat = ref('todos'); // todos | com | sem | A | B
const kind = ref('todos'); // todos | familia | individual
const view = ref('cards'); // cards (por família) | lista
const recent = ref(false); // respondeu nos últimos 7 dias
const sort = ref('nome'); // nome | recentes | mesa

const statusOf = (inv, g) => inv.respostas[g.id] || 'pendente';
const titleOf = (inv) => inv.familia || inv.convidados[0]?.nome || '(sem nome)';
const extraCount = computed(
  () => [seat.value !== 'todos', kind.value !== 'todos', recent.value].filter(Boolean).length,
);
function clearExtras() {
  seat.value = kind.value = 'todos';
  recent.value = false;
}
const weekAgo = () => Date.now() - 7 * 86400000;
function guestMatches(inv, g) {
  const q = strip(search.value);
  if (q && !strip(g.nome).includes(q) && !strip(inv.familia).includes(q) && !inv.code.toLowerCase().includes(q)) return false;
  if (status.value !== 'todos' && statusOf(inv, g) !== status.value) return false;
  if (tag.value !== 'todas' && !(g.tags || []).includes(tag.value)) return false;
  if (seat.value === 'com' && !g.assento) return false;
  if (seat.value === 'sem' && g.assento) return false;
  if ((seat.value === 'A' || seat.value === 'B') && g.assento?.lado !== seat.value) return false;
  return true;
}
const firstSeat = (inv) => {
  const s = inv.convidados.map((g) => g.assento).filter(Boolean)[0];
  return s ? (s.lado === 'A' ? 0 : 1000) + s.mesa * 20 + s.cadeira : 99999;
};
const visible = computed(() => {
  const q = strip(search.value);
  const list = props.invites.filter((inv) => {
    if (kind.value === 'familia' && !inv.familia) return false;
    if (kind.value === 'individual' && inv.familia) return false;
    if (recent.value && !(inv.respondidoEm && inv.respondidoEm > weekAgo())) return false;
    if (!inv.convidados.some((g) => guestMatches(inv, g))) return false;
    if (!q) return true;
    return strip(inv.familia).includes(q) || inv.code.toLowerCase().includes(q) || inv.convidados.some((g) => strip(g.nome).includes(q));
  });
  const by = {
    nome: (a, b) => titleOf(a).localeCompare(titleOf(b), 'pt-BR'),
    recentes: (a, b) => (b.respondidoEm || 0) - (a.respondidoEm || 0),
    mesa: (a, b) => firstSeat(a) - firstSeat(b),
  };
  return list.sort(by[sort.value]);
});
/* só as pessoas que batem com os filtros (tag, resposta, lugar, busca) */
const peopleOf = (inv) => inv.convidados.filter((g) => guestMatches(inv, g));
const filtering = computed(() => !!search.value.trim() || status.value !== 'todos' || tag.value !== 'todas' || seat.value !== 'todos');

/* visualização em lista: uma linha por pessoa */
const rows = computed(() => {
  const list = visible.value.flatMap((inv) => peopleOf(inv).map((g) => ({ inv, g, key: keyOf(inv, g) })));
  const by = {
    nome: (a, b) => a.g.nome.localeCompare(b.g.nome, 'pt-BR'),
    recentes: (a, b) => (b.inv.respondidoEm || 0) - (a.inv.respondidoEm || 0) || a.g.nome.localeCompare(b.g.nome, 'pt-BR'),
    mesa: (a, b) => seatOrder(a.g.assento) - seatOrder(b.g.assento) || a.g.nome.localeCompare(b.g.nome, 'pt-BR'),
  };
  return list.sort(by[sort.value]);
});
const seatOrder = (s) => (s ? (s.lado === 'A' ? 0 : 1000) + s.mesa * 20 + s.cadeira : 99999);
const shownPeople = computed(() => rows.value.length);

const counts = computed(() => {
  const c = { todos: props.guests.length, sim: 0, nao: 0, pendente: 0 };
  for (const g of props.guests) c[g.status]++;
  return c;
});

/* ---------- Copiar ---------- */
const copied = ref('');
async function copy(text, key, msg) {
  try {
    await navigator.clipboard.writeText(text);
    copied.value = key;
    toast(msg);
    setTimeout(() => copied.value === key && (copied.value = ''), 1800);
  } catch {
    window.prompt('Copie o texto abaixo:', text);
  }
}
const waFor = (inv) => waLink(inv.telefone, inviteMessage(inv));

/* ---------- Lembrar quem não respondeu ---------- */
const pendingInvites = computed(() => props.invites.filter((inv) => !inv.respondidoEm && inv.convidados.length));
const reminders = ref(false);

/* ---------- Seleção e ações em massa ---------- */
const selecting = ref(false);
const selected = ref(new Set()); // chaves "codigo:id"
const keyOf = (inv, g) => `${inv.code}:${g.id}`;
function toggle(inv, g) {
  const s = new Set(selected.value);
  const k = keyOf(inv, g);
  s.has(k) ? s.delete(k) : s.add(k);
  selected.value = s;
}
function toggleInvite(inv) {
  const keys = peopleOf(inv).map((g) => keyOf(inv, g));
  const all = keys.every((k) => selected.value.has(k));
  const s = new Set(selected.value);
  keys.forEach((k) => (all ? s.delete(k) : s.add(k)));
  selected.value = s;
}
function selectVisible() {
  const s = new Set();
  for (const r of rows.value) s.add(r.key);
  selected.value = s;
}
function stopSelecting() {
  selecting.value = false;
  selected.value = new Set();
}
watch(selecting, (v) => !v && (selected.value = new Set()));

const busy = ref(false);
async function bulkUpdate(mutate, okMsg) {
  const byCode = new Map();
  for (const k of selected.value) {
    const [code, id] = k.split(':');
    if (!byCode.has(code)) {
      const inv = props.invites.find((i) => i.code === code);
      if (!inv) continue;
      byCode.set(code, inv.convidados.map((g) => ({ ...g, tags: [...(g.tags || [])] })));
    }
    const g = byCode.get(code).find((x) => x.id === id);
    if (g) mutate(g, code);
  }
  busy.value = true;
  try {
    await saveGuestsBatch(byCode);
    toast(okMsg);
    return true;
  } catch {
    toast('Não foi possível aplicar a ação', 'err');
    return false;
  } finally {
    busy.value = false;
  }
}
const bulkTag = ref('');
async function applyTag(add) {
  if (!bulkTag.value) return;
  const t = bulkTag.value;
  await bulkUpdate(
    (g) => (g.tags = add ? [...new Set([...g.tags, t])] : g.tags.filter((x) => x !== t)),
    `${add ? 'Tag adicionada a' : 'Tag removida de'} ${selected.value.size} pessoa(s)`,
  );
}
/* ---------- Respostas pelo painel (ex.: quem confirmou por telefone ou pessoalmente) ---------- */
const STATUS_OPTIONS = ['sim', 'nao', 'pendente'];
async function setStatus(pairs, value, okMsg) {
  const byCode = new Map();
  for (const { inv, g } of pairs) {
    if (!byCode.has(inv.code)) byCode.set(inv.code, { ...inv.respostas });
    const r = byCode.get(inv.code);
    if (value === 'pendente') delete r[g.id];
    else r[g.id] = value;
  }
  busy.value = true;
  try {
    await saveResponsesBatch(byCode);
    toast(okMsg);
  } catch {
    toast('Não foi possível registrar a resposta', 'err');
  } finally {
    busy.value = false;
  }
}
const statusMenu = ref(''); // chave da pessoa com o menu de resposta aberto
function toggleStatusMenu(key) {
  statusMenu.value = statusMenu.value === key ? '' : key;
}
function chooseStatus(inv, g, value) {
  statusMenu.value = '';
  if (statusOf(inv, g) === value) return;
  setStatus([{ inv, g }], value, `${g.nome.split(' ')[0]}: ${STATUS[value].label.toLowerCase()}`);
}
const closeMenus = () => (statusMenu.value = '');
onMounted(() => document.addEventListener('click', closeMenus));
onUnmounted(() => document.removeEventListener('click', closeMenus));

const bulkStatus = ref('');
async function applyStatus() {
  if (!bulkStatus.value) return;
  const pairs = [];
  for (const k of selected.value) {
    const [code, id] = k.split(':');
    const inv = props.invites.find((i) => i.code === code);
    const g = inv?.convidados.find((x) => x.id === id);
    if (g) pairs.push({ inv, g });
  }
  await setStatus(pairs, bulkStatus.value, `${pairs.length} pessoa(s): ${STATUS[bulkStatus.value].label.toLowerCase()}`);
}

async function unseatSelected() {
  await bulkUpdate((g) => (g.assento = null), `${selected.value.size} pessoa(s) sem lugar`);
}

/* mandar a seleção para uma mesa (ocupa as cadeiras livres em ordem) */
const target = ref('');
const tableOptions = computed(() => SIDES.flatMap((l) => tablesFor(props.tables, l)));
const taken = computed(() => new Set(props.guests.filter((g) => g.assento).map((g) => seatKey(g.assento))));
function freeSeatsOf(t) {
  return Array.from({ length: t.cadeiras }, (_, i) => ({ lado: t.lado, mesa: t.mesa, cadeira: i + 1 })).filter(
    (s) => !taken.value.has(seatKey(s)),
  );
}
async function sendToTable() {
  const t = tableOptions.value.find((x) => `${x.lado}-${x.mesa}` === target.value);
  if (!t) return;
  const free = freeSeatsOf(t);
  const people = [...selected.value].filter((k) => {
    const g = props.guests.find((x) => x.key === k);
    return g && !(g.assento && g.assento.lado === t.lado && g.assento.mesa === t.mesa);
  });
  if (!free.length) return toast(`${tableTitle(t)} (Lado ${t.lado}) está cheia`, 'err');
  const placing = new Map(people.slice(0, free.length).map((k, i) => [k, free[i]]));
  const ok = await bulkUpdate((g, code) => {
    const s = placing.get(`${code}:${g.id}`);
    if (s) g.assento = s;
  }, `${placing.size} pessoa(s) em ${tableTitle(t)} · Lado ${t.lado}`);
  if (ok && people.length > free.length) toast(`Só havia ${free.length} cadeira(s) livre(s); ${people.length - free.length} ficaram de fora`, 'err');
}
function exportSelected() {
  exportCsv([...selected.value]);
}

/* ---------- Editor (fecha só pelo X) ---------- */
const editor = ref(null);
const editorError = ref('');
const saving = ref(false);
const blankGuest = () => ({ id: randomId(), nome: '', tags: [], assento: null });
function openNew() {
  editor.value = { isNew: true, code: randomCode(), familia: '', telefone: '', convidados: [blankGuest()], respostas: {} };
  editorError.value = '';
}
function openEdit(inv) {
  editor.value = {
    isNew: false,
    code: inv.code,
    familia: inv.familia || '',
    telefone: inv.telefone || '',
    convidados: inv.convidados.map((g) => ({ ...g, tags: [...(g.tags || [])] })),
    respostas: { ...inv.respostas },
  };
  editorError.value = '';
}
function toggleTag(g, id) {
  g.tags = g.tags.includes(id) ? g.tags.filter((t) => t !== id) : [...g.tags, id];
}
async function save() {
  const e = editor.value;
  const convidados = e.convidados.filter((g) => g.nome.trim());
  editorError.value = '';
  if (!convidados.length) return (editorError.value = 'Inclua pelo menos um convidado.');
  if (!/^[A-Z0-9]{6}$/.test(e.code)) return (editorError.value = 'O código deve ter 6 letras ou números.');
  saving.value = true;
  try {
    if (e.isNew && (await inviteExists(e.code))) return (editorError.value = 'Já existe um convite com esse código. Gere outro.');
    await saveInvite({ ...e, convidados }, { isNew: e.isNew });
    toast(e.isNew ? 'Convite criado' : 'Convite atualizado');
    editor.value = null;
  } catch {
    editorError.value = 'Não foi possível salvar. Verifique a conexão e tente de novo.';
  } finally {
    saving.value = false;
  }
}
async function remove(inv) {
  if (!window.confirm(`Excluir o convite de "${titleOf(inv)}"? As respostas e os lugares também serão apagados.`)) return;
  try {
    await deleteInvite(inv.code);
    toast('Convite excluído');
  } catch {
    toast('Não foi possível excluir', 'err');
  }
}

/* ---------- Exportar ---------- */
function exportCsv(onlyKeys) {
  const only = onlyKeys ? new Set(onlyKeys) : null;
  const out = [['Código', 'Família', 'Convidado', 'Resposta', 'Tags', 'Lugar', 'WhatsApp', 'Respondido em', 'Link do convite']];
  // exporta exatamente o que está na tela (ou só a seleção)
  const source = only ? props.invites.flatMap((inv) => inv.convidados.filter((g) => only.has(keyOf(inv, g))).map((g) => ({ inv, g }))) : rows.value;
  for (const { inv, g } of source)
    out.push([
      inv.code,
      inv.familia || '',
      g.nome,
      STATUS[statusOf(inv, g)].label,
      (g.tags || []).map((t) => tagById[t]?.label).join(', '),
      seatLabel(g.assento),
      inv.telefone || '',
      inv.respondidoEm ? inv.respondidoEm.toLocaleString('pt-BR') : '',
      inviteLink(inv.code),
    ]);
  const csv = '﻿' + out.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `convidados-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
</script>

<template>
  <section :class="{ 'gp-selecting': selecting }">
    <div class="section-head">
      <div>
        <p class="eyebrow">Lista</p>
        <h1>Convidados</h1>
        <p>
          {{ invites.length }} convites · {{ guests.length }} pessoas
          <template v-if="filtering"> · <b class="gp-shown">{{ shownPeople }} no filtro</b></template>
        </p>
      </div>
      <div class="gp-actions">
        <button class="b" type="button" @click="reminders = true"><BellRing :size="15" /> Lembrar pendentes</button>
        <button class="b" type="button" @click="go('importar')"><Upload :size="15" /> Importar</button>
        <button class="b" type="button" @click="exportCsv()"><Download :size="15" /> Exportar</button>
        <button class="b primary" type="button" @click="openNew"><Plus :size="15" /> Novo convite</button>
      </div>
    </div>

    <div class="card gp-deadline">
      <CalendarClock :size="18" />
      <div>
        <strong>Prazo para responder</strong>
        <small>Aparece na confirmação de presença e nas perguntas frequentes do site.</small>
      </div>
      <input v-model="deadline" type="date" aria-label="Data limite para responder" />
      <button class="b" type="button" :disabled="deadlineBusy || deadline === (config?.prazoConfirmacao || '')" @click="saveDeadline">
        {{ deadlineBusy ? 'Salvando…' : 'Salvar' }}
      </button>
    </div>

    <div class="gp-filters card">
      <label class="search">
        <Search :size="16" />
        <input v-model="search" placeholder="Buscar por nome, família ou código" />
      </label>
      <div class="segmented gp-status">
        <button v-for="s in ['todos', 'sim', 'pendente', 'nao']" :key="s" :class="{ on: status === s }" @click="status = s">
          {{ s === 'todos' ? 'Todos' : STATUS[s].short }}
          <small>{{ counts[s] }}</small>
        </button>
      </div>
      <div class="gp-row">
        <div class="gp-tagfilter">
          <button :class="['tag', { on: tag === 'todas' }]" style="--c: #a5b6ec" @click="tag = 'todas'">Todas as tags</button>
          <button
            v-for="t in TAGS"
            :key="t.id"
            :class="['tag', { on: tag === t.id }]"
            :style="{ '--c': t.color }"
            @click="tag = tag === t.id ? 'todas' : t.id"
          >
            {{ t.short }}
          </button>
        </div>
        <div class="gp-tools">
          <div class="segmented gp-view">
            <button :class="{ on: view === 'cards' }" aria-label="Ver por família" @click="view = 'cards'"><LayoutGrid :size="15" /> Famílias</button>
            <button :class="{ on: view === 'lista' }" aria-label="Ver em lista" @click="view = 'lista'"><List :size="15" /> Lista</button>
          </div>
          <label class="gp-sort">
            <span class="muted">Ordenar</span>
            <select v-model="sort" aria-label="Ordenar">
              <option value="nome">Nome</option>
              <option value="recentes">Resposta mais recente</option>
              <option value="mesa">Mesa</option>
            </select>
          </label>
          <button :class="['b', { on: more || extraCount }]" type="button" @click="more = !more">
            <SlidersHorizontal :size="15" /> Filtros<span v-if="extraCount" class="gp-badge">{{ extraCount }}</span>
          </button>
          <button :class="['b', { on: selecting }]" type="button" @click="selecting = !selecting">
            <CheckSquare :size="15" /> {{ selecting ? 'Cancelar seleção' : 'Selecionar' }}
          </button>
        </div>
      </div>
      <Transition name="gp-more">
        <div v-if="more" class="gp-more">
          <label class="field">
            Lugar
            <select v-model="seat">
              <option value="todos">Todos</option>
              <option value="sem">Sem lugar</option>
              <option value="com">Com lugar</option>
              <option value="A">No Lado A</option>
              <option value="B">No Lado B</option>
            </select>
          </label>
          <label class="field">
            Tipo de convite
            <select v-model="kind">
              <option value="todos">Todos</option>
              <option value="familia">Família</option>
              <option value="individual">Individual</option>
            </select>
          </label>
          <label class="gp-check"><input v-model="recent" type="checkbox" /> Responderam nos últimos 7 dias</label>
          <button v-if="extraCount" class="b" type="button" @click="clearExtras">Limpar filtros</button>
        </div>
      </Transition>
    </div>

    <div v-if="selecting" class="gp-selhint muted">
      Toque nas pessoas para selecionar.
      <button type="button" @click="selectVisible">Selecionar todas as visíveis</button>
    </div>

    <div v-if="!invites.length" class="empty">
      <p>Nenhum convite ainda.</p>
      <p>Use <b>Novo convite</b> ou importe sua lista em <a href="#" @click.prevent="go('importar')">Importar</a>.</p>
    </div>
    <div v-else-if="!visible.length" class="empty">Nenhum convidado com esses filtros.</div>

    <TransitionGroup v-else-if="view === 'cards'" tag="ul" name="gp-list" class="gp-grid">
      <li v-for="(inv, i) in visible" :key="inv.code" class="card gp-card rise" :style="{ '--i': Math.min(i, 12) }">
        <header>
          <div>
            <strong class="serif" @click="selecting && toggleInvite(inv)">{{ titleOf(inv) }}</strong>
            <small>
              <template v-if="inv.familia">
                {{ filtering && peopleOf(inv).length !== inv.convidados.length ? `${peopleOf(inv).length} de ${inv.convidados.length} pessoas` : `${inv.convidados.length} pessoa(s)` }}
              </template>
              <template v-else>Convite individual</template>
            </small>
          </div>
          <button class="gp-code" type="button" title="Copiar código" @click="copy(inv.code, 'c' + inv.code, 'Código copiado')">
            {{ inv.code }}
            <Check v-if="copied === 'c' + inv.code" :size="13" /><Copy v-else :size="13" />
          </button>
        </header>
        <ul class="gp-people">
          <li
            v-for="g in peopleOf(inv)"
            :key="g.id"
            :class="{ sel: selected.has(keyOf(inv, g)) }"
            @click="selecting && toggle(inv, g)"
          >
            <span v-if="selecting" class="gp-box" aria-hidden="true"><Check :size="12" /></span>
            <div class="gp-person">
              <span>{{ g.nome }}</span>
              <span class="gp-tags">
                <i v-for="t in g.tags || []" :key="t" class="tag" :style="{ '--c': tagById[t]?.color }">{{ tagById[t]?.short }}</i>
              </span>
            </div>
            <div class="gp-meta">
              <span :class="['seat-badge', { none: !g.assento }]" :title="seatLabel(g.assento)">
                <Armchair :size="11" /> {{ seatShort(g.assento) }}
              </span>
              <span class="gp-status-wrap" @click.stop>
                <button
                  type="button"
                  :class="['pill', 'gp-pill-btn', statusOf(inv, g)]"
                  :aria-expanded="statusMenu === keyOf(inv, g)"
                  title="Alterar resposta"
                  @click="selecting ? toggle(inv, g) : toggleStatusMenu(keyOf(inv, g))"
                >
                  {{ STATUS[statusOf(inv, g)].short }}
                </button>
                <Transition name="gp-menu">
                  <span v-if="statusMenu === keyOf(inv, g)" class="gp-status-menu" role="menu">
                    <button
                      v-for="opt in STATUS_OPTIONS"
                      :key="opt"
                      type="button"
                      role="menuitem"
                      :class="['gp-status-opt', opt, { on: statusOf(inv, g) === opt }]"
                      @click="chooseStatus(inv, g, opt)"
                    >
                      <i></i> {{ STATUS[opt].label }}
                    </button>
                  </span>
                </Transition>
              </span>
            </div>
          </li>
        </ul>
        <footer>
          <div class="gp-links">
            <button class="gp-link" type="button" @click="copy(inviteLink(inv.code), 'l' + inv.code, 'Link do convite copiado')">
              <Link2 :size="13" /> {{ copied === 'l' + inv.code ? 'Copiado!' : 'Copiar link' }}
            </button>
            <a v-if="inv.telefone" class="gp-link wa" :href="waFor(inv)" target="_blank" rel="noopener">
              <MessageCircle :size="13" /> WhatsApp
            </a>
          </div>
          <div>
            <button class="b icon" type="button" title="Editar" @click="openEdit(inv)"><Pencil :size="15" /></button>
            <button class="b icon danger" type="button" title="Excluir" @click="remove(inv)"><Trash2 :size="15" /></button>
          </div>
        </footer>
      </li>
    </TransitionGroup>

    <!-- Visualização em lista: uma linha por pessoa -->
    <div v-else class="card gp-table-wrap">
      <table class="gp-table">
        <thead>
          <tr>
            <th v-if="selecting" class="gp-col-check"></th>
            <th>Convidado</th>
            <th class="hide-sm">Família</th>
            <th>Tags</th>
            <th>Lugar</th>
            <th>Resposta</th>
            <th class="hide-sm">Código</th>
            <th class="gp-col-act"></th>
          </tr>
        </thead>
        <TransitionGroup tag="tbody" name="gp-row">
          <tr
            v-for="r in rows"
            :key="r.key"
            :class="{ sel: selected.has(r.key) }"
            @click="selecting && toggle(r.inv, r.g)"
          >
            <td v-if="selecting" class="gp-col-check"><span class="gp-box"><Check :size="12" /></span></td>
            <td>
              <strong>{{ r.g.nome }}</strong>
              <small class="show-sm">{{ r.inv.familia || 'Individual' }}</small>
            </td>
            <td class="hide-sm muted">{{ r.inv.familia || 'Individual' }}</td>
            <td>
              <span class="gp-tags">
                <i v-for="t in r.g.tags || []" :key="t" class="tag" :style="{ '--c': tagById[t]?.color }">{{ tagById[t]?.short }}</i>
              </span>
            </td>
            <td>
              <span :class="['seat-badge', { none: !r.g.assento }]" :title="seatLabel(r.g.assento)">
                <Armchair :size="11" /> {{ seatShort(r.g.assento) }}
              </span>
            </td>
            <td>
              <span class="gp-status-wrap" @click.stop>
                <button
                  type="button"
                  :class="['pill', 'gp-pill-btn', statusOf(r.inv, r.g)]"
                  :aria-expanded="statusMenu === r.key"
                  title="Alterar resposta"
                  @click="selecting ? toggle(r.inv, r.g) : toggleStatusMenu(r.key)"
                >
                  {{ STATUS[statusOf(r.inv, r.g)].short }}
                </button>
                <Transition name="gp-menu">
                  <span v-if="statusMenu === r.key" class="gp-status-menu" role="menu">
                    <button
                      v-for="opt in STATUS_OPTIONS"
                      :key="opt"
                      type="button"
                      role="menuitem"
                      :class="['gp-status-opt', opt, { on: statusOf(r.inv, r.g) === opt }]"
                      @click="chooseStatus(r.inv, r.g, opt)"
                    >
                      <i></i> {{ STATUS[opt].label }}
                    </button>
                  </span>
                </Transition>
              </span>
            </td>
            <td class="hide-sm"><span class="gp-code-mini">{{ r.inv.code }}</span></td>
            <td class="gp-col-act">
              <button class="b icon" type="button" title="Editar convite" @click.stop="openEdit(r.inv)"><Pencil :size="14" /></button>
            </td>
          </tr>
        </TransitionGroup>
      </table>
    </div>

    <!-- Barra de ações em massa -->
    <Transition name="gp-bar">
      <div v-if="selecting" class="gp-bulk card">
        <strong>{{ selected.size }} selecionada(s)</strong>
        <div class="gp-bulk-group">
          <UserCheck :size="15" />
          <select v-model="bulkStatus" aria-label="Resposta">
            <option value="">Resposta…</option>
            <option value="sim">Confirmar presença</option>
            <option value="nao">Marcar que não vai</option>
            <option value="pendente">Voltar para "a confirmar"</option>
          </select>
          <button class="b primary" type="button" :disabled="!selected.size || !bulkStatus || busy" @click="applyStatus">Aplicar</button>
        </div>
        <div class="gp-bulk-group">
          <Tag :size="15" />
          <select v-model="bulkTag" aria-label="Tag">
            <option value="">Tag…</option>
            <option v-for="t in TAGS" :key="t.id" :value="t.id">{{ t.label }}</option>
          </select>
          <button class="b" type="button" :disabled="!selected.size || !bulkTag || busy" @click="applyTag(true)">Adicionar</button>
          <button class="b" type="button" :disabled="!selected.size || !bulkTag || busy" @click="applyTag(false)">Remover</button>
        </div>
        <div class="gp-bulk-group">
          <Armchair :size="15" />
          <select v-model="target" aria-label="Mesa">
            <option value="">Mandar para a mesa…</option>
            <optgroup v-for="l in SIDES" :key="l" :label="`Lado ${l}`">
              <option
                v-for="t in tableOptions.filter((x) => x.lado === l)"
                :key="l + t.mesa"
                :value="`${l}-${t.mesa}`"
              >
                {{ tableTitle(t) }} · {{ freeSeatsOf(t).length }} livre(s)
              </option>
            </optgroup>
          </select>
          <button class="b primary" type="button" :disabled="!selected.size || !target || busy" @click="sendToTable">Mandar</button>
          <button class="b" type="button" :disabled="!selected.size || busy" title="Tirar das mesas" @click="unseatSelected">
            <UserMinus :size="15" />
          </button>
        </div>
        <button class="b" type="button" :disabled="!selected.size" @click="exportSelected"><Download :size="15" /></button>
        <button class="b icon" type="button" aria-label="Fechar seleção" @click="stopSelecting"><X :size="16" /></button>
      </div>
    </Transition>

    <!-- Lembrar pendentes: fecha apenas pelo X -->
    <Teleport to="body">
      <Transition name="adm-pop">
        <div v-if="reminders" class="adm adm-modal-backdrop">
          <div class="adm-modal gp-rem" role="dialog" aria-modal="true" aria-labelledby="gp-rem-title">
            <button class="b icon close" type="button" aria-label="Fechar" @click="reminders = false"><X :size="18" /></button>
            <p class="eyebrow">WhatsApp</p>
            <h2 id="gp-rem-title">Lembrar quem não respondeu</h2>
            <p class="muted">{{ pendingInvites.length }} convite(s) ainda sem resposta. Toque para abrir a conversa com a mensagem pronta.</p>
            <ul>
              <li v-for="inv in pendingInvites" :key="inv.code">
                <div>
                  <strong>{{ titleOf(inv) }}</strong>
                  <small>{{ inv.telefone || 'sem WhatsApp cadastrado' }}</small>
                </div>
                <a v-if="inv.telefone" class="b gold" :href="waLink(inv.telefone, reminderMessage(inv))" target="_blank" rel="noopener">
                  <MessageCircle :size="14" /> Lembrar
                </a>
                <button v-else class="b" type="button" @click="copy(reminderMessage(inv), 'r' + inv.code, 'Mensagem copiada')">
                  <Copy :size="14" /> {{ copied === 'r' + inv.code ? 'Copiada' : 'Copiar mensagem' }}
                </button>
              </li>
            </ul>
            <p v-if="!pendingInvites.length" class="muted">Todo mundo já respondeu. 🎉</p>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Editor: fecha apenas pelo X -->
    <Teleport to="body">
      <Transition name="adm-pop">
        <div v-if="editor" class="adm adm-modal-backdrop">
          <div class="adm-modal" role="dialog" aria-modal="true" aria-labelledby="ed-title">
            <button class="b icon close" type="button" aria-label="Fechar" @click="editor = null"><X :size="18" /></button>
            <p class="eyebrow">{{ editor.isNew ? 'Novo' : 'Editar' }}</p>
            <h2 id="ed-title">{{ editor.isNew ? 'Novo convite' : 'Editar convite' }}</h2>
            <form class="ed-form" @submit.prevent="save">
              <label class="field">
                Família <small>(opcional — vazio = convite individual)</small>
                <input v-model="editor.familia" placeholder="Ex.: Família Oliveira" />
              </label>
              <label class="field">
                WhatsApp <small>(com DDD)</small>
                <input v-model="editor.telefone" inputmode="tel" placeholder="(71) 99999-8888" />
              </label>
              <div class="ed-people">
                <span class="ed-label">Convidados e tags</span>
                <TransitionGroup name="gp-list">
                  <div v-for="(g, i) in editor.convidados" :key="g.id" class="ed-person">
                    <div class="ed-row">
                      <input v-model="g.nome" :placeholder="`Nome completo ${i + 1}`" :aria-label="`Convidado ${i + 1}`" />
                      <button
                        v-if="editor.convidados.length > 1"
                        type="button"
                        class="b icon danger"
                        aria-label="Remover pessoa"
                        @click="editor.convidados.splice(i, 1)"
                      >
                        <X :size="15" />
                      </button>
                    </div>
                    <div class="ed-tags">
                      <button
                        v-for="t in TAGS"
                        :key="t.id"
                        type="button"
                        :class="['tag', { on: g.tags.includes(t.id) }]"
                        :style="{ '--c': t.color }"
                        :aria-pressed="g.tags.includes(t.id)"
                        @click="toggleTag(g, t.id)"
                      >
                        {{ t.label }}
                      </button>
                      <span v-if="g.assento" class="seat-badge"><Armchair :size="11" /> {{ seatLabel(g.assento) }}</span>
                    </div>
                  </div>
                </TransitionGroup>
                <button type="button" class="b" @click="editor.convidados.push(blankGuest())"><Plus :size="15" /> Adicionar pessoa</button>
              </div>
              <label class="field">
                Código do convite
                <div class="ed-row">
                  <input
                    v-model="editor.code"
                    :disabled="!editor.isNew"
                    maxlength="6"
                    class="ed-code"
                    @input="editor.code = editor.code.toUpperCase().replace(/[^A-Z0-9]/g, '')"
                  />
                  <button v-if="editor.isNew" type="button" class="b" @click="editor.code = randomCode()">Gerar outro</button>
                </div>
              </label>
              <p v-if="editorError" class="error" role="alert">{{ editorError }}</p>
              <button class="b primary" type="submit" :disabled="saving">{{ saving ? 'Salvando…' : 'Salvar convite' }}</button>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<style scoped>
.gp-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.gp-deadline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  padding: 12px 14px;
  color: var(--gold);
}
.gp-deadline div {
  flex: 1;
  min-width: 180px;
}
.gp-deadline strong {
  display: block;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--text);
}
.gp-deadline small {
  font-size: 11.5px;
  color: var(--muted);
}
.gp-deadline input {
  width: auto;
  min-height: 40px;
}
.gp-filters {
  display: grid;
  gap: 12px;
  padding: 14px;
  margin-bottom: 14px;
}
.gp-filters > .search,
.gp-filters > .gp-status {
  width: 100%;
}
@media (min-width: 1000px) {
  .gp-filters {
    grid-template-columns: 1fr auto;
    align-items: center;
  }
  .gp-row,
  .gp-more {
    grid-column: 1 / -1;
  }
}
.gp-status small {
  margin-left: 2px;
  padding: 1px 7px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.07);
  font-size: 10.5px;
}
.gp-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.gp-tagfilter {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.gp-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.gp-tools .b.on {
  border-color: rgba(165, 182, 236, 0.6);
  background: rgba(165, 182, 236, 0.12);
}
.gp-sort {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.gp-sort select {
  width: auto;
  min-height: 40px;
}
.gp-badge {
  display: grid;
  place-items: center;
  min-width: 18px;
  height: 18px;
  border-radius: 10px;
  background: var(--gold);
  color: #2a1f0e;
  font-size: 10.5px;
  font-weight: 600;
}
.gp-more {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  align-items: end;
  padding-top: 12px;
  border-top: 1px dashed var(--line);
}
.gp-check {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  font-size: 13px;
  color: var(--soft);
}
.gp-check input {
  width: 16px;
  min-height: 16px;
  accent-color: #a5b6ec;
}
.gp-more-enter-active,
.gp-more-leave-active {
  transition:
    opacity 0.3s,
    transform 0.35s var(--ease);
}
.gp-more-enter-from,
.gp-more-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
.gp-selhint {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
  font-size: 13px;
}
.gp-selhint button {
  padding: 0;
  border: 0;
  background: none;
  color: var(--accent);
  text-decoration: underline;
}
.gp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.gp-selecting .gp-grid {
  padding-bottom: 110px;
}
.gp-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  transition:
    transform 0.4s var(--ease),
    border-color 0.3s;
}
.gp-card:hover {
  transform: translateY(-3px);
  border-color: var(--line-2);
}
.gp-card header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}
.gp-card header strong {
  display: block;
  font-size: 1.35rem;
  font-weight: 400;
  line-height: 1.15;
}
.gp-card header small {
  color: var(--muted);
  font-size: 12px;
}
.gp-code {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: 1px solid var(--line-2);
  border-radius: 9px;
  background: rgba(0, 0, 0, 0.25);
  color: var(--gold);
  font-family: ui-monospace, monospace;
  font-size: 12.5px;
  letter-spacing: 0.14em;
}
.gp-people {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.gp-people > li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.025);
  transition:
    opacity 0.25s,
    border-color 0.2s,
    background 0.2s;
}
.gp-selecting .gp-people > li {
  cursor: pointer;
}
.gp-people > li.sel {
  border-color: rgba(165, 182, 236, 0.55);
  background: rgba(165, 182, 236, 0.1);
  opacity: 1;
}
.gp-box {
  display: grid;
  place-items: center;
  flex: none;
  width: 18px;
  height: 18px;
  border: 1.5px solid var(--line-2);
  border-radius: 5px;
  color: transparent;
  transition:
    background 0.2s,
    color 0.2s;
}
.sel .gp-box {
  border-color: transparent;
  background: var(--accent);
  color: var(--accent-ink);
}
.gp-person {
  flex: 1;
  display: grid;
  gap: 4px;
  min-width: 0;
  font-size: 14px;
}
.gp-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.gp-tags i {
  font-style: normal;
  font-size: 10px;
  padding: 1px 7px;
}
.gp-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: none;
}
.gp-card footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px dashed var(--line);
}
.gp-card footer > div {
  display: flex;
  gap: 6px;
}
.gp-links {
  display: flex;
  flex-wrap: wrap;
  gap: 14px !important;
}
.gp-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--accent);
  font-size: 12px;
  text-decoration: none;
}
.gp-link.wa {
  color: #7fd6a0;
}

.gp-shown {
  font-weight: 500;
  color: var(--gold);
}
.gp-table-wrap {
  overflow-x: auto;
}
.gp-selecting .gp-table-wrap {
  margin-bottom: 110px;
}
.gp-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
}
.gp-table th {
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
  white-space: nowrap;
}
.gp-table td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--line);
  vertical-align: middle;
}
.gp-table tbody tr {
  transition: background 0.2s;
}
.gp-table tbody tr:hover {
  background: rgba(165, 182, 236, 0.05);
}
.gp-selecting .gp-table tbody tr {
  cursor: pointer;
}
.gp-table tr.sel {
  background: rgba(165, 182, 236, 0.1);
}
.gp-table td strong {
  display: block;
  font-weight: 500;
}
.gp-table .show-sm {
  display: none;
  color: var(--muted);
  font-size: 11.5px;
}
.gp-col-check {
  width: 36px;
}
.gp-col-act {
  width: 52px;
  text-align: right;
}
.gp-code-mini {
  font-family: ui-monospace, monospace;
  font-size: 12px;
  letter-spacing: 0.12em;
  color: var(--gold);
}
.gp-row-move,
.gp-row-enter-active,
.gp-row-leave-active {
  transition:
    transform 0.35s var(--ease),
    opacity 0.25s;
}
.gp-row-enter-from,
.gp-row-leave-to {
  opacity: 0;
}
.gp-row-leave-active {
  display: none;
}

/* resposta editável pelo painel */
.gp-status-wrap {
  position: relative;
  display: inline-flex;
}
.gp-pill-btn {
  border: 1px solid transparent;
  cursor: pointer;
  font-family: inherit;
  transition:
    border-color 0.2s,
    transform 0.2s var(--ease);
}
.gp-pill-btn:hover {
  border-color: currentColor;
}
.gp-pill-btn:active {
  transform: scale(0.95);
}
.gp-status-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  z-index: 30;
  display: grid;
  min-width: 170px;
  padding: 6px;
  border: 1px solid var(--line-2);
  border-radius: 14px;
  background: var(--panel-2);
  box-shadow: 0 20px 40px -14px rgba(0, 0, 0, 0.8);
}
.gp-status-opt {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 10px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--text);
  font-size: 13px;
  text-align: left;
  white-space: nowrap;
}
.gp-status-opt:hover,
.gp-status-opt.on {
  background: rgba(255, 255, 255, 0.06);
}
.gp-status-opt i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.gp-status-opt.sim i {
  background: var(--ok);
}
.gp-status-opt.nao i {
  background: var(--no);
}
.gp-status-opt.pendente i {
  border: 1.5px solid var(--wait);
}
.gp-menu-enter-active,
.gp-menu-leave-active {
  transition:
    opacity 0.2s,
    transform 0.25s var(--ease);
}
.gp-menu-enter-from,
.gp-menu-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.97);
}
.gp-table-wrap {
  overflow: visible;
}
@media (max-width: 760px) {
  .gp-table-wrap {
    overflow-x: auto;
  }
}

/* barra de ações em massa */
.gp-bulk {
  position: fixed;
  left: 50%;
  bottom: 22px;
  z-index: 40;
  translate: -50% 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  width: min(980px, calc(100vw - 40px));
  padding: 12px 14px;
  border-color: rgba(165, 182, 236, 0.35);
  background: rgba(26, 38, 66, 0.96);
  backdrop-filter: blur(12px);
  box-shadow: 0 30px 60px -20px rgba(0, 0, 0, 0.9);
}
.gp-bulk strong {
  font-size: 13px;
  font-weight: 500;
  color: var(--accent);
  white-space: nowrap;
}
.gp-bulk-group {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-left: 10px;
  border-left: 1px solid var(--line);
  color: var(--muted);
}
.gp-bulk-group select {
  width: auto;
  max-width: 230px;
  min-height: 40px;
}
.gp-bulk > .b.icon {
  margin-left: auto;
}
.gp-bar-enter-active,
.gp-bar-leave-active {
  transition:
    opacity 0.3s,
    transform 0.4s var(--ease);
}
.gp-bar-enter-from,
.gp-bar-leave-to {
  opacity: 0;
  transform: translateY(30px);
}
.gp-list-move,
.gp-list-enter-active,
.gp-list-leave-active {
  transition:
    transform 0.45s var(--ease),
    opacity 0.3s;
}
.gp-list-enter-from,
.gp-list-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
.gp-list-leave-active {
  position: absolute;
}

/* lembretes */
.gp-rem ul {
  display: grid;
  gap: 8px;
  max-height: 55vh;
  margin: 16px 0 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}
.gp-rem li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
}
.gp-rem li strong {
  display: block;
  font-size: 14px;
  font-weight: 500;
}
.gp-rem li small {
  color: var(--muted);
  font-size: 12px;
}
.gp-rem .b {
  text-decoration: none;
}

/* editor */
.ed-form {
  display: grid;
  gap: 18px;
  margin-top: 16px;
}
.ed-form small {
  font-size: 11px;
  opacity: 0.8;
}
.ed-people {
  display: grid;
  gap: 10px;
}
.ed-label {
  font-size: 12px;
  color: var(--muted);
}
.ed-person {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.18);
}
.ed-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.ed-row .b.icon {
  flex: none;
}
.ed-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.ed-people > .b {
  justify-self: start;
}
.ed-code {
  font-family: ui-monospace, monospace;
  letter-spacing: 0.2em;
}
@media (max-width: 900px) {
  .gp-bulk {
    bottom: calc(92px + env(safe-area-inset-bottom));
    width: calc(100vw - 20px);
  }
  .gp-selecting .gp-grid {
    padding-bottom: 190px;
  }
}
@media (max-width: 760px) {
  .gp-grid {
    grid-template-columns: 1fr;
  }
  .gp-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    width: 100%;
  }
  .gp-status {
    overflow-x: auto;
  }
  .gp-status button {
    flex: 1;
    justify-content: center;
    padding: 8px 8px;
  }
  .gp-people > li {
    flex-wrap: wrap;
  }
  .gp-bulk-group {
    flex-wrap: wrap;
    width: 100%;
    padding-left: 0;
    border-left: 0;
  }
  .gp-bulk-group select {
    flex: 1;
    max-width: none;
  }
  .gp-table .hide-sm {
    display: none;
  }
  .gp-table .show-sm {
    display: block;
  }
  .gp-table th,
  .gp-table td {
    padding: 9px 8px;
  }
  .gp-view {
    width: 100%;
  }
  .gp-view button {
    flex: 1;
    justify-content: center;
  }
}
</style>
