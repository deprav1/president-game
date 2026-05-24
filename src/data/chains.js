/**
 * Сюжетные цепочки — отложенные последствия решений игрока.
 *
 * Каждая запись содержит:
 *   id      — уникальный ключ, используется для сопоставления с триггерами
 *   delay   — через сколько месяцев наступает событие
 *   card    — карта-последствие
 *
 * Триггеры объявлены отдельно в CHAIN_TRIGGERS. Мы адаптировали их под российские реалии.
 */

export const CHAINS = {
  close_tv: {
    id: "close_tv",
    delay: 4,
    card: {
      advisor: 3, // Патрушев
      text: "Журналисты закрытого телеканала «Дождь» создали подпольное издание в Telegram. Их читали 5 миллионов граждан, и теперь Патрушев бьет тревогу.",
      left:  { label: "Заблокировать Telegram-канал", text: "Найдем авторов и посадим за дискредитацию", fx: { oligarchs: 5,  army: 5,  people: -12, west: -15 } },
      right: { label: "Игнорировать Telegram",      text: "Запретный плод сладок, пусть пишут",     fx: { oligarchs: 0,  army: 0,  people: 5,   west: 8   } },
    },
  },

  accept_refugees: {
    id: "accept_refugees",
    delay: 5,
    card: {
      advisor: 6, // Юлия Стрельцова
      text: "Стрельцова докладывает: из-за наплыва беженцев из соседней республики резко активизировались Z-патриоты. Они требуют закрыть границы.",
      left:  { label: "Диалог с патриотами",  text: "Выслушаем требования военкоров", fx: { oligarchs: 0, army: 5,  people: -5,  west: -10 } },
      right: { label: "Жесткий разгон митингов", text: "ОМОН быстро наведет порядок",     fx: { oligarchs: 0, army: 8,  people: -10, west: 5   } },
    },
  },

  gave_khan_tax: {
    id: "gave_khan_tax",
    delay: 3,
    card: {
      advisor: 7, // Усманов
      text: "Другие крупные олигархи узнали о льготах Бориса Усманова и требуют того же для своих яхт и заводов. «Нельзя же помогать только одному Борису!»",
      left:  { label: "Отказать всем олигархам", text: "Льготы Усманову были ошибкой",  fx: { oligarchs: -15, army: 0, people: 8,  west: 5  } },
      right: { label: "Дать льготы всем сорока",  text: "Поддержим весь элитный бизнес", fx: { oligarchs: 15,  army: 0, people: -8, west: -5 } },
    },
  },

  dispersed_protest: {
    id: "dispersed_protest",
    delay: 4,
    card: {
      advisor: 4, // Линн Трейси
      text: "Посол Линн Трейси вручает ноту протеста: жестокий разгон забастовки дубинками ОМОНа попал во все мировые СМИ. Сенат США готовит жесткие санкции.",
      left:  { label: "Принести извинения публично", text: "Ошибки признаны, виновных накажем",  fx: { oligarchs: 0, army: -8, people: 8, west: 15  } },
      right: { label: "Отвергнуть ноту протеста",    text: "Это суверенное внутреннее дело Варонии",     fx: { oligarchs: 5, army: 5,  people: 5, west: -20 } },
    },
  },

  surveillance: {
    id: "surveillance",
    delay: 6,
    card: {
      advisor: 2, // Песков
      text: "Хакеры взломали госуслуги и слили базу данных тотальной слежки. Власов и Песков не знают, как оправдываться перед прессой.",
      left:  { label: "Признать утечку честно",    text: "Честность перед народом спасет рейтинг", fx: { oligarchs: 0, army: 0, people: -8,  west: 5  } },
      right: { label: "Объявить фейком и скрыть",   text: "Паника в Чебунете хуже любой утечки",         fx: { oligarchs: 0, army: 0, people: -15, west: -8 } },
    },
  },

  army_neglect: {
    id: "army_neglect",
    delay: 3,
    card: {
      advisor: 1, // Громов
      text: "Громов докладывает: участились случаи дезертирства контрактников. Офицеры жалуются на задержку выплат в 2 миллиона рублей подъемных.",
      left:  { label: "Выделить экстренно рубли", text: "Военные должны быть довольны", fx: { oligarchs: -5, army: 15,  people: 0, west: 0 } },
      right: { label: "Жестко судить дезертиров", text: "Предатели родины получат 10 лет", fx: { oligarchs: 0,  army: -10, people: 0, west: 0 } },
    },
  },

  climate_deal: {
    id: "climate_deal",
    delay: 5,
    card: {
      advisor: 6, // Юлия Стрельцова
      text: "50 000 шахтеров Урала вышли на забастовку после вашего указа закрыть угольные заводы ради климатического соглашения с Западом.",
      left:  { label: "Выплатить компенсации",   text: "Поможем рабочим переобучиться", fx: { oligarchs: -8, army: 0, people: 5,  west: 8   } },
      right: { label: "Отложить закрытие шахт",  text: "Отечественный уголь важнее климата",       fx: { oligarchs: 5,  army: 0, people: 10, west: -15 } },
    },
  },

  privatized_health: {
    id: "privatized_health",
    delay: 4,
    card: {
      advisor: 2, // Песков
      text: "После того, как вы приватизировали систему здравоохранения, цены на лекарства от гриппа выросли втрое. Пенсионеры бунтуют в аптеках.",
      left:  { label: "Заморозить цены жестко",   text: "Рыночные спекулянты зашли далеко",  fx: { oligarchs: -12, army: 0, people: 15,  west: 5 } },
      right: { label: "Рыночная саморегуляция",    text: "Госвмешательство создаст дефицит", fx: { oligarchs: 8,   army: 0, people: -18, west: 0 } },
    },
  },

  // ════════ АРК «ДЕЛО» ════════
  // 2а — жёсткая ветка (арестовали)
  delo_arc_hard: {
    id: "delo_arc_hard",
    delay: 3,
    card: {
      advisor: 1, // Громов
      text: "Судебный процесс за госизмену транслировался по всем каналам. Бывший замминистра во всем признался. Громов доволен — силовики ликуют.",
      left:  { label: "Помиловать через год",     text: "Урок усвоен, проявим гуманность",       fx: { oligarchs: -5, army: -5, people: 8,   west: 12  } },
      right: { label: "Максимальный срок в Сибири", text: "Государству нужен жесткий сигнал",  fx: { oligarchs: 5,  army: 12, people: 5,   west: -18 } },
    },
  },

  // 2б — мягкая ветка (проверили тихо)
  delo_arc_soft: {
    id: "delo_arc_soft",
    delay: 4,
    card: {
      advisor: 1, // Громов
      text: "Тайная проверка спецслужб завершена. Замминистра оказался чист, донос был сфабрикован конкурентами. Но Патрушев недоволен вашей мягкостью.",
      left:  { label: "Публично оправдать его",   text: "Честное имя важнее интриг",  fx: { oligarchs: 0,  army: -10, people: 12, west: 10  } },
      right: { label: "Замять расследование тихо", text: "Лишний шум спецслужбам ни к чему", fx: { oligarchs: 0,  army: 5,   people: -5, west: 0   } },
    },
  },

  // ════════ АРК «ПРЕЕМНИК» ════════
  // 2а — Волков приближён
  naslednik_arc_close: {
    id: "naslednik_arc_close",
    delay: 5,
    card: {
      advisor: 6, // Юлия Стрельцова
      text: "Стрельцова: Волков окреп. Молодежь видит в нем «новую надежду», а Усманов тайно обсуждает с ним транзит власти. Громов смотрит хмуро.",
      left:  { label: "Передать преемнику трон",  text: "Уйдем красиво на почетную пенсию", fx: { west: 15,  people: 12, army: -5,  oligarchs: -8 } },
      right: { label: "Дискредитировать Волкова", text: "У страны может быть только один вождь",                     fx: { west: -12, people: -10, army: 8,  oligarchs: 5  } },
    },
  },

  // 2б — Волков нейтрализован
  naslednik_arc_exile: {
    id: "naslednik_arc_exile",
    delay: 4,
    card: {
      advisor: 6, // Юлия Стрельцова
      text: "Стрельцова: сосланный вами Волков стал губернатором Дальнего Востока и набрал там бешеную популярность. Народ считает его мучеником.",
      left:  { label: "Вернуть в правительство",  text: "Держи конкурента поближе к себе", fx: { people: 10, west: 8,   army: -5,  oligarchs: -5 } },
      right: { label: "Продолжать давить его",    text: "Заведем уголовное дело о растрате",    fx: { people: -15, west: -12, army: 5,  oligarchs: 5  } },
    },
  },

  // ════════ АРК «ЦИФРОВОЙ СУВЕРЕНИТЕТ» ════════
  // Карта 2а — жёсткая ветка (блокировка Наружу)
  ds_arc_2_blockade: {
    id: "ds_arc_2_blockade",
    delay: 3,
    card: {
      advisor: 3, // Патрушев
      text: "Патрушев докладывает: блокировка Наружу провалена. Миллионы граждан перешли на новые VPN. Екатерина Пиздулина требует Чебунет.",
      left:  { label: "Полное отключение от WWW", text: "Цифровой занавес и суверенный интернет",         fx: { oligarchs: 5,  army: 10, people: -25, west: -25 } },
      right: { label: "Только мониторинг и штрафы", text: "Будем медленно душить трафик", fx: { oligarchs: 0,  army: 5,  people: -8,  west: -10 } },
      chain: { right: "ds_arc_4_hard_end" },
    },
  },

  // Карта 2б — мягкая ветка (игрок не вмешивался)
  ds_arc_2_open: {
    id: "ds_arc_2_open",
    delay: 3,
    card: {
      advisor: 4, // Линн Трейси
      text: "Трейси: свободный интернет в Варонии привлек западных инвесторов. Арсрамление Лебеда предлагает открыть IT-хаб.",
      left:  { label: "Открыть IT-хаб для Запада", text: "Цифровое окно в глобальный мир",       fx: { oligarchs: 8,  army: -8, people: 10,  west: 20 } },
      right: { label: "Ограничить западные фирмы",  text: "Цифровой суверенитет превыше всего",        fx: { oligarchs: -5, army: 5,  people: -5,  west: -8 } },
      chain: { left: "ds_arc_4_soft_end" },
    },
  },

  // Карта 4а — финал жёсткой ветки
  ds_arc_4_hard_end: {
    id: "ds_arc_4_hard_end",
    delay: 4,
    card: {
      advisor: 6, // Юлия Стрельцова
      text: "Стрельцова: из-за цифрового занавеса из страны сбежали 80 000 IT-специалистов. Но Патрушев счастлив — координация оппозиции сломлена.",
      left:  { label: "Программа возврата умов",   text: "Вернем IT-кадры льготной ипотекой под 1%",     fx: { oligarchs: -10, army: -5, people: 15,  west: 12 } },
      right: { label: "Продолжать жесткий курс",   text: "Госбезопасность дороже любых программ",     fx: { oligarchs: -5,  army: 10, people: -15, west: -18 } },
    },
  },

  // Карта 4б — финал мягкой ветки
  ds_arc_4_soft_end: {
    id: "ds_arc_4_soft_end",
    delay: 4,
    card: {
      advisor: 2, // Песков
      text: "Песков: Варония вошла в топ-20 стран по цифровой свободе. Молодёжь ликует. Но Патрушев недоволен — слишком много западного влияния.",
      left:  { label: "Поддержать открытость сети", text: "Свободная сеть — наше великое оружие", fx: { oligarchs: 5,   army: -8, people: 18,  west: 20 } },
      right: { label: "Частичные блокировки YouTube", text: "Соблюдем баланс контроля и свободы",            fx: { oligarchs: 0,   army: 5,  people: 5,   west: 5  } },
    },
  },
};

/**
 * Явные триггеры цепочек.
 *
 * Каждый триггер — функция (cardText, side) => chainId | null.
 * Адаптированы под новые сатирические тексты.
 */
export const CHAIN_TRIGGERS = [
  // Закрытие телеканала «Дождь» — только правый выбор (закрыть)
  (text, side) =>
    side === "right" && (text.includes("«Свободного канала»") || text.includes("«Дождь»"))
      ? "close_tv"
      : null,

  // Принятие беженцев — только левый выбор (принять)
  (text, side) =>
    side === "left" && text.includes("беженц")
      ? "accept_refugees"
      : null,

  // Льготы Усманову/Хану — только правый выбор (дать льготы)
  (text, side) =>
    side === "right" && text.includes("льготы") && (text.includes("Хан") || text.includes("Усманов"))
      ? "gave_khan_tax"
      : null,

  // Разгон забастовки — только правый выбор (Разогнать)
  (text, side) =>
    side === "right" && text.includes("забастовку") && (text.includes("Разогнать") || text.includes("ОМОНом"))
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
    side === "right" && (text.includes("приватизировать систему здравоохранения") || text.includes("приватизировать систему здравоохранения"))
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

  // Арк "Цифровой суверенитет": стартовая карта Наружу запускает цепочку
  (text, side) =>
    side === "left" && (text.includes("число скачиваний VPN-сервиса Наружу") || text.includes("число скачиваний VPN-сервиса Vepean"))
      ? "ds_arc_2_blockade"
      : null,

  // Арк: не вмешиваться — запускает мягкую ветку
  (text, side) =>
    side === "right" && (text.includes("число скачиваний VPN-сервиса Наружу") || text.includes("число скачиваний VPN-сервиса Vepean"))
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
 * Новые карты объявляют цепочки явно через `chain`, а текстовые триггеры
 * оставлены как совместимость со старыми сохранениями.
 */
export const getTriggeredChain = (cardOrText, side) => {
  const card = typeof cardOrText === "string" ? { text: cardOrText } : (cardOrText || {});
  if (card.chain?.[side]) return card.chain[side];

  const cardText = card.text || "";
  for (const trigger of CHAIN_TRIGGERS) {
    const id = trigger(cardText, side);
    if (id) return id;
  }
  return null;
};
