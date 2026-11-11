<script setup>
import { ref, computed, inject } from 'vue';
import { Upload, Sparkles } from 'lucide-vue-next';
import { saveInvite, inviteExists, randomCode, randomId } from '../api.js';
import { tagById } from './seating.js';

const props = defineProps({ invites: Array });
const toast = inject('toast');
const go = inject('go');

// Uma linha por convite:
//   Família Oliveira: Maria Oliveira [madrinha], João Oliveira [padrinho], Lia [criança]
//   Ana Souza [placa]
const TAG_WORDS = {
  padrinho: 'padrinho',
  madrinha: 'padrinho',
  padrinhos: 'padrinho',
  pais: 'pais',
  pai: 'pais',
  mae: 'pais',
  crianca: 'crianca',
  criancas: 'crianca',
  placa: 'placa',
  placas: 'placa',
};
const norm = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
function parsePerson(raw) {
  const tags = new Set();
  const nome = raw
    .replace(/\[([^\]]+)\]/g, (_, inner) => {
      inner.split(/[,/]/).forEach((w) => TAG_WORDS[norm(w)] && tags.add(TAG_WORDS[norm(w)]));
      return '';
    })
    .trim();
  return { nome, tags: [...tags] };
}

const text = ref('');
const busy = ref(false);
const progress = ref(0);
const parsed = computed(() =>
  text.value
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(':');
      const familia = idx >= 0 ? line.slice(0, idx).trim() : '';
      const people = (idx >= 0 ? line.slice(idx + 1) : line)
        .split(/[,;](?![^[]*\])/)
        .map((n) => parsePerson(n))
        .filter((p) => p.nome);
      return { familia: familia || null, people };
    })
    .filter((x) => x.people.length),
);
const totalPeople = computed(() => parsed.value.reduce((n, x) => n + x.people.length, 0));

async function run() {
  busy.value = true;
  progress.value = 0;
  const taken = new Set(props.invites.map((i) => i.code));
  let ok = 0;
  try {
    for (const item of parsed.value) {
      let code;
      do code = randomCode();
      while (taken.has(code) || (await inviteExists(code)));
      taken.add(code);
      await saveInvite(
        {
          code,
          familia: item.familia,
          convidados: item.people.map((p) => ({ id: randomId(), nome: p.nome, tags: p.tags, assento: null })),
          respostas: {},
        },
        { isNew: true },
      );
      ok++;
      progress.value = ok / parsed.value.length;
    }
    toast(`${ok} convite(s) importado(s)`);
    text.value = '';
    setTimeout(() => go('convidados'), 600);
  } catch {
    toast(`Importação interrompida após ${ok} convite(s)`, 'err');
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section>
    <div class="section-head">
      <div>
        <p class="eyebrow">Lista</p>
        <h1>Importar convidados</h1>
        <p>Cole a lista; cada linha vira um convite com código próprio.</p>
      </div>
    </div>

    <div class="ip-grid">
      <div class="card ip-box">
        <textarea v-model="text" rows="14" placeholder="Cole a lista aqui"></textarea>
        <div class="ip-foot">
          <span class="muted">{{ parsed.length }} convite(s) · {{ totalPeople }} pessoa(s)</span>
          <button class="b primary" type="button" :disabled="!parsed.length || busy" @click="run">
            <Upload :size="15" /> {{ busy ? `Importando… ${Math.round(progress * 100)}%` : 'Importar' }}
          </button>
        </div>
        <div v-if="busy" class="ip-bar"><i :style="{ width: progress * 100 + '%' }"></i></div>
      </div>

      <aside class="card ip-help">
        <h2><Sparkles :size="18" /> Como escrever</h2>
        <p class="muted">Família: nome da família, dois-pontos e as pessoas separadas por vírgula.</p>
        <pre>Família Oliveira: Maria Oliveira, João Oliveira</pre>
        <p class="muted">Convidado individual: só o nome.</p>
        <pre>Ana Souza</pre>
        <p class="muted">Tags (opcional) entre colchetes:</p>
        <pre>Família Lima: Paula Lima [madrinha], Rui Lima [padrinho], Bia Lima [criança]
Seu Antônio [pais, placa]</pre>
        <div class="ip-tags">
          <i v-for="(t, id) in tagById" :key="id" class="tag" :style="{ '--c': t.color }">{{ t.label }}</i>
        </div>
      </aside>
    </div>

    <div v-if="parsed.length" class="ip-preview">
      <h2>Prévia</h2>
      <ul>
        <li v-for="(item, i) in parsed.slice(0, 30)" :key="i" class="card rise" :style="{ '--i': Math.min(i, 10) }">
          <strong class="serif">{{ item.familia || item.people[0].nome }}</strong>
          <small class="muted">{{ item.familia ? `${item.people.length} pessoa(s)` : 'Individual' }}</small>
          <div class="ip-people">
            <span v-for="(p, j) in item.people" :key="j">
              {{ p.nome }}
              <i v-for="t in p.tags" :key="t" class="tag" :style="{ '--c': tagById[t].color }">{{ tagById[t].short }}</i>
            </span>
          </div>
        </li>
      </ul>
      <p v-if="parsed.length > 30" class="muted">… e mais {{ parsed.length - 30 }} convite(s).</p>
    </div>
  </section>
</template>

<style scoped>
.ip-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}
.ip-box {
  padding: 16px;
}
.ip-box textarea {
  min-height: 300px;
  resize: vertical;
  font-size: 14px;
  line-height: 1.6;
}
.ip-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 12px;
  font-size: 13px;
}
.ip-bar {
  height: 4px;
  margin-top: 12px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}
.ip-bar i {
  display: block;
  height: 100%;
  background: var(--accent);
  transition: width 0.3s;
}
.ip-help {
  display: grid;
  gap: 8px;
  padding: 20px;
}
.ip-help h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.4rem;
  color: var(--gold);
}
.ip-help p {
  font-size: 13px;
}
.ip-help pre {
  margin: 0 0 6px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.3);
  color: var(--soft);
  font-size: 12px;
  white-space: pre-wrap;
}
.ip-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.ip-tags .tag,
.ip-people .tag {
  font-style: normal;
}
.ip-preview {
  margin-top: 26px;
}
.ip-preview h2 {
  font-size: 1.5rem;
  margin-bottom: 12px;
}
.ip-preview ul {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.ip-preview li {
  display: grid;
  gap: 4px;
  padding: 14px;
}
.ip-preview strong {
  font-size: 1.15rem;
  font-weight: 400;
}
.ip-people {
  display: grid;
  gap: 4px;
  margin-top: 6px;
  font-size: 13px;
}
.ip-people span {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
}
@media (max-width: 900px) {
  .ip-grid {
    grid-template-columns: 1fr;
  }
}
</style>
