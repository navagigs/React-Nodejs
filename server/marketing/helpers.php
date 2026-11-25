<?php

function mkt_prepare_sql($sql, $params)
{
    $hasNull = false;
    foreach ($params as $param) {
        if ($param === null) {
            $hasNull = true;
            break;
        }
    }
    if (!$hasNull) {
        return [$sql, $params];
    }

    $out = '';
    $length = strlen($sql);
    $index = 0;
    $bound = [];
    for ($i = 0; $i < $length; $i++) {
        if ($sql[$i] !== '?') {
            $out .= $sql[$i];
            continue;
        }
        $param = isset($params[$index]) ? $params[$index] : null;
        $index++;
        if ($param === null) {
            $out .= 'NULL';
        } else {
            $out .= '?';
            $bound[] = $param;
        }
    }
    return [$out, $bound];
}

function mkt_all($sql, $params = [])
{
    global $db;
    list($sql, $params) = mkt_prepare_sql($sql, $params);
    $stmt = $db->prepare($sql);
    if ($params) {
        $stmt->bind_param(str_repeat('s', count($params)), ...$params);
    }
    $stmt->execute();
    $result = $stmt->get_result();
    $rows = [];
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $rows[] = $row;
        }
    }
    $stmt->close();
    return $rows;
}

function mkt_one($sql, $params = [])
{
    $rows = mkt_all($sql, $params);
    return isset($rows[0]) ? $rows[0] : null;
}

function mkt_run($sql, $params = [])
{
    global $db;
    list($sql, $params) = mkt_prepare_sql($sql, $params);
    $stmt = $db->prepare($sql);
    if ($params) {
        $stmt->bind_param(str_repeat('s', count($params)), ...$params);
    }
    $stmt->execute();
    $result = [
        'insertId' => (int)$db->insert_id,
        'affectedRows' => (int)$stmt->affected_rows
    ];
    $stmt->close();
    return $result;
}

function mkt_insert($sql, $params = [])
{
    $result = mkt_run($sql, $params);
    return (int)$result['insertId'];
}

function marketing_now($timestamp = null)
{
    return date('Y-m-d H:i:s', $timestamp ?? time());
}

function marketing_json_body()
{
    static $body = null;
    if ($body !== null) {
        return $body;
    }

    $raw = file_get_contents('php://input');
    $decoded = [];
    if (is_string($raw) && trim($raw) !== '') {
        $parsed = json_decode($raw, true);
        if (is_array($parsed)) {
            $decoded = $parsed;
        }
    }

    $body = array_merge($_GET, $_POST, $decoded);
    return $body;
}

function marketing_val($key, $default = '')
{
    $body = marketing_json_body();
    return array_key_exists($key, $body) ? $body[$key] : $default;
}

function marketing_int($value, $default = 0)
{
    if (is_int($value)) {
        return $value;
    }
    if (is_float($value)) {
        return (int)$value;
    }
    if (is_string($value) && preg_match('/^\s*([+-]?\d+)/', $value, $match)) {
        return (int)$match[1];
    }
    if (is_bool($value)) {
        return $value ? 1 : 0;
    }
    return (int)$default;
}

function marketing_bool($value)
{
    if (is_bool($value)) {
        return $value;
    }
    if (is_int($value) || is_float($value)) {
        return $value != 0;
    }
    if (is_string($value)) {
        return in_array(strtolower(trim($value)), ['1', 'true', 'yes', 'y', 'on'], true);
    }
    return false;
}

function marketing_uuid()
{
    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
    $hex = bin2hex($bytes);
    return substr($hex, 0, 8) . '-' . substr($hex, 8, 4) . '-' . substr($hex, 12, 4) . '-' . substr($hex, 16, 4) . '-' . substr($hex, 20);
}

function marketing_b64url_encode($input)
{
    return rtrim(strtr(base64_encode($input), '+/', '-_'), '=');
}

function marketing_b64url_decode($input)
{
    $input = (string)$input;
    $padded = strtr($input, '-_', '+/') . str_repeat('=', (4 - strlen($input) % 4) % 4);
    return base64_decode($padded, true);
}

function marketing_auth_header()
{
    if (isset($_SERVER['HTTP_AUTHORIZATION']) && trim((string)$_SERVER['HTTP_AUTHORIZATION']) !== '') {
        return trim((string)$_SERVER['HTTP_AUTHORIZATION']);
    }
    if (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION']) && trim((string)$_SERVER['REDIRECT_HTTP_AUTHORIZATION']) !== '') {
        return trim((string)$_SERVER['REDIRECT_HTTP_AUTHORIZATION']);
    }
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        if (is_array($headers)) {
            foreach ($headers as $name => $value) {
                if (strtolower((string)$name) === 'authorization') {
                    return trim((string)$value);
                }
            }
        }
    }
    return '';
}

function marketing_auth_failure($required, $message, $status)
{
    if (!$required) {
        return null;
    }
    if (function_exists('json_response')) {
        json_response(['message' => $message], $status);
    }
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['message' => $message], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function marketing_current_user($required = true)
{
    $header = marketing_auth_header();
    $token = '';
    if ($header !== '' && preg_match('/^Bearer\s+(.+)$/i', $header, $match)) {
        $token = trim($match[1]);
    }
    if ($token === '') {
        $token = trim((string)marketing_val('token', ''));
    }
    if ($token === '') {
        return marketing_auth_failure($required, 'Autentikasi diperlukan', 401);
    }

    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return marketing_auth_failure($required, 'Autentikasi diperlukan', 401);
    }

    $headerData = json_decode((string)marketing_b64url_decode($parts[0]), true);
    if (!is_array($headerData) || !isset($headerData['alg']) || $headerData['alg'] !== 'HS256') {
        return marketing_auth_failure($required, 'Autentikasi diperlukan', 401);
    }

    $secret = defined('JWT_SECRET') ? JWT_SECRET : 'rahasia_kita_123';
    $expected = marketing_b64url_encode(hash_hmac('sha256', $parts[0] . '.' . $parts[1], $secret, true));
    if (!hash_equals($expected, $parts[2])) {
        return marketing_auth_failure($required, 'Autentikasi diperlukan', 401);
    }

    $payload = json_decode((string)marketing_b64url_decode($parts[1]), true);
    if (!is_array($payload)) {
        return marketing_auth_failure($required, 'Autentikasi diperlukan', 401);
    }
    if (isset($payload['exp']) && (int)$payload['exp'] < time()) {
        return marketing_auth_failure($required, 'Autentikasi diperlukan', 401);
    }

    return [
        'id' => (int)(isset($payload['id']) ? $payload['id'] : 0),
        'email' => (string)(isset($payload['email']) ? $payload['email'] : ''),
        'role_id' => (int)(isset($payload['role_id']) ? $payload['role_id'] : 0)
    ];
}

function marketing_can($roleId, $menuUrl, $flag = 'is_view')
{
    $flags = ['is_view', 'is_create', 'is_edit', 'is_delete', 'is_export', 'is_duplicate', 'is_unlock'];
    if (!in_array($flag, $flags, true)) {
        return false;
    }

    $url = ltrim((string)$menuUrl, '/');
    if ($url === '') {
        return false;
    }

    $row = mkt_one(
        "SELECT ma.$flag AS allowed FROM module_authority ma
        INNER JOIN menu m ON m.menu_id = ma.menu_id
        WHERE ma.role_id = ? AND (m.url = ? OR m.url = ?) AND m.is_active = 1
        LIMIT 1",
        [(int)$roleId, $url, '/' . $url]
    );

    return is_array($row) && (int)(isset($row['allowed']) ? $row['allowed'] : 0) === 1;
}

function marketing_require($menuUrl, $flag = 'is_view')
{
    $user = marketing_current_user(true);
    if (!is_array($user) || !marketing_can($user['role_id'], $menuUrl, $flag)) {
        return marketing_auth_failure(true, 'Akses ditolak', 403);
    }
    return $user;
}

function marketing_table_exists($table)
{
    $row = mkt_one(
        "SELECT COUNT(*) AS total FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
        [(string)$table]
    );
    return is_array($row) && (int)(isset($row['total']) ? $row['total'] : 0) > 0;
}

function marketing_log_activity($user, $action, $module, $description)
{
    $userId = 0;
    $email = '';
    if (is_array($user)) {
        $userId = marketing_int(isset($user['id']) ? $user['id'] : 0);
        $email = trim((string)(isset($user['email']) ? $user['email'] : ''));
    }

    $name = 'Sistem';
    $roleId = null;
    if ($userId > 0 || $email !== '') {
        try {
            $row = $email !== ''
                ? mkt_one("SELECT id, name, email, role_id FROM users WHERE email = ? LIMIT 1", [$email])
                : mkt_one("SELECT id, name, email, role_id FROM users WHERE id = ? LIMIT 1", [$userId]);
            if (is_array($row)) {
                $userId = (int)$row['id'];
                $email = (string)$row['email'];
                $name = trim((string)(isset($row['name']) ? $row['name'] : '')) !== '' ? (string)$row['name'] : $email;
                $roleId = isset($row['role_id']) && $row['role_id'] !== null ? (int)$row['role_id'] : null;
            }
        } catch (Throwable $e) {
            $row = null;
        }
    }

    $params = [
        $userId > 0 ? $userId : null,
        substr($name !== '' ? $name : 'Unknown', 0, 150),
        $roleId,
        substr((string)$action, 0, 50),
        substr((string)$module, 0, 100),
        (string)$description !== '' ? substr((string)$description, 0, 2000) : null,
        marketing_now()
    ];

    mkt_run("INSERT INTO marketing_activity_logs (user_id, user_name, role_id, action, module, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", $params);

    if (marketing_table_exists('activity_logs')) {
        mkt_run("INSERT INTO activity_logs (user_id, user_name, role_id, action, module, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", $params);
    }
}

function marketing_rate_limit($key, $limit, $windowSeconds)
{
    global $db;

    $key = substr((string)$key, 0, 191);
    $limit = max(1, marketing_int($limit, 1));
    $windowSeconds = max(1, marketing_int($windowSeconds, 60));
    $nowEpoch = time();
    $now = marketing_now($nowEpoch);

    $db->begin_transaction();
    try {
        mkt_run("INSERT IGNORE INTO marketing_rate_limits (rate_key, hits, window_start, created_at) VALUES (?, 0, ?, ?)", [$key, $now, $now]);
        $row = mkt_one("SELECT hits, window_start FROM marketing_rate_limits WHERE rate_key = ? FOR UPDATE", [$key]);
        if (!is_array($row)) {
            $db->commit();
            return false;
        }

        $start = isset($row['window_start']) ? strtotime((string)$row['window_start']) : false;
        if (!$start || ($nowEpoch - $start) >= $windowSeconds) {
            $hits = 0;
            $windowStart = $now;
        } else {
            $hits = marketing_int(isset($row['hits']) ? $row['hits'] : 0);
            $windowStart = (string)$row['window_start'];
        }

        $hits++;
        mkt_run("UPDATE marketing_rate_limits SET hits = ?, window_start = ? WHERE rate_key = ?", [$hits, $windowStart, $key]);
        $db->commit();
        return $hits <= $limit;
    } catch (Throwable $e) {
        $db->rollback();
        return true;
    }
}

function marketing_encryption_key()
{
    $key = getenv('MARKETING_ENCRYPTION_KEY');
    if ($key !== false && trim((string)$key) !== '') {
        $raw = base64_decode((string)$key, true);
        if (is_string($raw) && strlen($raw) === 32) {
            return $raw;
        }
        return hash('sha256', (string)$key, true);
    }
    $secret = defined('JWT_SECRET') ? JWT_SECRET : 'rahasia_kita_123';
    return hash('sha256', 'marketing:' . $secret, true);
}

function marketing_encrypt($value)
{
    try {
        $key = marketing_encryption_key();
        $iv = random_bytes(12);
        $tag = '';
        $cipher = openssl_encrypt((string)$value, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
        if ($cipher === false || $tag === '') {
            return '';
        }
        return 'v1:' . base64_encode($iv) . ':' . base64_encode($tag) . ':' . base64_encode($cipher);
    } catch (Throwable $e) {
        return '';
    }
}

function marketing_decrypt($value)
{
    try {
        $parts = explode(':', (string)$value);
        if (count($parts) !== 4 || $parts[0] !== 'v1') {
            return '';
        }
        $iv = base64_decode($parts[1], true);
        $tag = base64_decode($parts[2], true);
        $cipher = base64_decode($parts[3], true);
        if ($iv === false || $tag === false || $cipher === false) {
            return '';
        }
        $plain = openssl_decrypt($cipher, 'aes-256-gcm', marketing_encryption_key(), OPENSSL_RAW_DATA, $iv, $tag);
        return $plain === false ? '' : $plain;
    } catch (Throwable $e) {
        return '';
    }
}

function marketing_setting_get($key, $default = '')
{
    $row = mkt_one("SELECT setting_value, is_encrypted FROM marketing_settings WHERE setting_key = ? LIMIT 1", [(string)$key]);
    if (!is_array($row)) {
        return $default;
    }
    $value = isset($row['setting_value']) ? (string)$row['setting_value'] : '';
    if ((int)(isset($row['is_encrypted']) ? $row['is_encrypted'] : 0) === 1) {
        $value = marketing_decrypt($value);
    }
    return $value;
}

function marketing_setting_set($key, $value, $encrypted = false, $userId = null)
{
    $store = $encrypted ? marketing_encrypt($value) : (string)$value;
    mkt_run("INSERT INTO marketing_settings (setting_key, setting_value, is_encrypted, updated_by, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), is_encrypted = VALUES(is_encrypted), updated_by = VALUES(updated_by), updated_at = VALUES(updated_at)",
        [
            substr((string)$key, 0, 100),
            $store,
            $encrypted ? 1 : 0,
            $userId !== null && (int)$userId > 0 ? (int)$userId : null,
            marketing_now()
        ]
    );
    return true;
}

function marketing_validate_email($email)
{
    $email = trim((string)$email);
    return $email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

function marketing_normalize_phone($phone)
{
    $phone = trim((string)$phone);
    $hasPlus = strpos($phone, '+') === 0;
    $digits = preg_replace('/\D/', '', $phone) ?: '';
    if ($digits === '') {
        return '';
    }

    if ($hasPlus && strpos($digits, '62') === 0) {
        return $digits;
    }
    if (strpos($digits, '08') === 0) {
        return '62' . substr($digits, 1);
    }
    if (strpos($digits, '62') === 0) {
        return $digits;
    }
    if (strpos($digits, '8') === 0) {
        return '62' . $digits;
    }
    return '62' . ltrim($digits, '0');
}

function marketing_validate_phone($phone)
{
    return (bool)preg_match('/^62\d{8,13}$/', marketing_normalize_phone($phone));
}

function marketing_personalize($text, $contact)
{
    $get = function ($keys) use ($contact) {
        if (!is_array($contact)) {
            return '';
        }
        foreach ($keys as $key) {
            if (array_key_exists($key, $contact) && $contact[$key] !== null) {
                return (string)$contact[$key];
            }
        }
        return '';
    };

    $map = [
        '{{nama}}' => $get(['name', 'contact_name', 'nama']),
        '{{email}}' => $get(['email', 'contact_email']),
        '{{perusahaan}}' => $get(['company', 'contact_company', 'perusahaan']),
        '{{whatsapp}}' => $get(['whatsapp', 'contact_whatsapp', 'phone']),
        '{{kategori}}' => $get(['category', 'contact_category', 'kategori']),
        '{{segment}}' => $get(['segment', 'contact_segment'])
    ];

    return str_replace(array_keys($map), array_values($map), (string)$text);
}

function marketing_paginate($defaultLimit = 20)
{
    $page = max(1, marketing_int(marketing_val('page', 1), 1));
    $limit = marketing_int(marketing_val('limit', $defaultLimit), $defaultLimit);
    $limit = max(1, min(100, $limit));
    $sort = (string)marketing_val('sort', 'created_at');
    if (!preg_match('/^[A-Za-z_][A-Za-z0-9_.]*$/', $sort)) {
        $sort = 'created_at';
    }
    $dir = strtolower(trim((string)marketing_val('dir', 'desc')));
    $dir = in_array($dir, ['asc', 'desc'], true) ? $dir : 'desc';

    return [
        'page' => $page,
        'limit' => $limit,
        'offset' => ($page - 1) * $limit,
        'sort' => $sort,
        'dir' => $dir
    ];
}

function marketing_setting_defaults()
{
    return [
        'email_provider' => 'gmail',
        'smtp_host' => 'smtp.gmail.com',
        'smtp_port' => '465',
        'smtp_encryption' => 'ssl',
        'smtp_auth' => '1',
        'smtp_user' => 'crop.indonesia@gmail.com',
        'smtp_from_name' => 'CROP Marketing',
        'smtp_from_email' => 'crop.indonesia@gmail.com',
        'smtp_pass' => '',
        'gmail_client_id' => '',
        'gmail_client_secret' => '',
        'gmail_refresh_token' => '',
        'gmail_user' => 'crop.indonesia@gmail.com',
        'sendgrid_api_key' => '',
        'brevo_api_key' => '',
        'aws_access_key_id' => '',
        'aws_secret_access_key' => '',
        'aws_region' => '',
        'whatsapp_waba_id' => '',
        'whatsapp_phone_number_id' => '',
        'whatsapp_phone_id' => '',
        'whatsapp_access_token' => '',
        'whatsapp_token' => '',
        'whatsapp_app_secret' => '',
        'whatsapp_verify_token' => '',
        'whatsapp_api_version' => 'v21.0',
        'marketing_tracking_base_url' => '',
        'MARKETING_TRACKING_BASE_URL' => ''
    ];
}

function marketing_setting_env_map()
{
    return [
        'email_provider' => 'EMAIL_PROVIDER',
        'smtp_host' => 'SMTP_HOST',
        'smtp_port' => 'SMTP_PORT',
        'smtp_encryption' => 'SMTP_ENCRYPTION',
        'smtp_auth' => 'SMTP_AUTH',
        'smtp_user' => 'SMTP_USER',
        'smtp_pass' => 'SMTP_PASS',
        'gmail_client_id' => 'GMAIL_CLIENT_ID',
        'gmail_client_secret' => 'GMAIL_CLIENT_SECRET',
        'gmail_refresh_token' => 'GMAIL_REFRESH_TOKEN',
        'gmail_user' => 'GMAIL_USER',
        'smtp_from_name' => 'SMTP_FROM_NAME',
        'smtp_from_email' => 'SMTP_FROM_EMAIL',
        'sendgrid_api_key' => ['SENDGRID_API_KEY', 'SENDGRID_KEY'],
        'brevo_api_key' => ['BREVO_API_KEY', 'BREVO_KEY'],
        'aws_access_key_id' => 'AWS_ACCESS_KEY_ID',
        'aws_secret_access_key' => 'AWS_SECRET_ACCESS_KEY',
        'aws_region' => 'AWS_REGION',
        'whatsapp_waba_id' => 'WHATSAPP_WABA_ID',
        'whatsapp_phone_number_id' => 'WHATSAPP_PHONE_NUMBER_ID',
        'whatsapp_phone_id' => 'WHATSAPP_PHONE_ID',
        'whatsapp_access_token' => 'WHATSAPP_ACCESS_TOKEN',
        'whatsapp_token' => 'WHATSAPP_TOKEN',
        'whatsapp_app_secret' => 'WHATSAPP_APP_SECRET',
        'whatsapp_verify_token' => 'WHATSAPP_VERIFY_TOKEN',
        'whatsapp_api_version' => 'WHATSAPP_API_VERSION',
        'marketing_tracking_base_url' => 'MARKETING_TRACKING_BASE_URL',
        'MARKETING_TRACKING_BASE_URL' => 'MARKETING_TRACKING_BASE_URL'
    ];
}

function marketing_env_value($key, $default = '')
{
    $value = getenv($key);
    if ($value === false || trim((string)$value) === '') {
        return $default;
    }
    return (string)$value;
}

function marketing_setting_effective($key, $default = '')
{
    $stored = marketing_setting_get($key, '');
    if ((string)$stored !== '') {
        return (string)$stored;
    }
    $map = marketing_setting_env_map();
    if (isset($map[$key])) {
        foreach ((array)$map[$key] as $envKey) {
            $env = marketing_env_value($envKey, '');
            if ($env !== '') {
                return $env;
            }
        }
    }
    $defaults = marketing_setting_defaults();
    if (array_key_exists($key, $defaults)) {
        return (string)$defaults[$key];
    }
    return (string)$default;
}

function marketing_smtp_defaults()
{
    $defaults = marketing_setting_defaults();
    return [
        'host' => $defaults['smtp_host'],
        'port' => $defaults['smtp_port'],
        'encryption' => $defaults['smtp_encryption'],
        'auth' => $defaults['smtp_auth'],
        'user' => $defaults['smtp_user'],
        'from_name' => $defaults['smtp_from_name'],
        'from_email' => $defaults['smtp_from_email']
    ];
}
