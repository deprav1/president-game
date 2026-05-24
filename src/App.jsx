import { useState, useRef, useCallback, useEffect } from "react";
import { PARAMS } from "./data/params.js";
import { ADVISORS } from "./data/advisors.js";
import { CARDS, CRISIS_CARDS, ELECTION_CARD, MONTHS } from "./data/cards.js";
import { CHAINS, getTriggeredChain } from "./data/chains.js";
import { ENDINGS, getVictoryEnding } from "./data/endings.js";
import { VEPEAN_CARDS } from "./data/vepeanCards.js";
import { EXTRA_CARDS } from "./data/extraCards.js";

// ─── СТИЛИ ────────────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Special+Elite&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; overflow: hidden; background: #1a0f00; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
  @keyframes cardIn { from { opacity:0; transform:scale(0.97) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
  @keyframes flashStat { 0%{opacity:1} 40%{opacity:0.1} 100%{opacity:1} }
  @keyframes crisisShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-5px)} 40%{transform:translateX(5px)} 60%{transform:translateX(-3px)} 80%{transform:translateX(3px)} }
  @keyframes electionPulse { 0%,100%{box-shadow:0 0 0 0 rgba(212,175,55,0.4)} 50%{box-shadow:0 0 0 12px rgba(212,175,55,0)} }
`;

const WOOD_BG   = `linear-gradient(105deg,#2c1a06 0%,#3d2509 15%,#2a1804 30%,#3d2509 45%,#4a2e0c 55%,#2c1a06 70%,#3d2509 85%,#2a1804 100%)`;
const FELT_BG   = `linear-gradient(135deg,#8b0000 0%,#6b0000 40%,#7a0000 60%,#8b0000 100%)`;
const CRISIS_BG = `linear-gradient(135deg,#1a0000 0%,#2d0000 50%,#1a0000 100%)`;

// Собираем общую колоду: базовые + дополнительные + Vepean-карты
const ALL_CARDS = [...CARDS, ...EXTRA_CARDS, ...VEPEAN_CARDS];

const shuffle = a => [...a].sort(() => Math.random() - 0.5);

// ─── КОМПОНЕНТ ШКАЛЫ ──────────────────────────────────────────────────────────
function StatPill({ param, value, flash }) {
  const pct        = Math.max(0, Math.min(100, value));
  const isCritical = pct <= 8  || pct >= 92;
  const isDanger   = pct <= 15 || pct >= 85;
  const isWarning  = !isDanger && (pct <= 28 || pct >= 72);

  const barBg = isDanger
    ? `linear-gradient(to right,#c0392b99,#c0392b)`
    : isWarning
    ? `linear-gradient(to right,${param.color}77,#d4872b)`
    : `linear-gradient(to right,${param.color}99,${param.color})`;

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
      <div style={{ fontSize:16 }}>{param.icon}</div>
      <div style={{
        width:"100%", height:6, background:"#1a0f00", borderRadius:3, overflow:"hidden",
        border: isDanger ? "1px solid #c0392b88" : isWarning ? "1px solid #d4872b55" : "1px solid #3d2509",
        boxShadow: isCritical ? "0 0 12px #c0392b99" : isDanger ? `0 0 8px ${param.color}55` : "none",
      }}>
        <div style={{
          height:"100%", width:`${pct}%`, background:barBg, borderRadius:3,
          transition:"width 0.5s cubic-bezier(0.4,0,0.2,1)",
          animation:flash ? "flashStat 0.5s ease" : isCritical ? "pulse 0.7s infinite" : isDanger ? "pulse 1.5s infinite" : "none",
        }}/>
      </div>
      <div style={{ fontSize:8, fontFamily:"'Special Elite',monospace", letterSpacing:0.5,
        color: isDanger ? "#c0392b" : isWarning ? "#d4872b" : "#6b4c1e" }}>
        {param.label.toUpperCase()}{isCritical ? "!" : ""}
      </div>
    </div>
  );
}

// ─── ДОСТИЖЕНИЯ ──────────────────────────────────────────────────────────────
const ACHIEVEMENTS_DEF = [
  { id: "survive_12",  icon: "📅", label: "Первый год",        desc: "Пережить 12 месяцев у власти"          },
  { id: "survive_48",  icon: "🏅", label: "Первый срок",       desc: "Пережить 48 месяцев у власти"          },
  { id: "win_election",icon: "🗳️", label: "Переизбран",        desc: "Победить на президентских выборах"     },
  { id: "victory",     icon: "🏛️", label: "Легенда Варонии",   desc: "Завершить два полных срока правления"  },
  { id: "vepean_open", icon: "🔐", label: "Цифровое окно",     desc: "Завершить арк Цифрового суверенитета открытым финалом" },
];

// ─── ГЛАВНЫЙ КОМПОНЕНТ ────────────────────────────────────────────────────────
export default function ThePresident() {
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      setTimeout(() => tg.expand(), 300);
      setTimeout(() => tg.expand(), 1000);
      try { tg.requestFullscreen?.(); } catch(e) {}
      setTimeout(() => { try { tg.requestFullscreen?.(); } catch(e) {} }, 500);

      // Обработка реферального start_param
      const startParam = tg.initDataUnsafe?.start_param || "";
      if (startParam.startsWith("ref_")) {
        const count = parseInt(localStorage.getItem("varon_refs") || "0", 10) + 1;
        localStorage.setItem("varon_refs", String(count));
        setReferralCount(count);
      }
    }
  }, []);

  // Восстанавливаем сохранённый ран если есть
  const savedRun = (() => {
    try { return JSON.parse(localStorage.getItem("varon_save") || "null"); } catch { return null; }
  })();

  const [stats, setStats]               = useState(savedRun?.stats || { oligarchs:50, army:50, people:50, west:50 });
  const [months, setMonths]             = useState(savedRun?.months || 1);
  const [deck, setDeck]                 = useState(() => savedRun ? savedRun.deck : shuffle(ALL_CARDS));
  const [cardIdx, setCardIdx]           = useState(savedRun?.cardIdx || 0);
  const [pendingEvents, setPendingEvents] = useState(savedRun?.pendingEvents || []);
  const [phase, setPhase]               = useState(savedRun ? "card" : "onboarding");
  const [deathMsg, setDeathMsg]         = useState("");
  const [cardStyle, setCardStyle]       = useState({});
  const [hovered, setHovered]           = useState(null);
  const [flashParams, setFlashParams]   = useState({});
  const [isCrisis, setIsCrisis]         = useState(false);
  const [crisisCard, setCrisisCard]     = useState(null);
  const [termsCompleted, setTermsCompleted] = useState(0);
  const [presidentName, setPresidentName] = useState(() => localStorage.getItem("varon_pname") || "");
  const [nameInput, setNameInput]         = useState("");
  const [achievements, setAchievements]   = useState(() => {
    try { return JSON.parse(localStorage.getItem("varon_ach") || "[]"); } catch { return []; }
  });
  const [showHub, setShowHub]             = useState(false);
  const [bestScore, setBestScore]         = useState(() => parseInt(localStorage.getItem("varon_best") || "0", 10));
  const [referralCount, setReferralCount] = useState(() => parseInt(localStorage.getItem("varon_refs") || "0", 10));
  const [promoCode, setPromoCode]         = useState(null);
  const [decisionLog, setDecisionLog]     = useState([]);
  const [unlockedEndings, setUnlockedEndings] = useState(() => {
    try { return JSON.parse(localStorage.getItem("varon_ends") || "[]"); } catch { return []; }
  });

  const touchStart = useRef(null);
  const choosing   = useRef(false);

  const currentCard = isCrisis && crisisCard ? crisisCard : deck[cardIdx % deck.length];
  const advisor     = currentCard ? (ADVISORS[currentCard.advisor] || ADVISORS[0]) : ADVISORS[0];
  const year        = 2024 + Math.floor((months - 1) / 12);
  const monthName   = MONTHS[(months - 1) % 12];

  useEffect(() => {
    if (deck.length - cardIdx < 20) setDeck(d => [...d, ...shuffle(ALL_CARDS)]);
  }, [cardIdx]);

  const checkDeath = s => {
    for (const p of PARAMS) {
      if (s[p.key] <= 0) {
        const msgs = Array.isArray(p.deathLow) ? p.deathLow : [p.deathLow];
        return msgs[Math.floor(Math.random() * msgs.length)];
      }
      if (s[p.key] >= 100) {
        const msgs = Array.isArray(p.deathHigh) ? p.deathHigh : [p.deathHigh];
        return msgs[Math.floor(Math.random() * msgs.length)];
      }
    }
    return null;
  };

  const applyFx = useCallback((fx, currentStats) => {
    const ns = {}, fl = {};
    PARAMS.forEach(p => {
      const scaled = Math.round((fx[p.key] || 0) * 1.4);
      ns[p.key] = Math.max(0, Math.min(100, currentStats[p.key] + scaled));
      if (scaled !== 0) fl[p.key] = true;
    });
    return { ns, fl };
  }, []);

  const choose = useCallback((side) => {
    if (choosing.current) return;

    if (phase === "election") {
      const passed = stats.people >= 40;
      if (!passed) {
        hapticNotify("error");
        setDeathMsg("Вы проиграли выборы Ирине Стрельцовой. Страна проголосовала за перемены. Вас выпроводили из дворца вежливо, но непреклонно.");
        setPhase("gameover");
        return;
      }
      hapticNotify("success");
      unlockAchievement("win_election");
      const newTerms = termsCompleted + 1;
      setTermsCompleted(newTerms);
      if (newTerms >= 2) {
        hapticNotify("success");
        const score = months - 1;
        if (score > bestScore) { setBestScore(score); localStorage.setItem("varon_best", String(score)); }
        if (score >= 96)      setPromoCode({ code: "WARONIA-30", days: 30 });
        else if (score >= 48) setPromoCode({ code: "WARONIA-14", days: 14 });
        else                  setPromoCode({ code: "WARONIA-7",  days: 7  });
        localStorage.removeItem("varon_save");
        // Сохраняем открытый финал
        const endObj = getVictoryEnding(stats, score);
        setUnlockedEndings(prev => {
          if (prev.includes(endObj.id)) return prev;
          const next = [...prev, endObj.id];
          localStorage.setItem("varon_ends", JSON.stringify(next));
          return next;
        });
        setPhase("victory");
        return;
      }
      setPhase("card");
      setMonths(m => m + 1);
      setIsCrisis(false);
      return;
    }

    if (phase !== "card" || !currentCard) return;
    choosing.current = true;

    const fx = currentCard[side].fx;
    setCardStyle({
      transition: "transform 0.35s cubic-bezier(0.4,0,1,1),opacity 0.35s ease",
      transform:  `translateX(${side === "left" ? "-115%" : "115%"}) rotate(${side === "left" ? "-10deg" : "10deg"})`,
      opacity: 0,
    });

    setTimeout(() => {
      const { ns, fl } = applyFx(fx, stats);
      setFlashParams(fl);
      setTimeout(() => setFlashParams({}), 600);
      setStats(ns);

      const newMonth   = months + 1;
      setMonths(newMonth);

      // Логируем решение (последние 7)
      setDecisionLog(prev => [...prev.slice(-6), {
        month: months,
        label: currentCard[side].label,
      }]);

      // ── Проверка и добавление цепочек (исправленная логика) ──
      const chainId    = getTriggeredChain(currentCard.text, side);
      const newPending = [...pendingEvents];
      if (chainId && CHAINS[chainId]) {
        newPending.push({ ...CHAINS[chainId], triggerMonth: newMonth + CHAINS[chainId].delay });
      }
      // Достижение за финал мягкой ветки арка
      if (chainId === "ds_arc_4_soft_end") unlockAchievement("vepean_open");

      // ── Проверка наступления отложенных событий ──
      const firedIdx = newPending.findIndex(e => e.triggerMonth <= newMonth);
      let chainCard  = null;
      if (firedIdx >= 0) {
        chainCard = newPending[firedIdx].card;
        newPending.splice(firedIdx, 1);
      }
      setPendingEvents(newPending);

      setCardIdx(i => {
        // Авто-сохранение текущего рана
        const nextIdx = i + 1;
        try {
          localStorage.setItem("varon_save", JSON.stringify({
            stats: ns,
            months: newMonth,
            deck,
            cardIdx: nextIdx,
            pendingEvents: newPending,
          }));
        } catch {}
        return nextIdx;
      });
      setCardStyle({});
      setHovered(null);
      setIsCrisis(false);
      setCrisisCard(null);
      choosing.current = false;

      const death = checkDeath(ns);
      if (death) {
        hapticNotify("error");
        setDeathMsg(death);
        const score = newMonth - 1;
        if (score > bestScore) { setBestScore(score); localStorage.setItem("varon_best", String(score)); }
        localStorage.removeItem("varon_save");
        setPhase("gameover");
        return;
      }

      if (chainCard) {
        setDeck(d => [chainCard, ...d.slice(cardIdx + 1)]);
        setCardIdx(0);
        return;
      }

      if (newMonth % 48 === 1 && newMonth > 1) { setPhase("election"); return; }

      if (newMonth % 12 === 1 && newMonth > 1) {
        hapticNotify("warning");
        setIsCrisis(true);
        setCrisisCard(CRISIS_CARDS[Math.floor(Math.random() * CRISIS_CARDS.length)]);
      }
    }, 350);
  }, [phase, currentCard, stats, months, applyFx, termsCompleted, pendingEvents, cardIdx]);

  const onTouchStart = e => { touchStart.current = e.touches[0].clientX; };
  const swipeTriggered = useRef(false);
  const onTouchMove  = e => {
    if (!touchStart.current) return;
    const dx = e.touches[0].clientX - touchStart.current;
    setCardStyle({ transform:`translateX(${dx * 0.45}px) rotate(${dx * 0.04}deg)`, transition:"none" });
    const newDir = dx < -30 ? "left" : dx > 30 ? "right" : null;
    setHovered(newDir);
    // Лёгкий haptic при достижении порога свайпа (один раз)
    if (Math.abs(dx) > 65 && !swipeTriggered.current) {
      swipeTriggered.current = true;
      haptic("light");
    }
    if (Math.abs(dx) <= 65) swipeTriggered.current = false;
  };
  const onTouchEnd = e => {
    const dx = e.changedTouches[0].clientX - (touchStart.current || 0);
    touchStart.current = null;
    swipeTriggered.current = false;
    if (Math.abs(dx) > 65) choose(dx < 0 ? "left" : "right");
    else { setCardStyle({ transition:"transform 0.25s ease", transform:"none" }); setTimeout(() => setCardStyle({}), 250); setHovered(null); }
  };

  const haptic = (type = "light") => {
    try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(type); } catch(e) {}
  };
  const hapticNotify = (type = "success") => {
    try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(type); } catch(e) {}
  };

  const unlockAchievement = useCallback((id) => {
    setAchievements(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      localStorage.setItem("varon_ach", JSON.stringify(next));
      hapticNotify("success");
      return next;
    });
  }, []);

  // Проверяем достижения при каждом изменении месяца и фазы
  useEffect(() => {
    if (months >= 13)  unlockAchievement("survive_12");
    if (months >= 49)  unlockAchievement("survive_48");
  }, [months, unlockAchievement]);

  useEffect(() => {
    if (phase === "victory") unlockAchievement("victory");
  }, [phase, unlockAchievement]);

  const handleNameSubmit = () => {
    const name = nameInput.trim() || "Президент";
    setPresidentName(name);
    localStorage.setItem("varon_pname", name);
    setPhase("card");
    haptic("medium");
  };

  const restart = () => {
    setStats({ oligarchs:50, army:50, people:50, west:50 });
    setMonths(1);
    setDeck(shuffle(ALL_CARDS));
    setCardIdx(0);
    setPhase("onboarding");
    setDeathMsg("");
    setNameInput("");
    setHovered(null);
    setCardStyle({});
    setIsCrisis(false);
    setCrisisCard(null);
    setTermsCompleted(0);
    setPendingEvents([]);
    setDecisionLog([]);
    choosing.current = false;
    localStorage.removeItem("varon_save");
  };

  const openVepean = () => {
    const url = "https://vepean.click/?utm_source=varonia&utm_medium=game&utm_campaign=footer";
    if (window.Telegram?.WebApp) window.Telegram.WebApp.openLink(url);
    else window.open(url, "_blank");
  };

  const tenure      = months - 1;
  const tenureLabel = tenure < 6 ? "КАТАСТРОФА" : tenure < 24 ? "ПРОВАЛ" : tenure < 48 ? "СЛАБО" : tenure < 96 ? "НЕПЛОХО" : tenure < 144 ? "КРЕПКИЙ ЛИДЕР" : "ЛЕГЕНДА";
  const ending      = phase === "victory" ? getVictoryEnding(stats, tenure) : null;
  const cardBg      = isCrisis ? CRISIS_BG : FELT_BG;
  const cardPaperBg = isCrisis
    ? "linear-gradient(160deg,#1a0000 0%,#2a0000 50%,#1a0000 100%)"
    : "linear-gradient(160deg,#fdf6e3 0%,#f5e8c8 50%,#ede0b0 100%)";
  const cardTextColor = isCrisis ? "#f5c6c6" : "#2c1a06";
  const headerBg    = isCrisis
    ? "linear-gradient(to right,#4a0000,#3a0000,#4a0000)"
    : "linear-gradient(to right,#8b0000,#6b0000,#8b0000)";

  // Превью с реальным масштабом (1.4×)
  const previewFxReal = hovered && currentCard
    ? Object.fromEntries(PARAMS.map(p => [p.key, Math.round((currentCard[hovered].fx[p.key] || 0) * 1.4)]))
    : null;

  // ─── SHARE-ТЕКСТЫ ─────────────────────────────────────────────────────────
  const SHARE_DEATH = {
    oligarchs: {
      low:  `Крупный бизнес Варонии обиделся и убрал меня. ${tenure} мес. у власти.`,
      high: `Я думал, что дружу с олигархами. Оказалось — работаю на них. ${tenure} мес.`,
    },
    army: {
      low:  `Генерал Громов попросил освободить кабинет. Я не спорил. ${tenure} мес. у власти.`,
      high: `Армия Варонии поблагодарила меня за службу и взяла власть сама. ${tenure} мес.`,
    },
    people: {
      low:  `Народ Варонии вышел на улицы. Все до одного. ${tenure} мес. у власти.`,
      high: `Я так любил народ, что они меня свергли. ${tenure} мес.`,
    },
    west: {
      low:  `Запад ввёл санкции, экономика рухнула. Всё за один день. ${tenure} мес. у власти.`,
      high: `Меня назвали марионеткой Вашингтона. Националисты не оценили. ${tenure} мес.`,
    },
  };
  const PROMO_LINE = `\n🔐 Промокод WARONIA → 7 дней Vepean VPN бесплатно: vepean.click`;
  const BOT_LINK   = "t.me/mr_president_gamebot/mr_president";

  const shareGameOver = () => {
    const killerParam = PARAMS.find(p => stats[p.key] <= 0 || stats[p.key] >= 100);
    const key    = killerParam?.key || "people";
    const isHigh = stats[key] >= 100;
    const text   = SHARE_DEATH[key]?.[isHigh ? "high" : "low"] || `${tenure} мес. у власти в Варонии.`;
    const msg    = `🦅 ${text}${PROMO_LINE}\n\nСможешь лучше? → ${BOT_LINK}`;
    const url    = `https://t.me/share/url?url=${encodeURIComponent(`t.me/${BOT_LINK.split("t.me/")[1]}`)}&text=${encodeURIComponent(msg)}`;
    if (window.Telegram?.WebApp) window.Telegram.WebApp.openLink(url);
    else window.open(url, "_blank");
  };

  const VICTORY_TEXTS = [
    `Два срока в Варонии. Живой. Это уже достижение. ${tenure} мес. у власти.`,
    `Я пережил олигархов, генералов, оппозицию и западных партнёров. ${tenure} мес.`,
    `Варония процветает. Или нет. Но я всё ещё у власти — ${tenure} месяцев.`,
  ];
  const shareVictory = () => {
    const text = VICTORY_TEXTS[Math.floor(Math.random() * VICTORY_TEXTS.length)];
    const msg  = `🏛️ ${text}${PROMO_LINE}\n\nСможешь повторить? → ${BOT_LINK}`;
    const url  = `https://t.me/share/url?url=${encodeURIComponent(`t.me/${BOT_LINK.split("t.me/")[1]}`)}&text=${encodeURIComponent(msg)}`;
    if (window.Telegram?.WebApp) window.Telegram.WebApp.openLink(url);
    else window.open(url, "_blank");
  };

  // ─── РЕНДЕР ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{STYLES}</style>
      <div style={{
        height:"var(--tg-viewport-stable-height, 100dvh)", display:"flex", flexDirection:"column",
        background:WOOD_BG, fontFamily:"'Playfair Display',Georgia,serif",
        color:"#f5e6c8", overflow:"hidden",
      }}>
        <div style={{ height:3, background:"linear-gradient(to right,transparent,#d4af37,#f5e6a0,#d4af37,transparent)", flexShrink:0 }}/>

        {/* ── ХЭДЕР ── */}
        <div style={{
          flexShrink:0, textAlign:"center", padding:"8px 16px 6px",
          borderBottom:"1px solid #3d2509",
          background:"linear-gradient(to bottom,#1a0f00cc,transparent)",
          position:"relative",
        }}>
          <div style={{ fontSize:20, marginBottom:1 }}>🦅</div>
          <div style={{ fontSize:20, fontWeight:700, letterSpacing:6, color:"#d4af37", textShadow:"0 0 20px #d4af3766" }}>
            ВАРОНИЯ
          </div>
          <div style={{ fontSize:9, letterSpacing:4, color:"#8b6914", fontFamily:"'Special Elite',monospace", marginTop:1 }}>
            {presidentName && <span style={{ color:"#d4af3799", marginRight:6 }}>{presidentName} •</span>}
            {monthName} {year}
            {isCrisis  && <span style={{ marginLeft:8, color:"#c0392b", animation:"pulse 1s infinite" }}> ⚠️ КРИЗИС</span>}
            {phase === "election" && <span style={{ marginLeft:8, color:"#d4af37" }}> 🗳️ ВЫБОРЫ</span>}
          </div>
          {/* Кнопка Vepean Hub */}
          <button
            onClick={() => { haptic("light"); setShowHub(true); }}
            title="Vepean Hub"
            style={{
              position:"absolute", top:"50%", right:12, transform:"translateY(-50%)",
              background:"none", border:"none", cursor:"pointer",
              fontSize:16, opacity:0.6, padding:4,
              transition:"opacity 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = "1"}
            onMouseLeave={e => e.currentTarget.style.opacity = "0.6"}
          >🔐</button>
        </div>

        {/* ── ШКАЛЫ ── */}
        <div style={{
          flexShrink:0, padding:"8px 20px 6px", display:"flex", gap:12,
          borderBottom:"1px solid #2c1a06", background:"#1a0f00aa",
        }}>
          {PARAMS.map(p => <StatPill key={p.key} param={p} value={stats[p.key]} flash={!!flashParams[p.key]}/>)}
        </div>

        {/* ════════════════════════════════ ОНБОРДИНГ ════════════════════════════════ */}
        {phase === "onboarding" && (
          <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"20px 24px", animation:"fadeUp 0.6s ease", background:FELT_BG }}>
            <div style={{
              width:"100%", maxWidth:360,
              background:"linear-gradient(160deg,#fdf6e3,#f5e8c8,#ede0b0)",
              borderRadius:16, overflow:"hidden",
              boxShadow:"0 16px 48px rgba(0,0,0,0.7),0 0 0 1px rgba(212,175,55,0.3)",
              border:"1px solid #c9a84c", position:"relative",
            }}>
              <div style={{ background:"linear-gradient(to right,#8b0000,#6b0000,#8b0000)", padding:"16px 20px", textAlign:"center" }}>
                <div style={{ fontSize:28, marginBottom:4 }}>🦅</div>
                <div style={{ fontSize:16, fontWeight:700, color:"#f5e6c8", letterSpacing:4, fontFamily:"'Special Elite',monospace" }}>ВАРОНИЯ</div>
                <div style={{ fontSize:9, color:"#d4af3799", letterSpacing:2, fontFamily:"'Special Elite',monospace", marginTop:2 }}>СЕКРЕТНОЕ ДОСЬЕ • ПРЕЗИДЕНТ</div>
              </div>
              <div style={{ padding:"18px 20px 0" }}>
                <p style={{ fontSize:15, lineHeight:1.85, color:"#2c1a06", fontStyle:"italic", textAlign:"center", marginBottom:14 }}>
                  Поздравляем с избранием на пост Президента Республики Варония.
                </p>
                <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:14 }}>
                  {[
                    { icon:"💎", text:"Элиты финансируют вас — не разочаруйте их" },
                    { icon:"⚔️", text:"Армия защищает вас — пока вы её уважаете" },
                    { icon:"👥", text:"Народ вас избрал — и может свергнуть" },
                    { icon:"🌐", text:"Запад наблюдает — с деньгами и санкциями" },
                  ].map((item, i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:10, background:"#2c1a0611", borderRadius:8, padding:"8px 12px", border:"1px solid #c9a84c44" }}>
                      <span style={{ fontSize:16, flexShrink:0 }}>{item.icon}</span>
                      <span style={{ fontSize:12, color:"#3d2509", lineHeight:1.4 }}>{item.text}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background:"#8b000011", border:"1px solid #8b000033", borderRadius:8, padding:"10px 14px", marginBottom:16, textAlign:"center" }}>
                  <p style={{ fontSize:12, color:"#6b0000", fontStyle:"italic", lineHeight:1.6 }}>
                    Если любая шкала упадёт в 0 или зашкалит до 100 — вас уберут.
                  </p>
                </div>
              </div>
              <div style={{ padding:"0 20px 12px" }}>
                {presidentName ? (
                  <>
                    <div style={{ textAlign:"center", fontSize:11, color:"#8b6914", fontFamily:"'Special Elite',monospace", letterSpacing:1, marginBottom:10 }}>
                      С возвращением, {presidentName}
                    </div>
                    <button onClick={() => { haptic("medium"); setPhase("card"); }} style={{
                      width:"100%", background:"linear-gradient(135deg,#8b0000,#6b0000)",
                      color:"#f5e6c8", border:"1px solid #d4af37", padding:"13px", borderRadius:8,
                      fontSize:12, fontFamily:"'Special Elite',monospace", letterSpacing:3, cursor:"pointer",
                      boxShadow:"0 4px 20px rgba(139,0,0,0.4)", marginBottom:8,
                    }}>
                      НОВЫЙ СРОК →
                    </button>
                    <button onClick={() => { haptic("light"); setPresidentName(""); localStorage.removeItem("varon_pname"); }} style={{
                      width:"100%", background:"none", color:"#4b3010",
                      border:"1px solid #3d2509", padding:"8px", borderRadius:8,
                      fontSize:10, fontFamily:"'Special Elite',monospace", letterSpacing:2, cursor:"pointer",
                    }}>
                      ИГРАТЬ ЗА ДРУГОГО
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      maxLength={24}
                      placeholder="Ваше имя (необязательно)"
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleNameSubmit()}
                      style={{
                        width:"100%", marginBottom:10, padding:"10px 14px",
                        background:"#fdf6e3", border:"1px solid #c9a84c",
                        borderRadius:8, fontSize:13, fontFamily:"'Playfair Display',Georgia,serif",
                        color:"#2c1a06", outline:"none",
                      }}
                    />
                    <button onClick={handleNameSubmit} style={{
                      width:"100%", background:"linear-gradient(135deg,#8b0000,#6b0000)",
                      color:"#f5e6c8", border:"1px solid #d4af37", padding:"13px", borderRadius:8,
                      fontSize:12, fontFamily:"'Special Elite',monospace", letterSpacing:3, cursor:"pointer",
                      boxShadow:"0 4px 20px rgba(139,0,0,0.4)",
                    }}>
                      ПРИСТУПИТЬ К ОБЯЗАННОСТЯМ
                    </button>
                  </>
                )}
              </div>

              {/* ── VEPEAN FOOTER ── */}
              <div
                onClick={openVepean}
                style={{
                  padding:"8px 20px 14px", textAlign:"center", cursor:"pointer",
                  borderTop:"1px solid #c9a84c22",
                }}
              >
                <span style={{
                  fontSize:10, color:"#8b6914", fontFamily:"'Special Elite',monospace",
                  letterSpacing:0.5, textDecoration:"underline", textUnderlineOffset:2,
                  opacity:0.7,
                }}>
                  🔐 Игра предоставлена Vepean — VPN для тех, кто решает сам
                </span>
              </div>

              <div style={{
                position:"absolute", bottom:4, right:8,
                fontSize:8, fontFamily:"'Special Elite',monospace",
                color:"#2c1a0644", letterSpacing:1, pointerEvents:"none",
              }}>
                v1.3.0
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════ GAME OVER ════════════════════════════════ */}
        {phase === "gameover" && (
          <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"20px 24px", animation:"fadeUp 0.6s ease", overflowY:"auto" }}>
            <div style={{ fontSize:44, marginBottom:8 }}>⚰️</div>
            <div style={{ fontSize:10, letterSpacing:4, color:"#8b0000", fontFamily:"'Special Elite',monospace", marginBottom:4 }}>КОНЕЦ ПРАВЛЕНИЯ</div>
            <div style={{ fontSize:10, color:"#4b3010", fontFamily:"'Special Elite',monospace", marginBottom:16, letterSpacing:2 }}>
              {tenure} МЕС. У ВЛАСТИ — {tenureLabel}
            </div>
            <div style={{ background:"#0d0800", border:"1px solid #3d2509", borderRadius:12, padding:"18px 20px", marginBottom:14, width:"100%", maxWidth:360, boxShadow:"inset 0 2px 8px #00000066" }}>
              <p style={{ fontSize:14, lineHeight:1.8, fontStyle:"italic", color:"#d4b896", textAlign:"center" }}>«{deathMsg}»</p>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:16, width:"100%", maxWidth:360 }}>
              {PARAMS.map(p => {
                const isKiller = stats[p.key] <= 0 || stats[p.key] >= 100;
                const isTooHigh = stats[p.key] >= 100;
                return (
                  <div key={p.key} style={{
                    background:isKiller ? "#1a0000" : "#0d0800",
                    border:`1px solid ${isKiller ? "#8b0000" : "#2c1a06"}`,
                    borderRadius:8, padding:"10px 12px",
                    boxShadow:isKiller ? "0 0 12px rgba(139,0,0,0.4)" : "none",
                    position:"relative", overflow:"hidden",
                  }}>
                    {isKiller && (
                      <div style={{ position:"absolute", top:6, right:8, fontSize:9, color:"#8b0000", fontFamily:"'Special Elite',monospace", letterSpacing:1 }}>
                        {isTooHigh ? "▲ MAX" : "▼ MIN"}
                      </div>
                    )}
                    <div style={{ fontSize:16 }}>{p.icon}</div>
                    <div style={{ fontSize:8, color:isKiller ? "#8b0000" : "#4a3010", fontFamily:"'Special Elite',monospace", letterSpacing:1 }}>{p.label.toUpperCase()}</div>
                    <div style={{ fontSize:20, fontWeight:700, color:isKiller ? "#c0392b" : stats[p.key] > 65 ? "#27ae60" : "#d4af37" }}>
                      {stats[p.key]}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize:10, color:"#4b3010", fontFamily:"'Special Elite',monospace", marginBottom:12, letterSpacing:1, textAlign:"center", maxWidth:360 }}>
              ⚠️ ОПАСНО: шкала в 0 или 100 — конец правления
            </div>
            {achievements.length > 0 && (
              <div style={{ width:"100%", maxWidth:360, marginBottom:12 }}>
                <div style={{ fontSize:9, color:"#4b3010", fontFamily:"'Special Elite',monospace", letterSpacing:2, marginBottom:8, textAlign:"center" }}>ВАШИ ДОСТИЖЕНИЯ</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6, justifyContent:"center" }}>
                  {ACHIEVEMENTS_DEF.filter(a => achievements.includes(a.id)).map(a => (
                    <div key={a.id} title={a.desc} style={{
                      background:"#1a0f00", border:"1px solid #d4af3744", borderRadius:8,
                      padding:"6px 10px", display:"flex", alignItems:"center", gap:6,
                    }}>
                      <span style={{ fontSize:14 }}>{a.icon}</span>
                      <span style={{ fontSize:9, color:"#d4af37", fontFamily:"'Special Elite',monospace", letterSpacing:1 }}>{a.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {decisionLog.length > 0 && (
              <div style={{ width:"100%", maxWidth:360, marginBottom:12 }}>
                <div style={{ fontSize:9, color:"#4b3010", fontFamily:"'Special Elite',monospace", letterSpacing:2, marginBottom:6, textAlign:"center" }}>ИСТОРИЯ РЕШЕНИЙ</div>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  {decisionLog.slice(-5).map((entry, i) => (
                    <div key={i} style={{ display:"flex", gap:8, alignItems:"center", background:"#0d0800", border:"1px solid #2c1a06", borderRadius:6, padding:"5px 10px" }}>
                      <span style={{ fontSize:9, color:"#4b3010", fontFamily:"'Special Elite',monospace", flexShrink:0 }}>МЕС {entry.month}</span>
                      <span style={{ fontSize:10, color:"#d4b896", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{entry.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={shareGameOver} style={{
              width:"100%", maxWidth:360,
              background:"linear-gradient(135deg,#1a3a1a,#0d2a0d)",
              color:"#f5e6c8", border:"1px solid #27ae6066",
              padding:"13px", borderRadius:8, fontSize:12,
              fontFamily:"'Special Elite',monospace", letterSpacing:3,
              cursor:"pointer", marginBottom:10,
              boxShadow:"0 4px 16px rgba(39,174,96,0.2)",
            }}>
              📤 ПОДЕЛИТЬСЯ РЕЗУЛЬТАТОМ
            </button>
            <button onClick={restart} style={{ width:"100%", maxWidth:360, background:"linear-gradient(135deg,#8b0000,#6b0000)", color:"#f5e6c8", border:"1px solid #d4af3766", padding:"13px", borderRadius:8, fontSize:12, fontFamily:"'Special Elite',monospace", letterSpacing:3, cursor:"pointer", boxShadow:"0 4px 20px rgba(139,0,0,0.4)" }}>
              НОВЫЙ СРОК
            </button>
          </div>
        )}

        {/* ════════════════════════════════ ПОБЕДА ════════════════════════════════ */}
        {phase === "victory" && (
          <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"20px 24px", animation:"fadeUp 0.6s ease", overflowY:"auto" }}>
            <div style={{ fontSize:52, marginBottom:8 }}>🏛️</div>
            <div style={{ fontSize:11, letterSpacing:4, color:"#d4af37", fontFamily:"'Special Elite',monospace", marginBottom:4 }}>ВЫ ВОШЛИ В ИСТОРИЮ</div>
            <div style={{ fontSize:10, color:"#8b6914", fontFamily:"'Special Elite',monospace", marginBottom:16, letterSpacing:2 }}>
              {tenure} МЕСЯЦЕВ У ВЛАСТИ
            </div>
            {ending && (
              <div style={{ background:"#0d0800", border:"1px solid #d4af3744", borderRadius:12, padding:"20px", marginBottom:14, width:"100%", maxWidth:360, boxShadow:"0 0 30px rgba(212,175,55,0.1)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                  <span style={{ fontSize:28 }}>{ending.icon}</span>
                  <div>
                    <div style={{ fontSize:13, fontFamily:"'Special Elite',monospace", letterSpacing:3, color:"#d4af37" }}>{ending.title}</div>
                    <div style={{ fontSize:9, color:"#6b4c1e", fontFamily:"'Special Elite',monospace", letterSpacing:1, marginTop:2 }}>{ending.subtitle}</div>
                  </div>
                </div>
                {ending.text.split('\n\n').map((para, i, arr) => (
                  <p key={i} style={{ fontSize:13, lineHeight:1.8, color:"#d4b896", fontStyle:"italic", marginBottom: i < arr.length - 1 ? 10 : 0 }}>
                    {para}
                  </p>
                ))}
              </div>
            )}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:16, width:"100%", maxWidth:360 }}>
              {PARAMS.map(p => (
                <div key={p.key} style={{ background:"#0d0800", border:`1px solid ${p.color}44`, borderRadius:8, padding:"10px 12px", boxShadow:`0 0 12px ${p.color}22` }}>
                  <div style={{ fontSize:16 }}>{p.icon}</div>
                  <div style={{ fontSize:8, color:"#4a3010", fontFamily:"'Special Elite',monospace", letterSpacing:1 }}>{p.label.toUpperCase()}</div>
                  <div style={{ fontSize:20, fontWeight:700, color:p.color }}>{stats[p.key]}</div>
                </div>
              ))}
            </div>
            {achievements.length > 0 && (
              <div style={{ width:"100%", maxWidth:360, marginBottom:12 }}>
                <div style={{ fontSize:9, color:"#8b6914", fontFamily:"'Special Elite',monospace", letterSpacing:2, marginBottom:8, textAlign:"center" }}>ДОСТИЖЕНИЯ</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6, justifyContent:"center" }}>
                  {ACHIEVEMENTS_DEF.filter(a => achievements.includes(a.id)).map(a => (
                    <div key={a.id} title={a.desc} style={{
                      background:"#1a0f00", border:"1px solid #d4af3766", borderRadius:8,
                      padding:"6px 10px", display:"flex", alignItems:"center", gap:6,
                    }}>
                      <span style={{ fontSize:14 }}>{a.icon}</span>
                      <span style={{ fontSize:9, color:"#d4af37", fontFamily:"'Special Elite',monospace", letterSpacing:1 }}>{a.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {decisionLog.length > 0 && (
              <div style={{ width:"100%", maxWidth:360, marginBottom:12 }}>
                <div style={{ fontSize:9, color:"#8b6914", fontFamily:"'Special Elite',monospace", letterSpacing:2, marginBottom:6, textAlign:"center" }}>ИСТОРИЯ РЕШЕНИЙ</div>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  {decisionLog.slice(-5).map((entry, i) => (
                    <div key={i} style={{ display:"flex", gap:8, alignItems:"center", background:"#0d0800", border:"1px solid #2c1a06", borderRadius:6, padding:"5px 10px" }}>
                      <span style={{ fontSize:9, color:"#4b3010", fontFamily:"'Special Elite',monospace", flexShrink:0 }}>МЕС {entry.month}</span>
                      <span style={{ fontSize:10, color:"#d4b896", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{entry.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {promoCode && (
              <div style={{
                width:"100%", maxWidth:360, marginBottom:14,
                background:"linear-gradient(135deg,#1a0f00,#2c1a06)",
                border:"1px solid #d4af37", borderRadius:12, padding:"16px 20px", textAlign:"center",
                boxShadow:"0 0 30px rgba(212,175,55,0.15)",
              }}>
                <div style={{ fontSize:9, color:"#8b6914", fontFamily:"'Special Elite',monospace", letterSpacing:2, marginBottom:6 }}>
                  🎁 ПОДАРОК ЗА ПОБЕДУ — {promoCode.days} ДНЕЙ VEPEAN VPN
                </div>
                <div
                  style={{
                    fontSize:20, fontWeight:700, color:"#d4af37", fontFamily:"'Special Elite',monospace",
                    letterSpacing:4, background:"#0d0800", padding:"10px 16px", borderRadius:8,
                    border:"1px solid #d4af3766", marginBottom:8, cursor:"pointer", userSelect:"all",
                  }}
                  onClick={() => { navigator.clipboard?.writeText(promoCode.code); haptic("light"); }}
                >
                  {promoCode.code}
                </div>
                <div style={{ fontSize:9, color:"#4b3010", fontFamily:"'Special Elite',monospace" }}>
                  Нажмите для копирования · Активация на vepean.click
                </div>
              </div>
            )}
            <button onClick={shareVictory} style={{
              width:"100%", maxWidth:360,
              background:"linear-gradient(135deg,#1a3a1a,#0d2a0d)",
              color:"#f5e6c8", border:"1px solid #27ae6066",
              padding:"13px", borderRadius:8, fontSize:12,
              fontFamily:"'Special Elite',monospace", letterSpacing:3,
              cursor:"pointer", marginBottom:10,
              boxShadow:"0 4px 16px rgba(39,174,96,0.2)",
            }}>
              📤 ПОДЕЛИТЬСЯ ПОБЕДОЙ
            </button>
            <button onClick={restart} style={{ width:"100%", maxWidth:360, background:"linear-gradient(135deg,#8b6914,#6b4c0a)", color:"#f5e6c8", border:"1px solid #d4af37", padding:"13px", borderRadius:8, fontSize:12, fontFamily:"'Special Elite',monospace", letterSpacing:3, cursor:"pointer", boxShadow:"0 4px 20px rgba(212,175,55,0.3)" }}>
              НОВАЯ ЭПОХА
            </button>
          </div>
        )}

        {/* ════════════════════════════════ ВЫБОРЫ ════════════════════════════════ */}
        {phase === "election" && (
          <div style={{ flex:1, display:"flex", flexDirection:"column", padding:"12px 16px 16px", background:FELT_BG, overflow:"hidden" }}>
            <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center" }}>
              <div style={{
                background:"linear-gradient(160deg,#fdf6e3,#f5e8c8,#ede0b0)",
                borderRadius:12, padding:0, overflow:"hidden",
                boxShadow:"0 8px 32px rgba(0,0,0,0.6),0 0 0 1px rgba(212,175,55,0.3)",
                border:"1px solid #c9a84c",
                animation:"electionPulse 2s ease infinite",
              }}>
                <div style={{ background:"linear-gradient(to right,#4a3800,#2c2200,#4a3800)", padding:"10px 16px", display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:36, height:36, borderRadius:"50%", background:"#1a0f00", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, border:"2px solid #d4af37" }}>📋</div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:"#f5e6c8" }}>Елена Власова</div>
                    <div style={{ fontSize:10, color:"#d4af3799", fontFamily:"'Special Elite',monospace" }}>Пресс-секретарь</div>
                  </div>
                </div>
                <div style={{ padding:"20px 18px", position:"relative" }}>
                  <p style={{ fontSize:17, lineHeight:1.85, color:"#2c1a06", fontStyle:"italic", textAlign:"center" }}>
                    {ELECTION_CARD.text}
                  </p>
                  <div style={{ marginTop:16, padding:"12px", background:"#2c1a0622", borderRadius:8, border:"1px solid #c9a84c55" }}>
                    <div style={{ fontSize:11, fontFamily:"'Special Elite',monospace", color:"#6b4c1e", textAlign:"center", letterSpacing:1, marginBottom:8 }}>
                      ВАШ РЕЙТИНГ У НАРОДА
                    </div>
                    <div style={{ height:8, background:"#d4c4a8", borderRadius:4, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${stats.people}%`, background:stats.people >= 40 ? "#27ae60" : "#c0392b", borderRadius:4, transition:"width 0.5s ease" }}/>
                    </div>
                    <div style={{ textAlign:"center", marginTop:6, fontSize:14, fontWeight:700, color:stats.people >= 40 ? "#27ae60" : "#c0392b", fontFamily:"'Special Elite',monospace" }}>
                      {stats.people}% {stats.people >= 40 ? "— ПОБЕДА" : "— ПОРАЖЕНИЕ"}
                    </div>
                  </div>
                </div>
                <div style={{ height:1, background:"linear-gradient(to right,transparent,#c9a84c66,transparent)", margin:"0 16px" }}/>
                <div style={{ padding:"12px" }}>
                  <button onClick={() => choose("right")} style={{
                    width:"100%", background:stats.people >= 40 ? "linear-gradient(135deg,#1a4a1a,#0d2e0d)" : "linear-gradient(135deg,#4a1a1a,#2e0d0d)",
                    color:"#f5e6c8", border:`1px solid ${stats.people >= 40 ? "#27ae60" : "#c0392b"}`,
                    padding:"14px", borderRadius:8, fontSize:13, fontFamily:"'Special Elite',monospace",
                    letterSpacing:3, cursor:"pointer",
                  }}>
                    {stats.people >= 40 ? "🗳️ ПЕРЕИЗБРАТЬСЯ" : "☠️ ПРИНЯТЬ ПОРАЖЕНИЕ"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════ ИГРОВАЯ КАРТА ════════════════════════════════ */}
        {phase === "card" && currentCard && (
          <div style={{ flex:1, display:"flex", flexDirection:"column", padding:"8px 16px 12px", overflow:"hidden", background:cardBg }}>
            {/* Превью эффектов (реальные значения 1.4×) */}
            <div style={{ height:24, display:"flex", justifyContent:"center", gap:10, alignItems:"center", marginBottom:6, flexShrink:0 }}>
              {previewFxReal && PARAMS.map(p => previewFxReal[p.key] !== 0 && (
                <span key={p.key} style={{ fontSize:12, fontFamily:"'Special Elite',monospace", color:previewFxReal[p.key] > 0 ? "#27ae60" : "#c0392b", animation:"fadeIn 0.2s ease" }}>
                  {p.icon}{previewFxReal[p.key] > 0 ? "+" : ""}{previewFxReal[p.key]}
                </span>
              ))}
            </div>

            <div
              style={{ flex:1, ...cardStyle, animation:cardStyle.transform ? "none" : "cardIn 0.3s ease", position:"relative" }}
              onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
            >
              <div style={{
                height:"100%", display:"flex", flexDirection:"column",
                background:cardPaperBg, borderRadius:12,
                boxShadow:`0 8px 32px rgba(0,0,0,0.6),0 0 0 1px rgba(212,175,55,0.3),inset 0 1px 0 rgba(255,255,255,${isCrisis ? 0.05 : 0.8})`,
                border:`1px solid ${isCrisis ? "#8b0000" : "#c9a84c"}`,
                overflow:"hidden", color:cardTextColor,
                animation:isCrisis ? "crisisShake 0.4s ease" : "none",
              }}>
                {/* Советник */}
                <div style={{ background:headerBg, padding:"10px 16px", display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
                  <div style={{ width:36, height:36, borderRadius:"50%", background:"#1a0f00", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0, border:"2px solid #d4af37", boxShadow:"0 0 8px rgba(212,175,55,0.3)" }}>
                    {advisor.avatar}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:"#f5e6c8", lineHeight:1.2 }}>{advisor.name}</div>
                    <div style={{ fontSize:10, color:"#d4af3799", fontFamily:"'Special Elite',monospace", letterSpacing:0.5 }}>{advisor.role}</div>
                  </div>
                </div>

                {/* Текст карты */}
                <div style={{ flex:1, padding:"16px 18px", display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
                  {hovered && (
                    <div style={{
                      position:"absolute", top:12, left:"50%", transform:`translateX(-50%) rotate(${hovered === "left" ? "-6deg" : "6deg"})`,
                      zIndex:10, border:`3px solid ${hovered === "left" ? "#27ae60" : "#c0392b"}`,
                      borderRadius:6, padding:"4px 14px",
                      color:hovered === "left" ? "#27ae60" : "#c0392b",
                      fontFamily:"'Special Elite',monospace", fontSize:15, letterSpacing:3, fontWeight:700,
                      opacity:0.93, animation:"fadeIn 0.15s ease", pointerEvents:"none",
                      background:"rgba(255,255,255,0.7)", whiteSpace:"nowrap",
                    }}>
                      {hovered === "left" ? currentCard.left.label.toUpperCase() : currentCard.right.label.toUpperCase()}
                    </div>
                  )}
                  <p style={{ fontSize:17, lineHeight:1.85, color:cardTextColor, fontStyle:"italic", textAlign:"center" }}>
                    {currentCard.text}
                  </p>
                </div>

                <div style={{ height:1, background:`linear-gradient(to right,transparent,${isCrisis ? "#8b000066" : "#c9a84c66"},transparent)`, margin:"0 16px" }}/>

                {/* Кнопки */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, padding:"12px", flexShrink:0 }}>
                  {["left", "right"].map(side => (
                    <button key={side}
                      onClick={() => { haptic("medium"); choose(side); }}
                      onMouseEnter={() => setHovered(side)}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        background:hovered === side ? "linear-gradient(135deg,#8b0000,#6b0000)" : "linear-gradient(135deg,#2c1a06,#1a0f00)",
                        color:hovered === side ? "#f5e6c8" : "#c4a882",
                        border:`1px solid ${hovered === side ? "#d4af37" : "#3d2509"}`,
                        borderRadius:8, padding:"10px 8px", cursor:"pointer", textAlign:"center",
                        transition:"all 0.15s ease",
                        transform:hovered === side ? "translateY(-2px)" : "none",
                        boxShadow:hovered === side ? "0 6px 16px rgba(0,0,0,0.5),0 0 8px rgba(212,175,55,0.2)" : "none",
                      }}
                    >
                      <div style={{ fontSize:9, fontFamily:"'Special Elite',monospace", letterSpacing:2, color:hovered === side ? "#d4af37" : "#6b4c1e", marginBottom:4 }}>
                        {currentCard[side].label.toUpperCase()}
                      </div>
                      <div style={{ fontSize:12, lineHeight:1.5 }}>{currentCard[side].text}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ textAlign:"center", marginTop:8, flexShrink:0, fontSize:9, color:"#6b000055", fontFamily:"'Special Elite',monospace", letterSpacing:2 }}>
              ← СВАЙП ИЛИ ТАП →
            </div>
          </div>
        )}

        <div style={{ height:2, background:"linear-gradient(to right,transparent,#d4af37,#f5e6a0,#d4af37,transparent)", flexShrink:0 }}/>

        {/* ════════ VEPEAN HUB ОВЕРЛЕЙ ════════ */}
        {showHub && (
          <div
            onClick={() => setShowHub(false)}
            style={{
              position:"absolute", inset:0, zIndex:100,
              background:"rgba(0,0,0,0.75)", display:"flex",
              alignItems:"center", justifyContent:"center", padding:20,
              animation:"fadeIn 0.2s ease",
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                width:"100%", maxWidth:340,
                background:"linear-gradient(160deg,#0d0800,#1a0f00)",
                border:"1px solid #d4af3766", borderRadius:16,
                overflow:"hidden", boxShadow:"0 20px 60px rgba(0,0,0,0.8)",
              }}
            >
              {/* Hub header */}
              <div style={{ background:"linear-gradient(to right,#1a0f00,#2c1a06,#1a0f00)", padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:"#d4af37", fontFamily:"'Special Elite',monospace", letterSpacing:2 }}>🔐 VEPEAN HUB</div>
                  <div style={{ fontSize:9, color:"#8b6914", fontFamily:"'Special Elite',monospace", letterSpacing:1, marginTop:2 }}>VPN для тех, кто решает сам</div>
                </div>
                <button onClick={() => setShowHub(false)} style={{ background:"none", border:"none", color:"#6b4c1e", fontSize:18, cursor:"pointer", padding:4 }}>✕</button>
              </div>

              <div style={{ padding:"16px 20px", display:"flex", flexDirection:"column", gap:12 }}>
                {/* Лучший результат */}
                <div style={{ background:"#2c1a0622", border:"1px solid #d4af3733", borderRadius:10, padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:9, color:"#6b4c1e", fontFamily:"'Special Elite',monospace", letterSpacing:1 }}>ВАШ РЕКОРД</div>
                    <div style={{ fontSize:22, fontWeight:700, color:"#d4af37", fontFamily:"'Special Elite',monospace", marginTop:2 }}>{bestScore} <span style={{ fontSize:11 }}>МЕС.</span></div>
                  </div>
                  <div style={{ fontSize:28 }}>🏆</div>
                </div>

                {/* Достижения */}
                {achievements.length > 0 && (
                  <div style={{ background:"#2c1a0611", border:"1px solid #3d2509", borderRadius:10, padding:"10px 14px" }}>
                    <div style={{ fontSize:9, color:"#6b4c1e", fontFamily:"'Special Elite',monospace", letterSpacing:1, marginBottom:8 }}>ДОСТИЖЕНИЯ</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                      {ACHIEVEMENTS_DEF.map(a => (
                        <div key={a.id} title={a.desc} style={{
                          padding:"4px 8px", borderRadius:6,
                          border:`1px solid ${achievements.includes(a.id) ? "#d4af3766" : "#3d2509"}`,
                          opacity: achievements.includes(a.id) ? 1 : 0.3,
                          fontSize:13,
                        }}>
                          {a.icon}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Хроника концовок */}
                <div style={{ background:"#2c1a0611", border:"1px solid #3d2509", borderRadius:10, padding:"10px 14px" }}>
                  <div style={{ fontSize:9, color:"#6b4c1e", fontFamily:"'Special Elite',monospace", letterSpacing:1, marginBottom:8 }}>ХРОНИКА ПРАВЛЕНИЙ</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {Object.values(ENDINGS).map(e => {
                      const unlocked = unlockedEndings.includes(e.id);
                      return (
                        <div key={e.id} title={unlocked ? `${e.title} — ${e.subtitle}` : "Не открыто"} style={{
                          padding:"6px 10px", borderRadius:6, display:"flex", alignItems:"center", gap:5,
                          border:`1px solid ${unlocked ? "#d4af3766" : "#3d2509"}`,
                          opacity: unlocked ? 1 : 0.28,
                          background: unlocked ? "#1a0f00" : "transparent",
                        }}>
                          <span style={{ fontSize:13 }}>{e.icon}</span>
                          {unlocked && <span style={{ fontSize:8, color:"#d4af37", fontFamily:"'Special Elite',monospace", letterSpacing:1 }}>{e.title}</span>}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ fontSize:8, color:"#4b3010", fontFamily:"'Special Elite',monospace", marginTop:6, letterSpacing:0.5 }}>
                    {unlockedEndings.length} из {Object.keys(ENDINGS).length} финалов открыто
                  </div>
                </div>

                {/* Промокод */}
                <div style={{ background:"linear-gradient(135deg,#1a0f00,#2c1a06)", border:"1px solid #d4af37", borderRadius:10, padding:"14px 16px", textAlign:"center" }}>
                  <div style={{ fontSize:9, color:"#8b6914", fontFamily:"'Special Elite',monospace", letterSpacing:1, marginBottom:6 }}>ПРОМОКОД — 7 ДНЕЙ БЕСПЛАТНО</div>
                  <div style={{
                    fontSize:18, fontWeight:700, color:"#d4af37", fontFamily:"'Special Elite',monospace",
                    letterSpacing:3, background:"#0d0800", padding:"8px 16px",
                    borderRadius:6, border:"1px solid #d4af3744", marginBottom:8,
                    cursor:"pointer", userSelect:"all",
                  }}
                    onClick={() => { navigator.clipboard?.writeText("WARONIA"); haptic("light"); }}
                  >WARONIA</div>
                  <div style={{ fontSize:9, color:"#4b3010", fontFamily:"'Special Elite',monospace" }}>Нажмите для копирования</div>
                </div>

                {/* Реферальный счётчик */}
                {referralCount > 0 && (
                  <div style={{ fontSize:10, color:"#6b4c1e", fontFamily:"'Special Elite',monospace", textAlign:"center", letterSpacing:1 }}>
                    👥 Вы привели {referralCount} {referralCount === 1 ? "игрока" : "игроков"}
                  </div>
                )}

                {/* CTA кнопка */}
                <button onClick={openVepean} style={{
                  width:"100%", background:"linear-gradient(135deg,#1a2a3a,#0d1a2a)",
                  color:"#f5e6c8", border:"1px solid #2980b966",
                  padding:"13px", borderRadius:8, fontSize:11,
                  fontFamily:"'Special Elite',monospace", letterSpacing:2,
                  cursor:"pointer", boxShadow:"0 4px 16px rgba(41,128,185,0.2)",
                }}>
                  🌐 ОТКРЫТЬ VEPEAN.CLICK →
                </button>

                {/* Реферальная ссылка */}
                <button onClick={() => {
                  const tg = window.Telegram?.WebApp;
                  const userId = tg?.initDataUnsafe?.user?.id || "guest";
                  const refLink = `https://t.me/mr_president_gamebot?start=ref_${userId}`;
                  const msg = `🦅 Играй за президента Варонии — принимай решения, удержись у власти!\n\n→ ${refLink}`;
                  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(msg)}`;
                  if (tg) tg.openLink(shareUrl); else window.open(shareUrl, "_blank");
                  haptic("light");
                }} style={{
                  width:"100%", background:"none",
                  color:"#6b4c1e", border:"1px solid #3d2509",
                  padding:"10px", borderRadius:8, fontSize:10,
                  fontFamily:"'Special Elite',monospace", letterSpacing:2,
                  cursor:"pointer",
                }}>
                  📤 ПРИГЛАСИТЬ ДРУГА
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
