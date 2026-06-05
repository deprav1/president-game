import FactionIcon from "./FactionIcon.jsx";

// Иконка фракции для крупных контекстов (онбординг, итоги). Векторный глиф —
// прозрачный, чёткий, наследует цвет через currentColor (style.color).
export default function StatIcon({ param, className = "", style }) {
  return <FactionIcon type={param?.key} className={className} style={style} />;
}
