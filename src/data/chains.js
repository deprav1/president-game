/**
 * Сюжетные цепочки — отложенные последствия решений игрока.
 *
 * Каждая запись содержит:
 *   id      — уникальный ключ, используется для сопоставления с триггерами
 *   delay   — через сколько месяцев наступает событие
 *   card    — карта-последствие
 *
 * Триггеры объявлены отдельно в CHAIN_TRIGGERS — это исправляет баг оригинала,
 * где || и && смешивались в String.includes-цепочках без явных скобок.
 */

export const CHAINS = {
  close_tv: {
    id: "close_tv",
    delay: 4,
    card: {
      advisor: 3,
      text: "Журналисты закрытого «Свободного канала» создали подпольное издание в Telegram. Аудитория растёт быстрее чем раньше.",
      left:  { label: "Заблокировать", text: "Найдём и закроем",      fx: { oligarchs: 5,  army: 5,  people: -12, west: -15 } },
      right: { label: "Игнорировать",  text: "Запретный плод сладок", fx: { oligarchs: 0,  army: 0,  people: 5,   west: 8   } },
    },
  },

  accept_refugees: {
    id: "accept_refugees",
    delay: 5,
    card: {
      advisor: 6,
      text: "Стрельцова докладывает: националистические группировки резко усилились на фоне притока беженцев. Митинги каждые выходные.",
      left:  { label: "Диалог с националистами", text: "Выслушать их требования", fx: { oligarchs: 0, army: 5,  people: -5,  west: -10 } },
      right: { label: "Жёсткий ответ",           text: "Закон один для всех",     fx: { oligarchs: 0, army: 8,  people: -10, west: 5   } },
    },
  },

  gave_khan_tax: {
    id: "gave_khan_tax",
    delay: 3,
    card: {
      advisor: 7,
      text: "Другие крупные бизнесмены узнали о льготах Хана и требуют того же. «Нельзя же делать исключения только для одних».",
      left:  { label: "Отказать всем", text: "Льготы были ошибкой",  fx: { oligarchs: -15, army: 0, people: 8,  west: 5  } },
      right: { label: "Дать всем",     text: "Бизнес-климат важен", fx: { oligarchs: 15,  army: 0, people: -8, west: -5 } },
    },
  },

  dispersed_protest: {
    id: "dispersed_protest",
    delay: 4,
    card: {
      advisor: 4,
      text: "Хартли вручает ноту протеста: разгон демонстрации попал в мировые СМИ. Западные парламенты требуют санкций.",
      left:  { label: "Принести извинения",  text: "Ошибка признана",            fx: { oligarchs: 0, army: -8, people: 8, west: 15  } },
      right: { label: "Отвергнуть обвинения", text: "Внутреннее дело страны",     fx: { oligarchs: 5, army: 5,  people: 5, west: -20 } },
    },
  },

  surveillance: {
    id: "surveillance",
    delay: 6,
    card: {
      advisor: 2,
      text: "Хакеры взломали систему слежки и слили личные данные двух миллионов граждан. Власова не знает что говорить прессе.",
      left:  { label: "Признать публично",    text: "Честность — лучшая политика", fx: { oligarchs: 0, army: 0, people: -8,  west: 5  } },
      right: { label: "Скрыть и расследовать", text: "Паника хуже утечки",         fx: { oligarchs: 0, army: 0, people: -15, west: -8 } },
    },
  },

  army_neglect: {
    id: "army_neglect",
    delay: 3,
    card: {
      advisor: 1,
      text: "Громов докладывает: участились случаи дезертирства. Офицеры жалуются на задержку жалования и устаревшую технику.",
      left:  { label: "Экстренное финансирование", text: "Армия должна быть довольна", fx: { oligarchs: -5, army: 15,  people: 0, west: 0 } },
      right: { label: "Расследование дезертиров",  text: "Предатели должны ответить", fx: { oligarchs: 0,  army: -10, people: 0, west: 0 } },
    },
  },

  climate_deal: {
    id: "climate_deal",
    delay: 5,
    card: {
      advisor: 6,
      text: "50 000 шахтёров вышли на забастовку после объявления о закрытии угольных шахт во исполнение климатического соглашения.",
      left:  { label: "Компенсации и переобучение", text: "Поможем людям адаптироваться", fx: { oligarchs: -8, army: 0, people: 5,  west: 8   } },
      right: { label: "Отложить закрытие",          text: "Люди важнее соглашений",       fx: { oligarchs: 5,  army: 0, people: 10, west: -15 } },
    },
  },

  privatized_health: {
    id: "privatized_health",
    delay: 4,
    card: {
      advisor: 2,
      text: "После приватизации цены на базовые лекарства выросли в три раза. Пенсионеры не могут позволить себе лечение. Скандал в прессе.",
      left:  { label: "Заморозить цены",          text: "Рынок зашёл слишком далеко",  fx: { oligarchs: -12, army: 0, people: 15,  west: 5 } },
      right: { label: "Рынок сам отрегулирует",   text: "Вмешательство создаст дефицит", fx: { oligarchs: 8,   army: 0, people: -18, west: 0 } },
    },
  },

  // ════════ АРК «ДЕЛО» ════════
  // 2а — жёсткая ветка (арестовали)
  delo_arc_hard: {
    id: "delo_arc_hard",
    delay: 3,
    card: {
      advisor: 1,
      text: "Процесс транслировался на всю страну. Советник «признал вину». Громов доволен — остальные притихли. Хартли назвал это советским театром. Коллеги советника стали избегать вас.",
      left:  { label: "Помиловать через год", text: "Хватит, урок усвоен",       fx: { oligarchs: -5, army: -5, people: 8,   west: 12  } },
      right: { label: "Максимальный срок",    text: "Государству нужен сигнал",  fx: { oligarchs: 5,  army: 12, people: 5,   west: -18 } },
    },
  },

  // 2б — мягкая ветка (проверили тихо)
  delo_arc_soft: {
    id: "delo_arc_soft",
    delay: 4,
    card: {
      advisor: 1,
      text: "Тайная проверка завершена. Советник чист — информация оказалась провокацией конкурентов. Зубов смущён. Среди силовиков ходят слухи о вашей «слабости».",
      left:  { label: "Публично реабилитировать", text: "Справедливость дороже",  fx: { oligarchs: 0,  army: -10, people: 12, west: 10  } },
      right: { label: "Замять тихо",               text: "Лишний шум ни к чему", fx: { oligarchs: 0,  army: 5,   people: -5, west: 0   } },
    },
  },

  // ════════ АРК «ПРЕЕМНИК» ════════
  // 2а — Волков приближён
  naslednik_arc_close: {
    id: "naslednik_arc_close",
    delay: 5,
    card: {
      advisor: 6,
      text: "Стрельцова: Волков вырос. Народ называет его «новой надеждой». Олигархи уже встречаются с ним без вашего ведома. Громов смотрит задумчиво. Вы создали конкурента.",
      left:  { label: "Публично передать",    text: "Пусть берёт — на ваших условиях", fx: { west: 15,  people: 12, army: -5,  oligarchs: -8 } },
      right: { label: "Дискредитировать",     text: "Один хозяин",                     fx: { west: -12, people: -10, army: 8,  oligarchs: 5  } },
    },
  },

  // 2б — Волков нейтрализован
  naslednik_arc_exile: {
    id: "naslednik_arc_exile",
    delay: 4,
    card: {
      advisor: 6,
      text: "Стрельцова докладывает: Волков «переведён» в регион. Там быстро стал популярен — митинги, медиа, ореол мученика. Вы создали символ.",
      left:  { label: "Вернуть и интегрировать", text: "Лучше внутри палатки", fx: { people: 10, west: 8,   army: -5,  oligarchs: -5 } },
      right: { label: "Продолжать давить",        text: "Символы исчезают",    fx: { people: -15, west: -12, army: 5,  oligarchs: 5  } },
    },
  },

  // ════════ АРК «ЦИФРОВОЙ СУВЕРЕНИТЕТ» ════════
  // Карта 2а — жёсткая ветка (игрок заблокировал Vepean)
  ds_arc_2_blockade: {
    id: "ds_arc_2_blockade",
    delay: 3,
    card: {
      advisor: 3,
      text: "DS_ARC_3_HARD Сенин докладывает: блокировка Vepean обошлась — граждане перешли на десятки других VPN. Трафик через запрещённые каналы вырос вдвое. Армия требует полного отключения зарубежного интернета.",
      left:  { label: "Полное отключение", text: "Цифровой занавес",         fx: { oligarchs: 5,  army: 10, people: -25, west: -25 } },
      right: { label: "Только мониторинг", text: "Контролировать, не рубить", fx: { oligarchs: 0,  army: 5,  people: -8,  west: -10 } },
    },
  },

  // Карта 2б — мягкая ветка (игрок не вмешивался)
  ds_arc_2_open: {
    id: "ds_arc_2_open",
    delay: 3,
    card: {
      advisor: 4,
      text: "DS_ARC_3_SOFT Хартли: свободный доступ к интернету укрепил образ Варонии. Западные IT-компании просят разрешения открыть офисы. Сенин предупреждает о рисках.",
      left:  { label: "Открыть для IT",    text: "Цифровое окно в мир",       fx: { oligarchs: 8,  army: -8, people: 10,  west: 20 } },
      right: { label: "Ограничить офисы",  text: "Суверенитет важнее",        fx: { oligarchs: -5, army: 5,  people: -5,  west: -8 } },
    },
  },

  // Карта 4а — финал жёсткой ветки
  ds_arc_4_hard_end: {
    id: "ds_arc_4_hard_end",
    delay: 4,
    card: {
      advisor: 6,
      text: "Стрельцова: цифровой занавес привёл к бегству 80 000 IT-специалистов. Экономика теряет $2 млрд в год. Но Сенин доволен — оппозиция не координируется. Граждане всё равно используют Vepean через спутник.",
      left:  { label: "Программа возврата",   text: "Вернём специалистов",     fx: { oligarchs: -10, army: -5, people: 15,  west: 12 } },
      right: { label: "Продолжать курс",      text: "Безопасность дороже",     fx: { oligarchs: -5,  army: 10, people: -15, west: -18 } },
    },
  },

  // Карта 4б — финал мягкой ветки
  ds_arc_4_soft_end: {
    id: "ds_arc_4_soft_end",
    delay: 4,
    card: {
      advisor: 2,
      text: "Власова: Варония вошла в топ-20 стран по цифровой свободе. Молодёжь называет страну «оазисом». Vepean открыл здесь штаб-квартиру и платит налоги. Сенин недоволен — «слишком много иностранного влияния».",
      left:  { label: "Поддержать открытость", text: "Цифровая свобода — сила", fx: { oligarchs: 5,   army: -8, people: 18,  west: 20 } },
      right: { label: "Частичные ограничения", text: "Баланс важен",            fx: { oligarchs: 0,   army: 5,  people: 5,   west: 5  } },
    },
  },
};

/**
 * Явные триггеры цепочек.
 *
 * Каждый триггер — функция (cardText, side) => chainId | null.
 * Использование явных строковых проверок вместо смешанных || && устраняет
 * баг оригинала: без скобок `a||b&&c` вычислялось как `a||(b&&c)`.
 */
export const CHAIN_TRIGGERS = [
  // Закрытие телеканала — только правый выбор (закрыть)
  (text, side) =>
    side === "right" && text.includes("«Свободного канала»")
      ? "close_tv"
      : null,

  // Принятие беженцев — только левый выбор (принять)
  (text, side) =>
    side === "left" && text.includes("беженц")
      ? "accept_refugees"
      : null,

  // Льготы Хану — только правый выбор (дать льготы)
  (text, side) =>
    side === "right" && text.includes("льготы") && text.includes("Хан")
      ? "gave_khan_tax"
      : null,

  // Разгон забастовки — только правый выбор (Разогнать)
  (text, side) =>
    side === "right" && text.includes("забастовку") && text.includes("Разогнать")
      ? "dispersed_protest"
      : null,

  // Одобрение слежки (тотальной или распознавания лиц) — только правый выбор
  (text, side) =>
    side === "right" &&
    (text.includes("тотальной слежки") || text.includes("распознавания лиц"))
      ? "surveillance"
      : null,

  // Подписание климатического соглашения — только правый выбор
  (text, side) =>
    side === "right" && text.includes("климатическое соглашение")
      ? "climate_deal"
      : null,

  // Приватизация здравоохранения — только правый выбор
  (text, side) =>
    side === "right" && text.includes("приватизировать систему здравоохранения")
      ? "privatized_health"
      : null,

  // Арк «Дело»: арестовать советника
  (text, side) =>
    side === "left" && text.includes("государственная измена")
      ? "delo_arc_hard"
      : null,

  // Арк «Дело»: проверить тихо
  (text, side) =>
    side === "right" && text.includes("государственная измена")
      ? "delo_arc_soft"
      : null,

  // Арк «Преемник»: приблизить Волкова
  (text, side) =>
    side === "left" && text.includes("технократ Волков")
      ? "naslednik_arc_close"
      : null,

  // Арк «Преемник»: нейтрализовать Волкова
  (text, side) =>
    side === "right" && text.includes("технократ Волков")
      ? "naslednik_arc_exile"
      : null,

  // Арк "Цифровой суверенитет": блокировка Vepean запускает цепочку
  (text, side) =>
    side === "left" && text.includes("число установок иностранного VPN-сервиса Vepean")
      ? "ds_arc_2_blockade"
      : null,

  // Арк: не вмешиваться — запускает мягкую ветку
  (text, side) =>
    side === "right" && text.includes("число установок иностранного VPN-сервиса Vepean")
      ? "ds_arc_2_open"
      : null,

  // Арк ч.3: финал жёсткой ветки
  (text, side) =>
    text.includes("DS_ARC_3_HARD") && side === "right"
      ? "ds_arc_4_hard_end"
      : null,

  // Арк ч.3: финал мягкой ветки
  (text, side) =>
    text.includes("DS_ARC_3_SOFT") && side === "left"
      ? "ds_arc_4_soft_end"
      : null,
];

/**
 * Возвращает идентификатор цепочки, которую нужно запустить, или null.
 */
export function getTriggeredChain(cardText, side) {
  for (const trigger of CHAIN_TRIGGERS) {
    const id = trigger(cardText, side);
    if (id) return id;
  }
  return null;
}
