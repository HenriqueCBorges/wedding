import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  // carregados sob demanda no site; pré-otimizados para o servidor de desenvolvimento não
  // precisar recarregar a página na primeira vez que forem usados
  optimizeDeps: {
    include: ['firebase/app', 'firebase/firestore', 'firebase/auth', 'qrcode'],
  },
});
