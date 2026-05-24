import { useState, useRef, useCallback, useEffect } from "react";
import { PARAMS } from "./data/params.js";
import { ADVISORS } from "./data/advisors.js";
import { CARDS, CRISIS_CARDS, ELECTION_CARD, MONTHS } from "./data/cards.js";
import { CHAINS, getTriggeredChain } from "./data/chains.js";
import { ENDINGS, getVictoryEnding } from "./data/endings.js";
import { NARUZHU_CARDS } from "./data/naruzhuCards.js";
import { EXTRA_CARDS } from "./data/extraCards.js";
import "./App.css";

const getAsset = (path) => {
  const base = import.meta.env.BASE_URL || '/';
  return base + path.replace(/^\//, '');
};

const WOOD_BG   = `url("${getAsset('/images/game_background.png')}") center/cover no-repeat`;
const FELT_BG   = `linear-gradient(135deg,#8b0000 0%,#6b0000 40%,#7a0000 60%,#8b0000 100%)`;
const CRISIS_BG = `linear-gradient(135deg,#1a0000 0%,#2d0000 50%,#1a0000 100%)`;

// Бренд-цвета «Наружу»: чёрный + неоновый жёлтый
const NARUZHU_YELLOW = "#FFD60A";

// Собираем общую колоду: базовые + дополнительные + Наружу-карты
const ALL_CARDS = [...CARDS, ...EXTRA_CARDS, ...NARUZHU_CARDS];

const shuffle = a => {
  const copy = [...a];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

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
      <img src={getAsset(param.icon)} className={`stat-pill-icon ${param.key}`} alt="" />
      <div style={{
        width:"100%", height:6, background:"#1a0f00", borderRadius:3, overflow:"hidden", position:"relative",
        border: isDanger ? "1px solid #c0392b88" : isWarning ? "1px solid #d4872b55" : "1px solid #3d2509",
        boxShadow: isCritical ? "0 0 12px #c0392b99" : isDanger ? `0 0 8px ${param.color}55` : "none",
      }}>
        <div style={{
          height:"100%", width:`${pct}%`, background:barBg, borderRadius:3,
          transition:"width 0.5s cubic-bezier(0.4,0,0.2,1)",
          animation:flash ? "flashStat 0.5s ease" : isCritical ? "pulse 0.7s infinite" : isDanger ? "pulse 1.5s infinite" : "none",
        }}/>
        <div style={{
          position:"absolute", left:"50%", top:0, bottom:0, width:1,
          background:"rgba(245,230,200,0.45)", transform:"translateX(-50%)",
        }}/>
      </div>
      <div style={{ fontSize:8, fontFamily:"var(--font-sans)", letterSpacing:0.5, fontWeight:600,
        color: isDanger ? "#c0392b" : isWarning ? "#d4872b" : "#6b4c1e" }}>
        {param.label.toUpperCase()}{isCritical ? "!" : ""}
      </div>
    </div>
  );
}

function ChoiceEffectRow({ fx }) {
  const entries = PARAMS
    .map(p => ({ param: p, value: Math.round((fx[p.key] || 0) * 1.2) }))
    .filter(item => item.value !== 0);

  if (!entries.length) return null;

  return (
    <div className="choice-effect-row">
      {entries.map(({ param, value }) => (
        <span key={param.key} className={`choice-effect-chip ${value > 0 ? "positive" : "negative"}`}>
          <img src={getAsset(param.icon)} alt="" />
          <span>{value > 0 ? "+" : ""}{value}</span>
        </span>
      ))}
    </div>
  );
}

// ─── ДОСТИЖЕНИЯ ──────────────────────────────────────────────────────────────
const ACHIEVEMENTS_DEF = [
  { id: "survive_12",  icon: "📅", label: "Первый год",        desc: "Пережить 12 месяцев у власти"          },
  { id: "survive_48",  icon: "🏅", label: "Первый срок",       desc: "Пережить 48 месяцев у власти"          },
  { id: "win_election",icon: "🗳️", label: "Переизбран",        desc: "Победить на президентских выборах"     },
  { id: "victory",     icon: "🏛️", label: "Легенда Варонии",   desc: "Завершить два полных срока правления"  },
  { id: "vepean_open", icon: "🚪", label: "Наружу",            desc: "Завершить арк Цифрового суверенитета открытым финалом" },
];

// ─── ГЛАВНЫЙ КОМПОНЕНТ ────────────────────────────────────────────────────────
export default function ThePresident() {
  // Восстанавливаем сохранённый ран если есть
  const savedRun = (() => {
    try { return JSON.parse(localStorage.getItem("varon_save") || "null"); } catch { return null; }
  })();

  const [stats, setStats]               = useState(savedRun?.stats || { oligarchs:50, army:50, people:50, west:50 });
  const [months, setMonths]             = useState(savedRun?.months || 1);
  const [deck, setDeck]                 = useState(() => savedRun ? savedRun.deck : shuffle(ALL_CARDS));
  const [cardIdx, setCardIdx]           = useState(savedRun?.cardIdx || 0);
  const [pendingEvents, setPendingEvents] = useState(savedRun?.pendingEvents || []);
  const [phase, setPhase]               = useState(savedRun ? (savedRun.phase || "card") : "onboarding");
  const [deathMsg, setDeathMsg]         = useState("");
  const [cardStyle, setCardStyle]       = useState({});
  const [hovered, setHovered]           = useState(null);
  const [flashParams, setFlashParams]   = useState({});
  const [isCrisis, setIsCrisis]         = useState(false);
  const [crisisCard, setCrisisCard]     = useState(null);
  const [termsCompleted, setTermsCompleted] = useState(savedRun?.termsCompleted || 0);
  const [hasUsedSecondChance, setHasUsedSecondChance] = useState(() => savedRun?.hasUsedSecondChance || false);
  const [rescueCard, setRescueCard]     = useState(() => savedRun?.rescueCard || null);
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
  const swipeTriggered = useRef(false);

  const haptic = useCallback((type = "light") => {
    try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(type); } catch { /* Telegram haptics are optional outside Mini App. */ }
  }, []);

  const hapticNotify = useCallback((type = "success") => {
    try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(type); } catch { /* Telegram haptics are optional outside Mini App. */ }
  }, []);

  const unlockAchievement = useCallback((id) => {
    setAchievements(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      localStorage.setItem("varon_ach", JSON.stringify(next));
      hapticNotify("success");
      return next;
    });
  }, [hapticNotify]);

  const unlockSurvivalAchievements = useCallback((nextMonth) => {
    if (nextMonth >= 13) unlockAchievement("survive_12");
    if (nextMonth >= 49) unlockAchievement("survive_48");
  }, [unlockAchievement]);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    tg.ready();
    tg.expand();
    setTimeout(() => tg.expand(), 300);
    setTimeout(() => tg.expand(), 1000);
    if (typeof tg.requestFullscreen === "function") {
      try { tg.requestFullscreen(); } catch { /* Older Telegram clients can expose unsupported methods. */ }
      setTimeout(() => {
        try { tg.requestFullscreen(); } catch { /* Older Telegram clients can expose unsupported methods. */ }
      }, 500);
    }

    // Обработка реферального start_param
    const startParam = tg.initDataUnsafe?.start_param || "";
    if (startParam.startsWith("ref_")) {
      const count = parseInt(localStorage.getItem("varon_refs") || "0", 10) + 1;
      localStorage.setItem("varon_refs", String(count));
      queueMicrotask(() => setReferralCount(count));
    }
  }, []);

  const currentCard = isCrisis && crisisCard ? crisisCard : deck[cardIdx % deck.length];
  const advisor     = currentCard ? (ADVISORS[currentCard.advisor] || ADVISORS[0]) : ADVISORS[0];
  const year        = 2024 + Math.floor((months - 1) / 12);
  const monthName   = MONTHS[(months - 1) % 12];

  const checkDeath = s => {
    for (const p of PARAMS) {
      if (s[p.key] <= 0) {
        const msgs = Array.isArray(p.deathLow) ? p.deathLow : [p.deathLow];
        return { key: p.key, low: true, msg: msgs[Math.floor(Math.random() * msgs.length)] };
      }
      if (s[p.key] >= 100) {
        const msgs = Array.isArray(p.deathHigh) ? p.deathHigh : [p.deathHigh];
        return { key: p.key, low: false, msg: msgs[Math.floor(Math.random() * msgs.length)] };
      }
    }
    return null;
  };

  const applyFx = useCallback((fx, currentStats) => {
    const ns = {}, fl = {};
    PARAMS.forEach(p => {
      const scaled = Math.round((fx[p.key] || 0) * 1.2);
      ns[p.key] = Math.max(0, Math.min(100, currentStats[p.key] + scaled));
      if (scaled !== 0) fl[p.key] = true;
    });
    return { ns, fl };
  }, []);

  const handleDeathOrRescue = useCallback((death, nextStats, nextMonth, nextPendingEvents = pendingEvents) => {
    hapticNotify("error");
    const score = nextMonth - 1;

    if (hasUsedSecondChance) {
      setDeathMsg(death.msg);
      if (score > bestScore) { setBestScore(score); localStorage.setItem("varon_best", String(score)); }
      localStorage.removeItem("varon_save");
      setPhase("gameover");
    } else {
      const paramKey = death.key;
      const isLow = death.low;
      let rescueText = "";
      let agreeText = "";
      let rescueFx = {};
      let advisorId = 0; // Кто спасает

      if (paramKey === "people") {
        if (isLow) {
          advisorId = 1; // Громов
          rescueText = "🚨 ВТОРОЙ ШАНС (Восстание): Разъярённая толпа окружила дворец. Генерал Громов предлагает ввести танки и объявить комендантский час. «Мы зачистим улицы, господин президент, но Запад и народ вам этого не простят».";
          agreeText = "Ввести танки (Силовики +20, Народ +25, Запад -30)";
          rescueFx = { army: 20, oligarchs: 0, people: 25, west: -30 };
        } else {
          advisorId = 1; // Громов
          rescueText = "🚨 ВТОРОЙ ШАНС (Народная диктатура): Ваша популярность пугает элиты. Громов предупреждает, что генералы готовят заговор, чтобы вас сместить. Он предлагает устроить показательные аресты оппозиции, чтобы успокоить силовиков.";
          agreeText = "Арестовать оппозицию (Народ -25, Силовики +15, Запад -15)";
          rescueFx = { army: 15, oligarchs: 0, people: -25, west: -15 };
        }
      } else if (paramKey === "oligarchs") {
        if (isLow) {
          advisorId = 7; // Хан
          rescueText = "🚨 ВТОРОЙ ШАНС (Саботаж бизнеса): Крупный бизнес прекратил инвестиции и объявил локаут. Страна на грани коллапса. Хан предлагает передать ему управление морским портом в обмен на экстренное финансирование.";
          agreeText = "Передать порты Хану (Олигархи +25, Запад -15, Силовики -10)";
          rescueFx = { oligarchs: 25, army: -10, people: 0, west: -15 };
        } else {
          advisorId = 0; // Зубов
          rescueText = "🚨 ВТОРОЙ ШАНС (Засилье бизнеса): Олигархи скупили все ключевые ведомства и диктуют свои законы. Зубов предлагает провести принудительную национализацию части активов Хана ради спасения суверенитета.";
          agreeText = "Национализировать активы (Олигархи -25, Народ +15, Запад -10)";
          rescueFx = { oligarchs: -25, army: 0, people: 15, west: -10 };
        }
      } else if (paramKey === "army") {
        if (isLow) {
          advisorId = 3; // Сенин
          rescueText = "🚨 ВТОРОЙ ШАНС (Бунт силовиков): Армия развалена, офицеры дезертируют, Громов потерял контроль. Сенин предлагает передать спецслужбам КГБ полный контроль над границами и базами снабжения.";
          agreeText = "Отдать контроль КГБ (Силовики +25, Олигархи -15, Народ -10)";
          rescueFx = { army: 25, oligarchs: -15, people: -10, west: 0 };
        } else {
          advisorId = 6; // Стрельцова
          rescueText = "🚨 ВТОРОЙ ШАНС (Военная хунта): Генерал Громов фактически контролирует все министерства и готовит приказ о вашем аресте. Стрельцова требует немедленно отстранить верхушку генералитета и начать расследования.";
          agreeText = "Уволить генералов (Силовики -25, Народ -15, Запад -10)";
          rescueFx = { army: -25, oligarchs: 0, people: -15, west: -10 };
        }
      } else if (paramKey === "west") {
        if (isLow) {
          advisorId = 4; // Хартли
          rescueText = "🚨 ВТОРОЙ ШАНС (Полная изоляция): Экономика задушена западными санкциями, резервы заморожены. Хартли предлагает экстренно подписать кабальное соглашение об ассоциации в обмен на финансовую помощь МВФ.";
          agreeText = "Подписать соглашение (Запад +25, Народ +10, Силовики -15)";
          rescueFx = { west: 25, army: -15, people: 10, oligarchs: 0 };
        } else {
          advisorId = 3; // Сенин
          rescueText = "🚨 ВТОРОЙ ШАНС (Потеря суверенитета): Западные советники диктуют состав правительства. Варония теряет независимость. Сенин предлагает ввести санкционный мораторий и выслать западных кураторов.";
          agreeText = "Выслать кураторов (Запад -25, Силовики +15, Народ -10)";
          rescueFx = { west: -25, army: 15, people: -10, oligarchs: 0 };
        }
      }

      setRescueCard({
        advisor: advisorId,
        text: rescueText,
        agreeText: agreeText,
        fx: rescueFx,
        targetStats: nextStats,
        targetMonth: nextMonth
      });
      setPhase("second_chance");

      try {
        localStorage.setItem("varon_save", JSON.stringify({
          stats: nextStats,
          months: nextMonth,
          deck,
          cardIdx,
          pendingEvents: nextPendingEvents,
          hasUsedSecondChance: false,
          rescueCard: {
            advisor: advisorId,
            text: rescueText,
            agreeText: agreeText,
            fx: rescueFx,
            targetStats: nextStats,
            targetMonth: nextMonth
          },
          termsCompleted,
          phase: "second_chance"
        }));
      } catch { /* Save failure should not interrupt the current run. */ }
    }
  }, [hasUsedSecondChance, bestScore, deck, cardIdx, pendingEvents, termsCompleted, hapticNotify]);

  const choose = useCallback((side) => {
    if (choosing.current) return;

    if (phase === "second_chance" && rescueCard) {
      if (side === "agree") {
        hapticNotify("success");
        const { ns, fl } = applyFx(rescueCard.fx, rescueCard.targetStats);
        setFlashParams(fl);
        setTimeout(() => setFlashParams({}), 600);
        setStats(ns);
        setHasUsedSecondChance(true);
        setPhase("card");
        setRescueCard(null);
        setIsCrisis(false);

        try {
          localStorage.setItem("varon_save", JSON.stringify({
            stats: ns,
            months: rescueCard.targetMonth,
            deck,
            cardIdx,
            pendingEvents,
            hasUsedSecondChance: true,
            rescueCard: null,
            termsCompleted,
            phase: "card"
          }));
        } catch { /* Save failure should not interrupt the current run. */ }
      } else {
        hapticNotify("error");
        setDeathMsg("Вы отказались от сделки по спасению власти и предпочли с честью сложить полномочия.");
        const score = rescueCard.targetMonth - 1;
        if (score > bestScore) { setBestScore(score); localStorage.setItem("varon_best", String(score)); }
        localStorage.removeItem("varon_save");
        setPhase("gameover");
      }
      return;
    }

    if (phase === "election") {
      let fx = { oligarchs: 0, army: 0, people: 0, west: 0 };
      let tacticLabel = "";
      if (side === "honest") {
        if (stats.people < 40) return;
        fx = { oligarchs: 0, army: 0, people: 10, west: 10 };
        tacticLabel = "Честные выборы";
      } else if (side === "admin") {
        fx = { oligarchs: 5, army: 15, people: -18, west: -22 };
        tacticLabel = "Административный ресурс";
      } else if (side === "sponsor") {
        fx = { oligarchs: 18, army: 0, people: -10, west: -8 };
        tacticLabel = "Сделка с олигархами";
      } else {
        hapticNotify("error");
        setDeathMsg("Вы отказались от участия в выборах и добровольно ушли на покой. В Варонии наступила новая эпоха.");
        const score = months - 1;
        if (score > bestScore) { setBestScore(score); localStorage.setItem("varon_best", String(score)); }
        localStorage.removeItem("varon_save");
        setPhase("gameover");
        return;
      }

      hapticNotify("success");
      unlockAchievement("win_election");

      const { ns, fl } = applyFx(fx, stats);
      setFlashParams(fl);
      setTimeout(() => setFlashParams({}), 600);
      setStats(ns);

      const newMonth = months + 1;
      setMonths(newMonth);
      unlockSurvivalAchievements(newMonth);

      setDecisionLog(prev => [...prev.slice(-6), {
        month: months,
        label: tacticLabel,
      }]);

      const newTerms = termsCompleted + 1;
      setTermsCompleted(newTerms);

      const death = checkDeath(ns);
      if (death) {
        handleDeathOrRescue(death, ns, newMonth);
        return;
      }

      if (newTerms >= 2) {
        hapticNotify("success");
        const score = newMonth - 1;
        if (score > bestScore) { setBestScore(score); localStorage.setItem("varon_best", String(score)); }
        if (score >= 96)      setPromoCode({ code: "WARONIA30", days: 30 });
        else if (score >= 48) setPromoCode({ code: "WARONIA14", days: 14 });
        else                  setPromoCode({ code: "WARONIA7",  days: 7  });
        localStorage.removeItem("varon_save");
        
        const endObj = getVictoryEnding(ns, score);
        setUnlockedEndings(prev => {
          if (prev.includes(endObj.id)) return prev;
          const next = [...prev, endObj.id];
          localStorage.setItem("varon_ends", JSON.stringify(next));
          return next;
        });
        unlockAchievement("victory");
        setPhase("victory");
        return;
      }

      setPhase("card");
      setIsCrisis(false);

      try {
        localStorage.setItem("varon_save", JSON.stringify({
          stats: ns,
          months: newMonth,
          deck,
          cardIdx,
          pendingEvents,
          hasUsedSecondChance,
          rescueCard,
          termsCompleted: newTerms,
          phase: "card"
        }));
      } catch { /* Save failure should not interrupt the current run. */ }
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
      unlockSurvivalAchievements(newMonth);

      setDecisionLog(prev => [...prev.slice(-6), {
        month: months,
        label: currentCard[side].label,
      }]);

      const chainId    = getTriggeredChain(currentCard, side);
      const newPending = [...pendingEvents];
      if (chainId && CHAINS[chainId]) {
        newPending.push({ ...CHAINS[chainId], triggerMonth: newMonth + CHAINS[chainId].delay });
      }
      if (chainId === "ds_arc_4_soft_end") unlockAchievement("vepean_open");

      const firedIdx = newPending.findIndex(e => e.triggerMonth <= newMonth);
      let chainCard  = null;
      if (firedIdx >= 0) {
        chainCard = newPending[firedIdx].card;
        newPending.splice(firedIdx, 1);
      }
      setPendingEvents(newPending);
      setCardStyle({});
      setHovered(null);
      setIsCrisis(false);
      setCrisisCard(null);
      choosing.current = false;

      const death = checkDeath(ns);
      if (death) {
        handleDeathOrRescue(death, ns, newMonth, newPending);
        return;
      }

      const nextIdx = cardIdx + 1;
      const nextDeck = chainCard ? [chainCard, ...deck.slice(nextIdx)] : deck;
      const nextCardIdx = chainCard ? 0 : nextIdx;
      if (chainCard) setDeck(nextDeck);
      setCardIdx(nextCardIdx);

      try {
        localStorage.setItem("varon_save", JSON.stringify({
          stats: ns,
          months: newMonth,
          deck: nextDeck,
          cardIdx: nextCardIdx,
          pendingEvents: newPending,
          hasUsedSecondChance,
          rescueCard,
          termsCompleted,
          phase: "card"
        }));
      } catch { /* Save failure should not interrupt the current run. */ }

      if (chainCard) {
        return;
      }

      if (newMonth % 48 === 1 && newMonth > 1) { setPhase("election"); return; }

      if (newMonth % 12 === 1 && newMonth > 1) {
        hapticNotify("warning");
        setIsCrisis(true);
        setCrisisCard(CRISIS_CARDS[Math.floor(Math.random() * CRISIS_CARDS.length)]);
      }
    }, 350);
  }, [phase, currentCard, stats, months, applyFx, termsCompleted, pendingEvents, cardIdx, hasUsedSecondChance, rescueCard, handleDeathOrRescue, bestScore, deck, hapticNotify, unlockAchievement, unlockSurvivalAchievements]);

  const onTouchStart = e => { touchStart.current = e.touches[0].clientX; };
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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (phase !== "card" || choosing.current) return;
      if (e.key === "ArrowLeft") choose("left");
      else if (e.key === "ArrowRight") choose("right");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, choose]);

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
    setHasUsedSecondChance(false);
    setRescueCard(null);
    choosing.current = false;
    localStorage.removeItem("varon_save");
  };

  const openNaruzhu = () => {
    const url = "https://naruzhu.am/?utm_source=varonia&utm_medium=game&utm_campaign=hub";
    if (window.Telegram?.WebApp) window.Telegram.WebApp.openLink(url);
    else window.open(url, "_blank");
  };

  const openVepean = () => {
    const url = "https://vepean.click/?utm_source=varonia&utm_medium=game&utm_campaign=hub";
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

  // Превью с реальным масштабом (1.2×)
  const previewFxReal = hovered && currentCard
    ? Object.fromEntries(PARAMS.map(p => [p.key, Math.round((currentCard[hovered].fx[p.key] || 0) * 1.2)]))
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
  const PROMO_LINE = `\n🚪 Промокод WARONIA → 7 дней «Наружу» бесплатно: naruzhu.am`;
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
      <div style={{
        height:"var(--tg-viewport-stable-height, 100dvh)", display:"flex", flexDirection:"column",
        background:WOOD_BG, fontFamily:"'Playfair Display',Georgia,serif",
        color:"#f5e6c8", overflow:"hidden",
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
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
          {/* Кнопка «Наружу» Hub */}
          <button
            onClick={() => { haptic("light"); setShowHub(true); }}
            title="Наружу — VPN"
            style={{
              position:"absolute", top:"50%", right:18, transform:"translateY(-50%)",
              background:"none", border:"none", cursor:"pointer",
              fontSize:16, opacity:0.7, padding:4,
              color: NARUZHU_YELLOW,
              transition:"opacity 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = "1"}
            onMouseLeave={e => e.currentTarget.style.opacity = "0.7"}
          >🚪</button>
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
          <div className="screen-scroll-container" style={{ background: FELT_BG }}>
            <div className="card-paper-container">
              <div className="card-header-bar">
                <div style={{ fontSize: 24, marginBottom: 4 }}>🦅</div>
                <div className="font-typewriter" style={{ fontSize: 16, fontWeight: 700, color: "#f5e6c8", letterSpacing: 4 }}>ВАРОНИЯ</div>
                <div className="font-typewriter" style={{ fontSize: 8, color: "#d4af3799", letterSpacing: 2, marginTop: 2 }}>СЕКРЕТНОЕ ДОСЬЕ • ПРЕЗИДЕНТ</div>
              </div>
              <div className="card-content-area">
                {/* Секретное досье (картинка-плейсхолдер) */}
                <div className="story-image-frame">
                  <img 
                    className="frame-inner-img" 
                    src={getAsset('/images/onboarding_dossier.png')} 
                    alt="Секретное досье" 
                    onError={e => e.currentTarget.style.display = 'none'} 
                  />
                </div>
                
                <p style={{ fontSize: 14, lineHeight: 1.7, color: "#2c1a06", fontStyle: "italic", textAlign: "center", marginBottom: 12 }}>
                  Поздравляем с избранием на пост Президента Республики Варония.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                  {[
                    { icon: "/images/icon_oligarchs.png", text: "Элиты финансируют вас — не разочаруйте их" },
                    { icon: "/images/icon_army.png", text: "Армия защищает вас — пока вы её уважаете" },
                    { icon: "/images/icon_people.png", text: "Народ вас избрал — и может свергнуть" },
                    { icon: "/images/icon_west.png", text: "Запад наблюдает — с деньгами и санкциями" },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "#2c1a060e", borderRadius: 8, padding: "6px 10px", border: "1px solid #c9a84c33" }}>
                      <span style={{ flexShrink: 0, width: 18, height: 18 }}><img src={getAsset(item.icon)} style={{ width: "100%", height: "100%", objectFit: "contain" }} alt=""/></span>
                      <span style={{ fontSize: 11, color: "#3d2509", lineHeight: 1.35 }}>{item.text}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: "#8b000011", border: "1px solid #8b000022", borderRadius: 8, padding: "8px 12px", marginBottom: 12, textAlign: "center" }}>
                  <p style={{ fontSize: 11, color: "#6b0000", fontStyle: "italic", lineHeight: 1.5 }}>
                    Если любая шкала упадёт в 0 или зашкалит до 100 — вас уберут.
                  </p>
                </div>
              </div>
              <div style={{ padding: "0 20px 12px" }}>
                {presidentName ? (
                  <>
                    <div className="font-typewriter" style={{ textAlign: "center", fontSize: 11, color: "#8b6914", letterSpacing: 1, marginBottom: 10 }}>
                      С возвращением, {presidentName}
                    </div>
                    <button onClick={() => { haptic("medium"); setPhase("card"); }} className="btn-velvet" style={{ marginBottom: 8 }}>
                      НОВЫЙ СРОК →
                    </button>
                    <button onClick={() => { haptic("light"); setPresidentName(""); localStorage.removeItem("varon_pname"); }} className="btn-outline" style={{ width: "100%" }}>
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
                        width: "100%", marginBottom: 10, padding: "10px 14px",
                        background: "#fdf6e3", border: "1px solid #c9a84c",
                        borderRadius: 8, fontSize: 13, fontFamily: "var(--font-serif)",
                        color: "#2c1a06", outline: "none", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)"
                      }}
                    />
                    <button onClick={handleNameSubmit} className="btn-velvet">
                      ПРИСТУПИТЬ К ОБЯЗАННОСТЯМ
                    </button>
                  </>
                )}
              </div>

              {/* ── НАРУЖУ FOOTER ── */}
              <div
                onClick={openNaruzhu}
                style={{
                  padding: "8px 20px 12px", textAlign: "center", cursor: "pointer",
                  borderTop: "1px solid #c9a84c22",
                }}
              >
                <span className="font-typewriter" style={{
                  fontSize: 10, color: "#8b6914",
                  letterSpacing: 0.5, textDecoration: "underline", textUnderlineOffset: 2,
                  opacity: 0.75,
                }}>
                  🚪 Игра от <b style={{ color: NARUZHU_YELLOW }}>Наружу</b> — надёжный VPN для свободного интернета
                </span>
              </div>

              <div className="font-typewriter" style={{
                position: "absolute", bottom: 4, right: 8,
                fontSize: 8, color: "#2c1a0644", letterSpacing: 1, pointerEvents: "none",
              }}>
                v1.3.0
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════ GAME OVER ════════════════════════════════ */}
        {phase === "gameover" && (
          <div className="screen-scroll-container">
            <div className="card-paper-container crisis" style={{ paddingBottom: 16 }}>
              <div className="card-header-bar crisis">
                <div style={{ fontSize: 28, marginBottom: 2 }}>⚰️</div>
                <div className="font-typewriter" style={{ fontSize: 13, letterSpacing: 4, color: "#c0392b", fontWeight: 700 }}>КОНЕЦ ПРАВЛЕНИЯ</div>
                <div className="font-typewriter" style={{ fontSize: 9, color: "#8b6914", letterSpacing: 2, marginTop: 2 }}>
                  {tenure} МЕС. У ВЛАСТИ — {tenureLabel}
                </div>
              </div>
              
              <div className="card-content-area">
                {/* Разрушенный дворец (картинка-плейсхолдер) */}
                <div className="story-image-frame crisis ruins">
                  <img 
                    className="frame-inner-img" 
                    src={getAsset('/images/palace_ruined.png')} 
                    alt="Разрушенный дворец" 
                    onError={e => e.currentTarget.style.display = 'none'} 
                  />
                </div>

                <div style={{ 
                  background: "#0d0800", border: "1px solid #3d2509", 
                  borderRadius: 12, padding: "14px 18px", marginBottom: 12, 
                  boxShadow: "inset 0 2px 8px #000000bb" 
                }}>
                  <p style={{ fontSize: 13, lineHeight: 1.7, fontStyle: "italic", color: "#d4b896", textAlign: "center" }}>
                    «{deathMsg}»
                  </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                  {PARAMS.map(p => {
                    const isKiller = stats[p.key] <= 0 || stats[p.key] >= 100;
                    const isTooHigh = stats[p.key] >= 100;
                    return (
                      <div key={p.key} style={{
                        background: isKiller ? "#1a0000" : "#0d0800",
                        border: `1px solid ${isKiller ? "#8b0000" : "#2c1a06"}`,
                        borderRadius: 8, padding: "8px 10px",
                        boxShadow: isKiller ? "0 0 10px rgba(192, 57, 43, 0.45)" : "none",
                        position: "relative", overflow: "hidden",
                      }}>
                        {isKiller && (
                          <div className="font-typewriter" style={{ position: "absolute", top: 4, right: 6, fontSize: 8, color: "#c0392b", fontWeight: 700 }}>
                            {isTooHigh ? "▲ MAX" : "▼ MIN"}
                          </div>
                        )}
                        <img src={getAsset(p.icon)} style={{ width: 20, height: 20, objectFit: "contain" }} alt=""/>
                        <div className="font-typewriter" style={{ fontSize: 8, color: isKiller ? "#c0392b" : "#6b4c1e", letterSpacing: 0.5, marginTop: 2 }}>{p.label.toUpperCase()}</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: isKiller ? "#c0392b" : stats[p.key] > 65 ? "#27ae60" : "#d4af37", marginTop: 1 }}>
                          {stats[p.key]}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="font-typewriter" style={{ fontSize: 8, color: "#6b4c1e", marginBottom: 12, letterSpacing: 0.5, textAlign: "center" }}>
                  ⚠️ Шкала в 0 или 100 — лишение власти
                </div>

                {achievements.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div className="font-typewriter" style={{ fontSize: 8, color: "#8b6914", letterSpacing: 1.5, marginBottom: 6, textAlign: "center" }}>ВАШИ ДОСТИЖЕНИЯ</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
                      {ACHIEVEMENTS_DEF.filter(a => achievements.includes(a.id)).map(a => (
                        <div key={a.id} title={a.desc} style={{
                          background: "#1a0f00", border: "1px solid #d4af3733", borderRadius: 6,
                          padding: "4px 8px", display: "flex", alignItems: "center", gap: 5,
                        }}>
                          <span style={{ fontSize: 11 }}>{a.icon}</span>
                          <span className="font-typewriter" style={{ fontSize: 8, color: "#d4af37", letterSpacing: 0.5 }}>{a.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {decisionLog.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div className="font-typewriter" style={{ fontSize: 8, color: "#8b6914", letterSpacing: 1.5, marginBottom: 6, textAlign: "center" }}>ИСТОРИЯ РЕШЕНИЙ</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      {decisionLog.slice(-4).map((entry, i) => (
                        <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", background: "#0d0800", border: "1px solid #2c1a06", borderRadius: 6, padding: "4px 8px" }}>
                          <span className="font-typewriter" style={{ fontSize: 8, color: "#6b4c1e", flexShrink: 0 }}>МЕС {entry.month}</span>
                          <span style={{ fontSize: 9, color: "#d4b896", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 8 }}>
                <button onClick={shareGameOver} className="btn-emerald" style={{ width: "100%" }}>
                  📤 ПОДЕЛИТЬСЯ РЕЗУЛЬТАТОМ
                </button>
                <button onClick={restart} className="btn-velvet" style={{ width: "100%" }}>
                  НОВЫЙ СРОК
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════ ПОБЕДА ════════════════════════════════ */}
        {phase === "victory" && (
          <div className="screen-scroll-container">
            <div className="card-paper-container" style={{ paddingBottom: 16 }}>
              <div className="card-header-bar gold">
                <div style={{ fontSize: 32, marginBottom: 2 }}>🏛️</div>
                <div className="font-typewriter" style={{ fontSize: 13, letterSpacing: 4, color: "#d4af37", fontWeight: 700 }}>ВЫ ВОШЛИ В ИСТОРИЮ</div>
                <div className="font-typewriter" style={{ fontSize: 9, color: "#8b6914", letterSpacing: 2, marginTop: 2 }}>
                  {tenure} МЕСЯЦЕВ У ВЛАСТИ
                </div>
              </div>
              
              <div className="card-content-area">
                {ending && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {["zastoy", "oprichnina", "kooperativ", "bunker"].includes(ending.id) ? (
                      <div className="story-image-frame" style={{ height: 150 }}>
                        <img 
                          className="frame-inner-img" 
                          src={getAsset(`/images/ending_${ending.id}.png`)} 
                          alt={ending.title} 
                          onError={e => e.currentTarget.style.display = 'none'} 
                        />
                      </div>
                    ) : (
                      <div style={{ display: "flex", justifyContent: "center", margin: "10px 0" }}>
                        <span style={{ fontSize: 44 }}>{ending.icon}</span>
                      </div>
                    )}
                    
                    <div style={{ padding: "0 4px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        {!["zastoy", "oprichnina", "kooperativ", "bunker"].includes(ending.id) && (
                          <span style={{ fontSize: 24 }}>{ending.icon}</span>
                        )}
                        <div>
                          <div className="font-typewriter" style={{ fontSize: 12, letterSpacing: 2, color: "#d4af37", fontWeight: 700 }}>{ending.title.toUpperCase()}</div>
                          <div className="font-typewriter" style={{ fontSize: 8, color: "#6b4c1e", letterSpacing: 0.5, marginTop: 1 }}>{ending.subtitle}</div>
                        </div>
                      </div>
                      
                      {ending.text.split('\n\n').map((para, i, arr) => (
                        <p key={i} style={{ fontSize: 13, lineHeight: 1.7, color: "#2c1a06", fontStyle: "italic", marginBottom: i < arr.length - 1 ? 8 : 0 }}>
                          {para}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "14px 0 12px" }}>
                  {PARAMS.map(p => (
                    <div key={p.key} style={{ background: "#0d0800", border: `1px solid ${p.color}33`, borderRadius: 8, padding: "8px 10px", boxShadow: `0 0 8px ${p.color}15` }}>
                      <img src={getAsset(p.icon)} style={{ width: 20, height: 20, objectFit: "contain" }} alt=""/>
                      <div className="font-typewriter" style={{ fontSize: 8, color: "#6b4c1e", letterSpacing: 0.5, marginTop: 2 }}>{p.label.toUpperCase()}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: p.color, marginTop: 1 }}>{stats[p.key]}</div>
                    </div>
                  ))}
                </div>

                {achievements.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div className="font-typewriter" style={{ fontSize: 8, color: "#8b6914", letterSpacing: 1.5, marginBottom: 6, textAlign: "center" }}>ДОСТИЖЕНИЯ</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
                      {ACHIEVEMENTS_DEF.filter(a => achievements.includes(a.id)).map(a => (
                        <div key={a.id} title={a.desc} style={{
                          background: "#1a0f00", border: "1px solid #d4af3744", borderRadius: 6,
                          padding: "4px 8px", display: "flex", alignItems: "center", gap: 5,
                        }}>
                          <span style={{ fontSize: 11 }}>{a.icon}</span>
                          <span className="font-typewriter" style={{ fontSize: 8, color: "#d4af37", letterSpacing: 0.5 }}>{a.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {decisionLog.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div className="font-typewriter" style={{ fontSize: 8, color: "#8b6914", letterSpacing: 1.5, marginBottom: 6, textAlign: "center" }}>ИСТОРИЯ РЕШЕНИЙ</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      {decisionLog.slice(-4).map((entry, i) => (
                        <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", background: "#0d0800", border: "1px solid #2c1a06", borderRadius: 6, padding: "4px 8px" }}>
                          <span className="font-typewriter" style={{ fontSize: 8, color: "#6b4c1e", flexShrink: 0 }}>МЕС {entry.month}</span>
                          <span style={{ fontSize: 9, color: "#d4b896", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace:"nowrap" }}>{entry.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {promoCode && (
                  <div className="hub-promo-box" style={{ marginBottom: 14 }}>
                    <div className="font-typewriter" style={{ fontSize: 8, color: "#8b6914", letterSpacing: 1.5, marginBottom: 4 }}>
                      🎁 ПОДАРОК ЗА ПОБЕДУ — {promoCode.days} ДНЕЙ VEPEAN VPN
                    </div>
                    <div
                      className="hub-promo-code"
                      onClick={() => { navigator.clipboard?.writeText(promoCode.code); haptic("light"); }}
                    >
                      {promoCode.code}
                    </div>
                    <div className="font-typewriter" style={{ fontSize: 8, color: "#6b4c1e" }}>
                      Копировать · Активация на vepean.click
                    </div>
                  </div>
                )}
              </div>

              <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 8 }}>
                <button onClick={shareVictory} className="btn-emerald" style={{ width: "100%" }}>
                  📤 ПОДЕЛИТЬСЯ ПОБЕДОЙ
                </button>
                <button onClick={restart} className="btn-gold" style={{ width: "100%" }}>
                  НОВАЯ ЭПОХА
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════ ВЫБОРЫ ════════════════════════════════ */}
        {phase === "election" && (
          <div className="screen-scroll-container" style={{ background: FELT_BG }}>
            <div className="card-paper-container" style={{ animation: "electionPulse 2.5s ease infinite" }}>
              <div className="card-header-bar gold" style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}>
                <img src={getAsset("/images/advisor_vlasova.png")} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "2px solid #d4af37" }} alt="" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#f5e6c8", lineHeight: 1.2 }}>Елена Власова</div>
                  <div className="font-typewriter" style={{ fontSize: 9, color: "#d4af3799" }}>Пресс-секретарь</div>
                </div>
              </div>
              
              <div className="card-content-area padded-bottom">
                {/* Выборы (картинка-плейсхолдер) */}
                <div className="story-image-frame election">
                  <img 
                    className="frame-inner-img" 
                    src={getAsset('/images/election_booth.png')} 
                    alt="Избирательный участок" 
                    onError={e => e.currentTarget.style.display = 'none'} 
                  />
                </div>

                <p style={{ fontSize: 15, lineHeight: 1.7, color: "#2c1a06", fontStyle: "italic", textAlign: "center", marginBottom: 12 }}>
                  {ELECTION_CARD.text}
                </p>
                
                <div style={{ padding: "8px 12px", background: "#2c1a060e", borderRadius: 8, border: "1px solid #c9a84c33", marginBottom: 12 }}>
                  <div className="font-typewriter" style={{ fontSize: 8, color: "#6b4c1e", textAlign: "center", letterSpacing: 1, marginBottom: 4 }}>
                    ВАШ РЕЙТИНГ У НАРОДА
                  </div>
                  <div style={{ height: 6, background: "#d4c4a8", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${stats.people}%`, background: stats.people >= 40 ? "#27ae60" : "#c0392b", borderRadius: 3, transition: "width 0.5s ease" }}/>
                  </div>
                  <div className="font-typewriter" style={{ textAlign: "center", marginTop: 4, fontSize: 10, fontWeight: 700, color: stats.people >= 40 ? "#27ae60" : "#c0392b" }}>
                    {stats.people}% {stats.people >= 40 ? "— ДОСТАТОЧЕН ДЛЯ ЧЕСТНЫХ ВЫБОРОВ" : "— НЕДОСТАТОЧЕН ДЛЯ ЧЕСТНЫХ ВЫБОРОВ"}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <button
                    disabled={stats.people < 40}
                    onClick={() => choose("honest")}
                    className={stats.people >= 40 ? "btn-gold" : "btn-outline"}
                    style={{ 
                      opacity: stats.people < 40 ? 0.5 : 1, 
                      cursor: stats.people >= 40 ? "pointer" : "not-allowed",
                      flexDirection: "column", padding: "8px 12px"
                    }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>🗳️ ЧЕСТНАЯ КАМПАНИЯ</div>
                    <div style={{ fontSize: 8, marginTop: 1, textTransform: "none", fontWeight: 400 }}>Народ +12 · Запад +12 (Рейтинг от 40%)</div>
                  </button>

                  <button onClick={() => choose("admin")} className="btn-velvet" style={{ flexDirection: "column", padding: "8px 12px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#f5c6c6" }}>👮 АДМИНИСТРАТИВНЫЙ РЕСУРС</div>
                    <div style={{ fontSize: 8, marginTop: 1, textTransform: "none", fontWeight: 400, color: "#f5e6c8aa" }}>Народ -22 · Запад -26 · Силовики +18 · Олигархи +6</div>
                  </button>

                  <button onClick={() => choose("sponsor")} className="btn-velvet" style={{ flexDirection: "column", padding: "8px 12px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#fbe380" }}>💎 СДЕЛКА С ОЛИГАРХАМИ</div>
                    <div style={{ fontSize: 8, marginTop: 1, textTransform: "none", fontWeight: 400, color: "#f5e6c8aa" }}>Олигархи +22 · Народ -12 · Запад -10</div>
                  </button>

                  <button onClick={() => choose("giveup")} className="btn-outline" style={{ marginTop: 4 }}>
                    ☠️ СДАТЬСЯ И УЙТИ
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════ ВТОРОЙ ШАНС ════════════════════════════════ */}
        {phase === "second_chance" && rescueCard && (
          <div className="screen-scroll-container" style={{ background: FELT_BG }}>
            <div className="card-paper-container crisis" style={{ animation: "electionPulse 2s ease infinite" }}>
              <div className="card-header-bar crisis" style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}>
                <img src={getAsset(ADVISORS[rescueCard.advisor]?.avatar || "/images/advisor_zubov.png")} style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", border: "2px solid #d4af37" }} alt="" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#f5e6c8", lineHeight: 1.2 }}>{ADVISORS[rescueCard.advisor]?.name || "Советник"}</div>
                  <div className="font-typewriter" style={{ fontSize: 9, color: "#d4af3799" }}>{ADVISORS[rescueCard.advisor]?.role || "Куратор"}</div>
                </div>
              </div>
              
              <div className="card-content-area padded-bottom">
                {/* Телефон кризиса (картинка-плейсхолдер) */}
                <div className="story-image-frame crisis">
                  <img 
                    className="frame-inner-img" 
                    src={getAsset('/images/crisis_phone.png')} 
                    alt="Кризисный телефон" 
                    onError={e => e.currentTarget.style.display = 'none'} 
                  />
                </div>

                <p style={{ fontSize: 15, lineHeight: 1.7, color: "#f5c6c6", fontStyle: "italic", textAlign: "center", fontWeight: 600, marginBottom: 12 }}>
                  {rescueCard.text}
                </p>
                
                <div style={{ background: "rgba(139, 0, 0, 0.25)", border: "1px solid rgba(139, 0, 0, 0.45)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, textAlign: "center" }}>
                  <p style={{ fontSize: 11, color: "#f5c6c6", fontStyle: "italic", lineHeight: 1.5 }}>
                    ⚠️ Внимание: это ваш единственный «Второй шанс» за игру. Любой следующий перекос шкал приведет к окончательному поражению.
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <button onClick={() => choose("agree")} className="btn-gold" style={{ padding: "14px 10px" }}>
                    🤝 {rescueCard.agreeText.toUpperCase()}
                  </button>
                  <button onClick={() => choose("deny")} className="btn-outline">
                    ☠️ ОТКЛОНИТЬ И СЛОЖИТЬ ПОЛНОМОЧИЯ
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════ ИГРОВАЯ КАРТА ════════════════════════════════ */}
        {phase === "card" && currentCard && (
          <div style={{ flex:1, display:"flex", flexDirection:"column", padding:"8px 16px 12px", overflow:"hidden", background:cardBg }}>
            {/* Превью эффектов (реальные значения 1.2×) */}
            <div style={{ height: 24, display: "flex", justifyContent: "center", gap: 12, alignItems: "center", marginBottom: 6, flexShrink: 0 }}>
              {previewFxReal && PARAMS.map(p => previewFxReal[p.key] !== 0 && (
                <span key={p.key} style={{ 
                  fontSize: 12, 
                  fontFamily: "var(--font-sans)", 
                  color: previewFxReal[p.key] > 0 ? "#27ae60" : "#c0392b", 
                  animation: "fadeIn 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: "rgba(26, 15, 0, 0.65)",
                  padding: "2px 8px",
                  borderRadius: 6,
                  border: `1px solid ${previewFxReal[p.key] > 0 ? "rgba(39, 174, 96, 0.3)" : "rgba(192, 57, 43, 0.3)"}`,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.3)"
                }}>
                  <img 
                    src={getAsset(p.icon)} 
                    style={{ 
                      width: 14, 
                      height: 14, 
                      objectFit: "contain",
                      filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6)) brightness(1.2)" 
                    }} 
                    alt="" 
                  />
                  <span style={{ fontWeight: 700 }}>
                    {previewFxReal[p.key] > 0 ? "+" : ""}{previewFxReal[p.key]}
                  </span>
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
                  <img src={getAsset(advisor.avatar)} style={{ width:36, height:36, borderRadius:"50%", objectFit:"cover", flexShrink:0, border:"2px solid #d4af37", boxShadow:"0 0 8px rgba(212,175,55,0.3)" }} alt="" />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:"#f5e6c8", lineHeight:1.2 }}>{advisor.name}</div>
                    <div style={{ fontSize:10, color:"#d4af3799", fontFamily:"'Special Elite',monospace", letterSpacing:0.5 }}>{advisor.role}</div>
                  </div>
                </div>

                {/* Текст карты */}
                <div style={{ flex:1, padding:"16px 18px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", position:"relative" }}>
                  <img src={getAsset(advisor.avatar)} className="card-advisor-avatar" alt="" />
                  {hovered && (
                    <div style={{
                      position:"absolute", top:12, left:"50%", transform:`translateX(-50%) rotate(${hovered === "left" ? "-6deg" : "6deg"})`,
                      zIndex:10, border:`3px solid ${hovered === "left" ? "#27ae60" : "#c0392b"}`,
                      borderRadius:6, padding:"4px 14px",
                      color:hovered === "left" ? "#27ae60" : "#c0392b",
                      fontFamily:"var(--font-sans)", fontSize:15, letterSpacing:1.5, fontWeight:700,
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
                        fontFamily:"var(--font-sans)",
                        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"space-between",
                        minHeight:92,
                      }}
                    >
                      <div style={{ fontSize:10, fontFamily:"var(--font-sans)", letterSpacing:1.2, color:hovered === side ? "#d4af37" : "#8b6914", marginBottom:4, fontWeight:700 }}>
                        {currentCard[side].label.toUpperCase()}
                      </div>
                      <div style={{ fontSize:12, lineHeight:1.35 }}>{currentCard[side].text}</div>
                      <ChoiceEffectRow fx={currentCard[side].fx} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ textAlign:"center", marginTop:8, flexShrink:0, fontSize:9, color:"#d4af3788", fontFamily:"'Special Elite',monospace", letterSpacing:2 }}>
              ← СВАЙП ИЛИ ТАП →
            </div>
          </div>
        )}

        <div style={{ height:2, background:"linear-gradient(to right,transparent,#d4af37,#f5e6a0,#d4af37,transparent)", flexShrink:0 }}/>

        {/* ════════ VEPEAN HUB ОВЕРЛЕЙ ════════ */}
        {showHub && (
          <div className="hub-overlay" onClick={() => setShowHub(false)}>
            <div className="hub-card" onClick={e => e.stopPropagation()}>
              {/* Hub header */}
              <div className="hub-card-header">
                <div>
                  <div className="font-typewriter" style={{ fontSize: 14, fontWeight: 700, color: "#d4af37", letterSpacing: 2 }}>🔐 VEPEAN HUB</div>
                  <div className="font-typewriter" style={{ fontSize: 8, color: "#8b6914", letterSpacing: 0.5, marginTop: 2 }}>VPN для тех, кто решает сам</div>
                </div>
                <button onClick={() => setShowHub(false)} style={{ background: "none", border: "none", color: "#6b4c1e", fontSize: 16, cursor: "pointer", padding: 4 }}>✕</button>
              </div>

              <div className="hub-card-body">
                {/* Лучший результат */}
                <div className="hub-stats-panel">
                  <div>
                    <div className="font-typewriter" style={{ fontSize: 8, color: "#6b4c1e", letterSpacing: 1 }}>ВАШ РЕКОРД</div>
                    <div className="font-typewriter" style={{ fontSize: 20, fontWeight: 700, color: "#d4af37", marginTop: 2 }}>{bestScore} <span style={{ fontSize: 10 }}>МЕС.</span></div>
                  </div>
                  <div style={{ fontSize: 24 }}>🏆</div>
                </div>

                {/* Достижения */}
                {achievements.length > 0 && (
                  <div className="hub-section">
                    <div className="font-typewriter" style={{ fontSize: 8, color: "#6b4c1e", letterSpacing: 1 }}>ДОСТИЖЕНИЯ</div>
                    <div className="hub-grid">
                      {ACHIEVEMENTS_DEF.map(a => {
                        const hasAch = achievements.includes(a.id);
                        return (
                          <div key={a.id} title={a.desc} className={`hub-grid-item ${hasAch ? 'active' : 'inactive'}`}>
                            <span style={{ fontSize: 12 }}>{a.icon}</span>
                            {hasAch && <span className="font-typewriter" style={{ fontSize: 8, color: "#d4af37", letterSpacing: 0.5 }}>{a.label}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Хроника концовок */}
                <div className="hub-section">
                  <div className="font-typewriter" style={{ fontSize: 8, color: "#6b4c1e", letterSpacing: 1 }}>ХРОНИКА ПРАВЛЕНИЙ</div>
                  <div className="hub-grid">
                    {Object.values(ENDINGS).map(e => {
                      const unlocked = unlockedEndings.includes(e.id);
                      return (
                        <div key={e.id} title={unlocked ? `${e.title} — ${e.subtitle}` : "Не открыто"} className={`hub-grid-item ${unlocked ? 'active' : 'inactive'}`}>
                          <span style={{ fontSize: 12 }}>{e.icon}</span>
                          {unlocked && <span className="font-typewriter" style={{ fontSize: 8, color: "#d4af37", letterSpacing: 0.5 }}>{e.title}</span>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="font-typewriter" style={{ fontSize: 8, color: "#6b4c1e", marginTop: 6, letterSpacing: 0.5 }}>
                    {unlockedEndings.length} из {Object.keys(ENDINGS).length} финалов открыто
                  </div>
                </div>

                {/* Промокод */}
                <div className="hub-promo-box">
                  <div className="font-typewriter" style={{ fontSize: 8, color: "#8b6914", letterSpacing: 1, marginBottom: 4 }}>ПРОМОКОД — 7 ДНЕЙ БЕСПЛАТНО</div>
                  <div 
                    className="hub-promo-code"
                    onClick={() => { navigator.clipboard?.writeText("WARONIA"); haptic("light"); }}
                  >
                    WARONIA
                  </div>
                  <div className="font-typewriter" style={{ fontSize: 8, color: "#6b4c1e" }}>Нажмите для копирования</div>
                </div>

                {/* Реферальный счётчик */}
                {referralCount > 0 && (
                  <div className="font-typewriter" style={{ fontSize: 9, color: "#6b4c1e", textAlign: "center", letterSpacing: 0.5 }}>
                    👥 Вы привели {referralCount} {referralCount === 1 ? "игрока" : "игроков"}
                  </div>
                )}

                {/* CTA кнопка */}
                <button onClick={openVepean} className="btn-hub-cta">
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
                }} className="btn-hub-secondary">
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
