import { difficultyLabel, formatLeaderboardDate, outcomeLabel } from "../lib/leaderboard.js";
import { formatMonths } from "../lib/text.js";

export default function LeaderboardList({
  entries = [],
  highlightId = "",
  title = "ЛИЧНАЯ ДОСКА ПОЧЕТА",
  countLabel = "МОЙ ТОП",
  emptyLabel = "Первое правление ещё не внесено",
  limit = 10,
  compact = false,
}) {
  const highlightedIndex = highlightId
    ? entries.findIndex(entry => entry.id === highlightId)
    : -1;
  const topEntries = entries.slice(0, limit);
  const visible = highlightedIndex >= limit && limit > 1
    ? [...topEntries.slice(0, limit - 1), entries[highlightedIndex]]
    : topEntries;

  return (
    <section className={`leaderboard-panel ${compact ? "compact" : ""}`}>
      <div className="leaderboard-heading">
        <span>{title}</span>
        {visible.length > 0 && <span className="leaderboard-count">{countLabel} {visible.length}</span>}
      </div>

      {visible.length === 0 ? (
        <div className="leaderboard-empty">{emptyLabel}</div>
      ) : (
        <ol className="leaderboard-list">
          {visible.map((entry, index) => (
            <LeaderboardRow
              key={entry.id}
              entry={entry}
              rank={entries.findIndex(item => item.id === entry.id) + 1 || index + 1}
              isHighlighted={entry.id === highlightId}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

function LeaderboardRow({ entry, rank, isHighlighted }) {
  const meta = [
    difficultyLabel(entry.difficulty),
    outcomeLabel(entry),
    formatLeaderboardDate(entry.finishedAt),
  ].filter(Boolean).join(" · ");

  return (
    <li className={`leaderboard-row ${isHighlighted ? "highlight" : ""}`}>
      <div className="leaderboard-rank">#{rank}</div>
      <div className="leaderboard-main">
        <div className="leaderboard-name">{entry.name}</div>
        <div className="leaderboard-meta">{meta}</div>
      </div>
      <div className="leaderboard-score">
        {formatMonths(entry.score, { short: true })}
      </div>
    </li>
  );
}
