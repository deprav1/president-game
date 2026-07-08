<?php
/**
 * Сводка серверной аналитики для внутриигровой админ-панели.
 *
 * Читает агрегат lb-data/analytics.json (пишет collect.php) и отдаёт totals,
 * которые показывает AdminAnalyticsPanel (events/views/likes/dislikes/decisions).
 *
 * ЗАЩИТА: требуется токен, совпадающий с lb-data/analytics-token.php
 * (PHP-return secret вне репозитория). Токен приходит в заголовке
 * X-Admin-Token или ?token=. Файла токена нет → доступ закрыт (безопасный дефолт).
 * Токен задаётся один раз вручную (Timeweb file manager); в публичный бандл он
 * не попадает — панель шлёт его из localStorage (см. ?atoken= в AdminAnalyticsPanel).
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') { http_response_code(204); exit; }
if ($method !== 'GET') { http_response_code(405); echo json_encode(['ok' => false]); exit; }

$root = isset($_SERVER['DOCUMENT_ROOT']) && $_SERVER['DOCUMENT_ROOT'] !== ''
    ? rtrim($_SERVER['DOCUMENT_ROOT'], '/') : dirname(__DIR__);
$dir = $root . '/lb-data';

function read_secret($path) {
    if (!is_file($path)) return '';
    $value = @include $path;
    return is_string($value) ? trim($value) : '';
}

$tokenFile = $dir . '/analytics-token.php';
$expected  = read_secret($tokenFile);
$provided  = $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? ($_GET['token'] ?? '');
if ($expected === '' || !hash_equals($expected, (string)$provided)) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'Forbidden']);
    exit;
}

$file = $dir . '/metrics.json';
$data = is_file($file) ? json_decode((string)@file_get_contents($file), true) : null;
$totals = (is_array($data) && isset($data['totals']) && is_array($data['totals'])) ? $data['totals'] : [];
$byCard = (is_array($data) && isset($data['byCard']) && is_array($data['byCard'])) ? $data['byCard'] : [];

echo json_encode([
    'ok'          => true,
    'generatedAt' => gmdate('Y-m-d\TH:i:s\Z'),
    'authEnabled' => true,
    'totals'      => [
        'events'    => (int)($totals['events'] ?? 0),
        'views'     => (int)($totals['views'] ?? 0),
        'likes'     => (int)($totals['likes'] ?? 0),
        'dislikes'  => (int)($totals['dislikes'] ?? 0),
        'decisions' => (int)($totals['decisions'] ?? 0),
        'cards'     => count($byCard),
    ],
    'byCard'      => $byCard,
], JSON_UNESCAPED_UNICODE);
