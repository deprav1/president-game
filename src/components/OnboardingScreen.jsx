import { PARAMS } from "../data/params.js";
import { getAsset } from "../lib/assets.js";
import FactionIcon from "./FactionIcon.jsx";
import StatIcon from "./StatIcon.jsx";

const paramByKey = key => PARAMS.find(p => p.key === key);

const INTRO_RULES = [
  { key: "oligarchs", text: "Элиты финансируют вас — не разочаруйте их" },
  { key: "army",      text: "Армия защищает вас — пока вы её уважаете" },
  { key: "people",    text: "Народ вас избрал — и может свергнуть" },
  { key: "west",      text: "Запад наблюдает — с деньгами и санкциями" },
];

// Экран онбординга: досье, правила, ввод имени / продолжение срока.
export default function OnboardingScreen({
  presidentName, nameInput, onNameInput, onNameSubmit, onNewTerm, onPlayAsOther, onNaruzhu,
}) {
  return (
    <div className="screen-scroll-container" style={{ background: "radial-gradient(circle at 50% 22%,#2a1208 0%,#160a04 48%,#080402 100%)" }}>
      <div className="card-paper-container">
        <div className="card-header-bar">
          <FactionIcon type="crest" className="dossier-brand-mark" />
          <div className="font-display" style={{ fontSize: 20, fontWeight: 900, color: "#f5e6c8" }}>ВАРОНИЯ</div>
          <div className="font-mono" style={{ fontSize: 10, fontWeight: 500, color: "#d4af37bb", marginTop: 3 }}>СЕКРЕТНОЕ ДОСЬЕ · ПРЕЗИДЕНТ</div>
        </div>
        <div className="card-content-area">
          <div className="story-image-frame">
            <img
              className="frame-inner-img"
              src={getAsset('/images/onboarding_dossier.webp')}
              alt="Секретное досье"
              onError={e => e.currentTarget.style.display = 'none'}
            />
          </div>

          <p style={{ fontSize: 15, lineHeight: 1.55, color: "#e0d8c8", fontWeight: 600, textAlign: "center", marginBottom: 14, letterSpacing: 0.2 }}>
            Поздравляем с избранием на пост Президента Республики Варония.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
            {INTRO_RULES.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "6px 10px", border: "1px solid rgba(212,175,55,0.12)" }}>
                <span className={`intro-icon-shell ${item.key}`}>
                  <StatIcon param={paramByKey(item.key)} className="intro-raster-icon" />
                </span>
                <span style={{ fontSize: 11, color: "#b8b0a0", lineHeight: 1.35 }}>{item.text}</span>
              </div>
            ))}
          </div>
          <div style={{ background: "rgba(139,0,0,0.08)", border: "1px solid rgba(139,0,0,0.15)", borderRadius: 8, padding: "8px 12px", marginBottom: 12, textAlign: "center" }}>
            <p style={{ fontSize: 12, color: "#e07a6a", fontWeight: 500, lineHeight: 1.45 }}>
              Если любая шкала упадёт в 0 или зашкалит до 100 — вас уберут.
            </p>
          </div>
        </div>
        <div style={{ padding: "0 20px 12px" }}>
          {presidentName ? (
            <>
              <div className="font-typewriter" style={{ textAlign: "center", fontSize: 11, color: "#caa23a", letterSpacing: 1, marginBottom: 10 }}>
                С возвращением, {presidentName}
              </div>
              <button onClick={onNewTerm} className="btn-velvet" style={{ marginBottom: 8 }}>
                НОВЫЙ СРОК →
              </button>
              <button onClick={onPlayAsOther} className="btn-outline" style={{ width: "100%" }}>
                ИГРАТЬ ЗА ДРУГОГО
              </button>
            </>
          ) : (
            <>
              <input
                type="text"
                maxLength={24}
                placeholder="Ваше имя (необязательно)"
                value={nameInput}
                onChange={e => onNameInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && onNameSubmit()}
                style={{
                  width: "100%", marginBottom: 10, padding: "10px 14px",
                  background: "#0a0a0a", border: "1px solid rgba(212,175,55,0.2)",
                  borderRadius: 8, fontSize: 13, fontFamily: "var(--font-serif)",
                  color: "#e0d8c8", outline: "none", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.2)"
                }}
              />
              <button onClick={onNameSubmit} className="btn-velvet">
                ПРИСТУПИТЬ К ОБЯЗАННОСТЯМ
              </button>
            </>
          )}
        </div>

        {/* ── НАРУЖУ FOOTER ── */}
        <div
          onClick={onNaruzhu}
          style={{
            padding: "8px 20px 12px", textAlign: "center", cursor: "pointer",
            borderTop: "1px solid #c9a84c22",
          }}
        >
          <span className="font-typewriter" style={{
            fontSize: 10, color: "#caa23a",
            letterSpacing: 0.5, textDecoration: "underline", textUnderlineOffset: 2,
            opacity: 0.75,
          }}>
            🚪 Игра от <b style={{ color: "#b45309" }}>Наружу</b> — надёжный VPN для свободного интернета
          </span>
        </div>

        <div className="font-typewriter" style={{
          position: "absolute", bottom: 4, right: 8,
          fontSize: 10, color: "#ece0c422", letterSpacing: 1, pointerEvents: "none",
        }}>
          v1.3.0
        </div>
      </div>
    </div>
  );
}
