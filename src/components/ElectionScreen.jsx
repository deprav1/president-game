import { ELECTION_CARD } from "../data/cards.js";
import { getAsset } from "../lib/assets.js";

const FELT_BG = "radial-gradient(circle at 50% 22%, #2a1208 0%, #160a04 48%, #080402 100%)";

// Экран выборов: рейтинг народа определяет доступные стратегии кампании.
export default function ElectionScreen({ peopleStat, showValues = true, onChoose }) {
  const enough = peopleStat >= 40;
  return (
    <div className="screen-scroll-container decision-screen" style={{ background: FELT_BG }}>
      <div className="card-paper-container decision-panel">
        <div className="card-header-bar gold decision-header">
          <img className="decision-advisor-avatar" src={getAsset("/images/Vlasova_Press.webp")} alt="" onError={e => e.currentTarget.style.display = 'none'} />
          <div>
            <h1 className="decision-advisor-name">Елена Власова</h1>
            <div className="decision-advisor-role">Пресс-секретарь</div>
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

          <p className="decision-intro">
            {ELECTION_CARD.text}
          </p>

          <div className="election-rating">
            <div className="election-rating-label">
              РЕЙТИНГ У НАРОДА
            </div>
            <div className="election-rating-track">
              <div className={`election-rating-fill ${enough ? "enough" : "low"}`} style={{ width: `${Math.max(0, Math.min(100, peopleStat))}%` }} />
            </div>
            <div className={`election-rating-value ${enough ? "enough" : "low"}`}>
              {showValues ? `${peopleStat}% · ` : ""}{enough ? "честная кампания доступна" : "честная кампания закрыта"}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              disabled={!enough}
              onClick={() => onChoose("honest")}
              className={`${enough ? "btn-gold" : "btn-outline"} decision-choice`}
              aria-label="Честная кампания: народ и Запад получают поддержку"
            >
              <div className="decision-choice-title">ЧЕСТНАЯ КАМПАНИЯ</div>
              <div className="decision-choice-effect">Народ ↑ · Запад ↑ · {showValues ? "от 40% рейтинга" : "нужна поддержка народа"}</div>
            </button>

            <button onClick={() => onChoose("admin")} className="btn-velvet decision-choice">
              <div className="decision-choice-title">АДМИНИСТРАТИВНЫЙ РЕСУРС</div>
              <div className="decision-choice-effect">Народ ↓↓ · Запад ↓↓ · силовики ↑ · олигархи ↑</div>
            </button>

            <button onClick={() => onChoose("sponsor")} className="btn-velvet decision-choice">
              <div className="decision-choice-title">СДЕЛКА С ОЛИГАРХАМИ</div>
              <div className="decision-choice-effect">Олигархи ↑↑ · народ ↓ · Запад ↓</div>
            </button>

            <button onClick={() => onChoose("giveup")} className="btn-outline decision-choice give-up-choice">
              СДАТЬСЯ И УЙТИ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
