<?php
/**
 * Глобальная таблица рекордов «Президент» — same-origin endpoint.
 *
 * Живёт на том же статическом хосте, что и игра (Timeweb, nginx+PHP), поэтому
 * отдельный Node-сервер не нужен и CORS не требуется. Контракт совместим с
 * клиентом src/lib/globalLeaderboard.js:
 *   GET  → { ok, leaderboard: [...] }              (top-50, без uid)
 *   POST → { ok, leaderboard, rank, isTopN, improved, entryId }
 *
 * ВАЖНО: домашняя папка аккаунта на этом хостинге не пишется (open_basedir пуст,
 * но нет прав на запись), поэтому данные лежат в public_html/lb-data/. Деплой
 * настроен НЕ удалять lb-data (см. .github/workflows/deploy-timeweb.yml), так что
 * рекорды переживают пуши. Прямой HTTP-доступ к файлу закрыт .htaccess (в нём uid).
 *
 * Ограничение доверия (как и у Node-версии): счёт приходит от клиента и лишь
 * клампится. Дедуп «1 лучший на uid» мешает одному игроку забить таблицу, но
 * uid тоже клиентский. Для призового соревнования нужен proof-of-play.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

const MAX_SCORE        = 999;
const STORE_MAX        = 100;  // сколько храним
const RETURN_MAX       = 50;   // сколько отдаём
const MAX_BODY_BYTES   = 16384;
const RL_WINDOW        = 60;   // окно rate-limit POST, сек
const RL_MAX           = 30;   // макс. отправок результата с одного IP за окно
const RL_MAX_IPS       = 5000; // предел числа IP-бакетов (прунинг протухших сверх него)

$DIFF_RANK   = ['easy' => 1, 'normal' => 2, 'hardcore' => 3];
$OUTCOMES    = ['victory' => true, 'defeat' => true, 'legacy' => true];

// ── Путь к хранилищу (public_html/lb-data, переживает деплой) ──────────────────
function store_dir() {
    $root = isset($_SERVER['DOCUMENT_ROOT']) ? rtrim($_SERVER['DOCUMENT_ROOT'], '/') : '';
    // DOCUMENT_ROOT = public_html; если пусто — поднимаемся от api/ на уровень выше.
    $base = $root !== '' ? $root : dirname(__DIR__);
    return $base . '/lb-data';
}

function data_file() {
    return store_dir() . '/board.json';
}

// Гарантируем каталог хранилища и запрет прямого HTTP-доступа к нему (в файле uid).
function ensure_store() {
    $dir = store_dir();
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    $ht = $dir . '/.htaccess';
    if (!is_file($ht)) {
        @file_put_contents($ht, "Require all denied\nDeny from all\n");
    }
}

// IP rate-limit для POST. Состояние — отдельный файл lb-rl.json (доска хранится
// массивом, поэтому счётчики держим отдельно). IP хэшируем. Сбой хранилища не
// блокирует игроков (возвращаем false). true → лимит превышен.
function rate_limited($window, $max) {
    $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    $ip = trim(explode(',', (string)$ip)[0]);
    $key = substr(sha1($ip), 0, 16);
    $now = time();
    $fp = @fopen(store_dir() . '/lb-rl.json', 'c+');
    if (!$fp) return false;
    $limited = false;
    if (flock($fp, LOCK_EX)) {
        $cur = stream_get_contents($fp);
        $map = $cur !== '' ? json_decode($cur, true) : null;
        if (!is_array($map)) $map = [];
        if (count($map) > RL_MAX_IPS) {
            foreach ($map as $k => $b) {
                if ($now - (int)($b['t'] ?? 0) > $window) unset($map[$k]);
            }
        }
        $b = $map[$key] ?? null;
        if (!$b || $now - (int)($b['t'] ?? 0) > $window) {
            $map[$key] = ['t' => $now, 'n' => 1];
        } else {
            $map[$key]['n'] = (int)$b['n'] + 1;
            if ($map[$key]['n'] > $max) $limited = true;
        }
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode($map));
        fflush($fp);
        flock($fp, LOCK_UN);
    }
    fclose($fp);
    return $limited;
}

function clamp_score($v) {
    $n = (int) $v;
    if ($n < 0) return 0;
    if ($n > MAX_SCORE) return MAX_SCORE;
    return $n;
}

function clean_str($v, $max) {
    $s = trim((string) $v);
    return mb_substr($s, 0, $max, 'UTF-8');
}

function make_id() {
    $b = random_bytes(16);
    $b[6] = chr((ord($b[6]) & 0x0f) | 0x40);
    $b[8] = chr((ord($b[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));
}

function normalize_entry($raw, $serverTime) {
    global $DIFF_RANK, $OUTCOMES;
    $name = clean_str($raw['name'] ?? '', 24);
    if ($name === '') $name = 'Президент';
    $diff = $raw['difficulty'] ?? '';
    if (!isset($DIFF_RANK[$diff])) $diff = 'normal';
    $out = $raw['outcome'] ?? '';
    if (!isset($OUTCOMES[$out])) $out = 'defeat';
    $endingId = isset($raw['endingId']) && $raw['endingId'] !== '' ? clean_str($raw['endingId'], 64) : null;
    return [
        'id'          => make_id(),
        'name'        => $name,
        'score'       => clamp_score($raw['score'] ?? 0),
        'difficulty'  => $diff,
        'outcome'     => $out,
        'endingId'    => $endingId,
        'endingTitle' => clean_str($raw['endingTitle'] ?? '', 80),
        'reason'      => clean_str($raw['reason'] ?? '', 80),
        'killerKey'   => clean_str($raw['killerKey'] ?? '', 40),
        'finishedAt'  => $serverTime,
    ];
}

function sort_board(&$arr) {
    global $DIFF_RANK;
    usort($arr, function ($a, $b) use ($DIFF_RANK) {
        $ds = (int)$b['score'] - (int)$a['score'];
        if ($ds !== 0) return $ds;
        $dd = ($DIFF_RANK[$b['difficulty']] ?? 0) - ($DIFF_RANK[$a['difficulty']] ?? 0);
        if ($dd !== 0) return $dd;
        $at = strtotime($a['finishedAt'] ?? '') ?: 0;
        $bt = strtotime($b['finishedAt'] ?? '') ?: 0;
        return $at - $bt; // раньше поставивший — выше при равенстве
    });
}

// uid наружу не отдаём.
function public_entry($e) {
    unset($e['uid']);
    return $e;
}

// ── Чтение/запись под эксклюзивным локом ──────────────────────────────────────
function read_board($fp) {
    $raw = stream_get_contents($fp);
    if ($raw === false || $raw === '') return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function respond($payload) {
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'OPTIONS') { http_response_code(204); exit; }

$file = data_file();

if ($method === 'GET') {
    $board = [];
    if (is_file($file) && ($fp = @fopen($file, 'r'))) {
        if (flock($fp, LOCK_SH)) { $board = read_board($fp); flock($fp, LOCK_UN); }
        fclose($fp);
    }
    sort_board($board);
    $out = array_map('public_entry', array_slice($board, 0, RETURN_MAX));
    respond(['ok' => true, 'leaderboard' => array_values($out)]);
}

if ($method !== 'POST') {
    http_response_code(405);
    respond(['ok' => false, 'error' => 'Method not allowed']);
}

ensure_store();
if (rate_limited(RL_WINDOW, RL_MAX)) {
    http_response_code(429);
    respond(['ok' => false, 'error' => 'Too many submissions']);
}

$raw = file_get_contents('php://input');
if ($raw === false) $raw = '';
if (strlen($raw) > MAX_BODY_BYTES) {
    http_response_code(413);
    respond(['ok' => false, 'error' => 'Payload too large']);
}
$body = json_decode($raw, true);
if (!is_array($body)) {
    http_response_code(400);
    respond(['ok' => false, 'error' => 'Invalid JSON']);
}

$uid   = clean_str($body['uid'] ?? '', 64);
$entry = normalize_entry($body, gmdate('Y-m-d\TH:i:s.000\Z'));

// Открываем на чтение+запись с эксклюзивным локом (создаём при отсутствии).
$fp = @fopen($file, 'c+');
if (!$fp) {
    http_response_code(500);
    respond(['ok' => false, 'error' => 'Storage unavailable']);
}
if (!flock($fp, LOCK_EX)) {
    fclose($fp);
    http_response_code(500);
    respond(['ok' => false, 'error' => 'Lock failed']);
}

$board = read_board($fp);

// Дедуп «1 лучший результат на uid».
if ($uid !== '') {
    $prev = null;
    foreach ($board as $item) {
        if (isset($item['uid']) && $item['uid'] === $uid) { $prev = $item; break; }
    }
    if ($prev && (int)$prev['score'] >= (int)$entry['score']) {
        $existing = $board;
        sort_board($existing);
        $rank = 0;
        foreach ($existing as $i => $it) { if ($it['id'] === $prev['id']) { $rank = $i + 1; break; } }
        flock($fp, LOCK_UN); fclose($fp);
        respond([
            'ok' => true,
            'leaderboard' => array_values(array_map('public_entry', array_slice($existing, 0, RETURN_MAX))),
            'entryId' => $prev['id'],
            'rank' => $rank,
            'isTopN' => $rank > 0 && $rank <= RETURN_MAX,
            'improved' => false,
        ]);
    }
    // Улучшение — выкидываем прошлую запись этого uid.
    $board = array_values(array_filter($board, function ($it) use ($uid) {
        return !isset($it['uid']) || $it['uid'] !== $uid;
    }));
}

$stored = $entry;
$stored['uid'] = $uid !== '' ? $uid : null;
$board[] = $stored;
sort_board($board);

$rank = 0;
foreach ($board as $i => $it) { if ($it['id'] === $stored['id']) { $rank = $i + 1; break; } }

$board = array_slice($board, 0, STORE_MAX);

// Атомарная запись: перезаписываем содержимое под тем же локом.
ftruncate($fp, 0);
rewind($fp);
fwrite($fp, json_encode($board, JSON_UNESCAPED_UNICODE));
fflush($fp);
flock($fp, LOCK_UN);
fclose($fp);

respond([
    'ok' => true,
    'leaderboard' => array_values(array_map('public_entry', array_slice($board, 0, RETURN_MAX))),
    'entryId' => $stored['id'],
    'rank' => $rank,
    'isTopN' => $rank > 0 && $rank <= RETURN_MAX,
    'improved' => true,
]);
