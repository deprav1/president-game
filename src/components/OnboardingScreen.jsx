import { PARAMS } from "../data/params.js";
import { getAsset } from "../lib/assets.js";
import FactionIcon from "./FactionIcon.jsx";
import StatIcon from "./StatIcon.jsx";

const paramByKey = key => PARAMS.find(p => p.key === key);

const INTRO_RULES = [
  { key: "oligarchs", text: "Держите элиты, силовиков, народ и Запад в балансе" },
  { key: "army",      text: "Каждый выбор двигает шкалы — крайности опаснее провала" },
  { key: "people",    text: "0 или 100 по любой шкале — конец правления" },
  { key: "west",      text: "Продержитесь два срока, чтобы войти в историю" },
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
          <div className="font-mono" style={{ fontSize: 12, fontWeight: 500, color: "#d4af37bb", marginTop: 3 }}>СЕКРЕТНОЕ ДОСЬЕ · ПРЕЗИДЕНТ</div>
        </div>
        <div className="card-content-area">
          <div className="story-image-frame">
            <img
              className="frame-inner-img"
              src={getAsset('/images/onboarding_dossier_v2.webp')}
              alt="Секретное досье"
              onError={e => e.currentTarget.style.display = 'none'}
            />
          </div>

          <p style={{ fontSize: 16, lineHeight: 1.55, color: "#e0d8c8", fontWeight: 700, textAlign: "center", marginBottom: 10, letterSpacing: 0.2 }}>
            Удержитесь у власти два срока. Не дайте ни одной силе стать слишком слабой или слишком сильной.
          </p>
          <div className="onboarding-goal-strip">
            <span>ЦЕЛЬ</span>
            <strong>96 месяцев</strong>
            <span>2 срока = легенда</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
            {INTRO_RULES.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "6px 10px", border: "1px solid rgba(212,175,55,0.12)" }}>
                <span className={`intro-icon-shell ${item.key}`}>
                  <StatIcon param={paramByKey(item.key)} className="intro-stat-icon" />
                </span>
                <span style={{ fontSize: 12, color: "#b8b0a0", lineHeight: 1.4 }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: "0 20px 12px" }}>
          {presidentName ? (
            <>
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
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onNaruzhu(); } }}
          role="button"
          tabIndex={0}
          className="naruzhu-footer-cta"
        >
          <div className="naruzhu-footer-kicker">VPN НАРУЖУ</div>
          <div className="naruzhu-footer-copy">Свободный интернет за пределами Варонии →</div>
        </div>

        <div className="font-typewriter" style={{
          position: "absolute", bottom: 4, right: 8,
          fontSize: 10, color: "#ece0c422", letterSpacing: 1, pointerEvents: "none",
        }}>
          v{typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev"}
        </div>
      </div>
    </div>
  );
}
