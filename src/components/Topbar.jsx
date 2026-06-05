import FactionIcon from "./FactionIcon.jsx";

// Верхняя панель: герб/бренд, срок правления, статусы (кризис/выборы), кнопка хаба.
export default function Topbar({ isCrisis, presidentName, monthName, year, tenure, phase, onHubOpen }) {
  return (
    <header className={`game-topbar ${isCrisis ? "crisis" : ""}`}>
      <div className="brand-lockup">
        <div className="brand-mark-shell">
          <FactionIcon type="crest" className="brand-mark" />
        </div>
        <div className="brand-copy">
          <div className="brand-title">ВАРОНИЯ</div>
          <div className="brand-meta">
            {presidentName && <span className="brand-president">{presidentName}</span>}
            <span className="brand-tenure">Срок: {tenure} мес.</span>
            <span className="brand-date">{monthName} {year}</span>
            {isCrisis && <span className="state-alert">КРИЗИС</span>}
            {phase === "election" && <span className="state-election">ВЫБОРЫ</span>}
          </div>
        </div>
      </div>
      {/* Кнопка «Покинуть Варонию» */}
      <button
        onClick={onHubOpen}
        title="Покинуть Варонию · личное дело"
        className="hub-launch"
      >
        <span className="hub-dot" />
        <span className="hub-launch-text">ПОКИНУТЬ<br/>ВАРОНИЮ</span>
      </button>
    </header>
  );
}
