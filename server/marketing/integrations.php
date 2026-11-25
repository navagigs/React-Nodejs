<?php

function marketing_tracking_base_url(): string
{
    $base = trim((string)marketing_setting_effective('MARKETING_TRACKING_BASE_URL', ''));
    if ($base === '' && defined('APP_URL')) {
        $base = (string)APP_URL;
    }
    if ($base === '') {
        $host = isset($_SERVER['HTTP_HOST']) ? (string)$_SERVER['HTTP_HOST'] : '';
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $base = $host !== '' ? ($scheme . '://' . $host) : '';
    }
    return rtrim($base, '/');
}

function marketing_track_url(string $type, int $recipientId, array $extra = []): string
{
    $path = $type === 'click' ? 'click' : 'open';
    $params = array_merge(['rid' => $recipientId], $extra);
    return marketing_tracking_base_url() . '/api/marketing/track/' . $path . '?' . http_build_query($params);
}

function marketing_unsubscribe_url(array $contact): string
{
    $token = isset($contact['unsubscribe_token']) ? (string)$contact['unsubscribe_token'] : '';
    return marketing_tracking_base_url() . '/api/marketing/unsubscribe?token=' . rawurlencode($token);
}

function marketing_build_email_html(array $campaign, array $contact, array $recipient): string
{
    $content = isset($campaign['email_content']) ? (string)$campaign['email_content'] : '';
    $templateId = isset($campaign['email_template_id']) ? (int)$campaign['email_template_id'] : 0;
    if ($templateId > 0) {
        $tpl = mkt_one('SELECT * FROM marketing_email_templates WHERE id = ? AND is_active = 1 LIMIT 1', [$templateId]);
        if (is_array($tpl)) {
            if (isset($tpl['html_content']) && trim((string)$tpl['html_content']) !== '') {
                $content = (string)$tpl['html_content'];
            } elseif (isset($tpl['content']) && trim((string)$tpl['content']) !== '') {
                $content = (string)$tpl['content'];
            }
        }
    }
    $html = marketing_personalize($content, $contact);
    $rid = isset($recipient['id']) ? (int)$recipient['id'] : 0;
    $pixel = '<img src="' . htmlspecialchars(marketing_track_url('open', $rid), ENT_QUOTES, 'UTF-8') . '" alt="" width="1" height="1" style="display:none;width:1px;height:1px;border:0;" />';
    $company = (string)marketing_setting_get('smtp_from_name', '');
    if ($company === '') {
        $company = (string)marketing_setting_get('site_title', '');
    }
    $unsubscribe = marketing_unsubscribe_url($contact);
    $footer = '<div style="margin-top:24px;padding-top:16px;border-top:1px solid #ddd;font-size:12px;color:#666;line-height:1.5;">'
        . '<div>' . htmlspecialchars($company, ENT_QUOTES, 'UTF-8') . '</div>'
        . '<div><a href="' . htmlspecialchars($unsubscribe, ENT_QUOTES, 'UTF-8') . '">Unsubscribe</a></div>'
        . '</div>';
    if (stripos($html, '</body>') !== false) {
        $html = preg_replace('/<\/body>/i', $footer . $pixel . '</body>', $html, 1);
    } else {
        $html .= $footer . $pixel;
    }
    return $html;
}

function marketing_email_setting(string $key, $default = '')
{
    return marketing_setting_effective($key, $default);
}

function marketing_gmail_log_text($value): string
{
    $text = (string)$value;
    $text = preg_replace('/[\r\n\t]+/', ' ', $text) ?? $text;
    $text = preg_replace('/[^\x20-\x7E]/', '?', $text) ?? $text;
    return substr($text, 0, 1200);
}

function marketing_gmail_log(string $stage, bool $ok, array $context = []): void
{
    $dir = dirname(__DIR__) . '/logs';
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    $safeContext = [];
    foreach ($context as $key => $value) {
        $safeContext[(string)$key] = is_scalar($value) ? marketing_gmail_log_text($value) : '';
    }
    $line = json_encode([
        'time' => date('c'),
        'stage' => $stage,
        'ok' => $ok,
        'context' => $safeContext
    ], JSON_UNESCAPED_SLASHES);
    @error_log($line . PHP_EOL, 3, $dir . '/marketing-gmail.log');
}

function marketing_gmail_config_fingerprint(array $config): string
{
    return substr(hash('sha256', $config['client_id'] . '|' . $config['refresh_token']), 0, 12);
}

function marketing_gmail_parse_error($response, int $code): array
{
    $raw = marketing_gmail_log_text($response);
    $decoded = json_decode((string)$response, true);
    $error = '';
    $description = '';
    if (is_array($decoded)) {
        $errorNode = isset($decoded['error']) ? $decoded['error'] : '';
        if (is_array($errorNode)) {
            $error = isset($errorNode['status']) ? (string)$errorNode['status'] : (isset($errorNode['message']) ? (string)$errorNode['message'] : '');
            $description = isset($errorNode['message']) ? (string)$errorNode['message'] : '';
        } else {
            $error = (string)$errorNode;
            $description = isset($decoded['error_description']) ? (string)$decoded['error_description'] : '';
        }
        if ($description === '' && isset($decoded['message'])) {
            $description = (string)$decoded['message'];
        }
    }
    if ($description === '') {
        $description = trim(strip_tags($raw));
    }
    return [
        'code' => $code,
        'error' => $error,
        'description' => $description,
        'raw' => $raw
    ];
}

function marketing_gmail_safe_error(string $stage, array $parsed): string
{
    $code = isset($parsed['code']) ? (int)$parsed['code'] : 0;
    $error = strtolower((string)(isset($parsed['error']) ? $parsed['error'] : ''));
    $description = strtolower((string)(isset($parsed['description']) ? $parsed['description'] : ''));
    $needle = $error . ' ' . $description;
    if ($stage === 'refresh_token' || $stage === 'test_connection') {
        if (strpos($needle, 'invalid_client') !== false || strpos($needle, 'unauthorized_client') !== false || strpos($needle, 'invalid_grant') !== false) {
            return 'Kredensial Gmail tidak cocok atau refresh token sudah tidak berlaku. Buat ulang token dengan Client ID dan Client Secret yang sama persis.';
        }
        if ($code === 400) {
            return 'Permintaan OAuth Gmail tidak valid. Periksa Client ID, Client Secret, dan Refresh Token.';
        }
        if ($code === 401 || $code === 403) {
            return 'Google menolak otorisasi Gmail. Periksa OAuth Client, akun Gmail, dan scope gmail.send.';
        }
        return 'Gagal menghubungi layanan OAuth Google. Periksa koneksi HTTPS server lalu coba lagi.';
    }
    if ($stage === 'gmail_api' || $stage === 'send_email') {
        if ($code === 401 || strpos($needle, 'invalid authentication credentials') !== false || strpos($needle, 'invalid credentials') !== false) {
            return 'Access Token Gmail tidak valid atau kedaluwarsa. Sistem akan memperbarui token otomatis; silakan coba lagi.';
        }
        if ($code === 403 || strpos($needle, 'insufficient permission') !== false || strpos($needle, 'forbidden') !== false) {
            return 'Akses Gmail ditolak. Pastikan OAuth Client memiliki scope gmail.send dan akun Gmail diizinkan.';
        }
        if ($code === 404) {
            return 'Akun Gmail tujuan tidak ditemukan. Periksa GMAIL_USER.';
        }
        if ($code === 429 || strpos($needle, 'quota') !== false || strpos($needle, 'rate limit') !== false) {
            return 'Kuota Gmail API habis. Tunggu beberapa saat lalu coba lagi.';
        }
        return 'Gagal mengirim email melalui Gmail API. Detail kegagalan tersimpan di log backend.';
    }
    return 'Gagal memproses autentikasi Gmail. Detail kegagalan tersimpan di log backend.';
}

function marketing_gmail_config(): array
{
    $user = trim((string)marketing_email_setting('gmail_user', ''));
    if ($user === '') {
        $fromEmail = trim((string)marketing_email_setting('smtp_from_email', ''));
        $user = $fromEmail !== '' ? $fromEmail : trim((string)marketing_email_setting('smtp_user', ''));
    }
    $config = [
        'client_id' => trim((string)marketing_email_setting('gmail_client_id', '')),
        'client_secret' => trim((string)marketing_email_setting('gmail_client_secret', '')),
        'refresh_token' => trim((string)marketing_email_setting('gmail_refresh_token', '')),
        'user' => $user
    ];
    $error = '';
    if ($config['client_id'] === '') {
        $error = 'Gmail Client ID belum dikonfigurasi';
    } elseif ($config['client_secret'] === '') {
        $error = 'Gmail Client Secret belum dikonfigurasi';
    } elseif ($config['refresh_token'] === '') {
        $error = 'Gmail Refresh Token belum dikonfigurasi';
    } elseif ($config['user'] === '' || !filter_var($config['user'], FILTER_VALIDATE_EMAIL)) {
        $error = 'Akun Gmail belum dikonfigurasi';
    } elseif (hash_equals($config['refresh_token'], $config['client_id'])) {
        $error = 'Refresh Token tidak valid. Isi dengan refresh token OAuth, bukan Client ID.';
    } elseif (hash_equals($config['refresh_token'], $config['client_secret'])) {
        $error = 'Refresh Token tidak valid. Isi dengan refresh token OAuth, bukan Client Secret.';
    } elseif (!preg_match('/\.apps\.googleusercontent\.com$/i', $config['client_id'])) {
        $error = 'Format Gmail Client ID tidak dikenali. Gunakan OAuth Client ID dari Google Cloud.';
    }
    $config['error'] = $error;
    if ($error !== '') {
        marketing_gmail_log('config', false, [
            'reason' => $error,
            'config' => marketing_gmail_config_fingerprint($config),
            'client_id_set' => $config['client_id'] !== '' ? '1' : '0',
            'client_secret_set' => $config['client_secret'] !== '' ? '1' : '0',
            'refresh_token_set' => $config['refresh_token'] !== '' ? '1' : '0'
        ]);
    }
    return $config;
}

function marketing_gmail_access_token(array $config, bool $force = false): array
{
    static $cache = ['key' => '', 'token' => '', 'expires_at' => 0];
    $key = marketing_gmail_config_fingerprint($config);
    if (!$force && $cache['key'] === $key && $cache['token'] !== '' && $cache['expires_at'] > (time() + 60)) {
        marketing_gmail_log('access_token', true, ['source' => 'cache', 'config' => $key]);
        return ['ok' => true, 'token' => $cache['token'], 'error' => ''];
    }
    if ($config['error'] !== '') {
        return ['ok' => false, 'token' => '', 'error' => $config['error']];
    }
    $ch = curl_init('https://oauth2.googleapis.com/token');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POSTFIELDS => http_build_query([
            'client_id' => $config['client_id'],
            'client_secret' => $config['client_secret'],
            'refresh_token' => $config['refresh_token'],
            'grant_type' => 'refresh_token',
            'scope' => 'https://www.googleapis.com/auth/gmail.send',
        ], '', '&', PHP_QUERY_RFC3986),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/x-www-form-urlencoded',
            'Accept: application/json',
        ],
        CURLOPT_TIMEOUT => 20,
    ]);
    $resp = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    $parsed = marketing_gmail_parse_error($resp, $code);
    if ($curlError !== '') {
        $parsed['error'] = 'curl_error';
        $parsed['description'] = $curlError;
        $parsed['raw'] = $curlError;
    }
    $decoded = json_decode((string)$resp, true);
    $token = is_array($decoded) && isset($decoded['access_token']) ? trim((string)$decoded['access_token']) : '';
    $expiresIn = is_array($decoded) && isset($decoded['expires_in']) ? (int)$decoded['expires_in'] : 3600;
    if ($code >= 200 && $code < 300 && $token !== '') {
        $cache = [
            'key' => $key,
            'token' => $token,
            'expires_at' => time() + max(60, $expiresIn),
        ];
        marketing_gmail_log('access_token', true, [
            'source' => 'refresh',
            'config' => $key,
            'http_code' => $code,
            'expires_in' => $expiresIn
        ]);
        return ['ok' => true, 'token' => $token, 'error' => ''];
    }
    $cache = ['key' => '', 'token' => '', 'expires_at' => 0];
    marketing_gmail_log('refresh_token', false, [
        'config' => $key,
        'http_code' => $code,
        'google_error' => $parsed['error'],
        'google_description' => $parsed['description'],
        'google_response' => $parsed['raw']
    ]);
    return ['ok' => false, 'token' => '', 'error' => marketing_gmail_safe_error('refresh_token', $parsed)];
}

function marketing_gmail_api_request(string $token, string $method, string $url, $body = null): array
{
    $headers = ['Authorization: Bearer ' . $token, 'Accept: application/json'];
    if ($body !== null) {
        $headers[] = 'Content-Type: application/json';
    }
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 30,
    ]);
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
    $resp = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    if ($curlError !== '') {
        marketing_gmail_log('gmail_api', false, [
            'endpoint' => $url,
            'http_code' => $code,
            'google_error' => 'curl_error',
            'google_description' => $curlError
        ]);
        return ['ok' => false, 'data' => [], 'error' => 'Gagal menghubungi Gmail API.', 'http_code' => $code];
    }
    $decoded = json_decode((string)$resp, true);
    if ($code >= 200 && $code < 300) {
        marketing_gmail_log('gmail_api', true, ['endpoint' => $url, 'http_code' => $code]);
        return ['ok' => true, 'data' => is_array($decoded) ? $decoded : [], 'error' => '', 'http_code' => $code];
    }
    $parsed = marketing_gmail_parse_error($resp, $code);
    marketing_gmail_log('gmail_api', false, [
        'endpoint' => $url,
        'http_code' => $code,
        'google_error' => $parsed['error'],
        'google_description' => $parsed['description'],
        'google_response' => $parsed['raw']
    ]);
    return ['ok' => false, 'data' => [], 'error' => marketing_gmail_safe_error('gmail_api', $parsed), 'http_code' => $code];
}

function marketing_gmail_authenticated_request(array $config, string $method, string $url, $body = null): array
{
    $token = marketing_gmail_access_token($config);
    if (empty($token['ok'])) {
        return ['ok' => false, 'data' => [], 'error' => (string)$token['error'], 'http_code' => 0];
    }
    $result = marketing_gmail_api_request((string)$token['token'], $method, $url, $body);
    if (!empty($result['ok']) || (int)(isset($result['http_code']) ? $result['http_code'] : 0) !== 401) {
        return $result;
    }
    marketing_gmail_log('gmail_api', false, ['event' => 'access_token_retry', 'endpoint' => $url]);
    $token = marketing_gmail_access_token($config, true);
    if (empty($token['ok'])) {
        return ['ok' => false, 'data' => [], 'error' => (string)$token['error'], 'http_code' => 401];
    }
    return marketing_gmail_api_request((string)$token['token'], $method, $url, $body);
}

function marketing_gmail_send(array $campaign, array $contact, array $recipient, string $fromEmail, string $fromName, string $subject, string $html): array
{
    $config = marketing_gmail_config();
    if ($config['error'] !== '') {
        return ['ok' => false, 'message_id' => '', 'error' => $config['error']];
    }
    $autoload = __DIR__ . '/../vendor/autoload.php';
    if (file_exists($autoload)) {
        require_once $autoload;
    }
    if (!class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
        marketing_gmail_log('send_email', false, ['reason' => 'PHPMailer tidak tersedia']);
        return ['ok' => false, 'message_id' => '', 'error' => 'PHPMailer tidak tersedia. Jalankan composer install di server'];
    }
    try {
        $to = trim((string)(isset($contact['email']) ? $contact['email'] : ''));
        $rid = isset($recipient['id']) ? (int)$recipient['id'] : 0;
        $mail = new PHPMailer\PHPMailer\PHPMailer(true);
        $mail->CharSet = 'UTF-8';
        $mail->setFrom($fromEmail, $fromName !== '' ? $fromName : $fromEmail);
        $mail->addAddress($to, (string)(isset($contact['name']) ? $contact['name'] : ''));
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body = $html;
        $mail->AltBody = trim(strip_tags(preg_replace('/<br\s*\/?>/i', "\n", $html)));
        $mail->addCustomHeader('X-Marketing-Recipient', (string)$rid);
        $mail->MessageID = '<' . marketing_uuid() . '@gmail.com>';
        if (!$mail->preSend()) {
            $reason = trim((string)$mail->ErrorInfo) ?: 'Gagal menyusun email';
            marketing_gmail_log('send_email', false, ['reason' => $reason, 'recipient_id' => $rid]);
            return ['ok' => false, 'message_id' => '', 'error' => 'Gagal menyusun email. Detail kegagalan tersimpan di log backend.'];
        }
        $raw = $mail->getSentMIMEMessage();
        $payload = json_encode([
            'raw' => rtrim(strtr(base64_encode($raw), '+/', '-_'), '='),
        ], JSON_UNESCAPED_SLASHES);
        $result = marketing_gmail_authenticated_request($config, 'POST', 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send', $payload);
        if (empty($result['ok'])) {
            marketing_gmail_log('send_email', false, [
                'reason' => 'gmail_api_error',
                'recipient_id' => $rid,
                'http_code' => isset($result['http_code']) ? $result['http_code'] : 0
            ]);
            return ['ok' => false, 'message_id' => '', 'error' => (string)$result['error']];
        }
        $messageId = isset($result['data']['id']) ? (string)$result['data']['id'] : ('gmail_' . marketing_uuid());
        marketing_gmail_log('send_email', true, [
            'recipient_id' => $rid,
            'http_code' => isset($result['http_code']) ? $result['http_code'] : 0,
            'message_id' => $messageId
        ]);
        return ['ok' => true, 'message_id' => $messageId, 'error' => ''];
    } catch (Throwable $e) {
        marketing_gmail_log('send_email', false, [
            'reason' => 'exception',
            'message' => $e->getMessage(),
            'recipient_id' => isset($recipient['id']) ? (int)$recipient['id'] : 0
        ]);
        return ['ok' => false, 'message_id' => '', 'error' => 'Gagal mengirim email. Detail kegagalan tersimpan di log backend.'];
    }
}

function marketing_test_gmail_connection(): array
{
    $config = marketing_gmail_config();
    $base = [
        'host' => 'gmail.googleapis.com',
        'port' => 443,
        'encryption' => 'HTTPS',
        'auth' => true,
        'username' => $config['user'],
        'password_saved' => $config['refresh_token'] !== ''
    ];
    if ($config['error'] !== '') {
        return array_merge($base, ['ok' => false, 'message' => $config['error'], 'error' => $config['error']]);
    }
    $token = marketing_gmail_access_token($config, true);
    if (empty($token['ok'])) {
        return array_merge($base, ['ok' => false, 'message' => (string)$token['error'], 'error' => (string)$token['error']]);
    }
    marketing_gmail_log('test_connection', true, ['config' => marketing_gmail_config_fingerprint($config)]);
    return array_merge($base, [
        'ok' => true,
        'message' => 'Koneksi Gmail API berhasil untuk ' . $config['user'],
        'error' => ''
    ]);
}

function marketing_smtp_config(): array
{
    $host = trim((string)marketing_email_setting('smtp_host', ''));
    $port = (int)marketing_email_setting('smtp_port', 465);
    $auth = marketing_bool(marketing_email_setting('smtp_auth', 1));
    $user = trim((string)marketing_email_setting('smtp_user', ''));
    $pass = (string)marketing_email_setting('smtp_pass', '');
    $encryption = strtolower(trim((string)marketing_email_setting('smtp_encryption', 'ssl')));
    if (in_array($encryption, ['ssl', 'smtps', 'ssl/tls'], true)) {
        $secure = 'ssl';
        $label = 'SSL/TLS';
    } elseif (in_array($encryption, ['tls', 'starttls'], true)) {
        $secure = 'tls';
        $label = 'STARTTLS';
    } else {
        $secure = '';
        $label = 'Tidak ada enkripsi';
    }
    if ($port <= 0) {
        $port = $secure === 'ssl' ? 465 : 587;
    }
    $error = '';
    if ($host === '') {
        $error = 'SMTP host belum dikonfigurasi';
    } elseif ($auth && $user === '') {
        $error = 'SMTP username belum dikonfigurasi';
    } elseif ($auth && $pass === '') {
        $error = 'SMTP password belum dikonfigurasi. Simpan password melalui halaman Pengaturan atau env SMTP_PASS';
    }
    return [
        'host' => $host,
        'port' => $port,
        'auth' => $auth,
        'user' => $user,
        'pass' => $pass,
        'encryption' => $secure,
        'encryption_label' => $label,
        'error' => $error
    ];
}

function marketing_smtp_status(): array
{
    $provider = trim((string)marketing_email_setting('email_provider', 'smtp'));
    if ($provider === 'gmail') {
        $gmail = marketing_gmail_config();
        $lastOk = trim((string)marketing_setting_get('smtp_status_ok', ''));
        $lastMessage = trim((string)marketing_setting_get('smtp_status_message', ''));
        $lastAt = trim((string)marketing_setting_get('smtp_status_at', ''));
        $configured = $gmail['client_id'] !== '' && $gmail['client_secret'] !== '' && $gmail['refresh_token'] !== '' && $gmail['user'] !== '';
        if (!$configured) {
            $state = 'not_configured';
            $label = 'Belum dikonfigurasi';
        } elseif ($lastOk === '') {
            $state = 'not_tested';
            $label = 'Belum diuji';
        } elseif (marketing_bool($lastOk)) {
            $state = 'connected';
            $label = 'Terhubung';
        } else {
            $state = 'failed';
            $label = 'Gagal terhubung';
        }
        return [
            'provider' => 'gmail',
            'host' => 'gmail.googleapis.com',
            'port' => 443,
            'encryption' => 'HTTPS',
            'auth' => true,
            'username' => $gmail['user'],
            'from_name' => trim((string)marketing_email_setting('smtp_from_name', '')),
            'from_email' => trim((string)marketing_email_setting('smtp_from_email', '')),
            'password_saved' => $gmail['refresh_token'] !== '',
            'configured' => $configured,
            'state' => $state,
            'label' => $label,
            'message' => $lastMessage,
            'last_tested_at' => $lastAt,
            'last_test_ok' => $lastOk === '' ? null : marketing_bool($lastOk)
        ];
    }
    $config = marketing_smtp_config();
    $lastOk = trim((string)marketing_setting_get('smtp_status_ok', ''));
    $lastMessage = trim((string)marketing_setting_get('smtp_status_message', ''));
    $lastAt = trim((string)marketing_setting_get('smtp_status_at', ''));
    $configured = $config['host'] !== '' && (!$config['auth'] || ($config['user'] !== '' && $config['pass'] !== ''));
    if (!$configured) {
        $state = 'not_configured';
        $label = 'Belum dikonfigurasi';
    } elseif ($lastOk === '') {
        $state = 'not_tested';
        $label = 'Belum diuji';
    } elseif (marketing_bool($lastOk)) {
        $state = 'connected';
        $label = 'Terhubung';
    } else {
        $state = 'failed';
        $label = 'Gagal terhubung';
    }
    return [
        'provider' => $provider,
        'host' => $config['host'],
        'port' => $config['port'],
        'encryption' => $config['encryption_label'],
        'auth' => $config['auth'],
        'username' => $config['user'],
        'from_name' => trim((string)marketing_email_setting('smtp_from_name', '')),
        'from_email' => trim((string)marketing_email_setting('smtp_from_email', '')),
        'password_saved' => $config['pass'] !== '',
        'configured' => $configured,
        'state' => $state,
        'label' => $label,
        'message' => $lastMessage,
        'last_tested_at' => $lastAt,
        'last_test_ok' => $lastOk === '' ? null : marketing_bool($lastOk)
    ];
}

function marketing_smtp_save_status($ok, string $message): array
{
    marketing_setting_set('smtp_status_ok', $ok ? '1' : '0');
    marketing_setting_set('smtp_status_message', substr($message, 0, 500));
    marketing_setting_set('smtp_status_at', date('Y-m-d H:i:s'));
    return marketing_smtp_status();
}

function marketing_smtp_reset_status(): void
{
    marketing_setting_set('smtp_status_ok', '');
    marketing_setting_set('smtp_status_message', 'Konfigurasi berubah. Uji ulang koneksi email.');
    marketing_setting_set('smtp_status_at', '');
}

function marketing_smtp_error_hint(string $error, array $config): string
{
    $hints = [];
    if (stripos($error, 'could not connect') !== false || stripos($error, 'connection refused') !== false || stripos($error, 'timed out') !== false || stripos($error, 'timeout') !== false) {
        $hints[] = 'Periksa koneksi jaringan/firewall ke host:port dan pastikan SMTP mengizinkan IP server ini.';
    }
    if (stripos($error, 'auth') !== false || stripos($error, 'login') !== false || stripos($error, '535') !== false) {
        $hints[] = 'Periksa username dan password SMTP.';
    }
    if (stripos($error, 'certificate') !== false || stripos($error, 'ssl') !== false || stripos($error, 'tls') !== false) {
        $hints[] = 'Periksa pengaturan enkripsi dan sertifikat SSL/TLS.';
    }
    if ((int)$config['port'] === 465 && $config['encryption'] === 'tls') {
        $hints[] = 'Port 465 umumnya memakai SSL/TLS, bukan STARTTLS.';
    }
    if ((int)$config['port'] === 587 && $config['encryption'] === 'ssl') {
        $hints[] = 'Port 587 umumnya memakai STARTTLS, bukan SSL/TLS.';
    }
    return $hints === [] ? $error : $error . ' Petunjuk: ' . implode(' ', $hints);
}

function marketing_test_smtp_connection(): array
{
    $provider = trim((string)marketing_email_setting('email_provider', 'smtp'));
    if ($provider === 'gmail') {
        return marketing_test_gmail_connection();
    }
    $config = marketing_smtp_config();
    $base = [
        'host' => $config['host'],
        'port' => $config['port'],
        'encryption' => $config['encryption_label'],
        'auth' => $config['auth'],
        'username' => $config['user'],
        'password_saved' => $config['pass'] !== ''
    ];
    $provider = trim((string)marketing_email_setting('email_provider', 'smtp'));
    if ($provider !== '' && $provider !== 'smtp') {
        return array_merge($base, [
            'ok' => false,
            'message' => 'Provider email aktif bukan SMTP. Pilih SMTP untuk menggunakan koneksi ini.',
            'error' => 'Provider email aktif bukan SMTP'
        ]);
    }
    if ($config['error'] !== '') {
        return array_merge($base, ['ok' => false, 'message' => $config['error'], 'error' => $config['error']]);
    }
    $autoload = __DIR__ . '/../vendor/autoload.php';
    if (!file_exists($autoload)) {
        return array_merge($base, [
            'ok' => false,
            'message' => 'PHPMailer tidak ditemukan. Jalankan composer install di server.',
            'error' => 'PHPMailer tidak ditemukan'
        ]);
    }
    require_once $autoload;
    if (!class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
        return array_merge($base, [
            'ok' => false,
            'message' => 'PHPMailer tidak tersedia. Jalankan composer install di server.',
            'error' => 'PHPMailer tidak tersedia'
        ]);
    }
    try {
        $mail = new PHPMailer\PHPMailer\PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = $config['host'];
        $mail->Port = $config['port'];
        $mail->SMTPAuth = $config['auth'];
        if ($config['auth']) {
            $mail->Username = $config['user'];
            $mail->Password = $config['pass'];
        }
        $mail->Timeout = 15;
        $mail->SMTPDebug = 0;
        if ($config['encryption'] === 'ssl') {
            $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
        } elseif ($config['encryption'] === 'tls') {
            $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
        } else {
            $mail->SMTPSecure = '';
            $mail->SMTPAutoTLS = false;
        }
        $mail->CharSet = 'UTF-8';
        $fromEmail = trim((string)marketing_email_setting('smtp_from_email', ''));
        if ($fromEmail === '' || !filter_var($fromEmail, FILTER_VALIDATE_EMAIL)) {
            $fromEmail = $config['user'] !== '' ? $config['user'] : 'no-reply@localhost';
        }
        $mail->setFrom($fromEmail, trim((string)marketing_email_setting('smtp_from_name', '')));
        $connected = $mail->smtpConnect();
        if ($connected) {
            $mail->smtpClose();
            $message = 'Koneksi SMTP berhasil ke ' . $config['host'] . ':' . $config['port'] . ' (' . $config['encryption_label'] . ')';
            return array_merge($base, ['ok' => true, 'message' => $message, 'error' => '']);
        }
        $error = trim((string)$mail->ErrorInfo);
        if ($error === '') {
            $error = 'Gagal terhubung ke server SMTP';
        }
        $error = marketing_smtp_error_hint($error, $config);
        return array_merge($base, ['ok' => false, 'message' => $error, 'error' => $error]);
    } catch (Throwable $e) {
        $error = marketing_smtp_error_hint($e->getMessage(), $config);
        return array_merge($base, ['ok' => false, 'message' => $error, 'error' => $error]);
    }
}

function marketing_build_raw_email(string $fromEmail, string $fromName, string $toEmail, string $toName, string $subject, string $html, int $rid): string
{
    $boundary = 'b_' . bin2hex(random_bytes(8));
    $alt = trim(strip_tags(preg_replace('/<br\s*\/?>/i', "\n", $html)));
    $from = $fromName !== '' ? '=?UTF-8?B?' . base64_encode($fromName) . '?= <' . $fromEmail . '>' : $fromEmail;
    $to = $toName !== '' ? '=?UTF-8?B?' . base64_encode($toName) . '?= <' . $toEmail . '>' : $toEmail;
    $sub = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $headers = [];
    $headers[] = 'From: ' . $from;
    $headers[] = 'To: ' . $to;
    $headers[] = 'Subject: ' . $sub;
    $headers[] = 'MIME-Version: 1.0';
    $headers[] = 'X-Marketing-Recipient: ' . (string)$rid;
    $headers[] = 'Content-Type: multipart/alternative; boundary="' . $boundary . '"';
    $body = "--{$boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n";
    $body .= chunk_split(base64_encode($alt)) . "\r\n";
    $body .= "--{$boundary}\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n";
    $body .= chunk_split(base64_encode($html)) . "\r\n";
    $body .= "--{$boundary}--";
    return implode("\r\n", $headers) . "\r\n\r\n" . $body;
}

function marketing_aws_sigv4(string $method, string $service, string $region, string $host, string $uri, string $query, array $headers, string $payload, string $accessKey, string $secretKey): array
{
    $amzDate = gmdate('Ymd\THis\Z');
    $dateStamp = gmdate('Ymd');
    $canonicalHeaders = '';
    $signedHeadersArr = [];
    $lowerHeaders = [];
    foreach ($headers as $k => $v) {
        $lk = strtolower($k);
        $lowerHeaders[$lk] = trim(preg_replace('/\s+/', ' ', (string)$v));
    }
    ksort($lowerHeaders);
    foreach ($lowerHeaders as $k => $v) {
        $canonicalHeaders .= $k . ':' . $v . "\n";
        $signedHeadersArr[] = $k;
    }
    $signedHeaders = implode(';', $signedHeadersArr);
    $payloadHash = hash('sha256', $payload);
    $canonicalRequest = $method . "\n" . $uri . "\n" . $query . "\n" . $canonicalHeaders . "\n" . $signedHeaders . "\n" . $payloadHash;
    $algorithm = 'AWS4-HMAC-SHA256';
    $credentialScope = $dateStamp . '/' . $region . '/' . $service . '/aws4_request';
    $stringToSign = $algorithm . "\n" . $amzDate . "\n" . $credentialScope . "\n" . hash('sha256', $canonicalRequest);
    $kDate = hash_hmac('sha256', $dateStamp, 'AWS4' . $secretKey, true);
    $kRegion = hash_hmac('sha256', $region, $kDate, true);
    $kService = hash_hmac('sha256', $service, $kRegion, true);
    $kSigning = hash_hmac('sha256', 'aws4_request', $kService, true);
    $signature = hash_hmac('sha256', $stringToSign, $kSigning);
    $authorization = $algorithm . ' Credential=' . $accessKey . '/' . $credentialScope . ', SignedHeaders=' . $signedHeaders . ', Signature=' . $signature;
    $out = [];
    foreach ($headers as $k => $v) {
        $out[] = $k . ': ' . $v;
    }
    $out[] = 'Authorization: ' . $authorization;
    return $out;
}

function marketing_ses_send_raw(string $accessKey, string $secretKey, string $region, string $raw): array
{
    $host = 'email.' . $region . '.amazonaws.com';
    $uri = '/';
    $query = '';
    $params = http_build_query([
        'Action' => 'SendRawEmail',
        'Version' => '2010-12-01',
        'RawMessage.Data' => base64_encode($raw),
    ], '', '&', PHP_QUERY_RFC3986);
    $headers = [
        'Host' => $host,
        'Content-Type' => 'application/x-www-form-urlencoded',
        'X-Amz-Date' => gmdate('Ymd\THis\Z'),
    ];
    $signed = marketing_aws_sigv4('POST', 'ses', $region, $host, $uri, $query, $headers, $params, $accessKey, $secretKey);
    $ch = curl_init('https://' . $host . $uri);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $signed,
        CURLOPT_POSTFIELDS => $params,
        CURLOPT_TIMEOUT => 30,
    ]);
    $resp = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($err !== '') {
        return ['ok' => false, 'message_id' => '', 'error' => $err];
    }
    if ($code >= 200 && $code < 300) {
        $messageId = '';
        if (preg_match('/<MessageId>([^<]+)<\/MessageId>/', (string)$resp, $m)) {
            $messageId = (string)$m[1];
        }
        return ['ok' => true, 'message_id' => $messageId, 'error' => ''];
    }
    $detail = trim(strip_tags((string)$resp));
    return ['ok' => false, 'message_id' => '', 'error' => 'SES error ' . $code . ($detail ? ': ' . $detail : '')];
}

function marketing_send_email(array $campaign, array $contact, array $recipient): array
{
    $provider = strtolower(trim((string)marketing_email_setting('email_provider', 'smtp')));
    if ($provider === '') {
        $provider = 'smtp';
    }
    $to = trim((string)(isset($contact['email']) ? $contact['email'] : ''));
    $subject = marketing_personalize((string)(isset($campaign['email_subject']) ? $campaign['email_subject'] : ''), $contact);
    $html = marketing_build_email_html($campaign, $contact, $recipient);
    $fromEmail = trim((string)marketing_email_setting('smtp_from_email', ''));
    $fromName = trim((string)marketing_email_setting('smtp_from_name', ''));
    $rid = isset($recipient['id']) ? (int)$recipient['id'] : 0;

    try {
        if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
            return ['ok' => false, 'message_id' => '', 'error' => 'Invalid recipient email'];
        }
        if ($fromEmail === '' || !filter_var($fromEmail, FILTER_VALIDATE_EMAIL)) {
            $fromEmail = trim((string)marketing_email_setting('gmail_user', ''));
        }
        if ($fromEmail === '' || !filter_var($fromEmail, FILTER_VALIDATE_EMAIL)) {
            $fromEmail = 'no-reply@localhost';
        }

        if ($provider === 'gmail') {
            return marketing_gmail_send($campaign, $contact, $recipient, $fromEmail, $fromName, $subject, $html);
        }

        if ($provider === 'sendgrid') {
            $apiKey = trim((string)marketing_email_setting('sendgrid_api_key', ''));
            if ($apiKey === '') {
                return ['ok' => false, 'message_id' => '', 'error' => 'SendGrid API key missing'];
            }
            $payload = [
                'personalizations' => [[
                    'to' => [['email' => $to, 'name' => (string)(isset($contact['name']) ? $contact['name'] : $to)]],
                    'subject' => $subject,
                ]],
                'from' => ['email' => $fromEmail, 'name' => $fromName !== '' ? $fromName : $fromEmail],
                'subject' => $subject,
                'content' => [['type' => 'text/html', 'value' => $html]],
                'custom_args' => ['recipient_id' => (string)$rid],
            ];
            $headersResp = [];
            $ch = curl_init('https://api.sendgrid.com/v3/mail/send');
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HEADERFUNCTION => function ($curl, $header) use (&$headersResp) {
                    $len = strlen($header);
                    $parts = explode(':', $header, 2);
                    if (count($parts) === 2) {
                        $headersResp[strtolower(trim($parts[0]))] = trim($parts[1]);
                    }
                    return $len;
                },
                CURLOPT_HTTPHEADER => [
                    'Authorization: Bearer ' . $apiKey,
                    'Content-Type: application/json',
                ],
                CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                CURLOPT_TIMEOUT => 30,
            ]);
            $resp = curl_exec($ch);
            $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $err = curl_error($ch);
            curl_close($ch);
            if ($err !== '') {
                return ['ok' => false, 'message_id' => '', 'error' => $err];
            }
            if ($code >= 200 && $code < 300) {
                $messageId = isset($headersResp['x-message-id']) ? (string)$headersResp['x-message-id'] : ('sg_' . marketing_uuid());
                return ['ok' => true, 'message_id' => $messageId, 'error' => ''];
            }
            $decoded = json_decode((string)$resp, true);
            $detail = is_array($decoded) ? json_encode($decoded, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : (string)$resp;
            return ['ok' => false, 'message_id' => '', 'error' => 'SendGrid error ' . $code . ($detail ? ': ' . $detail : '')];
        }

        if ($provider === 'brevo') {
            $apiKey = trim((string)marketing_email_setting('brevo_api_key', ''));
            if ($apiKey === '') {
                return ['ok' => false, 'message_id' => '', 'error' => 'Brevo API key missing'];
            }
            $payload = [
                'sender' => ['email' => $fromEmail, 'name' => $fromName !== '' ? $fromName : $fromEmail],
                'to' => [['email' => $to, 'name' => (string)(isset($contact['name']) ? $contact['name'] : $to)]],
                'subject' => $subject,
                'htmlContent' => $html,
                'headers' => ['X-Marketing-Recipient' => (string)$rid],
            ];
            $ch = curl_init('https://api.brevo.com/v3/smtp/email');
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER => [
                    'api-key: ' . $apiKey,
                    'Content-Type: application/json',
                    'accept: application/json',
                ],
                CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                CURLOPT_TIMEOUT => 30,
            ]);
            $resp = curl_exec($ch);
            $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $err = curl_error($ch);
            curl_close($ch);
            if ($err !== '') {
                return ['ok' => false, 'message_id' => '', 'error' => $err];
            }
            $decoded = json_decode((string)$resp, true);
            if ($code >= 200 && $code < 300) {
                $messageId = is_array($decoded) && isset($decoded['messageId']) ? (string)$decoded['messageId'] : ('brevo_' . marketing_uuid());
                return ['ok' => true, 'message_id' => $messageId, 'error' => ''];
            }
            $detail = is_array($decoded) ? json_encode($decoded, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : (string)$resp;
            return ['ok' => false, 'message_id' => '', 'error' => 'Brevo error ' . $code . ($detail ? ': ' . $detail : '')];
        }

        if ($provider === 'ses') {
            $accessKey = trim((string)marketing_email_setting('aws_access_key_id', ''));
            $secretKey = trim((string)marketing_email_setting('aws_secret_access_key', ''));
            $region = trim((string)marketing_email_setting('aws_region', 'us-east-1'));
            if ($accessKey === '' || $secretKey === '' || $region === '') {
                return ['ok' => false, 'message_id' => '', 'error' => 'AWS SES credentials missing'];
            }
            $raw = marketing_build_raw_email($fromEmail, $fromName, $to, (string)(isset($contact['name']) ? $contact['name'] : ''), $subject, $html, $rid);
            $result = marketing_ses_send_raw($accessKey, $secretKey, $region, $raw);
            if (!empty($result['ok'])) {
                return ['ok' => true, 'message_id' => (string)$result['message_id'], 'error' => ''];
            }
            return ['ok' => false, 'message_id' => '', 'error' => (string)(isset($result['error']) ? $result['error'] : 'SES error')];
        }

        $config = marketing_smtp_config();
        if ($config['error'] !== '') {
            return ['ok' => false, 'message_id' => '', 'error' => $config['error']];
        }
        $autoload = __DIR__ . '/../vendor/autoload.php';
        if (file_exists($autoload)) {
            require_once $autoload;
        }
        if (!class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
            return ['ok' => false, 'message_id' => '', 'error' => 'PHPMailer tidak tersedia. Jalankan composer install di server'];
        }
        $mail = new PHPMailer\PHPMailer\PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = $config['host'];
        $mail->Port = $config['port'];
        $mail->SMTPAuth = $config['auth'];
        $mail->Username = $config['user'];
        $mail->Password = $config['pass'];
        $mail->Timeout = 15;
        if ($config['encryption'] === 'ssl') {
            $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
        } elseif ($config['encryption'] === 'tls') {
            $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
        } else {
            $mail->SMTPSecure = '';
            $mail->SMTPAutoTLS = false;
        }
        $mail->CharSet = 'UTF-8';
        $mail->setFrom($fromEmail, $fromName !== '' ? $fromName : $fromEmail);
        $mail->addAddress($to, (string)(isset($contact['name']) ? $contact['name'] : ''));
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body = $html;
        $mail->AltBody = trim(strip_tags(preg_replace('/<br\s*\/?>/i', "\n", $html)));
        $mail->addCustomHeader('X-Marketing-Recipient', (string)$rid);
        $mail->MessageID = '<' . marketing_uuid() . '@' . (preg_replace('/[^a-z0-9\.\-]/i', '', parse_url(marketing_tracking_base_url(), PHP_URL_HOST) ?: 'localhost')) . '>';
        $mail->send();
        $messageId = trim((string)$mail->getLastMessageID(), '<>');
        return ['ok' => true, 'message_id' => $messageId, 'error' => ''];
    } catch (Throwable $e) {
        return ['ok' => false, 'message_id' => '', 'error' => $e->getMessage()];
    }
}

function marketing_normalize_whatsapp(string $value): string
{
    $digits = preg_replace('/[^0-9]+/', '', $value);
    if ($digits === '') {
        return '';
    }
    if (strpos($digits, '0') === 0) {
        $digits = '62' . substr($digits, 1);
    }
    return $digits;
}

function marketing_send_whatsapp(array $campaign, array $contact, array $recipient): array
{
    try {
        $version = trim((string)marketing_email_setting('whatsapp_api_version', 'v21.0'));
        if ($version === '') {
            $version = 'v21.0';
        }
        $phoneId = trim((string)marketing_email_setting('whatsapp_phone_number_id', ''));
        $token = trim((string)marketing_email_setting('whatsapp_access_token', ''));
        if ($phoneId === '' || $token === '') {
            return ['ok' => false, 'message_id' => '', 'error' => 'WhatsApp credentials missing'];
        }
        $to = marketing_normalize_whatsapp((string)(isset($contact['whatsapp']) ? $contact['whatsapp'] : (isset($contact['phone']) ? $contact['phone'] : '')));
        if ($to === '') {
            return ['ok' => false, 'message_id' => '', 'error' => 'Invalid WhatsApp number'];
        }
        $payload = [
            'messaging_product' => 'whatsapp',
            'to' => $to,
        ];
        $templateId = isset($campaign['whatsapp_template_id']) ? (int)$campaign['whatsapp_template_id'] : 0;
        $personalizedText = marketing_personalize((string)(isset($campaign['whatsapp_content']) ? $campaign['whatsapp_content'] : ''), $contact);
        $recipientPayload = [];
        if (isset($recipient['payload']) && is_array($recipient['payload'])) {
            $recipientPayload = $recipient['payload'];
        } elseif (isset($recipient['payload']) && is_string($recipient['payload']) && $recipient['payload'] !== '') {
            $decoded = json_decode((string)$recipient['payload'], true);
            if (is_array($decoded)) {
                $recipientPayload = $decoded;
            }
        }

        if ($templateId > 0) {
            $tpl = mkt_one('SELECT * FROM marketing_whatsapp_templates WHERE id = ? LIMIT 1', [$templateId]);
            if (!is_array($tpl)) {
                return ['ok' => false, 'message_id' => '', 'error' => 'WhatsApp template not found'];
            }
            $components = [];
            if (isset($tpl['components']) && $tpl['components'] !== '') {
                $decoded = json_decode((string)$tpl['components'], true);
                if (is_array($decoded)) {
                    $components = $decoded;
                }
            }
            $lang = isset($tpl['language']) && (string)$tpl['language'] !== '' ? (string)$tpl['language'] : 'en_US';
            $payload['type'] = 'template';
            $payload['template'] = [
                'name' => (string)(isset($tpl['name']) ? $tpl['name'] : ''),
                'language' => ['code' => $lang],
                'components' => $components,
            ];
        } elseif (!empty($recipientPayload['media_type'])) {
            $mediaType = strtolower(trim((string)$recipientPayload['media_type']));
            if (in_array($mediaType, ['image', 'document', 'video', 'audio'], true)) {
                $media = [];
                if (!empty($recipientPayload['media_id'])) {
                    $media['id'] = (string)$recipientPayload['media_id'];
                } elseif (!empty($recipientPayload['media_link'])) {
                    $media['link'] = (string)$recipientPayload['media_link'];
                }
                if (in_array($mediaType, ['image', 'document', 'video'], true) && $personalizedText !== '') {
                    $media['caption'] = $personalizedText;
                }
                $payload['type'] = $mediaType;
                $payload[$mediaType] = $media;
            } else {
                $payload['type'] = 'text';
                $payload['text'] = ['preview_url' => false, 'body' => $personalizedText];
            }
        } else {
            $payload['type'] = 'text';
            $payload['text'] = ['preview_url' => false, 'body' => $personalizedText];
        }

        $url = 'https://graph.facebook.com/' . rawurlencode($version) . '/' . rawurlencode($phoneId) . '/messages';
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $token,
                'Content-Type: application/json',
            ],
            CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            CURLOPT_TIMEOUT => 30,
        ]);
        $resp = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);
        if ($err !== '') {
            return ['ok' => false, 'message_id' => '', 'error' => $err];
        }
        $decoded = json_decode((string)$resp, true);
        if ($code >= 200 && $code < 300 && is_array($decoded)) {
            $messageId = '';
            if (isset($decoded['messages'][0]['id'])) {
                $messageId = (string)$decoded['messages'][0]['id'];
            }
            return ['ok' => true, 'message_id' => $messageId, 'error' => ''];
        }
        $detail = is_array($decoded) ? json_encode($decoded, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : (string)$resp;
        return ['ok' => false, 'message_id' => '', 'error' => 'WhatsApp error ' . $code . ($detail ? ': ' . $detail : '')];
    } catch (Throwable $e) {
        return ['ok' => false, 'message_id' => '', 'error' => $e->getMessage()];
    }
}

function marketing_test_email(string $to): array
{
    try {
        $campaign = [
            'email_subject' => 'Test Email Marketing',
            'email_content' => '<html><body><p>Ini adalah email uji dari sistem marketing.</p></body></html>',
        ];
        $contact = ['email' => $to, 'name' => $to, 'unsubscribe_token' => marketing_uuid()];
        $recipient = ['id' => 0];
        $result = marketing_send_email($campaign, $contact, $recipient);
        if (!empty($result['ok'])) {
            return ['ok' => true, 'message' => 'Test email sent', 'message_id' => (string)($result['message_id'] ?? '')];
        }
        return ['ok' => false, 'message' => (string)($result['error'] ?? 'Failed to send test email')];
    } catch (Throwable $e) {
        return ['ok' => false, 'message' => $e->getMessage()];
    }
}

function marketing_test_whatsapp(): array
{
    try {
        $version = trim((string)marketing_email_setting('whatsapp_api_version', 'v21.0'));
        if ($version === '') {
            $version = 'v21.0';
        }
        $phoneId = trim((string)marketing_email_setting('whatsapp_phone_number_id', ''));
        $token = trim((string)marketing_email_setting('whatsapp_access_token', ''));
        if ($phoneId === '' || $token === '') {
            return ['ok' => false, 'error' => 'WhatsApp credentials missing'];
        }
        $url = 'https://graph.facebook.com/' . rawurlencode($version) . '/' . rawurlencode($phoneId) . '?fields=verified_name,display_phone_number,quality_rating';
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token],
            CURLOPT_TIMEOUT => 30,
        ]);
        $resp = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);
        if ($err !== '') {
            return ['ok' => false, 'error' => $err];
        }
        $decoded = json_decode((string)$resp, true);
        if ($code >= 200 && $code < 300 && is_array($decoded)) {
            return ['ok' => true, 'info' => $decoded];
        }
        $detail = is_array($decoded) ? json_encode($decoded, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : (string)$resp;
        return ['ok' => false, 'error' => 'WhatsApp error ' . $code . ($detail ? ': ' . $detail : '')];
    } catch (Throwable $e) {
        return ['ok' => false, 'error' => $e->getMessage()];
    }
}

function marketing_whatsapp_status_rank(string $status): int
{
    $map = ['pending' => 0, 'queued' => 1, 'sent' => 2, 'delivered' => 3, 'read' => 4, 'clicked' => 4, 'opened' => 3, 'failed' => 5, 'skipped' => 5];
    $s = strtolower(trim($status));
    return isset($map[$s]) ? $map[$s] : -1;
}

function marketing_process_whatsapp_webhook(array $payload): array
{
    $processed = 0;
    $entries = isset($payload['entry']) && is_array($payload['entry']) ? $payload['entry'] : [];
    foreach ($entries as $entry) {
        $changes = isset($entry['changes']) && is_array($entry['changes']) ? $entry['changes'] : [];
        foreach ($changes as $change) {
            $value = isset($change['value']) && is_array($change['value']) ? $change['value'] : [];
            $statuses = isset($value['statuses']) && is_array($value['statuses']) ? $value['statuses'] : [];
            foreach ($statuses as $st) {
                $externalId = isset($st['id']) ? (string)$st['id'] : '';
                $status = strtolower(trim((string)(isset($st['status']) ? $st['status'] : '')));
                if ($externalId === '' || $status === '') {
                    continue;
                }
                $recipient = mkt_one('SELECT * FROM marketing_campaign_recipients WHERE external_id = ? AND channel = ? LIMIT 1', [$externalId, 'whatsapp']);
                if (!is_array($recipient)) {
                    continue;
                }
                $recipientId = (int)$recipient['id'];
                $now = marketing_now();
                $update = ['status' => $status];
                $params = [$status];
                $sets = ['status = ?'];
                if ($status === 'sent') {
                    $sets[] = 'sent_at = COALESCE(sent_at, ?)';
                    $params[] = $now;
                } elseif ($status === 'delivered') {
                    $sets[] = 'delivered_at = COALESCE(delivered_at, ?)';
                    $params[] = $now;
                } elseif ($status === 'read') {
                    $sets[] = 'read_at = COALESCE(read_at, ?)';
                    $params[] = $now;
                    $sets[] = 'delivered_at = COALESCE(delivered_at, ?)';
                    $params[] = $now;
                } elseif ($status === 'failed') {
                    $sets[] = 'failed_at = ?';
                    $params[] = $now;
                    $errMsg = '';
                    if (isset($st['errors'][0]['title'])) {
                        $errMsg = (string)$st['errors'][0]['title'];
                    } elseif (isset($st['errors'][0]['message'])) {
                        $errMsg = (string)$st['errors'][0]['message'];
                    }
                    $sets[] = 'error_message = ?';
                    $params[] = $errMsg;
                }
                $sets[] = 'updated_at = ?';
                $params[] = $now;
                $params[] = $recipientId;
                mkt_run('UPDATE marketing_campaign_recipients SET ' . implode(', ', $sets) . ' WHERE id = ?', $params);
                mkt_insert(
                    'INSERT INTO marketing_whatsapp_logs (campaign_id, recipient_id, contact_id, event, message_id, detail, occurred_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [
                        isset($recipient['campaign_id']) ? (int)$recipient['campaign_id'] : 0,
                        $recipientId,
                        isset($recipient['contact_id']) ? (int)$recipient['contact_id'] : 0,
                        $status,
                        $externalId,
                        json_encode($st, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                        $now
                    ]
                );
                $processed++;
            }
        }
    }
    return ['ok' => true, 'processed' => $processed];
}

function marketing_email_status_rank(string $status): int
{
    $map = ['pending' => 0, 'queued' => 1, 'sent' => 2, 'delivered' => 3, 'opened' => 4, 'clicked' => 5, 'failed' => 6, 'skipped' => 6];
    $s = strtolower(trim($status));
    return isset($map[$s]) ? $map[$s] : -1;
}

function marketing_handle_track(string $type, int $recipientId, string $redirect = ''): void
{
    $type = strtolower(trim($type));
    if (!in_array($type, ['open', 'click'], true) || $recipientId <= 0) {
        http_response_code(204);
        exit;
    }
    $recipient = mkt_one('SELECT * FROM marketing_campaign_recipients WHERE id = ? LIMIT 1', [$recipientId]);
    if (!is_array($recipient)) {
        http_response_code(204);
        exit;
    }

    $now = marketing_now();
    $ip = isset($_SERVER['REMOTE_ADDR']) ? (string)$_SERVER['REMOTE_ADDR'] : '';
    $ua = isset($_SERVER['HTTP_USER_AGENT']) ? (string)$_SERVER['HTTP_USER_AGENT'] : '';
    $event = $type === 'open' ? 'opened' : 'clicked';
    $detail = ['user_agent' => $ua, 'ip' => $ip];
    if ($type === 'click') {
        $detail['url'] = $redirect;
    }
    mkt_insert(
        'INSERT INTO marketing_email_logs (campaign_id, recipient_id, contact_id, event, message_id, detail, occurred_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
            isset($recipient['campaign_id']) ? (int)$recipient['campaign_id'] : 0,
            $recipientId,
            isset($recipient['contact_id']) ? (int)$recipient['contact_id'] : 0,
            $event,
            '',
            json_encode($detail, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            $now
        ]
    );

    $current = strtolower((string)(isset($recipient['status']) ? $recipient['status'] : ''));
    $nextStatus = $event;
    if (marketing_email_status_rank($nextStatus) > marketing_email_status_rank($current)) {
        $sets = ['status = ?', 'updated_at = ?'];
        $params = [$nextStatus, $now];
        if ($nextStatus === 'opened') {
            $sets[] = 'opened_at = COALESCE(opened_at, ?)';
            $params[] = $now;
        }
        if ($nextStatus === 'clicked') {
            $sets[] = 'clicked_at = COALESCE(clicked_at, ?)';
            $params[] = $now;
            $sets[] = 'opened_at = COALESCE(opened_at, ?)';
            $params[] = $now;
        }
        $params[] = $recipientId;
        mkt_run('UPDATE marketing_campaign_recipients SET ' . implode(', ', $sets) . ' WHERE id = ?', $params);
    }

    if ($type === 'open') {
        header('Content-Type: image/gif');
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('Pragma: no-cache');
        echo base64_decode('R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==');
        exit;
    }

    $target = trim($redirect);
    $valid = false;
    if ($target !== '') {
        $parts = parse_url($target);
        $scheme = isset($parts['scheme']) ? strtolower((string)$parts['scheme']) : '';
        if (($scheme === 'http' || $scheme === 'https') && !empty($parts['host'])) {
            $valid = true;
        }
    }
    if ($valid) {
        header('Location: ' . $target, true, 302);
        exit;
    }
    http_response_code(204);
    exit;
}

function marketing_handle_unsubscribe(string $token): void
{
    $token = trim($token);
    $status = 'invalid';
    if ($token !== '') {
        $contact = mkt_one('SELECT * FROM marketing_contacts WHERE unsubscribe_token = ? LIMIT 1', [$token]);
        if (is_array($contact)) {
            $now = marketing_now();
            $contactId = (int)$contact['id'];
            mkt_run('UPDATE marketing_contacts SET unsubscribed = 1, unsubscribed_at = COALESCE(unsubscribed_at, ?) WHERE id = ?', [$now, $contactId]);
            mkt_insert(
                'INSERT INTO marketing_unsubscribes (contact_id, email, channel, source, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)',
                [
                    $contactId,
                    (string)(isset($contact['email']) ? $contact['email'] : ''),
                    'all',
                    'unsubscribe_link',
                    '',
                    $now
                ]
            );
            mkt_insert(
                'INSERT INTO marketing_consent_logs (contact_id, action, source, ip, user_id, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [
                    $contactId,
                    'unsubscribe',
                    'unsubscribe_link',
                    isset($_SERVER['REMOTE_ADDR']) ? (string)$_SERVER['REMOTE_ADDR'] : '',
                    null,
                    '',
                    $now
                ]
            );
            $recipients = mkt_all("SELECT id FROM marketing_campaign_recipients WHERE contact_id = ? AND channel IN ('email','whatsapp') AND status IN ('pending','queued')", [$contactId]);
            foreach ($recipients as $r) {
                $rid = (int)(isset($r['id']) ? $r['id'] : 0);
                if ($rid <= 0) {
                    continue;
                }
                mkt_run('UPDATE marketing_campaign_recipients SET status = ?, updated_at = ? WHERE id = ?', ['skipped', $now, $rid]);
                mkt_run('DELETE FROM marketing_queue WHERE recipient_id = ?', [$rid]);
            }
            $status = 'ok';
        }
    }

    $message = $status === 'ok' ? 'Anda telah berhasil berhenti berlangganan.' : 'Token tidak valid atau sudah tidak berlaku.';
    header('Content-Type: text/html; charset=utf-8');
    echo '<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe</title></head><body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:24px;"><div style="max-width:560px;margin:40px auto;background:#fff;padding:24px;border-radius:8px;border:1px solid #e5e5e5;"><h2 style="margin-top:0;">Berhenti Berlangganan</h2><p>' . htmlspecialchars($message, ENT_QUOTES, 'UTF-8') . '</p></div></body></html>';
    exit;
}
