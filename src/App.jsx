import { useState, useRef, useCallback, useEffect } from "react";
import { PARAMS } from "./data/params.js";
import { ADVISORS } from "./data/advisors.js";
import { CARDS, CRISIS_CARDS, ELECTION_CARD, MONTHS } from "./data/cards.js";
import { CHAINS, getTriggeredChain, getExtremumEvent } from "./data/chains.js";
import { ENDINGS, getVictoryEnding } from "./data/endings.js";
import { NARUZHU_CARDS } from "./data/naruzhuCards.js";
import { EXTRA_CARDS } from "./data/extraCards.js";
import { PANORAMA_CARDS } from "./data/panoramaCards.js";
import { CHRONICLE_CARDS } from "./data/chronicleCards.js";
import { PRECEDENT_CARDS } from "./data/precedentCards.js";
import { getAsset } from "./lib/assets.js";
import { safeInt, validateSave, scaleStatEffect, shuffle, telegramVersionAtLeast, DIFFICULTIES } from "./lib/gameHelpers.js";
import Topbar from "./components/Topbar.jsx";
import OnboardingScreen from "./components/OnboardingScreen.jsx";
import GameOverScreen from "./components/GameOverScreen.jsx";
import VictoryScreen from "./components/VictoryScreen.jsx";
import ElectionScreen from "./components/ElectionScreen.jsx";
import ConstitutionScreen from "./components/ConstitutionScreen.jsx";
import SecondChanceScreen from "./components/SecondChanceScreen.jsx";
import HubOverlay from "./components/HubOverlay.jsx";
import GameCard from "./components/GameCard.jsx";
import StatPill from "./components/StatPill.jsx";
import { telegramStorage } from "./utils/telegramStorage.js";
import { track, EVENTS, hashStr, trackOutbound, appendUtm, getAnalyticsSnapshot } from "./lib/analytics.js";
import { globalLeaderboardEnabled, fetchGlobalLeaderboard, submitGlobalScore } from "./lib/globalLeaderboard.js";
import AdminAnalyticsPanel from "./components/AdminAnalyticsPanel.jsx";
import { copyText } from "./lib/clipboard.js";
import { discountFor } from "./lib/promo.js";
import {
  addLeaderboardEntry,
  createLeaderboardEntry,
  normalizeLeaderboard,
  normalizeLeaderboardScore,
  parseStoredLeaderboard,
} from "./lib/leaderboard.js";
import "./App.css";

// Стабильный короткий id карты для аналитики (у карт нет своего id —
// хэшируем текст). Покрывает обычные карты (t) и rescue-карту (text).
const cardKey = (c) => (c ? hashStr(c.t || c.text || "") : null);

const WOOD_BG   = `url("${getAsset('/images/game_background.webp')}") center/cover no-repeat`;

// Строит UTM-размеченный URL на сайт «Наружу».
const naruzhuUrl = (campaign, content = "", months = 0, promoCode = null, ctaId = "", yclid = "") => {
  const p = new URLSearchParams({
    utm_source: "varonia",
    utm_medium: "game",
    utm_campaign: campaign,
  });
  if (content) p.set("utm_content", content);
  if (months > 0) p.set("m", String(months));
  if (ctaId) p.set("ab", ctaId);
  if (promoCode?.code) p.set("promo", promoCode.code);
  if (yclid) p.set("yclid", yclid);
  return `https://naruzhu.am/?${p.toString()}`;
};

// Telegram-ник админа, которому доступна внутриигровая панель аналитики.
// Меняется через VITE_ADMIN_USERNAME без правки кода.
const ADMIN_USERNAME = (import.meta.env.VITE_ADMIN_USERNAME || "deprav").toLowerCase().replace(/^@/, "");

// A/B-тест текста CTA-кнопки «Наружу» на карте.
const CTA_VARIANTS = [
  { id: "exit",     label: "🌐 VPN Наружу — выйти из Варонии" },
  { id: "download", label: "🌐 Скачать VPN Наружу бесплатно" },
  { id: "bypass",   label: "🔓 Обойти блокировку — VPN Наружу" },
];

// Собираем общую колоду: базовые + дополнительные + Наружу-карты
const ALL_CARDS = [...CARDS, ...EXTRA_CARDS, ...NARUZHU_CARDS, ...PANORAMA_CARDS, ...CHRONICLE_CARDS, ...PRECEDENT_CARDS];

// Колода без рекламных карт «Наружу» — для безопасного режима (модерация, чувствительные показы).
const SAFE_CARDS = ALL_CARDS.filter(c => c.cta !== "naruzhu");
// Строит колоду с учётом безопасного режима: в нём VPN-карты не попадают в игру.
const buildDeck = (safe) => shuffle(safe ? SAFE_CARDS : ALL_CARDS);

const getPreviewCard = () => {
  if (!import.meta.env.DEV) return null;
  const raw = new URLSearchParams(location.search).get("advisor");
  if (raw == null) return null;
  const advisorId = Number(raw);
  if (!Number.isInteger(advisorId)) return null;
  return ALL_CARDS.find(card => card.advisor === advisorId) || null;
};

// ─── ГЛАВНЫЙ КОМПОНЕНТ ────────────────────────────────────────────────────────
export default function ThePresident() {
  // Состояние инициализации приложения (лоадер на старте).
  const [isInitializing, setIsInitializing] = useState(true);

  const [stats, setStats]               = useState({ oligarchs:50, army:50, people:50, west:50 });
  const [months, setMonths]             = useState(1);
  const [deck, setDeck]                 = useState(() => shuffle(ALL_CARDS));
  const [cardIdx, setCardIdx]           = useState(0);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [phase, setPhase]               = useState(() => new URLSearchParams(location.search).get("p") || "onboarding");
  const [deathMsg, setDeathMsg]         = useState("");
  const [hovered, setHovered]           = useState(null);
  const [flashParams, setFlashParams]   = useState({});
  const [isCrisis, setIsCrisis]         = useState(false);
  const [crisisCard, setCrisisCard]     = useState(null);
  const [termsCompleted, setTermsCompleted] = useState(0);
  const [hasUsedSecondChance, setHasUsedSecondChance] = useState(false);
  const [rescueCard, setRescueCard]     = useState(() => new URLSearchParams(location.search).get("p") === "second_chance" ? { advisor: 1, text: "Разъярённая толпа окружила дворец. Генерал Громов предлагает ввести танки и объявить комендантский час.", agreeText: "Ввести танки (Силовики ↑, Народ ↑, Запад ↓)", fx: {}, targetStats: { oligarchs:50, army:50, people:0, west:50 }, targetMonth: 30 } : null);
  const [presidentName, setPresidentName] = useState("");
  const [nameInput, setNameInput]         = useState("");
  const [achievements, setAchievements]   = useState([]);
  const [showHub, setShowHub]             = useState(false);
  const [bestScore, setBestScore]         = useState(0);
  const [leaderboard, setLeaderboard]     = useState([]);
  const [globalLeaderboard, setGlobalLeaderboard] = useState([]);
  const [globalResult, setGlobalResult]   = useState(null);
  const [lastResult, setLastResult]       = useState(null);
  const [referralCount, setReferralCount] = useState(0);
  const [promoCode, setPromoCode]         = useState(null);
  const [ctaVariant, setCtaVariant]       = useState(CTA_VARIANTS[0]);
  const [decisionLog, setDecisionLog]     = useState([]);
  const [unlockedEndings, setUnlockedEndings] = useState([]);
  const [victoryEndingId, setVictoryEndingId] = useState(null);
  const [hasUsedVpnRevive, setHasUsedVpnRevive] = useState(false);
  const [reviveAvailable, setReviveAvailable]   = useState(false);
  const [difficulty, setDifficulty]             = useState("normal");
  // Безопасный режим: скрывает всю рекламу VPN «Наружу» (промокоды, CTA, ревайв, оффер-карты).
  const [safeMode, setSafeMode]                 = useState(false);
  // Внутриигровая панель аналитики для админа @deprav.
  const [showAdmin, setShowAdmin]               = useState(false);
  // Идентификатор клика Яндекс.Директ для отслеживания конверсий
  const [yclid, setYclid]                       = useState("");
  // Админ опознаётся по Telegram-нику; ?admin=<ник> — запасной вход для браузера/dev.
  const isAdmin = (() => {
    try {
      const uname = (window.Telegram?.WebApp?.initDataUnsafe?.user?.username || "").toLowerCase();
      if (uname && uname === ADMIN_USERNAME) return true;
      return new URLSearchParams(location.search).get("admin")?.toLowerCase().replace(/^@/, "") === ADMIN_USERNAME;
    } catch {
      return false;
    }
  })();

  useEffect(() => {
    async function loadData() {
      const keys = ["varon_save", "varon_cta_ab", "varon_pname", "varon_ach", "varon_best", "varon_leaderboard", "varon_refs", "varon_ends", "varon_difficulty", "varon_safe", "varon_yclid", "varon_rated"];
      const data = await telegramStorage.getItems(keys);
      const forcedPhase = new URLSearchParams(location.search).get("p");
      
      let savedRun = null;
      try { savedRun = validateSave(JSON.parse(data["varon_save"] || "null")); } catch {}
      if (forcedPhase) savedRun = null;

      track(EVENTS.APP_OPEN, { is_returning: !!savedRun });
      if (savedRun) track(EVENTS.RUN_RESUMED, { month: savedRun.months, phase: savedRun.phase });

      if (savedRun) {
        setStats(savedRun.stats || { oligarchs:50, army:50, people:50, west:50 });
        setMonths(savedRun.months || 1);
        setCardIdx(savedRun.cardIdx || 0);
        setPendingEvents(savedRun.pendingEvents || []);
        setPhase(savedRun.phase || "card");
        setTermsCompleted(savedRun.termsCompleted || 0);
        setVictoryEndingId(savedRun.victoryEndingId || null);
        setHasUsedSecondChance(savedRun.hasUsedSecondChance || false);
        setHasUsedVpnRevive(savedRun.hasUsedVpnRevive || false);
        setRescueCard(savedRun.rescueCard || null);

        // Возобновление экрана проигрыша с работающей кнопкой VPN-ревайва:
        // восстанавливаем сообщение о смерти, промокод и снапшот для отката.
        // historyRef держит один снапшот → reviveViaVpn возьмёт hist[0].
        if (savedRun.phase === "gameover") {
          setDeathMsg(savedRun.deathMsg || "");
          setPromoCode(discountFor((savedRun.months || 1) - 1));
          setLastResult(savedRun.lastResult || null);
          if (savedRun.reviveAvailable && savedRun.reviveSnapshot) {
            resumeReviveRef.current = savedRun.reviveSnapshot;
            setReviveAvailable(true);
          }
        }
      }

      // Сложность: приоритет у возобновляемой партии, иначе — последний выбор игрока.
      const savedDifficulty = savedRun && DIFFICULTIES.includes(savedRun.difficulty)
        ? savedRun.difficulty
        : (DIFFICULTIES.includes(data["varon_difficulty"]) ? data["varon_difficulty"] : "normal");
      setDifficulty(savedDifficulty);

      const savedPresidentName = data["varon_pname"] || "";
      const savedBestScore = normalizeLeaderboardScore(safeInt(data["varon_best"]));
      setPresidentName(savedPresidentName);
      try { setAchievements(JSON.parse(data["varon_ach"] || "[]")); } catch {}
      setBestScore(savedBestScore);

      let savedLeaderboard = parseStoredLeaderboard(data["varon_leaderboard"] || "[]");
      if (!savedLeaderboard.length && savedBestScore > 0) {
        savedLeaderboard = normalizeLeaderboard([
          createLeaderboardEntry({
            id: "legacy-best",
            name: savedPresidentName || "Президент",
            score: savedBestScore,
            difficulty: savedDifficulty,
            outcome: "legacy",
            reason: "legacy_best",
          })
        ]);
        telegramStorage.setItem("varon_leaderboard", JSON.stringify(savedLeaderboard));
      }
      setLeaderboard(savedLeaderboard);
      
      setReferralCount(safeInt(data["varon_refs"]));

      // Оценки карт: читаем из уже загруженной пачки ключей (getItems), а не
      // синхронно из промиса — иначе дедупликация оценок ломается между сессиями.
      try {
        const rated = JSON.parse(data["varon_rated"] || "[]");
        if (Array.isArray(rated)) ratedCardsRef.current = new Set(rated);
      } catch { /* ignore */ }

      try { setUnlockedEndings(JSON.parse(data["varon_ends"] || "[]")); } catch {}

      let ctaAb = data["varon_cta_ab"];
      let foundCta = CTA_VARIANTS.find(v => v.id === ctaAb);
      if (!foundCta) {
        foundCta = CTA_VARIANTS[Math.floor(Math.random() * CTA_VARIANTS.length)];
        telegramStorage.setItem("varon_cta_ab", foundCta.id);
        track(EVENTS.CTA_VARIANT_ASSIGNED, { cta_variant: foundCta.id });
      }
      setCtaVariant(foundCta);

      // Безопасный режим скрыт от обычных игроков. Управляется только разработчиком:
      //   • сборка/пуш:   VITE_SAFE_MODE=1  → весь задеплоенный билд идёт без рекламы VPN;
      //   • при загрузке: ?safe=1 / ?safe=0 в URL — принудительно вкл/выкл и запоминается.
      // Если ничего не задано — берётся ранее запомненное значение.
      const urlSafe = new URLSearchParams(location.search).get("safe");
      const safe = import.meta.env.VITE_SAFE_MODE === "1"
        ? true
        : urlSafe === "1" ? true
        : urlSafe === "0" ? false
        : data["varon_safe"] === "1";
      setSafeMode(safe);
      if (urlSafe === "1" || urlSafe === "0") telegramStorage.setItem("varon_safe", safe ? "1" : "0");
      // Колода. Для возобновляемой партии — из сейва; в safe-режиме вырезаем
      // VPN-карты «Наружу» из ещё не сыгранной части (индекс текущей карты не
      // сдвигается, т.к. префикс до cardIdx сохраняется как есть).
      if (savedRun) {
        const savedIdx = savedRun.cardIdx || 0;
        const savedDeck = Array.isArray(savedRun.deck) ? savedRun.deck : [];
        setDeck(safe
          ? [...savedDeck.slice(0, savedIdx), ...savedDeck.slice(savedIdx).filter(c => c.cta !== "naruzhu")]
          : savedDeck);
      } else if (safe) {
        setDeck(buildDeck(true));
      }

      // ─── Обработка yclid для рекламы в Яндекс.Директ ───
      let savedYclid = data["varon_yclid"] || "";
      
      // Чтение из start_param Telegram-бота (переход вида t.me/bot?startapp=yc_12345)
      try {
        const tg = window.Telegram?.WebApp;
        const startParam = tg?.initDataUnsafe?.start_param || "";
        if (startParam.startsWith("yc_")) {
          const parsedYclid = startParam.replace("yc_", "");
          if (parsedYclid && parsedYclid !== savedYclid) {
            savedYclid = parsedYclid;
            telegramStorage.setItem("varon_yclid", parsedYclid);
          }
        }
      } catch (e) {
        console.warn("Failed to parse Telegram start_param:", e);
      }

      // Запасной вариант: чтение напрямую из URL (для веб-прокладок или прямого тестирования ?yclid=...)
      try {
        const urlParams = new URLSearchParams(location.search);
        const urlYclid = urlParams.get("yclid");
        if (urlYclid && urlYclid !== savedYclid) {
          savedYclid = urlYclid;
          telegramStorage.setItem("varon_yclid", urlYclid);
        }
      } catch (e) {
        console.warn("Failed to parse URL query params:", e);
      }

      setYclid(savedYclid);

      setIsInitializing(false);
    }
    loadData();
  }, []);

  const touchStart    = useRef(null);
  const choosing      = useRef(false);
  const swipeTriggered = useRef(false);
  const cardRef       = useRef(null);
  const lastDirRef    = useRef(null);
  // Хранит последние 3 снапшота состояния ДО каждого решения (для VPN-ревайва).
  const historyRef    = useRef([]);
  // Снапшот для VPN-ревайва, восстановленный из сейва при возобновлении партии
  // на экране проигрыша (historyRef живёт только в памяти и после перезагрузки пуст).
  const resumeReviveRef = useRef(null);

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
      track(EVENTS.ACHIEVEMENT_UNLOCKED, { achievement_id: id });
      hapticNotify("success");
      return next;
    });
  }, [hapticNotify]);

  const unlockSurvivalAchievements = useCallback((nextMonth) => {
    if (nextMonth >= 13) unlockAchievement("survive_12");
    if (nextMonth >= 49) unlockAchievement("survive_48");
  }, [unlockAchievement]);

  const recordResult = useCallback((score, outcome, meta = {}) => {
    const normalizedScore = normalizeLeaderboardScore(safeInt(score));
    const isRecord = normalizedScore > bestScore;
    if (isRecord) {
      setBestScore(normalizedScore);
      telegramStorage.setItem("varon_best", String(normalizedScore));
    }

    // Проигрыш на первом месяце (счёт 0) не заносим на доску и не шлём в
    // глобальный рейтинг — только возвращаем пустой результат для экрана финала.
    if (normalizedScore <= 0) {
      const emptyResult = {
        id: "", name: presidentName || nameInput || "Президент",
        score: 0, difficulty, outcome, rank: 0, isRecord: false, isTopTen: false,
      };
      setLastResult(emptyResult);
      return emptyResult;
    }

    const { leaderboard: nextLeaderboard, entry, rank, isTopTen } = addLeaderboardEntry(leaderboard, {
      name: presidentName || nameInput || "Президент",
      score: normalizedScore,
      difficulty,
      outcome,
      endingId: meta.endingId,
      endingTitle: meta.endingTitle,
      reason: meta.reason,
      killerKey: meta.killerKey,
    });
    const result = { ...entry, rank, isRecord, isTopTen };

    setLeaderboard(nextLeaderboard);
    setLastResult(result);
    telegramStorage.setItem("varon_leaderboard", JSON.stringify(nextLeaderboard));

    // Общий рейтинг: шлём результат на сервер (fire-and-forget, не блокирует UI).
    if (globalLeaderboardEnabled) {
      const uid = getAnalyticsSnapshot().context?.anon_uid || "";
      submitGlobalScore({
        uid,
        name: presidentName || nameInput || "Президент",
        score: normalizedScore,
        difficulty,
        outcome,
        endingId: meta.endingId,
        endingTitle: meta.endingTitle,
        reason: meta.reason,
        killerKey: meta.killerKey,
      }).then((globalRes) => {
        if (!globalRes) return;
        setGlobalLeaderboard(globalRes.leaderboard);
        setGlobalResult({
          entryId: globalRes.entryId,
          rank: globalRes.rank,
          isTopN: globalRes.isTopN,
          improved: globalRes.improved,
        });
        track(EVENTS.LEADERBOARD_ENTRY, {
          score: normalizedScore,
          rank: globalRes.rank,
          is_top_ten: globalRes.isTopN,
          leaderboard_trust: "server_global",
          scope: "global",
          difficulty,
          outcome,
        });
      });
    }

    track(EVENTS.LEADERBOARD_ENTRY, {
      score: normalizedScore,
      rank,
      is_record: isRecord,
      is_top_ten: isTopTen,
      leaderboard_trust: "client_local",
      difficulty,
      outcome,
      reason: meta.reason || null,
      ending_id: meta.endingId || null,
    });

    return result;
  }, [bestScore, difficulty, leaderboard, nameInput, presidentName]);

  // Подгружаем глобальную таблицу при старте (если включена серверная доска).
  useEffect(() => {
    if (!globalLeaderboardEnabled) return;
    let alive = true;
    fetchGlobalLeaderboard().then((entries) => {
      if (alive && entries) setGlobalLeaderboard(entries);
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    tg.ready();
    tg.expand();
    setTimeout(() => tg.expand(), 300);
    setTimeout(() => tg.expand(), 1000);
    if (typeof tg.disableVerticalSwipes === "function") {
      try { tg.disableVerticalSwipes(); } catch { /* optional */ }
    }

    // Иммерсивный фуллскрин (Bot API 8.0+).
    const canFullscreen = typeof tg.requestFullscreen === "function" && telegramVersionAtLeast(tg, "8.0");

    // Safe-area: в фуллскрине контент уходит под статус-бар и кнопки Telegram
    // (✕/⋮ в правом верхнем углу). Прокидываем верхний отступ в --tg-safe-top,
    // чтобы шапка и кнопка «Покинуть» не перекрывались. Инсеты Telegram приходят
    // асинхронно и ненадёжно, поэтому держим гарантированный минимум в фуллскрине.
    const applyInsets = () => {
      const sa = tg.safeAreaInset || {};
      const csa = tg.contentSafeAreaInset || {};
      let top = (sa.top || 0) + (csa.top || 0);
      if (canFullscreen) {
        // Минимум, перекрывающий статус-бар + плавающие кнопки Telegram,
        // даже если инсеты ещё не пришли (top = 0).
        top = Math.max(top, 64);
      }
      document.documentElement.style.setProperty("--tg-safe-top", `${top}px`);
    };

    // Подписываемся на события ДО запроса фуллскрина.
    try {
      tg.onEvent?.("safeAreaChanged", applyInsets);
      tg.onEvent?.("contentSafeAreaChanged", applyInsets);
      tg.onEvent?.("fullscreenChanged", applyInsets);
    } catch { /* Старые клиенты без этих событий. */ }

    if (canFullscreen) {
      try { tg.requestFullscreen(); } catch { /* optional */ }
      setTimeout(() => { try { tg.requestFullscreen(); } catch { /* optional */ } }, 400);
    }

    // Поллинг: инсеты/isFullscreen появляются асинхронно — переприменяем
    // отступ несколько раз, не полагаясь только на события.
    applyInsets();
    const timers = [120, 350, 700, 1200, 2000].map(d => setTimeout(applyInsets, d));

    return () => {
      timers.forEach(clearTimeout);
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

  const previewCard = getPreviewCard();
  const currentCard = previewCard || (isCrisis && crisisCard ? crisisCard : deck[cardIdx % deck.length]);
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
      const scaled = scaleStatEffect(p.key, val, difficulty, months);
      ns[p.key] = Math.max(0, Math.min(100, currentStats[p.key] + scaled));
      if (scaled !== 0) fl[p.key] = true;
    });
    return { ns, fl };
  }, [difficulty, months]);

  // Сохранение проигрыша так, чтобы VPN-ревайв пережил перезагрузку мини-аппа.
  // Ревайв откатывает 2 хода назад — эта же снапшот-логика используется в
  // reviveViaVpn; здесь мы кладём выбранный снапшот в сейв. Если ревайв уже
  // недоступен (safe-режим / уже использован / нет истории ходов) — сейв
  // удаляется, как и раньше, и партия начнётся заново.
  const persistGameOver = useCallback((finalStats, finalMonth, msg, resultEntry = null) => {
    const hist = historyRef.current;
    const reviveSnapshot = hist.length >= 2 ? hist[hist.length - 2] : hist[0];
    const canReviveLater = !safeMode && !hasUsedVpnRevive && !!reviveSnapshot;
    if (!canReviveLater) {
      telegramStorage.removeItem("varon_save");
      return;
    }
    try {
      telegramStorage.setItem("varon_save", JSON.stringify({
        stats: finalStats,
        months: finalMonth,
        deck,
        cardIdx,
        pendingEvents,
        hasUsedSecondChance,
        hasUsedVpnRevive,
        rescueCard: null,
        termsCompleted,
        difficulty,
        phase: "gameover",
        deathMsg: msg,
        lastResult: resultEntry,
        reviveAvailable: true,
        reviveSnapshot,
      }));
    } catch { /* Save failure should not block the game-over screen. */ }
  }, [deck, cardIdx, pendingEvents, hasUsedSecondChance, hasUsedVpnRevive, termsCompleted, difficulty, safeMode]);

  const handleDeathOrRescue = useCallback((death, nextStats, nextMonth, nextPendingEvents = pendingEvents) => {
    hapticNotify("error");
    const score = nextMonth - 1;

    if (hasUsedSecondChance) {
      setDeathMsg(death.msg);
      setPromoCode(discountFor(score));
      const result = recordResult(score, "defeat", { reason: "death", killerKey: death.key });
      persistGameOver(nextStats, nextMonth, death.msg, result);
      track(EVENTS.GAME_OVER, { reason: "death", killer_key: death.key, is_low: death.low, tenure: score, score, leaderboard_rank: result.rank });
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
          rescueText = "Разъярённая толпа окружила дворец. Генерал Громов предлагает ввести танки и объявить комендантский час. «Мы зачистим улицы, господин президент, но Запад и народ вам этого не простят».";
          agreeText = "Ввести танки (Силовики ↑, Народ ↑, Запад ↓)";
          rescueFx = { army: 20, oligarchs: 0, people: 25, west: -30 };
        } else {
          advisorId = 1; // Громов
          rescueText = "Ваша популярность пугает элиты. Громов предупреждает, что генералы готовят заговор, чтобы вас сместить. Он предлагает устроить показательные аресты оппозиции, чтобы успокоить силовиков.";
          agreeText = "Арестовать оппозицию (Народ ↓, Силовики ↑, Запад ↓)";
          rescueFx = { army: 15, oligarchs: 0, people: -25, west: -15 };
        }
      } else if (paramKey === "oligarchs") {
        if (isLow) {
          advisorId = 7; // Усманов
          rescueText = "Крупный бизнес прекратил инвестиции и объявил локаут. Страна на грани коллапса. Усманов предлагает передать ему управление морским портом в обмен на экстренное финансирование.";
          agreeText = "Передать порты Усманову (Олигархи ↑, Запад ↓, Силовики ↓)";
          rescueFx = { oligarchs: 25, army: -10, people: 0, west: -15 };
        } else {
          advisorId = 0; // Зубов
          rescueText = "Олигархи скупили все ключевые ведомства и диктуют свои законы. Зубов предлагает провести принудительную национализацию части активов Усманова ради спасения суверенитета.";
          agreeText = "Национализировать активы (Олигархи ↓, Народ ↑, Запад ↓)";
          rescueFx = { oligarchs: -25, army: 0, people: 15, west: -10 };
        }
      } else if (paramKey === "army") {
        if (isLow) {
          advisorId = 3; // Сенин
          rescueText = "Армия развалена, офицеры дезертируют, Громов потерял контроль. Сенин предлагает передать спецслужбам КГБ полный контроль над границами и базами снабжения.";
          agreeText = "Отдать контроль КГБ (Силовики ↑, Олигархи ↓, Народ ↓)";
          rescueFx = { army: 25, oligarchs: -15, people: -10, west: 0 };
        } else {
          advisorId = 6; // Стрельцова
          rescueText = "Генерал Громов фактически контролирует все министерства и готовит приказ о вашем аресте. Стрельцова требует немедленно отстранить верхушку генералитета и начать расследования.";
          agreeText = "Уволить генералов (Силовики ↓, Народ ↓, Запад ↓)";
          rescueFx = { army: -25, oligarchs: 0, people: -15, west: -10 };
        }
      } else if (paramKey === "west") {
        if (isLow) {
          advisorId = 4; // Хартли
          rescueText = "Экономика задушена западными санкциями, резервы заморожены. Хартли предлагает экстренно подписать кабальное соглашение об ассоциации в обмен на финансовую помощь МВФ.";
          agreeText = "Подписать соглашение (Запад ↑, Народ ↑, Силовики ↓)";
          rescueFx = { west: 25, army: -15, people: 10, oligarchs: 0 };
        } else {
          advisorId = 3; // Сенин
          rescueText = "Западные советники диктуют состав правительства. Варония теряет независимость. Сенин предлагает ввести санкционный мораторий и выслать западных кураторов.";
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
      track(EVENTS.SECOND_CHANCE_VIEW, { param_key: death.key, is_low: death.low, tenure: score });
      setPhase("second_chance");

      try {
        telegramStorage.setItem("varon_save", JSON.stringify({
          stats: nextStats,
          months: nextMonth,
          deck,
          cardIdx,
          pendingEvents: nextPendingEvents,
          hasUsedSecondChance: false,
          hasUsedVpnRevive,
          rescueCard: {
            advisor: advisorId,
            text: rescueText,
            agreeText: agreeText,
            fx: rescueFx,
            targetStats: nextStats,
            targetMonth: nextMonth
          },
          termsCompleted,
          difficulty,
          phase: "second_chance"
        }));
      } catch { /* Save failure should not interrupt the current run. */ }
    }
  }, [hasUsedSecondChance, hasUsedVpnRevive, deck, cardIdx, pendingEvents, termsCompleted, difficulty, hapticNotify, persistGameOver, recordResult]);

  const completeVictory = useCallback((endObj, score, reason = "victory", terms = termsCompleted) => {
    hapticNotify("success");
    const result = recordResult(score, "victory", {
      reason,
      endingId: endObj.id,
      endingTitle: endObj.title,
    });
    setPromoCode(discountFor(score));
    setVictoryEndingId(endObj.id);
    telegramStorage.removeItem("varon_save");

    setUnlockedEndings(prev => {
      if (prev.includes(endObj.id)) return prev;
      const next = [...prev, endObj.id];
      telegramStorage.setItem("varon_ends", JSON.stringify(next));
      track(EVENTS.ENDING_UNLOCKED, { ending_id: endObj.id });
      return next;
    });
    track(EVENTS.VICTORY, { ending_id: endObj.id, tenure: score, terms, reason, leaderboard_rank: result.rank });
    unlockAchievement("victory");
    setPhase("victory");
  }, [hapticNotify, recordResult, termsCompleted, unlockAchievement]);

  const choose = useCallback((side, via = "click") => {
    if (choosing.current) return;

    if (phase === "constitution") {
      const score = months - 1;
      const endObj = side === "leave" ? ENDINGS.democratic_transition : getVictoryEnding(stats, score);
      completeVictory(endObj, score, side === "leave" ? "constitutional_exit" : "constitutional_breach", termsCompleted);
      return;
    }

    if (phase === "second_chance" && rescueCard) {
      track(EVENTS.SECOND_CHANCE_CHOICE, { accepted: side === "agree" });
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
            hasUsedVpnRevive,
            rescueCard: null,
            termsCompleted,
            difficulty,
            phase: "card"
          }));
        } catch { /* Save failure should not interrupt the current run. */ }
      } else {
        hapticNotify("error");
        const declineMsg = "Вы отказались от сделки по спасению власти и предпочли с честью сложить полномочия.";
        setDeathMsg(declineMsg);
        const score = rescueCard.targetMonth - 1;
        setPromoCode(discountFor(score));
        const result = recordResult(score, "defeat", { reason: "second_chance_declined" });
        persistGameOver(rescueCard.targetStats, rescueCard.targetMonth, declineMsg, result);
        track(EVENTS.GAME_OVER, { reason: "second_chance_declined", tenure: score, score, leaderboard_rank: result.rank });
        setPhase("gameover");
      }
      return;
    }

    if (phase === "election") {
      let fx;
      let tacticLabel;
      if (side === "honest") {
        if (stats.people < 40) return;
        // Ослаблено с +10/+10: у народа/Запада возле потолка честная кампания
        // теперь может подтолкнуть к перегреву, а не быть строго лучшим выбором.
        fx = { oligarchs: 0, army: 0, people: 6, west: 6 };
        tacticLabel = "Честные выборы";
      } else if (side === "admin") {
        // Штраф по Западу смягчён с -22 до -14 — тактика стала жизнеспособной,
        // когда нужно подтянуть силовиков ценой народа и репутации.
        fx = { oligarchs: 6, army: 14, people: -11, west: -14 };
        tacticLabel = "Административный ресурс";
      } else if (side === "sponsor") {
        fx = { oligarchs: 17, army: 0, people: -6, west: -8 };
        tacticLabel = "Сделка с олигархами";
      } else {
        track(EVENTS.ELECTION_CHOICE, { tactic: "skip" });
        hapticNotify("error");
        const skipMsg = "Вы отказались от участия в выборах и добровольно ушли на покой. В Варонии наступила новая эпоха.";
        setDeathMsg(skipMsg);
        const score = months - 1;
        setPromoCode(discountFor(score));
        const result = recordResult(score, "defeat", { reason: "election_skip" });
        persistGameOver(stats, months, skipMsg, result);
        track(EVENTS.GAME_OVER, { reason: "election_skip", tenure: score, score, leaderboard_rank: result.rank });
        setPhase("gameover");
        return;
      }

      track(EVENTS.ELECTION_CHOICE, { tactic: side });
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
        setPhase("constitution");
        setIsCrisis(false);
        try {
          telegramStorage.setItem("varon_save", JSON.stringify({
            stats: ns,
            months: newMonth,
            deck,
            cardIdx,
            pendingEvents,
            hasUsedSecondChance,
            hasUsedVpnRevive,
            rescueCard,
            termsCompleted: newTerms,
            difficulty,
            phase: "constitution"
          }));
        } catch { /* Save failure should not interrupt the current run. */ }
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
          hasUsedVpnRevive,
          rescueCard,
          termsCompleted: newTerms,
          difficulty,
          phase: "card"
        }));
      } catch { /* Save failure should not interrupt the current run. */ }
      return;
    }

    if (phase !== "card" || !currentCard) return;
    choosing.current = true;

    track(EVENTS.DECISION, {
      card_id: cardKey(currentCard),
      advisor: currentCard.advisor,
      side,
      label: currentCard[side].label,
      input: via,
      is_crisis: isCrisis,
      month: months,
    });

    const fx = currentCard[side].fx;
    // Анимация вылета карточки — напрямую через DOM
    if (cardRef.current) {
      cardRef.current.style.transition = "transform 0.35s cubic-bezier(0.4,0,1,1), opacity 0.35s ease";
      cardRef.current.style.transform = `translateX(${side === "left" ? "-115%" : "115%"}) rotate(${side === "left" ? "-10deg" : "10deg"})`;
      cardRef.current.style.opacity = "0";
    }

    setTimeout(() => {
      // Снапшот состояния ДО решения — для VPN-ревайва (откат 2 ходов).
      historyRef.current = [...historyRef.current.slice(-2), { stats, months, deck, cardIdx, pendingEvents }];
      setReviveAvailable(true);

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
        track(EVENTS.CHAIN_TRIGGERED, { chain_id: chainId });
      }
      if (chainId === "ds_arc_4_soft_end") unlockAchievement("naruzhu_open");

      // Наказание за экстремум: фракция у потолка пытается перехватить власть.
      const extremum = getExtremumEvent(ns, newPending);
      if (extremum) {
        newPending.push({ ...extremum, triggerMonth: newMonth + extremum.delay });
        track(EVENTS.EXTREMUM_EVENT, { month: newMonth });
      }

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
          hasUsedVpnRevive,
          rescueCard,
          termsCompleted,
          difficulty,
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
        const crisis = CRISIS_CARDS[Math.floor(Math.random() * CRISIS_CARDS.length)];
        setCrisisCard(crisis);
        track(EVENTS.CRISIS_SHOWN, { card_id: cardKey(crisis), month: newMonth });
      }
    }, 350);
  }, [phase, currentCard, stats, months, applyFx, termsCompleted, pendingEvents, cardIdx, hasUsedSecondChance, hasUsedVpnRevive, rescueCard, handleDeathOrRescue, completeVictory, deck, hapticNotify, unlockAchievement, unlockSurvivalAchievements, isCrisis, difficulty, persistGameOver, recordResult]);

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
    const newDir = dx < -45 ? "left" : dx > 45 ? "right" : null;
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
      choose(dx < 0 ? "left" : "right", "swipe");
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
      if (e.key === "ArrowLeft") choose("left", "key");
      else if (e.key === "ArrowRight") choose("right", "key");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, choose]);

  // Аналитика просмотров экранов (фаз).
  useEffect(() => {
    if (phase === "onboarding") track(EVENTS.ONBOARDING_VIEW);
    else if (phase === "election") track(EVENTS.ELECTION_VIEW);
  }, [phase]);

  // Аналитика показа игровой карты.
  useEffect(() => {
    if (phase !== "card" || !currentCard) return;
    track(EVENTS.CARD_VIEW, {
      card_id: cardKey(currentCard),
      advisor: currentCard.advisor,
      is_crisis: isCrisis,
      month: months,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCard, isCrisis, phase]);

  // Оценка карточек (тест-период, за флагом VITE_RATING_ENABLED).
  // card_id уже оценённых карт хранится локально → один игрок оценивает карту один раз.
  // Наполняется в loadData из telegramStorage (async) — здесь только пустой старт.
  const ratedCardsRef = useRef(new Set());
  // Подсветка значка для текущей карты (визуальный отклик «оценка учтена»).
  const [cardRating, setCardRating] = useState(null);
  useEffect(() => {
    const id = cardKey(currentCard);
    setCardRating(id && ratedCardsRef.current.has(id) ? "rated" : null);
  }, [currentCard]);

  const rateCard = useCallback((rating) => {
    const id = cardKey(currentCard);
    if (!id || ratedCardsRef.current.has(id)) return;
    ratedCardsRef.current.add(id);
    try { telegramStorage.setItem("varon_rated", JSON.stringify([...ratedCardsRef.current])); } catch { /* ignore */ }
    track(EVENTS.CARD_RATE, {
      card_id: id,
      rating,
      advisor: currentCard.advisor,
      is_crisis: isCrisis,
      month: months,
    });
    haptic("light");
    setCardRating(rating);
  }, [currentCard, isCrisis, months, haptic]);

  const selectDifficulty = (d) => {
    if (!DIFFICULTIES.includes(d) || d === difficulty) return;
    setDifficulty(d);
    telegramStorage.setItem("varon_difficulty", d);
    haptic("light");
  };

  const handleNameSubmit = () => {
    const name = nameInput.trim() || "Президент";
    setPresidentName(name);
    telegramStorage.setItem("varon_pname", name);
    track(EVENTS.NAME_SUBMIT, { is_default_name: !nameInput.trim() });
    track(EVENTS.GAME_START, { from: "name_submit" });
    setLastResult(null);
    setVictoryEndingId(null);
    setPhase("card");
    haptic("medium");
  };

  // Админ-переключатель режима VPN «Наружу». safeMode=true → реклама VPN скрыта.
  // Пересобираем колоду на лету: VPN-карты исчезают/возвращаются, прогресс (стат, срок) сохраняется.
  const toggleSafeMode = () => {
    setSafeMode(prev => {
      const next = !prev;
      telegramStorage.setItem("varon_safe", next ? "1" : "0");
      setDeck(buildDeck(next));
      setCardIdx(0);
      if (next) setPromoCode(null);
      track(EVENTS.SAFE_MODE_TOGGLE, { enabled: next, source: "admin_panel" });
      return next;
    });
    haptic("light");
  };

  const restart = () => {
    track(EVENTS.RESTART);
    setStats({ oligarchs:50, army:50, people:50, west:50 });
    setMonths(1);
    setDeck(buildDeck(safeMode));
    setCardIdx(0);
    setPhase("onboarding");
    setDeathMsg("");
    setNameInput("");
    setHovered(null);
    setIsCrisis(false);
    setCrisisCard(null);
    setTermsCompleted(0);
    setVictoryEndingId(null);
    setPendingEvents([]);
    setDecisionLog([]);
    setLastResult(null);
    setGlobalResult(null);
    setHasUsedSecondChance(false);
    setHasUsedVpnRevive(false);
    setReviveAvailable(false);
    setRescueCard(null);
    choosing.current = false;
    historyRef.current = [];
    telegramStorage.removeItem("varon_save");
  };

  // Открытие лендинга «Наружу» с сегментированной UTM-разметкой,
  // чтобы различать источник клика (онбординг / карта / хаб), конкретную карту,
  // прогресс игрока и выданный промокод для атрибуции конверсий.
  const openNaruzhu = (source = "hub", content = "") => {
    const url = naruzhuUrl(source, content, Math.max(0, months - 1), promoCode, ctaVariant?.id, yclid);
    track(EVENTS.NARUZHU_CLICK, {
      source,
      content: content || null,
      cta_variant: ctaVariant?.id || null,
      months: Math.max(0, months - 1),
      promo: promoCode?.code || null,
    });
    // Учитываем как внешний переход и открываем правильным способом.
    trackOutbound(url, { kind: "naruzhu", source, content: content || null });
  };

  const copyPromo = async () => {
    if (!promoCode?.code) return;
    const copied = await copyText(promoCode.code);
    track(EVENTS.PROMO_COPIED, { promo: promoCode.code, success: copied });
    haptic(copied ? "light" : "medium");
  };

  // VPN-ревайв: открывает размеченную ссылку, откатывает последние 2 решения.
  const reviveViaVpn = () => {
    track(EVENTS.VPN_REVIVE);
    openNaruzhu("revive");
    const hist = historyRef.current;
    const snap = (hist.length >= 2 ? hist[hist.length - 2] : hist[0]) || resumeReviveRef.current;
    if (!snap) return;
    // Ревайв отменяет ту смерть → снимаем её запись с личной доски, чтобы одно
    // непрерывное прохождение не двоилось. Продолженная партия запишет свой
    // финальный результат сама. (Глобальную доску сервер чинит сам: хранит
    // 1 лучший результат на игрока, поэтому старый низкий счёт вытеснится.)
    if (lastResult?.id) {
      setLeaderboard(prev => {
        const next = prev.filter(e => e.id !== lastResult.id);
        telegramStorage.setItem("varon_leaderboard", JSON.stringify(next));
        return next;
      });
    }
    setLastResult(null);
    setStats(snap.stats);
    setMonths(snap.months);
    setDeck(snap.deck);
    setCardIdx(snap.cardIdx);
    setPendingEvents(snap.pendingEvents);
    setHasUsedVpnRevive(true);
    setReviveAvailable(false);
    setDeathMsg("");
    setIsCrisis(false);
    setPromoCode(null);
    try {
      telegramStorage.setItem("varon_save", JSON.stringify({
        stats: snap.stats,
        months: snap.months,
        deck: snap.deck,
        cardIdx: snap.cardIdx,
        pendingEvents: snap.pendingEvents,
        hasUsedSecondChance,
        hasUsedVpnRevive: true,
        rescueCard: null,
        termsCompleted,
        difficulty,
        phase: "card",
      }));
    } catch { /* no-op */ }
    setPhase("card");
  };

  const tenure      = months - 1;
  const tenureLabel = tenure < 6 ? "КАТАСТРОФА" : tenure < 24 ? "ПРОВАЛ" : tenure < 48 ? "СЛАБО" : tenure < 96 ? "НЕПЛОХО" : tenure < 144 ? "КРЕПКИЙ ЛИДЕР" : "ЛЕГЕНДА";
  const killerKey   = PARAMS.find(p => stats[p.key] <= 0 || stats[p.key] >= 100)?.key;
  const ending      = phase === "victory" ? (victoryEndingId ? ENDINGS[victoryEndingId] : getVictoryEnding(stats, tenure)) : null;
  // Цвета карты вынесены в CSS (.game-card / .game-card.crisis в App.css).

  // Превью с реальным сбалансированным масштабом
  const previewFxReal = hovered && currentCard
    ? Object.fromEntries(PARAMS.map(p => [p.key, scaleStatEffect(p.key, currentCard[hovered].fx[p.key] || 0, difficulty, months)]))
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
  const PROMO_LINE = safeMode ? "" : `\n🔒 7 дней VPN «Наружу» бесплатно — промокод NARUZHU10: ${naruzhuUrl("share", "", Math.max(0, months - 1), null, "", yclid)}`;
  const LEADERBOARD_SHARE_LINE = lastResult?.rank
    ? `\nЛичная доска почета: #${lastResult.rank}, ${lastResult.score} мес.`
    : "";
  // Реферальная метка: friend, открывший ссылку, получит start_param = ref_<хэш>,
  // что позволяет атрибутировать его к пригласившему игроку.
  const refTag     = `ref_${hashStr(window.Telegram?.WebApp?.initDataUnsafe?.user?.id || "guest")}`;
  // Deep-link в мини-апп с меткой источника — для учёта входящих переходов из share.
  const BOT_LINK   = appendUtm("https://t.me/varonia_bot", { startapp: refTag });
  const SHARE_SIGNATURE = "Варония - президентский симулятор, где возможно всё.";
  // Открывает системный share Telegram с переданным сообщением и размеченной ссылкой.
  const openShare = (msg, kind) => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(BOT_LINK)}&text=${encodeURIComponent(msg)}`;
    track(EVENTS.SHARE_CLICK, { kind });
    trackOutbound(url, { kind: `share_${kind}` });
  };

  const shareGameOver = () => {
    const killerParam = PARAMS.find(p => stats[p.key] <= 0 || stats[p.key] >= 100);
    const key    = killerParam?.key || "people";
    const isHigh = stats[key] >= 100;
    const text   = SHARE_DEATH[key]?.[isHigh ? "high" : "low"] || `${tenure} мес. у власти в Варонии.`;
    const msg    = `${text}${LEADERBOARD_SHARE_LINE}${PROMO_LINE}\n\n${SHARE_SIGNATURE}\n${BOT_LINK}`;
    openShare(msg, "gameover");
  };

  const VICTORY_TEXTS = [
    `Два срока в Варонии. Живой. Это уже достижение. ${tenure} мес. у власти.`,
    `Я пережил олигархов, генералов, оппозицию и западных партнёров. ${tenure} мес.`,
    `Варония процветает. Или нет. Но я всё ещё у власти — ${tenure} месяцев.`,
  ];
  const shareVictory = () => {
    const text = VICTORY_TEXTS[Math.floor(Math.random() * VICTORY_TEXTS.length)];
    const msg  = `${text}${LEADERBOARD_SHARE_LINE}${PROMO_LINE}\n\n${SHARE_SIGNATURE}\n${BOT_LINK}`;
    openShare(msg, "victory");
  };

  // ─── РЕНДЕР ───────────────────────────────────────────────────────────────
  if (isInitializing) {
    return (
      <div className="loading-splash-screen">
        <div className="loading-splash-content">
          <div className="loading-spinner" />
          <div className="loading-text">ИНИЦИАЛИЗАЦИЯ СИСТЕМЫ...</div>
        </div>
      </div>
    );
  }

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
          tenure={tenure}
          phase={phase}
          onHubOpen={() => { track(EVENTS.HUB_OPEN); haptic("light"); setShowHub(true); }}
        />

        {/* ── ШКАЛЫ ── */}
        <div className="stats-panel">
          {PARAMS.map(p => <StatPill key={p.key} param={p} value={stats[p.key]} flash={!!flashParams[p.key]} preview={difficulty === "hardcore" ? 0 : (previewFxReal ? (previewFxReal[p.key] || 0) : 0)}/>)}
        </div>

        {/* ════════════════════════════════ ОНБОРДИНГ ════════════════════════════════ */}
        {phase === "onboarding" && (
          <OnboardingScreen
            presidentName={presidentName}
            nameInput={nameInput}
            onNameInput={setNameInput}
            onNameSubmit={handleNameSubmit}
            difficulty={difficulty}
            onSelectDifficulty={selectDifficulty}
            onNewTerm={() => { track(EVENTS.GAME_START, { from: "new_term" }); haptic("medium"); setLastResult(null); setGlobalResult(null); setVictoryEndingId(null); setPhase("card"); }}
            onPlayAsOther={() => { track(EVENTS.PLAY_AS_OTHER); haptic("light"); setPresidentName(""); telegramStorage.removeItem("varon_pname"); }}
            onNaruzhu={() => openNaruzhu("onboarding")}
            safeMode={safeMode}
          />
        )}

        {/* ════════════════════════════════ GAME OVER ════════════════════════════════ */}
        {phase === "gameover" && (
          <GameOverScreen
            tenure={tenure}
            tenureLabel={tenureLabel}
            deathMsg={deathMsg}
            killerKey={killerKey}
            promoCode={safeMode ? null : promoCode}
            canRevive={!safeMode && !hasUsedVpnRevive && reviveAvailable}
            leaderboard={leaderboard}
            resultEntry={lastResult}
            globalLeaderboard={globalLeaderboard}
            globalResult={globalResult}
            onShare={shareGameOver}
            onRestart={restart}
            onVpnRevive={reviveViaVpn}
            onCopyPromo={copyPromo}
            onOpenNaruzhu={() => openNaruzhu("gameover_promo")}
          />
        )}

        {/* ════════════════════════════════ ПОБЕДА ════════════════════════════════ */}
        {phase === "victory" && (
          <VictoryScreen
            tenure={tenure}
            ending={ending}
            stats={stats}
            decisionLog={decisionLog}
            promoCode={safeMode ? null : promoCode}
            leaderboard={leaderboard}
            resultEntry={lastResult}
            globalLeaderboard={globalLeaderboard}
            globalResult={globalResult}
            onCopyPromo={copyPromo}
            onOpenNaruzhu={() => openNaruzhu("victory_promo")}
            onShare={shareVictory}
            onRestart={restart}
          />
        )}

        {/* ════════════════════════════════ ВЫБОРЫ ════════════════════════════════ */}
        {phase === "election" && (
          <ElectionScreen peopleStat={stats.people} onChoose={choose} />
        )}

        {/* ════════════════════════════════ КОНСТИТУЦИЯ ════════════════════════════════ */}
        {phase === "constitution" && (
          <ConstitutionScreen onChoose={choose} />
        )}

        {/* ════════════════════════════════ ВТОРОЙ ШАНС ════════════════════════════════ */}
        {phase === "second_chance" && rescueCard && (
          <SecondChanceScreen rescueCard={rescueCard} onChoose={choose} />
        )}

        {/* ════════════════════════════════ ИГРОВАЯ КАРТА ════════════════════════════════ */}
        {phase === "card" && currentCard && (
          <GameCard
            isCrisis={isCrisis}
            advisor={advisor}
            currentCard={currentCard}
            hovered={hovered}
            setHovered={setHovered}
            ctaVariant={ctaVariant}
            safeMode={safeMode}
            cardRef={cardRef}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            haptic={haptic}
            onChoose={choose}
            onNaruzhu={(id) => openNaruzhu("card", id)}
            ratingEnabled={import.meta.env.VITE_RATING_ENABLED === "1"}
            cardRating={cardRating}
            onRate={rateCard}
          />
        )}

        <div className="top-line bottom" />

        {/* ════════ VPN НАРУЖУ HUB — ПОКИНУТЬ ВАРОНИЮ ════════ */}
        {showHub && (
          <HubOverlay
            onClose={() => setShowHub(false)}
            bestScore={bestScore}
            leaderboard={leaderboard}
            globalLeaderboard={globalLeaderboard}
            achievements={achievements}
            unlockedEndings={unlockedEndings}
            referralCount={referralCount}
            safeMode={safeMode}
            isAdmin={isAdmin}
            onOpenAdmin={() => { setShowHub(false); setShowAdmin(true); }}
            onOpenNaruzhu={() => openNaruzhu("hub")}
            onReferralShared={() => {
              track(EVENTS.REFERRAL_SHARED);
              setReferralCount(prev => {
                const next = prev + 1;
                telegramStorage.setItem("varon_refs", String(next));
                return next;
              });
            }}
            haptic={haptic}
          />
        )}

        {/* ════════ ВНУТРИИГРОВАЯ АНАЛИТИКА — ТОЛЬКО ДЛЯ @deprav ════════ */}
        {showAdmin && isAdmin && (
          <AdminAnalyticsPanel
            onClose={() => setShowAdmin(false)}
            safeMode={safeMode}
            onToggleSafeMode={toggleSafeMode}
          />
        )}
      </div>
    </>
  );
}
