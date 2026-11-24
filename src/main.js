import { createApp } from 'vue';
import App from './App.vue';
import './style.css';

// Se um AVIF não puder ser decodificado (alguns iPhones mais antigos ou redes que
// alteram imagens), o <picture> não tenta o WebP sozinho: tiramos a fonte AVIF
// e o navegador escolhe de novo, já pelo WebP.
document.addEventListener(
  'error',
  (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || !img.parentElement || img.parentElement.tagName !== 'PICTURE') return;
    const avif = img.parentElement.querySelectorAll('source[type="image/avif"]');
    if (!avif.length) return;
    avif.forEach((s) => s.remove());
    const src = img.getAttribute('src');
    if (src) img.src = src; // força nova escolha em navegadores que não reavaliam sozinhos
  },
  true,
);

createApp(App).mount('#app');
