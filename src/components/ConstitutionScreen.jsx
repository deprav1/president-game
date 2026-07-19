import { getAsset } from "../lib/assets.js";

const FELT_BG = "radial-gradient(circle at 50% 22%, #17120a 0%, #0d0904 48%, #050403 100%)";

// Экран конституционного предела после двух сроков.
export default function ConstitutionScreen({ onChoose }) {
  return (
    <div className="screen-scroll-container decision-screen" style={{ background: FELT_BG }}>
      <div className="card-paper-container decision-panel">
        <div className="card-header-bar gold decision-header decision-header-centered">
          <h1 className="decision-header-title">
            КОНСТИТУЦИОННЫЙ ПРЕДЕЛ
          </h1>
        </div>

        <div className="card-content-area padded-bottom">
          <div className="story-image-frame election">
            <img
              className="frame-inner-img"
              src={getAsset("/images/election_booth.webp")}
              alt="Конституционный переход власти"
              onError={e => e.currentTarget.style.display = "none"}
            />
          </div>

          <p className="decision-intro">
            Согласно Конституции Варонии, после двух сроков вы больше не можете занимать пост президента. Элиты ждут сигнала, народ спорит о будущем, силовики молчат слишком громко. Остаться можно — но каждый следующий ход будет усиливать давление системы.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={() => onChoose("leave")} className="btn-gold decision-choice">
              <div className="decision-choice-title">УЙТИ ПО КОНСТИТУЦИИ</div>
              <div className="decision-choice-effect">Передать власть и проверить, умеет ли страна жить без вас</div>
            </button>

            <button onClick={() => onChoose("stay")} className="btn-velvet decision-choice">
              <div className="decision-choice-title">ОСТАТЬСЯ У ВЛАСТИ</div>
              <div className="decision-choice-effect">Сделать вид, что основной закон просто устал; открыть эндшпиль</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
