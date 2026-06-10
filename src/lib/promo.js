// Скидка зависит от длины рана: дольше правил — больше скидка.
export const discountFor = (tenure) => {
  if (tenure >= 72) return { percent: 30, code: "NARUZHU30" };
  if (tenure >= 24) return { percent: 20, code: "NARUZHU20" };
  return { percent: 10, code: "NARUZHU10" };
};
