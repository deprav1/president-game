<?php
/**
 * Серверный сбор игровой аналитики — same-origin PHP-коллектор.
 *
 * Клиент (src/lib/analytics.js → sendServerEvent) POST-ит {event, payload, ts}.
 * Вместо распухающего лога событий ведём СКОЛЬЗЯЩИЙ АГРЕГАТ в lb-data/analytics.json:
 * счётчики O(1) на событие, размер файла ограничен (важно для шаред-хостинга).
 * Читает агрегат dashboard.php (под токеном).
 *
 * Публичный endpoint (события шлют все игроки), поэтому счётчики можно накрутить
 * curl-спамом — это только аналитика, низкие ставки; при необходимости повесить
 * IP-лимит. uid и сырой payload НЕ храним — только счётчики по card_id.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

const MAX_BODY_BYTES = 16384;
const MAX_CARDS      = 3000; // предел числа card_id в агрегате (защита от разрастания)
const RL_WINDOW      = 60;   // окно лимита, сек
const RL_MAX         = 120;  // макс. событий с одного IP за окно
const RL_MAX_IPS     = 5000; // предел числа IP-бакетов (прунинг протухших сверх него)

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') { http_response_code(204); exit; }
if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

$raw = file_get_contents('php://input');
if ($raw === false) $raw = '';
if (strlen($raw) > MAX_BODY_BYTES) { http_response_code(413); echo json_encode(['ok' => false]); exit; }
$body = json_decode($raw, true);
if (!is_array($body)) { http_response_code(400); echo json_encode(['ok' => false, 'error' => 'Invalid JSON']); exit; }

$event   = mb_substr((string)($body['event'] ?? ''), 0, 80, 'UTF-8');
$payload = (isset($body['payload']) && is_array($body['payload'])) ? $body['payload'] : [];

$FORBIDDEN = ['__proto__', 'prototype', 'constructor'];
$cardId = '';
if (isset($payload['card_id']) && is_string($payload['card_id'])) {
    $c = trim($payload['card_id']);
    if ($c !== '' && !in_array($c, $FORBIDDEN, true)) $cardId = mb_substr($c, 0, 80, 'UTF-8');
}
$rating = isset($payload['rating']) ? (string)$payload['rating'] : '';
$now = gmdate('Y-m-d\TH:i:s\Z');

// ── Хранилище: lb-data (переживает деплой, закрыто .htaccess) ──────────────────
$root = isset($_SERVER['DOCUMENT_ROOT']) && $_SERVER['DOCUMENT_ROOT'] !== ''
    ? rtrim($_SERVER['DOCUMENT_ROOT'], '/') : dirname(__DIR__);
$dir  = $root . '/lb-data';
if (!is_dir($dir)) @mkdir($dir, 0755, true);
$ht = $dir . '/.htaccess';
if (!is_file($ht)) @file_put_contents($ht, "Require all denied\nDeny from all\n");
$file = $dir . '/stats.json';

$fp = @fopen($file, 'c+');
if (!$fp) { http_response_code(500); echo json_encode(['ok' => false, 'error' => 'Storage unavailable']); exit; }
if (!flock($fp, LOCK_EX)) { fclose($fp); http_response_code(500); echo json_encode(['ok' => false]); exit; }

$cur = stream_get_contents($fp);
$data = $cur !== '' ? json_decode($cur, true) : null;
if (!is_array($data)) $data = [];
if (!isset($data['totals']) || !is_array($data['totals'])) {
    $data['totals'] = ['events' => 0, 'views' => 0, 'likes' => 0, 'dislikes' => 0, 'decisions' => 0];
}
if (!isset($data['byCard']) || !is_array($data['byCard'])) $data['byCard'] = [];

// ── IP rate-limit (состояние в _rl того же файла, под тем же локом) ────────────
// IP хэшируем (приватность + фикс. размер). При превышении событие не учитываем.
$ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
$ip = trim(explode(',', (string)$ip)[0]);
$ipKey = substr(sha1($ip), 0, 16);
$nowTs = time();
if (!isset($data['_rl']) || !is_array($data['_rl'])) $data['_rl'] = [];
if (count($data['_rl']) > RL_MAX_IPS) {
    foreach ($data['_rl'] as $k => $b) {
        if ($nowTs - (int)($b['t'] ?? 0) > RL_WINDOW) unset($data['_rl'][$k]);
    }
}
$bucket = $data['_rl'][$ipKey] ?? null;
if (!$bucket || $nowTs - (int)($bucket['t'] ?? 0) > RL_WINDOW) {
    $data['_rl'][$ipKey] = ['t' => $nowTs, 'n' => 1];
} else {
    $data['_rl'][$ipKey]['n'] = (int)$bucket['n'] + 1;
    if ($data['_rl'][$ipKey]['n'] > RL_MAX) {
        // Превышение: сохраняем обновлённый счётчик лимита, событие НЕ учитываем.
        ftruncate($fp, 0); rewind($fp);
        fwrite($fp, json_encode($data, JSON_UNESCAPED_UNICODE));
        fflush($fp); flock($fp, LOCK_UN); fclose($fp);
        http_response_code(429);
        echo json_encode(['ok' => false, 'error' => 'Too many requests']);
        exit;
    }
}

$data['totals']['events'] = (int)$data['totals']['events'] + 1;

// Заводим строку карты (в пределах лимита), если её ещё нет.
$hasCard = $cardId !== '' && isset($data['byCard'][$cardId]);
if ($cardId !== '' && !$hasCard && count($data['byCard']) < MAX_CARDS) {
    $data['byCard'][$cardId] = ['views' => 0, 'likes' => 0, 'dislikes' => 0, 'decisions' => 0, 'lastSeen' => null];
    $hasCard = true;
}

$bump = function ($key) use (&$data, $cardId, $hasCard, $now) {
    $data['totals'][$key] = (int)$data['totals'][$key] + 1;
    if ($hasCard) {
        $data['byCard'][$cardId][$key] = (int)$data['byCard'][$cardId][$key] + 1;
        $data['byCard'][$cardId]['lastSeen'] = $now;
    }
};

if ($event === 'card_view') {
    $bump('views');
} elseif ($event === 'card_rate') {
    if ($rating === 'up')   $bump('likes');
    elseif ($rating === 'down') $bump('dislikes');
} elseif ($event === 'decision') {
    $bump('decisions');
}

$data['updatedAt'] = $now;

ftruncate($fp, 0);
rewind($fp);
fwrite($fp, json_encode($data, JSON_UNESCAPED_UNICODE));
fflush($fp);
flock($fp, LOCK_UN);
fclose($fp);

http_response_code(204);
