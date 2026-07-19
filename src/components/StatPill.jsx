// Шкала параметра/фракции с цветовыми состояниями (norm/warn/danger/critical).
// Без иконки: на мобилке она съедала место — показываем полное название силы.
// preview — предполагаемая дельта при свайпе/наведении (0/undefined → не показываем).
const STATE_LABELS = {
  normal: "баланс",
  warning: "напряжение",
  danger: "опасность",
  critical: "критический уровень",
};

export default function StatPill({ param, value, flash, preview = 0, showValue = true }) {
  const pct        = Math.max(0, Math.min(100, value));
  const isCritical = pct <= 8  || pct >= 92;
  const isDanger   = pct <= 15 || pct >= 85;
  const isWarning  = !isDanger && (pct <= 28 || pct >= 72);
  const state      = isCritical ? "critical" : isDanger ? "danger" : isWarning ? "warning" : "normal";

  return (
    <div
      className={`stat-pill ${param.key} ${state}`}
      style={{ "--param-color": param.color }}
      aria-label={`${param.label}: ${showValue ? `${pct} из 100, ` : ""}${STATE_LABELS[state]}`}
    >
      <div
        className="stat-track"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={showValue ? pct : undefined}
        aria-valuetext={`${param.label}: ${STATE_LABELS[state]}`}
      >
        <div className="stat-safe-zone" />
        <div
          className="stat-fill"
          style={{
            width: `${pct}%`,
            animation: flash ? "flashStat 0.5s ease" : isCritical ? "pulse 0.7s infinite" : isDanger ? "pulse 1.5s infinite" : "none",
          }}
        />
        <div className="stat-midline" />
      </div>
      <div className="stat-label">
        {param.label.toUpperCase()}{isCritical ? "!" : ""}
      </div>
      {showValue && <div className="stat-value" aria-hidden="true">{pct}</div>}
      {preview !== 0 && (
        <div className={`stat-delta ${preview > 0 ? "pos" : "neg"}`}>
          {preview > 0 ? `+${preview}` : preview}
        </div>
      )}
    </div>
  );
}
