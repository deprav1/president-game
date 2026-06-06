import { ADVISORS } from "../data/advisors.js";
import { getAsset } from "../lib/assets.js";

const RESCUE_BACKGROUNDS = {
  1: "/images/bg_military_parade.webp",
  3: "/images/bg_security_bunker.webp",
  4: "/images/bg_finance_ministry.webp",
  6: "/images/bg_palace_corruption.webp",
  7: "/images/bg_oligarch_yacht.webp",
};

const cleanRescueText = (text = "") =>
  text
    .replace(/^🚨\s*/u, "")
    .replace(/^ВТОРОЙ ШАНС\s*\([^)]*\):\s*/iu, "")
    .trim();

const cleanChoiceText = (text = "") =>
  text
    .replaceAll("🤝", "")
    .replaceAll("☠️", "")
    .replaceAll("🚨", "")
    .replaceAll("⚠️", "")
    .trim();

// Экран аварийного решения — та же игровая эстетика, но с кризисным напряжением.
export default function SecondChanceScreen({ rescueCard, onChoose }) {
  const advisor = ADVISORS[rescueCard.advisor];
  const bgImage = RESCUE_BACKGROUNDS[rescueCard.advisor] || "/images/bg_palace_corruption.webp";

  return (
    <div className="screen-scroll-container">
      <div className="flow-rescue game-card crisis">
        <div className="flow-rescue-heading">
          <div className="flow-rescue-kicker">КРИЗИС ВЛАСТИ</div>
          <div className="flow-rescue-subtitle">чрезвычайное решение</div>
        </div>

        <div className="game-card-hero crisis">
          <img
            className="game-card-hero-img"
            src={getAsset(advisor?.avatar || "/images/Zubov_Finance_Wide.webp")}
            alt=""
            onError={e => e.currentTarget.style.display = "none"}
          />
          <div className="game-card-hero-meta">
            <div className="game-card-hero-name">{advisor?.name || "Советник"}</div>
            <div className="game-card-hero-role">{advisor?.role || "Куратор"}</div>
          </div>
        </div>

        <div className="flow-rescue-body">
          <div className="game-card-ambiance" />
          <div
            className="flow-rescue-bg"
            style={{ backgroundImage: `url(${getAsset(bgImage)})` }}
          />

          <p className="flow-rescue-text">{cleanRescueText(rescueCard.text)}</p>

          <div className="flow-rescue-actions">
            <button onClick={() => onChoose("agree")} className="btn-gold flow-rescue-primary">
              {cleanChoiceText(rescueCard.agreeText).toUpperCase()}
            </button>
            <button onClick={() => onChoose("deny")} className="btn-outline flow-rescue-secondary">
              ОТКЛОНИТЬ И СЛОЖИТЬ ПОЛНОМОЧИЯ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
