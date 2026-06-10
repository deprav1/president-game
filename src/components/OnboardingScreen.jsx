import { getAsset } from "../lib/assets.js";

// Уровни сложности (порядок = как в gameHelpers.DIFFICULTIES).
const DIFFICULTY_OPTIONS = [
  { key: "easy",     label: "Лёгкий",  hint: "Спокойная партия — ошибки почти не наказываются." },
  { key: "normal",   label: "Обычный", hint: "Классический баланс Варонии." },
  { key: "hardcore", label: "Хардкор", hint: "Без цифр влияния. Давление растёт с каждым годом." },
];

// Экран онбординга: досье, правила, выбор сложности, ввод имени / продолжение срока.
export default function OnboardingScreen({
  presidentName, nameInput, onNameInput, onNameSubmit, onNewTerm, onPlayAsOther, onNaruzhu,
  difficulty = "normal", onSelectDifficulty, safeMode = false,
}) {
  const activeHint = (DIFFICULTY_OPTIONS.find(o => o.key === difficulty) || DIFFICULTY_OPTIONS[1]).hint;
  return (
    <div className="screen-scroll-container onboarding-screen">
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

          <p className="onboarding-rules-copy">
            Удержитесь у власти сколько сможете. Свапайте карточку для принятия решения, не позволяйте одной из четырех сторон слишком ослабнуть или окрепнуть.
          </p>
        </div>
        <div className="onboarding-actions">
          <div className="difficulty-select" role="group" aria-label="Сложность">
            {DIFFICULTY_OPTIONS.map(o => (
              <button
                key={o.key}
                type="button"
                className={`difficulty-option ${difficulty === o.key ? "active" : ""}`}
                aria-pressed={difficulty === o.key}
                onClick={() => onSelectDifficulty?.(o.key)}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="difficulty-hint">{activeHint}</p>

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
                  width: "100%", padding: "10px 14px",
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

        {/* ── НАРУЖУ FOOTER (скрыт в безопасном режиме) ── */}
        {!safeMode && (
          <div
            onClick={onNaruzhu}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onNaruzhu(); } }}
            role="button"
            tabIndex={0}
            className="naruzhu-footer-cta"
          >
            <div className="naruzhu-footer-kicker">VPN НАРУЖУ</div>
            <div className="naruzhu-footer-copy">Свободный интернет за пределами Варонии</div>
          </div>
        )}

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
