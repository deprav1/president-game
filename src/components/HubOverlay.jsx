import { useEffect, useRef, useState } from "react";
import { ACHIEVEMENTS_DEF } from "../data/achievements.js";
import { ENDINGS } from "../data/endings.js";
import { discountFor } from "../lib/promo.js";
import { copyText } from "../lib/clipboard.js";
import { trackOutbound, appendUtm, hashStr } from "../lib/analytics.js";
import LeaderboardList from "./LeaderboardList.jsx";
import PromoCard from "./PromoCard.jsx";
import { formatCount, formatMonths } from "../lib/text.js";

const NARUZHU_YELLOW = "#FFD60A";
const SHARE_BOT_URL = "https://t.me/varonia_bot";
const SHARE_SIGNATURE = "Варония — президентский симулятор, где возможно всё.";

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
  onClose, bestScore, leaderboard, globalLeaderboard = [], achievements, unlockedEndings, referralCount, onOpenNaruzhu, onReferralShared, haptic,
  safeMode = false, isAdmin = false, onOpenAdmin,
}) {
  const promoCode = discountFor(bestScore);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const dialogRef = useRef(null);
  const endingsCount = Object.keys(ENDINGS).length;
  const dossierStatus = `${formatCount(achievements.length, "достижение", "достижения", "достижений")} · ${unlockedEndings.length}/${endingsCount} финалов`;

  useEffect(() => {
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    const focusableSelector = "button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex='-1'])";
    dialog?.querySelector(focusableSelector)?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = [...dialog.querySelectorAll(focusableSelector)];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus?.();
    };
  }, [onClose]);

  const toggleDossier = () => {
    setIsDossierOpen(open => !open);
    haptic("light");
  };

  const shareReferral = () => {
    const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || "guest";
    // startapp ведёт прямо в мини-апп; ref_<хэш> атрибутирует приглашённого к пригласившему.
    const refLink = appendUtm(SHARE_BOT_URL, { startapp: `ref_${hashStr(userId)}` });
    const msg = `${SHARE_SIGNATURE}\n\n${refLink}`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(msg)}`;
    trackOutbound(shareUrl, { kind: "share_referral", source: "hub" });
    onReferralShared();
    haptic("light");
  };

  return (
    <div className="hub-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="hub-card"
        role="dialog"
        aria-modal="true"
        aria-label="Досье президента"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="hub-close" aria-label="Закрыть">×</button>

        <div className="hub-card-body">

          <button
            type="button"
            className={`hub-dossier-toggle ${isDossierOpen ? "open" : ""}`}
            onClick={toggleDossier}
            aria-expanded={isDossierOpen}
          >
            <div className="hub-dossier-record">
              <div>
                <div className="font-typewriter" style={{ fontSize: 10, color: "#b89a5e", letterSpacing: 1 }}>ВАШ РЕКОРД</div>
                <div className="font-typewriter" style={{ fontSize: 20, fontWeight: 700, color: "#d4af37", marginTop: 2 }}>{formatMonths(bestScore, { short: true, uppercase: true })}</div>
              </div>
              <div className="hub-dossier-status">
                <span>{dossierStatus}</span>
                <span className="hub-dossier-chevron">{isDossierOpen ? "−" : "+"}</span>
              </div>
            </div>
          </button>

          {isDossierOpen && (
            <div className="hub-dossier-details">
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
                {unlockedEndings.length} из {endingsCount} финалов открыто
              </div>
            </div>
            </div>
          )}

          <LeaderboardList entries={leaderboard} limit={5} compact />

          {globalLeaderboard.length > 0 && (
            <LeaderboardList
              entries={globalLeaderboard}
              title="ГЛОБАЛЬНАЯ ДОСКА ПОЧЕТА"
              countLabel="ТОП"
              emptyLabel="Пока никто не вошёл в историю"
              limit={5}
              compact
            />
          )}

          {!safeMode && (
          <>
          <div className="hub-naruzhu-pitch">
            <div className="hub-naruzhu-title">
              VPN «НАРУЖУ» · ВНЕШНИЙ КАНАЛ
            </div>
            {NARUZHU_FEATURES.map((feat, i) => (
              <div key={i} className="hub-feature-row">
                <span style={{ color: NARUZHU_YELLOW, fontWeight: 700 }}>▶</span>
                <span className="font-typewriter" style={{ fontSize: 12, color: "#c4a882", lineHeight: 1.45 }}>{feat}</span>
              </div>
            ))}
          </div>

          <PromoCard
            months={bestScore}
            promoCode={promoCode}
            onCopy={async () => {
              const copied = await copyText(promoCode.code);
              haptic(copied ? "light" : "medium");
              return copied;
            }}
            onOpen={onOpenNaruzhu}
          />
          </>
          )}

          {referralCount > 0 && (
            <div className="font-typewriter" style={{ fontSize: 11, color: "#b89a5e", textAlign: "center", letterSpacing: 0.5 }}>
              Окно приглашения открыто {referralCount} {shareCountLabel(referralCount)}
            </div>
          )}

          {!safeMode && (
            <button onClick={onOpenNaruzhu} className="btn-hub-cta">
              ОТКРЫТЬ ВНЕШНИЙ КАНАЛ «НАРУЖУ»
            </button>
          )}

          <button onClick={shareReferral} className="btn-hub-secondary">
            ПРИГЛАСИТЬ ДРУГА
          </button>

          {isAdmin && (
            <button
              onClick={() => { onOpenAdmin?.(); haptic("light"); }}
              className="btn-hub-secondary"
              style={{ borderColor: "#3a6ea5", color: "#8ec0ff" }}
            >
              📊 АНАЛИТИКА · @deprav
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
