import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Относительный base: один билд работает и с корня домена (Timeweb),
  // и из подпапки. Абсолютный '/president-game/' ломал ассеты на Timeweb.
  base: './',
  // Build-id для cache-busting картинок: имена webp стабильны между
  // перегенерациями, поэтому без версии браузер отдаёт старую картинку.
  // getAsset() добавляет ?v=__BUILD_ID__ — каждый билд инвалидирует кэш.
  define: {
    __BUILD_ID__: JSON.stringify(Date.now().toString(36)),
  },
  build: {
    rollupOptions: {
      output: {
        // Вендор (node_modules) кэшируется отдельно от кода игры:
        // при правках логики пользователь не перекачивает React.
        manualChunks(id) {
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
})
