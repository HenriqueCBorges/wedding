<script setup>
// Painel dos noivos (#/admin): login, navegação e dados em tempo real.
// Cada seção fica em src/admin/*.vue.
import { ref, computed, onMounted, onUnmounted, provide } from 'vue';
import { LayoutDashboard, Users, Armchair, Upload, QrCode, LogOut, ExternalLink, Check, AlertCircle } from 'lucide-vue-next';
import { login, logout, watchUser, emailToUser, watchInvites, getSiteConfig } from './api.js';
import { flattenGuests } from './admin/seating.js';
import OverviewPanel from './admin/OverviewPanel.vue';
import GuestsPanel from './admin/GuestsPanel.vue';
import SeatingPanel from './admin/SeatingPanel.vue';
import ImportPanel from './admin/ImportPanel.vue';
import PixPanel from './admin/PixPanel.vue';
import './admin/admin.css';

/* ---------- Sessão ---------- */
const user = ref(undefined); // undefined = verificando, null = deslogado
const form = ref({ user: '', password: '' });
const loginError = ref('');
const loginBusy = ref(false);
let stopUser = null;
let stopInvites = null;

async function doLogin() {
  loginBusy.value = true;
  loginError.value = '';
  try {
    await login(form.value.user, form.value.password);
    form.value.password = '';
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

/* ---------- Dados ---------- */
const invites = ref([]);
const loaded = ref(false);
const loadError = ref('');
const config = ref({});
const guests = computed(() => flattenGuests(invites.value));

function subscribe() {
  stopInvites?.();
  loadError.value = '';
  watchInvites(
    (list) => {
      invites.value = list;
      loaded.value = true;
    },
    (err) => {
      loaded.value = true;
      loadError.value =
        err?.code === 'permission-denied'
          ? 'Este usuário não tem permissão para ver os convidados.'
          : 'Não foi possível carregar os convidados.';
    },
  ).then((stop) => (stopInvites = stop));
}
async function reloadConfig() {
  try {
    config.value = await getSiteConfig();
  } catch {
    /* ainda sem configuração */
  }
}

onMounted(async () => {
  stopUser = await watchUser((u) => {
    user.value = u;
    if (u) {
      subscribe();
      reloadConfig();
    } else {
      invites.value = [];
      loaded.value = false;
    }
  });
});
onUnmounted(() => {
  stopUser?.();
  stopInvites?.();
});

/* ---------- Avisos (toasts) ---------- */
const toasts = ref([]);
let toastId = 0;
function toast(text, type = 'ok') {
  const id = ++toastId;
  toasts.value.push({ id, text, type });
  setTimeout(() => (toasts.value = toasts.value.filter((t) => t.id !== id)), 3200);
}
provide('toast', toast);

/* ---------- Navegação ---------- */
const sections = [
  { id: 'geral', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'convidados', label: 'Convidados', icon: Users },
  { id: 'mesas', label: 'Mesas', icon: Armchair },
  { id: 'importar', label: 'Importar', icon: Upload },
  { id: 'pix', label: 'Pix', icon: QrCode },
];
const section = ref('geral');
function go(id) {
  section.value = id;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
provide('go', go);
</script>

<template>
  <div class="adm">
    <!-- Verificando sessão -->
    <div v-if="user === undefined" class="adm-center">
      <span class="adm-spinner" aria-label="Carregando"></span>
    </div>

    <!-- Login -->
    <div v-else-if="!user" class="adm-center">
      <form class="adm-login card" @submit.prevent="doLogin">
        <div class="adm-login-mark">
          <img src="/logo-light.png" alt="" />
        </div>
        <p class="eyebrow">Área dos noivos</p>
        <h1>Bem-vindos</h1>
        <p class="muted">Entre para acompanhar convidados, mesas e presentes.</p>
        <label class="field">
          Usuário
          <input v-model.trim="form.user" autocomplete="username" required autocapitalize="none" spellcheck="false" placeholder="ex.: henrique.carvalho" />
        </label>
        <label class="field">
          Senha
          <input v-model="form.password" type="password" autocomplete="current-password" required />
        </label>
        <p v-if="loginError" class="error" role="alert">{{ loginError }}</p>
        <button class="b primary" type="submit" :disabled="loginBusy">{{ loginBusy ? 'Entrando…' : 'Entrar' }}</button>
        <a href="#inicio" class="adm-back">← Voltar ao site</a>
      </form>
    </div>

    <!-- Painel -->
    <div v-else class="adm-shell">
      <aside class="adm-side">
        <div class="adm-brand">
          <img src="/logo-light.png" alt="" />
          <div>
            <strong>Stefania &amp; Henrique</strong>
            <small>22 . 08 . 2027</small>
          </div>
        </div>
        <nav class="adm-nav" aria-label="Seções do painel">
          <button
            v-for="s in sections"
            :key="s.id"
            :class="{ on: section === s.id }"
            :aria-current="section === s.id ? 'page' : undefined"
            @click="go(s.id)"
          >
            <component :is="s.icon" :size="18" stroke-width="1.7" />
            <span>{{ s.label }}</span>
          </button>
        </nav>
        <div class="adm-side-foot">
          <div class="adm-user">
            <span class="adm-avatar">{{ emailToUser(user.email).slice(0, 1).toUpperCase() }}</span>
            <div>
              <strong>{{ emailToUser(user.email) }}</strong>
              <small>Conectado</small>
            </div>
          </div>
          <div class="adm-side-actions">
            <a href="#inicio" class="b"><ExternalLink :size="15" /> Ver site</a>
            <button class="b" type="button" @click="doLogout"><LogOut :size="15" /> Sair</button>
          </div>
        </div>
      </aside>

      <!-- topo no celular -->
      <header class="adm-mtop">
        <img src="/logo-light.png" alt="" />
        <strong class="serif">{{ sections.find((s) => s.id === section).label }}</strong>
        <button class="b icon" type="button" aria-label="Sair" @click="doLogout"><LogOut :size="16" /></button>
      </header>

      <main class="adm-content">
        <p v-if="loadError" class="adm-alert"><AlertCircle :size="16" /> {{ loadError }}</p>
        <div v-if="!loaded" class="adm-center small"><span class="adm-spinner"></span></div>
        <Transition v-else name="adm-panel" mode="out-in">
          <OverviewPanel v-if="section === 'geral'" key="geral" :guests="guests" :invites="invites" />
          <GuestsPanel v-else-if="section === 'convidados'" key="convidados" :invites="invites" :guests="guests" />
          <SeatingPanel v-else-if="section === 'mesas'" key="mesas" :invites="invites" :guests="guests" />
          <ImportPanel v-else-if="section === 'importar'" key="importar" :invites="invites" />
          <PixPanel v-else key="pix" :config="config" @saved="reloadConfig" />
        </Transition>
      </main>

      <!-- navegação inferior no celular -->
      <nav class="adm-tabbar" aria-label="Seções do painel">
        <button v-for="s in sections" :key="s.id" :class="{ on: section === s.id }" @click="go(s.id)">
          <component :is="s.icon" :size="20" stroke-width="1.7" />
          <span>{{ s.label.split(' ')[0] }}</span>
        </button>
      </nav>
    </div>

    <TransitionGroup tag="div" name="adm-toast" class="adm-toasts" aria-live="polite">
      <div v-for="t in toasts" :key="t.id" :class="['adm-toast', t.type]">
        <Check v-if="t.type === 'ok'" :size="15" /><AlertCircle v-else :size="15" />
        {{ t.text }}
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.adm-center {
  min-height: 100svh;
  display: grid;
  place-items: center;
  padding: 20px;
}
.adm-center.small {
  min-height: 50vh;
}
.adm-spinner {
  width: 34px;
  height: 34px;
  border: 2px solid var(--line-2);
  border-top-color: var(--gold);
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ---------- Login ---------- */
.adm-login {
  width: min(400px, 100%);
  display: grid;
  gap: 14px;
  padding: 34px 30px 28px;
  text-align: center;
  animation: adm-rise 0.8s var(--ease) both;
}
.adm-login h1 {
  font-size: 2.6rem;
}
.adm-login .field {
  text-align: left;
}
.adm-login-mark {
  width: 96px;
  height: 96px;
  margin: 0 auto 4px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(217, 191, 143, 0.18), transparent 70%);
}
.adm-login-mark img {
  width: 88px;
}
.adm-back {
  font-size: 12px;
  color: var(--muted);
  text-decoration: none;
}
.adm-back:hover {
  color: var(--gold);
}

/* ---------- Estrutura ---------- */
.adm-shell {
  display: grid;
  grid-template-columns: 264px 1fr;
  min-height: 100svh;
}
.adm-side {
  position: sticky;
  top: 0;
  height: 100svh;
  display: flex;
  flex-direction: column;
  gap: 26px;
  padding: 24px 18px;
  border-right: 1px solid var(--line);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent), rgba(8, 13, 26, 0.6);
  backdrop-filter: blur(10px);
}
.adm-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 6px;
}
.adm-brand img {
  width: 54px;
}
.adm-brand strong {
  display: block;
  font-family: var(--serif);
  font-size: 1.25rem;
  font-weight: 400;
  line-height: 1.1;
}
.adm-brand small {
  color: var(--gold);
  font-size: 11px;
  letter-spacing: 0.2em;
}
.adm-nav {
  display: grid;
  gap: 4px;
}
.adm-nav button {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--muted);
  font-size: 14px;
  text-align: left;
  transition:
    background 0.25s,
    color 0.25s;
}
.adm-nav button:hover {
  color: var(--text);
  background: rgba(255, 255, 255, 0.03);
}
.adm-nav button.on {
  color: var(--text);
  background: linear-gradient(90deg, rgba(165, 182, 236, 0.16), rgba(165, 182, 236, 0.02));
}
.adm-nav button.on::before {
  content: '';
  position: absolute;
  left: -18px;
  top: 10px;
  bottom: 10px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--accent);
  box-shadow: 0 0 14px var(--accent);
}
.adm-side-foot {
  margin-top: auto;
  display: grid;
  gap: 14px;
}
.adm-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.02);
}
.adm-user strong {
  display: block;
  font-size: 13px;
  font-weight: 500;
}
.adm-user small {
  color: var(--ok);
  font-size: 11px;
}
.adm-avatar {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ecd6ad, #c9a76f);
  color: #2a1f0e;
  font-weight: 600;
}
.adm-side-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.adm-side-actions .b {
  text-decoration: none;
  padding: 0 10px;
}
.adm-content {
  min-width: 0;
  padding: 34px clamp(18px, 3.4vw, 48px) 80px;
}
.adm-alert {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 18px;
  padding: 12px 16px;
  border: 1px solid rgba(232, 144, 140, 0.35);
  border-radius: 12px;
  background: rgba(232, 144, 140, 0.08);
  color: var(--no);
  font-size: 13px;
}
.adm-mtop,
.adm-tabbar {
  display: none;
}

/* ---------- Avisos ---------- */
.adm-toasts {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 100;
  display: grid;
  gap: 8px;
  justify-items: end;
}
.adm-toast {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 16px;
  border: 1px solid var(--line-2);
  border-radius: 12px;
  background: var(--panel-2);
  color: var(--text);
  font-size: 13px;
  box-shadow: 0 16px 40px -16px rgba(0, 0, 0, 0.8);
}
.adm-toast.ok svg {
  color: var(--ok);
}
.adm-toast.err svg {
  color: var(--no);
}
.adm-toast-enter-active,
.adm-toast-leave-active {
  transition:
    opacity 0.3s,
    transform 0.4s var(--ease);
}
.adm-toast-enter-from,
.adm-toast-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.96);
}

/* ---------- Celular e tablet ---------- */
@media (max-width: 900px) {
  .adm-shell {
    grid-template-columns: 1fr;
  }
  .adm-side {
    display: none;
  }
  .adm-mtop {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    border-bottom: 1px solid var(--line);
    background: rgba(11, 18, 34, 0.86);
    backdrop-filter: blur(12px);
  }
  .adm-mtop img {
    width: 40px;
  }
  .adm-mtop strong {
    flex: 1;
    font-size: 1.3rem;
    font-weight: 400;
  }
  .adm-content {
    padding: 22px 16px calc(96px + env(safe-area-inset-bottom));
  }
  .adm-tabbar {
    position: fixed;
    left: 10px;
    right: 10px;
    bottom: calc(10px + env(safe-area-inset-bottom));
    z-index: 30;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    padding: 6px;
    border: 1px solid var(--line-2);
    border-radius: 20px;
    background: rgba(20, 30, 54, 0.92);
    backdrop-filter: blur(14px);
    box-shadow: 0 20px 40px -14px rgba(0, 0, 0, 0.8);
  }
  .adm-tabbar button {
    display: grid;
    justify-items: center;
    gap: 3px;
    padding: 7px 2px;
    border: 0;
    border-radius: 14px;
    background: transparent;
    color: var(--muted);
    font-size: 10.5px;
    transition:
      color 0.25s,
      background 0.25s;
  }
  .adm-tabbar button.on {
    color: var(--text);
    background: rgba(165, 182, 236, 0.14);
  }
  .adm-tabbar button.on svg {
    color: var(--accent);
  }
  .adm-toasts {
    left: 16px;
    right: 16px;
    bottom: calc(90px + env(safe-area-inset-bottom));
    justify-items: center;
  }
}
</style>
