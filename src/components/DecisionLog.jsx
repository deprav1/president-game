// История последних решений игрока (для экранов финала/победы).
export default function DecisionLog({ decisionLog, title = "ИСТОРИЯ РЕШЕНИЙ" }) {
  if (!decisionLog?.length) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div className="font-typewriter" style={{ fontSize: 10, color: "#caa23a", letterSpacing: 1.5, marginBottom: 6, textAlign: "center" }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {decisionLog.slice(-4).map((entry, i) => (
          <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", background: "#0d0800", border: "1px solid #c9a84c33", borderRadius: 6, padding: "4px 8px" }}>
            <span className="font-typewriter" style={{ fontSize: 10, color: "#b89a5e", flexShrink: 0 }}>МЕС {entry.month}</span>
            <span style={{ fontSize: 11, color: "#d4b896", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
