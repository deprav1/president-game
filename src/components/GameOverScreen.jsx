import { useMemo } from "react";
import { getAsset } from "../lib/assets.js";
import { defeatVerdict } from "../data/verdicts.js";
import AchievementsList from "./AchievementsList.jsx";

// Экран поражения: причина, вердикт, VPN-ревайв, скидка, достижения, шеринг/рестарт.
export default function GameOverScreen({
  tenure, tenureLabel, deathMsg, achievements, killerKey,
  promoCode, canRevive, onShare, onRestart, onVpnRevive,
  onCopyPromo,
}) {
  const verdict = useMemo(() => defeatVerdict(killerKey), [killerKey]);
  return (
    <div className="screen-scroll-container">
      <div className="flow-defeat" style={{ paddingBottom: 16 }}>
        <div className="flow-defeat-header">
          <div style={{ fontSize: 34, marginBottom: 2 }}>⚰️</div>
          <div className="flow-defeat-title">КОНЕЦ ПРАВЛЕНИЯ</div>
          <div className="font-typewriter" style={{ fontSize: 12, color: "#8b9aa3", letterSpacing: 2, marginTop: 4 }}>
            {tenure} МЕС. У ВЛАСТИ — {tenureLabel}
          </div>
        </div>

        <div className="flow-verdict">«{verdict}»</div>

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
                ЕЩЁ ОДИН ШАНС
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
                ПОЛУЧИТЬ ЕЩЁ ШАНС
              </button>
            </div>
          )}

          {/* Скидка по длине рана */}
          {promoCode && (
            <div className="hub-promo-box" style={{ marginBottom: 12 }}>
              <div className="font-typewriter" style={{ fontSize: 10, color: "#caa23a", letterSpacing: 1.5, marginBottom: 4 }}>
                Вы продержались {tenure} мес.
              </div>
              <div className="font-typewriter" style={{ fontSize: 12, color: "#d4af37", letterSpacing: 1.2, fontWeight: 700 }}>
                Получите скидку {promoCode.percent}%
              </div>
              <div className="font-typewriter" style={{ fontSize: 10, color: "#b89a5e", marginTop: 4 }}>
                Попробуйте 7 дней бесплатно
              </div>
              <div
                className="hub-promo-code"
                style={{ letterSpacing: 2.5 }}
                onClick={onCopyPromo}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onCopyPromo(); } }}
                role="button"
                tabIndex={0}
              >
                {promoCode.code}
              </div>
              <div className="font-typewriter" style={{ fontSize: 10, color: "#b89a5e", marginTop: 4 }}>
                Копировать · Активация на naruzhu.am
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
