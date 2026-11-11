<script setup>
// Área dos noivos (#/admin): login por usuário e senha, convites e convidados,
// respostas em tempo real, importação de lista, exportação e dados do Pix.
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { LogOut, Plus, Search, Download, Copy, Pencil, Trash2, X, Check, Upload, QrCode, ExternalLink } from 'lucide-vue-next';
import {
  login,
  logout,
  watchUser,
  emailToUser,
  watchInvites,
  saveInvite,
  deleteInvite,
  inviteExists,
  randomCode,
  randomId,
  getSiteConfig,
  saveSiteConfig,
} from './api.js';
import { buildPix, pixQrSvg, pixConfigured } from './pix.js';

/* ---------- Sessão ---------- */
const user = ref(undefined); // undefined = verificando, null = deslogado
const loginForm = ref({ user: '', password: '' });
const loginError = ref('');
const loginBusy = ref(false);
let stopUser = null;
let stopInvites = null;

async function doLogin() {
  loginBusy.value = true;
  loginError.value = '';
  try {
    await login(loginForm.value.user, loginForm.value.password);
    loginForm.value.password = '';
  } catch (e) {
    const messages = {
      'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
      'auth/invalid-email': 'Usuário inválido. Digite só o usuário, por exemplo: henrique.carvalho',
      'auth/operation-not-allowed':
        'O login por e-mail e senha ainda não foi ativado no Firebase (Authentication → Método de login).',
      'auth/network-request-failed': 'Sem conexão com o servidor. Verifique a internet e tente de novo.',
    };
    loginError.value = messages[e?.code] || 'Usuário ou senha incorretos.';
  } finally {
    loginBusy.value = false;
  }
}
async function doLogout() {
  stopInvites?.();
  stopInvites = null;
  await logout();
}

/* ---------- Convites ---------- */
const invites = ref([]);
const loadError = ref('');
const tab = ref('convidados'); // convidados | importar | pix

function subscribe() {
  stopInvites?.();
  loadError.value = '';
  watchInvites(
    (list) => (invites.value = list),
    (err) =>
      (loadError.value =
        err?.code === 'permission-denied'
          ? 'Este usuário não tem permissão para ver os convidados.'
          : 'Não foi possível carregar os convidados.'),
  ).then((stop) => (stopInvites = stop));
}

onMounted(async () => {
  stopUser = await watchUser((u) => {
    user.value = u;
    if (u) {
      subscribe();
      loadConfig();
    } else invites.value = [];
  });
});
onUnmounted(() => {
  stopUser?.();
  stopInvites?.();
});

const statusOf = (inv, guest) => inv.respostas[guest.id] || 'pendente';
const stats = computed(() => {
  let convidados = 0;
  let sim = 0;
  let nao = 0;
  for (const inv of invites.value)
    for (const g of inv.convidados) {
      convidados++;
      const s = statusOf(inv, g);
      if (s === 'sim') sim++;
      else if (s === 'nao') nao++;
    }
  return { convites: invites.value.length, convidados, sim, nao, pendente: convidados - sim - nao };
});

const search = ref('');
const filter = ref('todos'); // todos | sim | nao | pendente
const strip = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
const visibleInvites = computed(() => {
  const q = strip(search.value);
  return invites.value
    .filter((inv) => {
      if (filter.value !== 'todos' && !inv.convidados.some((g) => statusOf(inv, g) === filter.value)) return false;
      if (!q) return true;
      return (
        strip(inv.familia).includes(q) ||
        inv.code.toLowerCase().includes(q) ||
        inv.convidados.some((g) => strip(g.nome).includes(q))
      );
    })
    .sort((a, b) => titleOf(a).localeCompare(titleOf(b), 'pt-BR'));
});
const titleOf = (inv) => inv.familia || inv.convidados[0]?.nome || '(sem nome)';

/* ---------- Copiar código / link do convite ---------- */
const copied = ref('');
async function copy(text, key) {
  try {
    await navigator.clipboard.writeText(text);
    copied.value = key;
    setTimeout(() => copied.value === key && (copied.value = ''), 1800);
  } catch {
    window.prompt('Copie o texto abaixo:', text);
  }
}
const inviteLink = (code) => `${location.origin}/?convite=${code}`;

/* ---------- Editor (fecha só pelo X) ---------- */
const editor = ref(null); // { isNew, code, familia, convidados: [{id, nome}], respostas }
const editorError = ref('');
const editorBusy = ref(false);

function newInvite() {
  editor.value = { isNew: true, code: randomCode(), familia: '', convidados: [{ id: randomId(), nome: '' }], respostas: {} };
  editorError.value = '';
}
function editInvite(inv) {
  editor.value = {
    isNew: false,
    code: inv.code,
    familia: inv.familia || '',
    convidados: inv.convidados.map((g) => ({ ...g })),
    respostas: { ...inv.respostas },
  };
  editorError.value = '';
}
function addGuest() {
  editor.value.convidados.push({ id: randomId(), nome: '' });
}
function removeGuest(i) {
  editor.value.convidados.splice(i, 1);
}
async function saveEditor() {
  const e = editor.value;
  const convidados = e.convidados.filter((g) => g.nome.trim());
  editorError.value = '';
  if (!convidados.length) return (editorError.value = 'Inclua pelo menos um convidado.');
  if (!/^[A-Z0-9]{6}$/.test(e.code)) return (editorError.value = 'O código deve ter 6 letras ou números.');
  editorBusy.value = true;
  try {
    if (e.isNew && (await inviteExists(e.code))) {
      editorError.value = 'Já existe um convite com esse código. Gere outro.';
      return;
    }
    await saveInvite({ ...e, convidados }, { isNew: e.isNew });
    editor.value = null;
  } catch {
    editorError.value = 'Não foi possível salvar. Verifique a conexão e tente de novo.';
  } finally {
    editorBusy.value = false;
  }
}
async function removeInvite(inv) {
  if (!window.confirm(`Excluir o convite de "${titleOf(inv)}"? As respostas também serão apagadas.`)) return;
  try {
    await deleteInvite(inv.code);
  } catch {
    window.alert('Não foi possível excluir o convite.');
  }
}

/* ---------- Importar lista ---------- */
// Uma linha por convite:  "Família Oliveira: Maria Oliveira, João Oliveira"  ou só  "Ana Souza"
const importText = ref('');
const importBusy = ref(false);
const importResult = ref('');
const parsedImport = computed(() =>
  importText.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(':');
      const familia = idx >= 0 ? line.slice(0, idx).trim() : '';
      const names = (idx >= 0 ? line.slice(idx + 1) : line)
        .split(/[,;]/)
        .map((n) => n.trim())
        .filter(Boolean);
      return { familia: familia || null, nomes: names };
    })
    .filter((x) => x.nomes.length),
);
async function runImport() {
  importBusy.value = true;
  importResult.value = '';
  const taken = new Set(invites.value.map((i) => i.code));
  let ok = 0;
  try {
    for (const item of parsedImport.value) {
      let code;
      do code = randomCode();
      while (taken.has(code) || (await inviteExists(code)));
      taken.add(code);
      await saveInvite(
        { code, familia: item.familia, convidados: item.nomes.map((nome) => ({ id: randomId(), nome })), respostas: {} },
        { isNew: true },
      );
      ok++;
    }
    importResult.value = `${ok} convite(s) importado(s).`;
    importText.value = '';
  } catch {
    importResult.value = `Importação interrompida após ${ok} convite(s). Verifique a conexão e tente o restante.`;
  } finally {
    importBusy.value = false;
  }
}

/* ---------- Exportar CSV (abre no Excel/Planilhas) ---------- */
function exportCsv() {
  const label = { sim: 'Vai', nao: 'Não vai', pendente: 'Sem resposta' };
  const rows = [['Código', 'Família', 'Convidado', 'Resposta', 'Respondido em', 'Link do convite']];
  for (const inv of visibleInvites.value)
    for (const g of inv.convidados)
      rows.push([
        inv.code,
        inv.familia || '',
        g.nome,
        label[statusOf(inv, g)],
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

/* ---------- Pix ---------- */
const pix = ref({ pixChave: '', pixNome: '', pixCidade: '' });
const pixBusy = ref(false);
const pixMsg = ref('');
const pixPreview = ref('');
async function loadConfig() {
  try {
    pix.value = { pixChave: '', pixNome: '', pixCidade: '', ...(await getSiteConfig()) };
  } catch {
    /* sem configuração ainda */
  }
}
async function savePix() {
  pixBusy.value = true;
  pixMsg.value = '';
  try {
    await saveSiteConfig({
      pixChave: pix.value.pixChave.trim(),
      pixNome: pix.value.pixNome.trim(),
      pixCidade: pix.value.pixCidade.trim(),
    });
    pixMsg.value = 'Dados do Pix salvos.';
  } catch {
    pixMsg.value = 'Não foi possível salvar os dados do Pix.';
  } finally {
    pixBusy.value = false;
  }
}
watch(
  pix,
  async (p) => {
    pixPreview.value = pixConfigured(p)
      ? await pixQrSvg(buildPix({ chave: p.pixChave, nome: p.pixNome, cidade: p.pixCidade, valor: 1 }))
      : '';
  },
  { deep: true },
);

const fmtDate = (d) =>
  d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
</script>

<template>
  <div class="adm">
    <!-- Verificando sessão -->
    <div v-if="user === undefined" class="adm-center"><p class="adm-muted">Carregando…</p></div>

    <!-- Login -->
    <div v-else-if="!user" class="adm-center">
      <form class="adm-login" @submit.prevent="doLogin">
        <img src="/logo.png" alt="" class="adm-logo" />
        <p class="eyebrow">Área dos noivos</p>
        <h1>Entrar</h1>
        <label>
          Usuário
          <input v-model.trim="loginForm.user" autocomplete="username" required autocapitalize="none" spellcheck="false" />
        </label>
        <label>
          Senha
          <input v-model="loginForm.password" type="password" autocomplete="current-password" required />
        </label>
        <p v-if="loginError" class="adm-error" role="alert">{{ loginError }}</p>
        <button class="btn btn-navy" type="submit" :disabled="loginBusy">{{ loginBusy ? 'Entrando…' : 'Entrar' }}</button>
        <a href="#inicio" class="adm-link">Voltar ao site</a>
      </form>
    </div>

    <!-- Painel -->
    <template v-else>
      <header class="adm-top">
        <div class="adm-brand">
          <img src="/logo.png" alt="" />
          <div>
            <strong>Área dos noivos</strong>
            <small>Olá, {{ emailToUser(user.email) }}</small>
          </div>
        </div>
        <div class="adm-top-actions">
          <a href="#inicio" class="adm-ghost"><ExternalLink :size="15" /> Ver site</a>
          <button class="adm-ghost" type="button" @click="doLogout"><LogOut :size="15" /> Sair</button>
        </div>
      </header>

      <main class="adm-main">
        <section class="adm-stats">
          <div><strong>{{ stats.convites }}</strong><span>convites</span></div>
          <div><strong>{{ stats.convidados }}</strong><span>convidados</span></div>
          <div class="ok"><strong>{{ stats.sim }}</strong><span>confirmados</span></div>
          <div class="no"><strong>{{ stats.nao }}</strong><span>não vão</span></div>
          <div class="wait"><strong>{{ stats.pendente }}</strong><span>sem resposta</span></div>
        </section>

        <nav class="adm-tabs" role="tablist">
          <button role="tab" :aria-selected="tab === 'convidados'" :class="{ on: tab === 'convidados' }" @click="tab = 'convidados'">Convidados</button>
          <button role="tab" :aria-selected="tab === 'importar'" :class="{ on: tab === 'importar' }" @click="tab = 'importar'">Importar lista</button>
          <button role="tab" :aria-selected="tab === 'pix'" :class="{ on: tab === 'pix' }" @click="tab = 'pix'">Pix</button>
        </nav>

        <p v-if="loadError" class="adm-error">{{ loadError }}</p>

        <!-- ===== Convidados ===== -->
        <section v-if="tab === 'convidados'">
          <div class="adm-toolbar">
            <label class="adm-search">
              <Search :size="16" />
              <input v-model="search" placeholder="Buscar por nome, família ou código" />
            </label>
            <select v-model="filter" aria-label="Filtrar por resposta">
              <option value="todos">Todas as respostas</option>
              <option value="sim">Confirmados</option>
              <option value="nao">Não vão</option>
              <option value="pendente">Sem resposta</option>
            </select>
            <button class="adm-ghost" type="button" @click="exportCsv"><Download :size="15" /> Exportar</button>
            <button class="btn btn-navy" type="button" @click="newInvite"><Plus :size="15" /> Novo convite</button>
          </div>

          <p v-if="!invites.length && !loadError" class="adm-empty">
            Nenhum convite ainda. Use <b>Novo convite</b> ou <b>Importar lista</b>.
          </p>

          <ul class="adm-list">
            <li v-for="inv in visibleInvites" :key="inv.code" class="adm-card">
              <div class="adm-card-head">
                <div>
                  <strong>{{ titleOf(inv) }}</strong>
                  <small>{{ inv.familia ? `${inv.convidados.length} pessoa(s)` : 'Convite individual' }}</small>
                </div>
                <div class="adm-code">
                  <button type="button" :title="'Copiar código'" @click="copy(inv.code, 'c' + inv.code)">
                    <span>{{ inv.code }}</span>
                    <Check v-if="copied === 'c' + inv.code" :size="14" /><Copy v-else :size="14" />
                  </button>
                  <button type="button" class="adm-mini" @click="copy(inviteLink(inv.code), 'l' + inv.code)">
                    {{ copied === 'l' + inv.code ? 'Link copiado!' : 'Copiar link' }}
                  </button>
                </div>
              </div>
              <ul class="adm-guests">
                <li v-for="g in inv.convidados" :key="g.id">
                  <span>{{ g.nome }}</span>
                  <em :class="['pill', statusOf(inv, g)]">
                    {{ { sim: 'Vai', nao: 'Não vai', pendente: 'Sem resposta' }[statusOf(inv, g)] }}
                  </em>
                </li>
              </ul>
              <div class="adm-card-foot">
                <small>{{ inv.respondidoEm ? `Respondeu em ${fmtDate(inv.respondidoEm)}` : 'Ainda não respondeu' }}</small>
                <div>
                  <button type="button" class="adm-icon" title="Editar" @click="editInvite(inv)"><Pencil :size="15" /></button>
                  <button type="button" class="adm-icon danger" title="Excluir" @click="removeInvite(inv)"><Trash2 :size="15" /></button>
                </div>
              </div>
            </li>
          </ul>
        </section>

        <!-- ===== Importar ===== -->
        <section v-else-if="tab === 'importar'" class="adm-panel">
          <h2>Importar lista de convidados</h2>
          <p class="adm-muted">
            Uma linha por convite. Para uma família, escreva o nome da família, dois-pontos e as pessoas separadas por
            vírgula. Para um convidado individual, escreva só o nome. Cada convite recebe um código automático.
          </p>
          <pre class="adm-example">Família Oliveira: Maria Oliveira, João Oliveira
Ana Souza
Família Santos: Carlos Santos, Juliana Santos, Pedro Santos</pre>
          <textarea v-model="importText" rows="10" placeholder="Cole a lista aqui"></textarea>
          <div class="adm-row">
            <span class="adm-muted">
              {{ parsedImport.length }} convite(s), {{ parsedImport.reduce((n, x) => n + x.nomes.length, 0) }} convidado(s)
            </span>
            <button class="btn btn-navy" type="button" :disabled="!parsedImport.length || importBusy" @click="runImport">
              <Upload :size="15" /> {{ importBusy ? 'Importando…' : 'Importar' }}
            </button>
          </div>
          <p v-if="importResult" class="adm-note">{{ importResult }}</p>
        </section>

        <!-- ===== Pix ===== -->
        <section v-else class="adm-panel adm-pix">
          <div>
            <h2>Dados do Pix</h2>
            <p class="adm-muted">
              Usados para gerar o QR Code e o "copia e cola" de cada presente (com o valor certo) e do valor livre.
              O nome deve ser o titular da chave, como aparece no banco.
            </p>
            <form @submit.prevent="savePix">
              <label>
                Chave Pix
                <input v-model="pix.pixChave" required placeholder="CPF, e-mail, telefone (+55…) ou chave aleatória" />
              </label>
              <label>
                Nome do recebedor <small>(até 25 letras)</small>
                <input v-model="pix.pixNome" required maxlength="25" />
              </label>
              <label>
                Cidade <small>(até 15 letras)</small>
                <input v-model="pix.pixCidade" required maxlength="15" placeholder="Lauro de Freitas" />
              </label>
              <button class="btn btn-navy" type="submit" :disabled="pixBusy">{{ pixBusy ? 'Salvando…' : 'Salvar' }}</button>
              <p v-if="pixMsg" class="adm-note">{{ pixMsg }}</p>
            </form>
          </div>
          <div class="adm-pix-preview">
            <p class="eyebrow"><QrCode :size="14" /> Teste de R$ 1,00</p>
            <div v-if="pixPreview" class="adm-qr" v-html="pixPreview"></div>
            <p v-else class="adm-muted">Preencha os três campos para ver o QR Code.</p>
            <small v-if="pixPreview" class="adm-muted">Faça um Pix de teste pelo app do banco antes de divulgar.</small>
          </div>
        </section>
      </main>

      <!-- Editor de convite: fecha apenas pelo X -->
      <Transition name="modal">
        <div v-if="editor" class="modal-backdrop">
          <div class="modal adm-editor" role="dialog" aria-modal="true" aria-labelledby="ed-title">
            <button class="modal-close" aria-label="Fechar" @click="editor = null"><X :size="22" /></button>
            <h2 id="ed-title">{{ editor.isNew ? 'Novo convite' : 'Editar convite' }}</h2>
            <form @submit.prevent="saveEditor">
              <label>
                Família <small>(opcional — deixe vazio para convite individual)</small>
                <input v-model="editor.familia" placeholder="Ex.: Família Oliveira" />
              </label>
              <fieldset>
                <legend>Convidados</legend>
                <div v-for="(g, i) in editor.convidados" :key="g.id" class="adm-guest-input">
                  <input v-model="g.nome" :placeholder="`Nome completo ${i + 1}`" :aria-label="`Convidado ${i + 1}`" />
                  <button
                    v-if="editor.convidados.length > 1"
                    type="button"
                    class="adm-icon danger"
                    aria-label="Remover convidado"
                    @click="removeGuest(i)"
                  >
                    <X :size="15" />
                  </button>
                </div>
                <button type="button" class="adm-ghost" @click="addGuest"><Plus :size="15" /> Adicionar pessoa</button>
              </fieldset>
              <label>
                Código do convite
                <div class="adm-row">
                  <input
                    v-model="editor.code"
                    :disabled="!editor.isNew"
                    maxlength="6"
                    class="adm-code-input"
                    @input="editor.code = editor.code.toUpperCase().replace(/[^A-Z0-9]/g, '')"
                  />
                  <button v-if="editor.isNew" type="button" class="adm-ghost" @click="editor.code = randomCode()">Gerar outro</button>
                </div>
              </label>
              <p v-if="editorError" class="adm-error" role="alert">{{ editorError }}</p>
              <button class="btn btn-navy" type="submit" :disabled="editorBusy">{{ editorBusy ? 'Salvando…' : 'Salvar convite' }}</button>
            </form>
          </div>
        </div>
      </Transition>
    </template>
  </div>
</template>

<style scoped>
.adm {
  min-height: 100svh;
  background: #fcf1e5;
  color: var(--navy);
}
.adm-center {
  min-height: 100svh;
  display: grid;
  place-items: center;
  padding: 24px;
}
.adm-login {
  width: min(380px, 100%);
  display: grid;
  gap: 14px;
  padding: 36px 30px;
  border: 1px solid rgba(29, 58, 138, 0.18);
  border-radius: 20px;
  background: #fffaf3;
  box-shadow: 0 24px 60px #0b1f4914;
  text-align: center;
}
.adm-logo {
  width: 96px;
  margin: 0 auto;
}
.adm-login h1 {
  margin: 0 0 6px;
  font-size: 2.4rem;
}
.adm-login .eyebrow {
  margin: 0;
}
label {
  display: grid;
  gap: 6px;
  font-size: 12px;
  letter-spacing: 0.04em;
  color: var(--ink-soft);
  text-align: left;
}
label small {
  font-size: 11px;
  opacity: 0.8;
}
input,
select,
textarea {
  width: 100%;
  padding: 11px 14px;
  border: 1px solid rgba(29, 58, 138, 0.22);
  border-radius: 12px;
  background: #fff;
  color: var(--navy);
  font: inherit;
  font-size: 14px;
}
input:focus,
select:focus,
textarea:focus {
  outline: 2px solid rgba(180, 147, 104, 0.45);
  outline-offset: 1px;
}
input:disabled {
  background: #f4ede1;
  color: var(--ink-soft);
}
.adm-error {
  margin: 0;
  color: #b3261e;
  font-size: 13px;
}
.adm-note {
  margin: 10px 0 0;
  color: #2e6b3f;
  font-size: 13px;
}
.adm-muted {
  color: var(--ink-soft);
  font-size: 13px;
}
.adm-link {
  font-size: 12px;
  color: var(--gold);
}

.adm-top {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px clamp(16px, 4vw, 48px);
  background: rgba(252, 241, 229, 0.92);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(29, 58, 138, 0.12);
}
.adm-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.adm-brand img {
  width: 52px;
}
.adm-brand strong {
  display: block;
  font-family: var(--serif);
  font-size: 1.3rem;
  font-weight: 400;
}
.adm-brand small {
  color: var(--ink-soft);
}
.adm-top-actions {
  display: flex;
  gap: 8px;
}
.adm-ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 14px;
  border: 1px solid rgba(29, 58, 138, 0.22);
  border-radius: 30px;
  background: transparent;
  color: var(--navy);
  font-size: 12px;
  white-space: nowrap;
}
.adm-ghost:hover {
  border-color: var(--gold);
}
.adm-main {
  max-width: 1180px;
  margin: 0 auto;
  padding: 28px clamp(16px, 4vw, 48px) 80px;
}
.adm-stats {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-bottom: 26px;
}
.adm-stats div {
  padding: 16px;
  border: 1px solid rgba(29, 58, 138, 0.14);
  border-radius: 16px;
  background: #fffaf3;
}
.adm-stats strong {
  display: block;
  font-family: var(--serif);
  font-size: 2rem;
  font-weight: 400;
}
.adm-stats span {
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-soft);
}
.adm-stats .ok strong {
  color: #2e6b3f;
}
.adm-stats .no strong {
  color: #9a3b32;
}
.adm-stats .wait strong {
  color: var(--gold);
}
.adm-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 20px;
  border-bottom: 1px solid rgba(29, 58, 138, 0.12);
}
.adm-tabs button {
  padding: 10px 16px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--ink-soft);
  font-size: 13px;
}
.adm-tabs button.on {
  border-color: var(--navy);
  color: var(--navy);
}
.adm-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 18px;
}
.adm-search {
  position: relative;
  flex: 1 1 260px;
  display: block;
}
.adm-search svg {
  position: absolute;
  left: 12px;
  top: 50%;
  translate: 0 -50%;
  color: var(--ink-soft);
}
.adm-search input {
  padding-left: 36px;
}
.adm-toolbar select {
  width: auto;
}
.adm-empty {
  padding: 40px;
  border: 1px dashed rgba(29, 58, 138, 0.25);
  border-radius: 16px;
  text-align: center;
  color: var(--ink-soft);
}
.adm-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.adm-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px;
  border: 1px solid rgba(29, 58, 138, 0.14);
  border-radius: 16px;
  background: #fffaf3;
}
.adm-card-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}
.adm-card-head strong {
  display: block;
  font-size: 15px;
}
.adm-card-head small,
.adm-card-foot small {
  color: var(--ink-soft);
  font-size: 12px;
}
.adm-code {
  display: grid;
  justify-items: end;
  gap: 4px;
}
.adm-code button:first-child {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: 1px solid rgba(29, 58, 138, 0.2);
  border-radius: 8px;
  background: #fff;
  color: var(--navy);
  font-family: ui-monospace, monospace;
  font-size: 13px;
  letter-spacing: 0.12em;
}
.adm-mini {
  border: 0;
  background: none;
  color: var(--gold);
  font-size: 11px;
}
.adm-guests {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 14px;
}
.adm-guests li {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}
.pill {
  flex: none;
  padding: 3px 9px;
  border-radius: 20px;
  font-size: 11px;
  font-style: normal;
}
.pill.sim {
  background: #e3f1e6;
  color: #2e6b3f;
}
.pill.nao {
  background: #f6e2df;
  color: #9a3b32;
}
.pill.pendente {
  background: #f1e8d8;
  color: #8a6a3f;
}
.adm-card-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px dashed rgba(29, 58, 138, 0.15);
}
.adm-icon {
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 1px solid rgba(29, 58, 138, 0.18);
  border-radius: 50%;
  background: #fff;
  color: var(--navy);
  margin-left: 6px;
}
.adm-icon.danger:hover {
  color: #b3261e;
  border-color: #b3261e;
}
.adm-panel {
  max-width: 760px;
}
.adm-panel h2 {
  font-size: 1.8rem;
  margin-bottom: 8px;
}
.adm-example {
  margin: 12px 0;
  padding: 14px;
  border-radius: 12px;
  background: #f4ede1;
  font-size: 13px;
  white-space: pre-wrap;
}
.adm-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 12px;
}
.adm-pix {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 32px;
  max-width: 960px;
}
.adm-pix form {
  display: grid;
  gap: 14px;
  margin-top: 14px;
}
.adm-pix-preview {
  align-self: start;
  padding: 20px;
  border: 1px solid rgba(29, 58, 138, 0.14);
  border-radius: 16px;
  background: #fffaf3;
  text-align: center;
}
.adm-pix-preview .eyebrow {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}
.adm-qr {
  width: 200px;
  margin: 10px auto;
}
.adm-qr :deep(svg) {
  display: block;
  width: 100%;
  height: auto;
}
.adm-editor {
  text-align: left;
}
.adm-editor form {
  display: grid;
  gap: 16px;
  margin-top: 10px;
}
.adm-editor h2 {
  font-size: 2rem;
  margin: 0;
}
fieldset {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  border: 0;
}
legend {
  margin-bottom: 6px;
  font-size: 12px;
  letter-spacing: 0.04em;
  color: var(--ink-soft);
}
.adm-guest-input {
  display: flex;
  gap: 6px;
  align-items: center;
}
.adm-guest-input .adm-icon {
  flex: none;
  margin: 0;
}
fieldset .adm-ghost {
  justify-self: start;
}
.adm-code-input {
  font-family: ui-monospace, monospace;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}
@media (max-width: 760px) {
  .adm-stats {
    grid-template-columns: repeat(3, 1fr);
  }
  .adm-stats div:nth-child(n + 4) {
    grid-column: span 1;
  }
  .adm-pix {
    grid-template-columns: 1fr;
  }
  .adm-brand small {
    display: none;
  }
  .adm-list {
    grid-template-columns: 1fr;
  }
}
</style>
