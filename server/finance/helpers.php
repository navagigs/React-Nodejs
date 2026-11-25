<?php

function fin_setting($key, $default = '')
{
    $row = mkt_one('SELECT setting_value FROM fin_settings WHERE setting_key = ?', [$key]);
    return is_array($row) && ($row['setting_value'] !== null) ? $row['setting_value'] : $default;
}

function fin_setting_json($key, $default = [])
{
    $raw = fin_setting($key, '');
    $decoded = is_string($raw) && trim($raw) !== '' ? json_decode($raw, true) : null;
    return is_array($decoded) ? $decoded : $default;
}

function fin_value($key, $default = '')
{
    $value = marketing_val($key, null);
    if ($value === null) {
        $body = body();
        $value = array_key_exists($key, $body) ? $body[$key] : $default;
    }
    return $value;
}

function fin_text($key, $default = '', $maxLength = 255)
{
    $value = trim((string)fin_value($key, $default));
    return mb_substr($value, 0, $maxLength);
}

function fin_int($key, $default = 0)
{
    return marketing_int(fin_value($key, $default), $default);
}

function fin_bool($key, $default = false)
{
    $raw = fin_value($key, null);
    return $raw === null ? $default : marketing_bool($raw);
}

function fin_date($key, $default = null)
{
    $raw = trim((string)fin_value($key, ''));
    if ($raw === '') {
        return $default === null ? date('Y-m-d') : $default;
    }
    $parsed = DateTime::createFromFormat('Y-m-d', substr($raw, 0, 10));
    $errors = DateTime::getLastErrors();
    if (!$parsed || (is_array($errors) && ($errors['warning_count'] > 0 || $errors['error_count'] > 0))) {
        fin_error('Format tanggal tidak valid', 422);
    }
    return $parsed->format('Y-m-d');
}

function fin_period($key, $default = null)
{
    $raw = trim((string)fin_value($key, ''));
    if ($raw === '') {
        return $default === null ? date('Y-m') : $default;
    }
    if (!preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $raw)) {
        fin_error('Format periode harus YYYY-MM', 422);
    }
    return $raw;
}

function fin_cents($value)
{
    if (is_int($value)) {
        return $value;
    }
    $raw = trim((string)$value);
    if ($raw === '') {
        return 0;
    }
    if (preg_match('/^-?\d{1,3}(\.\d{3})+(,\d{1,2})?$/', $raw)) {
        $raw = str_replace('.', '', $raw);
        $raw = str_replace(',', '.', $raw);
    }
    $raw = str_replace([' ', 'Rp'], '', $raw);
    if (!preg_match('/^-?\d+(\.\d{1,2})?$/', $raw)) {
        fin_error('Nominal tidak valid', 422);
    }
    $negative = isset($raw[0]) && $raw[0] === '-';
    $parts = explode('.', ltrim($raw, '-'));
    $rupiah = (int)$parts[0];
    $sen = isset($parts[1]) ? (int)str_pad($parts[1], 2, '0') : 0;
    $cents = $rupiah * 100 + $sen;
    return $negative ? -$cents : $cents;
}

function fin_money($cents)
{
    if (is_string($cents) && preg_match('/^-?\d+(\.\d{1,2})?$/', trim($cents))) {
        $cents = fin_cents($cents);
    }
    $cents = (int)$cents;
    $negative = $cents < 0;
    $cents = abs($cents);
    return ($negative ? '-' : '') . intdiv($cents, 100) . '.' . str_pad((string)($cents % 100), 2, '0', STR_PAD_LEFT);
}

function fin_number($prefix, $date = null)
{
    $date = $date ?: date('Y-m-d');
    $key = $prefix . date('Ym', strtotime($date));
    mkt_run('INSERT IGNORE INTO fin_sequences (seq_key, seq_value) VALUES (?, 0)', [$key]);
    mkt_run('UPDATE fin_sequences SET seq_value = LAST_INSERT_ID(seq_value + 1) WHERE seq_key = ?', [$key]);
    $row = mkt_one('SELECT LAST_INSERT_ID() AS seq', []);
    $seq = (int)(isset($row['seq']) ? $row['seq'] : 1);
    return $prefix . '/' . date('Ymd', strtotime($date)) . '/' . str_pad((string)$seq, 5, '0', STR_PAD_LEFT);
}

function fin_now()
{
    return date('Y-m-d H:i:s');
}

function fin_error($message, $status = 400)
{
    json_response(['message' => $message, 'success' => false], $status);
}

function fin_ok($data = [], $status = 200)
{
    json_response(array_merge(['success' => true], $data), $status);
}

function fin_user()
{
    static $cached = null;
    if ($cached === null) {
        $cached = marketing_current_user(true);
    }
    return $cached;
}

function fin_require($menuUrl, $flag = 'is_view')
{
    $user = marketing_require($menuUrl, $flag);
    return $user;
}

function fin_can($menuUrl, $flag = 'is_view')
{
    $user = fin_user();
    if (!is_array($user)) {
        return false;
    }
    if (in_array((int)$user['role_id'], [1, 7], true)) {
        return true;
    }
    return marketing_can($user['role_id'], $menuUrl, $flag);
}

function fin_can_approve()
{
    $user = fin_user();
    if (!is_array($user)) {
        return false;
    }
    $roles = fin_setting_json('approver_roles', [1, 7, 8, 9]);
    return in_array((int)$user['role_id'], array_map('intval', $roles), true);
}

function fin_audit($entityType, $entityId, $action, $old = null, $new = null)
{
    $user = fin_user();
    mkt_run(
        'INSERT INTO fin_audit_logs (entity_type, entity_id, action, old_values, new_values, user_id, user_name, role_id, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
            $entityType,
            $entityId,
            $action,
            is_array($old) ? json_encode($old, JSON_UNESCAPED_UNICODE) : $old,
            is_array($new) ? json_encode($new, JSON_UNESCAPED_UNICODE) : $new,
            is_array($user) ? $user['id'] : null,
            is_array($user) ? $user['email'] : null,
            is_array($user) ? $user['role_id'] : null,
            isset($_SERVER['REMOTE_ADDR']) ? substr($_SERVER['REMOTE_ADDR'], 0, 64) : null,
            fin_now()
        ]
    );
}

function fin_guard_period($date)
{
    $period = substr($date, 0, 7);
    $row = mkt_one('SELECT status FROM fin_fiscal_periods WHERE period = ?', [$period]);
    if (is_array($row) && $row['status'] === 'closed') {
        fin_error('Periode akuntansi ' . $period . ' sudah ditutup', 423);
    }
}

function fin_account_by_code($code)
{
    $row = mkt_one('SELECT * FROM fin_accounts WHERE code = ?', [$code]);
    if (!is_array($row)) {
        fin_error('Akun COA ' . $code . ' tidak ditemukan', 500);
    }
    return $row;
}

function fin_journal($journalDate, $description, $lines, $referenceType = null, $referenceId = null)
{
    $totalDebit = 0;
    $totalCredit = 0;
    $prepared = [];
    foreach ($lines as $line) {
        $debit = fin_cents(isset($line['debit']) ? $line['debit'] : 0);
        $credit = fin_cents(isset($line['credit']) ? $line['credit'] : 0);
        if ($debit < 0 || $credit < 0 || ($debit > 0 && $credit > 0)) {
            fin_error('Baris jurnal harus memiliki debit atau kredit saja', 422);
        }
        $code = isset($line['code']) ? $line['code'] : (isset($line['account_code']) ? $line['account_code'] : '');
        $account = fin_account_by_code($code);
        $totalDebit += $debit;
        $totalCredit += $credit;
        $prepared[] = [
            'account_id' => (int)$account['id'],
            'debit' => $debit,
            'credit' => $credit,
            'description' => isset($line['description']) ? mb_substr((string)$line['description'], 0, 255) : $description
        ];
    }
    if (count($prepared) < 2 || $totalDebit <= 0 || $totalDebit !== $totalCredit) {
        fin_error('Jurnal tidak seimbang (debit harus sama dengan kredit)', 422);
    }
    $user = fin_user();
    $journalNo = fin_number('JRU', $journalDate);
    $result = mkt_run(
        'INSERT INTO fin_journals (journal_no, journal_date, description, reference_type, reference_id, total_debit, total_credit, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, \'posted\', ?, ?)',
        [$journalNo, $journalDate, mb_substr((string)$description, 0, 500), $referenceType, $referenceId, fin_money($totalDebit), fin_money($totalCredit), is_array($user) ? $user['id'] : null, fin_now()]
    );
    $journalId = (int)$result['insertId'];
    $db = $GLOBALS['db'];
    $insert = $db->prepare('INSERT INTO fin_journal_lines (journal_id, account_id, debit, credit, description, line_order) VALUES (?, ?, ?, ?, ?, ?)');
    foreach ($prepared as $i => $line) {
        $debitValue = fin_money($line['debit']);
        $creditValue = fin_money($line['credit']);
        $order = $i + 1;
        $insert->bind_param('iisssi', $journalId, $line['account_id'], $debitValue, $creditValue, $line['description'], $order);
        $insert->execute();
    }
    $insert->close();
    fin_audit('journal', $journalId, 'post', null, ['journal_no' => $journalNo, 'total' => fin_money($totalDebit)]);
    return $journalId;
}

function fin_reverse_journal($journalId, $reason)
{
    $journal = mkt_one('SELECT * FROM fin_journals WHERE id = ?', [$journalId]);
    if (!is_array($journal)) {
        fin_error('Jurnal tidak ditemukan', 404);
    }
    if ($journal['status'] !== 'posted' || !empty($journal['cancelled_at'])) {
        fin_error('Jurnal ini sudah dibatalkan', 409);
    }
    $lines = mkt_all('SELECT l.*, a.code FROM fin_journal_lines l INNER JOIN fin_accounts a ON a.id = l.account_id WHERE l.journal_id = ? ORDER BY l.line_order', [$journalId]);
    $reversal = [];
    foreach ($lines as $line) {
        $reversal[] = [
            'code' => $line['code'],
            'debit' => $line['credit'],
            'credit' => $line['debit'],
            'description' => 'Pembatalan: ' . $journal['journal_no']
        ];
    }
    $newId = fin_journal($journal['journal_date'], 'Jurnal koreksi pembatalan ' . $journal['journal_no'] . ' - ' . $reason, $reversal, 'reversal', (int)$journal['id']);
    $user = fin_user();
    mkt_run('UPDATE fin_journals SET cancelled_by = ?, cancelled_at = ?, cancelled_reason = ? WHERE id = ?', [
        is_array($user) ? $user['id'] : null,
        fin_now(),
        mb_substr((string)$reason, 0, 255),
        $journalId
    ]);
    mkt_run('UPDATE fin_journals SET reversal_of = ? WHERE id = ?', [$journalId, $newId]);
    fin_audit('journal', $journalId, 'cancel', ['status' => 'posted'], ['cancelled_at' => fin_now(), 'reason' => $reason, 'reversal_journal_id' => $newId]);
    return $newId;
}

function fin_cash_movement($accountId, $amountCents, $direction, $date, $type, $referenceType, $referenceId, $description, $transferId = null)
{
    $account = mkt_one('SELECT * FROM fin_cash_accounts WHERE id = ? AND deleted_at IS NULL', [$accountId]);
    if (!is_array($account)) {
        fin_error('Rekening/kas tidak ditemukan', 404);
    }
    $delta = $direction > 0 ? $amountCents : -$amountCents;
    $balance = fin_cents($account['current_balance']) + $delta;
    $user = fin_user();
    mkt_run('UPDATE fin_cash_accounts SET current_balance = ?, updated_at = ? WHERE id = ?', [fin_money($balance), fin_now(), $accountId]);
    mkt_run(
        'INSERT INTO fin_cash_movements (account_id, movement_date, movement_type, amount, direction, balance_after, reference_type, reference_id, transfer_id, description, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [$accountId, $date, $type, fin_money($amountCents), $direction > 0 ? 1 : 0, fin_money($balance), $referenceType, $referenceId, $transferId, mb_substr((string)$description, 0, 255), is_array($user) ? $user['id'] : null, fin_now()]
    );
    return $balance;
}

function fin_notify($type, $title, $message, $referenceType = null, $referenceId = null, $dueDate = null, $roleId = null)
{
    mkt_run(
        'INSERT INTO fin_notifications (user_id, role_id, type, title, message, reference_type, reference_id, due_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [null, $roleId, $type, mb_substr($title, 0, 180), mb_substr((string)$message, 0, 500), $referenceType, $referenceId, $dueDate, fin_now()]
    );
}

function fin_upload($field)
{
    $files = uploaded_files();
    if (!isset($files[$field]) || !is_array($files[$field])) {
        return null;
    }
    $file = $files[$field];
    $error = isset($file['error']) ? (int)$file['error'] : UPLOAD_ERR_OK;
    if ($error !== UPLOAD_ERR_OK || empty($file['tmp_name'])) {
        fin_error('File bukti transaksi gagal diunggah', 422);
    }
    if (!empty($file['size']) && (int)$file['size'] > 5 * 1024 * 1024) {
        fin_error('Ukuran file maksimal 5 MB', 422);
    }
    $original = isset($file['name']) ? (string)$file['name'] : '';
    $ext = strtolower(pathinfo($original, PATHINFO_EXTENSION));
    if (!in_array($ext, ['jpg', 'jpeg', 'png', 'pdf', 'webp'], true)) {
        fin_error('Format file harus JPG, PNG, WEBP, atau PDF', 422);
    }
    $path = save_upload($field, $ext);
    if (!$path) {
        fin_error('Gagal menyimpan bukti transaksi', 500);
    }
    return basename($path);
}

function fin_period_bounds()
{
    $preset = fin_text('period', 'month');
    $from = trim((string)fin_value('from', ''));
    $to = trim((string)fin_value('to', ''));
    $today = date('Y-m-d');
    if ($preset === 'custom' || $from !== '' || $to !== '') {
        if ($from === '' || $to === '') {
            fin_error('Rentang tanggal wajib diisi', 422);
        }
        $fromDate = fin_date('from', $today);
        $toDate = fin_date('to', $today);
        if ($fromDate > $toDate) {
            fin_error('Tanggal awal tidak boleh setelah tanggal akhir', 422);
        }
        return [$fromDate, $toDate];
    }
    switch ($preset) {
        case 'today':
            return [$today, $today];
        case 'week':
            $monday = date('Y-m-d', strtotime('monday this week'));
            return [$monday, date('Y-m-d', strtotime($monday . ' +6 days'))];
        case 'year':
            return [date('Y-01-01'), date('Y-12-31')];
        case 'month':
        default:
            return [date('Y-m-01'), date('Y-m-t')];
    }
}

function fin_pagination($defaultLimit = 20)
{
    $all = fin_bool('all', false);
    $page = max(1, fin_int('page', 1));
    $limit = min(500, max(1, fin_int('limit', $defaultLimit)));
    return ['page' => $page, 'limit' => $limit, 'offset' => ($page - 1) * $limit, 'all' => $all];
}

function fin_account_balance($code, $asOfDate = null, $journalStatus = 'posted')
{
    $account = fin_account_by_code($code);
    $params = [$account['id']];
    $dateSql = '';
    if ($asOfDate) {
        $dateSql = ' AND j.journal_date <= ?';
        $params[] = $asOfDate;
    }
    $statusSql = $journalStatus ? ' AND j.status = ?' : '';
    if ($journalStatus) {
        $params[] = $journalStatus;
    }
    $row = mkt_one(
        'SELECT COALESCE(SUM(l.debit), 0) AS debit, COALESCE(SUM(l.credit), 0) AS credit FROM fin_journal_lines l INNER JOIN fin_journals j ON j.id = l.journal_id WHERE l.account_id = ?' . $dateSql . $statusSql,
        $params
    );
    $debit = fin_cents(isset($row['debit']) ? $row['debit'] : 0);
    $credit = fin_cents(isset($row['credit']) ? $row['credit'] : 0);
    return $account['normal_balance'] === 'debit' ? $debit - $credit : $credit - $debit;
}

function fin_totals_for_period($from, $to)
{
    $row = mkt_one(
        "SELECT
            COALESCE(SUM(CASE WHEN a.account_group = 'revenue' THEN l.credit - l.debit END), 0) AS revenue,
            COALESCE(SUM(CASE WHEN a.account_group = 'expense' THEN l.debit - l.credit END), 0) AS expense
        FROM fin_journal_lines l
        INNER JOIN fin_journals j ON j.id = l.journal_id
        INNER JOIN fin_accounts a ON a.id = l.account_id
        WHERE j.status = 'posted' AND j.journal_date BETWEEN ? AND ?",
        [$from, $to]
    );
    return [
        'revenue' => fin_cents(isset($row['revenue']) ? $row['revenue'] : 0),
        'expense' => fin_cents(isset($row['expense']) ? $row['expense'] : 0)
    ];
}
