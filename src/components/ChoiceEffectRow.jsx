import { PARAMS } from "../data/params.js";
import { scaleStatEffect } from "../lib/gameHelpers.js";
import FactionIcon from "./FactionIcon.jsx";

// Ряд чипов «+/−» по затронутым фракциям для предпросмотра эффекта выбора.
export default function ChoiceEffectRow({ fx }) {
  const entries = PARAMS
    .map(p => ({ param: p, value: scaleStatEffect(p.key, fx[p.key] || 0) }))
    .filter(item => item.value !== 0);

  if (!entries.length) return null;

  return (
    <div className="choice-effect-row">
      {entries.map(({ param, value }) => (
        <span key={param.key} className={`choice-effect-chip ${value > 0 ? "positive" : "negative"}`}>
          <FactionIcon type={param.key} className="choice-effect-icon" />
          <span>{value > 0 ? `+${value}` : value}</span>
        </span>
      ))}
    </div>
  );
}
