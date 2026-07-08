<?php
/**
 * Вебхук Telegram-бота @varonia_bot — same-origin PHP на том же хостинге.
 *
 * На команду /start отвечает сообщением с inline-кнопкой «🎮 Играть» (web_app),
 * которая открывает мини-апп. Ответ отдаём МЕТОДОМ в теле ответа на апдейт
 * (Telegram сам исполнит sendMessage) — исходящий curl не нужен.
 *
 * Защита: setWebhook регистрируется с secret_token = первые 32 hex sha256(токена
 * бота); Telegram шлёт его в заголовке X-Telegram-Bot-Api-Secret-Token — сверяем.
 * Токен бота лежит в lb-data/bot-token.php (вне репозитория, PHP-return secret).
 * Регистрацию вебхука делает CI на деплое (см. deploy-timeweb.yml).
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

const GAME_URL = 'https://cb077728.tw1.ru/';

function read_secret($path) {
    if (!is_file($path)) return '';
    $value = @include $path;
    return is_string($value) ? trim($value) : '';
}

$root = isset($_SERVER['DOCUMENT_ROOT']) && $_SERVER['DOCUMENT_ROOT'] !== ''
    ? rtrim($_SERVER['DOCUMENT_ROOT'], '/') : dirname(__DIR__);
$botToken = read_secret($root . '/lb-data/bot-token.php');

// Бот не настроен — тихо выходим (вебхук всё равно не зарегистрирован без токена).
if ($botToken === '') { http_response_code(200); echo 'ok'; exit; }

// Проверка секрета вебхука — отсекаем поддельные апдейты.
$expected = substr(hash('sha256', $botToken), 0, 32);
$got = $_SERVER['HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN'] ?? '';
if (!hash_equals($expected, (string)$got)) { http_response_code(403); echo 'forbidden'; exit; }

$update = json_decode(file_get_contents('php://input'), true);
$msg = is_array($update) ? ($update['message'] ?? null) : null;
$text = is_array($msg) ? (string)($msg['text'] ?? '') : '';
$chatId = is_array($msg) ? ($msg['chat']['id'] ?? null) : null;

// Отвечаем только на /start (в т.ч. «/start <param>» и «/start@bot»).
if ($chatId !== null && preg_match('~^/start(@\w+)?(\s|$)~', $text)) {
    echo json_encode([
        'method' => 'sendMessage',
        'chat_id' => $chatId,
        'text' => "🏛 Варония ждёт нового президента.\n\nУдержите власть, балансируя между армией, олигархами, народом и Западом — или падите красиво. Нажмите «Играть».",
        'reply_markup' => [
            'inline_keyboard' => [[
                ['text' => '🎮 Играть', 'web_app' => ['url' => GAME_URL]],
            ]],
        ],
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Прочие апдейты игнорируем.
http_response_code(200);
echo 'ok';
