<?php
$uri = parse_url(isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '/', PHP_URL_PATH) ?: '/';
$file = __DIR__ . $uri;

if (strpos($uri, '/uploads/') === 0) {
    $path = realpath($file);
    $uploadsDir = realpath(__DIR__ . '/uploads');
    if ($path && $uploadsDir && strpos($path, $uploadsDir . DIRECTORY_SEPARATOR) === 0 && is_file($path)) {
        header('Access-Control-Allow-Origin: *');
        header('Content-Type: ' . (function_exists('mime_content_type') ? mime_content_type($path) : 'application/octet-stream'));
        header('Content-Length: ' . filesize($path));
        readfile($path);
        exit;
    }
    http_response_code(404);
    exit;
}

if ($uri !== '/' && is_file($file)) {
    return false;
}

require __DIR__ . '/index.php';
