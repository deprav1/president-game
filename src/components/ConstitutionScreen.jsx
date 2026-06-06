import { getAsset } from "../lib/assets.js";

const FELT_BG = "radial-gradient(circle at 50% 22%,#17120a 0%,#0d0904 48%,#050403 100%)";

// Экран конституционного предела после двух сроков.
export default function ConstitutionScreen({ onChoose }) {
  return (
    <div className="screen-scroll-container" style={{ background: FELT_BG }}>
      <div className="card-paper-container">
        <div className="card-header-bar gold">
          <div className="font-typewriter" style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, color: "#f5e6c8" }}>
            КОНСТИТУЦИОННЫЙ ПРЕДЕЛ
          </div>
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

          <p style={{ fontSize: 15, lineHeight: 1.6, color: "#e0d8c8", fontWeight: 500, textAlign: "center", marginBottom: 14 }}>
            Согласно Конституции Варонии, после двух сроков вы больше не можете занимать пост президента.
            Элиты ждут сигнала, народ спорит о будущем, силовики молчат слишком громко.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={() => onChoose("leave")} className="btn-gold" style={{ flexDirection: "column", padding: "10px 12px" }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.3 }}>УЙТИ ПО КОНСТИТУЦИИ</div>
              <div style={{ fontSize: 10, marginTop: 2, textTransform: "none", fontWeight: 400 }}>Передать власть и смотреть, как страна учится жить без вас</div>
            </button>

            <button onClick={() => onChoose("stay")} className="btn-velvet" style={{ flexDirection: "column", padding: "10px 12px" }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.3, color: "#f5c6c6" }}>ОСТАТЬСЯ У ВЛАСТИ</div>
              <div style={{ fontSize: 10, marginTop: 2, textTransform: "none", fontWeight: 400, color: "#f5e6c8aa" }}>Сделать вид, что основной закон просто устал</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
