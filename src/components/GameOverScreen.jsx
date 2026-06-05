import { getAsset } from "../lib/assets.js";
import AchievementsList from "./AchievementsList.jsx";

// Экран поражения: причина, VPN-ревайв, скидка, достижения, шеринг/рестарт.
export default function GameOverScreen({
  tenure, tenureLabel, deathMsg, achievements,
  promoCode, canRevive, onShare, onRestart, onVpnRevive,
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

          {/* VPN-ревайв: оффер виден один раз за игру */}
          {canRevive && (
            <div style={{
              background: "linear-gradient(135deg, #0e0e0e, #12100a)",
              border: "1px solid rgba(255,214,10,0.35)",
              borderRadius: 12, padding: "14px 16px", marginBottom: 12,
              boxShadow: "0 0 18px rgba(255,214,10,0.08)",
            }}>
              <div className="font-typewriter" style={{ fontSize: 10, color: "#FFD60A", letterSpacing: 1.5, marginBottom: 6, fontWeight: 700 }}>
                🔓 ЕЩЁ ОДИН ШАНС
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.55, color: "#d8c8a0", marginBottom: 10 }}>
                Ты проиграл. Но с бесконечным доступом к свободному интернету всё могло сложиться иначе. Посети VPN «Наружу» — и получи ещё один шанс.
              </p>
              <button
                onClick={onVpnRevive}
                style={{
                  width: "100%", padding: "11px 14px", borderRadius: 8,
                  background: "linear-gradient(135deg, rgba(255,214,10,0.18), rgba(255,214,10,0.06))",
                  border: "1px solid rgba(255,214,10,0.55)",
                  color: "#FFD60A", fontFamily: "var(--font-mono)",
                  fontSize: 11, fontWeight: 700, letterSpacing: 1.2,
                  cursor: "pointer",
                  boxShadow: "0 0 12px rgba(255,214,10,0.12)",
                }}
              >
                🌐 ПОЛУЧИТЬ ЕЩЁ ШАНС →
              </button>
            </div>
          )}

          {/* Скидка по длине рана */}
          {promoCode && (
            <div className="hub-promo-box" style={{ marginBottom: 12 }}>
              <div className="font-typewriter" style={{ fontSize: 10, color: "#caa23a", letterSpacing: 1.5, marginBottom: 4 }}>
                🎁 СКИДКА {promoCode.percent}% НА VPN «НАРУЖУ»
              </div>
              <div className="hub-promo-code" style={{ letterSpacing: 2.5 }}>
                {promoCode.code}
              </div>
              <div className="font-typewriter" style={{ fontSize: 10, color: "#b89a5e", marginTop: 4 }}>
                Копировать · Активация на naruzhu.am
              </div>
              <div className="font-typewriter" style={{ fontSize: 9, color: "#6b4c1e", marginTop: 3 }}>
                или 7 дней бесплатно — промокод WARONIA
              </div>
            </div>
          )}

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
