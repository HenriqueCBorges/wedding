// Pix "copia e cola" (BR Code estático) no padrão do Banco Central, com valor definido.
// Não depende de servidor: o código é montado aqui e o QR Code é gerado no navegador.
// Observação: Pix estático não avisa quando é pago — a conferência é feita no extrato.

function field(id, value) {
  const v = String(value);
  return id + String(v.length).padStart(2, '0') + v;
}

// CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF), exigido no campo 63.
function crc16(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Nome e cidade: sem acentos, em maiúsculas, só caracteres aceitos pelos bancos.
const clean = (text, max) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 .,-]/g, '')
    .trim()
    .toUpperCase()
    .slice(0, max);

export function normalizePixKey(key) {
  const k = String(key || '').trim();
  if (/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(k)) return k.replace(/\D/g, ''); // CPF
  if (/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/.test(k)) return k.replace(/\D/g, ''); // CNPJ
  if (k.includes('@')) return k.toLowerCase(); // e-mail
  if (/^\+/.test(k)) return '+' + k.replace(/\D/g, ''); // telefone (+55...)
  return k; // chave aleatória
}

export function pixConfigured(config) {
  return !!(config?.pixChave && config?.pixNome && config?.pixCidade);
}

/**
 * Monta o payload Pix.
 * @param {{ chave: string, nome: string, cidade: string, valor?: number, mensagem?: string }} p
 */
export function buildPix({ chave, nome, cidade, valor, mensagem }) {
  let account = field('00', 'br.gov.bcb.pix') + field('01', normalizePixKey(chave));
  const msg = clean(mensagem, 40);
  if (msg) account += field('02', msg);
  let payload =
    field('00', '01') +
    field('26', account) +
    field('52', '0000') +
    field('53', '986') +
    (valor > 0 ? field('54', Number(valor).toFixed(2)) : '') +
    field('58', 'BR') +
    field('59', clean(nome, 25)) +
    field('60', clean(cidade, 15)) +
    field('62', field('05', '***'));
  payload += '6304';
  return payload + crc16(payload);
}

export async function pixQrSvg(payload) {
  const { default: QRCode } = await import('qrcode');
  return QRCode.toString(payload, {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#0b1f49', light: '#ffffff' },
  });
}
