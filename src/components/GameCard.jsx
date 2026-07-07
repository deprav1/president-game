import { getAsset } from "../lib/assets.js";
import { getCardBackground } from "../lib/cardBackgrounds.js";

const NARUZHU_YELLOW = "#FFD60A";

// Главный игровой экран: советник, текст-дилемма, превью эффектов, выбор/свайп.
// Цвета карты вынесены в CSS (.game-card / .game-card.crisis и т.д.) — правятся там.
// cardRef передаётся как обычный проп (для swipe-анимации в родителе).
export default function GameCard({
  isCrisis, advisor, currentCard, hovered, setHovered, ctaVariant, safeMode,
  cardRef, onTouchStart, onTouchMove, onTouchEnd, haptic, onChoose, onNaruzhu,
  ratingEnabled, cardRating, onRate,
}) {
  const crisis = isCrisis ? " crisis" : "";
  const bgImage = getCardBackground(currentCard);

  return (
    <div className={`game-card-screen${crisis}`}>
      {/* Лента-сирена кризиса — явно «другой флоу» */}
      {isCrisis && (
        <div className="crisis-banner">🚨 ЭКСТРЕННАЯ СИТУАЦИЯ 🚨</div>
      )}
      <div
        ref={cardRef}
        style={{ flex: 1, minHeight: 0, animation: "cardIn 0.3s ease", position: "relative", touchAction: "pan-y", willChange: "transform" }}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      >
        <div className={`game-card${crisis}`}>
          {/* Советник — геро-полоса: крупный портрет, низ растворяется в фон,
              имя/роль поверх снизу. Чёрный фон портретов сливается с картой. */}
          <div className={`game-card-hero${crisis}`}>
            <img className="game-card-hero-img" src={getAsset(advisor.avatar)} alt="" onError={e => e.currentTarget.style.display = 'none'} />
            <div className="game-card-hero-meta">
              <div className="game-card-hero-name">{advisor.name}</div>
              <div className="game-card-hero-role">{advisor.role}</div>
            </div>
          </div>

          {/* Текст карты */}
          <div className="game-card-body" style={{ flex: 1, padding: "22px 18px 16px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
            {/* Атмосферный фон-подложка «мир Варонии» (заполняет пустоту) */}
            <div className="game-card-ambiance" />
            {bgImage && (
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                backgroundImage: `url(${getAsset(bgImage)})`,
                backgroundSize: "cover", backgroundPosition: "center",
                opacity: 0.32, zIndex: 0, pointerEvents: "none"
              }} />
            )}
            {currentCard.assetImage && (
              <img src={getAsset(currentCard.assetImage)} className="card-advisor-avatar" alt="" style={{ zIndex: 1 }} onError={e => e.currentTarget.style.display = 'none'} />
            )}
            {hovered && (
              <div style={{
                position: "absolute", top: 12, left: "50%", transform: `translateX(-50%) rotate(${hovered === "left" ? "-6deg" : "6deg"})`,
                zIndex: 10, border: `2px solid ${hovered === "left" ? "#4ade80" : "#ff756b"}`,
                borderRadius: 6, padding: "4px 14px",
                color: hovered === "left" ? "#4ade80" : "#ff756b",
                fontFamily: "var(--font-sans)", fontSize: 15, letterSpacing: 1.5, fontWeight: 700,
                opacity: 0.93, animation: "fadeIn 0.15s ease", pointerEvents: "none",
                background: "rgba(0,0,0,0.75)", whiteSpace: "nowrap",
              }}>
                {hovered === "left" ? currentCard.left.label.toUpperCase() : currentCard.right.label.toUpperCase()}
              </div>
            )}
            <p className="game-card-text">
              {currentCard.text}
            </p>
            {!safeMode && currentCard.cta === "naruzhu" && (
              <button
                onClick={e => { e.stopPropagation(); haptic("light"); onNaruzhu(currentCard?.id || "card"); }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  margin: "12px auto 0", padding: "8px 16px", borderRadius: 999,
                  background: "linear-gradient(135deg, rgba(255,214,10,0.2), rgba(15,10,0,0.9))",
                  border: `1px solid ${NARUZHU_YELLOW}`,
                  cursor: "pointer", color: NARUZHU_YELLOW,
                  fontSize: 12, fontFamily: "var(--font-mono)", letterSpacing: 0.6,
                  fontWeight: 700,
                  boxShadow: `0 0 18px ${NARUZHU_YELLOW}33`,
                }}
              >
                {ctaVariant.label}
              </button>
            )}
          </div>

          <div className="game-card-divider" />

          {/* Кнопки */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "12px", flexShrink: 0 }}>
            {["left", "right"].map(side => (
              <button key={side}
                className={`game-choice-btn${hovered === side ? " active" : ""}`}
                onClick={() => { haptic("medium"); onChoose(side); }}
                onMouseEnter={() => setHovered(side)}
                onMouseLeave={() => setHovered(null)}
              >
                <div className="game-choice-btn-label">
                  {currentCard[side].label.toUpperCase()}
                </div>
                <div className="game-choice-btn-text">{currentCard[side].text}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 8, flexShrink: 0 }}>
        {ratingEnabled && (() => {
          const rated = cardRating === "up" || cardRating === "down" || cardRating === "rated";
          const btn = (kind, glyph, color) => {
            return (
              <button
                onClick={e => { e.stopPropagation(); if (!rated) onRate(kind); }}
                disabled={rated}
                aria-label={kind === "up" ? "Хорошая карта" : "Плохая карта"}
                style={{
                  background: "none", border: "none", cursor: rated ? "default" : "pointer",
                  fontSize: 17, lineHeight: 1, padding: 4,
                  opacity: rated ? (cardRating === kind ? 1 : 0.25) : 0.4,
                  filter: cardRating === kind ? `drop-shadow(0 0 5px ${color})` : "grayscale(0.4)",
                  transition: "opacity 0.2s ease, filter 0.2s ease",
                }}
              >{glyph}</button>
            );
          };
          return (
            <>
              {btn("up", "👍", "#d4af37")}
              <span style={{ fontSize: 11, color: "#d4af3788", fontFamily: "var(--font-mono)", letterSpacing: 1.5, fontWeight: 500 }}>
                ← СВАЙП ИЛИ ТАП →
              </span>
              {btn("down", "👎", "#ff756b")}
            </>
          );
        })()}
        {!ratingEnabled && (
          <span style={{ fontSize: 11, color: "#d4af3788", fontFamily: "var(--font-mono)", letterSpacing: 1.5, fontWeight: 500 }}>
            ← СВАЙП ИЛИ ТАП →
          </span>
        )}
      </div>
    </div>
  );
}
