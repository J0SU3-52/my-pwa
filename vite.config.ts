import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // En Vercel: SIN base, o explícitamente '/'
  base: '/',
});
