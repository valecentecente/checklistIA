
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis do arquivo .env localmente
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // No Vercel, as variáveis de sistema (Settings) estão em process.env
  // Priorizamos a do sistema (Vercel) e fallback para o .env local
  const apiKey = process.env.API_KEY || env.API_KEY;

  return {
    plugins: [react()],
    define: {
      // Define globalmente para o navegador acessar
      'process.env.API_KEY': JSON.stringify(apiKey),
    },
  };
});
