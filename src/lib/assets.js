// Нормализация пути к статике с учётом BASE_URL (Vite).
// '/images/x.webp' → `${base}images/x.webp`.
export const getAsset = (path) => {
  const base = import.meta.env.BASE_URL || '/';
  return base + path.replace(/^\//, '');
};
