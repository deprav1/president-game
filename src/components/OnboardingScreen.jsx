import { getAsset } from "../lib/assets.js";

// Уровни сложности (порядок = как в gameHelpers.DIFFICULTIES).
const DIFFICULTY_OPTIONS = [
  { key: "easy",     label: "Учебный",  hint: "Мягкие последствия и видимые значения влияния." },
  { key: "normal",   label: "Обычный",  hint: "Полный баланс Варонии: решения быстро меняют расклад." },
  { key: "hardcore", label: "Хардкор", hint: "Значения скрыты, а давление усиливается с каждым годом." },
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
          <h1 className="onboarding-title">Добро пожаловать в <span>ВАРОНИЮ</span></h1>
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
            Держите четыре силы между крайностями: слабость и чрезмерное влияние одинаково опасны.
          </p>
          <div className="onboarding-rule-note">
            <span>СВАЙП</span> или <span>ТАП</span> по решению · два срока до финала
          </div>
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
                aria-label="Имя президента"
                value={nameInput}
                onChange={e => onNameInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && onNameSubmit()}
                className="onboarding-name-input"
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
            <div className="naruzhu-footer-kicker">VPN «НАРУЖУ»</div>
            <div className="naruzhu-footer-copy">Свободный интернет за пределами Варонии</div>
          </div>
        )}

        <div className="app-version font-typewriter">
          v{typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev"}
        </div>
      </div>
    </div>
  );
}
