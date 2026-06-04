import { getAsset } from "../lib/assets.js";
import FactionIcon from "./FactionIcon.jsx";

// Единая иконка фракции для КРУПНЫХ контекстов (шкалы, онбординг, итоги):
// растровый люкс-ассет из param.icon, с SVG-фолбэком, если иконки нет.
// В микро-чипах (+/−) по-прежнему используется FactionIcon напрямую.
export default function StatIcon({ param, className = "", style }) {
  if (param?.icon) {
    return <img src={getAsset(param.icon)} alt="" className={className} style={style} />;
  }
  return <FactionIcon type={param?.key} className={className} style={style} />;
}
