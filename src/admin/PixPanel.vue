<script setup>
import { ref, computed, watch, inject } from 'vue';
import { QrCode, ShieldCheck, CheckCircle2, AlertCircle, Copy } from 'lucide-vue-next';
import { saveSiteConfig } from '../api.js';
import { buildPix, pixQrSvg, pixConfigured, pixKeyType, normalizePixKey, isPixPayload, parsePixPayload } from '../pix.js';

const props = defineProps({ config: Object });
const emit = defineEmits(['saved']);
const toast = inject('toast');

const pix = ref({ pixChave: '', pixNome: '', pixCidade: '' });
watch(
  () => props.config,
  (c) => {
    pix.value = { pixChave: c?.pixChave || '', pixNome: c?.pixNome || '', pixCidade: c?.pixCidade || '' };
    // configuração antiga com o "copia e cola" inteiro no campo da chave: mostra só a chave
    if (isPixPayload(pix.value.pixChave)) pix.value.pixChave = parsePixPayload(pix.value.pixChave).chave;
  },
  { immediate: true },
);

/* Se colarem o "copia e cola" do banco no campo da chave, aproveita a chave (e nome/cidade, se vazios). */
const extracted = ref(false);
function onKeyInput() {
  const v = pix.value.pixChave;
  if (!isPixPayload(v)) return;
  const p = parsePixPayload(v);
  pix.value.pixChave = p.chave;
  if (!pix.value.pixNome) pix.value.pixNome = p.nome;
  if (!pix.value.pixCidade) pix.value.pixCidade = p.cidade;
  extracted.value = true;
  toast('Código copia e cola reconhecido: usamos só a chave');
}
const keyType = computed(() => pixKeyType(pix.value.pixChave));
const keyError = computed(() => {
  const v = pix.value.pixChave.trim();
  if (!v || keyType.value) return '';
  if (/^\d{10,11}$/.test(v.replace(/\D/g, '')) && !v.startsWith('+') && v.replace(/\D/g, '').length !== 11)
    return 'Telefone deve começar com +55 e o DDD, ex.: +5571999998888';
  return 'Chave não reconhecida. Use CPF, CNPJ, e-mail, telefone (+55…) ou chave aleatória.';
});

const busy = ref(false);
async function save() {
  if (!keyType.value) return;
  busy.value = true;
  try {
    await saveSiteConfig({
      pixChave: normalizePixKey(pix.value.pixChave),
      pixNome: pix.value.pixNome.trim(),
      pixCidade: pix.value.pixCidade.trim(),
    });
    toast('Dados do Pix salvos');
    emit('saved');
  } catch {
    toast('Não foi possível salvar o Pix', 'err');
  } finally {
    busy.value = false;
  }
}

const preview = ref('');
const previewCode = ref('');
watch(
  pix,
  async (p) => {
    if (!pixConfigured(p)) {
      preview.value = '';
      previewCode.value = '';
      return;
    }
    previewCode.value = buildPix({ chave: p.pixChave, nome: p.pixNome, cidade: p.pixCidade, valor: 1 });
    preview.value = await pixQrSvg(previewCode.value);
  },
  { deep: true, immediate: true },
);
async function copyCode() {
  try {
    await navigator.clipboard.writeText(previewCode.value);
    toast('Código de teste copiado');
  } catch {
    window.prompt('Copie o código abaixo:', previewCode.value);
  }
}
</script>

<template>
  <section>
    <div class="section-head">
      <div>
        <p class="eyebrow">Presentes</p>
        <h1>Pix</h1>
        <p>Usado para gerar o QR Code e o "copia e cola" de cada presente, com o valor certo, e do valor livre.</p>
      </div>
    </div>
    <div class="px-grid">
      <form class="card px-form" @submit.prevent="save">
        <label class="field">
          Chave Pix
          <input
            v-model="pix.pixChave"
            required
            placeholder="CPF, CNPJ, e-mail, telefone (+55…) ou chave aleatória"
            @input="onKeyInput"
          />
          <span v-if="keyType" class="px-ok"><CheckCircle2 :size="14" /> Chave reconhecida: {{ keyType }}</span>
          <span v-else-if="keyError" class="px-err"><AlertCircle :size="14" /> {{ keyError }}</span>
          <span v-else class="px-hint">Só a chave — não o código "copia e cola". Se colar o código do banco, a chave é extraída sozinha.</span>
        </label>
        <label class="field">
          Nome do recebedor <small>(titular da chave, até 25 letras)</small>
          <input v-model="pix.pixNome" required maxlength="25" />
        </label>
        <label class="field">
          Cidade <small>(até 15 letras)</small>
          <input v-model="pix.pixCidade" required maxlength="15" placeholder="Lauro de Freitas" />
        </label>
        <button class="b primary" type="submit" :disabled="busy || !keyType">{{ busy ? 'Salvando…' : 'Salvar' }}</button>
        <p class="px-note muted"><ShieldCheck :size="14" /> O Pix não avisa automaticamente quando é pago — confiram pelo extrato do banco.</p>
      </form>
      <div class="card px-preview">
        <p class="eyebrow"><QrCode :size="14" /> Teste de R$ 1,00</p>
        <Transition name="adm-panel" mode="out-in">
          <div v-if="preview" key="qr" class="px-qr" v-html="preview"></div>
          <p v-else key="empty" class="muted">Preencha os três campos com uma chave válida para ver o QR Code.</p>
        </Transition>
        <template v-if="preview">
          <button class="b" type="button" @click="copyCode"><Copy :size="14" /> Copiar código de teste</button>
          <small class="muted">Façam um Pix de teste pelo app do banco antes de divulgar.</small>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped>
.px-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}
.px-form {
  display: grid;
  gap: 16px;
  padding: 22px;
}
.px-form small {
  font-size: 11px;
  opacity: 0.8;
}
.px-ok,
.px-err,
.px-hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
.px-ok {
  color: var(--ok);
}
.px-err {
  color: var(--no);
}
.px-hint {
  color: var(--muted);
}
.px-note {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
.px-preview {
  display: grid;
  justify-items: center;
  gap: 12px;
  padding: 22px;
  text-align: center;
}
.px-qr {
  width: min(240px, 70vw);
  padding: 6px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 20px 40px -20px rgba(0, 0, 0, 0.8);
}
.px-qr :deep(svg) {
  display: block;
  width: 100%;
  height: auto;
}
@media (max-width: 900px) {
  .px-grid {
    grid-template-columns: 1fr;
  }
}
</style>
