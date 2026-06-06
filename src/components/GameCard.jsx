import { PARAMS } from "../data/params.js";
import { getAsset } from "../lib/assets.js";
import FactionIcon from "./FactionIcon.jsx";
import ChoiceEffectRow from "./ChoiceEffectRow.jsx";

const NARUZHU_YELLOW = "#FFD60A";

// Главный игровой экран: советник, текст-дилемма, превью эффектов, выбор/свайп.
// Цвета карты вынесены в CSS (.game-card / .game-card.crisis и т.д.) — правятся там.
// cardRef передаётся как обычный проп (для swipe-анимации в родителе).
export default function GameCard({
  previewFxReal, isCrisis, advisor, currentCard, hovered, setHovered, ctaVariant,
  cardRef, onTouchStart, onTouchMove, onTouchEnd, haptic, onChoose, onNaruzhu,
}) {
  const crisis = isCrisis ? " crisis" : "";

  let bgImage = currentCard.bgImage;
  if (!bgImage) {
    if (currentCard.advisor === 2) {
      bgImage = "/images/bg_press.webp";
    } else if (currentCard.advisor === 3) {
      bgImage = "/images/bg_kremlin_night.webp";
    } else if (currentCard.advisor === 4) {
      bgImage = "/images/bg_west_summit.webp";
    }
  }

  return (
    <div className={`game-card-screen${crisis}`}>
      {/* Лента-сирена кризиса — явно «другой флоу» */}
      {isCrisis && (
        <div className="crisis-banner">🚨 ЭКСТРЕННАЯ СИТУАЦИЯ 🚨</div>
      )}
      {/* Превью эффектов (реальные значения 1.2×) */}
      <div style={{ height: 24, display: "flex", justifyContent: "center", gap: 12, alignItems: "center", marginBottom: 6, flexShrink: 0 }}>
        {previewFxReal && PARAMS.map(p => previewFxReal[p.key] !== 0 && (
          <span key={p.key} style={{
            fontSize: 12,
            fontFamily: "var(--font-sans)",
            color: previewFxReal[p.key] > 0 ? "#27ae60" : "#c0392b",
            animation: "fadeIn 0.2s ease",
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: "rgba(10, 5, 0, 0.65)",
            padding: "2px 8px",
            borderRadius: 6,
            border: `1px solid ${previewFxReal[p.key] > 0 ? "rgba(39, 174, 96, 0.3)" : "rgba(192, 57, 43, 0.3)"}`,
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)"
          }}>
            <FactionIcon type={p.key} className="preview-effect-icon" />
            <span style={{ fontWeight: 700 }}>
              {previewFxReal[p.key] > 0 ? "+" : "−"}
            </span>
          </span>
        ))}
      </div>

      <div
        ref={cardRef}
        style={{ flex: 1, minHeight: 0, animation: "cardIn 0.3s ease", position: "relative", touchAction: "pan-y", willChange: "transform" }}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      >
        <div className={`game-card${crisis}`}>
          {/* Советник */}
          <div className={`game-card-header${crisis}`}>
            <img src={getAsset(advisor.avatar)} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid #d4af37", boxShadow: "0 0 8px rgba(212,175,55,0.3)" }} alt="" onError={e => e.currentTarget.style.display = 'none'} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#f5e6c8", lineHeight: 1.2 }}>{advisor.name}</div>
              <div style={{ fontSize: 10, color: "#d4af3799", fontFamily: "var(--font-typewriter)", letterSpacing: 0.5 }}>{advisor.role}</div>
            </div>
          </div>

          {/* Текст карты */}
          <div style={{ flex: 1, padding: "16px 18px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
            {/* Атмосферный фон-подложка «мир Варонии» (заполняет пустоту) */}
            <div className="game-card-ambiance" />
            {bgImage && (
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                backgroundImage: `url(${getAsset(bgImage)})`,
                backgroundSize: "cover", backgroundPosition: "center",
                opacity: 0.22, zIndex: 0, pointerEvents: "none"
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
            {currentCard.cta === "naruzhu" && (
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
                <ChoiceEffectRow fx={currentCard[side].fx} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 8, flexShrink: 0, fontSize: 11, color: "#d4af3788", fontFamily: "var(--font-mono)", letterSpacing: 1.5, fontWeight: 500 }}>
        ← СВАЙП ИЛИ ТАП →
      </div>
    </div>
  );
}
