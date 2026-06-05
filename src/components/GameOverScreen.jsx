import { getAsset } from "../lib/assets.js";
import AchievementsList from "./AchievementsList.jsx";

// Экран поражения: причина, достижения, шеринг/рестарт.
export default function GameOverScreen({
  tenure, tenureLabel, deathMsg, achievements, onShare, onRestart,
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

          <AchievementsList achievements={achievements} title="ВАШИ ДОСТИЖЕНИЯ" />
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
