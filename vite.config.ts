
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis do arquivo .env localmente
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Prioridade: Vercel System Env -> .env local -> Fallback Hardcoded
  const apiKey = process.env.API_KEY || env.API_KEY || "AIzaSyB9OTmeU2ePsYyjYqoakKn3lkpMxIj1mNA";

  return {
    plugins: [react()],
    define: {
      // Define globalmente para o navegador acessar
      'process.env.API_KEY': JSON.stringify(apiKey),
    },
  };
});
