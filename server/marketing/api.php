<?php

if (!function_exists('json_response')) {
    function json_response($data, $status = 200)
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
}

if (!function_exists('mkt_all')) {
    require_once __DIR__ . '/helpers.php';
}
if (!function_exists('marketing_enqueue_campaign')) {
    require_once __DIR__ . '/queue.php';
}
if (!function_exists('marketing_send_email')) {
    require_once __DIR__ . '/integrations.php';
}

function mkt_api_path($uri)
{
    $path = parse_url((string)$uri, PHP_URL_PATH);
    if (!is_string($path) || $path === '') {
        $path = (string)$uri;
    }
    $path = rtrim($path, '/');
    return $path === '' ? '/' : $path;
}

function mkt_api_error($message, $status = 400)
{
    json_response(['message' => (string)$message], (int)$status);
}

function mkt_api_db_datetime($value)
{
    $value = trim((string)$value);
    if ($value === '') {
        return null;
    }
    $value = str_replace('T', ' ', $value);
    $timestamp = strtotime($value);
    return $timestamp === false ? null : date('Y-m-d H:i:s', $timestamp);
}

function mkt_api_display_datetime($value)
{
    $value = trim((string)$value);
    if ($value === '' || $value === '0000-00-00 00:00:00') {
        return '';
    }
    $timestamp = strtotime($value);
    return $timestamp === false ? $value : date('Y-m-d H:i:s', $timestamp);
}

function mkt_api_nested(array $source, $key, $flatKey = null)
{
    if ($flatKey !== null && array_key_exists($flatKey, $source)) {
        return $source[$flatKey];
    }
    return array_key_exists($key, $source) ? $source[$key] : null;
}

function mkt_api_has_nested(array $source, $key, $flatKey = null)
{
    if ($flatKey !== null && array_key_exists($flatKey, $source)) {
        return true;
    }
    return array_key_exists($key, $source);
}

function mkt_api_page($defaultLimit = 20)
{
    $page = max(1, marketing_int(marketing_val('page', 1), 1));
    $rawLimit = marketing_val('limit', $defaultLimit);
    $all = is_string($rawLimit) && strtolower(trim($rawLimit)) === 'all';
    $limit = $all ? 0 : max(1, min(100, marketing_int($rawLimit, $defaultLimit)));
    $sort = (string)marketing_val('sort', 'created_at');
    if (!preg_match('/^[A-Za-z_][A-Za-z0-9_.]*$/', $sort)) {
        $sort = 'created_at';
    }
    $dir = strtolower(trim((string)marketing_val('dir', 'desc')));
    $dir = in_array($dir, ['asc', 'desc'], true) ? $dir : 'desc';
    return [
        'page' => $page,
        'limit' => $limit,
        'all' => $all,
        'offset' => $all ? 0 : ($page - 1) * $limit,
        'sort' => $sort,
        'dir' => $dir
    ];
}

function mkt_api_rate($numerator, $denominator)
{
    $denominator = (float)$denominator;
    if ($denominator <= 0) {
        return 0;
    }
    return round(((float)$numerator / $denominator) * 100, 2);
}

function mkt_api_bool_text($value)
{
    return marketing_bool($value) ? '1' : '0';
}

function mkt_api_contact_payload(array $row)
{
    $email = isset($row['email']) ? trim((string)$row['email']) : '';
    $whatsapp = isset($row['whatsapp']) ? trim((string)$row['whatsapp']) : '';
    $optIn = isset($row['opt_in']) ? marketing_bool($row['opt_in']) : false;
    $unsubscribed = isset($row['unsubscribed']) ? marketing_bool($row['unsubscribed']) : false;
    if ($unsubscribed) {
        $status = 'nonaktif';
    } elseif (!$optIn) {
        $status = 'pending';
    } elseif ($email !== '' && !marketing_validate_email($email)) {
        $status = 'invalid';
    } elseif ($whatsapp !== '' && !marketing_validate_phone($whatsapp)) {
        $status = 'invalid';
    } else {
        $status = 'active';
    }
    $extra = [];
    if (isset($row['extra']) && trim((string)$row['extra']) !== '') {
        $decoded = json_decode((string)$row['extra'], true);
        if (is_array($decoded)) {
            $extra = $decoded;
        }
    }
    return [
        'id' => (int)(isset($row['id']) ? $row['id'] : 0),
        'name' => (string)(isset($row['name']) ? $row['name'] : ''),
        'email' => $email,
        'whatsapp' => $whatsapp,
        'company' => (string)(isset($row['company']) ? $row['company'] : ''),
        'segment' => (string)(isset($row['segment']) ? $row['segment'] : ''),
        'category' => (string)(isset($row['category']) ? $row['category'] : ''),
        'source' => (string)(isset($row['source']) ? $row['source'] : ''),
        'opt_in' => $optIn,
        'consent_at' => mkt_api_display_datetime(isset($row['consent_at']) ? $row['consent_at'] : ''),
        'unsubscribed' => $unsubscribed,
        'unsubscribed_at' => mkt_api_display_datetime(isset($row['unsubscribed_at']) ? $row['unsubscribed_at'] : ''),
        'unsubscribe_token' => (string)(isset($row['unsubscribe_token']) ? $row['unsubscribe_token'] : ''),
        'notes' => (string)(isset($row['notes']) ? $row['notes'] : ''),
        'extra' => $extra,
        'status' => $status,
        'created_at' => mkt_api_display_datetime(isset($row['created_at']) ? $row['created_at'] : ''),
        'updated_at' => mkt_api_display_datetime(isset($row['updated_at']) ? $row['updated_at'] : '')
    ];
}

function mkt_api_validate_contact(array $input, $excludeId = 0)
{
    $name = trim((string)(isset($input['name']) ? $input['name'] : ''));
    $email = trim((string)(isset($input['email']) ? $input['email'] : ''));
    $whatsappRaw = trim((string)(isset($input['whatsapp']) ? $input['whatsapp'] : ''));
    $whatsapp = $whatsappRaw === '' ? '' : marketing_normalize_phone($whatsappRaw);
    $company = trim((string)(isset($input['company']) ? $input['company'] : ''));
    $segment = trim((string)(isset($input['segment']) ? $input['segment'] : ''));
    if ($segment === '') {
        $segment = 'Prospek';
    }
    $category = trim((string)(isset($input['category']) ? $input['category'] : ''));
    $source = trim((string)(isset($input['source']) ? $input['source'] : ''));
    $notes = trim((string)(isset($input['notes']) ? $input['notes'] : ''));
    $optIn = array_key_exists('opt_in', $input) ? marketing_bool($input['opt_in']) : true;
    $consentAt = null;
    if ($optIn && isset($input['consent_at'])) {
        $consentAt = mkt_api_db_datetime($input['consent_at']);
    }
    if ($optIn && $consentAt === null) {
        $consentAt = marketing_now();
    }

    if ($name === '') {
        return ['data' => [], 'error' => 'Nama kontak wajib diisi'];
    }
    if ($email !== '' && !marketing_validate_email($email)) {
        return ['data' => [], 'error' => 'Format email tidak valid'];
    }
    if ($whatsappRaw !== '' && !marketing_validate_phone($whatsappRaw)) {
        return ['data' => [], 'error' => 'Format WhatsApp tidak valid'];
    }
    if ($email === '' && $whatsapp === '') {
        return ['data' => [], 'error' => 'Email atau WhatsApp wajib diisi'];
    }

    $excludeId = (int)$excludeId;
    if ($email !== '') {
        $row = mkt_one('SELECT id FROM marketing_contacts WHERE email = ?' . ($excludeId > 0 ? ' AND id <> ?' : '') . ' LIMIT 1', $excludeId > 0 ? [$email, $excludeId] : [$email]);
        if (is_array($row)) {
            return ['data' => [], 'error' => 'Email sudah terdaftar'];
        }
    }
    if ($whatsapp !== '') {
        $row = mkt_one('SELECT id FROM marketing_contacts WHERE whatsapp = ?' . ($excludeId > 0 ? ' AND id <> ?' : '') . ' LIMIT 1', $excludeId > 0 ? [$whatsapp, $excludeId] : [$whatsapp]);
        if (is_array($row)) {
            return ['data' => [], 'error' => 'WhatsApp sudah terdaftar'];
        }
    }

    $extra = null;
    if (array_key_exists('extra', $input)) {
        $rawExtra = $input['extra'];
        if (is_array($rawExtra)) {
            $extra = json_encode($rawExtra, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        } elseif (is_string($rawExtra) && trim($rawExtra) !== '') {
            $decodedExtra = json_decode(trim($rawExtra), true);
            $extra = is_array($decodedExtra)
                ? trim($rawExtra)
                : json_encode(['value' => trim($rawExtra)], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
    }

    return [
        'data' => [
            'name' => substr($name, 0, 190),
            'email' => $email !== '' ? substr($email, 0, 190) : null,
            'whatsapp' => $whatsapp !== '' ? substr($whatsapp, 0, 30) : null,
            'company' => $company !== '' ? substr($company, 0, 190) : null,
            'segment' => substr($segment, 0, 100),
            'category' => $category !== '' ? substr($category, 0, 100) : null,
            'source' => $source !== '' ? substr($source, 0, 100) : null,
            'opt_in' => $optIn ? 1 : 0,
            'consent_at' => $consentAt,
            'notes' => $notes !== '' ? $notes : null,
            'extra' => $extra
        ],
        'error' => ''
    ];
}

function mkt_api_contact_where()
{
    $join = '';
    $where = ['1 = 1'];
    $params = [];

    $search = trim((string)marketing_val('search', marketing_val('q', '')));
    if ($search !== '') {
        $where[] = "(c.name LIKE ? OR c.email LIKE ? OR c.whatsapp LIKE ? OR c.company LIKE ?)";
        $term = '%' . $search . '%';
        $params[] = $term;
        $params[] = $term;
        $params[] = $term;
        $params[] = $term;
    }
    foreach (['segment', 'category', 'source'] as $field) {
        $value = trim((string)marketing_val($field, ''));
        if ($value !== '') {
            $where[] = "c.$field = ?";
            $params[] = $value;
        }
    }

    $groupIds = marketing_id_list(marketing_val('group_id', marketing_val('group', [])));
    if ($groupIds) {
        $join = ' INNER JOIN marketing_contact_group_members gm ON gm.contact_id = c.id';
        $where[] = 'gm.group_id IN (' . implode(',', array_fill(0, count($groupIds), '?')) . ')';
        foreach ($groupIds as $groupId) {
            $params[] = $groupId;
        }
    }

    $status = strtolower(trim((string)marketing_val('status', '')));
    if ($status === 'active') {
        $where[] = 'c.unsubscribed = 0 AND c.opt_in = 1';
    } elseif ($status === 'nonaktif') {
        $where[] = '(c.unsubscribed = 1 OR c.opt_in = 0)';
    } elseif ($status === 'pending') {
        $where[] = 'c.unsubscribed = 0 AND c.opt_in = 0';
    } elseif ($status === 'invalid') {
        $where[] = "c.unsubscribed = 0 AND c.opt_in = 1 AND ((c.email IS NULL OR c.email = '') AND (c.whatsapp IS NULL OR c.whatsapp = ''))";
    }

    $optInRaw = marketing_val('opt_in', null);
    if ($optInRaw !== null && $optInRaw !== '') {
        $where[] = 'c.opt_in = ?';
        $params[] = marketing_bool($optInRaw) ? 1 : 0;
    }
    $unsubscribedRaw = marketing_val('unsubscribed', null);
    if ($unsubscribedRaw !== null && $unsubscribedRaw !== '') {
        $where[] = 'c.unsubscribed = ?';
        $params[] = marketing_bool($unsubscribedRaw) ? 1 : 0;
    }

    return [$join, implode(' AND ', $where), $params];
}

function mkt_api_contact_sort($sort, $dir)
{
    $map = [
        'id' => 'c.id',
        'name' => 'c.name',
        'email' => 'c.email',
        'whatsapp' => 'c.whatsapp',
        'company' => 'c.company',
        'segment' => 'c.segment',
        'category' => 'c.category',
        'source' => 'c.source',
        'opt_in' => 'c.opt_in',
        'status' => 'c.unsubscribed',
        'consent_at' => 'c.consent_at',
        'created_at' => 'c.created_at',
        'updated_at' => 'c.updated_at'
    ];
    $column = isset($map[$sort]) ? $map[$sort] : 'c.created_at';
    $direction = strtolower($dir) === 'asc' ? 'ASC' : 'DESC';
    return $column . ' ' . $direction . ', c.id ' . $direction;
}

function mkt_api_csv_escape($value)
{
    $text = (string)$value;
    if (strpbrk($text, ",\"\r\n") === false) {
        return $text;
    }
    return '"' . str_replace('"', '""', $text) . '"';
}

function mkt_api_csv_response(array $rows, array $headers, $filename)
{
    $output = "\xEF\xBB\xBF";
    $labels = [];
    foreach ($headers as $header) {
        $labels[] = mkt_api_csv_escape(isset($header['label']) ? $header['label'] : $header[0]);
    }
    $output .= implode(',', $labels) . "\r\n";
    foreach ($rows as $row) {
        $cells = [];
        foreach ($headers as $header) {
            $key = isset($header['key']) ? $header['key'] : $header[0];
            $value = array_key_exists($key, $row) ? $row[$key] : '';
            if (is_array($value)) {
                $value = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            } elseif (is_bool($value)) {
                $value = $value ? 'Ya' : 'Tidak';
            }
            $cells[] = mkt_api_csv_escape($value);
        }
        $output .= implode(',', $cells) . "\r\n";
    }
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . basename($filename) . '"');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    echo $output;
    exit;
}

function mkt_api_xml_escape($value)
{
    return htmlspecialchars((string)$value, ENT_XML1 | ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function mkt_api_column_letter($index)
{
    $index = max(1, (int)$index);
    $letters = '';
    while ($index > 0) {
        $index--;
        $letters = chr(65 + ($index % 26)) . $letters;
        $index = (int)($index / 26);
    }
    return $letters;
}

function mkt_api_zip_store(array $files)
{
    $time = (int)date('H') << 11 | (int)date('i') << 5 | ((int)date('s') >> 1);
    $date = (((int)date('Y') - 1980) << 9) | ((int)date('m') << 5) | (int)date('d');
    $local = '';
    $central = '';
    $offset = 0;
    foreach ($files as $name => $content) {
        $name = (string)$name;
        $content = (string)$content;
        $crc = crc32($content);
        $size = strlen($content);
        $nameLength = strlen($name);
        $local .= pack('VvvvvvVVVvv', 0x04034b50, 20, 0x0800, 0, $time, $date, $crc, $size, $size, $nameLength, 0);
        $local .= $name . $content;
        $central .= pack('VvvvvvvVVVvvvvvVV', 0x02014b50, 20, 20, 0x0800, 0, $time, $date, $crc, $size, $size, $nameLength, 0, 0, 0, 0, 0, $offset);
        $central .= $name;
        $offset += 30 + $nameLength + $size;
    }
    $centralSize = strlen($central);
    $end = pack('VvvvvVVv', 0x06054b50, 0, 0, count($files), count($files), $centralSize, $offset, 0);
    return $local . $central . $end;
}

function mkt_api_xlsx_response(array $rows, array $headers, $filename)
{
    $sheet = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    $sheet .= '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>';
    $headerRow = '<row r="1">';
    foreach ($headers as $index => $header) {
        $label = isset($header['label']) ? $header['label'] : $header[0];
        $cell = mkt_api_column_letter($index + 1) . '1';
        $headerRow .= '<c r="' . $cell . '" t="inlineStr"><is><t>' . mkt_api_xml_escape($label) . '</t></is></c>';
    }
    $headerRow .= '</row>';
    $sheet .= $headerRow;
    $rowNumber = 2;
    foreach ($rows as $row) {
        $xmlRow = '<row r="' . $rowNumber . '">';
        foreach ($headers as $index => $header) {
            $key = isset($header['key']) ? $header['key'] : $header[0];
            $value = array_key_exists($key, $row) ? $row[$key] : '';
            if (is_array($value)) {
                $value = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            } elseif (is_bool($value)) {
                $value = $value ? 'Ya' : 'Tidak';
            }
            $cell = mkt_api_column_letter($index + 1) . $rowNumber;
            $xmlRow .= '<c r="' . $cell . '" t="inlineStr"><is><t xml:space="preserve">' . mkt_api_xml_escape($value) . '</t></is></c>';
        }
        $xmlRow .= '</row>';
        $sheet .= $xmlRow;
        $rowNumber++;
    }
    $sheet .= '</sheetData></worksheet>';

    $contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        . '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        . '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        . '<Default Extension="xml" ContentType="application/xml"/>'
        . '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        . '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        . '</Types>';
    $rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
        . '</Relationships>';
    $workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        . '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        . '<sheets><sheet name="Data" sheetId="1" r:id="rId1"/></sheets></workbook>';
    $workbookRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
        . '</Relationships>';

    $archive = mkt_api_zip_store([
        '[Content_Types].xml' => $contentTypes,
        '_rels/.rels' => $rels,
        'xl/workbook.xml' => $workbook,
        'xl/_rels/workbook.xml.rels' => $workbookRels,
        'xl/worksheets/sheet1.xml' => $sheet
    ]);
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header('Content-Disposition: attachment; filename="' . basename($filename) . '"');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    echo $archive;
    exit;
}

function mkt_api_export_response(array $rows, array $headers, $filename, $format = 'xlsx')
{
    $format = strtolower(trim((string)$format));
    if ($format === 'csv') {
        mkt_api_csv_response($rows, $headers, $filename . '.csv');
    }
    mkt_api_xlsx_response($rows, $headers, $filename . '.xlsx');
}

function mkt_api_campaign_config()
{
    $config = marketing_val('recipients', null);
    if (!is_array($config)) {
        $rawConfig = marketing_val('recipients_config', null);
        if (is_array($rawConfig)) {
            $config = $rawConfig;
        } elseif (is_string($rawConfig) && trim($rawConfig) !== '') {
            $decoded = json_decode(trim($rawConfig), true);
            if (is_array($decoded)) {
                $config = $decoded;
            }
        }
    }
    if (!is_array($config)) {
        $config = [];
    }

    $mode = strtolower(trim((string)mkt_api_nested($config, 'mode', 'recipient_mode')));
    if ($mode === '') {
        $mode = 'all';
    }
    if (!in_array($mode, ['all', 'segment', 'category', 'group', 'manual'], true)) {
        $mode = 'all';
    }

    $segments = marketing_config_values(mkt_api_nested($config, 'segment', 'segments'));
    if (!$segments) {
        $flatSegment = trim((string)marketing_val('segment', ''));
        if ($flatSegment !== '') {
            $segments = [$flatSegment];
        }
    }
    $categories = marketing_config_values(mkt_api_nested($config, 'category', 'categories'));
    if (!$categories) {
        $flatCategory = trim((string)marketing_val('category', ''));
        if ($flatCategory !== '') {
            $categories = [$flatCategory];
        }
    }

    $groupRaw = mkt_api_nested($config, 'group_id', 'group_ids');
    if ($groupRaw === null) {
        $groupRaw = marketing_val('group_id', []);
    }
    $groupIds = marketing_id_list($groupRaw);
    $groupNames = marketing_config_values(mkt_api_nested($config, 'group', 'groups'));
    $contactRaw = mkt_api_nested($config, 'contact_ids', 'contacts');
    if ($contactRaw === null) {
        $contactRaw = marketing_val('contact_ids', []);
    }
    $contactIds = marketing_id_list($contactRaw);

    $result = [
        'mode' => $mode,
        'segment' => count($segments) === 1 ? $segments[0] : $segments,
        'category' => count($categories) === 1 ? $categories[0] : $categories,
        'group_id' => count($groupIds) === 1 ? $groupIds[0] : $groupIds,
        'contact_ids' => $contactIds
    ];
    if ($groupNames) {
        $result['groups'] = $groupNames;
    }
    foreach ($config as $key => $value) {
        if (!array_key_exists($key, $result)) {
            $result[$key] = $value;
        }
    }
    return $result;
}

function mkt_api_campaign_columns(array $existing = [])
{
    $existingType = isset($existing['type']) ? (string)$existing['type'] : 'email';
    $type = strtolower(trim((string)marketing_val('type', marketing_val('channel', $existingType))));
    if (!in_array($type, ['email', 'whatsapp', 'both'], true)) {
        $type = 'email';
    }

    $name = trim((string)marketing_val('name', isset($existing['name']) ? $existing['name'] : ''));
    $emailSubject = trim((string)marketing_val('email_subject', marketing_val('subject', isset($existing['email_subject']) ? $existing['email_subject'] : '')));
    $emailFromName = trim((string)marketing_val('email_from_name', marketing_val('from_name', isset($existing['email_from_name']) ? $existing['email_from_name'] : '')));
    $emailFromEmail = trim((string)marketing_val('email_from_email', marketing_val('from_email', isset($existing['email_from_email']) ? $existing['email_from_email'] : '')));
    $emailContent = (string)marketing_val('email_content', marketing_val('email_html', isset($existing['email_content']) ? $existing['email_content'] : ''));
    $whatsappContent = (string)marketing_val('whatsapp_content', marketing_val('whatsapp_text', isset($existing['whatsapp_content']) ? $existing['whatsapp_content'] : ''));

    $emailTemplateId = marketing_int(marketing_val('email_template_id', isset($existing['email_template_id']) ? $existing['email_template_id'] : 0));
    $whatsappTemplateId = marketing_int(marketing_val('whatsapp_template_id', isset($existing['whatsapp_template_id']) ? $existing['whatsapp_template_id'] : 0));

    $emailScheduleRaw = marketing_val('scheduled_at_email', marketing_val('schedule_email', isset($existing['email_schedule_at']) ? $existing['email_schedule_at'] : ''));
    $whatsappScheduleRaw = marketing_val('scheduled_at_whatsapp', marketing_val('schedule_whatsapp', isset($existing['whatsapp_schedule_at']) ? $existing['whatsapp_schedule_at'] : ''));
    $emailSchedule = mkt_api_db_datetime($emailScheduleRaw);
    $whatsappSchedule = mkt_api_db_datetime($whatsappScheduleRaw);

    $config = mkt_api_campaign_config();
    $columns = [
        'name' => substr($name, 0, 190),
        'type' => $type,
        'recipients_config' => json_encode($config, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'email_subject' => $emailSubject !== '' ? substr($emailSubject, 0, 190) : null,
        'email_from_name' => $emailFromName !== '' ? substr($emailFromName, 0, 190) : null,
        'email_from_email' => $emailFromEmail !== '' ? substr($emailFromEmail, 0, 190) : null,
        'email_template_id' => $emailTemplateId > 0 ? $emailTemplateId : null,
        'email_content' => $emailContent !== '' ? $emailContent : null,
        'email_schedule_at' => $emailSchedule,
        'whatsapp_template_id' => $whatsappTemplateId > 0 ? $whatsappTemplateId : null,
        'whatsapp_content' => $whatsappContent !== '' ? $whatsappContent : null,
        'whatsapp_schedule_at' => $whatsappSchedule
    ];
    return $columns;
}

function mkt_api_campaign_payload(array $row)
{
    $id = (int)(isset($row['id']) ? $row['id'] : 0);
    $config = [];
    if (isset($row['recipients_config']) && trim((string)$row['recipients_config']) !== '') {
        $decoded = json_decode((string)$row['recipients_config'], true);
        if (is_array($decoded)) {
            $config = $decoded;
        }
    }
    $stats = marketing_campaign_stats($id);
    $type = strtolower((string)(isset($row['type']) ? $row['type'] : 'email'));
    $emailSchedule = mkt_api_display_datetime(isset($row['email_schedule_at']) ? $row['email_schedule_at'] : '');
    $whatsappSchedule = mkt_api_display_datetime(isset($row['whatsapp_schedule_at']) ? $row['whatsapp_schedule_at'] : '');
    $scheduledAt = '';
    if ($type === 'whatsapp') {
        $scheduledAt = $whatsappSchedule;
    } elseif ($type === 'email') {
        $scheduledAt = $emailSchedule;
    } else {
        $scheduledAt = $emailSchedule !== '' ? $emailSchedule : $whatsappSchedule;
    }

    return [
        'id' => $id,
        'name' => (string)(isset($row['name']) ? $row['name'] : ''),
        'type' => $type,
        'channel' => $type,
        'status' => (string)(isset($row['status']) ? $row['status'] : 'draft'),
        'recipients_config' => $config,
        'recipients_config_json' => (string)(isset($row['recipients_config']) ? $row['recipients_config'] : ''),
        'recipient_mode' => isset($config['mode']) ? (string)$config['mode'] : 'all',
        'segment' => isset($config['segment']) ? $config['segment'] : '',
        'category' => isset($config['category']) ? $config['category'] : '',
        'group_id' => isset($config['group_id']) ? $config['group_id'] : '',
        'contact_ids' => isset($config['contact_ids']) && is_array($config['contact_ids']) ? $config['contact_ids'] : [],
        'recipients' => $config,
        'email_subject' => (string)(isset($row['email_subject']) ? $row['email_subject'] : ''),
        'subject' => (string)(isset($row['email_subject']) ? $row['email_subject'] : ''),
        'email_from_name' => (string)(isset($row['email_from_name']) ? $row['email_from_name'] : ''),
        'from_name' => (string)(isset($row['email_from_name']) ? $row['email_from_name'] : ''),
        'email_from_email' => (string)(isset($row['email_from_email']) ? $row['email_from_email'] : ''),
        'from_email' => (string)(isset($row['email_from_email']) ? $row['email_from_email'] : ''),
        'email_template_id' => (int)(isset($row['email_template_id']) ? $row['email_template_id'] : 0),
        'email_content' => (string)(isset($row['email_content']) ? $row['email_content'] : ''),
        'email_html' => (string)(isset($row['email_content']) ? $row['email_content'] : ''),
        'email_schedule_at' => $emailSchedule,
        'whatsapp_template_id' => (int)(isset($row['whatsapp_template_id']) ? $row['whatsapp_template_id'] : 0),
        'whatsapp_content' => (string)(isset($row['whatsapp_content']) ? $row['whatsapp_content'] : ''),
        'whatsapp_text' => (string)(isset($row['whatsapp_content']) ? $row['whatsapp_content'] : ''),
        'whatsapp_schedule_at' => $whatsappSchedule,
        'scheduled_at' => $scheduledAt,
        'schedule_mode' => ($emailSchedule !== '' || $whatsappSchedule !== '') ? 'scheduled' : 'now',
        'schedule' => ['email' => $emailSchedule, 'whatsapp' => $whatsappSchedule],
        'stats' => $stats,
        'total_recipients' => isset($stats['total_recipients']) ? (int)$stats['total_recipients'] : 0,
        'recipients_count' => isset($stats['total_recipients']) ? (int)$stats['total_recipients'] : 0,
        'created_at' => mkt_api_display_datetime(isset($row['created_at']) ? $row['created_at'] : ''),
        'updated_at' => mkt_api_display_datetime(isset($row['updated_at']) ? $row['updated_at'] : ''),
        'started_at' => mkt_api_display_datetime(isset($row['started_at']) ? $row['started_at'] : ''),
        'completed_at' => mkt_api_display_datetime(isset($row['completed_at']) ? $row['completed_at'] : '')
    ];
}

function mkt_api_campaign_save($id, array $user)
{
    $id = (int)$id;
    $existing = [];
    if ($id > 0) {
        $row = mkt_one('SELECT * FROM marketing_campaigns WHERE id = ? LIMIT 1', [$id]);
        if (!is_array($row)) {
            mkt_api_error('Kampanye tidak ditemukan', 404);
        }
        $existing = $row;
    }

    $name = trim((string)(isset($existing['name']) ? $existing['name'] : ''));
    if (trim((string)marketing_val('name', '')) !== '') {
        $name = trim((string)marketing_val('name', ''));
    }
    if ($name === '') {
        mkt_api_error('Nama kampanye wajib diisi');
    }

    $columns = mkt_api_campaign_columns($existing);
    $columns['name'] = substr($name, 0, 190);
    $userId = isset($user['id']) ? (int)$user['id'] : 0;
    $now = marketing_now();

    if ($id > 0) {
        $sets = [];
        $params = [];
        foreach ($columns as $column => $value) {
            $sets[] = $column . ' = ?';
            $params[] = $value;
        }
        $sets[] = 'updated_by = ?';
        $params[] = $userId > 0 ? $userId : null;
        $params[] = $id;
        mkt_run('UPDATE marketing_campaigns SET ' . implode(', ', $sets) . ' WHERE id = ?', $params);
        return $id;
    }

    $columns['status'] = 'draft';
    $columns['created_by'] = $userId > 0 ? $userId : null;
    $columns['updated_by'] = $userId > 0 ? $userId : null;
    $columns['created_at'] = $now;
    $names = array_keys($columns);
    $placeholders = implode(',', array_fill(0, count($names), '?'));
    $result = mkt_run(
        'INSERT INTO marketing_campaigns (' . implode(', ', $names) . ') VALUES (' . $placeholders . ')',
        array_values($columns)
    );
    return (int)$result['insertId'];
}

function mkt_api_recipient_rows($campaignId, $limit = 50, $offset = 0)
{
    $params = [(int)$campaignId];
    $sql = "SELECT r.id, r.contact_id, r.channel, r.status, r.attempts, r.last_error, r.external_id,
            r.sent_at, r.delivered_at, r.opened_at, r.clicked_at, r.read_at,
            c.name, c.email, c.whatsapp, c.company, c.segment, c.category
            FROM marketing_campaign_recipients r
            INNER JOIN marketing_contacts c ON c.id = r.contact_id
            WHERE r.campaign_id = ? ORDER BY r.id ASC";
    if ((int)$limit > 0) {
        $sql .= ' LIMIT ' . max(1, (int)$limit) . ' OFFSET ' . max(0, (int)$offset);
    }
    $rows = mkt_all($sql, $params);
    $out = [];
    foreach ($rows as $row) {
        $out[] = [
            'id' => (int)$row['id'],
            'contact_id' => (int)$row['contact_id'],
            'channel' => (string)$row['channel'],
            'status' => (string)$row['status'],
            'attempts' => (int)$row['attempts'],
            'name' => (string)$row['name'],
            'email' => (string)$row['email'],
            'whatsapp' => (string)$row['whatsapp'],
            'company' => (string)$row['company'],
            'segment' => (string)$row['segment'],
            'category' => (string)$row['category'],
            'sent_at' => mkt_api_display_datetime($row['sent_at']),
            'delivered_at' => mkt_api_display_datetime($row['delivered_at']),
            'opened_at' => mkt_api_display_datetime($row['opened_at']),
            'clicked_at' => mkt_api_display_datetime($row['clicked_at']),
            'read_at' => mkt_api_display_datetime($row['read_at']),
            'error_message' => (string)$row['last_error'],
            'error' => (string)$row['last_error'],
            'external_id' => (string)$row['external_id']
        ];
    }
    return $out;
}

function mkt_api_analytics_rows()
{
    $where = ['1 = 1'];
    $params = [];
    $from = trim((string)marketing_val('from', ''));
    $to = trim((string)marketing_val('to', ''));
    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $from)) {
        $where[] = 'DATE(COALESCE(r.sent_at, r.created_at)) >= ?';
        $params[] = $from;
    }
    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $to)) {
        $where[] = 'DATE(COALESCE(r.sent_at, r.created_at)) <= ?';
        $params[] = $to;
    }
    $channel = strtolower(trim((string)marketing_val('channel', '')));
    if (in_array($channel, ['email', 'whatsapp'], true)) {
        $where[] = 'r.channel = ?';
        $params[] = $channel;
    }
    $campaignType = strtolower(trim((string)marketing_val('type', '')));
    if (in_array($campaignType, ['email', 'whatsapp', 'both'], true)) {
        $where[] = 'c.type = ?';
        $params[] = $campaignType;
    }
    $segment = trim((string)marketing_val('segment', ''));
    if ($segment !== '') {
        $where[] = 'ct.segment LIKE ?';
        $params[] = '%' . $segment . '%';
    }
    $status = strtolower(trim((string)marketing_val('status', '')));
    if ($status !== '') {
        $where[] = 'r.status = ?';
        $params[] = $status;
    }

    $sql = "SELECT r.id, c.name AS campaign_name, c.type, r.channel, ct.name AS contact_name,
            ct.email, ct.whatsapp, ct.segment, r.status, r.attempts,
            r.sent_at, r.delivered_at, r.opened_at, r.clicked_at, r.read_at, r.last_error
            FROM marketing_campaign_recipients r
            INNER JOIN marketing_campaigns c ON c.id = r.campaign_id
            INNER JOIN marketing_contacts ct ON ct.id = r.contact_id
            WHERE " . implode(' AND ', $where) . "
            ORDER BY COALESCE(r.sent_at, r.created_at) DESC, r.id DESC";
    $rows = mkt_all($sql, $params);
    $out = [];
    foreach ($rows as $row) {
        $out[] = [
            'id' => (int)$row['id'],
            'campaign_name' => (string)$row['campaign_name'],
            'name' => (string)$row['campaign_name'],
            'type' => (string)$row['type'],
            'channel' => (string)$row['channel'],
            'contact_name' => (string)$row['contact_name'],
            'email' => (string)$row['email'],
            'whatsapp' => (string)$row['whatsapp'],
            'segment' => (string)$row['segment'],
            'status' => (string)$row['status'],
            'attempts' => (int)$row['attempts'],
            'sent_at' => mkt_api_display_datetime($row['sent_at']),
            'delivered_at' => mkt_api_display_datetime($row['delivered_at']),
            'opened_at' => mkt_api_display_datetime($row['opened_at']),
            'clicked_at' => mkt_api_display_datetime($row['clicked_at']),
            'read_at' => mkt_api_display_datetime($row['read_at']),
            'last_error' => (string)$row['last_error'],
            'error_message' => (string)$row['last_error']
        ];
    }
    return $out;
}

function mkt_api_analytics_summary(array $rows)
{
    $emailSentStatuses = ['sent', 'delivered', 'opened', 'clicked'];
    $whatsappSentStatuses = ['sent', 'delivered', 'read'];
    $failedStatuses = ['failed', 'bounced', 'invalid'];
    $counts = ['email' => [], 'whatsapp' => []];
    foreach ($rows as $row) {
        $channel = isset($row['channel']) ? (string)$row['channel'] : '';
        $status = isset($row['status']) ? strtolower((string)$row['status']) : '';
        if (!isset($counts[$channel])) {
            $counts[$channel] = [];
        }
        if (!isset($counts[$channel][$status])) {
            $counts[$channel][$status] = 0;
        }
        $counts[$channel][$status]++;
    }

    $countStatus = function ($channel, $statuses) use ($counts) {
        $total = 0;
        foreach ((array)$statuses as $status) {
            $total += isset($counts[$channel][$status]) ? (int)$counts[$channel][$status] : 0;
        }
        return $total;
    };

    $emailSent = $countStatus('email', $emailSentStatuses);
    $whatsappSent = $countStatus('whatsapp', $whatsappSentStatuses);
    $emailFailed = $countStatus('email', $failedStatuses);
    $whatsappFailed = $countStatus('whatsapp', $failedStatuses);
    $opened = $countStatus('email', ['opened', 'clicked']);
    $clicked = $countStatus('email', ['clicked']);
    $bounced = $countStatus('email', ['bounced']);
    $delivered = $countStatus('email', ['delivered']) + $countStatus('whatsapp', ['delivered', 'read']);
    $read = $countStatus('whatsapp', ['read']);
    $total = count($rows);
    $sent = $emailSent + $whatsappSent;
    $failed = $emailFailed + $whatsappFailed;

    return [
        'total_recipients' => $total,
        'messages_sent' => $sent,
        'messages_received' => $delivered,
        'messages_opened' => $opened,
        'messages_clicked' => $clicked,
        'messages_failed' => $failed,
        'success_rate' => mkt_api_rate($sent, $total),
        'bounce_rate' => mkt_api_rate($bounced, $total),
        'open_rate' => mkt_api_rate($opened, $sent),
        'click_rate' => mkt_api_rate($clicked, $sent),
        'whatsapp_delivery_rate' => mkt_api_rate($countStatus('whatsapp', ['delivered', 'read']), $whatsappSent),
        'whatsapp_read_rate' => mkt_api_rate($read, $whatsappSent),
        'email_sent' => $emailSent,
        'email_failed' => $emailFailed,
        'email_opened' => $opened,
        'email_clicked' => $clicked,
        'whatsapp_sent' => $whatsappSent,
        'whatsapp_failed' => $whatsappFailed,
        'whatsapp_delivered' => $countStatus('whatsapp', ['delivered', 'read']),
        'whatsapp_read' => $read
    ];
}

function mkt_api_analytics_series(array $rows)
{
    $series = [];
    $start = strtotime('-29 days');
    for ($i = 0; $i < 30; $i++) {
        $date = date('Y-m-d', $start + ($i * 86400));
        $series[$date] = [
            'date' => $date,
            'email' => 0,
            'whatsapp' => 0,
            'failed' => 0,
            'bounced' => 0,
            'invalid' => 0
        ];
    }
    foreach ($rows as $row) {
        $dateValue = isset($row['sent_at']) && trim((string)$row['sent_at']) !== '' ? $row['sent_at'] : '';
        $timestamp = $dateValue !== '' ? strtotime((string)$dateValue) : time();
        $date = $timestamp === false ? date('Y-m-d') : date('Y-m-d', $timestamp);
        if (!isset($series[$date])) {
            $series[$date] = ['date' => $date, 'email' => 0, 'whatsapp' => 0, 'failed' => 0, 'bounced' => 0, 'invalid' => 0];
        }
        $channel = isset($row['channel']) ? (string)$row['channel'] : '';
        if ($channel === 'email' || $channel === 'whatsapp') {
            $series[$date][$channel]++;
        }
        $status = isset($row['status']) ? strtolower((string)$row['status']) : '';
        if (in_array($status, ['failed', 'bounced', 'invalid'], true)) {
            $series[$date]['failed']++;
            if (isset($series[$date][$status])) {
                $series[$date][$status]++;
            }
        }
    }
    ksort($series);
    return array_values($series);
}

function mkt_api_dashboard_payload()
{
    $contacts = mkt_one('SELECT COUNT(*) AS total, SUM(CASE WHEN whatsapp IS NOT NULL AND whatsapp <> \'\' THEN 1 ELSE 0 END) AS whatsapp FROM marketing_contacts');
    $campaigns = mkt_one('SELECT COUNT(*) AS total FROM marketing_campaigns');
    $statusRows = mkt_all('SELECT channel, status, COUNT(*) AS total FROM marketing_campaign_recipients GROUP BY channel, status');
    $counts = ['email' => [], 'whatsapp' => []];
    foreach ($statusRows as $row) {
        $channel = (string)(isset($row['channel']) ? $row['channel'] : '');
        $status = strtolower((string)(isset($row['status']) ? $row['status'] : ''));
        if (!isset($counts[$channel][$status])) {
            $counts[$channel][$status] = 0;
        }
        $counts[$channel][$status] += (int)(isset($row['total']) ? $row['total'] : 0);
    }
    $sum = function ($channel, array $statuses) use ($counts) {
        $total = 0;
        foreach ($statuses as $status) {
            $total += isset($counts[$channel][$status]) ? (int)$counts[$channel][$status] : 0;
        }
        return $total;
    };
    $emailSent = $sum('email', ['sent', 'delivered', 'opened', 'clicked']);
    $whatsappSent = $sum('whatsapp', ['sent', 'delivered', 'read']);
    $emailFailed = $sum('email', ['failed', 'bounced', 'invalid']);
    $whatsappFailed = $sum('whatsapp', ['failed', 'invalid']);
    $emailBase = $emailSent + $emailFailed;
    $opened = $sum('email', ['opened', 'clicked']);
    $clicked = $sum('email', ['clicked']);

    $startDate = date('Y-m-d', strtotime('-29 days'));
    $activityRows = mkt_all(
        "SELECT DATE(occurred_at) AS day, 'email' AS channel, COUNT(*) AS total FROM marketing_email_logs WHERE occurred_at >= ? GROUP BY DATE(occurred_at)
        UNION ALL
        SELECT DATE(occurred_at) AS day, 'whatsapp' AS channel, COUNT(*) AS total FROM marketing_whatsapp_logs WHERE occurred_at >= ? GROUP BY DATE(occurred_at)",
        [$startDate, $startDate]
    );
    $activityMap = [];
    for ($i = 0; $i < 30; $i++) {
        $date = date('Y-m-d', strtotime('-' . (29 - $i) . ' days'));
        $activityMap[$date] = ['date' => $date, 'email' => 0, 'whatsapp' => 0];
    }
    foreach ($activityRows as $row) {
        $date = (string)(isset($row['day']) ? $row['day'] : '');
        $channel = (string)(isset($row['channel']) ? $row['channel'] : '');
        if (isset($activityMap[$date]) && ($channel === 'email' || $channel === 'whatsapp')) {
            $activityMap[$date][$channel] = (int)(isset($row['total']) ? $row['total'] : 0);
        }
    }

    $recentRows = mkt_all('SELECT * FROM marketing_campaigns ORDER BY created_at DESC, id DESC LIMIT 6');
    $recent = [];
    foreach ($recentRows as $row) {
        $recent[] = mkt_api_campaign_payload($row);
    }

    return [
        'summary' => [
            'total_contacts' => (int)(isset($contacts['total']) ? $contacts['total'] : 0),
            'total_whatsapp' => (int)(isset($contacts['whatsapp']) ? $contacts['whatsapp'] : 0),
            'total_campaigns' => (int)(isset($campaigns['total']) ? $campaigns['total'] : 0),
            'email_sent' => $emailSent,
            'email_failed' => $emailFailed,
            'whatsapp_sent' => $whatsappSent,
            'whatsapp_failed' => $whatsappFailed,
            'open_rate' => mkt_api_rate($opened, $emailBase),
            'click_rate' => mkt_api_rate($clicked, $emailBase)
        ],
        'activity' => array_values($activityMap),
        'recent_campaigns' => $recent
    ];
}

function mkt_api_setting_saved($key)
{
    return trim((string)marketing_setting_effective((string)$key, '')) !== '';
}

function mkt_api_settings_payload()
{
    $smtpAuth = marketing_bool(marketing_setting_effective('smtp_auth', 1));
    return [
        'email' => [
            'provider' => (string)marketing_setting_effective('email_provider', 'smtp'),
            'smtp_host' => (string)marketing_setting_effective('smtp_host', ''),
            'smtp_port' => (string)marketing_setting_effective('smtp_port', '465'),
            'smtp_user' => (string)marketing_setting_effective('smtp_user', ''),
            'encryption' => (string)marketing_setting_effective('smtp_encryption', 'ssl'),
            'auth' => $smtpAuth,
            'smtp_auth' => $smtpAuth,
            'from_name' => (string)marketing_setting_effective('smtp_from_name', ''),
            'from_email' => (string)marketing_setting_effective('smtp_from_email', ''),
            'smtp_password_saved' => mkt_api_setting_saved('smtp_pass'),
            'gmail_client_id' => (string)marketing_setting_effective('gmail_client_id', ''),
            'gmail_user' => (string)marketing_setting_effective('gmail_user', ''),
            'gmail_client_secret_saved' => mkt_api_setting_saved('gmail_client_secret'),
            'gmail_refresh_token_saved' => mkt_api_setting_saved('gmail_refresh_token'),
            'smtp_status' => marketing_smtp_status()
        ],
        'whatsapp' => [
            'waba_id' => (string)marketing_setting_effective('whatsapp_waba_id', ''),
            'phone_id' => (string)marketing_setting_effective('whatsapp_phone_id', (string)marketing_setting_effective('whatsapp_phone_number_id', '')),
            'api_version' => (string)marketing_setting_effective('whatsapp_api_version', 'v21.0'),
            'token_saved' => mkt_api_setting_saved('whatsapp_token'),
            'app_secret_saved' => mkt_api_setting_saved('whatsapp_app_secret'),
            'verify_token_saved' => mkt_api_setting_saved('whatsapp_verify_token')
        ]
    ];
}

function mkt_api_webhook_payload()
{
    $url = rtrim(marketing_tracking_base_url(), '/') . '/api/marketing/webhook/whatsapp';
    $verify = mkt_api_setting_saved('whatsapp_verify_token');
    $secret = mkt_api_setting_saved('whatsapp_app_secret');
    $connected = mkt_api_setting_saved('whatsapp_token') && mkt_api_setting_saved('whatsapp_phone_id');
    return [
        'url' => $url,
        'webhook_url' => $url,
        'callback_url' => $url,
        'verify_token_configured' => $verify,
        'verify_token_saved' => $verify,
        'app_secret_configured' => $secret,
        'app_secret_saved' => $secret,
        'whatsapp_connected' => $connected,
        'status' => $connected ? 'connected' : 'not_configured'
    ];
}

function mkt_api_input_value($key, array $nested, $flatKey = null, $default = '')
{
    if (array_key_exists($key, $nested)) {
        return [true, $nested[$key]];
    }
    if ($flatKey !== null && array_key_exists($flatKey, $nested)) {
        return [true, $nested[$flatKey]];
    }
    $missing = '__MKT_API_MISSING__';
    if ($flatKey !== null) {
        $value = marketing_val($flatKey, $missing);
        if ($value !== $missing) {
            return [true, $value];
        }
    }
    $value = marketing_val($key, $missing);
    if ($value !== $missing) {
        return [true, $value];
    }
    return [false, $default];
}

function mkt_api_save_settings(array $user)
{
    $email = marketing_val('email', []);
    $whatsapp = marketing_val('whatsapp', []);
    if (!is_array($email)) {
        $email = [];
    }
    if (!is_array($whatsapp)) {
        $whatsapp = [];
    }
    $userId = isset($user['id']) ? (int)$user['id'] : null;

    $plain = [];
    $encrypted = [];
    $put = function ($key, $present, $value, $isEncrypted = false, $alias = null) use (&$plain, &$encrypted) {
        if (!$present) {
            return;
        }
        $text = is_scalar($value) ? trim((string)$value) : '';
        if ($alias !== null) {
            if ($isEncrypted) {
                $encrypted[$alias] = $text;
            } else {
                $plain[$alias] = $text;
            }
        }
        if ($isEncrypted) {
            $encrypted[$key] = $text;
        } else {
            $plain[$key] = $text;
        }
    };

    list($present, $value) = mkt_api_input_value('provider', $email, 'email_provider', 'gmail');
    $put('email_provider', $present, $value);
    list($present, $value) = mkt_api_input_value('smtp_host', $email, null, 'smtp.gmail.com');
    $put('smtp_host', $present, $value);
    list($present, $value) = mkt_api_input_value('smtp_port', $email, null, '465');
    $put('smtp_port', $present, $value);
    $previousSmtpUser = trim((string)marketing_setting_effective('smtp_user', ''));
    $previousSmtpFrom = trim((string)marketing_setting_effective('smtp_from_email', ''));
    $previousGmailUser = trim((string)marketing_setting_effective('gmail_user', ''));
    list($presentSmtpUser, $valueSmtpUser) = mkt_api_input_value('smtp_user', $email, null, 'crop.indonesia@gmail.com');
    $put('smtp_user', $presentSmtpUser, $valueSmtpUser);
    list($present, $value) = mkt_api_input_value('encryption', $email, 'smtp_encryption', 'ssl');
    $put('smtp_encryption', $present, $value);
    list($present, $value) = mkt_api_input_value('auth', $email, 'smtp_auth', 1);
    $put('smtp_auth', $present, marketing_bool($value) ? '1' : '0');
    list($present, $value) = mkt_api_input_value('from_name', $email, 'smtp_from_name', 'CROP Marketing');
    $put('smtp_from_name', $present, $value);
    list($presentFromEmail, $valueFromEmail) = mkt_api_input_value('from_email', $email, 'smtp_from_email', 'crop.indonesia@gmail.com');
    $put('smtp_from_email', $presentFromEmail, $valueFromEmail);
    list($presentGmailUser, $valueGmailUser) = mkt_api_input_value('gmail_user', $email, null, 'crop.indonesia@gmail.com');
    $put('gmail_user', $presentGmailUser, $valueGmailUser);
    $newSmtpUser = $presentSmtpUser ? trim((string)$valueSmtpUser) : $previousSmtpUser;
    $newSmtpFrom = $presentFromEmail ? trim((string)$valueFromEmail) : $previousSmtpFrom;
    $newGmailUser = $presentGmailUser ? trim((string)$valueGmailUser) : $previousGmailUser;
    if (strcasecmp($newSmtpUser, $previousSmtpUser) !== 0 || strcasecmp($newSmtpFrom, $previousSmtpFrom) !== 0) {
        marketing_setting_set('smtp_pass', '', false, $userId);
    }
    if (strcasecmp($newGmailUser, $previousGmailUser) !== 0) {
        marketing_setting_set('gmail_refresh_token', '', false, $userId);
    }
    list($present, $value) = mkt_api_input_value('smtp_password', $email, 'smtp_pass', '');
    $put('smtp_pass', $present, $value, true);
    list($present, $value) = mkt_api_input_value('gmail_client_id', $email, null, '');
    $put('gmail_client_id', $present, $value);
    list($present, $value) = mkt_api_input_value('gmail_client_secret', $email, null, '');
    $put('gmail_client_secret', $present, $value, true);
    list($present, $value) = mkt_api_input_value('gmail_refresh_token', $email, null, '');
    $put('gmail_refresh_token', $present, $value, true);
    list($present, $value) = mkt_api_input_value('sendgrid_key', $email, 'sendgrid_api_key', '');
    $put('sendgrid_key', $present, $value, true, 'sendgrid_api_key');
    list($present, $value) = mkt_api_input_value('brevo_key', $email, 'brevo_api_key', '');
    $put('brevo_key', $present, $value, true, 'brevo_api_key');
    list($present, $value) = mkt_api_input_value('aws_access_key_id', $email, null, '');
    $put('aws_access_key_id', $present, $value);
    list($present, $value) = mkt_api_input_value('aws_secret_access_key', $email, null, '');
    $put('aws_secret_access_key', $present, $value, true);
    list($present, $value) = mkt_api_input_value('aws_region', $email, null, 'us-east-1');
    $put('aws_region', $present, $value);

    list($present, $value) = mkt_api_input_value('waba_id', $whatsapp, 'whatsapp_waba_id', '');
    $put('whatsapp_waba_id', $present, $value);
    list($present, $value) = mkt_api_input_value('phone_id', $whatsapp, 'whatsapp_phone_id', '');
    $put('whatsapp_phone_id', $present, $value, false, 'whatsapp_phone_number_id');
    list($present, $value) = mkt_api_input_value('api_version', $whatsapp, 'whatsapp_api_version', 'v21.0');
    $put('whatsapp_api_version', $present, $value);
    list($present, $value) = mkt_api_input_value('token', $whatsapp, 'whatsapp_token', '');
    $put('whatsapp_token', $present, $value, true, 'whatsapp_access_token');
    list($present, $value) = mkt_api_input_value('app_secret', $whatsapp, 'whatsapp_app_secret', '');
    $put('whatsapp_app_secret', $present, $value, true);
    list($present, $value) = mkt_api_input_value('verify_token', $whatsapp, 'whatsapp_verify_token', '');
    $put('whatsapp_verify_token', $present, $value, true);

    foreach ($plain as $key => $value) {
        if ($value !== '') {
            marketing_setting_set($key, $value, false, $userId);
        }
    }
    foreach ($encrypted as $key => $value) {
        if ($value !== '') {
            marketing_setting_set($key, $value, true, $userId);
        }
    }
    if ($plain !== [] || $encrypted !== []) {
        marketing_smtp_reset_status();
    }
    return true;
}

function mkt_api_header($name)
{
    $key = 'HTTP_' . strtoupper(str_replace('-', '_', (string)$name));
    if (isset($_SERVER[$key])) {
        return trim((string)$_SERVER[$key]);
    }
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        if (is_array($headers)) {
            foreach ($headers as $headerName => $value) {
                if (strtolower((string)$headerName) === strtolower((string)$name)) {
                    return trim((string)$value);
                }
            }
        }
    }
    return '';
}

function mkt_api_contact_insert(array $data, array $user)
{
    $data = array_merge($data, [
        'unsubscribe_token' => marketing_uuid(),
        'unsubscribed' => 0,
        'unsubscribed_at' => null,
        'created_at' => marketing_now(),
        'created_by' => isset($user['id']) ? (int)$user['id'] : null,
        'updated_by' => isset($user['id']) ? (int)$user['id'] : null,
        'updated_at' => marketing_now()
    ]);
    $names = array_keys($data);
    $result = mkt_run(
        'INSERT INTO marketing_contacts (' . implode(', ', $names) . ') VALUES (' . implode(',', array_fill(0, count($names), '?')) . ')',
        array_values($data)
    );
    return (int)$result['insertId'];
}

function mkt_api_contact_update($id, array $data, array $user)
{
    $id = (int)$id;
    $existing = mkt_one('SELECT * FROM marketing_contacts WHERE id = ? LIMIT 1', [$id]);
    if (!is_array($existing)) {
        mkt_api_error('Kontak tidak ditemukan', 404);
    }
    $data['unsubscribe_token'] = isset($existing['unsubscribe_token']) && trim((string)$existing['unsubscribe_token']) !== ''
        ? (string)$existing['unsubscribe_token']
        : marketing_uuid();
    $data['unsubscribed'] = isset($existing['unsubscribed']) ? (int)$existing['unsubscribed'] : 0;
    $data['unsubscribed_at'] = isset($existing['unsubscribed_at']) ? $existing['unsubscribed_at'] : null;
    $data['updated_by'] = isset($user['id']) ? (int)$user['id'] : null;
    $data['updated_at'] = marketing_now();
    $sets = [];
    $params = [];
    foreach ($data as $column => $value) {
        $sets[] = $column . ' = ?';
        $params[] = $value;
    }
    $params[] = $id;
    mkt_run('UPDATE marketing_contacts SET ' . implode(', ', $sets) . ' WHERE id = ?', $params);
    return $id;
}

function mkt_api_group_payload(array $row)
{
    return [
        'id' => (int)(isset($row['id']) ? $row['id'] : 0),
        'name' => (string)(isset($row['name']) ? $row['name'] : ''),
        'description' => (string)(isset($row['description']) ? $row['description'] : ''),
        'type' => (string)(isset($row['type']) ? $row['type'] : 'custom'),
        'member_count' => (int)(isset($row['member_count']) ? $row['member_count'] : 0),
        'created_at' => mkt_api_display_datetime(isset($row['created_at']) ? $row['created_at'] : ''),
        'updated_at' => mkt_api_display_datetime(isset($row['updated_at']) ? $row['updated_at'] : '')
    ];
}

function mkt_api_group_rows()
{
    $rows = mkt_all(
        "SELECT g.*, COUNT(gm.contact_id) AS member_count
        FROM marketing_contact_groups g
        LEFT JOIN marketing_contact_group_members gm ON gm.group_id = g.id
        GROUP BY g.id
        ORDER BY g.name ASC"
    );
    $out = [];
    foreach ($rows as $row) {
        $out[] = mkt_api_group_payload($row);
    }
    return $out;
}

function mkt_api_group_save($id, array $user)
{
    $id = (int)$id;
    $name = trim((string)marketing_val('name', ''));
    if ($name === '') {
        mkt_api_error('Nama grup wajib diisi');
    }
    $description = trim((string)marketing_val('description', ''));
    $duplicate = mkt_one(
        'SELECT id FROM marketing_contact_groups WHERE name = ?' . ($id > 0 ? ' AND id <> ?' : '') . ' LIMIT 1',
        $id > 0 ? [$name, $id] : [$name]
    );
    if (is_array($duplicate)) {
        mkt_api_error('Nama grup sudah digunakan');
    }
    $now = marketing_now();
    $userId = isset($user['id']) ? (int)$user['id'] : null;
    if ($id > 0) {
        mkt_run(
            'UPDATE marketing_contact_groups SET name = ?, description = ?, updated_by = ?, updated_at = ? WHERE id = ?',
            [substr($name, 0, 190), $description !== '' ? $description : null, $userId, $now, $id]
        );
        return $id;
    }
    $result = mkt_run(
        'INSERT INTO marketing_contact_groups (name, description, type, created_by, updated_by, created_at, updated_at) VALUES (?, ?, \'custom\', ?, ?, ?, ?)',
        [substr($name, 0, 190), $description !== '' ? $description : null, $userId, $userId, $now, $now]
    );
    return (int)$result['insertId'];
}

function mkt_api_email_template_payload(array $row)
{
    $html = isset($row['html']) ? (string)$row['html'] : '';
    return [
        'id' => (int)(isset($row['id']) ? $row['id'] : 0),
        'name' => (string)(isset($row['name']) ? $row['name'] : ''),
        'subject' => (string)(isset($row['subject']) ? $row['subject'] : ''),
        'from_name' => '',
        'from_email' => '',
        'html' => $html,
        'body_html' => $html,
        'content' => $html,
        'is_active' => isset($row['is_active']) ? marketing_bool($row['is_active']) : true,
        'created_at' => mkt_api_display_datetime(isset($row['created_at']) ? $row['created_at'] : ''),
        'updated_at' => mkt_api_display_datetime(isset($row['updated_at']) ? $row['updated_at'] : '')
    ];
}

function mkt_api_whatsapp_template_payload(array $row)
{
    $text = isset($row['content']) ? (string)$row['content'] : '';
    $components = [];
    if (isset($row['components']) && trim((string)$row['components']) !== '') {
        $decoded = json_decode((string)$row['components'], true);
        if (is_array($decoded)) {
            $components = $decoded;
        }
    }
    return [
        'id' => (int)(isset($row['id']) ? $row['id'] : 0),
        'name' => (string)(isset($row['name']) ? $row['name'] : ''),
        'template_name' => (string)(isset($row['template_name']) ? $row['template_name'] : ''),
        'language' => (string)(isset($row['language']) ? $row['language'] : 'id'),
        'category' => (string)(isset($row['category']) ? $row['category'] : ''),
        'components' => $components,
        'text' => $text,
        'body' => $text,
        'message' => $text,
        'content' => $text,
        'approved' => isset($row['approved']) ? marketing_bool($row['approved']) : false,
        'is_active' => isset($row['is_active']) ? marketing_bool($row['is_active']) : true,
        'created_at' => mkt_api_display_datetime(isset($row['created_at']) ? $row['created_at'] : ''),
        'updated_at' => mkt_api_display_datetime(isset($row['updated_at']) ? $row['updated_at'] : '')
    ];
}

function mkt_api_email_template_save($id, array $user)
{
    $id = (int)$id;
    $name = trim((string)marketing_val('name', ''));
    $subject = trim((string)marketing_val('subject', ''));
    if ($name === '') {
        mkt_api_error('Nama template wajib diisi');
    }
    if ($subject === '') {
        mkt_api_error('Subjek template wajib diisi');
    }
    $html = (string)marketing_val('html', marketing_val('body_html', marketing_val('content', '')));
    $active = marketing_val('is_active', true);
    $now = marketing_now();
    $userId = isset($user['id']) ? (int)$user['id'] : null;
    if ($id > 0) {
        mkt_run(
            'UPDATE marketing_email_templates SET name = ?, subject = ?, html = ?, is_active = ?, updated_by = ?, updated_at = ? WHERE id = ?',
            [substr($name, 0, 190), substr($subject, 0, 190), $html !== '' ? $html : null, marketing_bool($active) ? 1 : 0, $userId, $now, $id]
        );
        return $id;
    }
    $result = mkt_run(
        'INSERT INTO marketing_email_templates (name, subject, html, is_active, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [substr($name, 0, 190), substr($subject, 0, 190), $html !== '' ? $html : null, marketing_bool($active) ? 1 : 0, $userId, $userId, $now, $now]
    );
    return (int)$result['insertId'];
}

function mkt_api_whatsapp_template_save($id, array $user)
{
    $id = (int)$id;
    $name = trim((string)marketing_val('name', ''));
    $text = (string)marketing_val('text', marketing_val('body', marketing_val('message', marketing_val('content', ''))));
    if ($name === '') {
        mkt_api_error('Nama template wajib diisi');
    }
    if (trim($text) === '') {
        mkt_api_error('Teks template wajib diisi');
    }
    $templateName = trim((string)marketing_val('template_name', $name));
    $language = trim((string)marketing_val('language', 'id'));
    if ($language === '') {
        $language = 'id';
    }
    $category = trim((string)marketing_val('category', ''));
    $componentsRaw = marketing_val('components', null);
    $components = null;
    if (is_array($componentsRaw)) {
        $components = json_encode($componentsRaw, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    } elseif (is_string($componentsRaw) && trim($componentsRaw) !== '') {
        $decoded = json_decode(trim($componentsRaw), true);
        $components = is_array($decoded) ? trim($componentsRaw) : json_encode([], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
    $active = marketing_val('is_active', true);
    $approved = marketing_val('approved', false);
    $now = marketing_now();
    $userId = isset($user['id']) ? (int)$user['id'] : null;
    if ($id > 0) {
        mkt_run(
            "UPDATE marketing_whatsapp_templates SET name = ?, template_name = ?, language = ?, category = ?, components = ?, content = ?, approved = ?, is_active = ?, updated_by = ?, updated_at = ? WHERE id = ?",
            [substr($name, 0, 190), substr($templateName, 0, 190), substr($language, 0, 20), $category !== '' ? substr($category, 0, 100) : null, $components, $text, marketing_bool($approved) ? 1 : 0, marketing_bool($active) ? 1 : 0, $userId, $now, $id]
        );
        return $id;
    }
    $result = mkt_run(
        "INSERT INTO marketing_whatsapp_templates (name, template_name, language, category, components, content, approved, is_active, created_by, updated_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [substr($name, 0, 190), substr($templateName, 0, 190), substr($language, 0, 20), $category !== '' ? substr($category, 0, 100) : null, $components, $text, marketing_bool($approved) ? 1 : 0, marketing_bool($active) ? 1 : 0, $userId, $userId, $now, $now]
    );
    return (int)$result['insertId'];
}

function marketing_api_dispatch(string $method, string $uri): bool
{
    $path = mkt_api_path($uri);
    if (strpos($path, '/api/marketing') !== 0) {
        return false;
    }
    $method = strtoupper(trim($method));
    $user = null;

    if ($path === '/api/marketing/webhook/whatsapp' && $method === 'GET') {
        $mode = (string)marketing_val('hub_mode', '');
        $token = (string)marketing_val('hub_verify_token', '');
        $challenge = (string)marketing_val('hub_challenge', '');
        $expected = (string)marketing_setting_get('whatsapp_verify_token', '');
        if ($mode !== 'subscribe' || $expected === '' || !hash_equals($expected, $token)) {
            http_response_code(403);
            header('Content-Type: text/plain; charset=utf-8');
            echo 'Forbidden';
            exit;
        }
        header('Content-Type: text/plain; charset=utf-8');
        echo $challenge;
        exit;
    }

    if ($path === '/api/marketing/webhook/whatsapp' && $method === 'POST') {
        $raw = file_get_contents('php://input');
        $payload = json_decode(is_string($raw) ? $raw : '', true);
        if (!is_array($payload)) {
            json_response(['message' => 'Invalid payload'], 400);
        }
        $secret = trim((string)marketing_setting_get('whatsapp_app_secret', ''));
        if ($secret !== '') {
            $signature256 = mkt_api_header('X-Hub-Signature-256');
            $signature1 = mkt_api_header('X-Hub-Signature');
            $valid = false;
            if ($signature256 !== '' && strpos($signature256, 'sha256=') === 0) {
                $valid = hash_equals('sha256=' . hash_hmac('sha256', (string)$raw, $secret), $signature256);
            } elseif ($signature1 !== '' && strpos($signature1, 'sha1=') === 0) {
                $valid = hash_equals('sha1=' . hash_hmac('sha1', (string)$raw, $secret), $signature1);
            }
            if (!$valid) {
                json_response(['message' => 'Invalid signature'], 401);
            }
        }
        $result = marketing_process_whatsapp_webhook($payload);
        json_response($result);
    }

    if ($path === '/api/marketing/track/open' && $method === 'GET') {
        marketing_handle_track('open', (int)marketing_val('rid', 0), (string)marketing_val('url', marketing_val('redirect', '')));
    }
    if ($path === '/api/marketing/track/click' && $method === 'GET') {
        marketing_handle_track('click', (int)marketing_val('rid', 0), (string)marketing_val('url', marketing_val('redirect', '')));
    }
    if ($path === '/api/marketing/unsubscribe' && in_array($method, ['GET', 'POST'], true)) {
        marketing_handle_unsubscribe((string)marketing_val('token', ''));
    }

    if ($path === '/api/marketing/dashboard' && $method === 'GET') {
        $user = marketing_require('/marketing-center/dashboard', 'is_view');
        json_response(mkt_api_dashboard_payload());
    }

    if ($path === '/api/marketing/contacts' && $method === 'GET') {
        $user = marketing_require('/marketing-center/contacts', 'is_view');
        list($join, $where, $params) = mkt_api_contact_where();
        $page = mkt_api_page(20);
        $totalRow = mkt_one('SELECT COUNT(DISTINCT c.id) AS total FROM marketing_contacts c' . $join . ' WHERE ' . $where, $params);
        $sql = 'SELECT DISTINCT c.* FROM marketing_contacts c' . $join . ' WHERE ' . $where . ' ORDER BY ' . mkt_api_contact_sort($page['sort'], $page['dir']);
        if (!$page['all']) {
            $sql .= ' LIMIT ' . (int)$page['limit'] . ' OFFSET ' . (int)$page['offset'];
        }
        $rows = mkt_all($sql, $params);
        $data = [];
        foreach ($rows as $row) {
            $data[] = mkt_api_contact_payload($row);
        }
        json_response([
            'data' => $data,
            'total' => (int)(isset($totalRow['total']) ? $totalRow['total'] : 0),
            'page' => $page['page'],
            'limit' => $page['all'] ? 'all' : $page['limit']
        ]);
    }

    if ($path === '/api/marketing/contacts' && $method === 'POST') {
        $user = marketing_require('/marketing-center/contacts', 'is_create');
        $validated = mkt_api_validate_contact(marketing_json_body());
        if ($validated['error'] !== '') {
            mkt_api_error($validated['error']);
        }
        $id = mkt_api_contact_insert($validated['data'], $user);
        marketing_log_activity($user, 'create', 'Kontak Marketing', 'Menambah kontak ' . $validated['data']['name']);
        json_response(['message' => 'Kontak berhasil ditambahkan', 'id' => $id, 'success' => true], 201);
    }

    if ($path === '/api/marketing/contacts/import' && $method === 'POST') {
        $user = marketing_require('/marketing-center/contacts', 'is_create');
        if (!marketing_rate_limit('mkt_api_import:' . (isset($user['id']) ? (int)$user['id'] : 0), 10, 60)) {
            mkt_api_error('Terlalu banyak permintaan impor', 429);
        }
        $rows = marketing_val('rows', marketing_val('contacts', []));
        if (!is_array($rows) || count($rows) === 0) {
            mkt_api_error('Tidak ada data kontak untuk diimpor');
        }
        $inserted = 0;
        $skipped = 0;
        $errors = [];
        foreach ($rows as $index => $row) {
            if (!is_array($row)) {
                $skipped++;
                $errors[] = 'Baris ' . ($index + 1) . ': format tidak valid';
                continue;
            }
            $validated = mkt_api_validate_contact($row);
            if ($validated['error'] !== '') {
                $skipped++;
                $errors[] = 'Baris ' . ($index + 1) . ': ' . $validated['error'];
                continue;
            }
            mkt_api_contact_insert($validated['data'], $user);
            $inserted++;
        }
        marketing_log_activity($user, 'import', 'Kontak Marketing', 'Mengimpor ' . $inserted . ' kontak, melewati ' . $skipped . ' baris');
        json_response([
            'inserted' => $inserted,
            'imported' => $inserted,
            'skipped' => $skipped,
            'errors' => $errors,
            'success' => true
        ]);
    }

    if ($path === '/api/marketing/contacts/export' && $method === 'GET') {
        $user = marketing_require('/marketing-center/contacts', 'is_export');
        list($join, $where, $params) = mkt_api_contact_where();
        $rows = mkt_all('SELECT DISTINCT c.* FROM marketing_contacts c' . $join . ' WHERE ' . $where . ' ORDER BY c.id ASC', $params);
        $data = [];
        foreach ($rows as $row) {
            $data[] = mkt_api_contact_payload($row);
        }
        mkt_api_export_response($data, [
            ['key' => 'name', 'label' => 'Nama'],
            ['key' => 'email', 'label' => 'Email'],
            ['key' => 'whatsapp', 'label' => 'WhatsApp'],
            ['key' => 'company', 'label' => 'Perusahaan'],
            ['key' => 'segment', 'label' => 'Segmen'],
            ['key' => 'category', 'label' => 'Kategori'],
            ['key' => 'source', 'label' => 'Sumber'],
            ['key' => 'opt_in', 'label' => 'Opt_in'],
            ['key' => 'consent_at', 'label' => 'Tanggal Persetujuan'],
            ['key' => 'status', 'label' => 'Status'],
            ['key' => 'notes', 'label' => 'Catatan']
        ], 'kontak-marketing-' . date('Ymd-His'), (string)marketing_val('format', 'xlsx'));
    }

    if ($path === '/api/marketing/contacts/bulk-delete' && $method === 'POST') {
        $user = marketing_require('/marketing-center/contacts', 'is_delete');
        $ids = marketing_id_list(marketing_val('ids', []));
        if (!$ids) {
            mkt_api_error('Pilih kontak yang akan dihapus');
        }
        foreach (array_chunk($ids, 100) as $chunk) {
            $placeholders = implode(',', array_fill(0, count($chunk), '?'));
            mkt_run('DELETE FROM marketing_contacts WHERE id IN (' . $placeholders . ')', $chunk);
        }
        marketing_log_activity($user, 'delete', 'Kontak Marketing', 'Menghapus ' . count($ids) . ' kontak');
        json_response(['message' => 'Kontak terpilih berhasil dihapus', 'deleted' => count($ids), 'success' => true]);
    }

    if (preg_match('#^/api/marketing/contacts/(\d+)$#', $path, $match)) {
        $id = (int)$match[1];
        if ($method === 'GET') {
            $user = marketing_require('/marketing-center/contacts', 'is_view');
            $row = mkt_one('SELECT * FROM marketing_contacts WHERE id = ? LIMIT 1', [$id]);
            if (!is_array($row)) {
                mkt_api_error('Kontak tidak ditemukan', 404);
            }
            json_response(mkt_api_contact_payload($row));
        }
        if ($method === 'PUT') {
            $user = marketing_require('/marketing-center/contacts', 'is_edit');
            $validated = mkt_api_validate_contact(marketing_json_body(), $id);
            if ($validated['error'] !== '') {
                mkt_api_error($validated['error']);
            }
            mkt_api_contact_update($id, $validated['data'], $user);
            marketing_log_activity($user, 'update', 'Kontak Marketing', 'Memperbarui kontak #' . $id);
            json_response(['message' => 'Kontak berhasil diperbarui', 'id' => $id, 'success' => true]);
        }
        if ($method === 'DELETE') {
            $user = marketing_require('/marketing-center/contacts', 'is_delete');
            mkt_run('DELETE FROM marketing_contacts WHERE id = ?', [$id]);
            marketing_log_activity($user, 'delete', 'Kontak Marketing', 'Menghapus kontak #' . $id);
            json_response(['message' => 'Kontak berhasil dihapus', 'success' => true]);
        }
    }

    if ($path === '/api/marketing/groups' && $method === 'GET') {
        $user = marketing_require('/marketing-center/groups', 'is_view');
        json_response(['data' => mkt_api_group_rows()]);
    }
    if ($path === '/api/marketing/groups' && $method === 'POST') {
        $user = marketing_require('/marketing-center/groups', 'is_create');
        $id = mkt_api_group_save(0, $user);
        marketing_log_activity($user, 'create', 'Grup Kontak', 'Menambah grup kontak #' . $id);
        json_response(['message' => 'Grup berhasil ditambahkan', 'id' => $id, 'success' => true], 201);
    }
    if (preg_match('#^/api/marketing/groups/(\d+)$#', $path, $match)) {
        $id = (int)$match[1];
        if ($method === 'PUT') {
            $user = marketing_require('/marketing-center/groups', 'is_edit');
            mkt_api_group_save($id, $user);
            marketing_log_activity($user, 'update', 'Grup Kontak', 'Memperbarui grup kontak #' . $id);
            json_response(['message' => 'Grup berhasil diperbarui', 'id' => $id, 'success' => true]);
        }
        if ($method === 'DELETE') {
            $user = marketing_require('/marketing-center/groups', 'is_delete');
            mkt_run('DELETE FROM marketing_contact_groups WHERE id = ?', [$id]);
            marketing_log_activity($user, 'delete', 'Grup Kontak', 'Menghapus grup kontak #' . $id);
            json_response(['message' => 'Grup berhasil dihapus', 'success' => true]);
        }
    }
    if (preg_match('#^/api/marketing/groups/(\d+)/members$#', $path, $match)) {
        $id = (int)$match[1];
        if ($method === 'GET') {
            $user = marketing_require('/marketing-center/groups', 'is_view');
            $rows = mkt_all(
                'SELECT c.* FROM marketing_contacts c INNER JOIN marketing_contact_group_members gm ON gm.contact_id = c.id WHERE gm.group_id = ? ORDER BY c.name ASC',
                [$id]
            );
            $data = [];
            foreach ($rows as $row) {
                $data[] = mkt_api_contact_payload($row);
            }
            json_response(['data' => $data, 'total' => count($data)]);
        }
        if ($method === 'PUT') {
            $user = marketing_require('/marketing-center/groups', 'is_edit');
            $ids = marketing_id_list(marketing_val('contact_ids', []));
            mkt_run('DELETE FROM marketing_contact_group_members WHERE group_id = ?', [$id]);
            foreach ($ids as $contactId) {
                mkt_run('INSERT IGNORE INTO marketing_contact_group_members (group_id, contact_id) VALUES (?, ?)', [$id, $contactId]);
            }
            marketing_log_activity($user, 'update', 'Grup Kontak', 'Memperbarui anggota grup #' . $id);
            json_response(['message' => 'Anggota grup berhasil disimpan', 'total' => count($ids), 'success' => true]);
        }
    }

    if ($path === '/api/marketing/email-templates' && $method === 'GET') {
        $user = marketing_require('/marketing-center/templates', 'is_view');
        $rows = mkt_all('SELECT * FROM marketing_email_templates ORDER BY id DESC');
        $data = [];
        foreach ($rows as $row) {
            $data[] = mkt_api_email_template_payload($row);
        }
        json_response(['data' => $data]);
    }
    if ($path === '/api/marketing/email-templates' && $method === 'POST') {
        $user = marketing_require('/marketing-center/templates', 'is_create');
        $id = mkt_api_email_template_save(0, $user);
        marketing_log_activity($user, 'create', 'Template Email', 'Menambah template email #' . $id);
        json_response(['message' => 'Template berhasil disimpan', 'id' => $id, 'success' => true], 201);
    }
    if (preg_match('#^/api/marketing/email-templates/(\d+)$#', $path, $match)) {
        $id = (int)$match[1];
        if ($method === 'PUT') {
            $user = marketing_require('/marketing-center/templates', 'is_edit');
            mkt_api_email_template_save($id, $user);
            marketing_log_activity($user, 'update', 'Template Email', 'Memperbarui template email #' . $id);
            json_response(['message' => 'Template berhasil diperbarui', 'id' => $id, 'success' => true]);
        }
        if ($method === 'DELETE') {
            $user = marketing_require('/marketing-center/templates', 'is_delete');
            mkt_run('DELETE FROM marketing_email_templates WHERE id = ?', [$id]);
            marketing_log_activity($user, 'delete', 'Template Email', 'Menghapus template email #' . $id);
            json_response(['message' => 'Template berhasil dihapus', 'success' => true]);
        }
    }

    if ($path === '/api/marketing/whatsapp-templates' && $method === 'GET') {
        $user = marketing_require('/marketing-center/templates', 'is_view');
        $rows = mkt_all('SELECT * FROM marketing_whatsapp_templates ORDER BY id DESC');
        $data = [];
        foreach ($rows as $row) {
            $data[] = mkt_api_whatsapp_template_payload($row);
        }
        json_response(['data' => $data]);
    }
    if ($path === '/api/marketing/whatsapp-templates' && $method === 'POST') {
        $user = marketing_require('/marketing-center/templates', 'is_create');
        $id = mkt_api_whatsapp_template_save(0, $user);
        marketing_log_activity($user, 'create', 'Template WhatsApp', 'Menambah template WhatsApp #' . $id);
        json_response(['message' => 'Template berhasil disimpan', 'id' => $id, 'success' => true], 201);
    }
    if (preg_match('#^/api/marketing/whatsapp-templates/(\d+)$#', $path, $match)) {
        $id = (int)$match[1];
        if ($method === 'PUT') {
            $user = marketing_require('/marketing-center/templates', 'is_edit');
            mkt_api_whatsapp_template_save($id, $user);
            marketing_log_activity($user, 'update', 'Template WhatsApp', 'Memperbarui template WhatsApp #' . $id);
            json_response(['message' => 'Template berhasil diperbarui', 'id' => $id, 'success' => true]);
        }
        if ($method === 'DELETE') {
            $user = marketing_require('/marketing-center/templates', 'is_delete');
            mkt_run('DELETE FROM marketing_whatsapp_templates WHERE id = ?', [$id]);
            marketing_log_activity($user, 'delete', 'Template WhatsApp', 'Menghapus template WhatsApp #' . $id);
            json_response(['message' => 'Template berhasil dihapus', 'success' => true]);
        }
    }

    if ($path === '/api/marketing/campaigns' && $method === 'GET') {
        $user = marketing_require('/marketing-center/campaigns', 'is_view');
        $where = ['1 = 1'];
        $params = [];
        $channel = strtolower(trim((string)marketing_val('channel', marketing_val('type', ''))));
        if (in_array($channel, ['email', 'whatsapp', 'both'], true)) {
            $where[] = 'c.type = ?';
            $params[] = $channel;
        }
        $status = strtolower(trim((string)marketing_val('status', '')));
        if (in_array($status, ['draft', 'scheduled', 'queued', 'running', 'completed', 'cancelled', 'paused'], true)) {
            $where[] = 'c.status = ?';
            $params[] = $status;
        }
        $search = trim((string)marketing_val('search', marketing_val('q', '')));
        if ($search !== '') {
            $where[] = 'c.name LIKE ?';
            $params[] = '%' . $search . '%';
        }
        $whereSql = implode(' AND ', $where);
        $page = mkt_api_page(20);
        $totalRow = mkt_one('SELECT COUNT(*) AS total FROM marketing_campaigns c WHERE ' . $whereSql, $params);
        $sortMap = [
            'id' => 'c.id',
            'name' => 'c.name',
            'type' => 'c.type',
            'channel' => 'c.type',
            'status' => 'c.status',
            'created_at' => 'c.created_at',
            'updated_at' => 'c.updated_at',
            'started_at' => 'c.started_at',
            'scheduled_at' => 'COALESCE(c.email_schedule_at, c.whatsapp_schedule_at)'
        ];
        $sortColumn = isset($sortMap[$page['sort']]) ? $sortMap[$page['sort']] : 'c.created_at';
        $direction = strtolower($page['dir']) === 'asc' ? 'ASC' : 'DESC';
        $sql = 'SELECT c.* FROM marketing_campaigns c WHERE ' . $whereSql . ' ORDER BY ' . $sortColumn . ' ' . $direction . ', c.id ' . $direction;
        if (!$page['all']) {
            $sql .= ' LIMIT ' . (int)$page['limit'] . ' OFFSET ' . (int)$page['offset'];
        }
        $rows = mkt_all($sql, $params);
        $data = [];
        foreach ($rows as $row) {
            $data[] = mkt_api_campaign_payload($row);
        }
        json_response([
            'data' => $data,
            'total' => (int)(isset($totalRow['total']) ? $totalRow['total'] : 0),
            'page' => $page['page'],
            'limit' => $page['all'] ? 'all' : $page['limit']
        ]);
    }

    if ($path === '/api/marketing/campaigns' && $method === 'POST') {
        $user = marketing_require('/marketing-center/campaigns', 'is_create');
        $id = mkt_api_campaign_save(0, $user);
        $row = mkt_one('SELECT * FROM marketing_campaigns WHERE id = ? LIMIT 1', [$id]);
        marketing_log_activity($user, 'create', 'Kampanye', 'Menambah kampanye ' . (is_array($row) ? (string)$row['name'] : ('#' . $id)));
        json_response([
            'message' => 'Kampanye berhasil disimpan',
            'id' => $id,
            'data' => is_array($row) ? mkt_api_campaign_payload($row) : null,
            'success' => true
        ], 201);
    }

    if (preg_match('#^/api/marketing/campaigns/(\d+)/recipients$#', $path, $match)) {
        $id = (int)$match[1];
        if ($method === 'GET') {
            $user = marketing_require('/marketing-center/campaigns', 'is_view');
            $totalRow = mkt_one('SELECT COUNT(*) AS total FROM marketing_campaign_recipients WHERE campaign_id = ?', [$id]);
            $page = mkt_api_page(50);
            $rows = mkt_api_recipient_rows($id, $page['all'] ? 0 : $page['limit'], $page['offset']);
            json_response([
                'data' => $rows,
                'total' => (int)(isset($totalRow['total']) ? $totalRow['total'] : 0),
                'page' => $page['page'],
                'limit' => $page['all'] ? 'all' : $page['limit']
            ]);
        }
    }

    if (preg_match('#^/api/marketing/campaigns/(\d+)/duplicate$#', $path, $match) && $method === 'POST') {
        $id = (int)$match[1];
        $user = marketing_require('/marketing-center/campaigns', 'is_create');
        $original = mkt_one('SELECT * FROM marketing_campaigns WHERE id = ? LIMIT 1', [$id]);
        if (!is_array($original)) {
            mkt_api_error('Kampanye tidak ditemukan', 404);
        }
        $now = marketing_now();
        $userId = isset($user['id']) ? (int)$user['id'] : null;
        $duplicate = [
            'name' => substr((string)$original['name'] . ' (Salinan)', 0, 190),
            'type' => (string)$original['type'],
            'status' => 'draft',
            'recipients_config' => isset($original['recipients_config']) ? $original['recipients_config'] : null,
            'email_subject' => isset($original['email_subject']) ? $original['email_subject'] : null,
            'email_from_name' => isset($original['email_from_name']) ? $original['email_from_name'] : null,
            'email_from_email' => isset($original['email_from_email']) ? $original['email_from_email'] : null,
            'email_template_id' => isset($original['email_template_id']) ? $original['email_template_id'] : null,
            'email_content' => isset($original['email_content']) ? $original['email_content'] : null,
            'email_schedule_at' => null,
            'whatsapp_template_id' => isset($original['whatsapp_template_id']) ? $original['whatsapp_template_id'] : null,
            'whatsapp_content' => isset($original['whatsapp_content']) ? $original['whatsapp_content'] : null,
            'whatsapp_schedule_at' => null,
            'created_by' => $userId,
            'updated_by' => $userId,
            'created_at' => $now,
            'updated_at' => $now,
            'started_at' => null,
            'completed_at' => null
        ];
        $names = array_keys($duplicate);
        $result = mkt_run(
            'INSERT INTO marketing_campaigns (' . implode(', ', $names) . ') VALUES (' . implode(',', array_fill(0, count($names), '?')) . ')',
            array_values($duplicate)
        );
        $newId = (int)$result['insertId'];
        marketing_log_activity($user, 'duplicate', 'Kampanye', 'Menduplikat kampanye #' . $id);
        json_response(['message' => 'Kampanye berhasil diduplikat', 'id' => $newId, 'success' => true], 201);
    }

    if (preg_match('#^/api/marketing/campaigns/(\d+)/start$#', $path, $match) && $method === 'POST') {
        $id = (int)$match[1];
        $user = marketing_require('/marketing-center/campaigns', 'is_edit');
        $campaign = mkt_one('SELECT * FROM marketing_campaigns WHERE id = ? LIMIT 1', [$id]);
        if (!is_array($campaign)) {
            mkt_api_error('Kampanye tidak ditemukan', 404);
        }
        $counts = marketing_enqueue_campaign($id);
        marketing_log_activity($user, 'start', 'Kampanye', 'Memulai kampanye ' . (string)$campaign['name']);
        json_response(['message' => 'Kampanye berhasil dimulai', 'counts' => $counts, 'success' => true]);
    }

    if (preg_match('#^/api/marketing/campaigns/(\d+)/schedule$#', $path, $match) && $method === 'POST') {
        $id = (int)$match[1];
        $user = marketing_require('/marketing-center/campaigns', 'is_edit');
        $campaign = mkt_one('SELECT * FROM marketing_campaigns WHERE id = ? LIMIT 1', [$id]);
        if (!is_array($campaign)) {
            mkt_api_error('Kampanye tidak ditemukan', 404);
        }
        $type = strtolower((string)(isset($campaign['type']) ? $campaign['type'] : 'email'));
        $generic = trim((string)marketing_val('scheduled_at', ''));
        $emailRaw = trim((string)marketing_val('scheduled_at_email', marketing_val('schedule_email', '')));
        $whatsappRaw = trim((string)marketing_val('scheduled_at_whatsapp', marketing_val('schedule_whatsapp', '')));
        if ($generic !== '') {
            if ($emailRaw === '' && ($type === 'email' || $type === 'both')) {
                $emailRaw = $generic;
            }
            if ($whatsappRaw === '' && ($type === 'whatsapp' || $type === 'both')) {
                $whatsappRaw = $generic;
            }
        }
        $emailSchedule = mkt_api_db_datetime($emailRaw);
        $whatsappSchedule = mkt_api_db_datetime($whatsappRaw);
        if ($emailSchedule === null && $whatsappSchedule === null) {
            mkt_api_error('Waktu jadwal tidak valid');
        }
        $now = marketing_now();
        mkt_run(
            'UPDATE marketing_campaigns SET email_schedule_at = ?, whatsapp_schedule_at = ?, status = \'scheduled\', updated_by = ?, updated_at = ? WHERE id = ?',
            [$emailSchedule, $whatsappSchedule, isset($user['id']) ? (int)$user['id'] : null, $now, $id]
        );
        $counts = marketing_enqueue_campaign($id);
        marketing_log_activity($user, 'schedule', 'Kampanye', 'Menjadwalkan kampanye ' . (string)$campaign['name']);
        json_response(['message' => 'Jadwal kampanye berhasil disimpan', 'counts' => $counts, 'success' => true]);
    }

    if (preg_match('#^/api/marketing/campaigns/(\d+)/cancel$#', $path, $match) && $method === 'POST') {
        $id = (int)$match[1];
        $user = marketing_require('/marketing-center/campaigns', 'is_edit');
        $campaign = mkt_one('SELECT name FROM marketing_campaigns WHERE id = ? LIMIT 1', [$id]);
        if (!is_array($campaign)) {
            mkt_api_error('Kampanye tidak ditemukan', 404);
        }
        marketing_cancel_campaign($id);
        marketing_log_activity($user, 'cancel', 'Kampanye', 'Membatalkan kampanye ' . (string)$campaign['name']);
        json_response(['message' => 'Kampanye berhasil dibatalkan', 'success' => true]);
    }

    if (preg_match('#^/api/marketing/campaigns/(\d+)/pause$#', $path, $match) && $method === 'POST') {
        $id = (int)$match[1];
        $user = marketing_require('/marketing-center/campaigns', 'is_edit');
        $campaign = mkt_one('SELECT name FROM marketing_campaigns WHERE id = ? LIMIT 1', [$id]);
        if (!is_array($campaign)) {
            mkt_api_error('Kampanye tidak ditemukan', 404);
        }
        mkt_run(
            'UPDATE marketing_campaigns SET status = \'paused\', updated_by = ?, updated_at = ? WHERE id = ?',
            [isset($user['id']) ? (int)$user['id'] : null, marketing_now(), $id]
        );
        marketing_log_activity($user, 'pause', 'Kampanye', 'Menjeda kampanye ' . (string)$campaign['name']);
        json_response(['message' => 'Kampanye berhasil dijeda', 'success' => true]);
    }

    if (preg_match('#^/api/marketing/campaigns/(\d+)$#', $path, $match)) {
        $id = (int)$match[1];
        if ($method === 'GET') {
            $user = marketing_require('/marketing-center/campaigns', 'is_view');
            $row = mkt_one('SELECT * FROM marketing_campaigns WHERE id = ? LIMIT 1', [$id]);
            if (!is_array($row)) {
                mkt_api_error('Kampanye tidak ditemukan', 404);
            }
            $payload = mkt_api_campaign_payload($row);
            $payload['recipients'] = array_merge(
                isset($payload['recipients']) && is_array($payload['recipients']) ? $payload['recipients'] : [],
                ['rows' => mkt_api_recipient_rows($id, 50, 0)]
            );
            json_response($payload);
        }
        if ($method === 'PUT') {
            $user = marketing_require('/marketing-center/campaigns', 'is_edit');
            mkt_api_campaign_save($id, $user);
            $row = mkt_one('SELECT * FROM marketing_campaigns WHERE id = ? LIMIT 1', [$id]);
            marketing_log_activity($user, 'update', 'Kampanye', 'Memperbarui kampanye #' . $id);
            json_response([
                'message' => 'Kampanye berhasil diperbarui',
                'id' => $id,
                'data' => is_array($row) ? mkt_api_campaign_payload($row) : null,
                'success' => true
            ]);
        }
        if ($method === 'DELETE') {
            $user = marketing_require('/marketing-center/campaigns', 'is_delete');
            mkt_run('DELETE FROM marketing_campaigns WHERE id = ?', [$id]);
            marketing_log_activity($user, 'delete', 'Kampanye', 'Menghapus kampanye #' . $id);
            json_response(['message' => 'Kampanye berhasil dihapus', 'success' => true]);
        }
    }

    if ($path === '/api/marketing/analytics' && $method === 'GET') {
        $user = marketing_require('/marketing-center/analytics', 'is_view');
        $rows = mkt_api_analytics_rows();
        json_response([
            'summary' => mkt_api_analytics_summary($rows),
            'series' => mkt_api_analytics_series($rows),
            'data' => $rows,
            'total' => count($rows)
        ]);
    }

    if ($path === '/api/marketing/analytics/export' && $method === 'GET') {
        $user = marketing_require('/marketing-center/analytics', 'is_export');
        $rows = mkt_api_analytics_rows();
        mkt_api_export_response($rows, [
            ['key' => 'campaign_name', 'label' => 'Nama Kampanye'],
            ['key' => 'channel', 'label' => 'Kanal'],
            ['key' => 'contact_name', 'label' => 'Nama Kontak'],
            ['key' => 'email', 'label' => 'Email'],
            ['key' => 'whatsapp', 'label' => 'WhatsApp'],
            ['key' => 'segment', 'label' => 'Segmen'],
            ['key' => 'status', 'label' => 'Status'],
            ['key' => 'attempts', 'label' => 'Percobaan'],
            ['key' => 'sent_at', 'label' => 'Waktu Kirim'],
            ['key' => 'delivered_at', 'label' => 'Waktu Terdeliver'],
            ['key' => 'opened_at', 'label' => 'Waktu Dibuka'],
            ['key' => 'clicked_at', 'label' => 'Waktu Diklik'],
            ['key' => 'read_at', 'label' => 'Waktu Dibaca'],
            ['key' => 'error_message', 'label' => 'Keterangan']
        ], 'analitik-marketing-' . date('Ymd-His'), (string)marketing_val('format', 'xlsx'));
    }

    if ($path === '/api/marketing/settings' && $method === 'GET') {
        $user = marketing_require('/marketing-center/settings', 'is_view');
        json_response(mkt_api_settings_payload());
    }

    if ($path === '/api/marketing/settings' && $method === 'PUT') {
        $user = marketing_require('/marketing-center/settings', 'is_edit');
        mkt_api_save_settings($user);
        marketing_log_activity($user, 'update', 'Pengaturan Marketing', 'Memperbarui pengaturan integrasi marketing');
        json_response(['message' => 'Pengaturan marketing berhasil disimpan', 'success' => true]);
    }

    if ($path === '/api/marketing/smtp-status' && $method === 'GET') {
        marketing_require('/marketing-center/settings', 'is_view');
        json_response(marketing_smtp_status());
    }

    if ($path === '/api/marketing/test-smtp' && $method === 'POST') {
        $user = marketing_require('/marketing-center/settings', 'is_edit');
        if (!marketing_rate_limit('mkt_api_test_smtp:' . (isset($user['id']) ? (int)$user['id'] : 0), 5, 60)) {
            mkt_api_error('Terlalu banyak percobaan koneksi email', 429);
        }
        $result = marketing_test_smtp_connection();
        $ok = !empty($result['ok']);
        $error = $ok ? '' : (string)(isset($result['error']) ? $result['error'] : (isset($result['message']) ? $result['message'] : 'Gagal menguji koneksi email'));
        $message = $ok ? (string)$result['message'] : $error;
        $status = marketing_smtp_save_status($ok, $message);
        marketing_log_activity($user, $ok ? 'verify' : 'error', 'Pengaturan Marketing', ($ok ? 'Berhasil' : 'Gagal') . ' menguji koneksi email');
        json_response([
            'ok' => $ok,
            'success' => $ok,
            'message' => $message,
            'error' => $error,
            'status' => $status,
            'host' => isset($result['host']) ? $result['host'] : '',
            'port' => isset($result['port']) ? $result['port'] : 0,
            'encryption' => isset($result['encryption']) ? $result['encryption'] : ''
        ], $ok ? 200 : 400);
    }

    if ($path === '/api/marketing/test-email' && $method === 'POST') {
        $user = marketing_require('/marketing-center/settings', 'is_edit');
        if (!marketing_rate_limit('mkt_api_test_email:' . (isset($user['id']) ? (int)$user['id'] : 0), 5, 60)) {
            mkt_api_error('Terlalu banyak percobaan pengiriman email', 429);
        }
        $to = trim((string)marketing_val('to', marketing_val('email', '')));
        if (!marketing_validate_email($to)) {
            json_response(['ok' => false, 'message' => 'Alamat email uji tidak valid', 'error' => 'Alamat email uji tidak valid'], 400);
        }
        $result = marketing_test_email($to);
        $ok = !empty($result['ok']);
        $error = $ok ? '' : (string)(isset($result['error']) ? $result['error'] : (isset($result['message']) ? $result['message'] : 'Gagal mengirim email uji'));
        $message = $ok
            ? (string)(isset($result['message']) ? $result['message'] : 'Email uji berhasil dikirim')
            : $error;
        $status = marketing_smtp_save_status($ok, $message);
        json_response(['ok' => $ok, 'message' => $message, 'error' => $error, 'status' => $status], $ok ? 200 : 400);
    }

    if ($path === '/api/marketing/test-whatsapp' && $method === 'POST') {
        $user = marketing_require('/marketing-center/settings', 'is_edit');
        if (!marketing_rate_limit('mkt_api_test_whatsapp:' . (isset($user['id']) ? (int)$user['id'] : 0), 5, 60)) {
            mkt_api_error('Terlalu banyak percobaan koneksi WhatsApp', 429);
        }
        $result = marketing_test_whatsapp();
        $ok = !empty($result['ok']);
        $error = $ok ? '' : (string)(isset($result['error']) ? $result['error'] : 'Gagal menguji koneksi WhatsApp');
        $message = $ok ? 'Koneksi WhatsApp berhasil diperiksa' : $error;
        json_response(['ok' => $ok, 'message' => $message, 'error' => $error], $ok ? 200 : 400);
    }

    if ($path === '/api/marketing/webhook' && $method === 'GET') {
        $user = marketing_require('/marketing-center/settings', 'is_view');
        json_response(mkt_api_webhook_payload());
    }

    json_response(['message' => 'Endpoint marketing tidak ditemukan'], 404);
    return false;
}

