<?php
// ВРЕМЕННЫЙ read-only диагностик: дампит агрегат аналитики для проверки collect.php.
// Удаляется сразу после верификации. Только чтение, отдаёт лишь агрегатные счётчики.
header('Content-Type: application/json; charset=utf-8');
$root = isset($_SERVER['DOCUMENT_ROOT']) && $_SERVER['DOCUMENT_ROOT'] !== ''
    ? rtrim($_SERVER['DOCUMENT_ROOT'], '/') : dirname(__DIR__);
$file = $root . '/lb-data/analytics.json';
echo json_encode([
    'exists' => is_file($file),
    'data'   => is_file($file) ? json_decode((string)@file_get_contents($file), true) : null,
], JSON_UNESCAPED_UNICODE);
