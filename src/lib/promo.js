// Скидка зависит от длины рана: дольше правил — больше скидка.
export const discountFor = (tenure) => {
  if (tenure >= 72) return { percent: 30, code: "WAR-X2P8-30" };
  if (tenure >= 24) return { percent: 20, code: "WAR-M4Q9-20" };
  return { percent: 10, code: "WAR-N7K2-10" };
};
