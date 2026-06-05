import { PARAMS } from "../data/params.js";
import { getAsset } from "../lib/assets.js";
import StatIcon from "./StatIcon.jsx";
import AchievementsList from "./AchievementsList.jsx";
import DecisionLog from "./DecisionLog.jsx";

const ENDING_IMG_IDS = ["zastoy", "oprichnina", "kooperativ", "bunker", "perestroika", "legenda"];
const ENDING_NO_ICON_IDS = ["zastoy", "oprichnina", "kooperativ", "bunker"];

// Экран победы: финал (концовка), итоговые шкалы, достижения, история, промокод.
export default function VictoryScreen({
  tenure, ending, stats, achievements, decisionLog, promoCode, onCopyPromo, onShare, onRestart,
}) {
  return (
    <div className="screen-scroll-container">
      <div className="card-paper-container" style={{ paddingBottom: 16 }}>
        <div className="card-header-bar gold">
          <div style={{ fontSize: 32, marginBottom: 2 }}>🏛️</div>
          <div className="font-typewriter" style={{ fontSize: 13, letterSpacing: 4, color: "#d4af37", fontWeight: 700 }}>ВЫ ВОШЛИ В ИСТОРИЮ</div>
          <div className="font-typewriter" style={{ fontSize: 11, color: "#caa23a", letterSpacing: 2, marginTop: 2 }}>
            {tenure} МЕСЯЦЕВ У ВЛАСТИ
          </div>
        </div>

        <div className="card-content-area">
          {ending && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {ending.image || ENDING_IMG_IDS.includes(ending.id) ? (
                <div className="story-image-frame" style={{ height: 150 }}>
                  <img
                    className="frame-inner-img"
                    src={getAsset(ending.image || `/images/ending_${ending.id}.webp`)}
                    alt={ending.title}
                    onError={e => e.currentTarget.style.display = 'none'}
                  />
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "center", margin: "10px 0" }}>
                  <span style={{ fontSize: 44 }}>{ending.icon}</span>
                </div>
              )}

              <div style={{ padding: "0 4px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  {!ENDING_NO_ICON_IDS.includes(ending.id) && (
                    <span style={{ fontSize: 24 }}>{ending.icon}</span>
                  )}
                  <div>
                    <div className="font-typewriter" style={{ fontSize: 12, letterSpacing: 2, color: "#d4af37", fontWeight: 700 }}>{ending.title.toUpperCase()}</div>
                    <div className="font-typewriter" style={{ fontSize: 10, color: "#b89a5e", letterSpacing: 0.5, marginTop: 1 }}>{ending.subtitle}</div>
                  </div>
                </div>

                {ending.text.split('\n\n').map((para, i, arr) => (
                  <p key={i} style={{ fontSize: 14, lineHeight: 1.6, color: "#e0d8c8", fontWeight: 400, marginBottom: i < arr.length - 1 ? 10 : 0 }}>
                    {para}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "14px 0 12px" }}>
            {PARAMS.map(p => (
              <div key={p.key} style={{ background: "#0a0a0a", border: `1px solid ${p.color}22`, borderRadius: 8, padding: "8px 10px", boxShadow: `0 0 8px ${p.color}10` }}>
                <StatIcon param={p} className="result-stat-icon" style={{ color: p.color }} />
                <div className="font-typewriter" style={{ fontSize: 10, color: "#b89a5e", letterSpacing: 0.5, marginTop: 2 }}>{p.label.toUpperCase()}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: p.color, marginTop: 1 }}>{stats[p.key]}</div>
              </div>
            ))}
          </div>

          <AchievementsList achievements={achievements} title="ДОСТИЖЕНИЯ" />

          <DecisionLog decisionLog={decisionLog} />

          {promoCode && (
            <div className="hub-promo-box" style={{ marginBottom: 14 }}>
              <div className="font-typewriter" style={{ fontSize: 10, color: "#caa23a", letterSpacing: 1.5, marginBottom: 4 }}>
                🎁 ПОДАРОК ЗА ПОБЕДУ — {promoCode.days} ДНЕЙ VPN НАРУЖУ
              </div>
              <div className="hub-promo-code" onClick={onCopyPromo}>
                {promoCode.code}
              </div>
              <div className="font-typewriter" style={{ fontSize: 10, color: "#b89a5e" }}>
                Копировать · Активация на naruzhu.am
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={onShare} className="btn-emerald" style={{ width: "100%" }}>
            📤 ПОДЕЛИТЬСЯ ПОБЕДОЙ
          </button>
          <button onClick={onRestart} className="btn-gold" style={{ width: "100%" }}>
            НОВАЯ ЭПОХА
          </button>
        </div>
      </div>
    </div>
  );
}
