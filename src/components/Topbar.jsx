import { formatMonths } from "../lib/text.js";

// Верхняя панель: бренд, срок правления, статусы (кризис/выборы), кнопка досье.
export default function Topbar({ isCrisis, presidentName, monthName, year, tenure, phase, onHubOpen }) {
  return (
    <header className={`game-topbar ${isCrisis ? "crisis" : ""}`}>
      <div className="brand-lockup">
        <div className="brand-copy">
          <div className="brand-title">ВАРОНИЯ</div>
          <div className="brand-meta">
            {presidentName && <span className="brand-president">{presidentName}</span>}
            <span className="brand-tenure">У власти: {formatMonths(tenure, { short: true })}</span>
            <span className="brand-date">{monthName} {year}</span>
            {isCrisis && <span className="state-alert">КРИЗИС</span>}
            {phase === "election" && <span className="state-election">ВЫБОРЫ</span>}
            {phase === "card" && tenure >= 96 && <span className="state-overtime">ЭНДШПИЛЬ</span>}
          </div>
        </div>
      </div>
      {/* Кнопка досье и рекордов */}
      <button
        onClick={onHubOpen}
        title="Досье и рекорды"
        aria-label="Открыть досье и рекорды"
        className="hub-launch"
      >
        <span className="hub-dot" />
        <span className="hub-launch-text">
          <span>ДОСЬЕ</span>
          <span>РЕКОРДЫ</span>
        </span>
      </button>
    </header>
  );
}
