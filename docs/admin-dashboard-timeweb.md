# Админка карточек на Timeweb

Текущий прод-деплой игры — статический Vite-сайт через FTP в `public_html`. Статический хостинг не умеет принимать POST-события и сохранять правки, поэтому админку нужно держать отдельным Node.js-приложением: Timeweb Cloud/VDS, Node.js-хостинг Timeweb или любой сервер с Node 20+.

## Что уже умеет

- Показывает все игровые карты, советников, колоды, id и хэши `card_id`.
- Принимает события игры через `POST /api/collect` и агрегирует просмотры, лайки, дизлайки, решения.
- Позволяет сохранять текстовые правки карточек как server-side overrides в `admin-server/data/card-overrides.json`.
- Делает общую сводку по Yandex Metrica через Reports API, если передан OAuth-токен.

Правки в админке пока не меняют исходники игры автоматически. Это осознанно: карточки лежат в JS-модулях, и безопаснее сначала копить правки как review-слой, затем отдельным шагом применять их в `src/data/*` и деплоить.

## Локальный запуск

```bash
npm run admin:start
```

Открой:

```text
http://127.0.0.1:3100
```

## Переменные окружения сервера

```env
ADMIN_PORT=3100
ADMIN_USER=admin
ADMIN_PASSWORD=strong-password-here

YANDEX_COUNTER_ID=109695119
YANDEX_METRICA_TOKEN=
ANALYTICS_ALLOWED_ORIGIN=https://your-game-domain.example
```

`ADMIN_PASSWORD` обязателен на проде. Без него админка работает без авторизации только для локальной разработки.

## Подключение игры к collector

В сборку игры нужно передать:

```env
VITE_ANALYTICS_ENDPOINT=https://admin.your-domain.example/api/collect
```

Для текущего GitHub Actions деплоя это можно добавить в `.github/workflows/deploy-timeweb.yml` после того, как будет известен URL админки:

```yaml
env:
  VITE_YM_ID: "109695119"
  VITE_ANALYTICS_ENDPOINT: "https://admin.your-domain.example/api/collect"
```

После этого события `card_view`, `card_rate`, `decision` и остальные будут уходить одновременно в Yandex Metrica и в серверную админку.

## Timeweb/VDS схема

1. Залить репозиторий на сервер.
2. Установить зависимости: `npm ci --omit=dev` не подойдет, потому что Vite нужен только для фронта, а сервер работает без сторонних зависимостей. Достаточно Node 20+ и файлов репозитория.
3. Запустить `npm run admin:start` под process manager: `pm2`, `systemd` или панель Timeweb.
4. Повесить домен/поддомен на порт `ADMIN_PORT` через nginx/reverse proxy.
5. Прописать `VITE_ANALYTICS_ENDPOINT` в сборку игры и передеплоить статику.

## Yandex Metrica

Для чтения данных API нужен OAuth-токен с доступом `metrika:read`. Сервер использует официальный Reports API endpoint:

```text
https://api-metrika.yandex.net/stat/v1/data
```

Сейчас админка забирает общую сводку за 30 дней. Карточная детализация надежнее собирается через собственный `/api/collect`, потому что `card_id` и `rating` уже приходят структурированными событиями из игры.
