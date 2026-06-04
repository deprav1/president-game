import { ACHIEVEMENTS_DEF } from "../data/achievements.js";

// Ряд полученных достижений (для экранов финала/победы).
export default function AchievementsList({ achievements, title = "ДОСТИЖЕНИЯ" }) {
  if (!achievements?.length) return null;
  const earned = ACHIEVEMENTS_DEF.filter(a => achievements.includes(a.id));
  if (!earned.length) return null;

  return (
    <div style={{ marginBottom: 12 }}>
      <div className="font-typewriter" style={{ fontSize: 10, color: "#caa23a", letterSpacing: 1.5, marginBottom: 6, textAlign: "center" }}>{title}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
        {earned.map(a => (
          <div key={a.id} title={a.desc} style={{
            background: "#1a0f00", border: "1px solid #d4af3740", borderRadius: 6,
            padding: "4px 8px", display: "flex", alignItems: "center", gap: 5,
          }}>
            <span style={{ fontSize: 11 }}>{a.icon}</span>
            <span className="font-typewriter" style={{ fontSize: 10, color: "#d4af37", letterSpacing: 0.5 }}>{a.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
