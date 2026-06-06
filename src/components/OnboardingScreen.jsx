import { getAsset } from "../lib/assets.js";

// Экран онбординга: досье, правила, ввод имени / продолжение срока.
export default function OnboardingScreen({
  presidentName, nameInput, onNameInput, onNameSubmit, onNewTerm, onPlayAsOther, onNaruzhu,
}) {
  return (
    <div className="screen-scroll-container" style={{ background: "radial-gradient(circle at 50% 22%,#2a1208 0%,#160a04 48%,#080402 100%)" }}>
      <div className="card-paper-container">
        <div className="onboarding-title-bar">
          <div className="onboarding-title">Welcome to <span>ВАРОНИЯ</span></div>
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
        </div>
        <div style={{ padding: "0 20px 12px" }}>
          {presidentName ? (
            <div className="onboarding-return-actions">
              <button onClick={onNewTerm} className="btn-velvet onboarding-new-term">
                НОВЫЙ СРОК →
              </button>
              <button onClick={onPlayAsOther} className="onboarding-edit-name" title="Изменить имя" aria-label="Изменить имя">
                ✎
              </button>
            </div>
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
