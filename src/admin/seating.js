// Regras e utilidades do painel: tags, situação das respostas e mapa de mesas.

export const SIDES = ['A', 'B'];
export const TABLES_PER_SIDE = 10;
export const SEATS_PER_TABLE = 7; // padrão; cada mesa pode ter de 2 a 12 cadeiras
export const MIN_SEATS = 2;
export const MAX_SEATS = 12;
const clampSeats = (n) => Math.min(MAX_SEATS, Math.max(MIN_SEATS, Math.round(Number(n) || SEATS_PER_TABLE)));

/** Mesas de um lado, já com nome e número de cadeiras da configuração (admin/mesas). */
export function tablesFor(config, lado) {
  const list = config?.[lado] || [];
  return Array.from({ length: TABLES_PER_SIDE }, (_, i) => ({
    lado,
    mesa: i + 1,
    nome: (list[i]?.nome || '').trim(),
    cadeiras: clampSeats(list[i]?.cadeiras ?? SEATS_PER_TABLE),
  }));
}
export const capacityOf = (config, lado) =>
  (lado ? [lado] : SIDES).reduce((n, l) => n + tablesFor(config, l).reduce((m, t) => m + t.cadeiras, 0), 0);
export const tableTitle = (t) => t.nome || `Mesa ${t.mesa}`;

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
        telefone: inv.telefone || '',
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

/**
 * Sugere lugares para quem ainda não tem, sem mexer em quem já está sentado.
 * - Famílias (mesmo convite) ficam juntas na mesma mesa sempre que couber.
 * - Ordem: padrinhos e pais primeiro, depois confirmados, depois quem ainda vai responder;
 *   grupos maiores antes dos menores. Quem disse que não vai fica de fora.
 * Devolve a lista de movimentos [{ guest, assento }].
 */
export function suggestSeating(guests, config) {
  const taken = new Set(guests.filter((g) => g.assento).map((g) => seatKey(g.assento)));
  const tables = SIDES.flatMap((l) => tablesFor(config, l)).map((t) => ({
    ...t,
    free: Array.from({ length: t.cadeiras }, (_, i) => ({ lado: t.lado, mesa: t.mesa, cadeira: i + 1 })).filter(
      (s) => !taken.has(seatKey(s)),
    ),
  }));
  const groups = new Map();
  for (const g of guests) {
    if (g.assento || g.status === 'nao') continue;
    if (!groups.has(g.code)) groups.set(g.code, []);
    groups.get(g.code).push(g);
  }
  const rank = (list) =>
    list.some((g) => g.tags.includes('padrinho') || g.tags.includes('pais')) ? 0 : list.every((g) => g.status === 'sim') ? 1 : 2;
  const ordered = [...groups.values()].sort((a, b) => rank(a) - rank(b) || b.length - a.length);
  const moves = [];
  for (const list of ordered) {
    let table = tables.find((t) => t.free.length >= list.length);
    if (table) {
      for (const g of list) moves.push({ guest: g, assento: table.free.shift() });
      continue;
    }
    // não cabe inteira em nenhuma mesa: distribui pelas mesas com mais lugares livres
    for (const g of list) {
      table = [...tables].sort((a, b) => b.free.length - a.free.length)[0];
      if (!table || !table.free.length) break;
      moves.push({ guest: g, assento: table.free.shift() });
    }
  }
  return moves;
}
