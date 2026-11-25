<?php
header('Content-Type: application/json; charset=utf-8');

$configFile = __DIR__ . '/config.php';
$httpHost = isset($_SERVER['HTTP_HOST']) ? strtolower($_SERVER['HTTP_HOST']) : '';
$isLocal = $httpHost === 'localhost' || strpos($httpHost, 'localhost:') === 0 || $httpHost === '127.0.0.1' || strpos($httpHost, '127.0.0.1:') === 0 || $httpHost === '::1';
$shouldLoadConfig = (!$isLocal || getenv('APP_ENV') === 'production') && file_exists($configFile);
$configLoaded = $shouldLoadConfig;
if ($shouldLoadConfig) {
    require_once $configFile;
}

$dbHost = defined('DB_HOST') ? DB_HOST : 'localhost';
$dbUser = defined('DB_USER') ? DB_USER : 'root';
$dbName = defined('DB_NAME') ? DB_NAME : 'admin_react';

$result = [
    'php' => PHP_VERSION,
    'api_file' => file_exists(__DIR__ . '/index.php'),
    'config_file' => $configLoaded,
    'db_host' => $dbHost,
    'db_user' => $dbUser,
    'db_name' => $dbName,
    'db' => 'unknown'
];

try {
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    $db = mysqli_init();
    mysqli_real_connect($db, $dbHost, $dbUser, defined('DB_PASS') ? DB_PASS : '', $dbName);
    $result['db'] = 'ok';
} catch (Exception $e) {
    $result['db'] = 'error: ' . $e->getMessage();
}

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
