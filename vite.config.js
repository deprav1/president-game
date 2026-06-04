import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Относительный base: один билд работает и с корня домена (Timeweb),
  // и из подпапки. Абсолютный '/president-game/' ломал ассеты на Timeweb.
  base: './',
})
