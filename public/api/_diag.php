<?php
header('Content-Type: application/json; charset=utf-8');
$root = $_SERVER['DOCUMENT_ROOT'] ?? '';
$cands = [
    'dirname(DOCROOT)' => dirname($root),
    'DOCROOT'          => $root,
    '__DIR__'          => __DIR__,
    'DOCROOT/lb-data'  => $root . '/lb-data',
    'sys_temp'         => sys_get_temp_dir(),
    'HOME'             => getenv('HOME') ?: '',
];
$res = [];
foreach ($cands as $label => $dir) {
    if ($dir === '') { $res[$label] = ['path' => '', 'skip' => true]; continue; }
    $mk = @mkdir($dir, 0755, true);
    $test = $dir . '/.__w' . substr(md5($label), 0, 6);
    $ok = @file_put_contents($test, 'x');
    if ($ok !== false) @unlink($test);
    $res[$label] = [
        'path' => $dir,
        'is_dir' => is_dir($dir),
        'is_writable' => is_writable($dir),
        'write_test' => $ok !== false,
        'mkdir' => $mk,
    ];
}
echo json_encode([
    'open_basedir' => ini_get('open_basedir'),
    'php' => PHP_VERSION,
    'candidates' => $res,
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
