import FactionIcon from "./FactionIcon.jsx";

// Верхняя панель: герб/бренд, месяц-год, статусы (кризис/выборы), кнопка «Наружу».
export default function Topbar({ isCrisis, presidentName, monthName, year, phase, onHubOpen }) {
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
            <span>{monthName} {year}</span>
            {isCrisis && <span className="state-alert">КРИЗИС</span>}
            {phase === "election" && <span className="state-election">ВЫБОРЫ</span>}
          </div>
        </div>
      </div>
      {/* Кнопка «Покинуть Варонию» */}
      <button
        onClick={onHubOpen}
        title="VPN Наружу — покинуть Варонию"
        className="hub-launch"
      >
        <span className="hub-dot" />
        <span className="hub-launch-text">ПОКИНУТЬ<br/>ВАРОНИЮ</span>
      </button>
    </header>
  );
}
