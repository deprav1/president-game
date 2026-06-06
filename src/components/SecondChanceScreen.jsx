import { ADVISORS } from "../data/advisors.js";
import { getAsset } from "../lib/assets.js";

// Экран «второго шанса» — отдельный яркий тревожный флоу (не карта).
export default function SecondChanceScreen({ rescueCard, onChoose }) {
  const advisor = ADVISORS[rescueCard.advisor];
  return (
    <div className="screen-scroll-container">
      <div className="flow-rescue">
        {/* Сирена */}
        <div className="flow-rescue-siren">
          <span className="emoji">🚨</span>
          <div className="flow-rescue-title">ПОСЛЕДНИЙ ШАНС</div>
        </div>

        <div style={{ padding: "0 18px 18px" }}>
          {/* Советник, предлагающий сделку */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <img
              src={getAsset(advisor?.avatar || "/images/Zubov_Finance.webp")}
              style={{ width: 46, height: 46, borderRadius: "50%", objectFit: "cover", border: "2px solid #ff6b5a", flexShrink: 0 }}
              alt=""
              onError={e => e.currentTarget.style.display = 'none'}
            />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#ffd9d2", lineHeight: 1.2 }}>{advisor?.name || "Советник"}</div>
              <div className="font-mono" style={{ fontSize: 12, color: "#ff8a7a" }}>{advisor?.role || "Куратор"}</div>
            </div>
          </div>

          <p style={{ fontSize: 16, lineHeight: 1.6, color: "#ffe4de", textAlign: "left", fontWeight: 500, marginBottom: 16 }}>
            {rescueCard.text}
          </p>

          <div style={{ background: "rgba(192,57,43,0.18)", border: "1px solid rgba(192,57,43,0.5)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "#ffb3a8", fontWeight: 600, lineHeight: 1.5 }}>
              ⚠️ Это твой единственный второй шанс. Следующий перекос шкал — окончательное поражение.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => onChoose("agree")} className="btn-gold" style={{ padding: "15px 10px", fontSize: 13 }}>
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
