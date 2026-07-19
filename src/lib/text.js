// Короткие русские форматтеры для единообразных подписей в интерфейсе.

export const pluralizeRu = (value, one, few, many) => {
  const absolute = Math.abs(Number(value) || 0);
  const mod100 = absolute % 100;
  const mod10 = absolute % 10;

  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
};

export const formatMonths = (value, { short = false, uppercase = false } = {}) => {
  const months = Math.max(0, Math.trunc(Number(value) || 0));
  let unit = short
    ? "мес."
    : pluralizeRu(months, "месяц", "месяца", "месяцев");

  if (uppercase) unit = unit.toUpperCase();
  return `${months} ${unit}`;
};

export const formatCount = (value, one, few, many) => {
  const count = Math.max(0, Math.trunc(Number(value) || 0));
  return `${count} ${pluralizeRu(count, one, few, many)}`;
};
