<?php
/**
 * Чекин игрока при входе в игру (Telegram mini-app).
 *
 * Клиент на старте шлёт подписанный initData (fire-and-forget). Сервер проверяет
 * подпись токеном бота и по uid игрока:
 *   1) бэкфиллит приватный tgId в его записи на доске (если её писали до того,
 *      как tgId начали сохранять) — топ становится «достижимым» для уведомлений;
 *   2) если игрок стоит в призовой очереди (lb-data/prize-queue.json, ставится
 *      админом через notify-top.php mode=queue) — бот немедленно шлёт ему
 *      сообщение о призе, запись помечается sent (повторно не шлётся).
 *
 * Очереди нет / пустая → лёгкий no-op. Ответ всегда без деталей (204), чтобы
 * клиенту ничего не раскрывать.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

const GAME_URL = 'https://cb077728.tw1.ru/';
const INIT_DATA_MAX_AGE = 86400;

$root = isset($_SERVER['DOCUMENT_ROOT']) && $_SERVER['DOCUMENT_ROOT'] !== ''
    ? rtrim($_SERVER['DOCUMENT_ROOT'], '/') : dirname(__DIR__);
$dir = $root . '/lb-data';

function read_secret($path) {
    if (!is_file($path)) return '';
    $value = @include $path;
    return is_string($value) ? trim($value) : '';
}

// djb2 → base36, идентичен клиентскому hashStr и leaderboard.php.
function tg_djb2($str) {
    $h = 5381;
    $s = (string)$str;
    $len = strlen($s);
    for ($i = 0; $i < $len; $i++) {
        $h = (($h * 33) + ord($s[$i])) & 0xFFFFFFFF;
    }
    if ($h === 0) return '0';
    $digits = '0123456789abcdefghijklmnopqrstuvwxyz';
    $out = '';
    while ($h > 0) { $out = $digits[$h % 36] . $out; $h = intdiv($h, 36); }
    return $out;
}

function tg_verify($initData, $botToken, $maxAge) {
    if (!is_string($initData) || $initData === '') return null;
    parse_str($initData, $pairs);
    if (!isset($pairs['hash'])) return null;
    $hash = $pairs['hash'];
    unset($pairs['hash']);
    ksort($pairs);
    $chunks = [];
    foreach ($pairs as $k => $v) { $chunks[] = $k . '=' . $v; }
    $dcs = implode("\n", $chunks);
    $secret = hash_hmac('sha256', $botToken, 'WebAppData', true);
    $calc = hash_hmac('sha256', $dcs, $secret);
    if (!hash_equals($calc, (string)$hash)) return null;
    if ($maxAge > 0 && isset($pairs['auth_date']) && time() - (int)$pairs['auth_date'] > $maxAge) return null;
    $user = isset($pairs['user']) ? json_decode($pairs['user'], true) : null;
    if (!is_array($user) || !isset($user['id'])) return null;
    return (int)$user['id'];
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
    return is_array($data) && !empty($data['ok']);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { http_response_code(405); echo '{"ok":false}'; exit; }

$botToken = read_secret($dir . '/bot-token.php');
if ($botToken === '') { http_response_code(204); exit; }

$body = json_decode((string)file_get_contents('php://input', false, null, 0, 65536), true);
$tgId = tg_verify(is_array($body) ? ($body['initData'] ?? '') : '', $botToken, INIT_DATA_MAX_AGE);
if ($tgId === null) { http_response_code(403); echo '{"ok":false}'; exit; }
$uid = 'tg_' . tg_djb2($tgId);

// ── 1) Бэкфилл tgId в записи доски этого игрока ────────────────────────────────
$boardFile = $dir . '/board-v2.json';
if (is_file($boardFile) && ($fp = @fopen($boardFile, 'c+'))) {
    if (flock($fp, LOCK_EX)) {
        $board = json_decode((string)stream_get_contents($fp), true);
        if (is_array($board)) {
            $changed = false;
            foreach ($board as &$it) {
                if (isset($it['uid']) && $it['uid'] === $uid && empty($it['tgId'])) {
                    $it['tgId'] = $tgId;
                    $changed = true;
                }
            }
            unset($it);
            if ($changed) {
                ftruncate($fp, 0);
                rewind($fp);
                fwrite($fp, json_encode($board, JSON_UNESCAPED_UNICODE));
                fflush($fp);
            }
        }
        flock($fp, LOCK_UN);
    }
    fclose($fp);
}

// ── 2) Призовая очередь: если игрок в ней и pending — шлём и помечаем ──────────
$qfile = $dir . '/prize-queue.json';
if (is_file($qfile) && ($qp = @fopen($qfile, 'c+'))) {
    if (flock($qp, LOCK_EX)) {
        $queue = json_decode((string)stream_get_contents($qp), true);
        if (is_array($queue) && isset($queue['recipients']) && is_array($queue['recipients'])) {
            $dirty = false;
            foreach ($queue['recipients'] as &$r) {
                if (($r['uid'] ?? '') === $uid && ($r['status'] ?? '') === 'pending') {
                    if (tg_send($botToken, $tgId, (string)($r['text'] ?? ''), (string)($r['button'] ?? ''))) {
                        $r['status'] = 'sent';
                        $r['sentAt'] = gmdate('Y-m-d\TH:i:s\Z');
                    } else {
                        // Сбой отправки — оставляем pending, попробуем при следующем входе.
                        $r['lastError'] = gmdate('Y-m-d\TH:i:s\Z');
                    }
                    $dirty = true;
                    break;
                }
            }
            unset($r);
            if ($dirty) {
                ftruncate($qp, 0);
                rewind($qp);
                fwrite($qp, json_encode($queue, JSON_UNESCAPED_UNICODE));
                fflush($qp);
            }
        }
        flock($qp, LOCK_UN);
    }
    fclose($qp);
}

http_response_code(204);
