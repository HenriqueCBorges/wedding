// Convites de demonstração: código → nome do convite e convidados.
// Atenção: dados aqui ficam visíveis no navegador. Em produção, a consulta
// do código deve ser feita por uma API, que devolve só o convite pedido.
export const invites = {
  ABC123: {
    label: 'Família Oliveira',
    guests: ['Maria Oliveira', 'João Oliveira'],
  },
  XYZ789: {
    label: 'Ana Souza',
    guests: ['Ana Souza'],
  },
  FAM456: {
    label: 'Família Santos',
    guests: ['Carlos Santos', 'Juliana Santos', 'Pedro Santos', 'Laura Santos'],
  },
};

export function normalizeCode(value) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

export function findInvite(code) {
  return invites[normalizeCode(code)] ?? null;
}
