<?php

$configFile = dirname(__DIR__) . '/config.php';
$httpHost = isset($_SERVER['HTTP_HOST']) ? strtolower($_SERVER['HTTP_HOST']) : '';
$isLocal = $httpHost === 'localhost' || strpos($httpHost, 'localhost:') === 0 || $httpHost === '127.0.0.1' || strpos($httpHost, '127.0.0.1:') === 0 || $httpHost === '::1';
$isCli = PHP_SAPI === 'cli';
if (((!$isLocal && !$isCli) || getenv('APP_ENV') === 'production') && file_exists($configFile)) {
    require $configFile;
}

function mkt_cfg($key, $default = '')
{
    if (defined($key)) {
        return constant($key);
    }
    $value = getenv($key);
    return ($value === false || $value === '') ? $default : $value;
}

if (!defined('PORT')) {
    define('PORT', 5001);
}
if (!defined('JWT_SECRET')) {
    define('JWT_SECRET', mkt_cfg('JWT_SECRET', 'rahasia_kita_123'));
}
if (!defined('UPLOAD_DIR')) {
    define('UPLOAD_DIR', dirname(__DIR__) . '/uploads');
}
if (!is_dir(UPLOAD_DIR)) {
    @mkdir(UPLOAD_DIR, 0777, true);
}

if (!function_exists('json_response')) {
    function json_response($data, $status = 200)
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
}

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
$db = null;
try {
    $db = mysqli_init();
    mysqli_options($db, MYSQLI_OPT_INT_AND_FLOAT_NATIVE, true);
    mysqli_real_connect($db, mkt_cfg('DB_HOST', 'localhost'), mkt_cfg('DB_USER', 'root'), mkt_cfg('DB_PASS', ''), mkt_cfg('DB_NAME', 'admin_react'));
    mysqli_set_charset($db, 'utf8mb4');
} catch (Throwable $e) {
    fwrite(STDERR, 'Gagal koneksi database: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}

$autoload = dirname(__DIR__) . '/vendor/autoload.php';
if (file_exists($autoload)) {
    require $autoload;
}

require __DIR__ . '/helpers.php';
require __DIR__ . '/schema.php';
require __DIR__ . '/queue.php';
require __DIR__ . '/integrations.php';

marketing_schema_install($db);
