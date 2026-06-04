import { getAsset } from "../lib/assets.js";

// Шкала параметра/фракции с цветовыми состояниями (norm/warn/danger/critical).
// Использует растровые иконки из params.icon.
export default function StatPill({ param, value, flash }) {
  const pct        = Math.max(0, Math.min(100, value));
  const isCritical = pct <= 8  || pct >= 92;
  const isDanger   = pct <= 15 || pct >= 85;
  const isWarning  = !isDanger && (pct <= 28 || pct >= 72);
  const state      = isCritical ? "critical" : isDanger ? "danger" : isWarning ? "warning" : "normal";

  return (
    <div className={`stat-pill ${param.key} ${state}`} style={{ "--param-color": param.color }}>
      <div className="stat-icon-shell">
        {param.icon ? (
          <img
            src={getAsset(param.icon)}
            alt=""
            className="stat-raster-icon"
          />
        ) : (
          <span className="stat-vector-icon" />
        )}
      </div>
      <div className="stat-track">
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
    </div>
  );
}
