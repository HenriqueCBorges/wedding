<script setup>
import { ref, computed, inject } from 'vue';
import { Search, Plus, Download, Copy, Check, Pencil, Trash2, X, Link2, Armchair } from 'lucide-vue-next';
import { saveInvite, deleteInvite, inviteExists, randomCode, randomId } from '../api.js';
import { TAGS, tagById, STATUS, seatShort, seatLabel, strip } from './seating.js';

const props = defineProps({ invites: Array, guests: Array });
const toast = inject('toast');
const go = inject('go');

/* ---------- Filtros ---------- */
const search = ref('');
const status = ref('todos');
const tag = ref('todas');
const statusOf = (inv, g) => inv.respostas[g.id] || 'pendente';
const titleOf = (inv) => inv.familia || inv.convidados[0]?.nome || '(sem nome)';

const visible = computed(() => {
  const q = strip(search.value);
  return props.invites
    .filter((inv) => {
      const people = inv.convidados.filter(
        (g) =>
          (status.value === 'todos' || statusOf(inv, g) === status.value) &&
          (tag.value === 'todas' || (g.tags || []).includes(tag.value)),
      );
      if (!people.length) return false;
      if (!q) return true;
      return strip(inv.familia).includes(q) || inv.code.toLowerCase().includes(q) || inv.convidados.some((g) => strip(g.nome).includes(q));
    })
    .sort((a, b) => titleOf(a).localeCompare(titleOf(b), 'pt-BR'));
});
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
const inviteLink = (code) => `${location.origin}/?convite=${code}`;

/* ---------- Editor (fecha só pelo X) ---------- */
const editor = ref(null);
const editorError = ref('');
const busy = ref(false);
function openNew() {
  editor.value = { isNew: true, code: randomCode(), familia: '', convidados: [blankGuest()], respostas: {} };
  editorError.value = '';
}
function openEdit(inv) {
  editor.value = {
    isNew: false,
    code: inv.code,
    familia: inv.familia || '',
    convidados: inv.convidados.map((g) => ({ ...g, tags: [...(g.tags || [])] })),
    respostas: { ...inv.respostas },
  };
  editorError.value = '';
}
const blankGuest = () => ({ id: randomId(), nome: '', tags: [], assento: null });
function toggleTag(g, id) {
  g.tags = g.tags.includes(id) ? g.tags.filter((t) => t !== id) : [...g.tags, id];
}
async function save() {
  const e = editor.value;
  const convidados = e.convidados.filter((g) => g.nome.trim());
  editorError.value = '';
  if (!convidados.length) return (editorError.value = 'Inclua pelo menos um convidado.');
  if (!/^[A-Z0-9]{6}$/.test(e.code)) return (editorError.value = 'O código deve ter 6 letras ou números.');
  busy.value = true;
  try {
    if (e.isNew && (await inviteExists(e.code))) return (editorError.value = 'Já existe um convite com esse código. Gere outro.');
    await saveInvite({ ...e, convidados }, { isNew: e.isNew });
    toast(e.isNew ? 'Convite criado' : 'Convite atualizado');
    editor.value = null;
  } catch {
    editorError.value = 'Não foi possível salvar. Verifique a conexão e tente de novo.';
  } finally {
    busy.value = false;
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
function exportCsv() {
  const rows = [['Código', 'Família', 'Convidado', 'Resposta', 'Tags', 'Lugar', 'Respondido em', 'Link do convite']];
  for (const inv of visible.value)
    for (const g of inv.convidados)
      rows.push([
        inv.code,
        inv.familia || '',
        g.nome,
        STATUS[statusOf(inv, g)].label,
        (g.tags || []).map((t) => tagById[t]?.label).join(', '),
        seatLabel(g.assento),
        inv.respondidoEm ? inv.respondidoEm.toLocaleString('pt-BR') : '',
        inviteLink(inv.code),
      ]);
  const csv = '﻿' + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `convidados-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
</script>

<template>
  <section>
    <div class="section-head">
      <div>
        <p class="eyebrow">Lista</p>
        <h1>Convidados</h1>
        <p>{{ invites.length }} convites · {{ guests.length }} pessoas</p>
      </div>
      <div class="gp-actions">
        <button class="b" type="button" @click="exportCsv"><Download :size="15" /> Exportar</button>
        <button class="b primary" type="button" @click="openNew"><Plus :size="15" /> Novo convite</button>
      </div>
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
    </div>

    <div v-if="!invites.length" class="empty">
      <p>Nenhum convite ainda.</p>
      <p>Use <b>Novo convite</b> ou importe sua lista em <a href="#" @click.prevent="go('importar')">Importar</a>.</p>
    </div>
    <div v-else-if="!visible.length" class="empty">Nenhum convidado com esses filtros.</div>

    <TransitionGroup v-else tag="ul" name="gp-list" class="gp-grid">
      <li v-for="(inv, i) in visible" :key="inv.code" class="card gp-card rise" :style="{ '--i': Math.min(i, 12) }">
        <header>
          <div>
            <strong class="serif">{{ titleOf(inv) }}</strong>
            <small>{{ inv.familia ? `${inv.convidados.length} pessoa(s)` : 'Convite individual' }}</small>
          </div>
          <button class="gp-code" type="button" title="Copiar código" @click="copy(inv.code, 'c' + inv.code, 'Código copiado')">
            {{ inv.code }}
            <Check v-if="copied === 'c' + inv.code" :size="13" /><Copy v-else :size="13" />
          </button>
        </header>
        <ul class="gp-people">
          <li v-for="g in inv.convidados" :key="g.id">
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
              <span :class="['pill', statusOf(inv, g)]">{{ STATUS[statusOf(inv, g)].short }}</span>
            </div>
          </li>
        </ul>
        <footer>
          <button class="gp-link" type="button" @click="copy(inviteLink(inv.code), 'l' + inv.code, 'Link do convite copiado')">
            <Link2 :size="13" /> {{ copied === 'l' + inv.code ? 'Link copiado!' : 'Copiar link do convite' }}
          </button>
          <div>
            <button class="b icon" type="button" title="Editar" @click="openEdit(inv)"><Pencil :size="15" /></button>
            <button class="b icon danger" type="button" title="Excluir" @click="remove(inv)"><Trash2 :size="15" /></button>
          </div>
        </footer>
      </li>
    </TransitionGroup>

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
              <button class="b primary" type="submit" :disabled="busy">{{ busy ? 'Salvando…' : 'Salvar convite' }}</button>
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
  gap: 10px;
}
.gp-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 14px;
  margin-bottom: 18px;
}
.gp-status small {
  margin-left: 2px;
  padding: 1px 7px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.07);
  font-size: 10.5px;
}
.gp-tagfilter {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.gp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
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
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.025);
}
.gp-person {
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
.gp-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--accent);
  font-size: 12px;
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
@media (max-width: 760px) {
  .gp-grid {
    grid-template-columns: 1fr;
  }
  .gp-actions {
    width: 100%;
  }
  .gp-actions .b {
    flex: 1;
  }
  .gp-status {
    width: 100%;
    overflow-x: auto;
  }
  .gp-status button {
    flex: 1;
    justify-content: center;
    padding: 8px 8px;
  }
  .gp-people > li {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
