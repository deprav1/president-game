import { PARAMS } from "../data/params.js";
import { getAsset } from "../lib/assets.js";
import StatIcon from "./StatIcon.jsx";
import AchievementsList from "./AchievementsList.jsx";
import DecisionLog from "./DecisionLog.jsx";

// Экран поражения: причина, финальные шкалы, достижения, история, шеринг/рестарт.
export default function GameOverScreen({
  tenure, tenureLabel, deathMsg, stats, achievements, decisionLog, onShare, onRestart,
}) {
  return (
    <div className="screen-scroll-container">
      <div className="card-paper-container crisis" style={{ paddingBottom: 16 }}>
        <div className="card-header-bar crisis">
          <div style={{ fontSize: 28, marginBottom: 2 }}>⚰️</div>
          <div className="font-typewriter" style={{ fontSize: 13, letterSpacing: 4, color: "#c0392b", fontWeight: 700 }}>КОНЕЦ ПРАВЛЕНИЯ</div>
          <div className="font-typewriter" style={{ fontSize: 11, color: "#caa23a", letterSpacing: 2, marginTop: 2 }}>
            {tenure} МЕС. У ВЛАСТИ — {tenureLabel}
          </div>
        </div>

        <div className="card-content-area">
          <div className="story-image-frame crisis ruins">
            <img
              className="frame-inner-img"
              src={getAsset('/images/palace_ruined.webp')}
              alt="Разрушенный дворец"
              onError={e => e.currentTarget.style.display = 'none'}
            />
          </div>

          <div style={{
            background: "#0a0a0a", border: "1px solid rgba(212,175,55,0.12)",
            borderRadius: 12, padding: "14px 18px", marginBottom: 12,
            boxShadow: "inset 0 2px 8px rgba(0,0,0,0.6)"
          }}>
            <p style={{ fontSize: 14, lineHeight: 1.6, fontWeight: 400, color: "#d8c8a0", textAlign: "center" }}>
              «{deathMsg}»
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            {PARAMS.map(p => {
              const isKiller = stats[p.key] <= 0 || stats[p.key] >= 100;
              const isTooHigh = stats[p.key] >= 100;
              return (
                <div key={p.key} style={{
                  background: isKiller ? "#140000" : "#0a0a0a",
                  border: `1px solid ${isKiller ? "#8b0000" : "rgba(212,175,55,0.12)"}`,
                  borderRadius: 8, padding: "8px 10px",
                  boxShadow: isKiller ? "0 0 10px rgba(192, 57, 43, 0.45)" : "none",
                  position: "relative", overflow: "hidden",
                }}>
                  {isKiller && (
                    <div className="font-typewriter" style={{ position: "absolute", top: 4, right: 6, fontSize: 10, color: "#c0392b", fontWeight: 700 }}>
                      {isTooHigh ? "▲ MAX" : "▼ MIN"}
                    </div>
                  )}
                  <StatIcon param={p} className="result-raster-icon" />
                  <div className="font-typewriter" style={{ fontSize: 10, color: isKiller ? "#c0392b" : "#6b4c1e", letterSpacing: 0.5, marginTop: 2 }}>{p.label.toUpperCase()}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: isKiller ? "#c0392b" : stats[p.key] > 65 ? "#27ae60" : "#d4af37", marginTop: 1 }}>
                    {stats[p.key]}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="font-typewriter" style={{ fontSize: 10, color: "#b89a5e", marginBottom: 12, letterSpacing: 0.5, textAlign: "center" }}>
            ⚠️ Шкала в 0 или 100 — лишение власти
          </div>

          <AchievementsList achievements={achievements} title="ВАШИ ДОСТИЖЕНИЯ" />

          <DecisionLog decisionLog={decisionLog} />
        </div>

        <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={onShare} className="btn-emerald" style={{ width: "100%" }}>
            📤 ПОДЕЛИТЬСЯ РЕЗУЛЬТАТОМ
          </button>
          <button onClick={onRestart} className="btn-velvet" style={{ width: "100%" }}>
            НОВЫЙ СРОК
          </button>
        </div>
      </div>
    </div>
  );
}
