import { useEffect, useMemo, useState } from "react";
import { subscribeAnalytics, getAnalyticsSnapshot, track, EVENTS } from "../lib/analytics.js";

const YM_ID = import.meta.env.VITE_YM_ID || "";
// Дашборд admin-server: явный VITE_ANALYTICS_DASHBOARD или вывод из коллектора.
const DASHBOARD_URL =
  import.meta.env.VITE_ANALYTICS_DASHBOARD ||
  (import.meta.env.VITE_ANALYTICS_ENDPOINT
    ? import.meta.env.VITE_ANALYTICS_ENDPOINT.replace(/\/api\/collect\/?$/, "/api/dashboard")
    : "");

const C = {
  gold: "#d4af37",
  dim: "#b89a5e",
  ink: "#c4a882",
  blue: "#8ec0ff",
  red: "#e08a8a",
  green: "#7fce8c",
};

// Поля атрибуции, которые показываем в панели (порядок важен для читаемости).
const ATTR_FIELDS = [
  ["utm_source", "source"],
  ["utm_medium", "medium"],
  ["utm_campaign", "campaign"],
  ["utm_content", "content"],
  ["utm_term", "term"],
  ["ref", "ref"],
  ["click_id", "click_id"],
  ["start_param", "start_param"],
  ["referrer", "referrer"],
  ["landing", "landing"],
];

const fmtTime = (ts) => {
  try { return new Date(ts).toLocaleTimeString("ru-RU", { hour12: false }); } catch { return ""; }
};

function Row({ label, value, color }) {
  const empty = value == null || value === "";
  return (
    <div style={{ display: "flex", gap: 8, fontSize: 11, lineHeight: 1.6, fontFamily: "inherit" }}>
      <span style={{ color: C.dim, minWidth: 96, flexShrink: 0 }}>{label}</span>
      <span style={{ color: empty ? "#6b5d3e" : (color || C.ink), wordBreak: "break-all" }}>
        {empty ? "—" : String(value)}
      </span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="font-typewriter" style={{ fontSize: 10, color: C.dim, letterSpacing: 1.2, marginBottom: 6, textTransform: "uppercase" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export default function AdminAnalyticsPanel({ onClose, safeMode = false, onToggleSafeMode }) {
  const [snap, setSnap] = useState(() => getAnalyticsSnapshot());
  const [server, setServer] = useState({ state: DASHBOARD_URL ? "loading" : "off" });

  useEffect(() => {
    track(EVENTS.ADMIN_PANEL_OPEN);
    const unsub = subscribeAnalytics(() => setSnap(getAnalyticsSnapshot()));
    return unsub;
  }, []);

  // Сводка с admin-server (если настроен и доступен). Не блокирует панель.
  useEffect(() => {
    if (!DASHBOARD_URL) return;
    // Токен админа для чтения серверной сводки: разово задаётся через ?atoken=…
    // и хранится локально — секрет НЕ попадает в публичный бандл.
    let token = "";
    try {
      const fromUrl = new URLSearchParams(location.search).get("atoken");
      if (fromUrl) localStorage.setItem("varon_admin_token", fromUrl);
      token = localStorage.getItem("varon_admin_token") || "";
    } catch { /* приватный режим — просто без токена */ }
    let alive = true;
    fetch(DASHBOARD_URL, {
      headers: { Accept: "application/json", ...(token ? { "X-Admin-Token": token } : {}) },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => { if (alive) setServer({ state: "ok", data }); })
      .catch((e) => { if (alive) setServer({ state: "error", error: String(e.message || e) }); });
    return () => { alive = false; };
  }, []);

  const ctx = snap.context || {};

  // Разбивка внешних переходов по хостам из живого буфера.
  const outbound = useMemo(() => {
    const byHost = {};
    let total = 0;
    for (const ev of snap.recent) {
      if (ev.name !== EVENTS.OUTBOUND_CLICK) continue;
      total += 1;
      const host = ev.props?.host || "—";
      byHost[host] = (byHost[host] || 0) + 1;
    }
    return { total, byHost: Object.entries(byHost).sort((a, b) => b[1] - a[1]) };
  }, [snap.recent]);

  const counts = useMemo(
    () => Object.entries(snap.counts || {}).sort((a, b) => b[1] - a[1]),
    [snap.counts]
  );

  const ftAttributed = ctx.utm_source || ctx.ref || ctx.start_param;

  return (
    <div className="hub-overlay" onClick={onClose}>
      <div
        className="hub-card font-typewriter"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "88vh", overflowY: "auto" }}
      >
        <button onClick={onClose} className="hub-close" aria-label="Закрыть">×</button>

        <div className="hub-card-body" style={{ textAlign: "left" }}>
          <div style={{ fontSize: 14, color: C.blue, letterSpacing: 1, fontWeight: 700, marginBottom: 2 }}>
            📊 АНАЛИТИКА
          </div>
          <div style={{ fontSize: 10, color: C.dim, marginBottom: 12 }}>
            доступ: @deprav · счётчик YM {YM_ID || "не задан"}
          </div>

          <Section title="Управление">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: C.ink }}>Режим VPN «Наружу»</div>
                <div style={{ fontSize: 10, color: safeMode ? C.dim : C.green }}>
                  {safeMode ? "ВЫКЛ — реклама VPN скрыта" : "ВКЛ — карты, промо, ревайв активны"}
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleSafeMode}
                aria-pressed={!safeMode}
                style={{
                  flexShrink: 0,
                  cursor: "pointer",
                  width: 56,
                  height: 28,
                  borderRadius: 14,
                  border: "1px solid",
                  borderColor: safeMode ? "#6b5d3e" : C.green,
                  background: safeMode ? "rgba(0,0,0,0.35)" : "rgba(127,206,140,0.25)",
                  position: "relative",
                  transition: "all .15s ease",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    left: safeMode ? 2 : 30,
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: safeMode ? "#9a875a" : C.green,
                    transition: "left .15s ease",
                  }}
                />
              </button>
            </div>
          </Section>

          <Section title="Атрибуция сессии (входящие метки)">
            {ATTR_FIELDS.map(([key, label]) => (
              <Row key={key} label={label} value={ctx[key]} color={ftAttributed && key.startsWith("utm") ? C.green : undefined} />
            ))}
          </Section>

          <Section title="Первое касание (first-touch)">
            <Row label="source" value={ctx.ft_source} color={C.green} />
            <Row label="campaign" value={ctx.ft_campaign} />
            <Row label="когда" value={ctx.ft_ts ? fmtTime(ctx.ft_ts) : null} />
          </Section>

          <Section title="Сессия / устройство">
            <Row label="anon_uid" value={ctx.anon_uid} />
            <Row label="platform" value={ctx.platform} />
            <Row label="telegram" value={ctx.is_telegram ? "да" : "нет"} />
            <Row label="версия" value={ctx.app_version} />
          </Section>

          <Section title={`Внешние переходы · всего ${outbound.total}`}>
            {outbound.byHost.length === 0 && <Row label="—" value="переходов ещё нет" />}
            {outbound.byHost.map(([host, n]) => (
              <Row key={host} label={host} value={n} color={C.blue} />
            ))}
          </Section>

          <Section title="События за сессию">
            {counts.length === 0 && <Row label="—" value="пусто" />}
            {counts.map(([name, n]) => (
              <div key={name} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, lineHeight: 1.7 }}>
                <span style={{ color: C.ink }}>{name}</span>
                <span style={{ color: C.gold, fontWeight: 700 }}>{n}</span>
              </div>
            ))}
          </Section>

          <Section title="Живой лог (последние события)">
            <div style={{ maxHeight: 180, overflowY: "auto", background: "rgba(0,0,0,0.25)", borderRadius: 6, padding: 8 }}>
              {snap.recent.slice(0, 30).map((ev, i) => (
                <div key={i} style={{ fontSize: 10, lineHeight: 1.6, color: C.ink, display: "flex", gap: 6 }}>
                  <span style={{ color: "#6b5d3e", flexShrink: 0 }}>{fmtTime(ev.ts)}</span>
                  <span style={{ color: C.gold, flexShrink: 0 }}>{ev.name}</span>
                  {ev.props?.host && <span style={{ color: C.blue }}>{ev.props.host}</span>}
                  {ev.props?.source && <span style={{ color: C.dim }}>{ev.props.source}</span>}
                  {ev.props?.kind && <span style={{ color: C.dim }}>{ev.props.kind}</span>}
                </div>
              ))}
            </div>
          </Section>

          {DASHBOARD_URL && (
            <Section title="Сводка с сервера (admin-server)">
              {server.state === "loading" && <Row label="статус" value="загрузка…" />}
              {server.state === "error" && <Row label="ошибка" value={server.error} color={C.red} />}
              {server.state === "ok" && (
                <>
                  <Row label="visits" value={server.data?.totals?.events} color={C.green} />
                  <Row label="card views" value={server.data?.totals?.views} />
                  <Row label="likes" value={server.data?.totals?.likes} color={C.green} />
                  <Row label="dislikes" value={server.data?.totals?.dislikes} color={C.red} />
                  <Row label="decisions" value={server.data?.totals?.decisions} />
                </>
              )}
            </Section>
          )}

          <Section title="Ссылки">
            {YM_ID && (
              <a
                href={`https://metrika.yandex.ru/dashboard?id=${YM_ID}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: C.blue, fontSize: 11, display: "block", marginBottom: 4 }}
              >
                → Yandex Metrica (дашборд)
              </a>
            )}
            {YM_ID && (
              <a
                href={`https://metrika.yandex.ru/webvisor/${YM_ID}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: C.blue, fontSize: 11, display: "block" }}
              >
                → Вебвизор (записи сессий)
              </a>
            )}
            {!YM_ID && <Row label="—" value="VITE_YM_ID не задан" />}
          </Section>

          <button onClick={onClose} className="btn-hub-secondary" style={{ marginTop: 4 }}>
            ЗАКРЫТЬ
          </button>
        </div>
      </div>
    </div>
  );
}
