# Stefania & Henrique — Site de casamento

Protótipo em Vue 3 + Vite + Three.js, sem música. Paleta azul-marinho, branco, champagne e marfim.

## Rodar localmente

Requer Node.js 20 ou superior.

```bash
npm install
npm run dev
```

Abra a URL exibida pelo Vite. Para gerar uma versão de produção:

```bash
npm run build
npm run preview
```

## Funcionalidades

- Contagem regressiva em anos, meses, dias, horas, minutos e segundos para 22/08/2027 às 15h30 (horário de Brasília)
- Animação Three.js com partículas discretas, respeitando preferência por movimento reduzido
- Abertura animada, parallax, faixa em movimento, galeria com lightbox e animações de entrada com IntersectionObserver
- Menu responsivo, seção do local com link para o Google Maps
- Galeria de imagens conceituais e seção de presentes
- Formulário RSVP **somente demonstrativo**: não salva, não envia e não confirma presença de verdade

## Personalização

- `public/logo.png` / `public/logo-light.png`: monograma do casal com fundo transparente (versão azul e versão clara para fundos escuros).
- `public/art/`: recortes de uma composição artística conceitual gerada para o protótipo; **não representam fotos verificadas do Cerimonial Casa Rio**.
- `src/App.vue`: textos, data, mapa, fotos e formulário.
- `src/style.css`: cores, tipografia, layout e animações.

## Para publicar

Conecte o RSVP a uma API/banco de dados com autenticação, proteção contra spam e aviso de privacidade; valide regras de acompanhantes. Configure hospedagem estática (Netlify, Vercel, Cloudflare Pages etc.). Substitua as artes conceituais por imagens aprovadas ou fotos reais do casal e do espaço.
