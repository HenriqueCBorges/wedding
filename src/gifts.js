// Lista de presentes (cotas em Pix), alegres e surreais. Valores em reais.
// `id` também escolhe a ilustração a traço em GiftArt.vue.
export const gifts = [
  {
    id: 'lua',
    title: 'Bate e volta na Lua',
    description: 'Ida de foguete, volta a tempo do almoço de domingo. Janela com vista para a Terra garantida.',
    price: 150,
  },
  {
    id: 'nuvem',
    title: 'Uma nuvem de estimação',
    description: 'Fofinha, obediente e faz sombra nos dias de sol forte. Não precisa de ração nem de banho.',
    price: 180,
  },
  {
    id: 'estrela',
    title: 'Uma estrela com o nome dos noivos',
    description: 'Batizada oficialmente e visível em todas as noites de céu limpo, de qualquer lugar do mundo.',
    price: 220,
  },
  {
    id: 'balao',
    title: 'Passeio de balão acima das nuvens',
    description: 'Café da manhã servido a dois mil metros de altura, com o nascer do sol de sobremesa.',
    price: 260,
  },
  {
    id: 'arcoiris',
    title: 'Arco-íris particular',
    description: 'Aparece sob encomenda depois de qualquer chuva — e, em dias especiais, até sem chuva.',
    price: 300,
  },
  {
    id: 'potes',
    title: 'Pores do sol guardados em potes',
    description: 'Um pôr do sol de cada praia da Bahia, para abrir devagarinho nos dias mais cinzentos.',
    price: 350,
  },
  {
    id: 'confete',
    title: 'Guarda-chuva que chove confete',
    description: 'Transforma qualquer garoa em festa. Funciona também em dias de sol, só por diversão.',
    price: 400,
  },
  {
    id: 'mapa',
    title: 'Mapa do tesouro de Lauro de Freitas',
    description: 'O X marca o lugar exato onde a próxima grande aventura dos noivos vai começar.',
    price: 450,
  },
  {
    id: 'relogio',
    title: 'Um dia inteiro com o tempo parado',
    description: 'Vinte e quatro horas extras para aproveitar juntinhos, sem olhar para o relógio.',
    price: 500,
  },
  {
    id: 'castelo',
    title: 'Castelo de areia com escritura',
    description: 'Torres, ponte levadiça, bandeira no alto e garantia vitalícia contra a maré alta.',
    price: 560,
  },
  {
    id: 'golfinhos',
    title: 'Serenata de golfinhos',
    description: 'Um coral de golfinhos cantando no pôr do sol da lua de mel. Repertório escolhido por vocês.',
    price: 620,
  },
  {
    id: 'tapete',
    title: 'Tapete voador com cinto de segurança',
    description: 'Para atravessar a cidade por cima das nuvens, com estilo, conforto e muita segurança.',
    price: 680,
  },
  {
    id: 'saturno',
    title: 'Piquenique nos anéis de Saturno',
    description: 'Toalha xadrez, cesta caprichada e a vista mais bonita de todo o sistema solar.',
    price: 750,
  },
  {
    id: 'baleia',
    title: 'Carona de baleia até Abrolhos',
    description: 'Viagem tranquila pelo litoral baiano, com direito a um jatinho d’água de boas-vindas.',
    price: 850,
  },
  {
    id: 'farol',
    title: 'Um farol só para os dois',
    description: 'Para iluminar o caminho de volta para casa, em qualquer noite e qualquer maré.',
    price: 950,
  },
  {
    id: 'caravela',
    title: 'Caravela para dar a volta ao mundo',
    description: 'Velas novas, mapa das estrelas a bordo e nenhum compromisso na agenda.',
    price: 1100,
  },
  {
    id: 'aurora',
    title: 'Camarote para a aurora boreal',
    description: 'Assentos na primeira fila do espetáculo de luzes mais bonito do planeta.',
    price: 1300,
  },
  {
    id: 'jardim',
    title: 'Jardim que floresce o ano inteiro',
    description: 'Flores em todas as estações, mesmo quando o calendário disser que não é época.',
    price: 1500,
  },
];

export const priceRanges = [
  { id: 'todos', label: 'Todos', test: () => true },
  { id: 'ate300', label: 'Até R$ 300', test: (p) => p <= 300 },
  { id: '300a700', label: 'R$ 301 a 700', test: (p) => p > 300 && p <= 700 },
  { id: 'acima700', label: 'Acima de R$ 700', test: (p) => p > 700 },
];

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatPrice = (value) => brl.format(value);
