import { useMemo } from "react";
import { getAsset } from "../lib/assets.js";
import { defeatVerdict } from "../data/verdicts.js";
import LeaderboardList from "./LeaderboardList.jsx";
import PromoCard from "./PromoCard.jsx";
import { formatMonths } from "../lib/text.js";

// Экран поражения: причина, вердикт, VPN-ревайв, скидка, достижения, шеринг/рестарт.
export default function GameOverScreen({
  tenure, tenureLabel, deathMsg, killerKey,
  promoCode, canRevive, onShare, onRestart, onVpnRevive,
  onCopyPromo, onOpenNaruzhu, leaderboard, resultEntry,
  globalLeaderboard = [], globalResult = null,
}) {
  const verdict = useMemo(() => defeatVerdict(killerKey), [killerKey]);
  const recordLabel = resultEntry?.isRecord
    ? "НОВЫЙ РЕКОРД"
    : resultEntry?.rank
      ? `МЕСТО #${resultEntry.rank}`
      : "ИТОГ ПРАВЛЕНИЯ";
  const resultTenure = resultEntry?.score ?? tenure;

  return (
    <div className="screen-scroll-container">
      <div className="flow-defeat" style={{ paddingBottom: 16 }}>
        <div className="flow-final-hero ruins">
          <img
            className="frame-inner-img"
            src={getAsset('/images/palace_ruined.webp')}
            alt="Разрушенный дворец"
            onError={e => e.currentTarget.style.display = 'none'}
          />
          <div className="flow-final-hero-text">
            <div className="flow-defeat-title">КОНЕЦ ПРАВЛЕНИЯ</div>
            <div className="flow-final-tenure">
              {formatMonths(tenure, { short: true, uppercase: true })} У ВЛАСТИ · {tenureLabel}
            </div>
            <div className="flow-final-caption">«{verdict}»</div>
          </div>
        </div>

        <div className="card-content-area">
          <div className={`result-record-callout ${resultEntry?.isRecord ? "record" : ""}`}>
            <div>
              <div className="result-record-kicker">{recordLabel}</div>
              <div className="result-record-title">{formatMonths(resultTenure)} у власти</div>
            </div>
            {resultEntry?.rank && (
              <div className="result-record-rank">#{resultEntry.rank}</div>
            )}
          </div>

          <div className="outcome-reason">
            <p>
              «{deathMsg}»
            </p>
          </div>

          {/* VPN-ревайв: оффер виден один раз за игру */}
          {canRevive && (
            <section className="revive-offer">
              <div className="revive-offer-kicker">
                ЕЩЁ ОДИН ШАНС
              </div>
              <p>
                Правление окончено, но одно решение ещё можно пересмотреть. Откройте VPN «Наружу» и вернитесь на два хода назад.
              </p>
              <button
                onClick={onVpnRevive}
                className="revive-offer-button"
              >
                ОТКРЫТЬ «НАРУЖУ» И ВЕРНУТЬСЯ
              </button>
            </section>
          )}

          <LeaderboardList
            entries={leaderboard}
            highlightId={resultEntry?.id}
            title="ЛИЧНАЯ ДОСКА ПОЧЕТА"
            limit={5}
            compact
          />

          {globalLeaderboard.length > 0 && (
            <LeaderboardList
              entries={globalLeaderboard}
              highlightId={globalResult?.entryId}
              title="ГЛОБАЛЬНАЯ ДОСКА ПОЧЕТА"
              countLabel="ТОП"
              emptyLabel="Пока никто не вошёл в историю"
              limit={5}
              compact
            />
          )}

          <PromoCard
            months={resultTenure}
            promoCode={promoCode}
            onCopy={onCopyPromo}
            onOpen={onOpenNaruzhu}
          />
        </div>

        <div className="outcome-actions">
          <button onClick={onRestart} className="btn-velvet">
            НОВЫЙ СРОК
          </button>
          <button onClick={onShare} className="btn-secondary">
            ПОДЕЛИТЬСЯ РЕЗУЛЬТАТОМ
          </button>
        </div>
      </div>
    </div>
  );
}
