const ADVISOR_BACKGROUNDS = {
  0: "/images/bg_finance_ministry.webp",
  1: "/images/bg_military_parade.webp",
  2: "/images/bg_tv_makeup_room.webp",
  3: "/images/bg_security_bunker.webp",
  4: "/images/bg_west_summit.webp",
  5: "/images/bg_church_interior.webp",
  6: "/images/bg_protest.webp",
  7: "/images/bg_moscow_city_backroom.webp",
  8: "/images/bg_influencer_apology_set.webp",
  9: "/images/bg_court_corridor_phones.webp",
  10: "/images/bg_drone_factory.webp",
  11: "/images/bg_prison_colony.webp",
};

// More specific themes must stay above broader institutional fallbacks.
const THEME_BACKGROUNDS = [
  { bg: "/images/bg_constitution_shredder.webp", words: ["конституц", "поправк", "обнул", "сроки", "свод законов", "референдум", "правление"] },
  { bg: "/images/bg_ballot_grinder.webp", words: ["выбор", "цик", "избират", "голосован", "урн", "бюллетен", "явка", "процент", "фальсификац", "превентивн"] },
  { bg: "/images/bg_citizenship_exit_toll.webp", words: ["пошлин", "выход из гражданства", "сбежать", "выезд из", "закрыть выезд", "лишить гражданства", "паспорт"] },
  { bg: "/images/bg_foreign_agent_label_factory.webp", words: ["иноагент", "нежелательн", "экстремистск", "клеймо", "плашк", "маркировк", "реестр блогеров"] },
  { bg: "/images/bg_reality_editing_room.webp", words: ["монтаж", "дипфейк", "версия", "провокац", "слита в сеть", "видеозапись", "запись", "фото"] },
  { bg: "/images/bg_public_apology_stage.webp", words: ["покаян", "извинен", "публичн", "минут", "отмен", "концерт", "рэпер", "артист"] },
  { bg: "/images/bg_court_puppet_theater.webp", words: ["судебн", "судей", "управляем", "приговор", "трибунал", "закрытый процесс", "показательный процесс"] },
  { bg: "/images/bg_procurement_showroom.webp", words: ["госконтракт", "закупк", "распил", "золотой унитаз", "смет", "снаряд", "военные премии", "оборонный бюджет"] },
  { bg: "/images/bg_missile_chapel.webp", words: ["освят", "ракет", "храм вооруж", "бог и армия", "священн", "благослов", "трофейной техники"] },
  { bg: "/images/bg_demographic_tax_nursery.webp", words: ["бездетн", "налог на эгоизм", "чайлдфри", "рождаем", "демограф", "аборт", "материнск", "деторожд"] },
  { bg: "/images/bg_military_kindergarten.webp", words: ["кадет", "детдом", "строев", "милитариз", "ребен", "детск", "школьница", "гимназист"] },
  { bg: "/images/bg_sovereign_browser_cage.webp", words: ["чебубраузер", "браузер", "смартфон", "компьютер", "приложен", "steam", "discord", "предустанов"] },
  { bg: "/images/bg_digital_confession_booth.webp", words: ["церковный суд", "грех", "душ", "скреп", "духовн", "исповед", "биометр"] },
  { bg: "/images/bg_public_opinion_lab.webp", words: ["рейтинг", "соцопрос", "опрос", "поддержк", "общественное мнение", "лидеры мнений"] },
  { bg: "/images/bg_budget_magic_table.webp", words: ["соцрасход", "урез", "экономия бюджета", "дыра в бюджете", "пенсионный фонд", "смета", "фонд национального"] },
  { bg: "/images/bg_pension_slot_machine.webp", words: ["пенсион", "пенсии", "старик", "старух", "старост", "пособ", "соцвыплат", "льготник"] },
  { bg: "/images/bg_golden_egg_safe.webp", words: ["яиц", "яйц", "масло в супермаркетах", "масло", "продукт", "дефицит", "сейф"] },
  { bg: "/images/bg_oligarch_aquarium.webp", words: ["офшор", "яхт", "виллы", "лазурн", "друзей по кооперативу", "аквадискотека", "суперъяхт"] },
  { bg: "/images/bg_loyalty_vending_machine.webp", words: ["орден", "медал", "наград", "зван", "титул", "грамот", "верност", "лояльн"] },
  { bg: "/images/bg_corruption_broom_closet.webp", words: ["коррупц", "внутреннюю проверку", "закрыть тему", "замять", "деклараци", "расследование ск"] },
  { bg: "/images/bg_mobilization_train_platform.webp", words: ["мобилизац", "повестк", "призывник", "призывн", "уклонист", "мобилизацион", "электронн реестр", "реестр повест", "подъемн"] },
  { bg: "/images/bg_border_forest_checkpoint.webp", words: ["закрыть выезд", "выезд из", "границ", "бежен", "паспорт", "виз", "депортац", "релокац", "лишить гражданства", "выход из гражданства", "возвращающ"] },
  { bg: "/images/bg_evidence_locker_corridor.webp", words: ["госизмен", "следств", "допрос", "улики", "доказательств", "обыск", "уголовн", "адвокат", "показательный процесс", "закрытый процесс", "приговор", "трибунал"] },
  { bg: "/images/bg_state_archive_basement.webp", words: ["архив", "засекрет", "гриф", "государственная тайна", "закрыть реестр", "реестр недвижимости", "деклараци", "секретн"] },
  { bg: "/images/bg_ai_propaganda_lab.webp", words: ["дипфейк", "нейросет", "искусственн", "алгоритм", "биометр", "распознаван", "камер", "профиль", "персональн", "цифров"] },
  { bg: "/images/bg_state_media_machine_room.webp", words: ["телеканал", "телевид", "госканал", "эфир", "вещан", "пропаганд", "пресс-конференц", "прямая линия", "видеоблог", "госмедиа"] },
  { bg: "/images/bg_surveillance_lecture_hall.webp", words: ["школ", "учеб", "образован", "егэ", "истори", "студент", "университет", "гимназ", "учитель", "учебник", "урок", "биолог", "физик"] },
  { bg: "/images/bg_medicine_black_market_storeroom.webp", words: ["лекар", "аптек", "вакцин", "фарм", "медикамент", "патент", "здравоохран", "грипп", "медицинский каннабис"] },
  { bg: "/images/bg_communal_heating_basement.webp", words: ["жкх", "коммунал", "квартплат", "тариф", "газопровод", "цена на газ", "отоплен", "котельн", "прорвало труб", "авари"] },
  { bg: "/images/bg_flooded_regional_office.webp", words: ["дамб", "затоп", "наводнен", "землетряс", "гуманитар", "катастроф", "природн бедств", "регион затоп"] },
  { bg: "/images/bg_blackout_courtyard_generator.webp", words: ["блэкаут", "отключ", "электр", "свет", "генератор", "энергосуверен", "энергетическ", "аэс"] },
  { bg: "/images/bg_sanctioned_cargo_port.webp", words: ["морские порт", "порт варонии", "груз", "контейнер", "логистик", "поставка", "караван", "контрабанд", "верф"] },
  { bg: "/images/bg_sanctions_customs_warehouse.webp", words: ["санкц", "тамож", "импорт", "параллельн", "перпендикулярн", "реимпорт", "серый западный", "ввоз", "иностранных товаров"] },
  { bg: "/images/bg_central_bank_empty_vault.webp", words: ["центробанк", "золотовалют", "резерв", "ключев", "ставк", "инфляц", "валютн", "дефолт", "fitch", "мвф", "печатный станок", "фонд национального"] },
  { bg: "/images/bg_provincial_pothole_night.webp", words: ["трасс", "дорог", "мост", "инфраструктур", "бордюр", "яма", "губернатор", "региональн"] },
  { bg: "/images/bg_grain_elevator_quota.webp", words: ["урожай", "фермер", "зерн", "хлеб", "молок", "голод", "субсидии на хлеб", "сельхоз"] },
  { bg: "/images/bg_state_awards_storage.webp", words: ["орден", "медал", "наград", "зван", "титул", "грамот"] },
  { bg: "/images/bg_loyalty_oath_hall.webp", words: ["присяг", "клятв", "верност", "лояльн", "гимн", "патриотическ", "церемони"] },
  { bg: "/images/bg_decree_printing_room.webp", words: ["указ", "поправк", "постановлен", "резолюц", "парламент", "госдума", "принять закон", "ввести закон"] },
  { bg: "/images/bg_ministry_waiting_room.webp", words: ["министерств", "министр", "ведомств", "чиновник", "бюрократ", "кабмин", "аппарат", "департамент", "согласован", "регламент", "заявлен", "справк", "мфц"] },

  { bg: "/images/bg_pensioner_kitchen_receipts.webp", words: ["пенсион", "старик", "старух", "старост", "пенси", "пособ", "соцвыплат", "соцподдерж", "льготник"] },
  { bg: "/images/bg_discount_grocery_evening.webp", words: ["масло", "яиц", "яйц", "продукт", "еда", "супермаркет", "магазин", "полк", "цен", "дефицит", "спред", "пальм"] },
  { bg: "/images/bg_event_bus_stop_vert.webp", words: ["мрот", "зарплат", "вахт", "смен", "маршрутк", "автобус", "проезд", "транспорт", "коммьют", "работающ"] },
  { bg: "/images/bg_call_center_burnout.webp", words: ["выгоран", "депресс", "психолог", "стресс", "колл", "оператор", "офис", "переработ", "удаленк", "выходн"] },
  { bg: "/images/bg_child_room_absent_parent.webp", words: ["демограф", "рождаем", "деторожд", "чайлдфри", "ребен", "детск", "родител", "семь", "материнск"] },
  { bg: "/images/bg_apartment_elevator_mirror.webp", words: ["домофон", "подъезд", "лифт", "квартир", "жиль", "ипотек", "новострой", "управляющ"] },
  { bg: "/images/bg_microdistrict_winter_windows.webp", words: ["бедност", "нищ", "провинц", "окраин", "спальн", "район", "народ бедне", "уровень жизни"] },
  { bg: "/images/bg_monotown_bus_stop.webp", words: ["моногород", "завод закр", "безработ", "сокращен", "градообраз", "увольнен"] },
  { bg: "/images/bg_social_worker_desk.webp", words: ["соцслуж", "малоимущ", "выплат", "очередь на жиль"] },
  { bg: "/images/bg_event_factory_locker_vert.webp", words: ["завод", "рабоч", "профсоюз", "смена", "переработк", "трудов", "станок", "цех"] },
  { bg: "/images/bg_event_hospital_corridor_vert.webp", words: ["медицин", "больниц", "здрав", "койк", "ивл", "врач", "медсестр", "поликлиник"] },
  { bg: "/images/bg_payday_loan_window.webp", words: ["микрозайм", "микрокредит", "коллектор", "закредит", "заем", "займ", "быстрые деньги"] },

  { bg: "/images/bg_polling_station_server.webp", words: ["выбор", "цик", "избират", "голосован", "урн", "бюллетен", "кампан"] },
  { bg: "/images/bg_cctv_courtyard.webp", words: ["слеж", "прослуш", "наблюден", "личн"] },
  { bg: "/images/bg_event_bunker_corridor_vert.webp", words: ["фсб", "совбез", "агент", "шпион", "донос", "кибератак", "хакер", "экстрем"] },
  { bg: "/images/bg_gosuslugi_datacenter.webp", words: ["госуслуг", "паспортн", "данн", "реестр"] },
  { bg: "/images/bg_rooftop_antenna_farm.webp", words: ["сорм", "трафик", "провайдер", "шифр", "перехват", "связь", "антенн", "частот"] },
  { bg: "/images/bg_chebunet_control.webp", words: ["чебунет", "vpn", "youtube", "telegram", "интернет", "блокиров", "тспу", "wikipedia", "варонпед", "meta", "instagram", "facebook"] },
  { bg: "/images/bg_event_vip_airport_vert.webp", words: ["эмиграц", "уехал", "уехали", "айтиш", "утечк", "мозг", "внуково", "джет", "дубай", "монако"] },
  { bg: "/images/bg_prison_colony.webp", words: ["колони", "тюрьм", "заключ", "зэк", "сизо", "посад", "срок"] },
  { bg: "/images/bg_court_corridor_phones.webp", words: ["суд", "гааг", "арест", "верховн", "дело"] },
  { bg: "/images/bg_mining_strike.webp", words: ["уголь", "шахт", "шахтер", "забастов"] },
  { bg: "/images/bg_oil_gas_field.webp", words: ["нефт", "газ", "алюмини", "труб", "байкал", "энерг"] },
  { bg: "/images/bg_luxury_clinic_vip.webp", words: ["частн", "клиник", "vip", "вип", "элитн", "санатор", "лечение чинов"] },
  { bg: "/images/bg_event_tv_studio_vert.webp", words: ["пресс", "тв", "трансляц", "журналист", "власова"] },
  { bg: "/images/bg_influencer_apology_set.webp", words: ["блогер", "рэпер", "артист", "концерт", "извинен", "покаян", "отмен", "ник"] },
  { bg: "/images/bg_drone_factory.webp", words: ["дрон", "беспилот", "пво", "ракет", "снаряд", "оруж", "оборон"] },
  { bg: "/images/bg_military_parade.webp", words: ["парад", "танк", "воен", "армия", "нато", "громов"] },
  { bg: "/images/bg_monument_square.webp", words: ["монумент", "памятник", "памят", "советск"] },
  { bg: "/images/bg_z_letter_garage.webp", words: ["гараж", "внедорож", "кортеж", "силов", "спецслужб", "облав", "рейд"] },
  { bg: "/images/bg_suburban_detention_van.webp", words: ["задержан", "маски-шоу", "маски шоу", "автозак", "омон", "ночью пришли"] },
  { bg: "/images/bg_palace_corruption.webp", words: ["дворц", "кремл", "резиденц", "коррупц", "золот", "президент", "цитадел"] },
  { bg: "/images/bg_dacha_cooperative.webp", words: ["кооператив", "дач", "озеро"] },
  { bg: "/images/bg_oligarch_private_terminal.webp", words: ["яхт", "роскош", "forbes", "льгот", "суперъяхт"] },
  { bg: "/images/bg_moscow_city_backroom.webp", words: ["усманов", "олигарх", "бизнес", "инвест", "акционер", "совет директор"] },
  { bg: "/images/bg_import_substitution_lab.webp", words: ["импортозамещ", "сертифик", "качество", "сыр", "самолет"] },
  { bg: "/images/bg_event_bank_hall_vert.webp", words: ["рубл", "банк", "бюджет", "налог", "платеж", "зубов"] },
  { bg: "/images/bg_crypto_basement_exchange.webp", words: ["крипт", "биткоин", "кошелек", "майнинг", "обнал"] },
  { bg: "/images/bg_food_delivery_court.webp", words: ["доставк", "курьер", "самозанят", "общепит", "кафе", "торгов", "трц"] },
];

const normalizeSearchText = (value) => String(value || "").toLowerCase().replaceAll("ё", "е");

const THEME_MATCHERS = THEME_BACKGROUNDS.map(({ bg, words }) => ({
  bg,
  words: words.map(normalizeSearchText),
}));

const collectCardText = (card) => [
  card?.text,
  card?.t,
  card?.left?.label,
  card?.left?.text,
  card?.right?.label,
  card?.right?.text,
  card?.lL,
  card?.lT,
  card?.rL,
  card?.rT,
].filter(Boolean).join(" ");

export const ALL_CARD_BACKGROUND_IMAGES = [
  ...new Set([
    ...Object.values(ADVISOR_BACKGROUNDS),
    ...THEME_BACKGROUNDS.map(({ bg }) => bg),
    "/images/bg_oligarch_yacht.webp",
  ]),
];

export const getCardBackground = (card) => {
  if (card?.bgImage) return card.bgImage;

  const haystack = normalizeSearchText(collectCardText(card));
  const theme = THEME_MATCHERS.find(({ words }) => words.some(word => haystack.includes(word)));
  return theme?.bg || ADVISOR_BACKGROUNDS[card?.advisor];
};
