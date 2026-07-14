<?php
/**
 * Призовые уведомления топ-игрокам от бота @varonia_bot.
 *
 * POST c заголовком X-Admin-Token (= секрет дашборда, lb-data/analytics-token.php).
 * Тело (JSON):
 *   limit   — скольким верхним игрокам слать (default 3, max 25);
 *   text    — текст сообщения, плейсхолдеры {name} {score} {rank};
 *   button  — подпись кнопки, открывающей игру (опционально; пусто = без кнопки);
 *   dry_run — true: НИЧЕГО не шлём, возвращаем список будущих получателей.
 *
 * Ограничения Telegram: бот может писать только тем, кто его запускал (START) —
 * остальным sendMessage вернёт ошибку, она попадёт в ответ per-получатель.
 * tgId в записях появился после включения его сохранения: старые записи без tgId
 * пропускаются (получают его бэкфиллом при следующей игре игрока).
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

const GAME_URL = 'https://cb077728.tw1.ru/';
const MAX_RECIPIENTS = 25;

$root = isset($_SERVER['DOCUMENT_ROOT']) && $_SERVER['DOCUMENT_ROOT'] !== ''
    ? rtrim($_SERVER['DOCUMENT_ROOT'], '/') : dirname(__DIR__);
$dir = $root . '/lb-data';

function read_secret($path) {
    if (!is_file($path)) return '';
    $value = @include $path;
    return is_string($value) ? trim($value) : '';
}

function respond($code, $payload) {
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') respond(405, ['ok' => false, 'error' => 'Method not allowed']);

// ── Авторизация: тот же секрет, что у дашборда аналитики ───────────────────────
$adminToken = read_secret($dir . '/analytics-token.php');
$got = $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '';
if ($adminToken === '' || !hash_equals($adminToken, (string)$got)) {
    respond(403, ['ok' => false, 'error' => 'Forbidden']);
}

$botToken = read_secret($dir . '/bot-token.php');
if ($botToken === '') respond(500, ['ok' => false, 'error' => 'Bot token not configured']);

$body = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($body)) $body = [];
$limit  = max(1, min((int)($body['limit'] ?? 3), MAX_RECIPIENTS));
$text   = trim((string)($body['text'] ?? ''));
$button = trim((string)($body['button'] ?? ''));
$dryRun = !empty($body['dry_run']);
if ($text === '' && !$dryRun) respond(400, ['ok' => false, 'error' => 'text is required']);

// ── Топ доски (тот же файл и сортировка, что в leaderboard.php) ────────────────
$DIFF_RANK = ['easy' => 1, 'normal' => 2, 'hardcore' => 3];
$board = json_decode((string)@file_get_contents($dir . '/board-v2.json'), true);
if (!is_array($board)) $board = [];
usort($board, function ($a, $b) use ($DIFF_RANK) {
    $ds = (int)($b['score'] ?? 0) - (int)($a['score'] ?? 0);
    if ($ds !== 0) return $ds;
    $dd = ($DIFF_RANK[$b['difficulty'] ?? ''] ?? 0) - ($DIFF_RANK[$a['difficulty'] ?? ''] ?? 0);
    if ($dd !== 0) return $dd;
    return (strtotime($a['finishedAt'] ?? '') ?: 0) - (strtotime($b['finishedAt'] ?? '') ?: 0);
});

$top = array_slice($board, 0, $limit);
$recipients = [];
foreach ($top as $i => $e) {
    $recipients[] = [
        'rank'  => $i + 1,
        'name'  => (string)($e['name'] ?? ''),
        'score' => (int)($e['score'] ?? 0),
        'canMessage' => !empty($e['tgId']),
        'tgId' => !empty($e['tgId']) ? (int)$e['tgId'] : null,
    ];
}

if ($dryRun) {
    // tgId в dry-run не раскрываем — только факт достижимости.
    $out = array_map(function ($r) { unset($r['tgId']); return $r; }, $recipients);
    respond(200, ['ok' => true, 'dry_run' => true, 'recipients' => $out]);
}

function tg_send($botToken, $chatId, $text, $button) {
    $payload = ['chat_id' => $chatId, 'text' => $text];
    if ($button !== '') {
        $payload['reply_markup'] = ['inline_keyboard' => [[
            ['text' => $button, 'web_app' => ['url' => GAME_URL]],
        ]]];
    }
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE);
    $url = 'https://api.telegram.org/bot' . $botToken . '/sendMessage';
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $json,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
        ]);
        $res = curl_exec($ch);
        curl_close($ch);
    } else {
        $ctx = stream_context_create(['http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/json\r\n",
            'content' => $json,
            'timeout' => 10,
            'ignore_errors' => true,
        ]]);
        $res = @file_get_contents($url, false, $ctx);
    }
    $data = is_string($res) ? json_decode($res, true) : null;
    if (is_array($data) && !empty($data['ok'])) return ['ok' => true];
    $desc = is_array($data) ? (string)($data['description'] ?? 'unknown') : 'network error';
    return ['ok' => false, 'error' => $desc];
}

$results = [];
foreach ($recipients as $r) {
    if (!$r['canMessage']) {
        $results[] = ['rank' => $r['rank'], 'name' => $r['name'], 'sent' => false, 'error' => 'no tgId stored'];
        continue;
    }
    $msg = strtr($text, [
        '{name}'  => $r['name'],
        '{score}' => (string)$r['score'],
        '{rank}'  => (string)$r['rank'],
    ]);
    $res = tg_send($botToken, $r['tgId'], $msg, $button);
    $results[] = [
        'rank' => $r['rank'], 'name' => $r['name'],
        'sent' => $res['ok'], 'error' => $res['ok'] ? null : $res['error'],
    ];
    usleep(150000); // бережём лимиты Bot API (~30 msg/сек, нам хватит с запасом)
}

respond(200, ['ok' => true, 'dry_run' => false, 'results' => $results]);
