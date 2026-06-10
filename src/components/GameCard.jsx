import { getAsset } from "../lib/assets.js";

const NARUZHU_YELLOW = "#FFD60A";

const ADVISOR_BACKGROUNDS = {
  0: "/images/bg_finance_ministry.webp",
  1: "/images/bg_military_parade.webp",
  2: "/images/bg_tv_makeup_room.webp",
  3: "/images/bg_security_bunker.webp",
  4: "/images/bg_west_summit.webp",
  5: "/images/bg_church_interior.webp",
  6: "/images/bg_protest.webp",
  7: "/images/bg_moscow_city_backroom.webp",
  8: "/images/bg_influencer_apology_set.webp", // Пизулина — цензура
  9: "/images/bg_court_corridor_phones.webp",  // Борзыкин — следствие/суды
  10: "/images/bg_drone_factory.webp",         // Погожинга — дружина «Порох»
  11: "/images/bg_prison_colony.webp",         // Фсинов — тюремное ведомство
};

const THEME_BACKGROUNDS = [
  { bg: "/images/bg_pensioner_kitchen_receipts.webp", words: ["пенсион", "старик", "старух", "старост", "пенси", "пособ", "соцвыплат", "соцподдерж", "льготник", "жкх", "квартплат", "коммунал"] },
  { bg: "/images/bg_discount_grocery_evening.webp", words: ["масло", "яиц", "яйц", "продукт", "еда", "супермаркет", "магазин", "полк", "цен", "дефицит", "спред", "пальм"] },
  { bg: "/images/bg_night_bus_commute.webp", words: ["мрот", "зарплат", "вахт", "смен", "маршрутк", "автобус", "проезд", "транспорт", "коммьют", "работающ"] },
  { bg: "/images/bg_call_center_burnout.webp", words: ["выгоран", "депресс", "психолог", "стресс", "колл", "оператор", "офис", "переработ", "удаленк", "удалёнк", "выходн"] },
  { bg: "/images/bg_child_room_absent_parent.webp", words: ["демограф", "рождаем", "деторожд", "чайлдфри", "ребен", "ребён", "детск", "родител", "семь", "материнск"] },
  { bg: "/images/bg_apartment_elevator_mirror.webp", words: ["домофон", "подъезд", "лифт", "квартир", "жиль", "ипотек", "новострой", "управляющ"] },
  { bg: "/images/bg_microdistrict_winter_windows.webp", words: ["бедност", "нищ", "провинц", "регион", "окраин", "спальн", "район", "народ бедне", "уровень жизни"] },
  { bg: "/images/bg_monotown_bus_stop.webp", words: ["моногород", "завод закр", "безработ", "сокращен", "сокращён", "градообраз", "увольнен", "увольнён"] },
  { bg: "/images/bg_social_worker_desk.webp", words: ["соцслуж", "мфц", "заявлен", "справк", "субсид", "малоимущ", "выплат", "очередь на жиль"] },
  { bg: "/images/bg_factory_locker_room.webp", words: ["завод", "рабоч", "профсоюз", "смена", "переработк", "трудов", "станок", "цех"] },
  { bg: "/images/bg_regional_hospital_corridor.webp", words: ["медицин", "больниц", "здрав", "койк", "ивл", "грипп", "врач", "медсестр", "поликлиник"] },
  { bg: "/images/bg_payday_loan_window.webp", words: ["микрозайм", "микрокредит", "коллектор", "закредит", "заём", "займ", "быстрые деньги"] },

  { bg: "/images/bg_polling_station_server.webp", words: ["выбор", "цик", "избират", "голосован", "урн", "бюллетен", "кампан"] },
  { bg: "/images/bg_cctv_courtyard.webp", words: ["слеж", "биометр", "распозна", "камерах", "камер", "прослуш", "наблюден", "личн"] },
  { bg: "/images/bg_security_bunker.webp", words: ["фсб", "совбез", "агент", "шпион", "донос", "кибератак", "хакер", "экстрем"] },
  { bg: "/images/bg_gosuslugi_datacenter.webp", words: ["госуслуг", "паспортн", "персональн", "данн", "биометр", "реестр", "профиль", "цифров"] },
  { bg: "/images/bg_rooftop_antenna_farm.webp", words: ["сорм", "трафик", "провайдер", "шифр", "перехват", "связь", "антенн", "частот"] },
  { bg: "/images/bg_chebunet_control.webp", words: ["чебунет", "vpn", "youtube", "telegram", "интернет", "блокиров", "тспу", "wikipedia", "варонпед", "meta", "instagram", "facebook", "провайдер"] },
  { bg: "/images/bg_border_bus_terminal.webp", words: ["границ", "бежен", "выезд", "паспорт", "виз", "закрыть выезд", "депортац", "релокац"] },
  { bg: "/images/bg_oligarch_private_terminal.webp", words: ["эмиграц", "уехал", "уехали", "айтиш", "утечк", "мозг", "внуково", "джет", "дубай", "монако"] },
  { bg: "/images/bg_prison_colony.webp", words: ["колони", "тюрьм", "заключ", "зэк", "сизо", "посад", "срок"] },
  { bg: "/images/bg_court_corridor_phones.webp", words: ["суд", "гааг", "трибунал", "арест", "госизмен", "приговор", "верховн", "дело", "следств"] },
  { bg: "/images/bg_mining_strike.webp", words: ["уголь", "шахт", "шахтер", "шахтёр", "забастов"] },
  { bg: "/images/bg_oil_gas_field.webp", words: ["нефт", "газ", "алюмини", "порт", "труб", "байкал", "энерг"] },
  { bg: "/images/bg_luxury_clinic_vip.webp", words: ["частн", "клиник", "vip", "вип", "элитн", "санатор", "лечение чинов"] },
  { bg: "/images/bg_pharmacy_queue.webp", words: ["лекар", "аптек", "вакцин"] },
  { bg: "/images/bg_school_tablets.webp", words: ["школ", "учеб", "образован", "егэ", "истори", "студент", "университет", "гимназ", "учитель"] },
  { bg: "/images/bg_tv_makeup_room.webp", words: ["пресс", "тв", "телеканал", "эфир", "трансляц", "прямая линия", "журналист", "власова"] },
  { bg: "/images/bg_influencer_apology_set.webp", words: ["блогер", "рэпер", "артист", "концерт", "извинен", "извинён", "покаян", "отмен", "ник"] },
  { bg: "/images/bg_drone_factory.webp", words: ["дрон", "беспилот", "пво", "ракет", "снаряд", "оруж", "оборон"] },
  { bg: "/images/bg_military_parade.webp", words: ["парад", "мобилизац", "танк", "ракет", "воен", "армия", "пво", "нато", "снаряд", "призыв", "громов"] },
  { bg: "/images/bg_monument_square.webp", words: ["монумент", "памятник", "историческ", "памят", "советск"] },
  { bg: "/images/bg_z_letter_garage.webp", words: ["гараж", "внедорож", "кортеж", "силов", "спецслужб", "облав", "рейд"] },
  { bg: "/images/bg_suburban_detention_van.webp", words: ["задержан", "обыск", "маски-шоу", "маски шоу", "автозак", "омон", "ночью пришли"] },
  { bg: "/images/bg_palace_corruption.webp", words: ["дворц", "кремл", "резиденц", "коррупц", "золот", "президент", "цитадел"] },
  { bg: "/images/bg_dacha_cooperative.webp", words: ["кооператив", "дач", "озеро"] },
  { bg: "/images/bg_oligarch_private_terminal.webp", words: ["яхт", "роскош", "forbes", "льгот", "суперъяхт"] },
  { bg: "/images/bg_moscow_city_backroom.webp", words: ["усманов", "олигарх", "бизнес", "инвест", "акционер", "совет директор"] },
  { bg: "/images/bg_import_substitution_lab.webp", words: ["импортозамещ", "параллельн", "санкцион", "сертифик", "качество", "пальма", "сыр", "самолет", "самолёт"] },
  { bg: "/images/bg_bank_queue_qr.webp", words: ["рубл", "банк", "бюджет", "инфляц", "налог", "мвф", "fitch", "тариф", "ставк", "зубов", "платеж", "платёж"] },
  { bg: "/images/bg_crypto_basement_exchange.webp", words: ["крипт", "биткоин", "кошелек", "кошелёк", "майнинг", "валют", "обнал", "санкц"] },
  { bg: "/images/bg_regional_governor_zoom.webp", words: ["губернатор", "совещан", "региональн", "зум", "zoom", "видеосвяз", "отчет", "отчёт"] },
  { bg: "/images/bg_food_delivery_court.webp", words: ["доставк", "курьер", "самозанят", "общепит", "кафе", "торгов", "трц"] },
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
  isCrisis, advisor, currentCard, hovered, setHovered, ctaVariant, safeMode,
  cardRef, onTouchStart, onTouchMove, onTouchEnd, haptic, onChoose, onNaruzhu,
  ratingEnabled, cardRating, onRate,
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
          <div className="game-card-body" style={{ flex: 1, padding: "22px 18px 16px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
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
            {!safeMode && currentCard.cta === "naruzhu" && (
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

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 8, flexShrink: 0 }}>
        {ratingEnabled && (() => {
          const rated = cardRating === "up" || cardRating === "down" || cardRating === "rated";
          const btn = (kind, glyph, color) => {
            return (
              <button
                onClick={e => { e.stopPropagation(); if (!rated) onRate(kind); }}
                disabled={rated}
                aria-label={kind === "up" ? "Хорошая карта" : "Плохая карта"}
                style={{
                  background: "none", border: "none", cursor: rated ? "default" : "pointer",
                  fontSize: 17, lineHeight: 1, padding: 4,
                  opacity: rated ? (cardRating === kind ? 1 : 0.25) : 0.4,
                  filter: cardRating === kind ? `drop-shadow(0 0 5px ${color})` : "grayscale(0.4)",
                  transition: "opacity 0.2s ease, filter 0.2s ease",
                }}
              >{glyph}</button>
            );
          };
          return (
            <>
              {btn("up", "👍", "#d4af37")}
              <span style={{ fontSize: 11, color: "#d4af3788", fontFamily: "var(--font-mono)", letterSpacing: 1.5, fontWeight: 500 }}>
                ← СВАЙП ИЛИ ТАП →
              </span>
              {btn("down", "👎", "#ff756b")}
            </>
          );
        })()}
        {!ratingEnabled && (
          <span style={{ fontSize: 11, color: "#d4af3788", fontFamily: "var(--font-mono)", letterSpacing: 1.5, fontWeight: 500 }}>
            ← СВАЙП ИЛИ ТАП →
          </span>
        )}
      </div>
    </div>
  );
}
