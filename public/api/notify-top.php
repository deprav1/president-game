<?php
/**
 * Призовые уведомления топ-игрокам от бота @varonia_bot.
 *
 * POST c заголовком X-Admin-Token (= секрет дашборда, lb-data/analytics-token.php).
 * Тело (JSON):
 *   limit   — скольким верхним игрокам слать (default 3, max 25);
 *   text    — текст сообщения, плейсхолдеры {name} {score} {rank};
 *   button  — подпись кнопки, открывающей игру (опционально; пусто = без кнопки);
 *   dry_run — true: НИЧЕГО не шлём, возвращаем список будущих получателей;
 *   mode    — "send" (default): отправить сейчас тем, у кого есть tgId;
 *             "queue": поставить топ-N в призовую очередь — каждый получит
 *               сообщение при следующем ВХОДЕ в игру (см. checkin.php), tgId
 *               заранее не нужен; текст фиксируется на момент постановки;
 *             "queue_status": статусы очереди (pending/sent);
 *             "queue_clear": снять очередь.
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
$mode   = (string)($body['mode'] ?? 'send');
$qfile  = $dir . '/prize-queue.json';

// ── Управление призовой очередью (доставка при входе — checkin.php) ────────────
if ($mode === 'queue_status') {
    $queue = is_file($qfile) ? json_decode((string)@file_get_contents($qfile), true) : null;
    $out = [];
    if (is_array($queue) && isset($queue['recipients'])) {
        foreach ($queue['recipients'] as $r) {
            $out[] = [
                'rank' => $r['rank'] ?? 0, 'name' => $r['name'] ?? '',
                'score' => $r['score'] ?? 0, 'status' => $r['status'] ?? '',
                'sentAt' => $r['sentAt'] ?? null,
            ];
        }
    }
    respond(200, ['ok' => true, 'queued' => $out, 'createdAt' => $queue['createdAt'] ?? null]);
}
if ($mode === 'queue_clear') {
    $existed = is_file($qfile);
    if ($existed) @unlink($qfile);
    respond(200, ['ok' => true, 'cleared' => $existed]);
}
if ($mode !== 'send' && $mode !== 'queue') respond(400, ['ok' => false, 'error' => 'Unknown mode']);
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
        'uid'  => (string)($e['uid'] ?? ''),
    ];
}

// Постановка в очередь: текст резолвим сейчас (топ зафиксирован на этот момент),
// доставит checkin.php при следующем входе игрока — tgId заранее не нужен.
if ($mode === 'queue') {
    $queued = [];
    foreach ($recipients as $r) {
        if ($r['uid'] === '') continue;
        $queued[] = [
            'uid'    => $r['uid'],
            'rank'   => $r['rank'],
            'name'   => $r['name'],
            'score'  => $r['score'],
            'text'   => strtr($text, ['{name}' => $r['name'], '{score}' => (string)$r['score'], '{rank}' => (string)$r['rank']]),
            'button' => $button,
            'status' => 'pending',
        ];
    }
    if ($dryRun) {
        $preview = array_map(function ($r) { unset($r['uid']); return $r; }, $queued);
        respond(200, ['ok' => true, 'dry_run' => true, 'mode' => 'queue', 'would_queue' => $preview]);
    }
    @file_put_contents($qfile, json_encode([
        'createdAt' => gmdate('Y-m-d\TH:i:s\Z'),
        'recipients' => $queued,
    ], JSON_UNESCAPED_UNICODE), LOCK_EX);
    $out = array_map(function ($r) { unset($r['uid']); return $r; }, $queued);
    respond(200, ['ok' => true, 'mode' => 'queue', 'queued' => $out]);
}

if ($dryRun) {
    // tgId/uid в dry-run не раскрываем — только факт достижимости.
    $out = array_map(function ($r) { unset($r['tgId'], $r['uid']); return $r; }, $recipients);
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
