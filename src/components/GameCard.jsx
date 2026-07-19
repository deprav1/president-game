import { getAsset } from "../lib/assets.js";
import { getCardBackground } from "../lib/cardBackgrounds.js";

const cleanCardText = (text = "", isCrisis = false) => (
  isCrisis ? text.replace(/^⚠️\s*КРИЗИС:\s*/u, "") : text
);

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
        <div className="crisis-banner">ЭКСТРЕННАЯ СИТУАЦИЯ</div>
      )}
      <div
        ref={cardRef}
        className="game-card-motion"
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      >
        <article className={`game-card${crisis}`} aria-labelledby="current-advisor">
          {/* Советник — геро-полоса: крупный портрет, низ растворяется в фон,
              имя/роль поверх снизу. Чёрный фон портретов сливается с картой. */}
          <div className={`game-card-hero${crisis}`}>
            <img className="game-card-hero-img" src={getAsset(advisor.avatar)} alt="" onError={e => e.currentTarget.style.display = 'none'} />
            <div className="game-card-hero-meta">
              <h1 id="current-advisor" className="game-card-hero-name">{advisor.name}</h1>
              <div className="game-card-hero-role">{advisor.role}</div>
            </div>
          </div>

          {/* Текст карты */}
          <div className="game-card-body">
            {/* Атмосферный фон-подложка «мир Варонии» (заполняет пустоту) */}
            <div className="game-card-ambiance" />
            {bgImage && (
              <div
                className="game-card-background"
                style={{ backgroundImage: `url(${getAsset(bgImage)})` }}
              />
            )}
            {currentCard.assetImage && (
              <img src={getAsset(currentCard.assetImage)} className="card-advisor-avatar" alt="" style={{ zIndex: 1 }} onError={e => e.currentTarget.style.display = 'none'} />
            )}
            {hovered && (
              <div className={`choice-preview ${hovered}`}>
                {hovered === "left" ? currentCard.left.label.toUpperCase() : currentCard.right.label.toUpperCase()}
              </div>
            )}
            <p className="game-card-text">
              {cleanCardText(currentCard.text, isCrisis)}
            </p>
            {!safeMode && currentCard.cta === "naruzhu" && (
              <button
                onClick={e => { e.stopPropagation(); haptic("light"); onNaruzhu(currentCard?.id || "card"); }}
                className="game-card-partner-cta"
              >
                {ctaVariant.label}
              </button>
            )}
          </div>

          <div className="game-card-divider" />

          {/* Кнопки */}
          <div className="game-choice-grid">
            {["left", "right"].map(side => (
              <button key={side}
                className={`game-choice-btn${hovered === side ? " active" : ""}`}
                onClick={() => { haptic("medium"); onChoose(side); }}
                onMouseEnter={() => setHovered(side)}
                onMouseLeave={() => setHovered(null)}
                aria-label={`${side === "left" ? "Левое" : "Правое"} решение: ${currentCard[side].label}. ${currentCard[side].text || ""}`.trim()}
              >
                <div className="game-choice-btn-label">
                  <span aria-hidden="true">{side === "left" ? "←" : "→"}</span>
                  {currentCard[side].label.toUpperCase()}
                </div>
                {currentCard[side].text && (
                  <div className="game-choice-btn-text">{currentCard[side].text}</div>
                )}
              </button>
            ))}
          </div>
        </article>
      </div>

      <div className="game-card-footer">
        {ratingEnabled && (() => {
          const rated = cardRating === "up" || cardRating === "down" || cardRating === "rated";
          const btn = (kind, glyph, color) => {
            return (
              <button
                onClick={e => { e.stopPropagation(); if (!rated) onRate(kind); }}
                disabled={rated}
                aria-label={kind === "up" ? "Карта понравилась" : "Карта не понравилась"}
                className={`card-rating-btn ${cardRating === kind ? "selected" : ""}`}
                style={{
                  "--rating-color": color,
                  opacity: rated ? (cardRating === kind ? 1 : 0.25) : 0.4,
                }}
              >{glyph}</button>
            );
          };
          return (
            <>
              {btn("up", "👍", "#d4af37")}
              <span className="game-card-gesture">
                СВАЙП ИЛИ ТАП
              </span>
              {btn("down", "👎", "#ff756b")}
            </>
          );
        })()}
        {!ratingEnabled && (
          <span className="game-card-gesture">
            СВАЙП ИЛИ ТАП
          </span>
        )}
      </div>
    </div>
  );
}
