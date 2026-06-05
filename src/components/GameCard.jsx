import { PARAMS } from "../data/params.js";
import { getAsset } from "../lib/assets.js";
import FactionIcon from "./FactionIcon.jsx";
import ChoiceEffectRow from "./ChoiceEffectRow.jsx";

const NARUZHU_YELLOW = "#FFD60A";

// Главный игровой экран: советник, текст-дилемма, превью эффектов, выбор/свайп.
// cardRef передаётся как обычный проп (для swipe-анимации в родителе).
export default function GameCard({
  previewFxReal, isCrisis, cardBg, cardPaperBg, cardTextColor, headerBg,
  advisor, currentCard, hovered, setHovered, ctaVariant,
  cardRef, onTouchStart, onTouchMove, onTouchEnd, haptic, onChoose, onNaruzhu,
}) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "8px 16px 12px", overflow: "hidden", background: cardBg }}>
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
        <div style={{
          height: "100%", display: "flex", flexDirection: "column",
          background: cardPaperBg, borderRadius: 12,
          boxShadow: `0 8px 32px rgba(0,0,0,0.6),0 0 0 1px rgba(212,175,55,0.3),inset 0 1px 0 rgba(255,255,255,${isCrisis ? 0.05 : 0.8})`,
          border: `1px solid ${isCrisis ? "#8b0000" : "#c9a84c"}`,
          overflow: "hidden", color: cardTextColor,
          animation: isCrisis ? "crisisShake 0.4s ease" : "none",
        }}>
          {/* Советник */}
          <div style={{ background: headerBg, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <img src={getAsset(advisor.avatar)} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid #d4af37", boxShadow: "0 0 8px rgba(212,175,55,0.3)" }} alt="" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#f5e6c8", lineHeight: 1.2 }}>{advisor.name}</div>
              <div style={{ fontSize: 10, color: "#d4af3799", fontFamily: "var(--font-typewriter)", letterSpacing: 0.5 }}>{advisor.role}</div>
            </div>
          </div>

          {/* Текст карты */}
          <div style={{ flex: 1, padding: "16px 18px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
            {currentCard.bgImage && (
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                backgroundImage: `url(${getAsset(currentCard.bgImage)})`,
                backgroundSize: "cover", backgroundPosition: "center",
                opacity: 0.22, zIndex: 0, pointerEvents: "none"
              }} />
            )}
            <img src={getAsset(advisor.avatar)} className="card-advisor-avatar" alt="" style={{ zIndex: 1 }} />
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
            <p style={{ fontSize: 16, lineHeight: 1.55, color: cardTextColor, fontWeight: 500, textAlign: "center", letterSpacing: 0.1, zIndex: 1 }}>
              {currentCard.text}
            </p>
            {currentCard.cta === "naruzhu" && (
              <button
                onClick={e => { e.stopPropagation(); haptic("light"); onNaruzhu(currentCard?.id || "card"); }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  margin: "10px auto 0", padding: "5px 14px", borderRadius: 999,
                  background: "rgba(15,10,0,0.82)",
                  border: `1px solid ${NARUZHU_YELLOW}88`,
                  cursor: "pointer", color: NARUZHU_YELLOW,
                  fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: 0.6,
                  fontWeight: 700,
                  boxShadow: `0 0 12px ${NARUZHU_YELLOW}22`,
                }}
              >
                {ctaVariant.label}
              </button>
            )}
          </div>

          <div style={{ height: 1, background: `linear-gradient(to right,transparent,${isCrisis ? "#8b000066" : "#c9a84c66"},transparent)`, margin: "0 16px" }} />

          {/* Кнопки */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "12px", flexShrink: 0 }}>
            {["left", "right"].map(side => (
              <button key={side}
                onClick={() => { haptic("medium"); onChoose(side); }}
                onMouseEnter={() => setHovered(side)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  background: hovered === side ? "linear-gradient(135deg,#8b0000,#6b0000)" : "linear-gradient(135deg,#2c1a06,#1a0f00)",
                  color: hovered === side ? "#f5e6c8" : "#c4a882",
                  border: `1px solid ${hovered === side ? "#d4af37" : "#c9a84c44"}`,
                  borderRadius: 8, padding: "10px 8px", cursor: "pointer", textAlign: "center",
                  transition: "all 0.15s ease",
                  transform: hovered === side ? "translateY(-2px)" : "none",
                  boxShadow: hovered === side ? "0 6px 16px rgba(0,0,0,0.5),0 0 8px rgba(212,175,55,0.2)" : "none",
                  fontFamily: "var(--font-sans)",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between",
                  minHeight: 92,
                }}
              >
                <div style={{ fontSize: 10, fontFamily: "var(--font-sans)", letterSpacing: 1.2, color: hovered === side ? "#d4af37" : "#8b6914", marginBottom: 4, fontWeight: 700 }}>
                  {currentCard[side].label.toUpperCase()}
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.35 }}>{currentCard[side].text}</div>
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
