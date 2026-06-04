// Нормализация пути к статике с учётом BASE_URL (Vite) + cache-busting.
// '/images/x.webp' → `${base}images/x.webp?v=<build-id>`.
// Версия (__BUILD_ID__) подставляется Vite на сборке (см. define в vite.config.js)
// и заставляет браузер перекачивать картинку после перегенерации с тем же именем.
const BUILD_ID = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "dev";

export const getAsset = (path) => {
  const base = import.meta.env.BASE_URL || '/';
  const sep = path.includes("?") ? "&" : "?";
  return `${base}${path.replace(/^\//, '')}${sep}v=${BUILD_ID}`;
};
