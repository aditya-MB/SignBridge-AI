
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Use '.' instead of process.cwd() to resolve the environment directory
  const env = loadEnv(mode, '.', '');
  
  return {
    plugins: [react()],
    define: {
      // Injects process.env into the client-side code to satisfy @google/genai requirements
      // Added a fallback empty string to prevent potential 'undefined' related errors
      'process.env.API_KEY': JSON.stringify(env.API_KEY || '')
    },
    server: {
      port: 5173,
      host: true
    }
  };
});
