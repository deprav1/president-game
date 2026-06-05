import { useState, useRef, useCallback, useEffect } from "react";
import { PARAMS } from "./data/params.js";
import { ADVISORS } from "./data/advisors.js";
import { CARDS, CRISIS_CARDS, ELECTION_CARD, MONTHS } from "./data/cards.js";
import { CHAINS, getTriggeredChain, getExtremumEvent } from "./data/chains.js";
import { ENDINGS, getVictoryEnding } from "./data/endings.js";
import { NARUZHU_CARDS } from "./data/naruzhuCards.js";
import { EXTRA_CARDS } from "./data/extraCards.js";
import { getAsset } from "./lib/assets.js";
import { safeInt, validateSave, scaleStatEffect, shuffle, telegramVersionAtLeast } from "./lib/gameHelpers.js";
import FactionIcon from "./components/FactionIcon.jsx";
import Topbar from "./components/Topbar.jsx";
import OnboardingScreen from "./components/OnboardingScreen.jsx";
import GameOverScreen from "./components/GameOverScreen.jsx";
import VictoryScreen from "./components/VictoryScreen.jsx";
import ElectionScreen from "./components/ElectionScreen.jsx";
import SecondChanceScreen from "./components/SecondChanceScreen.jsx";
import StatPill from "./components/StatPill.jsx";
import ChoiceEffectRow from "./components/ChoiceEffectRow.jsx";
import AchievementsList from "./components/AchievementsList.jsx";
import DecisionLog from "./components/DecisionLog.jsx";
import { ACHIEVEMENTS_DEF } from "./data/achievements.js";
import { telegramStorage } from "./utils/telegramStorage.js";
import "./App.css";

const WOOD_BG   = `url("${getAsset('/images/game_background.webp')}") center/cover no-repeat`;
const FELT_BG   = `radial-gradient(circle at 50% 22%,#0e0e0e 0%,#080808 48%,#040404 100%)`;
const CRISIS_BG = `radial-gradient(circle at 50% 22%,#1a0000 0%,#0e0303 50%,#060202 100%)`;

// Бренд-цвета «Наружу»: чёрный + неоновый жёлтый
const NARUZHU_YELLOW = "#FFD60A";

// A/B-тест текста CTA-кнопки «Наружу» на карте.
const CTA_VARIANTS = [
  { id: "exit",     label: "🌐 VPN Наружу — выйти из Варонии" },
  { id: "download", label: "🌐 Скачать VPN Наружу бесплатно" },
  { id: "bypass",   label: "🔓 Обойти блокировку — VPN Наружу" },
];

// Собираем общую колоду: базовые + дополнительные + Наружу-карты
const ALL_CARDS = [...CARDS, ...EXTRA_CARDS, ...NARUZHU_CARDS];

// ─── ГЛАВНЫЙ КОМПОНЕНТ ────────────────────────────────────────────────────────
export default function ThePresident() {
  // Значение не читается в UI; оставляем только сеттер (флаг инициализации).
  const [, setIsInitializing] = useState(true);

  const [stats, setStats]               = useState({ oligarchs:50, army:50, people:50, west:50 });
  const [months, setMonths]             = useState(1);
  const [deck, setDeck]                 = useState(() => shuffle(ALL_CARDS));
  const [cardIdx, setCardIdx]           = useState(0);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [phase, setPhase]               = useState("onboarding");
  const [deathMsg, setDeathMsg]         = useState("");
  const [hovered, setHovered]           = useState(null);
  const [flashParams, setFlashParams]   = useState({});
  const [isCrisis, setIsCrisis]         = useState(false);
  const [crisisCard, setCrisisCard]     = useState(null);
  const [termsCompleted, setTermsCompleted] = useState(0);
  const [hasUsedSecondChance, setHasUsedSecondChance] = useState(false);
  const [rescueCard, setRescueCard]     = useState(null);
  const [presidentName, setPresidentName] = useState("");
  const [nameInput, setNameInput]         = useState("");
  const [achievements, setAchievements]   = useState([]);
  const [showHub, setShowHub]             = useState(false);
  const [bestScore, setBestScore]         = useState(0);
  const [referralCount, setReferralCount] = useState(0);
  const [promoCode, setPromoCode]         = useState(null);
  const [ctaVariant, setCtaVariant]       = useState(CTA_VARIANTS[0]);
  const [decisionLog, setDecisionLog]     = useState([]);
  const [unlockedEndings, setUnlockedEndings] = useState([]);

  useEffect(() => {
    async function loadData() {
      const keys = ["varon_save", "varon_cta_ab", "varon_pname", "varon_ach", "varon_best", "varon_refs", "varon_ends"];
      const data = await telegramStorage.getItems(keys);
      
      let savedRun = null;
      try { savedRun = validateSave(JSON.parse(data["varon_save"] || "null")); } catch {}

      if (savedRun) {
        setStats(savedRun.stats || { oligarchs:50, army:50, people:50, west:50 });
        setMonths(savedRun.months || 1);
        setDeck(savedRun.deck);
        setCardIdx(savedRun.cardIdx || 0);
        setPendingEvents(savedRun.pendingEvents || []);
        setPhase(savedRun.phase || "card");
        setTermsCompleted(savedRun.termsCompleted || 0);
        setHasUsedSecondChance(savedRun.hasUsedSecondChance || false);
        setRescueCard(savedRun.rescueCard || null);
      }

      setPresidentName(data["varon_pname"] || "");
      try { setAchievements(JSON.parse(data["varon_ach"] || "[]")); } catch {}
      setBestScore(safeInt(data["varon_best"]));
      
      let refs = safeInt(data["varon_refs"]);
      const tg = window.Telegram?.WebApp;
      const startParam = tg?.initDataUnsafe?.start_param || "";
      if (startParam.startsWith("ref_")) {
        refs += 1;
        telegramStorage.setItem("varon_refs", String(refs));
      }
      setReferralCount(refs);

      try { setUnlockedEndings(JSON.parse(data["varon_ends"] || "[]")); } catch {}

      let ctaAb = data["varon_cta_ab"];
      let foundCta = CTA_VARIANTS.find(v => v.id === ctaAb);
      if (!foundCta) {
        foundCta = CTA_VARIANTS[Math.floor(Math.random() * CTA_VARIANTS.length)];
        telegramStorage.setItem("varon_cta_ab", foundCta.id);
      }
      setCtaVariant(foundCta);

      setIsInitializing(false);
    }
    loadData();
  }, []);

  const touchStart = useRef(null);
  const choosing   = useRef(false);
  const swipeTriggered = useRef(false);
  const cardRef    = useRef(null);
  const lastDirRef = useRef(null);

  const haptic = useCallback((type = "light") => {
    const tg = window.Telegram?.WebApp;
    if (!telegramVersionAtLeast(tg, "6.1")) return;
    try { tg?.HapticFeedback?.impactOccurred(type); } catch { /* Telegram haptics are optional outside Mini App. */ }
  }, []);

  const hapticNotify = useCallback((type = "success") => {
    const tg = window.Telegram?.WebApp;
    if (!telegramVersionAtLeast(tg, "6.1")) return;
    try { tg?.HapticFeedback?.notificationOccurred(type); } catch { /* Telegram haptics are optional outside Mini App. */ }
  }, []);

  const unlockAchievement = useCallback((id) => {
    setAchievements(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      telegramStorage.setItem("varon_ach", JSON.stringify(next));
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
    if (typeof tg.requestFullscreen === "function" && telegramVersionAtLeast(tg, "8.0")) {
      try { tg.requestFullscreen(); } catch { /* Older Telegram clients can expose unsupported methods. */ }
      setTimeout(() => {
        try { tg.requestFullscreen(); } catch { /* Older Telegram clients can expose unsupported methods. */ }
      }, 500);
    }

    // Safe-area: в фуллскрине Telegram топбар уезжает под системные кнопки
    // (закрыть/свернуть/время). Считаем верхний отступ = device safe-area +
    // Telegram content-инсет и прокидываем в CSS-переменную --tg-safe-top.
    const applyInsets = () => {
      const sa = tg.safeAreaInset || {};
      const csa = tg.contentSafeAreaInset || {};
      const top = (sa.top || 0) + (csa.top || 0);
      document.documentElement.style.setProperty("--tg-safe-top", `${top}px`);
    };
    applyInsets();
    try {
      tg.onEvent?.("safeAreaChanged", applyInsets);
      tg.onEvent?.("contentSafeAreaChanged", applyInsets);
      tg.onEvent?.("fullscreenChanged", applyInsets);
    } catch { /* Старые клиенты без этих событий. */ }
    return () => {
      try {
        tg.offEvent?.("safeAreaChanged", applyInsets);
        tg.offEvent?.("contentSafeAreaChanged", applyInsets);
        tg.offEvent?.("fullscreenChanged", applyInsets);
      } catch { /* no-op */ }
    };
  }, []);

  // Предзагрузка всех портретов и фонов карт на старте — свайп без мерцания.
  // Картинки в WebP лёгкие (~10-60 КБ), суммарно безопасно для Mini App.
  useEffect(() => {
    const urls = new Set();
    ADVISORS.forEach(a => a?.avatar && urls.add(getAsset(a.avatar)));
    [...CARDS, ...CRISIS_CARDS].forEach(c => c?.bgImage && urls.add(getAsset(c.bgImage)));
    urls.forEach(src => { const img = new Image(); img.src = src; });
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
      const val = fx[p.key] || 0;
      const scaled = scaleStatEffect(p.key, val);
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
      if (score > bestScore) { setBestScore(score); telegramStorage.setItem("varon_best", String(score)); }
      telegramStorage.removeItem("varon_save");
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
          agreeText = "Ввести танки (Силовики ↑, Народ ↑, Запад ↓)";
          rescueFx = { army: 20, oligarchs: 0, people: 25, west: -30 };
        } else {
          advisorId = 1; // Громов
          rescueText = "🚨 ВТОРОЙ ШАНС (Народная диктатура): Ваша популярность пугает элиты. Громов предупреждает, что генералы готовят заговор, чтобы вас сместить. Он предлагает устроить показательные аресты оппозиции, чтобы успокоить силовиков.";
          agreeText = "Арестовать оппозицию (Народ ↓, Силовики ↑, Запад ↓)";
          rescueFx = { army: 15, oligarchs: 0, people: -25, west: -15 };
        }
      } else if (paramKey === "oligarchs") {
        if (isLow) {
          advisorId = 7; // Хан
          rescueText = "🚨 ВТОРОЙ ШАНС (Саботаж бизнеса): Крупный бизнес прекратил инвестиции и объявил локаут. Страна на грани коллапса. Хан предлагает передать ему управление морским портом в обмен на экстренное финансирование.";
          agreeText = "Передать порты Хану (Олигархи ↑, Запад ↓, Силовики ↓)";
          rescueFx = { oligarchs: 25, army: -10, people: 0, west: -15 };
        } else {
          advisorId = 0; // Зубов
          rescueText = "🚨 ВТОРОЙ ШАНС (Засилье бизнеса): Олигархи скупили все ключевые ведомства и диктуют свои законы. Зубов предлагает провести принудительную национализацию части активов Хана ради спасения суверенитета.";
          agreeText = "Национализировать активы (Олигархи ↓, Народ ↑, Запад ↓)";
          rescueFx = { oligarchs: -25, army: 0, people: 15, west: -10 };
        }
      } else if (paramKey === "army") {
        if (isLow) {
          advisorId = 3; // Сенин
          rescueText = "🚨 ВТОРОЙ ШАНС (Бунт силовиков): Армия развалена, офицеры дезертируют, Громов потерял контроль. Сенин предлагает передать спецслужбам КГБ полный контроль над границами и базами снабжения.";
          agreeText = "Отдать контроль КГБ (Силовики ↑, Олигархи ↓, Народ ↓)";
          rescueFx = { army: 25, oligarchs: -15, people: -10, west: 0 };
        } else {
          advisorId = 6; // Стрельцова
          rescueText = "🚨 ВТОРОЙ ШАНС (Военная хунта): Генерал Громов фактически контролирует все министерства и готовит приказ о вашем аресте. Стрельцова требует немедленно отстранить верхушку генералитета и начать расследования.";
          agreeText = "Уволить генералов (Силовики ↓, Народ ↓, Запад ↓)";
          rescueFx = { army: -25, oligarchs: 0, people: -15, west: -10 };
        }
      } else if (paramKey === "west") {
        if (isLow) {
          advisorId = 4; // Хартли
          rescueText = "🚨 ВТОРОЙ ШАНС (Полная изоляция): Экономика задушена западными санкциями, резервы заморожены. Хартли предлагает экстренно подписать кабальное соглашение об ассоциации в обмен на финансовую помощь МВФ.";
          agreeText = "Подписать соглашение (Запад ↑, Народ ↑, Силовики ↓)";
          rescueFx = { west: 25, army: -15, people: 10, oligarchs: 0 };
        } else {
          advisorId = 3; // Сенин
          rescueText = "🚨 ВТОРОЙ ШАНС (Потеря суверенитета): Западные советники диктуют состав правительства. Варония теряет независимость. Сенин предлагает ввести санкционный мораторий и выслать западных кураторов.";
          agreeText = "Выслать кураторов (Запад ↓, Силовики ↑, Народ ↓)";
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
        telegramStorage.setItem("varon_save", JSON.stringify({
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
          telegramStorage.setItem("varon_save", JSON.stringify({
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
        if (score > bestScore) { setBestScore(score); telegramStorage.setItem("varon_best", String(score)); }
        telegramStorage.removeItem("varon_save");
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
        fx = { oligarchs: 5, army: 15, people: -11, west: -22 };
        tacticLabel = "Административный ресурс";
      } else if (side === "sponsor") {
        fx = { oligarchs: 18, army: 0, people: -6, west: -8 };
        tacticLabel = "Сделка с олигархами";
      } else {
        hapticNotify("error");
        setDeathMsg("Вы отказались от участия в выборах и добровольно ушли на покой. В Варонии наступила новая эпоха.");
        const score = months - 1;
        if (score > bestScore) { setBestScore(score); telegramStorage.setItem("varon_best", String(score)); }
        telegramStorage.removeItem("varon_save");
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
        if (score > bestScore) { setBestScore(score); telegramStorage.setItem("varon_best", String(score)); }
        if (score >= 96)      setPromoCode({ code: "WARONIA30", days: 30 });
        else if (score >= 48) setPromoCode({ code: "WARONIA14", days: 14 });
        else                  setPromoCode({ code: "WARONIA7",  days: 7  });
        telegramStorage.removeItem("varon_save");
        
        const endObj = getVictoryEnding(ns, score);
        setUnlockedEndings(prev => {
          if (prev.includes(endObj.id)) return prev;
          const next = [...prev, endObj.id];
          telegramStorage.setItem("varon_ends", JSON.stringify(next));
          return next;
        });
        unlockAchievement("victory");
        setPhase("victory");
        return;
      }

      setPhase("card");
      setIsCrisis(false);

      try {
        telegramStorage.setItem("varon_save", JSON.stringify({
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
    // Анимация вылета карточки — напрямую через DOM
    if (cardRef.current) {
      cardRef.current.style.transition = "transform 0.35s cubic-bezier(0.4,0,1,1), opacity 0.35s ease";
      cardRef.current.style.transform = `translateX(${side === "left" ? "-115%" : "115%"}) rotate(${side === "left" ? "-10deg" : "10deg"})`;
      cardRef.current.style.opacity = "0";
    }

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
      if (chainId === "ds_arc_4_soft_end") unlockAchievement("naruzhu_open");

      // Наказание за экстремум: фракция у потолка пытается перехватить власть.
      const extremum = getExtremumEvent(ns, newPending);
      if (extremum) newPending.push({ ...extremum, triggerMonth: newMonth + extremum.delay });

      const firedIdx = newPending.findIndex(e => e.triggerMonth <= newMonth);
      let chainCard  = null;
      if (firedIdx >= 0) {
        chainCard = newPending[firedIdx].card;
        newPending.splice(firedIdx, 1);
      }
      setPendingEvents(newPending);
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
        telegramStorage.setItem("varon_save", JSON.stringify({
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

  const onTouchStart = e => {
    touchStart.current = e.touches[0].clientX;
    // Сбрасываем transition сразу — чтобы драг шёл без анимации
    if (cardRef.current) cardRef.current.style.transition = "none";
  };
  const onTouchMove  = e => {
    if (touchStart.current == null) return;
    const dx = e.touches[0].clientX - touchStart.current;
    // Прямое обновление DOM — без React-рендера на каждый кадр
    if (cardRef.current) {
      cardRef.current.style.transform = `translateX(${dx * 0.45}px) rotate(${dx * 0.04}deg)`;
    }
    const newDir = dx < -30 ? "left" : dx > 30 ? "right" : null;
    // setHovered только при смене направления — иначе бесполезный ре-рендер
    if (newDir !== lastDirRef.current) {
      lastDirRef.current = newDir;
      setHovered(newDir);
    }
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
    lastDirRef.current = null;
    if (Math.abs(dx) > 65) {
      choose(dx < 0 ? "left" : "right");
    } else {
      // Snap-back через DOM, без React-рендера
      if (cardRef.current) {
        cardRef.current.style.transition = "transform 0.25s ease";
        cardRef.current.style.transform = "";
      }
      setHovered(null);
    }
  };

  // Сброс inline-стилей карточки при смене карты — чтобы новая не наследовала transform/opacity от анимации вылета
  useEffect(() => {
    if (cardRef.current) {
      cardRef.current.style.transform = "";
      cardRef.current.style.transition = "";
      cardRef.current.style.opacity = "";
    }
  }, [cardIdx, isCrisis]);

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
    telegramStorage.setItem("varon_pname", name);
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
    setIsCrisis(false);
    setCrisisCard(null);
    setTermsCompleted(0);
    setPendingEvents([]);
    setDecisionLog([]);
    setHasUsedSecondChance(false);
    setRescueCard(null);
    choosing.current = false;
    telegramStorage.removeItem("varon_save");
  };

  // Открытие лендинга «Наружу» с сегментированной UTM-разметкой,
  // чтобы различать источник клика (онбординг / карта / хаб), конкретную карту,
  // прогресс игрока и выданный промокод для атрибуции конверсий.
  const openNaruzhu = (source = "hub", content = "") => {
    const params = new URLSearchParams({
      utm_source: "varonia",
      utm_medium: "game",
      utm_campaign: source,
    });
    if (content) params.set("utm_content", content);
    params.set("m", String(Math.max(0, months - 1)));
    if (ctaVariant?.id) params.set("ab", ctaVariant.id);
    if (promoCode?.code) params.set("promo", promoCode.code);
    const url = `https://naruzhu.am/?${params.toString()}`;
    if (window.Telegram?.WebApp) window.Telegram.WebApp.openLink(url);
    else window.open(url, "_blank");
  };

  const tenure      = months - 1;
  const tenureLabel = tenure < 6 ? "КАТАСТРОФА" : tenure < 24 ? "ПРОВАЛ" : tenure < 48 ? "СЛАБО" : tenure < 96 ? "НЕПЛОХО" : tenure < 144 ? "КРЕПКИЙ ЛИДЕР" : "ЛЕГЕНДА";
  const ending      = phase === "victory" ? getVictoryEnding(stats, tenure) : null;
  const cardBg      = isCrisis ? CRISIS_BG : FELT_BG;
  const cardPaperBg = isCrisis
    ? "linear-gradient(160deg,#140000 0%,#1a0000 50%,#140000 100%)"
    : "linear-gradient(160deg,#0e0e0e 0%,#0a0a0a 50%,#070707 100%)";
  const cardTextColor = isCrisis ? "#f0c0c0" : "#e0d8c8";
  const headerBg    = isCrisis
    ? "linear-gradient(to right,#2a0000,#1a0000,#2a0000)"
    : "linear-gradient(to right,#141008,#0c0a04,#141008)";

  // Превью с реальным сбалансированным масштабом
  const previewFxReal = hovered && currentCard
    ? Object.fromEntries(PARAMS.map(p => [p.key, scaleStatEffect(p.key, currentCard[hovered].fx[p.key] || 0)]))
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
      <div className="app-shell" style={{ background: WOOD_BG }}>
        <div className="top-line" />

        {/* ── ХЭДЕР ── */}
        <Topbar
          isCrisis={isCrisis}
          presidentName={presidentName}
          monthName={monthName}
          year={year}
          phase={phase}
          onHubOpen={() => { haptic("light"); setShowHub(true); }}
        />

        {/* ── ШКАЛЫ ── */}
        <div className="stats-panel">
          {PARAMS.map(p => <StatPill key={p.key} param={p} value={stats[p.key]} flash={!!flashParams[p.key]}/>)}
        </div>

        {/* ════════════════════════════════ ОНБОРДИНГ ════════════════════════════════ */}
        {phase === "onboarding" && (
          <OnboardingScreen
            presidentName={presidentName}
            nameInput={nameInput}
            onNameInput={setNameInput}
            onNameSubmit={handleNameSubmit}
            onNewTerm={() => { haptic("medium"); setPhase("card"); }}
            onPlayAsOther={() => { haptic("light"); setPresidentName(""); telegramStorage.removeItem("varon_pname"); }}
            onNaruzhu={() => openNaruzhu("onboarding")}
          />
        )}

        {/* ════════════════════════════════ GAME OVER ════════════════════════════════ */}
        {phase === "gameover" && (
          <GameOverScreen
            tenure={tenure}
            tenureLabel={tenureLabel}
            deathMsg={deathMsg}
            stats={stats}
            achievements={achievements}
            decisionLog={decisionLog}
            onShare={shareGameOver}
            onRestart={restart}
          />
        )}

        {/* ════════════════════════════════ ПОБЕДА ════════════════════════════════ */}
        {phase === "victory" && (
          <VictoryScreen
            tenure={tenure}
            ending={ending}
            stats={stats}
            achievements={achievements}
            decisionLog={decisionLog}
            promoCode={promoCode}
            onCopyPromo={() => { navigator.clipboard?.writeText(promoCode.code); haptic("light"); }}
            onShare={shareVictory}
            onRestart={restart}
          />
        )}

        {/* ════════════════════════════════ ВЫБОРЫ ════════════════════════════════ */}
        {phase === "election" && (
          <ElectionScreen peopleStat={stats.people} onChoose={choose} />
        )}

        {/* ════════════════════════════════ ВТОРОЙ ШАНС ════════════════════════════════ */}
        {phase === "second_chance" && rescueCard && (
          <SecondChanceScreen rescueCard={rescueCard} onChoose={choose} />
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
                  background: "rgba(10, 5, 0, 0.65)",
                  padding: "2px 8px",
                  borderRadius: 6,
                  border: `1px solid ${previewFxReal[p.key] > 0 ? "rgba(39, 174, 96, 0.3)" : "rgba(192, 57, 43, 0.3)"}`,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.3)"
                }}>
                  <FactionIcon type={p.key} className="preview-effect-icon" />
                  <span style={{ fontWeight: 700 }}>
                    {previewFxReal[p.key] > 0 ? "+" : "−"}
                  </span>
                </span>
              ))}
            </div>

            <div
              ref={cardRef}
              style={{ flex:1, minHeight:0, animation:"cardIn 0.3s ease", position:"relative", touchAction:"pan-y", willChange:"transform" }}
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
                    <div style={{ fontSize:10, color:"#d4af3799", fontFamily:"var(--font-typewriter)", letterSpacing:0.5 }}>{advisor.role}</div>
                  </div>
                </div>

                {/* Текст карты */}
                <div style={{ flex:1, padding:"16px 18px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", position:"relative" }}>
                  {currentCard.bgImage && (
                    <div style={{
                      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                      backgroundImage: `url(${getAsset(currentCard.bgImage)})`,
                      backgroundSize: "cover", backgroundPosition: "center",
                      opacity: 0.22, zIndex: 0, pointerEvents: "none"
                    }} />
                  )}
                  <img src={getAsset(advisor.avatar)} className="card-advisor-avatar" alt="" style={{ zIndex: 1 }} />
                  {hovered && (
                    <div style={{
                      position:"absolute", top:12, left:"50%", transform:`translateX(-50%) rotate(${hovered === "left" ? "-6deg" : "6deg"})`,
                      zIndex:10, border:`2px solid ${hovered === "left" ? "#4ade80" : "#ff756b"}`,
                      borderRadius:6, padding:"4px 14px",
                      color:hovered === "left" ? "#4ade80" : "#ff756b",
                      fontFamily:"var(--font-sans)", fontSize:15, letterSpacing:1.5, fontWeight:700,
                      opacity:0.93, animation:"fadeIn 0.15s ease", pointerEvents:"none",
                      background:"rgba(0,0,0,0.75)", whiteSpace:"nowrap",
                    }}>
                      {hovered === "left" ? currentCard.left.label.toUpperCase() : currentCard.right.label.toUpperCase()}
                    </div>
                  )}
                  <p style={{ fontSize:16, lineHeight:1.55, color:cardTextColor, fontWeight:500, textAlign:"center", letterSpacing:0.1, zIndex: 1 }}>
                    {currentCard.text}
                  </p>
                  {currentCard.cta === "naruzhu" && (
                    <button
                      onClick={e => { e.stopPropagation(); haptic("light"); openNaruzhu("card", currentCard?.id || "card"); }}
                      style={{
                        display:"flex", alignItems:"center", justifyContent:"center", gap:5,
                        margin:"10px auto 0", padding:"5px 14px", borderRadius:999,
                        background:"rgba(15,10,0,0.82)",
                        border:`1px solid ${NARUZHU_YELLOW}88`,
                        cursor:"pointer", color:NARUZHU_YELLOW,
                        fontSize:11, fontFamily:"var(--font-mono)", letterSpacing:0.6,
                        fontWeight:700,
                        boxShadow:`0 0 12px ${NARUZHU_YELLOW}22`,
                      }}
                    >
                      {ctaVariant.label}
                    </button>
                  )}
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
                        border:`1px solid ${hovered === side ? "#d4af37" : "#c9a84c44"}`,
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

            <div style={{ textAlign:"center", marginTop:8, flexShrink:0, fontSize:11, color:"#d4af3788", fontFamily:"var(--font-mono)", letterSpacing:1.5, fontWeight:500 }}>
              ← СВАЙП ИЛИ ТАП →
            </div>
          </div>
        )}

        <div className="top-line bottom" />

        {/* ════════ VPN НАРУЖУ HUB — ПОКИНУТЬ ВАРОНИЮ ════════ */}
        {showHub && (
          <div className="hub-overlay" onClick={() => setShowHub(false)}>
            <div className="hub-card" onClick={e => e.stopPropagation()}>

              {/* ── Hub header ── */}
              <div className="hub-card-header">
                <div>
                  <div className="font-typewriter" style={{ fontSize: 14, fontWeight: 700, color: NARUZHU_YELLOW, letterSpacing: 2 }}>
                    🚪 ПОКИНУТЬ ВАРОНИЮ
                  </div>
                  <div className="font-typewriter" style={{ fontSize: 10, color: "#caa23a", letterSpacing: 0.5, marginTop: 2 }}>
                    VPN Наружу — свобода без блокировок
                  </div>
                </div>
                <button onClick={() => setShowHub(false)} style={{ background:"none", border:"none", color:"#6b4c1e", fontSize:16, cursor:"pointer", padding:4 }}>✕</button>
              </div>

              <div className="hub-card-body">

                {/* ── Рекорд ── */}
                <div className="hub-stats-panel">
                  <div>
                    <div className="font-typewriter" style={{ fontSize: 10, color: "#b89a5e", letterSpacing: 1 }}>ВАШ РЕКОРД</div>
                    <div className="font-typewriter" style={{ fontSize: 20, fontWeight: 700, color: "#d4af37", marginTop: 2 }}>{bestScore} <span style={{ fontSize: 10 }}>МЕС.</span></div>
                  </div>
                  <div style={{ fontSize: 24 }}>🏆</div>
                </div>

                {/* ── Достижения ── */}
                {achievements.length > 0 && (
                  <div className="hub-section">
                    <div className="font-typewriter" style={{ fontSize: 10, color: "#b89a5e", letterSpacing: 1 }}>ДОСТИЖЕНИЯ</div>
                    <div className="hub-grid">
                      {ACHIEVEMENTS_DEF.map(a => {
                        const hasAch = achievements.includes(a.id);
                        return (
                          <div key={a.id} title={a.desc} className={`hub-grid-item ${hasAch ? "active" : "inactive"}`}>
                            <span style={{ fontSize: 12 }}>{a.icon}</span>
                            {hasAch && <span className="font-typewriter" style={{ fontSize: 10, color: "#d4af37", letterSpacing: 0.5 }}>{a.label}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Хроника финалов ── */}
                <div className="hub-section">
                  <div className="font-typewriter" style={{ fontSize: 10, color: "#b89a5e", letterSpacing: 1 }}>ХРОНИКА ПРАВЛЕНИЙ</div>
                  <div className="hub-grid">
                    {Object.values(ENDINGS).map(e => {
                      const unlocked = unlockedEndings.includes(e.id);
                      return (
                        <div key={e.id} title={unlocked ? `${e.title} — ${e.subtitle}` : "Не открыто"} className={`hub-grid-item ${unlocked ? "active" : "inactive"}`}>
                          <span style={{ fontSize: 12 }}>{e.icon}</span>
                          {unlocked && <span className="font-typewriter" style={{ fontSize: 10, color: "#d4af37", letterSpacing: 0.5 }}>{e.title}</span>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="font-typewriter" style={{ fontSize: 10, color: "#b89a5e", marginTop: 6, letterSpacing: 0.5 }}>
                    {unlockedEndings.length} из {Object.keys(ENDINGS).length} финалов открыто
                  </div>
                </div>

                {/* ── VPN Наружу — что это ── */}
                <div className="hub-naruzhu-pitch">
                  <div className="font-typewriter" style={{ fontSize: 10, color: NARUZHU_YELLOW, letterSpacing: 1.5, marginBottom: 8, fontWeight: 700 }}>
                    🔒 VPN НАРУЖУ — РЕАЛЬНЫЙ МИР
                  </div>
                  {[
                    "YouTube, Instagram, Wikipedia без блокировок",
                    "Без логов — ваш трафик никто не видит",
                    "60+ стран, до 5 устройств одновременно",
                    "Работает даже при замедлении Чебунета",
                  ].map((feat, i) => (
                    <div key={i} className="hub-feature-row">
                      <span style={{ color: NARUZHU_YELLOW, fontWeight: 700 }}>▶</span>
                      <span className="font-typewriter" style={{ fontSize: 11, color: "#c4a882", lineHeight: 1.4 }}>{feat}</span>
                    </div>
                  ))}
                </div>

                {/* ── Промокод ── */}
                <div className="hub-promo-box">
                  <div className="font-typewriter" style={{ fontSize: 10, color: "#caa23a", letterSpacing: 1, marginBottom: 4 }}>
                    🎁 ПРОМОКОД — 7 ДНЕЙ БЕСПЛАТНО
                  </div>
                  <div
                    className="hub-promo-code"
                    onClick={() => { navigator.clipboard?.writeText("WARONIA"); haptic("light"); }}
                  >
                    WARONIA
                  </div>
                  <div className="font-typewriter" style={{ fontSize: 10, color: "#b89a5e" }}>
                    Нажмите для копирования · <span style={{ color: NARUZHU_YELLOW }}>naruzhu.am</span>
                  </div>
                </div>

                {/* ── Реферальный счётчик ── */}
                {referralCount > 0 && (
                  <div className="font-typewriter" style={{ fontSize: 11, color: "#b89a5e", textAlign: "center", letterSpacing: 0.5 }}>
                    👥 Вы привели {referralCount} {referralCount === 1 ? "игрока" : "игроков"}
                  </div>
                )}

                {/* ── CTA кнопка ── */}
                <button onClick={() => openNaruzhu("hub")} className="btn-hub-cta">
                  🌐 ОТКРЫТЬ VPN НАРУЖУ →
                </button>

                {/* ── Реферальная ссылка ── */}
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
