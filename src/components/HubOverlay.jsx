import { ACHIEVEMENTS_DEF } from "../data/achievements.js";
import { ENDINGS } from "../data/endings.js";
import { discountFor } from "../lib/promo.js";

const NARUZHU_YELLOW = "#FFD60A";

const NARUZHU_FEATURES = [
  "YouTube, Instagram, Wikipedia без блокировок",
  "Без логов — ваш трафик никто не видит",
  "60+ стран, до 5 устройств одновременно",
  "Работает даже при замедлении Чебунета",
];

const shareCountLabel = (count) => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "раз";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "раза";
  return "раз";
};

// Модал «Покинуть Варонию»: рекорд, достижения, хроника финалов, оффер VPN Наружу.
export default function HubOverlay({
  onClose, bestScore, achievements, unlockedEndings, referralCount, onOpenNaruzhu, onReferralShared, haptic,
}) {
  const promoCode = discountFor(bestScore);

  const shareReferral = () => {
    const tg = window.Telegram?.WebApp;
    const userId = tg?.initDataUnsafe?.user?.id || "guest";
    const refLink = `https://t.me/mr_president_gamebot?start=ref_${userId}`;
    const msg = `🦅 Играй за президента Варонии — принимай решения, удержись у власти!\n\n→ ${refLink}`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(msg)}`;
    if (tg) tg.openLink(shareUrl); else window.open(shareUrl, "_blank");
    onReferralShared();
    haptic("light");
  };

  return (
    <div className="hub-overlay" onClick={onClose}>
      <div className="hub-card" onClick={e => e.stopPropagation()}>

        <div className="hub-card-header">
          <div>
            <div className="font-typewriter" style={{ fontSize: 14, fontWeight: 700, color: NARUZHU_YELLOW, letterSpacing: 2 }}>
              ЛИЧНОЕ ДЕЛО
            </div>
            <div className="font-typewriter" style={{ fontSize: 12, color: "#caa23a", letterSpacing: 0.5, marginTop: 2 }}>
              Рекорд, достижения · покинуть Варонию
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#6b4c1e", fontSize: 16, cursor: "pointer", padding: 4 }}>✕</button>
        </div>

        <div className="hub-card-body">

          <div className="hub-dossier-block">
            <div className="hub-dossier-record">
              <div>
                <div className="font-typewriter" style={{ fontSize: 10, color: "#b89a5e", letterSpacing: 1 }}>ВАШ РЕКОРД</div>
                <div className="font-typewriter" style={{ fontSize: 20, fontWeight: 700, color: "#d4af37", marginTop: 2 }}>{bestScore} <span style={{ fontSize: 10 }}>МЕС.</span></div>
              </div>
              <div className="font-typewriter" style={{ fontSize: 10, color: "#6b4c1e", letterSpacing: 1.2 }}>АРХИВ</div>
            </div>

            <div className="hub-dossier-section">
              <div className="font-typewriter" style={{ fontSize: 10, color: "#b89a5e", letterSpacing: 1 }}>ДОСТИЖЕНИЯ</div>
              <div className="hub-grid">
                {ACHIEVEMENTS_DEF.map(a => {
                  const hasAch = achievements.includes(a.id);
                  return (
                    <div key={a.id} title={a.desc} className={`hub-grid-item ${hasAch ? "active" : "inactive"}`}>
                      <span style={{ fontSize: 12 }}>{a.icon}</span>
                      {hasAch && <span className="font-typewriter" style={{ fontSize: 10, color: "#d4af37", letterSpacing: 0.5 }}>{a.label}</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="hub-dossier-section">
              <div className="font-typewriter" style={{ fontSize: 10, color: "#b89a5e", letterSpacing: 1 }}>ХРОНИКА ПРАВЛЕНИЙ</div>
              <div className="hub-grid">
                {Object.values(ENDINGS).map(e => {
                  const unlocked = unlockedEndings.includes(e.id);
                  return (
                    <div key={e.id} title={unlocked ? `${e.title} — ${e.subtitle}` : "Не открыто"} className={`hub-grid-item ${unlocked ? "active" : "inactive"}`}>
                      <span style={{ fontSize: 12 }}>{e.icon}</span>
                      {unlocked && <span className="font-typewriter" style={{ fontSize: 10, color: "#d4af37", letterSpacing: 0.5 }}>{e.title}</span>}
                    </div>
                  );
                })}
              </div>
              <div className="font-typewriter" style={{ fontSize: 10, color: "#b89a5e", marginTop: 6, letterSpacing: 0.5 }}>
                {unlockedEndings.length} из {Object.keys(ENDINGS).length} финалов открыто
              </div>
            </div>
          </div>

          <div className="hub-naruzhu-pitch">
            <div className="font-typewriter" style={{ fontSize: 12, color: NARUZHU_YELLOW, letterSpacing: 1.5, marginBottom: 8, fontWeight: 700 }}>
              VPN НАРУЖУ — ВЫХОД ИЗ ВАРОНИИ
            </div>
            {NARUZHU_FEATURES.map((feat, i) => (
              <div key={i} className="hub-feature-row">
                <span style={{ color: NARUZHU_YELLOW, fontWeight: 700 }}>▶</span>
                <span className="font-typewriter" style={{ fontSize: 12, color: "#c4a882", lineHeight: 1.45 }}>{feat}</span>
              </div>
            ))}
          </div>

          <div className="hub-promo-box">
            <div className="font-typewriter" style={{ fontSize: 10, color: "#caa23a", letterSpacing: 1, marginBottom: 4 }}>
              Вы продержались {bestScore} мес.
            </div>
            <div className="font-typewriter" style={{ fontSize: 12, color: "#d4af37", letterSpacing: 1.2, fontWeight: 700 }}>
              Получите скидку {promoCode.percent}%
            </div>
            <div className="font-typewriter" style={{ fontSize: 10, color: "#b89a5e", marginTop: 4 }}>
              Попробуйте 7 дней бесплатно
            </div>
            <div
              className="hub-promo-code"
              onClick={() => { navigator.clipboard?.writeText(promoCode.code); haptic("light"); }}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigator.clipboard?.writeText(promoCode.code); haptic("light"); } }}
              role="button"
              tabIndex={0}
            >
              {promoCode.code}
            </div>
            <div className="font-typewriter" style={{ fontSize: 10, color: "#b89a5e" }}>
              Нажмите для копирования · <span style={{ color: NARUZHU_YELLOW }}>naruzhu.am</span>
            </div>
          </div>

          {referralCount > 0 && (
            <div className="font-typewriter" style={{ fontSize: 11, color: "#b89a5e", textAlign: "center", letterSpacing: 0.5 }}>
              Вы поделились приглашением {referralCount} {shareCountLabel(referralCount)}
            </div>
          )}

          <button onClick={onOpenNaruzhu} className="btn-hub-cta">
            ПОКИНУТЬ ВАРОНИЮ С НАРУЖУ
          </button>

          <button onClick={shareReferral} className="btn-hub-secondary">
            ПРИГЛАСИТЬ ДРУГА
          </button>
        </div>
      </div>
    </div>
  );
}
