import { useState } from "react";
import { formatMonths } from "../lib/text.js";

export default function PromoCard({ months, promoCode, onCopy, onOpen }) {
  const [copyState, setCopyState] = useState("idle");

  if (!promoCode) return null;

  const copyPromo = async () => {
    const copied = await onCopy?.();
    setCopyState(copied ? "copied" : "error");
  };

  const copyHint = copyState === "copied"
    ? "Код скопирован"
    : copyState === "error"
      ? "Не удалось скопировать"
      : "Нажмите, чтобы скопировать";

  return (
    <section className="promo-card" aria-label="Партнёрское предложение VPN «Наружу»">
      <div className="promo-card-kicker">ПАРТНЁРСКИЙ ДОСТУП</div>
      <div className="promo-card-title">СКИДКА {promoCode.percent}% НА VPN «НАРУЖУ»</div>
      <div className="promo-card-meta">
        {formatMonths(months)} у власти · 7 дней бесплатно
      </div>
      <button
        type="button"
        className={`promo-card-code ${copyState}`}
        onClick={copyPromo}
        aria-label={`Скопировать промокод ${promoCode.code}`}
      >
        {promoCode.code}
      </button>
      <div className={`promo-card-copy-state ${copyState}`} aria-live="polite">
        {copyHint}
      </div>
      <button type="button" className="promo-card-link" onClick={onOpen}>
        АКТИВИРОВАТЬ НА VEPEN.ONLINE
      </button>
    </section>
  );
}
