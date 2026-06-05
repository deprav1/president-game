import { ADVISORS } from "../data/advisors.js";
import { getAsset } from "../lib/assets.js";

const FELT_BG = "radial-gradient(circle at 50% 22%,#2a1208 0%,#160a04 48%,#080402 100%)";

// Экран «второго шанса»: единственная за игру возможность отыграть провал.
export default function SecondChanceScreen({ rescueCard, onChoose }) {
  const advisor = ADVISORS[rescueCard.advisor];
  return (
    <div className="screen-scroll-container" style={{ background: FELT_BG }}>
      <div className="card-paper-container crisis" style={{ animation: "electionPulse 2s ease infinite" }}>
        <div className="card-header-bar crisis" style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}>
          <img src={getAsset(advisor?.avatar || "/images/Zubov_Finance.webp")} style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", border: "2px solid #d4af37" }} alt="" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f5e6c8", lineHeight: 1.2 }}>{advisor?.name || "Советник"}</div>
            <div className="font-typewriter" style={{ fontSize: 11, color: "#d4af3799" }}>{advisor?.role || "Куратор"}</div>
          </div>
        </div>

        <div className="card-content-area padded-bottom">
          <div className="story-image-frame crisis">
            <img
              className="frame-inner-img"
              src={getAsset('/images/asset_red_phone.webp')}
              alt="Кризисный телефон"
              onError={e => e.currentTarget.style.display = 'none'}
            />
          </div>

          <p style={{ fontSize: 15, lineHeight: 1.55, color: "#f5c6c6", textAlign: "center", fontWeight: 600, marginBottom: 14 }}>
            {rescueCard.text}
          </p>

          <div style={{ background: "rgba(139, 0, 0, 0.25)", border: "1px solid rgba(139, 0, 0, 0.45)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, textAlign: "center" }}>
            <p style={{ fontSize: 12, color: "#f5c6c6", fontWeight: 500, lineHeight: 1.5 }}>
              ⚠️ Внимание: это ваш единственный «Второй шанс» за игру. Любой следующий перекос шкал приведет к окончательному поражению.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={() => onChoose("agree")} className="btn-gold" style={{ padding: "14px 10px" }}>
              🤝 {rescueCard.agreeText.toUpperCase()}
            </button>
            <button onClick={() => onChoose("deny")} className="btn-outline">
              ☠️ ОТКЛОНИТЬ И СЛОЖИТЬ ПОЛНОМОЧИЯ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
