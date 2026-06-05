import { ELECTION_CARD } from "../data/cards.js";
import { getAsset } from "../lib/assets.js";

const FELT_BG = "radial-gradient(circle at 50% 22%,#2a1208 0%,#160a04 48%,#080402 100%)";

// Экран выборов: рейтинг народа определяет доступные стратегии кампании.
export default function ElectionScreen({ peopleStat, onChoose }) {
  const enough = peopleStat >= 40;
  return (
    <div className="screen-scroll-container" style={{ background: FELT_BG }}>
      <div className="card-paper-container" style={{ animation: "electionPulse 2.5s ease infinite" }}>
        <div className="card-header-bar gold" style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}>
          <img src={getAsset("/images/Vlasova_Press.webp")} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "2px solid #d4af37" }} alt="" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f5e6c8", lineHeight: 1.2 }}>Елена Власова</div>
            <div className="font-typewriter" style={{ fontSize: 11, color: "#d4af3799" }}>Пресс-секретарь</div>
          </div>
        </div>

        <div className="card-content-area padded-bottom">
          <div className="story-image-frame election">
            <img
              className="frame-inner-img"
              src={getAsset('/images/election_booth.webp')}
              alt="Избирательный участок"
              onError={e => e.currentTarget.style.display = 'none'}
            />
          </div>

          <p style={{ fontSize: 15, lineHeight: 1.6, color: "#e0d8c8", fontWeight: 500, textAlign: "center", marginBottom: 14 }}>
            {ELECTION_CARD.text}
          </p>

          <div style={{ padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid rgba(212,175,55,0.12)", marginBottom: 12 }}>
            <div className="font-typewriter" style={{ fontSize: 10, color: "#b89a5e", textAlign: "center", letterSpacing: 1, marginBottom: 4 }}>
              ВАШ РЕЙТИНГ У НАРОДА
            </div>
            <div style={{ height: 6, background: "#0a0a0a", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${peopleStat}%`, background: enough ? "#27ae60" : "#c0392b", borderRadius: 3, transition: "width 0.5s ease" }} />
            </div>
            <div className="font-typewriter" style={{ textAlign: "center", marginTop: 4, fontSize: 10, fontWeight: 700, color: enough ? "#27ae60" : "#c0392b" }}>
              {peopleStat}% {enough ? "— ДОСТАТОЧЕН ДЛЯ ЧЕСТНЫХ ВЫБОРОВ" : "— НЕДОСТАТОЧЕН ДЛЯ ЧЕСТНЫХ ВЫБОРОВ"}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              disabled={!enough}
              onClick={() => onChoose("honest")}
              className={enough ? "btn-gold" : "btn-outline"}
              style={{
                opacity: enough ? 1 : 0.5,
                cursor: enough ? "pointer" : "not-allowed",
                flexDirection: "column", padding: "8px 12px"
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>🗳️ ЧЕСТНАЯ КАМПАНИЯ</div>
              <div style={{ fontSize: 10, marginTop: 1, textTransform: "none", fontWeight: 400 }}>Народ ↑ · Запад ↑ (Рейтинг от 40%)</div>
            </button>

            <button onClick={() => onChoose("admin")} className="btn-velvet" style={{ flexDirection: "column", padding: "8px 12px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#f5c6c6" }}>👮 АДМИНИСТРАТИВНЫЙ РЕСУРС</div>
              <div style={{ fontSize: 10, marginTop: 1, textTransform: "none", fontWeight: 400, color: "#f5e6c8aa" }}>Народ ↓↓ · Запад ↓↓ · Силовики ↑ · Олигархи ↑</div>
            </button>

            <button onClick={() => onChoose("sponsor")} className="btn-velvet" style={{ flexDirection: "column", padding: "8px 12px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#fbe380" }}>💎 СДЕЛКА С ОЛИГАРХАМИ</div>
              <div style={{ fontSize: 10, marginTop: 1, textTransform: "none", fontWeight: 400, color: "#f5e6c8aa" }}>Олигархи ↑↑ · Народ ↓ · Запад ↓</div>
            </button>

            <button onClick={() => onChoose("giveup")} className="btn-outline" style={{ marginTop: 4 }}>
              ☠️ СДАТЬСЯ И УЙТИ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
