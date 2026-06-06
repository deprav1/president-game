import { getAsset } from "../lib/assets.js";

const NARUZHU_YELLOW = "#FFD60A";

const ADVISOR_BACKGROUNDS = {
  0: "/images/bg_finance_ministry.webp",
  1: "/images/bg_military_parade.webp",
  2: "/images/bg_state_tv_studio.webp",
  3: "/images/bg_security_bunker.webp",
  4: "/images/bg_west_summit.webp",
  5: "/images/bg_church_interior.webp",
  6: "/images/bg_protest.webp",
  7: "/images/bg_oligarch_yacht.webp",
};

const THEME_BACKGROUNDS = [
  { bg: "/images/bg_election_commission.webp", words: ["выбор", "цик", "избират", "голосован", "урн", "бюллетен"] },
  { bg: "/images/bg_security_bunker.webp", words: ["слеж", "фсб", "совбез", "биометр", "распозна", "агент", "шпион", "донос", "прослуш", "кибератак", "хакер", "экстрем"] },
  { bg: "/images/bg_chebunet_control.webp", words: ["чебунет", "vpn", "youtube", "telegram", "интернет", "блокиров", "тспу", "wikipedia", "варонпед", "meta", "instagram", "facebook", "блогер", "провайдер", "шифр", "трафик"] },
  { bg: "/images/bg_elite_airport.webp", words: ["эмиграц", "уехал", "уехали", "айтиш", "утечк", "мозг", "внуково", "джет"] },
  { bg: "/images/bg_border_checkpoint.webp", words: ["границ", "бежен", "выезд", "паспорт", "виз", "закрыть выезд", "депортац"] },
  { bg: "/images/bg_prison_colony.webp", words: ["колони", "тюрьм", "заключ", "зэк", "сизо", "посад", "срок"] },
  { bg: "/images/bg_courtroom.webp", words: ["суд", "гааг", "трибунал", "арест", "госизмен", "приговор", "верховн"] },
  { bg: "/images/bg_mining_strike.webp", words: ["уголь", "шахт", "шахтер", "шахтёр", "рабоч", "забастов"] },
  { bg: "/images/bg_oil_gas_field.webp", words: ["нефт", "газ", "алюмини", "завод", "порт", "труб", "байкал", "энерг"] },
  { bg: "/images/bg_hospital_ward.webp", words: ["медицин", "больниц", "здрав", "койк", "ивл", "грипп"] },
  { bg: "/images/bg_pharmacy_queue.webp", words: ["лекар", "пенсион", "мрот", "аптек", "вакцин"] },
  { bg: "/images/bg_school_propaganda.webp", words: ["школ", "учеб", "образован", "егэ", "истори", "студент", "университет", "дет"] },
  { bg: "/images/bg_state_tv_studio.webp", words: ["пресс", "тв", "телеканал", "эфир", "трансляц", "прямая линия", "блог", "рэпер", "журналист"] },
  { bg: "/images/bg_military_parade.webp", words: ["парад", "мобилизац", "танк", "ракет", "воен", "армия", "пво", "нато", "снаряд", "призыв", "громов"] },
  { bg: "/images/bg_monument_square.webp", words: ["монумент", "памятник", "историческ", "памят", "советск"] },
  { bg: "/images/bg_palace_corruption.webp", words: ["дворц", "кремл", "резиденц", "коррупц", "золот", "президент"] },
  { bg: "/images/bg_dacha_cooperative.webp", words: ["кооператив", "дач", "озеро"] },
  { bg: "/images/bg_oligarch_yacht.webp", words: ["усманов", "олигарх", "яхт", "роскош", "forbes", "бизнес", "льгот"] },
  { bg: "/images/bg_finance_ministry.webp", words: ["рубл", "банк", "бюджет", "инфляц", "налог", "мвф", "fitch", "кредит", "тариф", "долг", "субсид"] },
];

const getCardBackground = (card) => {
  if (card.bgImage) return card.bgImage;
  const haystack = [
    card.text,
    card.left?.label,
    card.left?.text,
    card.right?.label,
    card.right?.text,
  ].filter(Boolean).join(" ").toLowerCase();

  const theme = THEME_BACKGROUNDS.find(({ words }) => words.some(word => haystack.includes(word)));
  return theme?.bg || ADVISOR_BACKGROUNDS[card.advisor];
};

// Главный игровой экран: советник, текст-дилемма, превью эффектов, выбор/свайп.
// Цвета карты вынесены в CSS (.game-card / .game-card.crisis и т.д.) — правятся там.
// cardRef передаётся как обычный проп (для swipe-анимации в родителе).
export default function GameCard({
  isCrisis, advisor, currentCard, hovered, setHovered, ctaVariant,
  cardRef, onTouchStart, onTouchMove, onTouchEnd, haptic, onChoose, onNaruzhu,
}) {
  const crisis = isCrisis ? " crisis" : "";
  const bgImage = getCardBackground(currentCard);

  return (
    <div className={`game-card-screen${crisis}`}>
      {/* Лента-сирена кризиса — явно «другой флоу» */}
      {isCrisis && (
        <div className="crisis-banner">🚨 ЭКСТРЕННАЯ СИТУАЦИЯ 🚨</div>
      )}
      <div
        ref={cardRef}
        style={{ flex: 1, minHeight: 0, animation: "cardIn 0.3s ease", position: "relative", touchAction: "pan-y", willChange: "transform" }}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      >
        <div className={`game-card${crisis}`}>
          {/* Советник — геро-полоса: крупный портрет, низ растворяется в фон,
              имя/роль поверх снизу. Чёрный фон портретов сливается с картой. */}
          <div className={`game-card-hero${crisis}`}>
            <img className="game-card-hero-img" src={getAsset(advisor.avatar)} alt="" onError={e => e.currentTarget.style.display = 'none'} />
            <div className="game-card-hero-meta">
              <div className="game-card-hero-name">{advisor.name}</div>
              <div className="game-card-hero-role">{advisor.role}</div>
            </div>
          </div>

          {/* Текст карты */}
          <div className="game-card-body" style={{ flex: 1, padding: "28px 18px 16px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
            {/* Атмосферный фон-подложка «мир Варонии» (заполняет пустоту) */}
            <div className="game-card-ambiance" />
            {bgImage && (
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                backgroundImage: `url(${getAsset(bgImage)})`,
                backgroundSize: "cover", backgroundPosition: "center",
                opacity: 0.32, zIndex: 0, pointerEvents: "none"
              }} />
            )}
            {currentCard.assetImage && (
              <img src={getAsset(currentCard.assetImage)} className="card-advisor-avatar" alt="" style={{ zIndex: 1 }} onError={e => e.currentTarget.style.display = 'none'} />
            )}
            {hovered && (
              <div style={{
                position: "absolute", top: 12, left: "50%", transform: `translateX(-50%) rotate(${hovered === "left" ? "-6deg" : "6deg"})`,
                zIndex: 10, border: `2px solid ${hovered === "left" ? "#4ade80" : "#ff756b"}`,
                borderRadius: 6, padding: "4px 14px",
                color: hovered === "left" ? "#4ade80" : "#ff756b",
                fontFamily: "var(--font-sans)", fontSize: 15, letterSpacing: 1.5, fontWeight: 700,
                opacity: 0.93, animation: "fadeIn 0.15s ease", pointerEvents: "none",
                background: "rgba(0,0,0,0.75)", whiteSpace: "nowrap",
              }}>
                {hovered === "left" ? currentCard.left.label.toUpperCase() : currentCard.right.label.toUpperCase()}
              </div>
            )}
            <p className="game-card-text">
              {currentCard.text}
            </p>
            {currentCard.cta === "naruzhu" && (
              <button
                onClick={e => { e.stopPropagation(); haptic("light"); onNaruzhu(currentCard?.id || "card"); }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  margin: "12px auto 0", padding: "8px 16px", borderRadius: 999,
                  background: "linear-gradient(135deg, rgba(255,214,10,0.2), rgba(15,10,0,0.9))",
                  border: `1px solid ${NARUZHU_YELLOW}`,
                  cursor: "pointer", color: NARUZHU_YELLOW,
                  fontSize: 12, fontFamily: "var(--font-mono)", letterSpacing: 0.6,
                  fontWeight: 700,
                  boxShadow: `0 0 18px ${NARUZHU_YELLOW}33`,
                }}
              >
                {ctaVariant.label}
              </button>
            )}
          </div>

          <div className="game-card-divider" />

          {/* Кнопки */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "12px", flexShrink: 0 }}>
            {["left", "right"].map(side => (
              <button key={side}
                className={`game-choice-btn${hovered === side ? " active" : ""}`}
                onClick={() => { haptic("medium"); onChoose(side); }}
                onMouseEnter={() => setHovered(side)}
                onMouseLeave={() => setHovered(null)}
              >
                <div className="game-choice-btn-label">
                  {currentCard[side].label.toUpperCase()}
                </div>
                <div className="game-choice-btn-text">{currentCard[side].text}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 8, flexShrink: 0, fontSize: 11, color: "#d4af3788", fontFamily: "var(--font-mono)", letterSpacing: 1.5, fontWeight: 500 }}>
        ← СВАЙП ИЛИ ТАП →
      </div>
    </div>
  );
}
