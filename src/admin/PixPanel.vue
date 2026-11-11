<script setup>
import { ref, watch, inject } from 'vue';
import { QrCode, ShieldCheck } from 'lucide-vue-next';
import { saveSiteConfig } from '../api.js';
import { buildPix, pixQrSvg, pixConfigured } from '../pix.js';

const props = defineProps({ config: Object });
const emit = defineEmits(['saved']);
const toast = inject('toast');

const pix = ref({ pixChave: '', pixNome: '', pixCidade: '' });
watch(
  () => props.config,
  (c) => (pix.value = { pixChave: c?.pixChave || '', pixNome: c?.pixNome || '', pixCidade: c?.pixCidade || '' }),
  { immediate: true },
);
const busy = ref(false);
async function save() {
  busy.value = true;
  try {
    await saveSiteConfig({
      pixChave: pix.value.pixChave.trim(),
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
watch(
  pix,
  async (p) => {
    preview.value = pixConfigured(p)
      ? await pixQrSvg(buildPix({ chave: p.pixChave, nome: p.pixNome, cidade: p.pixCidade, valor: 1 }))
      : '';
  },
  { deep: true, immediate: true },
);
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
          <input v-model="pix.pixChave" required placeholder="CPF, e-mail, telefone (+55…) ou chave aleatória" />
        </label>
        <label class="field">
          Nome do recebedor <small>(titular da chave, até 25 letras)</small>
          <input v-model="pix.pixNome" required maxlength="25" />
        </label>
        <label class="field">
          Cidade <small>(até 15 letras)</small>
          <input v-model="pix.pixCidade" required maxlength="15" placeholder="Lauro de Freitas" />
        </label>
        <button class="b primary" type="submit" :disabled="busy">{{ busy ? 'Salvando…' : 'Salvar' }}</button>
        <p class="px-note muted"><ShieldCheck :size="14" /> O Pix não avisa automaticamente quando é pago — confiram pelo extrato do banco.</p>
      </form>
      <div class="card px-preview">
        <p class="eyebrow"><QrCode :size="14" /> Teste de R$ 1,00</p>
        <Transition name="adm-panel" mode="out-in">
          <div v-if="preview" key="qr" class="px-qr" v-html="preview"></div>
          <p v-else key="empty" class="muted">Preencha os três campos para ver o QR Code.</p>
        </Transition>
        <small v-if="preview" class="muted">Façam um Pix de teste pelo app do banco antes de divulgar.</small>
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
  width: min(220px, 70vw);
  padding: 10px;
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
