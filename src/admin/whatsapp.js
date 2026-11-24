// Links do WhatsApp com a mensagem pronta (abre a conversa; quem envia são os noivos).

export function waNumber(phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.length === 10 || d.length === 11) d = '55' + d; // número brasileiro sem o código do país
  return d;
}
export const inviteLink = (code) => `${location.origin}/?convite=${code}`;

const firstName = (inv) => (inv.familia ? inv.familia : (inv.convidados[0]?.nome || '').split(' ')[0]);

export function inviteMessage(inv) {
  return (
    `Olá, ${firstName(inv)}! 💙\n\n` +
    `Com muita alegria, convidamos você para celebrar o nosso casamento no dia 22 de agosto de 2027, ` +
    `no Cerimonial Casa Rio, em Lauro de Freitas.\n\n` +
    `Confirme sua presença por aqui: ${inviteLink(inv.code)}\n\n` +
    `Com carinho, Stefania & Henrique`
  );
}
export function reminderMessage(inv) {
  return (
    `Olá, ${firstName(inv)}! Tudo bem? 😊\n\n` +
    `Passando para lembrar de confirmar sua presença no nosso casamento (22/08/2027). ` +
    `É rapidinho: ${inviteLink(inv.code)}\n\n` +
    `Stefania & Henrique`
  );
}
export function waLink(phone, text) {
  const n = waNumber(phone);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : '';
}
