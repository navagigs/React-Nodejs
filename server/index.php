<?php
// =========================================================================
// BACKEND PHP - PORT LANGSUNG DARI index.js (Express -> PHP Native)
// Struktur, endpoint, dan response SAMA PERSIS dengan versi Node.js
// =========================================================================

// --- 1. KONFIGURASI CORS / BODY PARSER (app.use(cors()), express.json(), bodyParser.urlencoded) ---
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

if ((isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// --- KONFIGURASI UTAMA (PORT = 5001, JWT_SECRET, uploads) ---
$configFile = __DIR__ . '/config.php';
$httpHost = isset($_SERVER['HTTP_HOST']) ? strtolower($_SERVER['HTTP_HOST']) : '';
$isLocal = $httpHost === 'localhost' || strpos($httpHost, 'localhost:') === 0 || $httpHost === '127.0.0.1' || strpos($httpHost, '127.0.0.1:') === 0 || $httpHost === '::1';
if ((!$isLocal || getenv('APP_ENV') === 'production') && file_exists($configFile)) {
    require $configFile;
}

function cfg($key, $default = '')
{
    if (defined($key)) {
        return constant($key);
    }
    $value = getenv($key);
    return ($value === false || $value === '') ? $default : $value;
}

if (!defined('PORT')) define('PORT', 5001);
if (!defined('JWT_SECRET')) define('JWT_SECRET', cfg('JWT_SECRET', 'rahasia_kita_123'));
if (!defined('UPLOAD_DIR')) define('UPLOAD_DIR', __DIR__ . '/uploads');

if (!is_dir(UPLOAD_DIR)) {
    mkdir(UPLOAD_DIR, 0777, true);
}

function json_response($data, $status = 200)
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_db_error($e)
{
    json_response((object)[], 500);
}

function db_rollback_quiet()
{
    global $db;
    try {
        $db->rollback();
    } catch (Exception $ignore) {
    }
}

// --- 2. KONFIGURASI UPLOAD (multer.diskStorage: timestamp + ekstensi asli) ---
function parse_multipart_raw($contentType)
{
    $raw = file_get_contents('php://input');
    if (!preg_match('/boundary=(?:"([^"]+)"|([^;]+))/i', $contentType, $m)) {
        return [[], []];
    }
    $boundary = ((isset($m[1]) ? $m[1] : '') !== '') ? $m[1] : trim(isset($m[2]) ? $m[2] : '');
    if ($boundary === '') {
        return [[], []];
    }

    $body = [];
    $files = [];
    foreach (explode('--' . $boundary, $raw) as $segment) {
        $segment = ltrim($segment, "\r\n");
        if ($segment === '' || substr($segment, 0, 2) === '--') {
            continue;
        }
        $pos = strpos($segment, "\r\n\r\n");
        if ($pos === false) {
            continue;
        }
        $headers = substr($segment, 0, $pos);
        $content = preg_replace('/\r\n$/', '', substr($segment, $pos + 4));
        if (!preg_match('/name="([^"]*)"/i', $headers, $nm)) {
            continue;
        }
        $name = $nm[1];
        if (preg_match('/filename="([^"]*)"/i', $headers, $fm)) {
            $tmp = tempnam(sys_get_temp_dir(), 'mpt');
            if ($tmp !== false) {
                file_put_contents($tmp, $content);
            }
            $files[$name] = [
                'name' => $fm[1],
                'tmp_name' => $tmp,
                'error' => UPLOAD_ERR_OK,
                'size' => strlen($content)
            ];
        } else {
            $body[$name] = $content;
        }
    }
    return [$body, $files];
}

function request_data()
{
    static $data = null;
    if ($data !== null) {
        return $data;
    }

    $method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';
    $ct = isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : '';
    $body = [];
    $files = [];

    if (stripos($ct, 'application/json') !== false) {
        $parsed = json_decode(file_get_contents('php://input'), true);
        if (is_array($parsed)) {
            $body = $parsed;
        }
    } elseif ($method === 'POST') {
        $body = $_POST;
        $files = $_FILES;
    } elseif (stripos($ct, 'multipart/form-data') !== false) {
        list($body, $files) = parse_multipart_raw($ct);
    } elseif (stripos($ct, 'application/x-www-form-urlencoded') !== false) {
        parse_str(file_get_contents('php://input'), $body);
    } else {
        $raw = file_get_contents('php://input');
        $parsed = json_decode($raw, true);
        if (is_array($parsed)) {
            $body = $parsed;
        } elseif ($raw !== '') {
            parse_str($raw, $body);
        }
    }

    $data = ['body' => $body, 'files' => $files];
    return $data;
}

function body()
{
    return request_data()['body'];
}

function uploaded_files()
{
    return request_data()['files'];
}

function input($key, $default = null)
{
    $b = body();
    return array_key_exists($key, $b) ? $b[$key] : $default;
}

function save_upload($field, $forcedExt = null)
{
    $allFiles = uploaded_files();
    $f = isset($allFiles[$field]) ? $allFiles[$field] : null;
    if (!is_array($f) || empty($f['tmp_name']) || (isset($f['error']) ? $f['error'] : UPLOAD_ERR_OK) === UPLOAD_ERR_NO_FILE) {
        return null;
    }
    $name = isset($f['name']) ? $f['name'] : '';
    $ext = $forcedExt !== null ? $forcedExt : ($name !== '' ? pathinfo($name, PATHINFO_EXTENSION) : '');
    $filename = (string)round(microtime(true) * 1000) . '_' . substr(md5(uniqid('', true)), 0, 8) . ($ext !== '' ? '.' . ltrim($ext, '.') : '');
    $dest = UPLOAD_DIR . '/' . $filename;

    if (is_uploaded_file($f['tmp_name'])) {
        if (!move_uploaded_file($f['tmp_name'], $dest)) {
            return null;
        }
    } elseif (!rename($f['tmp_name'], $dest)) {
        if (!copy($f['tmp_name'], $dest)) {
            return null;
        }
        @unlink($f['tmp_name']);
    }
    @chmod($dest, 0644);
    return $filename;
}

function has_uploaded_file($field)
{
    $allFiles = uploaded_files();
    $f = isset($allFiles[$field]) ? $allFiles[$field] : null;
    return is_array($f) && !empty($f['tmp_name']) && (isset($f['error']) ? $f['error'] : UPLOAD_ERR_OK) !== UPLOAD_ERR_NO_FILE;
}

function remove_requested($field)
{
    $value = input('remove_' . $field);
    return $value !== null && $value !== false && $value !== '' && $value !== '0';
}

function pdf_upload_error($field)
{
    $allFiles = uploaded_files();
    $f = isset($allFiles[$field]) ? $allFiles[$field] : null;
    if (isset($f['error']) && $f['error'] !== UPLOAD_ERR_OK) {
        return 'Gagal mengunggah lampiran PDF';
    }

    $name = isset($f['name']) ? $f['name'] : '';
    if (strtolower(pathinfo($name, PATHINFO_EXTENSION)) !== 'pdf') {
        return 'Lampiran ' . $field . ' harus berformat PDF';
    }

    if (function_exists('finfo_open')) {
        $fi = finfo_open(FILEINFO_MIME_TYPE);
        $mime = $fi !== false ? finfo_file($fi, $f['tmp_name']) : '';
        if ($fi !== false) {
            finfo_close($fi);
        }
        if ($mime !== 'application/pdf' && $mime !== 'application/x-pdf') {
            return 'Lampiran ' . $field . ' bukan file PDF yang valid';
        }
    }
    return null;
}

function upload_pdf($field)
{
    if (!has_uploaded_file($field)) {
        return null;
    }
    $error = pdf_upload_error($field);
    if ($error !== null) {
        json_response(['message' => $error], 400);
    }
    return save_upload($field, 'pdf');
}

function delete_upload($filename)
{
    if (!$filename) {
        return;
    }
    $path = UPLOAD_DIR . '/' . basename($filename);
    if (file_exists($path)) {
        @unlink($path);
    }
}

function js_truthy($v)
{
    if ($v === null || $v === false) {
        return false;
    }
    if (is_string($v)) {
        return $v !== '';
    }
    if (is_numeric($v)) {
        return (float)$v != 0;
    }
    if (is_array($v) || is_object($v)) {
        return count((array)$v) > 0;
    }
    return (bool)$v;
}

function js_or($v, $default)
{
    return js_truthy($v) ? $v : $default;
}

function parse_flag($v, $default = 1)
{
    if ($v === null) {
        return $default;
    }
    return ($v === 1 || $v === '1' || $v === true) ? 1 : 0;
}

function parse_int_strict($v)
{
    if (is_int($v)) {
        return $v;
    }
    if (is_string($v) && preg_match('/^\s*([+-]?\d+)/', $v, $m)) {
        return (int)$m[1];
    }
    if (is_float($v)) {
        return (int)$v;
    }
    return null;
}

function is_root_pid($p)
{
    return $p === null || $p === '' || $p === 0 || $p === '0' || $p === 1 || $p === '1';
}

function b64url($data)
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function jwt_sign($payload)
{
    $header = b64url(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload['iat'] = time();
    $payload['exp'] = time() + 86400;
    $encoded = b64url(json_encode($payload));
    $signature = b64url(hash_hmac('sha256', $header . '.' . $encoded, JWT_SECRET, true));
    return $header . '.' . $encoded . '.' . $signature;
}

// --- KONFIGURASI DATABASE (mysql2.createConnection -> mysqli) ---
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
$db = null;
$dbConnectError = null;
try {
    $db = mysqli_init();
    mysqli_options($db, MYSQLI_OPT_INT_AND_FLOAT_NATIVE, true);
    mysqli_real_connect($db, cfg('DB_HOST', 'localhost'), cfg('DB_USER', 'root'), cfg('DB_PASS', ''), cfg('DB_NAME', 'admin_react'));
    mysqli_set_charset($db, 'utf8mb4');
    error_log("✅ Database Terhubung!");
} catch (Exception $e) {
    $dbConnectError = $e;
    error_log("❌ Database Error: " . $e->getMessage());
}

function db_has_column($table, $column)
{
    global $db;
    $stmt = $db->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?");
    $stmt->bind_param('ss', $table, $column);
    $stmt->execute();
    $count = 0;
    $stmt->bind_result($count);
    $stmt->fetch();
    $stmt->close();
    return $count > 0;
}

function db_add_column_if_missing($table, $column, $definition)
{
    global $db;
    if ($db !== null && !db_has_column($table, $column)) {
        $db->query("ALTER TABLE `" . $table . "` ADD COLUMN `" . $column . "` " . $definition);
    }
}

db_add_column_if_missing('project_documents', 'bapp_attachment', 'TEXT NULL');
db_add_column_if_missing('users', 'phone', 'VARCHAR(50) NULL');
db_add_column_if_missing('users', 'gender', 'VARCHAR(20) NULL');
db_add_column_if_missing('users', 'is_active', 'TINYINT(1) NOT NULL DEFAULT 1');
db_add_column_if_missing('users', 'face_descriptor', 'LONGTEXT NULL');

if ($db !== null) {
    $db->query("CREATE TABLE IF NOT EXISTS app_settings (
        id INT NOT NULL PRIMARY KEY,
        site_title VARCHAR(150) NOT NULL DEFAULT 'Admin Panel',
        site_description VARCHAR(500) NOT NULL DEFAULT '',
        logo VARCHAR(255) DEFAULT NULL,
        digital_signature VARCHAR(255) DEFAULT NULL,
        meta_title VARCHAR(255) DEFAULT NULL,
        meta_description VARCHAR(500) DEFAULT NULL,
        meta_keywords VARCHAR(500) DEFAULT NULL,
        updated_at DATETIME DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
    $db->query("INSERT IGNORE INTO app_settings (id, site_title, site_description, logo, meta_title, meta_description, meta_keywords)
        VALUES (1, 'Admin Panel', 'StrikingDash React Web Application', '', 'Admin Panel', 'StrikingDash React Web Application', 'admin, dashboard, react')");
    ensure_activity_logs_table();

    $db->query("CREATE TABLE IF NOT EXISTS qr_codes (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(150) NOT NULL,
        qr_text TEXT NOT NULL,
        image VARCHAR(255) DEFAULT NULL,
        size INT NOT NULL DEFAULT 320,
        level VARCHAR(1) NOT NULL DEFAULT 'M',
        created_by INT DEFAULT NULL,
        updated_by INT DEFAULT NULL,
        created_at DATETIME DEFAULT NULL,
        updated_at DATETIME DEFAULT NULL,
        deleted_at DATETIME DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");

    $db->query("CREATE TABLE IF NOT EXISTS qr_code_histories (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        qr_code_id INT NOT NULL,
        action VARCHAR(20) NOT NULL,
        title VARCHAR(150) NOT NULL,
        qr_text TEXT NOT NULL,
        image VARCHAR(255) DEFAULT NULL,
        size INT NOT NULL,
        level VARCHAR(1) NOT NULL,
        changed_by INT DEFAULT NULL,
        changed_at DATETIME NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");

    $qrMenuCheck = $db->query("SELECT 1 FROM menu WHERE url = 'qr-code' LIMIT 1");
    if ($qrMenuCheck && $qrMenuCheck->num_rows === 0) {
        $db->query("INSERT INTO menu (parent_id, title, url, description, menu_order, type, is_view, is_create, is_edit, is_delete, is_export, is_duplicate, is_unlock, is_active, class_active, icon)
            VALUES (1, 'QR Code', 'qr-code', 'Generate QR code dengan logo opsional', 160, 'menu', 1, 0, 0, 0, 0, 0, 0, 1, '', 'QrCode')");
    }
    $db->query("INSERT IGNORE INTO module_authority (role_id, menu_id, is_view, is_create, is_edit, is_delete, is_export, is_duplicate, is_unlock)
        SELECT r.role_id, m.menu_id, 1, 0, 0, 0, 0, 0, 0
        FROM roles r
        INNER JOIN menu m ON m.url = 'qr-code'");

    $pdfMenuCheck = $db->query("SELECT 1 FROM menu WHERE url = 'pdf-tools' LIMIT 1");
    if ($pdfMenuCheck && $pdfMenuCheck->num_rows === 0) {
        $db->query("INSERT INTO menu (parent_id, title, url, description, menu_order, type, is_view, is_create, is_edit, is_delete, is_export, is_duplicate, is_unlock, is_active, class_active, icon)
            VALUES (1, 'Tools PDF', 'pdf-tools', 'Gabung, potong halaman, edit konten, dan tambah TTD PDF', 170, 'menu', 1, 0, 0, 0, 0, 0, 0, 1, '', 'FileStack')");
    }
    $db->query("UPDATE menu SET title = 'Tools PDF', description = 'Gabung, potong halaman, edit konten, dan tambah TTD PDF' WHERE url = 'pdf-tools'");
    $db->query("INSERT IGNORE INTO module_authority (role_id, menu_id, is_view, is_create, is_edit, is_delete, is_export, is_duplicate, is_unlock)
        SELECT r.role_id, m.menu_id, 1, 0, 0, 0, 0, 0, 0
        FROM roles r
        INNER JOIN menu m ON m.url = 'pdf-tools'");

    $aiMenuCheck = $db->query("SELECT 1 FROM menu WHERE url = 'ai-photo-filter' LIMIT 1");
    if ($aiMenuCheck && $aiMenuCheck->num_rows === 0) {
        $db->query("INSERT INTO menu (parent_id, title, url, description, menu_order, type, is_view, is_create, is_edit, is_delete, is_export, is_duplicate, is_unlock, is_active, class_active, icon)
            VALUES (1, 'AI Photo Filter', 'ai-photo-filter', 'Filter foto massal mirip foto referensi sepenuhnya di browser', 180, 'menu', 1, 0, 0, 0, 0, 0, 0, 1, '', 'Images')");
    }
    $db->query("UPDATE menu SET title = 'AI Photo Filter', description = 'Filter foto massal mirip foto referensi sepenuhnya di browser' WHERE url = 'ai-photo-filter'");
    $db->query("INSERT IGNORE INTO module_authority (role_id, menu_id, is_view, is_create, is_edit, is_delete, is_export, is_duplicate, is_unlock)
        SELECT r.role_id, m.menu_id, 1, 0, 0, 0, 0, 0, 0
        FROM roles r
        INNER JOIN menu m ON m.url = 'ai-photo-filter'");

    db_add_column_if_missing('app_settings', 'digital_signature', 'VARCHAR(255) DEFAULT NULL');
    db_add_column_if_missing('letters', 'signature_mode', "VARCHAR(20) DEFAULT 'MANUAL'");
    db_add_column_if_missing('letters', 'verify_token', 'VARCHAR(64) DEFAULT NULL');
    $db->query("UPDATE letters SET verify_token = MD5(CONCAT(id, '-', letter_number, '-', UNIX_TIMESTAMP(), '-', RAND())) WHERE verify_token IS NULL OR verify_token = ''");
}

function generate_verify_token()
{
    return md5(uniqid(mt_rand(), true));
}

function resolved_verify_token($current = '')
{
    $token = trim((string) input('verify_token', $current));
    return $token !== '' ? $token : generate_verify_token();
}

function normalized_signature_mode($default = 'MANUAL')
{
    $mode = strtoupper(trim((string) input('signature_mode', $default)));
    return in_array($mode, ['MANUAL', 'DIGITAL', 'QRCODE'], true) ? $mode : 'MANUAL';
}

function db_params_sql($sql, $params)
{
    $hasNull = false;
    foreach ($params as $p) {
        if ($p === null) {
            $hasNull = true;
            break;
        }
    }
    if (!$hasNull) {
        return [$sql, $params];
    }

    $out = '';
    $len = strlen($sql);
    $idx = 0;
    $bound = [];
    for ($i = 0; $i < $len; $i++) {
        if ($sql[$i] !== '?') {
            $out .= $sql[$i];
            continue;
        }
        $p = isset($params[$idx]) ? $params[$idx] : null;
        $idx++;
        if ($p === null) {
            $out .= 'NULL';
        } else {
            $out .= '?';
            $bound[] = $p;
        }
    }
    return [$out, $bound];
}

function db_all($sql, $params = [])
{
    global $db;
    list($sql, $params) = db_params_sql($sql, $params);
    $stmt = $db->prepare($sql);
    if ($params) {
        $stmt->bind_param(str_repeat('s', count($params)), ...$params);
    }
    $stmt->execute();
    $res = $stmt->get_result();
    $rows = [];
    while ($row = $res->fetch_assoc()) {
        $rows[] = $row;
    }
    $stmt->close();
    return $rows;
}

function db_one($sql, $params = [])
{
    $rows = db_all($sql, $params);
    return isset($rows[0]) ? $rows[0] : null;
}

function db_run($sql, $params = [])
{
    global $db;
    list($sql, $params) = db_params_sql($sql, $params);
    $stmt = $db->prepare($sql);
    if ($params) {
        $stmt->bind_param(str_repeat('s', count($params)), ...$params);
    }
    $stmt->execute();
    $result = [
        'insertId' => $db->insert_id,
        'affectedRows' => $stmt->affected_rows
    ];
    $stmt->close();
    return $result;
}

function qr_history($qrId, $action, $row, $changedBy = null)
{
    db_run("INSERT INTO qr_code_histories
        (qr_code_id, action, title, qr_text, image, size, level, changed_by, changed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [
        $qrId,
        $action,
        isset($row['title']) ? $row['title'] : '',
        isset($row['qr_text']) ? $row['qr_text'] : '',
        isset($row['image']) ? $row['image'] : null,
        isset($row['size']) ? $row['size'] : 320,
        isset($row['level']) ? $row['level'] : 'M',
        $changedBy,
        date('Y-m-d H:i:s')
    ]);
}

function db_sql_value($v)
{
    global $db;
    if ($v === null) {
        return 'NULL';
    }
    return "'" . $db->real_escape_string((string)$v) . "'";
}

function db_bulk($sqlPrefix, $rows)
{
    global $db;
    $tuples = [];
    foreach ($rows as $row) {
        $tuples[] = '(' . implode(',', array_map('db_sql_value', $row)) . ')';
    }
    $db->query($sqlPrefix . implode(',', $tuples));
    return $db->affected_rows;
}

function db_begin()
{
    global $db;
    $db->begin_transaction();
}

function db_commit()
{
    global $db;
    $db->commit();
}

function is_dup_error($e)
{
    return (int)$e->getCode() === 1062;
}

function is_fk_error($e)
{
    return in_array((int)$e->getCode(), [1452, 1216], true);
}

function backup_iso_datetime($value)
{
    if ($value === null || $value === '') {
        return null;
    }
    $timestamp = strtotime((string)$value);
    if ($timestamp === false) {
        return null;
    }
    return date('c', $timestamp);
}

function backup_quote_identifier($name)
{
    return '`' . str_replace('`', '``', (string)$name) . '`';
}

function backup_sql_literal($value)
{
    global $db;
    if ($value === null) {
        return 'NULL';
    }
    if (is_bool($value)) {
        return $value ? '1' : '0';
    }
    if (is_int($value) || is_float($value)) {
        return (string)$value;
    }
    return "'" . $db->real_escape_string((string)$value) . "'";
}

function ensure_activity_logs_table()
{
    global $db;
    $db->query("CREATE TABLE IF NOT EXISTS activity_logs (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        user_name VARCHAR(150) NOT NULL DEFAULT 'Unknown',
        role_id INT NULL,
        action VARCHAR(50) NOT NULL,
        module VARCHAR(100) NOT NULL,
        description TEXT NULL,
        created_at DATETIME NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}

function ensure_backups_table()
{
    global $db;
    $db->query("CREATE TABLE IF NOT EXISTS backups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255),
        original_name VARCHAR(255),
        size INT DEFAULT 0,
        tables_count INT DEFAULT 0,
        note VARCHAR(255) DEFAULT NULL,
        created_by VARCHAR(150) DEFAULT NULL,
        created_at DATETIME
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}

function backup_file_path($row)
{
    $filename = isset($row['filename']) ? (string)$row['filename'] : '';
    return __DIR__ . '/backups/' . basename($filename);
}

function backup_generate_sql(&$tablesCount)
{
    global $db;
    $lines = [];
    $lines[] = '-- MySQL dump';
    $lines[] = '-- Database: ' . cfg('DB_NAME', 'admin_react');
    $lines[] = '-- Generated: ' . date('Y-m-d H:i:s');
    $lines[] = '';
    $lines[] = 'SET FOREIGN_KEY_CHECKS = 0;';
    $lines[] = '';

    $tableResult = $db->query('SHOW TABLES');
    $tables = [];
    while ($tableRow = $tableResult->fetch_row()) {
        if ($tableRow[0] !== 'backups' && $tableRow[0] !== 'activity_logs') {
            $tables[] = $tableRow[0];
        }
    }

    foreach ($tables as $table) {
        $quotedTable = backup_quote_identifier($table);
        $createResult = $db->query('SHOW CREATE TABLE ' . $quotedTable);
        $createRow = $createResult->fetch_assoc();
        $createSql = '';
        if (isset($createRow['Create Table'])) {
            $createSql = $createRow['Create Table'];
        } elseif (isset($createRow['Create View'])) {
            $createSql = $createRow['Create View'];
        }
        $lines[] = '-- Table structure for table ' . $table;
        $lines[] = 'DROP TABLE IF EXISTS ' . $quotedTable . ';';
        $lines[] = rtrim(trim((string)$createSql), "; \t\n\r\0\x0B") . ';';
        $lines[] = '';

        $dataResult = $db->query('SELECT * FROM ' . $quotedTable);
        $fields = $dataResult->fetch_fields();
        $columns = [];
        foreach ($fields as $field) {
            $columns[] = backup_quote_identifier($field->name);
        }
        $insertRows = [];
        while ($dataRow = $dataResult->fetch_row()) {
            $values = [];
            foreach ($dataRow as $value) {
                $values[] = backup_sql_literal($value);
            }
            $insertRows[] = '(' . implode(',', $values) . ')';
        }
        if ($insertRows) {
            $lines[] = 'INSERT INTO ' . $quotedTable . ' (' . implode(',', $columns) . ') VALUES';
            $lines[] = implode(",\n", $insertRows) . ';';
            $lines[] = '';
        }
    }

    $lines[] = 'SET FOREIGN_KEY_CHECKS = 1;';
    $lines[] = '';
    $tablesCount = count($tables);
    return implode("\n", $lines);
}

function num_cmp($a, $b)
{
    $a = (float)$a;
    $b = (float)$b;
    if ($a == $b) {
        return 0;
    }
    return ($a < $b) ? -1 : 1;
}

function sort_tree_recursive(&$nodes)
{
    usort($nodes, function ($a, $b) {
        return num_cmp(isset($a->menu_order) ? $a->menu_order : 0, isset($b->menu_order) ? $b->menu_order : 0);
    });
    foreach ($nodes as $node) {
        if (isset($node->subs) && count($node->subs) > 0) {
            sort_tree_recursive($node->subs);
        }
    }
}

function build_menu_tree($rows, $parentId)
{
    $currentLevel = [];
    foreach ($rows as $item) {
        $o = (object)$item;
        if ($o->menu_id === 1) {
            continue;
        }
        if ($o->parent_id === $parentId) {
            $o->subs = build_menu_tree($rows, $o->menu_id);
            $currentLevel[] = $o;
        }
    }
    usort($currentLevel, function ($a, $b) {
        return num_cmp($a->menu_order, $b->menu_order);
    });
    return $currentLevel;
}

require __DIR__ . '/marketing/helpers.php';
require __DIR__ . '/marketing/schema.php';
require __DIR__ . '/marketing/queue.php';
if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    require __DIR__ . '/vendor/autoload.php';
}
require __DIR__ . '/marketing/integrations.php';
require __DIR__ . '/marketing/api.php';
require __DIR__ . '/finance/helpers.php';
require __DIR__ . '/finance/schema.php';
require __DIR__ . '/finance/api_extended.php';
require __DIR__ . '/finance/api.php';
if ($db !== null) {
    marketing_schema_install($db);
    finance_schema_install($db);
}

// --- ROUTING (express: app.get / app.post / app.put / app.delete) ---
$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';
$uri = parse_url(isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '/', PHP_URL_PATH) ?: '/';
$scriptName = isset($_SERVER['SCRIPT_NAME']) ? $_SERVER['SCRIPT_NAME'] : '';
$scriptFile = isset($_SERVER['SCRIPT_FILENAME']) ? str_replace('\\', '/', $_SERVER['SCRIPT_FILENAME']) : '';
$documentRoot = isset($_SERVER['DOCUMENT_ROOT']) ? rtrim(str_replace('\\', '/', $_SERVER['DOCUMENT_ROOT']), '/') : '';
$basePath = '';
if ($scriptFile !== '' && $documentRoot !== '' && strpos($scriptFile, $documentRoot . '/') === 0) {
    $basePath = dirname(substr($scriptFile, strlen($documentRoot) + 1));
    if ($basePath === '.' || $basePath === '/') {
        $basePath = '';
    }
} elseif ($scriptName !== '') {
    $basePath = rtrim(str_replace('\\', '/', dirname($scriptName)), '/');
}
if ($basePath !== '' && strpos($uri, $basePath) === 0) {
    $uri = substr($uri, strlen($basePath));
}
$uri = '/' . ltrim($uri, '/');
if (strpos($uri, '/api/') !== 0 && strpos($uri, '/uploads/') !== 0) {
    $uri = '/api' . $uri;
}

if (marketing_api_dispatch($method, $uri)) {
    exit;
}

if (finance_api_dispatch($method, $uri)) {
    exit;
}

// --- API LOGIN ---
if ($method === 'POST' && $uri === '/api/login') {
    $email = input('email');
    $password = input('password');
    error_log("Login Request dari: " . $email);

    if (!js_truthy($email) || !js_truthy($password)) {
        json_response(['message' => 'Email dan password wajib diisi'], 400);
    }

    try {
        $user = db_one('SELECT * FROM users WHERE email = ?', [$email]);
    } catch (Exception $e) {
        error_log("Login Database Error: " . $e->getMessage());
        json_response(['message' => 'Terjadi kesalahan pada server', 'details' => $e->getMessage()], 500);
    }

    if (!$user) {
        json_response(['message' => 'Email atau password salah'], 401);
    }

    try {
        $isMatch = password_verify((string)$password, (string)$user['password']);
    } catch (Exception $e) {
        error_log("Bcrypt Compare Error: " . $e->getMessage());
        json_response(['message' => 'Gagal memproses verifikasi keamanan'], 500);
    }
    if (!$isMatch) {
        json_response(['message' => 'Email atau password salah'], 401);
    }

    if (isset($user['is_active']) && (int)$user['is_active'] !== 1) {
        json_response(['message' => 'Akun tidak aktif'], 403);
    }

    try {
        $permissions = db_all("
            SELECT menu_id, is_view, is_create, is_edit, is_delete, is_export, is_duplicate, is_unlock
            FROM module_authority
            WHERE role_id = ? AND is_view = 1
        ", [$user['role_id']]);
    } catch (Exception $e) {
        error_log("Fetch Permissions Error: " . $e->getMessage());
        json_response(['message' => 'Gagal mengambil data hak akses', 'details' => $e->getMessage()], 500);
    }

    $token = jwt_sign(['id' => $user['id'], 'email' => $user['email'], 'role_id' => $user['role_id']]);
    json_response([
        'message' => 'Login berhasil!',
        'token' => $token,
        'role_id' => $user['role_id'],
        'permissions' => $permissions,
        'user' => [
            'id' => $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'role_id' => $user['role_id']
        ]
    ]);
}

// --- API FACE LOGIN ---
if ($method === 'POST' && $uri === '/api/face-login') {
    $descriptor = input('descriptor');
    if (!is_array($descriptor) || count($descriptor) < 64) {
        json_response(['message' => 'Data wajah tidak valid'], 400);
    }

    try {
        $users = db_all("SELECT * FROM users WHERE face_descriptor IS NOT NULL AND face_descriptor <> ''");
    } catch (Exception $e) {
        json_response(['message' => 'Terjadi kesalahan pada server', 'details' => $e->getMessage()], 500);
    }

    $bestUser = null;
    $bestDistance = 0.6;
    foreach ($users as $candidate) {
        $stored = json_decode((string)$candidate['face_descriptor'], true);
        if (!is_array($stored) || count($stored) !== count($descriptor)) {
            continue;
        }
        $sum = 0.0;
        for ($i = 0; $i < count($descriptor); $i++) {
            $diff = (float)$descriptor[$i] - (float)$stored[$i];
            $sum += $diff * $diff;
        }
        $distance = sqrt($sum);
        if ($distance < $bestDistance) {
            $bestDistance = $distance;
            $bestUser = $candidate;
        }
    }

    if (!$bestUser) {
        json_response(['message' => 'Wajah tidak dikenali'], 401);
    }

    if (isset($bestUser['is_active']) && (int)$bestUser['is_active'] !== 1) {
        json_response(['message' => 'Akun tidak aktif'], 403);
    }

    $user = $bestUser;
    try {
        $permissions = db_all("
            SELECT menu_id, is_view, is_create, is_edit, is_delete, is_export, is_duplicate, is_unlock
            FROM module_authority
            WHERE role_id = ? AND is_view = 1
        ", [$user['role_id']]);
    } catch (Exception $e) {
        json_response(['message' => 'Gagal mengambil data hak akses', 'details' => $e->getMessage()], 500);
    }

    $token = jwt_sign(['id' => $user['id'], 'email' => $user['email'], 'role_id' => $user['role_id']]);
    json_response([
        'message' => 'Login wajah berhasil!',
        'token' => $token,
        'role_id' => $user['role_id'],
        'permissions' => $permissions,
        'user' => [
            'id' => $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'role_id' => $user['role_id']
        ]
    ]);
}

// --- API SIMPAN DATA WAJAH USER ---
if ($method === 'POST' && preg_match('#^/api/users/([^/]+)/face$#', $uri, $mm)) {
    $userId = $mm[1];
    $descriptor = input('descriptor');
    if (!is_array($descriptor) || count($descriptor) < 64) {
        json_response(['message' => 'Data wajah tidak valid'], 400);
    }

    try {
        $user = db_one('SELECT id FROM users WHERE id = ?', [$userId]);
    } catch (Exception $e) {
        json_response(['message' => 'Terjadi kesalahan pada server', 'details' => $e->getMessage()], 500);
    }
    if (!$user) {
        json_response(['message' => 'User tidak ditemukan'], 404);
    }

    try {
        db_run('UPDATE users SET face_descriptor = ? WHERE id = ?', [json_encode($descriptor), $userId]);
    } catch (Exception $e) {
        json_response(['message' => 'Gagal menyimpan data wajah', 'details' => $e->getMessage()], 500);
    }
    json_response(['message' => 'Data wajah berhasil disimpan']);
}

// --- API HAPUS DATA WAJAH USER ---
if ($method === 'DELETE' && preg_match('#^/api/users/([^/]+)/face$#', $uri, $mm)) {
    $userId = $mm[1];
    try {
        db_run('UPDATE users SET face_descriptor = NULL WHERE id = ?', [$userId]);
    } catch (Exception $e) {
        json_response(['message' => 'Gagal menghapus data wajah', 'details' => $e->getMessage()], 500);
    }
    json_response(['message' => 'Data wajah berhasil dihapus']);
}

if ($method === 'GET' && preg_match('#^/api/menus/access/([^/]+)$#', $uri, $mm)) {
    $roleId = $mm[1];
    if (!$roleId) {
        json_response(['message' => 'Role ID tidak ditemukan'], 400);
    }

    $sql = "
        SELECT m.* FROM menu m
        INNER JOIN module_authority ma ON m.menu_id = ma.menu_id
        WHERE ma.role_id = ? AND ma.is_view = 1 AND m.is_active = 1
        ORDER BY m.menu_order ASC
    ";
    try {
        $result = db_all($sql, [$roleId]);
    } catch (Exception $e) {
        json_response(['error' => $e->getMessage()], 500);
    }

    $menuMap = [];
    $menuTree = [];
    foreach ($result as $item) {
        $o = (object)$item;
        $o->subs = [];
        $menuMap[(string)$o->menu_id] = $o;
    }
    foreach ($result as $item) {
        $o = (object)$item;
        $currentItemInMap = $menuMap[(string)$o->menu_id];
        $pId = $o->parent_id;

        if (is_root_pid($pId)) {
            $menuTree[] = $currentItemInMap;
        } else {
            $parentItem = isset($menuMap[(string)$pId]) ? $menuMap[(string)$pId] : null;
            if ($parentItem) {
                $parentItem->subs[] = $currentItemInMap;
            } else {
                $menuTree[] = $currentItemInMap;
            }
        }
    }
    sort_tree_recursive($menuTree);
    json_response($menuTree);
}

// --- API DASHBOARD (GET DATA) ---
if ($method === 'GET' && $uri === '/api/users') {
    try {
        json_response(db_all('SELECT * FROM users'));
    } catch (Exception $e) {
        json_db_error($e);
    }
}

// 1. GET (Ambil Semua Data) - Tetap sama karena menggunakan SELECT *
if ($method === 'GET' && $uri === '/api/portfolio') {
    $sql = "
        SELECT
            p.*,
            c.name AS client_name,
            c.address AS client_location
        FROM portfolio p
        LEFT JOIN client c ON p.client_id = c.id
        ORDER BY p.id DESC
    ";
    try {
        json_response(db_all($sql));
    } catch (Exception $e) {
        error_log("Error fetching portfolio with client relation: " . $e->getMessage());
        json_response(['error' => 'Database error', 'details' => (object)[]], 500);
    }
}

// 2. POST (Tambah Data Baru + Kolom Baru + GAMBAR + LAMPIRAN PDF)
if ($method === 'POST' && $uri === '/api/portfolio') {
    $attachmentFields = ['tor_file', 'surat_pesanan_file', 'ba_nego_file', 'other_file'];
    foreach ($attachmentFields as $field) {
        if (has_uploaded_file($field)) {
            $error = pdf_upload_error($field);
            if ($error !== null) {
                json_response(['message' => $error], 400);
            }
        }
    }

    $imageFilename = save_upload('image');
    $torFilename = upload_pdf('tor_file');
    $suratPesananFilename = upload_pdf('surat_pesanan_file');
    $baNegoFilename = upload_pdf('ba_nego_file');
    $otherFilename = upload_pdf('other_file');

    $sql = "INSERT INTO portfolio (
        title, description, client_id, status, date, image,
        tor_file, surat_pesanan_file, ba_nego_file, other_file,
        portfolio_value, project_name, contract_number,
        contract_year, contract_start_date, contract_end_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    $params = [
        input('title'), input('description'), input('client_id'), js_or(input('status'), 'Pending'),
        input('date'), $imageFilename,
        $torFilename, $suratPesananFilename, $baNegoFilename, $otherFilename,
        input('portfolio_value'), input('project_name'), input('contract_number'),
        input('contract_year'), input('contract_start_date'), input('contract_end_date')
    ];

    try {
        $result = db_run($sql, $params);
    } catch (Exception $e) {
        json_db_error($e);
    }
    json_response(['message' => 'Success', 'id' => $result['insertId']]);
}

// 3. PUT (Update Data + Kolom Baru + GAMBAR/LAMPIRAN PDF OPTIONAL, BISA DIHAPUS)
if ($method === 'PUT' && preg_match('#^/api/portfolio/([^/]+)$#', $uri, $mm)) {
    $id = $mm[1];
    $attachmentFields = ['tor_file', 'surat_pesanan_file', 'ba_nego_file', 'other_file'];

    try {
        $existing = db_one("SELECT image, tor_file, surat_pesanan_file, ba_nego_file, other_file FROM portfolio WHERE id = ?", [$id]);
    } catch (Exception $e) {
        json_db_error($e);
    }
    if (!is_array($existing)) {
        $existing = [];
    }

    foreach ($attachmentFields as $field) {
        if (has_uploaded_file($field)) {
            $error = pdf_upload_error($field);
            if ($error !== null) {
                json_response(['message' => $error], 400);
            }
        }
    }

    $newImage = save_upload('image');
    $newFiles = [
        'tor_file' => upload_pdf('tor_file'),
        'surat_pesanan_file' => upload_pdf('surat_pesanan_file'),
        'ba_nego_file' => upload_pdf('ba_nego_file'),
        'other_file' => upload_pdf('other_file')
    ];

    if ($newImage !== null) {
        $imageFilename = $newImage;
    } elseif (remove_requested('image')) {
        $imageFilename = null;
    } else {
        $imageFilename = isset($existing['image']) ? $existing['image'] : null;
    }

    $fileValues = [];
    foreach ($attachmentFields as $field) {
        $new = isset($newFiles[$field]) ? $newFiles[$field] : null;
        if ($new !== null) {
            $fileValues[$field] = $new;
        } elseif (remove_requested($field)) {
            $fileValues[$field] = null;
        } else {
            $fileValues[$field] = isset($existing[$field]) ? $existing[$field] : null;
        }
    }

    $sql = "UPDATE portfolio SET
        title=?, client_id=?, description=?, status=?, date=?, image=?,
        tor_file=?, surat_pesanan_file=?, ba_nego_file=?, other_file=?,
        portfolio_value=?, project_name=?, contract_number=?,
        contract_year=?, contract_start_date=?, contract_end_date=?
        WHERE id=?";
    $params = [
        input('title'), input('client_id'), input('description'), js_or(input('status'), 'Pending'),
        input('date'), $imageFilename,
        $fileValues['tor_file'], $fileValues['surat_pesanan_file'], $fileValues['ba_nego_file'], $fileValues['other_file'],
        input('portfolio_value'), input('project_name'), input('contract_number'),
        input('contract_year'), input('contract_start_date'), input('contract_end_date'), $id
    ];

    try {
        db_run($sql, $params);
    } catch (Exception $e) {
        json_db_error($e);
    }

    if (($newImage !== null || remove_requested('image')) && !empty($existing['image'])) {
        delete_upload($existing['image']);
    }
    foreach ($attachmentFields as $field) {
        $new = isset($newFiles[$field]) ? $newFiles[$field] : null;
        if (($new !== null || remove_requested($field)) && !empty($existing[$field])) {
            delete_upload($existing[$field]);
        }
    }

    json_response(['message' => 'Updated Successfully']);
}

// 4. DELETE (Hapus Data & File Fisik)
if ($method === 'DELETE' && preg_match('#^/api/portfolio/([^/]+)$#', $uri, $mm)) {
    try {
        $row = db_one("SELECT image, tor_file, surat_pesanan_file, ba_nego_file, other_file FROM portfolio WHERE id = ?", [$mm[1]]);
        $filesToDelete = [];
        if (is_array($row)) {
            foreach (['image', 'tor_file', 'surat_pesanan_file', 'ba_nego_file', 'other_file'] as $field) {
                if (!empty($row[$field])) {
                    $filesToDelete[] = $row[$field];
                }
            }
        }
        db_run("DELETE FROM portfolio WHERE id=?", [$mm[1]]);
        foreach ($filesToDelete as $filename) {
            delete_upload($filename);
        }
    } catch (Exception $e) {
        json_db_error($e);
    }
    json_response(['message' => 'Deleted Successfully']);
}

// 1. GET (Ambil Semua Data Client)
if ($method === 'GET' && $uri === '/api/clients') {
    try {
        json_response(db_all("SELECT * FROM client ORDER BY id DESC"));
    } catch (Exception $e) {
        json_db_error($e);
    }
}

// 2. POST (TAMBAH CLIENT BARU)
if ($method === 'POST' && $uri === '/api/clients') {
    $image = save_upload('image');
    try {
        $result = db_run("INSERT INTO client (name, address, image) VALUES (?, ?, ?)", [
            input('name'), input('address'), $image
        ]);
    } catch (Exception $e) {
        error_log($e->getMessage());
        json_response(['message' => 'Database Error'], 500);
    }
    json_response(['message' => 'Client created', 'id' => $result['insertId']], 201);
}

// 3. PUT (UPDATE CLIENT)
if ($method === 'PUT' && preg_match('#^/api/clients/([^/]+)$#', $uri, $mm)) {
    $id = $mm[1];
    $newImage = save_upload('image');

    if ($newImage) {
        try {
            $old = db_one("SELECT image FROM client WHERE id = ?", [$id]);
            if ($old && $old['image']) {
                delete_upload($old['image']);
            }
        } catch (Exception $ignore) {
        }
        $sql = "UPDATE client SET name=?, address=?, image=? WHERE id=?";
        $params = [input('name'), input('address'), $newImage, $id];
    } else {
        $sql = "UPDATE client SET name=?, address=? WHERE id=?";
        $params = [input('name'), input('address'), $id];
    }

    try {
        db_run($sql, $params);
    } catch (Exception $e) {
        json_db_error($e);
    }
    json_response(['message' => 'Client updated']);
}

// 4. DELETE (HAPUS CLIENT)
if ($method === 'DELETE' && preg_match('#^/api/clients/([^/]+)$#', $uri, $mm)) {
    try {
        $row = db_one("SELECT image FROM client WHERE id = ?", [$mm[1]]);
        if (!$row) {
            json_response(['message' => 'Client not found'], 404);
        }
        $imageFile = $row['image'];
        db_run("DELETE FROM client WHERE id = ?", [$mm[1]]);
        if ($imageFile) {
            delete_upload($imageFile);
        }
    } catch (Exception $e) {
        json_db_error($e);
    }
    json_response(['message' => 'Client deleted successfully']);
}

// ==========================================
// API KATEGORI BERITA
// ==========================================

// GET Categories
if ($method === 'GET' && $uri === '/api/categories') {
    try {
        json_response(db_all("SELECT * FROM categories ORDER BY name ASC"));
    } catch (Exception $e) {
        json_db_error($e);
    }
}

// POST Category
if ($method === 'POST' && $uri === '/api/categories') {
    try {
        $result = db_run("INSERT INTO categories (name) VALUES (?)", [input('name')]);
    } catch (Exception $e) {
        json_db_error($e);
    }
    json_response(['message' => 'Category added', 'id' => $result['insertId']]);
}

// PUT Category
if ($method === 'PUT' && preg_match('#^/api/categories/([^/]+)$#', $uri, $mm)) {
    try {
        db_run("UPDATE categories SET name=? WHERE id=?", [input('name'), $mm[1]]);
    } catch (Exception $e) {
        json_db_error($e);
    }
    json_response(['message' => 'Category updated']);
}

// DELETE Category
if ($method === 'DELETE' && preg_match('#^/api/categories/([^/]+)$#', $uri, $mm)) {
    try {
        db_run("DELETE FROM categories WHERE id=?", [$mm[1]]);
    } catch (Exception $e) {
        json_db_error($e);
    }
    json_response(['message' => 'Category deleted']);
}

// ==========================================
// API  (article)
// ==========================================

// GET article (Join dengan Category)
if ($method === 'GET' && $uri === '/api/articles') {
    $sql = "
        SELECT articles.*, categories.name as category_name
        FROM articles
        LEFT JOIN categories ON articles.category_id = categories.id
        ORDER BY articles.created_at DESC
    ";
    try {
        json_response(db_all($sql));
    } catch (Exception $e) {
        json_db_error($e);
    }
}

// --- GET ALL ARTICLES ---
if ($method === 'GET' && $uri === '/api/articles') {
    $sql = "
        SELECT articles.*, categories.name AS category_name
        FROM articles
        LEFT JOIN categories ON articles.category_id = categories.id
        ORDER BY articles.created_at DESC
    ";
    try {
        json_response(db_all($sql));
    } catch (Exception $e) {
        json_db_error($e);
    }
}

// --- CREATE ARTICLE ---
if ($method === 'POST' && $uri === '/api/articles') {
    $articleStatus = js_or(input('status'), 'published');
    $image = save_upload('image');
    try {
        $result = db_run(
            "INSERT INTO articles (title, content, category_id, image, status) VALUES (?, ?, ?, ?, ?)",
            [input('title'), input('content'), input('category_id'), $image, $articleStatus]
        );
    } catch (Exception $e) {
        json_db_error($e);
    }
    json_response(['message' => 'Article created successfully', 'id' => $result['insertId']]);
}

// --- UPDATE ARTICLE (Supports PUT / POST Spoofing) ---
if ($method === 'POST' && preg_match('#^/api/articles/([^/]+)$#', $uri, $mm)) {
    $id = $mm[1];
    $newImage = save_upload('image');

    try {
        $row = db_one("SELECT image, status FROM articles WHERE id=?", [$id]);
        if (!$row) {
            json_response(['message' => 'Article not found'], 404);
        }
        $oldImage = $row['image'];
        $articleStatus = js_or(input('status'), js_or(isset($row['status']) ? $row['status'] : null, 'published'));

        if ($newImage) {
            $sql = "UPDATE articles SET title=?, content=?, category_id=?, image=?, status=? WHERE id=?";
            $params = [input('title'), input('content'), input('category_id'), $newImage, $articleStatus, $id];
        } else {
            $sql = "UPDATE articles SET title=?, content=?, category_id=?, status=? WHERE id=?";
            $params = [input('title'), input('content'), input('category_id'), $articleStatus, $id];
        }
        db_run($sql, $params);
        if ($newImage && $oldImage) {
            delete_upload($oldImage);
        }
    } catch (Exception $e) {
        json_db_error($e);
    }
    json_response(['message' => 'Article updated successfully']);
}

// --- DELETE ARTICLE ---
if ($method === 'DELETE' && preg_match('#^/api/articles/([^/]+)$#', $uri, $mm)) {
    try {
        $row = db_one("SELECT image FROM articles WHERE id=?", [$mm[1]]);
        db_run("DELETE FROM articles WHERE id=?", [$mm[1]]);
        if ($row && $row['image']) {
            delete_upload($row['image']);
        }
    } catch (Exception $e) {
        json_db_error($e);
    }
    json_response(['message' => 'Article deleted successfully']);
}

// ==========================================
//          API LOGIC FOR LETTERS (FIXED)
// ==========================================

if ($method === 'GET' && $uri === '/api/letters/verify') {
    $token = trim((string) (isset($_GET['token']) ? $_GET['token'] : input('token')));
    $number = trim((string) (isset($_GET['number']) ? $_GET['number'] : input('number')));
    if ($token === '' && $number === '') {
        json_response(['valid' => false, 'message' => 'Kode verifikasi wajib diisi'], 400);
    }
    $sql = "SELECT l.letter_number, l.letter_type, l.subject, l.letter_date, l.signer_name, l.signer_position, l.signature_mode, c.name AS client_name
        FROM letters l
        LEFT JOIN client c ON l.client_id = c.id
        WHERE ";
    $params = [];
    if ($token !== '') {
        $sql .= "l.verify_token = ?";
        $params[] = $token;
    } else {
        $sql .= "l.letter_number = ?";
        $params[] = $number;
    }
    $sql .= " LIMIT 1";
    try {
        $letter = db_one($sql, $params);
    } catch (Exception $e) {
        json_db_error($e);
    }
    if (!$letter) {
        json_response(['valid' => false, 'message' => 'Surat tidak ditemukan'], 404);
    }
    json_response(['valid' => true, 'letter' => $letter]);
}

// 5. GET: Hitung total surat untuk keperluan No urut otomatis
if ($method === 'GET' && $uri === '/api/letters/next-number') {
    try {
        $result = db_one("SELECT COUNT(*) AS total FROM letters");
        $nextCount = (int)(isset($result['total']) ? $result['total'] : 0) + 1;
    } catch (Exception $e) {
        json_db_error($e);
    }
    json_response(['nextCount' => $nextCount]);
}

// 1. GET (Ambil Semua Data Surat - Diurutkan dari yang terbaru)
if ($method === 'GET' && $uri === '/api/letters') {
    $sql = "
        SELECT letters.*, client.name AS client_name
        FROM letters
        LEFT JOIN client ON letters.client_id = client.id
        ORDER BY letters.id DESC
    ";
    try {
        json_response(db_all($sql));
    } catch (Exception $e) {
        json_db_error($e);
    }
}

// 2. POST (Tambah Surat Baru - Attachment berupa Note/Teks Biasa)
if ($method === 'POST' && $uri === '/api/letters') {
    $sql = "INSERT INTO letters
        (client_id, letter_number, letter_type, subject, letter_location, letter_date, recipient, description, description_closing, signer_name, signer_position, attachment, signature_mode, verify_token)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $params = [
        input('client_id'), input('letter_number'), input('letter_type'), input('subject'),
        input('letter_location'), input('letter_date'), input('recipient'), input('description'),
        input('description_closing'), input('signer_name'), input('signer_position'),
        js_or(input('attachment'), null), normalized_signature_mode(), resolved_verify_token()
    ];
    try {
        $result = db_run($sql, $params);
    } catch (Exception $e) {
        json_db_error($e);
    }
    json_response(['message' => 'Success', 'id' => $result['insertId']]);
}

// 3. PUT (Update Data Surat - Attachment berupa Note/Teks Biasa)
if ($method === 'PUT' && preg_match('#^/api/letters/([^/]+)$#', $uri, $mm)) {
    $existing = db_one("SELECT verify_token FROM letters WHERE id = ?", [$mm[1]]);
    $sql = "UPDATE letters SET
        client_id=?, letter_number=?, letter_type=?, subject=?, letter_location=?,
        letter_date=?, recipient=?, description=?, description_closing=?, signer_name=?,
        signer_position=?, attachment=?, signature_mode=?, verify_token=?
        WHERE id=?";
    $params = [
        input('client_id'), input('letter_number'), input('letter_type'), input('subject'),
        input('letter_location'), input('letter_date'), input('recipient'), input('description'),
        input('description_closing'), input('signer_name'), input('signer_position'),
        js_or(input('attachment'), null), normalized_signature_mode(),
        resolved_verify_token($existing ? $existing['verify_token'] : ''), $mm[1]
    ];
    try {
        db_run($sql, $params);
    } catch (Exception $e) {
        json_db_error($e);
    }
    json_response(['message' => 'Updated Successfully']);
}

// 4. DELETE (Hapus Data Surat)
if ($method === 'DELETE' && preg_match('#^/api/letters/([^/]+)$#', $uri, $mm)) {
    try {
        db_run("DELETE FROM letters WHERE id=?", [$mm[1]]);
    } catch (Exception $e) {
        json_db_error($e);
    }
    json_response(['message' => 'Deleted Successfully']);
}

// =========================================================================
// 1. GET - Mengambil SEMUA Data Surat (GENERAL & INVOICE) beserta Itemnya
// =========================================================================
if ($method === 'GET' && $uri === '/api/letters/invoice') {
    $sqlLetters = "
        SELECT l.*, c.name AS client_name, c.address AS client_address
        FROM letters l
        LEFT JOIN client c ON l.client_id = c.id
        ORDER BY l.id DESC
    ";
    try {
        $letters = db_all($sqlLetters);
        if (count($letters) === 0) {
            json_response([]);
        }
        $items = db_all("SELECT id, letter_id, item_name, amount FROM invoice_items");
    } catch (Exception $e) {
        json_response(['success' => false, 'error' => $e->getMessage()], 500);
    }

    $itemsMap = [];
    foreach ($items as $item) {
        $itemsMap[(string)$item['letter_id']][] = [
            'id' => $item['id'],
            'item_name' => $item['item_name'],
            'amount' => $item['amount']
        ];
    }

    $result = [];
    foreach ($letters as $letter) {
        $type = js_truthy(isset($letter['letter_type']) ? $letter['letter_type'] : null) ? strtoupper((string)$letter['letter_type']) : 'GENERAL';
        $currentInvoiceItems = $type === 'INVOICE' ? (isset($itemsMap[(string)$letter['id']]) ? $itemsMap[(string)$letter['id']] : []) : [];

        $result[] = [
            'id' => $letter['id'],
            'client_id' => $letter['client_id'],
            'client_name' => js_or(isset($letter['client_name']) ? $letter['client_name'] : null, 'Klien Tidak Diketahui'),
            'client_address' => js_or(isset($letter['client_address']) ? $letter['client_address'] : null, 'Di Tempat'),
            'letter_number' => $letter['letter_number'],
            'letter_type' => $type,
            'subject' => js_or(isset($letter['subject']) ? $letter['subject'] : null, ''),
            'letter_location' => js_or(isset($letter['letter_location']) ? $letter['letter_location'] : null, ''),
            'letter_date' => $letter['letter_date'],
            'recipient' => js_or(isset($letter['recipient']) ? $letter['recipient'] : null, ''),
            'description' => js_or(isset($letter['description']) ? $letter['description'] : null, ''),
            'description_closing' => js_or(isset($letter['description_closing']) ? $letter['description_closing'] : null, ''),
            'signer_name' => js_or(isset($letter['signer_name']) ? $letter['signer_name'] : null, ''),
            'signer_position' => js_or(isset($letter['signer_position']) ? $letter['signer_position'] : null, ''),
            'signature_mode' => isset($letter['signature_mode']) && in_array(strtoupper((string)$letter['signature_mode']), ['MANUAL', 'DIGITAL', 'QRCODE'], true) ? strtoupper((string)$letter['signature_mode']) : 'MANUAL',
            'verify_token' => js_or(isset($letter['verify_token']) ? $letter['verify_token'] : null, ''),
            'attachment' => js_or(isset($letter['attachment']) ? $letter['attachment'] : null, ''),
            'first_item_name' => count($currentInvoiceItems) > 0 ? $currentInvoiceItems[0]['item_name'] : '',
            'invoice_items' => $currentInvoiceItems
        ];
    }
    json_response($result);
}

// =========================================================================
// 2. POST - Menyimpan Data Invoice Baru beserta List Item Rinciannya
// =========================================================================
if ($method === 'POST' && $uri === '/api/letters/invoice') {
    $targetType = js_or(input('letter_type'), 'INVOICE');
    $invoiceItems = input('invoice_items');

    try {
        db_begin();
    } catch (Exception $e) {
        json_response(['success' => false, 'error' => $e->getMessage()], 500);
    }

    $sqlLetter = "INSERT INTO letters
        (client_id, letter_number, letter_type, subject, letter_location, letter_date, recipient, description, description_closing, signer_name, signer_position, attachment, signature_mode, verify_token)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    try {
        $result = db_run($sqlLetter, [
            input('client_id'), input('letter_number'), $targetType, input('subject'),
            input('letter_location'), input('letter_date'), input('recipient'), input('description'),
            input('description_closing'), input('signer_name'), input('signer_position'), input('attachment'),
            normalized_signature_mode(), resolved_verify_token()
        ]);
    } catch (Exception $e) {
        db_rollback_quiet();
        json_response(['success' => false, 'error' => 'Gagal simpan letters: ' . $e->getMessage()], 500);
    }

    $letterId = $result['insertId'];

    if (is_array($invoiceItems) && count($invoiceItems) > 0) {
        $values = [];
        foreach ($invoiceItems as $item) {
            if (is_array($item) && js_truthy(isset($item['item_name']) ? $item['item_name'] : null) && trim((string)$item['item_name']) !== '') {
                $values[] = [$letterId, $item['item_name'], (float)js_or(isset($item['amount']) ? $item['amount'] : null, 0)];
            }
        }

        if (count($values) === 0) {
            try {
                db_commit();
            } catch (Exception $e) {
                db_rollback_quiet();
                json_response(['success' => false], 500);
            }
            json_response(['success' => true, 'message' => 'Invoice disimpan tanpa list item.']);
        }

        try {
            db_bulk("INSERT INTO invoice_items (letter_id, item_name, amount) VALUES ", $values);
        } catch (Exception $e) {
            db_rollback_quiet();
            json_response(['success' => false, 'error' => 'Gagal menyimpan list item: ' . $e->getMessage()], 500);
        }

        try {
            db_commit();
        } catch (Exception $e) {
            db_rollback_quiet();
            json_response(['success' => false], 500);
        }
        json_response(['success' => true, 'message' => 'Dokumen Invoice & List Item sukses diarsipkan!']);
    }

    try {
        db_commit();
    } catch (Exception $e) {
        db_rollback_quiet();
        json_response(['success' => false], 500);
    }
    json_response(['success' => true, 'message' => 'Invoice tanpa detail item berhasil disimpan.']);
}

// =========================================================================
// 3. PUT - Memperbarui (Edit) Data Surat / Invoice Terpilih
// =========================================================================
if ($method === 'PUT' && preg_match('#^/api/letters/invoice/([^/]+)$#', $uri, $mm)) {
    $id = $mm[1];
    $targetType = js_or(input('letter_type'), 'INVOICE');
    $invoiceItems = input('invoice_items');
    $existing = db_one("SELECT verify_token FROM letters WHERE id = ?", [$id]);

    try {
        db_begin();
    } catch (Exception $e) {
        json_response(['success' => false, 'error' => $e->getMessage()], 500);
    }

    $sqlUpdateLetter = "UPDATE letters SET
        client_id = ?, letter_number = ?, letter_type = ?, subject = ?, letter_location = ?, letter_date = ?,
        recipient = ?, description = ?, description_closing = ?, signer_name = ?, signer_position = ?, attachment = ?,
        signature_mode = ?, verify_token = ?
        WHERE id = ?";
    try {
        db_run($sqlUpdateLetter, [
            input('client_id'), input('letter_number'), $targetType, input('subject'),
            input('letter_location'), input('letter_date'), input('recipient'), input('description'),
            input('description_closing'), input('signer_name'), input('signer_position'), input('attachment'),
            normalized_signature_mode(), resolved_verify_token($existing ? $existing['verify_token'] : ''), $id
        ]);
    } catch (Exception $e) {
        db_rollback_quiet();
        json_response(['success' => false, 'error' => 'Gagal update letters: ' . $e->getMessage()], 500);
    }

    try {
        db_run("DELETE FROM invoice_items WHERE letter_id = ?", [$id]);
    } catch (Exception $e) {
        db_rollback_quiet();
        json_response(['success' => false, 'error' => 'Gagal membersihkan item lama: ' . $e->getMessage()], 500);
    }

    if ($targetType === 'INVOICE' && is_array($invoiceItems) && count($invoiceItems) > 0) {
        $bulkValues = [];
        foreach ($invoiceItems as $item) {
            if (is_array($item) && js_truthy(isset($item['item_name']) ? $item['item_name'] : null) && trim((string)$item['item_name']) !== '') {
                $bulkValues[] = [$id, $item['item_name'], (float)js_or(isset($item['amount']) ? $item['amount'] : null, 0)];
            }
        }

        if (count($bulkValues) === 0) {
            try {
                db_commit();
            } catch (Exception $e) {
                db_rollback_quiet();
                json_response(['success' => false], 500);
            }
            json_response(['success' => true, 'message' => 'Invoice diperbarui tanpa detail item.']);
        }

        try {
            db_bulk("INSERT INTO invoice_items (letter_id, item_name, amount) VALUES ", $bulkValues);
        } catch (Exception $e) {
            db_rollback_quiet();
            json_response(['success' => false, 'error' => 'Gagal menyimpan item baru: ' . $e->getMessage()], 500);
        }

        try {
            db_commit();
        } catch (Exception $e) {
            db_rollback_quiet();
            json_response(['success' => false], 500);
        }
        json_response(['success' => true, 'message' => 'Data Invoice & Rincian Item sukses diperbarui!']);
    }

    try {
        db_commit();
    } catch (Exception $e) {
        db_rollback_quiet();
        json_response(['success' => false], 500);
    }
    json_response(['success' => true, 'message' => 'Data Surat berhasil diperbarui!']);
}

// =========================================================================
// 4. POST - Menyimpan Surat Umum (GENERAL) Baru
// =========================================================================
if ($method === 'POST' && $uri === '/api/letters/general') {
    $sql = "INSERT INTO letters
        (client_id, letter_number, letter_type, subject, letter_location, letter_date, recipient, description, signer_name, signer_position, attachment, signature_mode, verify_token)
        VALUES (?, ?, 'GENERAL', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    try {
        $result = db_run($sql, [
            input('client_id'), input('letter_number'), input('subject'), input('letter_location'),
            input('letter_date'), input('recipient'), input('description'), input('signer_name'),
            input('signer_position'), input('attachment'), normalized_signature_mode(), resolved_verify_token()
        ]);
    } catch (Exception $e) {
        json_response(['success' => false, 'error' => $e->getMessage()], 500);
    }
    json_response(['success' => true, 'message' => 'Surat Umum berhasil disimpan!', 'id' => $result['insertId']]);
}

// =========================================================================
// 5. PUT - Memperbarui (Edit) Khusus Surat Umum Jalur Cadangan Frontend
// =========================================================================
if ($method === 'PUT' && preg_match('#^/api/letters/general/([^/]+)$#', $uri, $mm)) {
    $existing = db_one("SELECT verify_token FROM letters WHERE id = ?", [$mm[1]]);
    $sql = "UPDATE letters SET
        client_id = ?, letter_number = ?, letter_type = 'GENERAL', subject = ?, letter_location = ?,
        letter_date = ?, recipient = ?, description = ?, signer_name = ?, signer_position = ?, attachment = ?,
        signature_mode = ?, verify_token = ?
        WHERE id = ?";
    try {
        db_run($sql, [
            input('client_id'), input('letter_number'), input('subject'), input('letter_location'),
            input('letter_date'), input('recipient'), input('description'), input('signer_name'),
            input('signer_position'), input('attachment'), normalized_signature_mode(),
            resolved_verify_token($existing ? $existing['verify_token'] : ''), $mm[1]
        ]);
    } catch (Exception $e) {
        json_response(['success' => false, 'error' => $e->getMessage()], 500);
    }
    json_response(['success' => true, 'message' => 'Data Surat Umum berhasil diupdate!']);
}

// --- API MENU MANAGEMENT (CRUD menu) ---

// 1. READ ALL (GET DATA)
if ($method === 'GET' && $uri === '/api/menus') {
    try {
        $result = db_all('SELECT * FROM menu ORDER BY menu_order ASC');
    } catch (Exception $e) {
        json_db_error($e);
    }
    json_response(build_menu_tree($result, 1));
}

// 1. READ ALL (GET DATA)
if ($method === 'GET' && $uri === '/api/menus-access') {
    $sql = 'SELECT menu_id, title AS menu_name, url AS menu_url, icon AS menu_icon, class_active, parent_id, menu_order FROM menu ORDER BY menu_order ASC';
    try {
        $result = db_all($sql);
    } catch (Exception $e) {
        json_db_error($e);
    }

    $parents = [];
    $children = [];
    foreach ($result as $item) {
        $o = (object)$item;
        if ($o->menu_id === 1) {
            $o->subs = [];
            $parents[] = $o;
        } elseif ($o->parent_id === 1 || !js_truthy($o->parent_id)) {
            $o->subs = [];
            $parents[] = $o;
        } else {
            $children[] = $o;
        }
    }

    foreach ($children as $child) {
        $parent = null;
        foreach ($parents as $p) {
            if ($p->menu_id === $child->parent_id) {
                $parent = $p;
                break;
            }
        }
        if ($parent) {
            $parent->subs[] = $child;
        } else {
            $child->subs = [];
            $parents[] = $child;
        }
    }

    usort($parents, function ($a, $b) {
        return num_cmp($a->menu_order, $b->menu_order);
    });
    json_response($parents);
}

// 2. CREATE (POST DATA)
if ($method === 'POST' && $uri === '/api/menus') {
    $parent_id = input('parent_id');
    $formattedParentId = ($parent_id === '' || $parent_id === null) ? null : $parent_id;

    $sql = "INSERT INTO menu (
        parent_id, title, url, description, menu_order, icon, is_active,
        is_view, is_create, is_edit, is_delete, is_export, is_duplicate, is_unlock
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    $values = [
        $formattedParentId,
        js_or(input('title'), ''),
        js_or(input('url'), ''),
        js_or(input('description'), ''),
        js_or(input('menu_order'), 1),
        js_or(input('icon'), ''),
        parse_flag(input('is_active'), 1),
        parse_flag(input('is_view'), 1),
        parse_flag(input('is_create'), 1),
        parse_flag(input('is_edit'), 1),
        parse_flag(input('is_delete'), 1),
        parse_flag(input('is_export'), 1),
        parse_flag(input('is_duplicate'), 1),
        parse_flag(input('is_unlock'), 1)
    ];

    try {
        $result = db_run($sql, $values);
    } catch (Exception $e) {
        error_log("Error inserting menu: " . $e->getMessage());
        json_response([
            'error' => 'Gagal menyimpan data menu ke database',
            'details' => $e->getMessage()
        ], 500);
    }
    json_response(['message' => 'Menu berhasil disimpan', 'id' => $result['insertId']], 201);
}

// 3. UPDATE (PUT DATA)
if ($method === 'PUT' && preg_match('#^/api/menus/([^/]+)$#', $uri, $mm)) {
    $query = "
        UPDATE menu SET
        parent_id = ?, title = ?, url = ?, description = ?, menu_order = ?, type = ?,
        is_view = ?, is_create = ?, is_edit = ?, is_delete = ?, is_export = ?,
        is_duplicate = ?, is_unlock = ?, is_active = ?, class_active = ?, icon = ?
        WHERE menu_id = ?
    ";
    $values = [
        js_or(input('parent_id'), null), input('title'), js_or(input('url'), null),
        js_or(input('description'), null), input('menu_order'), js_or(input('type'), null),
        input('is_view'), input('is_create'), input('is_edit'), input('is_delete'), input('is_export'),
        input('is_duplicate'), input('is_unlock'), input('is_active'),
        js_or(input('class_active'), null), js_or(input('icon'), null), $mm[1]
    ];
    try {
        db_run($query, $values);
    } catch (Exception $e) {
        json_db_error($e);
    }
    json_response(['message' => 'Menu berhasil diperbarui']);
}

// 4. DELETE (DELETE DATA)
if ($method === 'DELETE' && preg_match('#^/api/menus/([^/]+)$#', $uri, $mm)) {
    try {
        db_run('DELETE FROM menu WHERE menu_id = ?', [$mm[1]]);
    } catch (Exception $e) {
        json_db_error($e);
    }
    json_response(['message' => 'Menu berhasil dihapus']);
}

// ==========================================
// API PROJECT DOCUMENTS (CRUD POLA SERAGAM)
// ==========================================

// 1. GET (Ambil Semua Data Dokumen)
if ($method === 'GET' && $uri === '/api/project-documents') {
    try {
        json_response(db_all("SELECT * FROM project_documents ORDER BY id DESC"));
    } catch (Exception $e) {
        json_db_error($e);
    }
}

// 2. GET BY PROJECT ID (Ambil dokumen berdasarkan id project induknya)
if ($method === 'GET' && preg_match('#^/api/project-documents/project/([^/]+)$#', $uri, $mm)) {
    try {
        $result = db_all("SELECT * FROM project_documents WHERE project_id = ?", [$mm[1]]);
    } catch (Exception $e) {
        json_db_error($e);
    }
    if (count($result) === 0) {
        json_response(['message' => 'Data tidak ditemukan'], 404);
    }
    json_response($result[0]);
}

$docFields = [
    'project_id', 'location',
    'inspection_date', 'inspection_officer_name_1', 'inspection_officer_role_1', 'inspection_officer_name_2', 'inspection_officer_role_2', 'inspection_description',
    'progress_date', 'progress_officer_name_1', 'progress_officer_role_1', 'progress_officer_name_2', 'progress_officer_role_2', 'progress_description',
    'handover_date', 'handover_officer_name_1', 'handover_officer_role_1', 'handover_officer_name_2', 'handover_officer_role_2', 'handover_description',
    'company_1', 'company_2', 'progress_status', 'handover_status', 'bapp_attachment'
];
$docDateFields = ['inspection_date', 'progress_date', 'handover_date'];

// 3. POST (Tambah Data Dokumen Baru)
if ($method === 'POST' && $uri === '/api/project-documents') {
    $values = [];
    foreach ($docFields as $field) {
        $v = input($field);
        if (in_array($field, $docDateFields, true)) {
            $v = js_truthy($v) ? explode('T', (string)$v)[0] : null;
        }
        $values[] = $v;
    }
    $sql = "INSERT INTO project_documents (
        project_id, location,
        inspection_date, inspection_officer_name_1, inspection_officer_role_1, inspection_officer_name_2, inspection_officer_role_2, inspection_description,
        progress_date, progress_officer_name_1, progress_officer_role_1, progress_officer_name_2, progress_officer_role_2, progress_description,
        handover_date, handover_officer_name_1, handover_officer_role_1, handover_officer_name_2, handover_officer_role_2, handover_description, company_1, company_2, progress_status, handover_status, bapp_attachment
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    try {
        $result = db_run($sql, $values);
    } catch (Exception $e) {
        json_db_error($e);
    }
    json_response(['message' => 'Success', 'id' => $result['insertId']]);
}

// 4. PUT (Update Data Dokumen Berdasarkan ID)
if ($method === 'PUT' && preg_match('#^/api/project-documents/([^/]+)$#', $uri, $mm)) {
    $values = [];
    foreach ($docFields as $field) {
        $v = input($field);
        if (in_array($field, $docDateFields, true)) {
            $v = js_truthy($v) ? explode('T', (string)$v)[0] : null;
        }
        $values[] = $v;
    }
    $values[] = $mm[1];
    $sql = "UPDATE project_documents SET
        project_id=?, location=?,
        inspection_date=?, inspection_officer_name_1=?, inspection_officer_role_1=?, inspection_officer_name_2=?, inspection_officer_role_2=?, inspection_description=?,
        progress_date=?, progress_officer_name_1=?, progress_officer_role_1=?, progress_officer_name_2=?, progress_officer_role_2=?, progress_description=?,
        handover_date=?, handover_officer_name_1=?, handover_officer_role_1=?, handover_officer_name_2=?, handover_officer_role_2=?, handover_description=?, company_1=?, company_2=?, progress_status=?, handover_status=?, bapp_attachment=?
        WHERE id=?";
    try {
        db_run($sql, $values);
    } catch (Exception $e) {
        json_db_error($e);
    }
    json_response(['message' => 'Updated Successfully']);
}

// 5. DELETE (Hapus Data Dokumen)
if ($method === 'DELETE' && preg_match('#^/api/project-documents/([^/]+)$#', $uri, $mm)) {
    try {
        db_run("DELETE FROM project_documents WHERE id=?", [$mm[1]]);
    } catch (Exception $e) {
        json_db_error($e);
    }
    json_response(['message' => 'Deleted Successfully']);
}

// Di file backend Express Anda:
if ($method === 'PUT' && preg_match('#^/api/project-documents/status/([^/]+)$#', $uri, $mm)) {
    $sql = "UPDATE project_documents SET
        progress_status = ?,
        handover_status = ?
        WHERE id = ?";
    try {
        db_run($sql, [input('progress_status'), input('handover_status'), $mm[1]]);
    } catch (Exception $e) {
        json_db_error($e);
    }
    json_response(['message' => 'Data terupdate!']);
}

// ==========================================
// 1. GET ALL ROLES
// ==========================================
if ($method === 'GET' && $uri === '/api/roles') {
    try {
        json_response(db_all("SELECT role_id, name_role, description, `lock` FROM roles ORDER BY name_role ASC"));
    } catch (Exception $e) {
        error_log("Error fetching roles: " . $e->getMessage());
        json_response(['error' => 'Database error', 'details' => (object)[]], 500);
    }
}

// ==========================================
// 2. POST NEW ROLE
// ==========================================
if ($method === 'POST' && $uri === '/api/roles') {
    $name_role = input('name_role');
    if (!js_truthy($name_role)) {
        json_response(['error' => "Field 'name_role' is required"], 400);
    }
    $sql = "INSERT INTO roles (name_role, description, `lock`) VALUES (?, ?, ?)";
    $values = [$name_role, js_or(input('description'), null), input('lock', 0)];
    try {
        $result = db_run($sql, $values);
    } catch (Exception $e) {
        error_log("Error inserting role: " . $e->getMessage());
        json_response(['error' => 'Database error', 'details' => (object)[]], 500);
    }
    json_response(['message' => 'Role added successfully', 'role_id' => $result['insertId']]);
}

// ==========================================
// 3. PUT (UPDATE) ROLE & TOGGLE LOCK
// ==========================================
if ($method === 'PUT' && preg_match('#^/api/roles/([^/]+)$#', $uri, $mm)) {
    $name_role = input('name_role');
    if (!js_truthy($name_role)) {
        json_response(['error' => "Field 'name_role' is required"], 400);
    }
    $sql = "UPDATE roles SET name_role = ?, description = ?, `lock` = ? WHERE role_id = ?";
    $values = [$name_role, js_or(input('description'), null), input('lock', 0), $mm[1]];
    try {
        $result = db_run($sql, $values);
    } catch (Exception $e) {
        error_log("Error updating role: " . $e->getMessage());
        json_response(['error' => 'Database error', 'details' => (object)[]], 500);
    }
    if ($result['affectedRows'] === 0) {
        json_response(['error' => 'Role not found'], 404);
    }
    json_response(['message' => 'Role updated successfully']);
}

// ==========================================
// 4. DELETE ROLE (PROTEKSI KETAT)
// ==========================================
if ($method === 'DELETE' && preg_match('#^/api/roles/([^/]+)$#', $uri, $mm)) {
    try {
        $checkResult = db_all("SELECT `lock` FROM roles WHERE role_id = ?", [$mm[1]]);
    } catch (Exception $e) {
        json_db_error($e);
    }
    if (count($checkResult) === 0) {
        json_response(['error' => 'Role not found'], 404);
    }
    if ($checkResult[0]['lock'] === 1 || $checkResult[0]['lock'] === true) {
        json_response(['error' => 'This role is system locked and cannot be deleted'], 403);
    }
    try {
        db_run("DELETE FROM roles WHERE role_id = ?", [$mm[1]]);
    } catch (Exception $e) {
        error_log("Error deleting role: " . $e->getMessage());
        json_response(['error' => 'Database error', 'details' => (object)[]], 500);
    }
    json_response(['message' => 'Role deleted successfully']);
}

// ==========================================
// 1. GET ALL USERS (Dengan nama Role)
// ==========================================
if ($method === 'GET' && $uri === '/api/users/roles') {
    $sql = "
        SELECT u.id, u.email, u.name, u.role_id, u.phone, u.gender, u.is_active, r.name_role
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.role_id
        ORDER BY u.id DESC
    ";
    try {
        json_response(db_all($sql));
    } catch (Exception $e) {
        error_log("Error fetching users: " . $e->getMessage());
        json_response(['error' => 'Database error', 'details' => (object)[]], 500);
    }
}

// ==========================================
// 2. POST NEW USER (Tambah User)
// ==========================================
if ($method === 'POST' && $uri === '/api/users') {
    $email = input('email');
    $password = input('password');
    $name = input('name');
    $role_id = input('role_id');
    $phone = input('phone');
    $gender = input('gender');
    $is_active = input('is_active', 1);
    error_log("Data diterima backend: " . json_encode(['email' => $email, 'name' => $name, 'role_id' => $role_id]));

    if (!js_truthy($email) || !js_truthy($password) || !js_truthy($name) || !js_truthy($role_id)) {
        json_response(['error' => 'All fields are required'], 400);
    }

    try {
        $hashedPassword = password_hash((string)$password, PASSWORD_BCRYPT, ['cost' => 10]);
    } catch (Exception $e) {
        error_log("Hashing Error Detail: " . $e->getMessage());
        json_response(['error' => 'Internal server error during processing'], 500);
    }

    $cleanRoleId = parse_int_strict($role_id);
    if ($cleanRoleId === null) {
        json_response(['error' => 'Invalid Role ID format (Must be a number)'], 400);
    }

    try {
        $result = db_run(
            "INSERT INTO users (email, password, name, role_id, phone, gender, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [$email, $hashedPassword, $name, $cleanRoleId, $phone, $gender, (int)$is_active]
        );
    } catch (Exception $e) {
        error_log("Database Error Detail: " . $e->getMessage());
        if (is_dup_error($e)) {
            json_response(['error' => 'Email already registered'], 400);
        }
        if (is_fk_error($e)) {
            json_response(['error' => 'The selected Role ID does not exist in roles table'], 400);
        }
        json_response(['error' => 'Database error', 'details' => $e->getMessage()], 500);
    }
    json_response(['message' => 'User created successfully', 'id' => $result['insertId']]);
}

// ==========================================
// 3. PUT (UPDATE) USER
// ==========================================
if ($method === 'PUT' && preg_match('#^/api/users/([^/]+)$#', $uri, $mm)) {
    $userId = $mm[1];
    $email = input('email');
    $password = input('password');
    $name = input('name');
    $role_id = input('role_id');
    $phone = input('phone');
    $gender = input('gender');
    $is_active = input('is_active', 1);
    error_log("Mengubah user ID {$userId} dengan data: " . json_encode(['email' => $email, 'name' => $name, 'role_id' => $role_id]));

    if (!js_truthy($email) || !js_truthy($name) || !js_truthy($role_id)) {
        json_response(['error' => 'Email, Name, and Role are required'], 400);
    }

    $cleanRoleId = parse_int_strict($role_id);
    if ($cleanRoleId === null) {
        json_response(['error' => 'Invalid Role ID format (Must be a number)'], 400);
    }

    if (js_truthy($password) && trim((string)$password) !== '') {
        try {
            $hashedPassword = password_hash((string)$password, PASSWORD_BCRYPT, ['cost' => 10]);
        } catch (Exception $e) {
            error_log("Internal Server Error Detail: " . $e->getMessage());
            json_response(['error' => 'Internal server error during processing'], 500);
        }
        $sql = "UPDATE users SET email = ?, password = ?, name = ?, role_id = ?, phone = ?, gender = ?, is_active = ? WHERE id = ?";
        $values = [$email, $hashedPassword, $name, $cleanRoleId, $phone, $gender, (int)$is_active, $userId];
    } else {
        $sql = "UPDATE users SET email = ?, name = ?, role_id = ?, phone = ?, gender = ?, is_active = ? WHERE id = ?";
        $values = [$email, $name, $cleanRoleId, $phone, $gender, (int)$is_active, $userId];
    }

    try {
        $result = db_run($sql, $values);
    } catch (Exception $e) {
        error_log("Database Update Error Detail: " . $e->getMessage());
        if (is_dup_error($e)) {
            json_response(['error' => 'Email already used by another account'], 400);
        }
        if (is_fk_error($e)) {
            json_response(['error' => 'The selected Role ID does not exist in roles table'], 400);
        }
        json_response(['error' => 'Database error', 'details' => $e->getMessage()], 500);
    }
    if ($result['affectedRows'] === 0) {
        json_response(['error' => 'User not found'], 404);
    }
    json_response(['message' => 'User updated successfully']);
}

// ==========================================
// 4. DELETE USER
// ==========================================
if ($method === 'DELETE' && preg_match('#^/api/users/([^/]+)$#', $uri, $mm)) {
    try {
        db_run("DELETE FROM users WHERE id = ?", [$mm[1]]);
    } catch (Exception $e) {
        error_log("Error deleting user: " . $e->getMessage());
        json_response(['error' => 'Database error', 'details' => (object)[]], 500);
    }
    json_response(['message' => 'User deleted successfully']);
}

// =========================================================================
// 1. GET DATA MATRIKS (MURNI STRING 1 DAN '0')
// =========================================================================
if ($method === 'GET' && preg_match('#^/api/module-authority/([^/]+)$#', $uri, $mm)) {
    $roleId = $mm[1];
    $sqlMenu = "
        SELECT
            menu_id, title, parent_id, menu_order, is_active,
            is_view, is_create, is_edit, is_delete, is_export, is_duplicate, is_unlock
        FROM menu
        WHERE is_active = 1
        ORDER BY menu_order ASC";

    try {
        $menus = db_all($sqlMenu);
        $authorities = db_all("SELECT * FROM module_authority WHERE role_id = ?", [$roleId]);
    } catch (Exception $e) {
        json_response(['error' => $e->getMessage()], 500);
    }

    $authMap = [];
    foreach ($authorities as $auth) {
        $authMap[(string)$auth['menu_id']] = (object)[
            'is_view' => parse_flag($auth['is_view'], 0),
            'is_create' => parse_flag($auth['is_create'], 0),
            'is_edit' => parse_flag($auth['is_edit'], 0),
            'is_delete' => parse_flag($auth['is_delete'], 0),
            'is_export' => parse_flag($auth['is_export'], 0),
            'is_duplicate' => parse_flag($auth['is_duplicate'], 0),
            'is_unlock' => parse_flag($auth['is_unlock'], 0)
        ];
    }

    $matrixData = [];
    foreach ($menus as $menu) {
        $idString = (string)$menu['menu_id'];
        $matrixData[] = (object)[
            'menu_id' => $menu['menu_id'],
            'title' => $menu['title'],
            'parent_id' => $menu['parent_id'],
            'menu_order' => $menu['menu_order'],
            'is_active' => parse_flag($menu['is_active'], 0),
            'menu_config' => (object)[
                'is_view' => parse_flag($menu['is_view'], 0),
                'is_create' => parse_flag($menu['is_create'], 0),
                'is_edit' => parse_flag($menu['is_edit'], 0),
                'is_delete' => parse_flag($menu['is_delete'], 0),
                'is_export' => parse_flag($menu['is_export'], 0),
                'is_duplicate' => parse_flag($menu['is_duplicate'], 0),
                'is_unlock' => parse_flag($menu['is_unlock'], 0)
            ],
            'access' => isset($authMap[$idString]) ? $authMap[$idString] : (object)[
                'is_view' => 0,
                'is_create' => 0,
                'is_edit' => 0,
                'is_delete' => 0,
                'is_export' => 0,
                'is_duplicate' => 0,
                'is_unlock' => 0
            ]
        ];
    }

    $menuMap = [];
    $menuTree = [];
    foreach ($matrixData as $item) {
        $item->subs = [];
        $menuMap[(string)$item->menu_id] = $item;
    }
    foreach ($matrixData as $item) {
        $currentItemInMap = $menuMap[(string)$item->menu_id];
        $pId = $item->parent_id;
        if (is_root_pid($pId)) {
            $menuTree[] = $currentItemInMap;
        } else {
            $parentItem = isset($menuMap[(string)$pId]) ? $menuMap[(string)$pId] : null;
            if ($parentItem) {
                $parentItem->subs[] = $currentItemInMap;
            } else {
                $menuTree[] = $currentItemInMap;
            }
        }
    }
    sort_tree_recursive($menuTree);
    json_response($menuTree);
}

// =========================================================================
// 2. POST SAVE (MURNI STRING 1 DAN '0')
// =========================================================================
if ($method === 'POST' && $uri === '/api/module-authority/save') {
    $role_id = input('role_id');
    $permissions = input('permissions');

    if (!js_truthy($role_id)) {
        json_response(['error' => 'Role ID wajib dipilih!'], 400);
    }

    try {
        db_run("DELETE FROM module_authority WHERE role_id = ?", [$role_id]);
    } catch (Exception $e) {
        json_response(['error' => $e->getMessage()], 500);
    }

    if (!is_array($permissions) || count($permissions) === 0) {
        json_response(['message' => 'Hak akses berhasil dibersihkan!']);
    }

    $values = [];
    foreach ($permissions as $p) {
        $values[] = [
            $role_id,
            isset($p['menu_id']) ? $p['menu_id'] : null,
            parse_flag(isset($p['is_view']) ? $p['is_view'] : null, 0),
            parse_flag(isset($p['is_create']) ? $p['is_create'] : null, 0),
            parse_flag(isset($p['is_edit']) ? $p['is_edit'] : null, 0),
            parse_flag(isset($p['is_delete']) ? $p['is_delete'] : null, 0),
            parse_flag(isset($p['is_export']) ? $p['is_export'] : null, 0),
            parse_flag(isset($p['is_duplicate']) ? $p['is_duplicate'] : null, 0),
            parse_flag(isset($p['is_unlock']) ? $p['is_unlock'] : null, 0)
        ];
    }

    $insertSql = "INSERT INTO module_authority
            (role_id, menu_id, is_view, is_create, is_edit, is_delete, is_export, is_duplicate, is_unlock)
            VALUES ";
    try {
        $affectedRows = db_bulk($insertSql, $values);
    } catch (Exception $e) {
        error_log("Error inserting module_authority: " . $e->getMessage());
        json_response([
            'error' => 'Gagal menyimpan hak akses ke database.',
            'details' => $e->getMessage()
        ], 500);
    }

    json_response(['message' => 'Hak akses berhasil disimpan!', 'affectedRows' => $affectedRows]);
}

if ($uri === '/api/qr-codes' && $method === 'GET') {
    try {
        json_response(db_all("SELECT * FROM qr_codes WHERE deleted_at IS NULL ORDER BY updated_at DESC, id DESC"));
    } catch (Exception $e) {
        json_db_error($e);
    }
}

if ($uri === '/api/qr-codes' && $method === 'POST') {
    $qrText = trim((string) input('qr_text'));
    if ($qrText === '') {
        json_response(['message' => 'Teks QR wajib diisi'], 400);
    }
    $titleInput = trim((string) input('title'));
    $title = $titleInput !== '' ? $titleInput : (function_exists('mb_substr') ? mb_substr($qrText, 0, 100) : substr($qrText, 0, 100));
    $size = (int) input('size', 320);
    if ($size < 200) {
        $size = 200;
    }
    if ($size > 512) {
        $size = 512;
    }
    $level = (string) input('level', 'M');
    if (!in_array($level, ['L', 'M', 'Q', 'H'], true)) {
        $level = 'M';
    }
    $image = has_uploaded_file('image') ? save_upload('image') : null;
    $user = input('created_by');
    $now = date('Y-m-d H:i:s');
    $snapshot = ['title' => $title, 'qr_text' => $qrText, 'image' => $image, 'size' => $size, 'level' => $level];
    try {
        db_begin();
        $result = db_run("INSERT INTO qr_codes
            (title, qr_text, image, size, level, created_by, updated_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [$title, $qrText, $image, $size, $level, $user, $user, $now, $now]);
        $id = $result['insertId'];
        qr_history($id, 'create', $snapshot, $user);
        db_commit();
        $saved = db_one("SELECT * FROM qr_codes WHERE id = ?", [$id]);
        json_response(['message' => 'QR code berhasil disimpan', 'id' => $id, 'data' => $saved], 201);
    } catch (Exception $e) {
        db_rollback_quiet();
        json_response(['message' => 'Gagal menyimpan QR code', 'error' => $e->getMessage()], 500);
    }
}

if ($method === 'GET' && preg_match('#^/api/qr-codes/(\d+)/history$#', $uri, $mm)) {
    try {
        json_response(db_all("SELECT * FROM qr_code_histories WHERE qr_code_id = ? ORDER BY changed_at DESC, id DESC", [$mm[1]]));
    } catch (Exception $e) {
        json_db_error($e);
    }
}

if ($method === 'PUT' && preg_match('#^/api/qr-codes/(\d+)$#', $uri, $mm)) {
    $existing = db_one("SELECT * FROM qr_codes WHERE id = ? AND deleted_at IS NULL", [$mm[1]]);
    if (!$existing) {
        json_response(['message' => 'QR code tidak ditemukan'], 404);
    }
    $qrText = trim((string) input('qr_text', $existing['qr_text']));
    if ($qrText === '') {
        json_response(['message' => 'Teks QR wajib diisi'], 400);
    }
    $titleInput = trim((string) input('title'));
    $title = $titleInput !== '' ? $titleInput : (function_exists('mb_substr') ? mb_substr($qrText, 0, 100) : substr($qrText, 0, 100));
    $size = (int) input('size', $existing['size']);
    if ($size < 200) {
        $size = 200;
    }
    if ($size > 512) {
        $size = 512;
    }
    $level = (string) input('level', $existing['level']);
    if (!in_array($level, ['L', 'M', 'Q', 'H'], true)) {
        $level = $existing['level'];
    }
    $image = $existing['image'];
    if (has_uploaded_file('image')) {
        $uploaded = save_upload('image');
        if ($uploaded === null) {
            json_response(['message' => 'Gagal mengunggah gambar'], 400);
        }
        $image = $uploaded;
    } elseif (remove_requested('image')) {
        $image = null;
    }
    $user = input('updated_by');
    $now = date('Y-m-d H:i:s');
    try {
        db_begin();
        qr_history($mm[1], 'update', $existing, $user);
        db_run("UPDATE qr_codes SET title = ?, qr_text = ?, image = ?, size = ?, level = ?, updated_by = ?, updated_at = ? WHERE id = ?",
            [$title, $qrText, $image, $size, $level, $user, $now, $mm[1]]);
        db_commit();
        $saved = db_one("SELECT * FROM qr_codes WHERE id = ?", [$mm[1]]);
        json_response(['message' => 'QR code berhasil diperbarui', 'data' => $saved]);
    } catch (Exception $e) {
        db_rollback_quiet();
        json_response(['message' => 'Gagal memperbarui QR code', 'error' => $e->getMessage()], 500);
    }
}

if ($method === 'DELETE' && preg_match('#^/api/qr-codes/(\d+)$#', $uri, $mm)) {
    $existing = db_one("SELECT * FROM qr_codes WHERE id = ? AND deleted_at IS NULL", [$mm[1]]);
    if (!$existing) {
        json_response(['message' => 'QR code tidak ditemukan'], 404);
    }
    $user = input('updated_by');
    $now = date('Y-m-d H:i:s');
    try {
        db_begin();
        qr_history($mm[1], 'delete', $existing, $user);
        db_run("UPDATE qr_codes SET deleted_at = ?, updated_by = ?, updated_at = ? WHERE id = ?", [$now, $user, $now, $mm[1]]);
        db_commit();
        json_response(['message' => 'QR code berhasil dihapus']);
    } catch (Exception $e) {
        db_rollback_quiet();
        json_response(['message' => 'Gagal menghapus QR code', 'error' => $e->getMessage()], 500);
    }
}

if ($uri === '/api/app-settings' && $method === 'GET') {
    $defaults = [
        'id' => 1,
        'site_title' => 'Admin Panel',
        'site_description' => 'StrikingDash React Web Application',
        'logo' => '',
        'digital_signature' => '',
        'meta_title' => 'Admin Panel',
        'meta_description' => 'StrikingDash React Web Application',
        'meta_keywords' => 'admin, dashboard, react',
        'updated_at' => null
    ];
    $settings = db_one("SELECT * FROM app_settings WHERE id = 1");
    $settings = array_merge($defaults, is_array($settings) ? $settings : []);
    json_response($settings);
}

if ($uri === '/api/app-settings' && $method === 'PUT') {
    $defaults = [
        'site_title' => 'Admin Panel',
        'site_description' => 'StrikingDash React Web Application',
        'logo' => '',
        'digital_signature' => '',
        'meta_title' => 'Admin Panel',
        'meta_description' => 'StrikingDash React Web Application',
        'meta_keywords' => 'admin, dashboard, react'
    ];
    $existing = db_one("SELECT * FROM app_settings WHERE id = 1");
    $existing = array_merge($defaults, is_array($existing) ? $existing : []);

    $siteTitle = trim((string) input('site_title', $existing['site_title']));
    $siteDescription = trim((string) input('site_description', $existing['site_description']));
    $metaTitle = trim((string) input('meta_title', $existing['meta_title']));
    $metaDescription = trim((string) input('meta_description', $existing['meta_description']));
    $metaKeywords = trim((string) input('meta_keywords', $existing['meta_keywords']));
    $logo = $existing['logo'];
    $digitalSignature = $existing['digital_signature'];

    if ($siteTitle === '') {
        json_response(['message' => 'Site title wajib diisi'], 400);
    }
    if ($metaTitle === '') {
        $metaTitle = $siteTitle;
    }
    if ($metaDescription === '') {
        $metaDescription = $siteDescription;
    }

    if (remove_requested('logo')) {
        delete_upload($logo);
        $logo = '';
    }

    if (has_uploaded_file('logo')) {
        $uploaded = save_upload('logo');
        if ($uploaded === null) {
            json_response(['message' => 'Gagal mengunggah logo'], 400);
        }
        delete_upload($logo);
        $logo = $uploaded;
    }

    if (remove_requested('digital_signature')) {
        delete_upload($digitalSignature);
        $digitalSignature = '';
    }

    if (has_uploaded_file('digital_signature')) {
        $uploaded = save_upload('digital_signature');
        if ($uploaded === null) {
            json_response(['message' => 'Gagal mengunggah tanda tangan digital'], 400);
        }
        delete_upload($digitalSignature);
        $digitalSignature = $uploaded;
    }

    $now = date('Y-m-d H:i:s');
    db_run("INSERT INTO app_settings
        (id, site_title, site_description, logo, digital_signature, meta_title, meta_description, meta_keywords, updated_at)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            site_title = VALUES(site_title),
            site_description = VALUES(site_description),
            logo = VALUES(logo),
            digital_signature = VALUES(digital_signature),
            meta_title = VALUES(meta_title),
            meta_description = VALUES(meta_description),
            meta_keywords = VALUES(meta_keywords),
            updated_at = VALUES(updated_at)",
        [$siteTitle, $siteDescription, $logo, $digitalSignature, $metaTitle, $metaDescription, $metaKeywords, $now]
    );

    $settings = db_one("SELECT * FROM app_settings WHERE id = 1");
    json_response(['message' => 'Konfigurasi aplikasi berhasil disimpan!', 'settings' => $settings]);
}

if ($method === 'POST' && $uri === '/api/backups') {
    ensure_backups_table();
    $payload = json_decode(file_get_contents('php://input'), true);
    if (!is_array($payload)) {
        $payload = [];
    }
    $note = array_key_exists('note', $payload) && $payload['note'] !== null ? substr((string)$payload['note'], 0, 255) : null;
    $createdBy = array_key_exists('created_by', $payload) && $payload['created_by'] !== null ? substr((string)$payload['created_by'], 0, 150) : null;

    $backupDir = __DIR__ . '/backups';
    if (!is_dir($backupDir)) {
        mkdir($backupDir, 0777, true);
    }
    $filename = 'backup-' . date('Ymd-His') . '-' . substr(md5(uniqid('', true)), 0, 8) . '.sql';
    $filePath = $backupDir . '/' . $filename;

    $tablesCount = 0;
    $sql = backup_generate_sql($tablesCount);
    if (file_put_contents($filePath, $sql) === false) {
        json_response(['message' => 'Gagal menyimpan backup', 'error' => 'Unable to write backup file'], 500);
    }
    $size = filesize($filePath);
    if ($size === false) {
        $size = strlen($sql);
    }
    $createdAt = date('Y-m-d H:i:s');

    try {
        $insert = db_run(
            "INSERT INTO backups (filename, original_name, size, tables_count, note, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [$filename, $filename, $size, $tablesCount, $note, $createdBy, $createdAt]
        );
    } catch (Exception $e) {
        @unlink($filePath);
        json_response(['message' => 'Gagal menyimpan riwayat backup', 'error' => $e->getMessage()], 500);
    }

    json_response([
        'id' => (int)$insert['insertId'],
        'filename' => $filename,
        'size' => (int)$size,
        'tables' => (int)$tablesCount,
        'created_at' => backup_iso_datetime($createdAt),
        'note' => $note
    ], 201);
}

if ($method === 'GET' && $uri === '/api/backups') {
    ensure_backups_table();
    $rows = db_all("SELECT * FROM backups ORDER BY id DESC");
    $backups = [];
    foreach ($rows as $row) {
        $backups[] = [
            'id' => (int)$row['id'],
            'filename' => $row['filename'],
            'original_name' => $row['original_name'],
            'size' => (int)$row['size'],
            'tables' => (int)$row['tables_count'],
            'note' => $row['note'],
            'created_by' => $row['created_by'],
            'created_at' => backup_iso_datetime($row['created_at'])
        ];
    }
    json_response($backups);
}

if ($method === 'GET' && preg_match('#^/api/backups/(\d+)/download$#', $uri, $mm)) {
    ensure_backups_table();
    $row = db_one("SELECT * FROM backups WHERE id = ?", [$mm[1]]);
    if (!$row) {
        json_response(['message' => 'Backup tidak ditemukan'], 404);
    }
    $filePath = backup_file_path($row);
    if (!is_file($filePath)) {
        json_response(['message' => 'File backup tidak ditemukan'], 404);
    }
    $downloadName = str_replace(["\r", "\n", '"'], '', (string)$row['original_name']);
    if ($downloadName === '') {
        $downloadName = basename($filePath);
    }
    header('Content-Type: application/sql; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $downloadName . '"');
    readfile($filePath);
    exit;
}

if ($method === 'POST' && preg_match('#^/api/backups/(\d+)/restore$#', $uri, $mm)) {
    ensure_backups_table();
    $row = db_one("SELECT * FROM backups WHERE id = ?", [$mm[1]]);
    if (!$row) {
        json_response(['message' => 'Backup tidak ditemukan', 'error' => 'Backup not found'], 500);
    }
    $filePath = backup_file_path($row);
    if (!is_file($filePath)) {
        json_response(['message' => 'File backup tidak ditemukan', 'error' => 'Backup file not found'], 500);
    }

    try {
        $sql = file_get_contents($filePath);
        if ($sql === false) {
            throw new Exception('Unable to read backup file');
        }
        if (!$db->multi_query($sql)) {
            throw new Exception($db->error ?: 'Failed to execute backup SQL');
        }
        do {
            $result = $db->store_result();
            if ($result) {
                $result->free();
            }
            if ($db->error) {
                throw new Exception($db->error);
            }
        } while ($db->more_results() && $db->next_result());
        if ($db->error) {
            throw new Exception($db->error);
        }
        json_response(['success' => true, 'restored_at' => date('c')]);
    } catch (Exception $e) {
        json_response(['message' => 'Gagal memulihkan backup', 'error' => $e->getMessage()], 500);
    }
}

if ($method === 'DELETE' && preg_match('#^/api/backups/(\d+)$#', $uri, $mm)) {
    ensure_backups_table();
    $row = db_one("SELECT * FROM backups WHERE id = ?", [$mm[1]]);
    if (!$row) {
        json_response(['message' => 'Backup tidak ditemukan'], 404);
    }
    $filePath = backup_file_path($row);
    if (is_file($filePath)) {
        @unlink($filePath);
    }
    db_run("DELETE FROM backups WHERE id = ?", [$mm[1]]);
    json_response(['success' => true]);
}

if ($method === 'POST' && $uri === '/api/activity-logs') {
    ensure_activity_logs_table();
    $payload = json_decode(file_get_contents('php://input'), true);
    if (!is_array($payload)) {
        $payload = [];
    }
    $rawAction = isset($payload['action']) && is_scalar($payload['action']) ? (string)$payload['action'] : '';
    $rawModule = isset($payload['module']) && is_scalar($payload['module']) ? (string)$payload['module'] : '';
    if (trim($rawAction) === '' || trim($rawModule) === '') {
        json_response(['message' => 'Action dan module wajib diisi'], 400);
    }
    $truncate = static function ($value, $length) {
        return function_exists('mb_substr') ? mb_substr($value, 0, $length) : substr($value, 0, $length);
    };
    $positiveIntOrNull = static function ($value) {
        if (is_int($value)) {
            return $value > 0 ? $value : null;
        }
        if (is_float($value)) {
            return $value > 0 && floor($value) === $value ? (int)$value : null;
        }
        if (!is_string($value)) {
            return null;
        }
        $value = trim($value);
        if ($value === '' || !ctype_digit($value)) {
            return null;
        }
        $parsed = (int)$value;
        return $parsed > 0 ? $parsed : null;
    };
    $rawUserName = isset($payload['user_name']) && is_scalar($payload['user_name']) ? (string)$payload['user_name'] : '';
    $userName = $rawUserName !== '' ? $truncate($rawUserName, 150) : 'Unknown';
    $rawDescription = isset($payload['description']) && is_scalar($payload['description']) ? (string)$payload['description'] : '';
    $description = $rawDescription !== '' ? $truncate($rawDescription, 2000) : null;
    $createdAt = date('Y-m-d H:i:s');
    try {
        $insert = db_run(
            "INSERT INTO activity_logs (user_id, user_name, role_id, action, module, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
                $positiveIntOrNull(isset($payload['user_id']) ? $payload['user_id'] : null),
                $userName,
                $positiveIntOrNull(isset($payload['role_id']) ? $payload['role_id'] : null),
                $truncate($rawAction, 50),
                $truncate($rawModule, 100),
                $description,
                $createdAt
            ]
        );
        $row = db_one("SELECT * FROM activity_logs WHERE id = ?", [$insert['insertId']]);
    } catch (Exception $e) {
        json_response(['message' => 'Gagal menyimpan log aktivitas', 'error' => $e->getMessage()], 500);
    }
    json_response([
        'id' => (int)$row['id'],
        'user_id' => $row['user_id'] === null ? null : (int)$row['user_id'],
        'user_name' => (string)$row['user_name'],
        'role_id' => $row['role_id'] === null ? null : (int)$row['role_id'],
        'action' => (string)$row['action'],
        'module' => (string)$row['module'],
        'description' => $row['description'] === null ? null : (string)$row['description'],
        'created_at' => backup_iso_datetime($row['created_at'])
    ], 201);
}

if ($method === 'GET' && $uri === '/api/activity-logs/active-users') {
    ensure_activity_logs_table();
    $period = isset($_GET['period']) ? trim((string)$_GET['period']) : 'month';
    $interval = '30 DAY';
    if ($period === 'week') $interval = '7 DAY';
    if ($period === 'year') $interval = '365 DAY';
    try {
        $rows = db_all("SELECT user_name, COUNT(*) AS total FROM activity_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL $interval) GROUP BY user_name ORDER BY total DESC LIMIT 10");
    } catch (Exception $e) {
        json_response(['error' => $e->getMessage()], 500);
    }
    $result = [];
    foreach ($rows as $row) {
        $result[] = ['name' => $row['user_name'], 'count' => (int)$row['total']];
    }
    json_response($result);
}

if ($method === 'GET' && $uri === '/api/activity-logs') {
    ensure_activity_logs_table();
    $queryValue = static function ($key) {
        if (!isset($_GET[$key]) || !is_scalar($_GET[$key])) {
            return '';
        }
        return trim((string)$_GET[$key]);
    };
    $conditions = [];
    $params = [];
    $actionFilter = $queryValue('action');
    if ($actionFilter !== '') {
        $conditions[] = 'action = ?';
        $params[] = $actionFilter;
    }
    $moduleFilter = $queryValue('module');
    if ($moduleFilter !== '') {
        $conditions[] = 'module = ?';
        $params[] = $moduleFilter;
    }
    $search = $queryValue('search');
    if ($search !== '') {
        $like = '%' . $search . '%';
        $conditions[] = '(user_name LIKE ? OR module LIKE ? OR action LIKE ? OR description LIKE ?)';
        array_push($params, $like, $like, $like, $like);
    }
    $limit = filter_var($queryValue('limit'), FILTER_VALIDATE_INT);
    if ($limit === false || $limit < 1) {
        $limit = 100;
    }
    if ($limit > 500) {
        $limit = 500;
    }
    $offset = filter_var($queryValue('offset'), FILTER_VALIDATE_INT);
    if ($offset === false || $offset < 0) {
        $offset = 0;
    }
    $sql = "SELECT id, user_id, user_name, role_id, action, module, description, created_at FROM activity_logs";
    if ($conditions) {
        $sql .= ' WHERE ' . implode(' AND ', $conditions);
    }
    $sql .= ' ORDER BY id DESC LIMIT ' . (int)$limit . ' OFFSET ' . (int)$offset;
    try {
        $rows = db_all($sql, $params);
    } catch (Exception $e) {
        json_response(['message' => 'Gagal mengambil log aktivitas', 'error' => $e->getMessage()], 500);
    }
    $logs = [];
    foreach ($rows as $row) {
        $logs[] = [
            'id' => (int)$row['id'],
            'user_id' => $row['user_id'] === null ? null : (int)$row['user_id'],
            'user_name' => (string)$row['user_name'],
            'role_id' => $row['role_id'] === null ? null : (int)$row['role_id'],
            'action' => (string)$row['action'],
            'module' => (string)$row['module'],
            'description' => $row['description'] === null ? null : (string)$row['description'],
            'created_at' => backup_iso_datetime($row['created_at'])
        ];
    }
    json_response($logs);
}

if ($method === 'DELETE' && $uri === '/api/activity-logs') {
    ensure_activity_logs_table();
    $positiveIntOrNull = static function ($value) {
        if (is_int($value)) {
            return $value > 0 ? $value : null;
        }
        if (is_string($value)) {
            $value = trim($value);
            if ($value !== '' && ctype_digit($value)) {
                $parsed = (int)$value;
                return $parsed > 0 ? $parsed : null;
            }
        }
        return null;
    };
    $rawId = isset($_GET['id']) ? $_GET['id'] : null;
    $deleteId = $positiveIntOrNull($rawId);
    if ($deleteId === null) {
        $deleteId = $positiveIntOrNull(input('id'));
    }
    try {
        if ($deleteId !== null) {
            db_run("DELETE FROM activity_logs WHERE id = ?", [$deleteId]);
        } else {
            db_run("DELETE FROM activity_logs");
        }
    } catch (Exception $e) {
        json_response(['message' => 'Gagal menghapus log aktivitas', 'error' => $e->getMessage()], 500);
    }
    json_response(['success' => true]);
}

http_response_code(404);
header('Content-Type: text/html; charset=utf-8');
echo 'Cannot ' . htmlspecialchars($method) . ' ' . htmlspecialchars($uri);
exit;

