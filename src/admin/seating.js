// Regras e utilidades do painel: tags, situação das respostas e mapa de mesas.

export const SIDES = ['A', 'B'];
export const TABLES_PER_SIDE = 10;
export const SEATS_PER_TABLE = 7;
export const TOTAL_SEATS = SIDES.length * TABLES_PER_SIDE * SEATS_PER_TABLE;

export const TAGS = [
  { id: 'padrinho', label: 'Padrinho/Madrinha', short: 'Padrinhos', color: '#d9bf8f' },
  { id: 'pais', label: 'Pais', short: 'Pais', color: '#c7a6e8' },
  { id: 'crianca', label: 'Criança', short: 'Crianças', color: '#f2a36b' },
  { id: 'placa', label: 'Placa', short: 'Placas', color: '#7fcab5' },
];
export const tagById = Object.fromEntries(TAGS.map((t) => [t.id, t]));

export const STATUS = {
  sim: { label: 'Confirmado', short: 'Vai' },
  nao: { label: 'Não vai', short: 'Não vai' },
  pendente: { label: 'A confirmar', short: 'A confirmar' },
};

/** Lista plana de convidados, com família, situação e chave única. */
export function flattenGuests(invites) {
  const out = [];
  for (const inv of invites)
    for (const g of inv.convidados)
      out.push({
        key: `${inv.code}:${g.id}`,
        code: inv.code,
        id: g.id,
        nome: g.nome,
        familia: inv.familia,
        tags: g.tags || [],
        assento: g.assento || null,
        status: inv.respostas?.[g.id] || 'pendente',
        respondidoEm: inv.respondidoEm,
      });
  return out;
}

export const seatKey = (s) => `${s.lado}-${s.mesa}-${s.cadeira}`;
export const seatLabel = (s) => (s ? `Lado ${s.lado} · Mesa ${s.mesa} · Cadeira ${s.cadeira}` : 'Sem lugar');
export const seatShort = (s) => (s ? `${s.lado}${s.mesa}·${s.cadeira}` : '—');

export function initials(nome) {
  const parts = String(nome || '')
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 2 || /^[A-ZÀ-Ú]/.test(p));
  if (!parts.length) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/** Posição (em %) da cadeira i ao redor da mesa, começando no topo e girando no sentido horário. */
export function chairPosition(i, total = SEATS_PER_TABLE, radius = 41) {
  const a = ((-90 + (i * 360) / total) * Math.PI) / 180;
  return { left: `${50 + radius * Math.cos(a)}%`, top: `${50 + radius * Math.sin(a)}%` };
}

export const isChild = (g) => g.tags.includes('crianca');

export function tableSummary(guests) {
  const adults = guests.filter((g) => !isChild(g)).length;
  const kids = guests.length - adults;
  const pending = guests.filter((g) => g.status === 'pendente').length;
  const parts = [];
  if (adults) parts.push(`${adults} adulto${adults > 1 ? 's' : ''}`);
  if (kids) parts.push(`${kids} criança${kids > 1 ? 's' : ''}`);
  return { text: parts.join(' e ') || 'Mesa livre', pending };
}

export const strip = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
