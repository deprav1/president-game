import { useState, useRef, useCallback, useEffect } from "react";
import { PARAMS } from "./data/params.js";
import { ADVISORS } from "./data/advisors.js";
import { CARDS, CRISIS_CARDS, ELECTION_CARD, MONTHS } from "./data/cards.js";
import { CHAINS, getTriggeredChain, getExtremumEvent } from "./data/chains.js";
import { ENDINGS, getVictoryEnding } from "./data/endings.js";
import { NARUZHU_CARDS } from "./data/naruzhuCards.js";
import { EXTRA_CARDS } from "./data/extraCards.js";
import "./App.css";

const getAsset = (path) => {
  const base = import.meta.env.BASE_URL || '/';
  return base + path.replace(/^\//, '');
};

/** Безопасный parseInt — защита от NaN при мусорном значении в localStorage. */
const safeInt = (raw, fallback = 0) => {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Валидирует объект сохранения из localStorage.
 * Возвращает save если структура корректна, иначе null — это предотвращает
 * краш при доступе к deck.length или rescueCard.agreeText на повреждённых данных.
 */
const validateSave = (save) => {
  if (!save || typeof save !== "object") return null;
  if (!Array.isArray(save.deck) || save.deck.length === 0) return null;
  const s = save.stats;
  if (!s || typeof s !== "object") return null;
  const statKeys = ["oligarchs", "army", "people", "west"];
  if (statKeys.some(k => typeof s[k] !== "number" || s[k] < 0 || s[k] > 100)) return null;
  if (typeof save.months !== "number" || save.months < 1) return null;
  if (typeof save.cardIdx !== "number" || save.cardIdx < 0) return null;
  if (!Array.isArray(save.pendingEvents)) return null;
  if (save.rescueCard != null) {
    const rc = save.rescueCard;
    if (typeof rc.agreeText !== "string" || !rc.agreeText) return null;
    if (!rc.fx || typeof rc.fx !== "object") return null;
    if (!rc.targetStats || typeof rc.targetStats !== "object") return null;
    if (typeof rc.targetMonth !== "number") return null;
  }
  return save;
};

/** 
 * Масштабирует эффект изменения параметра с учетом гейм-дизайнерского баланса.
 * 1. Снижает общую волатильность шкал (базовый множитель 0.95 вместо 1.2), чтобы увеличить длительность игры.
 * 2. Усложняет накопление лояльности народа (people): 
 *    - рост лояльности умножается на 0.7 (народ медленно проникается доверием);
 *    - падение лояльности умножается на 1.15 (народ быстро разочаровывается и бунтует).
 */
const scaleStatEffect = (key, val) => {
  if (!val) return 0;
  if (key === "people") {
    // Асимметричный баланс для Населения
    const mult = val > 0 ? 0.75 : 1.08;
    return Math.round(val * mult);
  }
  // Базовый сбалансированный множитель для остальных фракций
  return Math.round(val * 0.95);
};

const WOOD_BG   = `url("${getAsset('/images/game_background.webp')}") center/cover no-repeat`;
const FELT_BG   = `radial-gradient(circle at 50% 22%,#2a1208 0%,#160a04 48%,#080402 100%)`;
const CRISIS_BG = `radial-gradient(circle at 50% 22%,#360404 0%,#1c0303 50%,#0a0202 100%)`;

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

const shuffle = a => {
  const copy = [...a];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const telegramVersionAtLeast = (tg, version) => (
  typeof tg?.isVersionAtLeast !== "function" || tg.isVersionAtLeast(version)
);

// ─── КОМПОНЕНТ ШКАЛЫ ──────────────────────────────────────────────────────────
function FactionIcon({ type, className = "", style }) {
  const shared = {
    className,
    style,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
    focusable: "false",
  };

  if (type === "oligarchs") {
    return (
      <svg {...shared}>
        <path d="M12 3.5 19 9l-7 11.5L5 9l7-5.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M5 9h14M8.2 9 12 20.5 15.8 9M9.4 6.2h5.2" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 3.5 14.6 9H9.4L12 3.5Z" fill="currentColor" opacity="0.22" />
      </svg>
    );
  }

  if (type === "army") {
    return (
      <svg {...shared}>
        <path d="M12 3.4 18.5 6v5.4c0 4.1-2.45 7.15-6.5 9.2-4.05-2.05-6.5-5.1-6.5-9.2V6L12 3.4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M8.7 11.3 11 13.6l4.5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 5.6v12.2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.42" />
      </svg>
    );
  }

  if (type === "people") {
    return (
      <svg {...shared}>
        <path d="M12 11.1a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" stroke="currentColor" strokeWidth="1.55" />
        <path d="M6.8 19.2c.55-3.25 2.35-5.05 5.2-5.05s4.65 1.8 5.2 5.05" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />
        <path d="M5.9 12.6a2.3 2.3 0 1 0-.1-4.6 2.3 2.3 0 0 0 .1 4.6ZM18.1 12.6a2.3 2.3 0 1 0 .1-4.6 2.3 2.3 0 0 0-.1 4.6Z" stroke="currentColor" strokeWidth="1.35" opacity="0.85" />
        <path d="M2.9 18.1c.35-2.35 1.6-3.7 3.6-3.85M21.1 18.1c-.35-2.35-1.6-3.7-3.6-3.85" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" opacity="0.85" />
      </svg>
    );
  }

  if (type === "west") {
    return (
      <svg {...shared}>
        <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.65" />
        <path d="M3.8 12h16.4M12 3.8c2.15 2.15 3.2 4.85 3.2 8.2s-1.05 6.05-3.2 8.2M12 3.8C9.85 5.95 8.8 8.65 8.8 12s1.05 6.05 3.2 8.2" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
        <path d="M5.6 7.2c1.75.8 3.9 1.2 6.4 1.2s4.65-.4 6.4-1.2M5.6 16.8c1.75-.8 3.9-1.2 6.4-1.2s4.65.4 6.4 1.2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.58" />
      </svg>
    );
  }

  return (
    <svg {...shared}>
      <path d="M12 3.4 14.35 8l5.05.75-3.7 3.58.88 5.03L12 14.98 7.42 17.36l.88-5.03-3.7-3.58L9.65 8 12 3.4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7.1 11.4H3.3c1.2 1.55 2.75 2.55 4.65 3M16.9 11.4h3.8c-1.2 1.55-2.75 2.55-4.65 3" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 3.4 13.35 8h-2.7L12 3.4Z" fill="currentColor" opacity="0.25" />
    </svg>
  );
}

function StatPill({ param, value, flash }) {
  const pct        = Math.max(0, Math.min(100, value));
  const isCritical = pct <= 8  || pct >= 92;
  const isDanger   = pct <= 15 || pct >= 85;
  const isWarning  = !isDanger && (pct <= 28 || pct >= 72);
  const state      = isCritical ? "critical" : isDanger ? "danger" : isWarning ? "warning" : "normal";

  return (
    <div className={`stat-pill ${param.key} ${state}`} style={{ "--param-color": param.color }}>
      <div className="stat-icon-shell">
        <FactionIcon type={param.key} className="stat-vector-icon" />
      </div>
      <div className="stat-track">
        <div className="stat-safe-zone" />
        <div
          className="stat-fill"
          style={{
            width: `${pct}%`,
            animation: flash ? "flashStat 0.5s ease" : isCritical ? "pulse 0.7s infinite" : isDanger ? "pulse 1.5s infinite" : "none",
          }}
        />
        <div className="stat-midline" />
      </div>
      <div className="stat-label">
        {param.label.toUpperCase()}{isCritical ? "!" : ""}
      </div>
    </div>
  );
}

function ChoiceEffectRow({ fx }) {
  const entries = PARAMS
    .map(p => ({ param: p, value: fx[p.key] || 0 }))
    .filter(item => item.value !== 0);

  if (!entries.length) return null;

  return (
    <div className="choice-effect-row">
      {entries.map(({ param, value }) => (
        <span key={param.key} className={`choice-effect-chip ${value > 0 ? "positive" : "negative"}`}>
          <FactionIcon type={param.key} className="choice-effect-icon" />
          <span>{value > 0 ? "+" : "−"}</span>
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
  { id: "naruzhu_open", icon: "🚪", label: "Наружу",            desc: "Завершить арк Цифрового суверенитета открытым финалом" },
];

import { telegramStorage } from "./utils/telegramStorage.js";

// ─── ГЛАВНЫЙ КОМПОНЕНТ ────────────────────────────────────────────────────────
export default function ThePresident() {
  const [isInitializing, setIsInitializing] = useState(true);

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
    ? "linear-gradient(160deg,#1a0000 0%,#2a0000 50%,#1a0000 100%)"
    : "linear-gradient(160deg,#16100a 0%,#0f0a05 50%,#0a0603 100%)";
  const cardTextColor = isCrisis ? "#f5c6c6" : "#ece0c4";
  const headerBg    = isCrisis
    ? "linear-gradient(to right,#4a0000,#3a0000,#4a0000)"
    : "linear-gradient(to right,#2a2008,#1a1404,#2a2008)";

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
        <header className={`game-topbar ${isCrisis ? "crisis" : ""}`}>
          <div className="brand-lockup">
            <div className="brand-mark-shell">
              <FactionIcon type="crest" className="brand-mark" />
            </div>
            <div className="brand-copy">
              <div className="brand-title">ВАРОНИЯ</div>
              <div className="brand-meta">
                {presidentName && <span className="brand-president">{presidentName}</span>}
                <span>{monthName} {year}</span>
                {isCrisis  && <span className="state-alert">КРИЗИС</span>}
                {phase === "election" && <span className="state-election">ВЫБОРЫ</span>}
              </div>
            </div>
          </div>
          {/* Кнопка «Покинуть Варонию» */}
          <button
            onClick={() => { haptic("light"); setShowHub(true); }}
            title="VPN Наружу — покинуть Варонию"
            className="hub-launch"
          >
            <span className="hub-dot" />
            <span className="hub-launch-text">ПОКИНУТЬ<br/>ВАРОНИЮ</span>
          </button>
        </header>

        {/* ── ШКАЛЫ ── */}
        <div className="stats-panel">
          {PARAMS.map(p => <StatPill key={p.key} param={p} value={stats[p.key]} flash={!!flashParams[p.key]}/>)}
        </div>

        {/* ════════════════════════════════ ОНБОРДИНГ ════════════════════════════════ */}
        {phase === "onboarding" && (
          <div className="screen-scroll-container" style={{ background: FELT_BG }}>
            <div className="card-paper-container">
              <div className="card-header-bar">
                <FactionIcon type="crest" className="dossier-brand-mark" />
                <div className="font-display" style={{ fontSize: 20, fontWeight: 900, color: "#f5e6c8" }}>ВАРОНИЯ</div>
                <div className="font-mono" style={{ fontSize: 10, fontWeight: 500, color: "#d4af37bb", marginTop: 3 }}>СЕКРЕТНОЕ ДОСЬЕ · ПРЕЗИДЕНТ</div>
              </div>
              <div className="card-content-area">
                {/* Секретное досье (картинка-плейсхолдер) */}
                <div className="story-image-frame">
                  <img 
                    className="frame-inner-img" 
                    src={getAsset('/images/onboarding_dossier.webp')} 
                    alt="Секретное досье" 
                    onError={e => e.currentTarget.style.display = 'none'} 
                  />
                </div>
                
                <p style={{ fontSize: 15, lineHeight: 1.55, color: "#ece0c4", fontWeight: 600, textAlign: "center", marginBottom: 14, letterSpacing: 0.2 }}>
                  Поздравляем с избранием на пост Президента Республики Варония.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                  {[
                    { key: "oligarchs", text: "Элиты финансируют вас — не разочаруйте их" },
                    { key: "army", text: "Армия защищает вас — пока вы её уважаете" },
                    { key: "people", text: "Народ вас избрал — и может свергнуть" },
                    { key: "west", text: "Запад наблюдает — с деньгами и санкциями" },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "#ece0c40e", borderRadius: 8, padding: "6px 10px", border: "1px solid #c9a84c33" }}>
                      <span className={`intro-icon-shell ${item.key}`}>
                        <FactionIcon type={item.key} className="intro-vector-icon" />
                      </span>
                      <span style={{ fontSize: 11, color: "#d8c8a0", lineHeight: 1.35 }}>{item.text}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: "#8b000011", border: "1px solid #8b000022", borderRadius: 8, padding: "8px 12px", marginBottom: 12, textAlign: "center" }}>
                  <p style={{ fontSize: 12, color: "#e07a6a", fontWeight: 500, lineHeight: 1.45 }}>
                    Если любая шкала упадёт в 0 или зашкалит до 100 — вас уберут.
                  </p>
                </div>
              </div>
              <div style={{ padding: "0 20px 12px" }}>
                {presidentName ? (
                  <>
                    <div className="font-typewriter" style={{ textAlign: "center", fontSize: 11, color: "#caa23a", letterSpacing: 1, marginBottom: 10 }}>
                      С возвращением, {presidentName}
                    </div>
                    <button onClick={() => { haptic("medium"); setPhase("card"); }} className="btn-velvet" style={{ marginBottom: 8 }}>
                      НОВЫЙ СРОК →
                    </button>
                    <button onClick={() => { haptic("light"); setPresidentName(""); telegramStorage.removeItem("varon_pname"); }} className="btn-outline" style={{ width: "100%" }}>
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
                        background: "#0f0a05", border: "1px solid #c9a84c",
                        borderRadius: 8, fontSize: 13, fontFamily: "var(--font-serif)",
                        color: "#ece0c4", outline: "none", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)"
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
                onClick={() => openNaruzhu("onboarding")}
                style={{
                  padding: "8px 20px 12px", textAlign: "center", cursor: "pointer",
                  borderTop: "1px solid #c9a84c22",
                }}
              >
                <span className="font-typewriter" style={{
                  fontSize: 10, color: "#caa23a",
                  letterSpacing: 0.5, textDecoration: "underline", textUnderlineOffset: 2,
                  opacity: 0.75,
                }}>
                  🚪 Игра от <b style={{ color: "#b45309" }}>Наружу</b> — надёжный VPN для свободного интернета
                </span>
              </div>

              <div className="font-typewriter" style={{
                position: "absolute", bottom: 4, right: 8,
                fontSize: 10, color: "#ece0c422", letterSpacing: 1, pointerEvents: "none",
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
                <div className="font-typewriter" style={{ fontSize: 11, color: "#caa23a", letterSpacing: 2, marginTop: 2 }}>
                  {tenure} МЕС. У ВЛАСТИ — {tenureLabel}
                </div>
              </div>
              
              <div className="card-content-area">
                {/* Разрушенный дворец (картинка-плейсхолдер) */}
                <div className="story-image-frame crisis ruins">
                  <img 
                    className="frame-inner-img" 
                    src={getAsset('/images/palace_ruined.webp')} 
                    alt="Разрушенный дворец" 
                    onError={e => e.currentTarget.style.display = 'none'} 
                  />
                </div>

                <div style={{ 
                  background: "#0d0800", border: "1px solid #c9a84c33", 
                  borderRadius: 12, padding: "14px 18px", marginBottom: 12, 
                  boxShadow: "inset 0 2px 8px #000000bb" 
                }}>
                  <p style={{ fontSize: 14, lineHeight: 1.6, fontWeight: 400, color: "#e3cba1", textAlign: "center" }}>
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
                        border: `1px solid ${isKiller ? "#8b0000" : "#c9a84c33"}`,
                        borderRadius: 8, padding: "8px 10px",
                        boxShadow: isKiller ? "0 0 10px rgba(192, 57, 43, 0.45)" : "none",
                        position: "relative", overflow: "hidden",
                      }}>
                        {isKiller && (
                          <div className="font-typewriter" style={{ position: "absolute", top: 4, right: 6, fontSize: 10, color: "#c0392b", fontWeight: 700 }}>
                            {isTooHigh ? "▲ MAX" : "▼ MIN"}
                          </div>
                        )}
                        <FactionIcon
                          type={p.key}
                          className="result-vector-icon"
                          style={{ color: isKiller ? "#c0392b" : p.color }}
                        />
                        <div className="font-typewriter" style={{ fontSize: 10, color: isKiller ? "#c0392b" : "#6b4c1e", letterSpacing: 0.5, marginTop: 2 }}>{p.label.toUpperCase()}</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: isKiller ? "#c0392b" : stats[p.key] > 65 ? "#27ae60" : "#d4af37", marginTop: 1 }}>
                          {stats[p.key]}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="font-typewriter" style={{ fontSize: 10, color: "#b89a5e", marginBottom: 12, letterSpacing: 0.5, textAlign: "center" }}>
                  ⚠️ Шкала в 0 или 100 — лишение власти
                </div>

                {achievements.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div className="font-typewriter" style={{ fontSize: 10, color: "#caa23a", letterSpacing: 1.5, marginBottom: 6, textAlign: "center" }}>ВАШИ ДОСТИЖЕНИЯ</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
                      {ACHIEVEMENTS_DEF.filter(a => achievements.includes(a.id)).map(a => (
                        <div key={a.id} title={a.desc} style={{
                          background: "#1a0f00", border: "1px solid #d4af3733", borderRadius: 6,
                          padding: "4px 8px", display: "flex", alignItems: "center", gap: 5,
                        }}>
                          <span style={{ fontSize: 11 }}>{a.icon}</span>
                          <span className="font-typewriter" style={{ fontSize: 10, color: "#d4af37", letterSpacing: 0.5 }}>{a.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {decisionLog.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div className="font-typewriter" style={{ fontSize: 10, color: "#caa23a", letterSpacing: 1.5, marginBottom: 6, textAlign: "center" }}>ИСТОРИЯ РЕШЕНИЙ</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      {decisionLog.slice(-4).map((entry, i) => (
                        <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", background: "#0d0800", border: "1px solid #c9a84c33", borderRadius: 6, padding: "4px 8px" }}>
                          <span className="font-typewriter" style={{ fontSize: 10, color: "#b89a5e", flexShrink: 0 }}>МЕС {entry.month}</span>
                          <span style={{ fontSize: 11, color: "#d4b896", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.label}</span>
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
                <div className="font-typewriter" style={{ fontSize: 11, color: "#caa23a", letterSpacing: 2, marginTop: 2 }}>
                  {tenure} МЕСЯЦЕВ У ВЛАСТИ
                </div>
              </div>
              
              <div className="card-content-area">
                {ending && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {["zastoy", "oprichnina", "kooperativ", "bunker", "perestroika", "legenda"].includes(ending.id) ? (
                      <div className="story-image-frame" style={{ height: 150 }}>
                        <img 
                          className="frame-inner-img" 
                          src={getAsset(`/images/ending_${ending.id}.webp`)}
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
                          <div className="font-typewriter" style={{ fontSize: 10, color: "#b89a5e", letterSpacing: 0.5, marginTop: 1 }}>{ending.subtitle}</div>
                        </div>
                      </div>
                      
                      {ending.text.split('\n\n').map((para, i, arr) => (
                        <p key={i} style={{ fontSize: 14, lineHeight: 1.6, color: "#ece0c4", fontWeight: 400, marginBottom: i < arr.length - 1 ? 10 : 0 }}>
                          {para}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "14px 0 12px" }}>
                  {PARAMS.map(p => (
                    <div key={p.key} style={{ background: "#0d0800", border: `1px solid ${p.color}33`, borderRadius: 8, padding: "8px 10px", boxShadow: `0 0 8px ${p.color}15` }}>
                      <FactionIcon type={p.key} className="result-vector-icon" style={{ color: p.color }} />
                      <div className="font-typewriter" style={{ fontSize: 10, color: "#b89a5e", letterSpacing: 0.5, marginTop: 2 }}>{p.label.toUpperCase()}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: p.color, marginTop: 1 }}>{stats[p.key]}</div>
                    </div>
                  ))}
                </div>

                {achievements.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div className="font-typewriter" style={{ fontSize: 10, color: "#caa23a", letterSpacing: 1.5, marginBottom: 6, textAlign: "center" }}>ДОСТИЖЕНИЯ</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
                      {ACHIEVEMENTS_DEF.filter(a => achievements.includes(a.id)).map(a => (
                        <div key={a.id} title={a.desc} style={{
                          background: "#1a0f00", border: "1px solid #d4af3744", borderRadius: 6,
                          padding: "4px 8px", display: "flex", alignItems: "center", gap: 5,
                        }}>
                          <span style={{ fontSize: 11 }}>{a.icon}</span>
                          <span className="font-typewriter" style={{ fontSize: 10, color: "#d4af37", letterSpacing: 0.5 }}>{a.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {decisionLog.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div className="font-typewriter" style={{ fontSize: 10, color: "#caa23a", letterSpacing: 1.5, marginBottom: 6, textAlign: "center" }}>ИСТОРИЯ РЕШЕНИЙ</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      {decisionLog.slice(-4).map((entry, i) => (
                        <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", background: "#0d0800", border: "1px solid #c9a84c33", borderRadius: 6, padding: "4px 8px" }}>
                          <span className="font-typewriter" style={{ fontSize: 10, color: "#b89a5e", flexShrink: 0 }}>МЕС {entry.month}</span>
                          <span style={{ fontSize: 11, color: "#d4b896", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace:"nowrap" }}>{entry.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {promoCode && (
                  <div className="hub-promo-box" style={{ marginBottom: 14 }}>
                    <div className="font-typewriter" style={{ fontSize: 10, color: "#caa23a", letterSpacing: 1.5, marginBottom: 4 }}>
                      🎁 ПОДАРОК ЗА ПОБЕДУ — {promoCode.days} ДНЕЙ VPN НАРУЖУ
                    </div>
                    <div
                      className="hub-promo-code"
                      onClick={() => { navigator.clipboard?.writeText(promoCode.code); haptic("light"); }}
                    >
                      {promoCode.code}
                    </div>
                    <div className="font-typewriter" style={{ fontSize: 10, color: "#b89a5e" }}>
                      Копировать · Активация на naruzhu.am
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
                <img src={getAsset("/images/Vlasova_Press.webp")} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "2px solid #d4af37" }} alt="" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#f5e6c8", lineHeight: 1.2 }}>Елена Власова</div>
                  <div className="font-typewriter" style={{ fontSize: 11, color: "#d4af3799" }}>Пресс-секретарь</div>
                </div>
              </div>
              
              <div className="card-content-area padded-bottom">
                {/* Выборы (картинка-плейсхолдер) */}
                <div className="story-image-frame election">
                  <img 
                    className="frame-inner-img" 
                    src={getAsset('/images/election_booth.webp')} 
                    alt="Избирательный участок" 
                    onError={e => e.currentTarget.style.display = 'none'} 
                  />
                </div>

                <p style={{ fontSize: 15, lineHeight: 1.6, color: "#ece0c4", fontWeight: 500, textAlign: "center", marginBottom: 14 }}>
                  {ELECTION_CARD.text}
                </p>
                
                <div style={{ padding: "8px 12px", background: "#ece0c40e", borderRadius: 8, border: "1px solid #c9a84c33", marginBottom: 12 }}>
                  <div className="font-typewriter" style={{ fontSize: 10, color: "#b89a5e", textAlign: "center", letterSpacing: 1, marginBottom: 4 }}>
                    ВАШ РЕЙТИНГ У НАРОДА
                  </div>
                  <div style={{ height: 6, background: "#2a2008", borderRadius: 3, overflow: "hidden" }}>
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
                    <div style={{ fontSize: 10, marginTop: 1, textTransform: "none", fontWeight: 400 }}>Народ ↑ · Запад ↑ (Рейтинг от 40%)</div>
                  </button>

                  <button onClick={() => choose("admin")} className="btn-velvet" style={{ flexDirection: "column", padding: "8px 12px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#f5c6c6" }}>👮 АДМИНИСТРАТИВНЫЙ РЕСУРС</div>
                    <div style={{ fontSize: 10, marginTop: 1, textTransform: "none", fontWeight: 400, color: "#f5e6c8aa" }}>Народ ↓↓ · Запад ↓↓ · Силовики ↑ · Олигархи ↑</div>
                  </button>

                  <button onClick={() => choose("sponsor")} className="btn-velvet" style={{ flexDirection: "column", padding: "8px 12px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#fbe380" }}>💎 СДЕЛКА С ОЛИГАРХАМИ</div>
                    <div style={{ fontSize: 10, marginTop: 1, textTransform: "none", fontWeight: 400, color: "#f5e6c8aa" }}>Олигархи ↑↑ · Народ ↓ · Запад ↓</div>
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
                <img src={getAsset(ADVISORS[rescueCard.advisor]?.avatar || "/images/Zubov_Finance.webp")} style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", border: "2px solid #d4af37" }} alt="" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#f5e6c8", lineHeight: 1.2 }}>{ADVISORS[rescueCard.advisor]?.name || "Советник"}</div>
                  <div className="font-typewriter" style={{ fontSize: 11, color: "#d4af3799" }}>{ADVISORS[rescueCard.advisor]?.role || "Куратор"}</div>
                </div>
              </div>
              
              <div className="card-content-area padded-bottom">
                {/* Телефон кризиса (картинка-плейсхолдер) */}
                <div className="story-image-frame crisis">
                  <img 
                    className="frame-inner-img" 
                    src={getAsset('/images/asset_red_phone.webp')} 
                    alt="Кризисный телефон" 
                    onError={e => e.currentTarget.style.display = 'none'} 
                  />
                </div>

                <p style={{ fontSize: 15, lineHeight: 1.55, color: "#f5c6c6", textAlign: "center", fontWeight: 600, marginBottom: 14 }}>
                  {rescueCard.text}
                </p>

                <div style={{ background: "rgba(139, 0, 0, 0.25)", border: "1px solid rgba(139, 0, 0, 0.45)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, textAlign: "center" }}>
                  <p style={{ fontSize: 12, color: "#f5c6c6", fontWeight: 500, lineHeight: 1.5 }}>
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
