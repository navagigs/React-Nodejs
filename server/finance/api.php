<?php

function fin_api_path($uri)
{
    $path = parse_url((string)$uri, PHP_URL_PATH) ?: (string)$uri;
    return '/' . ltrim((string)$path, '/');
}

function fin_api_match($path, $pattern)
{
    $regex = '#^' . str_replace(['\{id\}', '\{slug\}'], ['([0-9]+)', '([a-z0-9-]+)'], preg_quote($pattern, '#')) . '$#';
    $regex = str_replace('\\{', '{', str_replace('\\}', '}', $regex));
    return preg_match($regex, $path, $matches) ? $matches : null;
}

function fin_api_categories($type)
{
    if ($type === 'income') {
        return [
            'pendapatan_proyek' => 'Pendapatan proyek',
            'pendapatan_jasa' => 'Pendapatan jasa',
            'pendapatan_penjualan' => 'Pendapatan penjualan',
            'pendapatan_langganan' => 'Pendapatan langganan',
            'pendapatan_investasi' => 'Pendapatan investasi',
            'pendapatan_lainnya' => 'Pendapatan lainnya',
        ];
    }
    if ($type === 'expense') {
        return [
            'gaji_dan_tunjangan' => 'Gaji dan tunjangan karyawan',
            'operasional_kantor' => 'Biaya operasional kantor',
            'internet_telekomunikasi' => 'Internet dan telekomunikasi',
            'sewa_kantor' => 'Sewa kantor',
            'listrik_air' => 'Listrik dan air',
            'transportasi_perjalanan' => 'Transportasi dan perjalanan dinas',
            'konsumsi_kantor' => 'Konsumsi dan kebutuhan kantor',
            'pembelian_aset' => 'Pembelian aset dan peralatan',
            'pemasaran' => 'Biaya pemasaran',
            'biaya_proyek' => 'Biaya proyek',
            'pajak_administrasi' => 'Pajak dan administrasi',
            'langganan_software' => 'Biaya langganan software',
            'pemeliharaan' => 'Biaya pemeliharaan',
            'pengeluaran_lainnya' => 'Pengeluaran lainnya',
        ];
    }
    return [];
}

function fin_api_category_name($type, $key)
{
    $categories = fin_api_categories($type);
    return isset($categories[$key]) ? $categories[$key] : $key;
}

function fin_api_coa_for_category($type, $category)
{
    $map = fin_setting_json($type === 'income' ? 'income_coa_map' : 'expense_coa_map', []);
    if (isset($map[$category]) && $map[$category] !== '') {
        return (string)$map[$category];
    }
    return $type === 'income' ? '403' : '509';
}

function fin_api_account_coa($accountId)
{
    if (!$accountId) {
        return '101';
    }
    $row = mkt_one('SELECT coa_code FROM fin_cash_accounts WHERE id = ?', [$accountId]);
    return is_array($row) && $row['coa_code'] !== '' ? $row['coa_code'] : '101';
}

function fin_api_tx_payload($row, $type)
{
    if (!is_array($row)) {
        return null;
    }
    $row['amount_value'] = fin_money($row['amount']);
    $row['category_label'] = fin_api_category_name($type, $row['category']);
    $row['account_name'] = null;
    if ($row['account_id']) {
        $account = mkt_one('SELECT name FROM fin_cash_accounts WHERE id = ?', [$row['account_id']]);
        $row['account_name'] = is_array($account) ? $account['name'] : null;
    }
    return $row;
}

function fin_api_transaction_list($type)
{
    fin_require('finance/' . ($type === 'income' ? 'incomes' : 'expenses'), 'is_view');
    $table = $type === 'income' ? 'fin_incomes' : 'fin_expenses';
    $where = ['deleted_at IS NULL'];
    $params = [];
    $search = trim((string)fin_value('search', ''));
    if ($search !== '') {
        $where[] = '(transaction_no LIKE ? OR description LIKE ? OR invoice_no LIKE ? OR ' . ($type === 'income' ? 'customer_name' : 'vendor_name') . ' LIKE ?)';
        $needle = '%' . $search . '%';
        array_push($params, $needle, $needle, $needle, $needle);
    }
    $category = trim((string)fin_value('category', ''));
    if ($category !== '') {
        $where[] = 'category = ?';
        $params[] = $category;
    }
    $status = trim((string)fin_value('status', ''));
    if ($status !== '') {
        $where[] = 'status = ?';
        $params[] = $status;
    }
    $from = trim((string)fin_value('from', ''));
    $to = trim((string)fin_value('to', ''));
    if ($from !== '') {
        $where[] = 'transaction_date >= ?';
        $params[] = $from;
    }
    if ($to !== '') {
        $where[] = 'transaction_date <= ?';
        $params[] = $to;
    }
    $page = fin_pagination();
    $whereSql = implode(' AND ', $where);
    $totalRow = mkt_one('SELECT COUNT(*) AS total FROM ' . $table . ' WHERE ' . $whereSql, $params);
    $sql = 'SELECT * FROM ' . $table . ' WHERE ' . $whereSql . ' ORDER BY transaction_date DESC, id DESC';
    if (!$page['all']) {
        $sql .= ' LIMIT ' . (int)$page['limit'] . ' OFFSET ' . (int)$page['offset'];
    }
    $rows = mkt_all($sql, $params);
    $data = [];
    foreach ($rows as $row) {
        $data[] = fin_api_tx_payload($row, $type);
    }
    fin_ok([
        'data' => $data,
        'total' => (int)(isset($totalRow['total']) ? $totalRow['total'] : 0),
        'page' => $page['page'],
        'limit' => $page['all'] ? 'all' : $page['limit']
    ]);
}

function fin_api_transaction_save($type, $id = null)
{
    $menu = 'finance/' . ($type === 'income' ? 'incomes' : 'expenses');
    fin_require($menu, $id ? 'is_edit' : 'is_create');
    $table = $type === 'income' ? 'fin_incomes' : 'fin_expenses';
    $existing = $id ? mkt_one('SELECT * FROM ' . $table . ' WHERE id = ? AND deleted_at IS NULL', [$id]) : null;
    if ($id && !is_array($existing)) {
        fin_error('Transaksi tidak ditemukan', 404);
    }
    if ($existing && in_array($existing['status'], ['posted', 'cancelled'], true)) {
        fin_error('Transaksi yang sudah diposting tidak dapat diubah. Gunakan pembatalan/jurnal koreksi.', 409);
    }
    $date = fin_date('transaction_date');
    fin_guard_period($date);
    $amount = fin_cents(fin_value('amount', 0));
    if ($amount <= 0) {
        fin_error('Nominal harus lebih dari nol', 422);
    }
    $category = fin_text('category', '', 60);
    if (!array_key_exists($category, fin_api_categories($type))) {
        fin_error('Kategori tidak valid', 422);
    }
    $accountId = fin_int('account_id', 0) ?: null;
    if ($accountId) {
        $account = mkt_one('SELECT id FROM fin_cash_accounts WHERE id = ? AND deleted_at IS NULL', [$accountId]);
        if (!is_array($account)) {
            fin_error('Rekening tujuan tidak valid', 422);
        }
    }
    $externalRef = trim((string)fin_value('external_ref', ''));
    if ($externalRef !== '') {
        $duplicate = mkt_one('SELECT id FROM ' . $table . ' WHERE external_ref = ?' . ($id ? ' AND id <> ?' : ''), $id ? [$externalRef, $id] : [$externalRef]);
        if (is_array($duplicate)) {
            fin_error('Transaksi dengan referensi ini sudah tercatat', 409);
        }
    }
    $proof = fin_upload('proof_file');
    $user = fin_user();
    $needsApproval = $amount >= fin_cents(fin_setting('approval_limit', '10000000'));
    $status = $existing ? $existing['status'] : 'draft';
    if (!$existing || $status === 'draft' || $status === 'rejected') {
        $status = $needsApproval ? 'pending' : 'draft';
    }
    $fields = [
        'transaction_date' => $date,
        'category' => $category,
        'description' => fin_text('description', '', 500),
        'amount' => fin_money($amount),
        'payment_method' => fin_text('payment_method', 'transfer', 40),
        'account_id' => $accountId,
        'invoice_no' => fin_text('invoice_no', '', 80) ?: null,
        'payment_status' => fin_text('payment_status', 'paid', 20),
        'status' => $status,
        'notes' => fin_text('notes', '', 2000),
        'updated_by' => is_array($user) ? $user['id'] : null,
        'updated_at' => fin_now()
    ];
    if ($proof !== null) {
        $fields['proof_file'] = $proof;
    }
    if ($type === 'income') {
        $fields['customer_name'] = fin_text('customer_name', '', 180);
    } else {
        $fields['vendor_name'] = fin_text('vendor_name', '', 180);
    }
    $db = $GLOBALS['db'];
    $db->begin_transaction();
    try {
        if ($existing) {
            $sets = [];
            $params = [];
            foreach ($fields as $key => $value) {
                $sets[] = $key . ' = ?';
                $params[] = $value;
            }
            if ($externalRef !== '') {
                $sets[] = 'external_ref = ?';
                $params[] = $externalRef;
            }
            $params[] = $id;
            mkt_run('UPDATE ' . $table . ' SET ' . implode(', ', $sets) . ' WHERE id = ?', $params);
            fin_audit($type, $id, 'update', $existing, array_merge($existing, $fields));
        } else {
            $transactionNo = fin_number($type === 'income' ? 'PMA' : 'PMK', $date);
            $fields = array_merge([
                'transaction_no' => $transactionNo,
                'external_ref' => $externalRef !== '' ? $externalRef : null,
                'created_by' => is_array($user) ? $user['id'] : null,
                'created_at' => fin_now()
            ], $fields);
            $columns = implode(', ', array_keys($fields));
            $placeholders = implode(', ', array_fill(0, count($fields), '?'));
            $result = mkt_run('INSERT INTO ' . $table . ' (' . $columns . ') VALUES (' . $placeholders . ')', array_values($fields));
            $id = (int)$result['insertId'];
            fin_audit($type, $id, 'create', null, $fields);
        }
        $db->commit();
    } catch (Exception $e) {
        $db->rollback();
        fin_error('Gagal menyimpan transaksi: ' . $e->getMessage(), 500);
    }
    fin_ok(['id' => $id, 'message' => 'Transaksi berhasil disimpan']);
}

function fin_api_transaction_action($type, $id, $action)
{
    $menu = 'finance/' . ($type === 'income' ? 'incomes' : 'expenses');
    $table = $type === 'income' ? 'fin_incomes' : 'fin_expenses';
    if ($action === 'approve') {
        fin_require($menu, 'is_edit');
        if (!fin_can_approve()) {
            fin_error('Anda tidak memiliki kewenangan persetujuan', 403);
        }
    } else {
        fin_require($menu, 'is_edit');
    }
    $row = mkt_one('SELECT * FROM ' . $table . ' WHERE id = ? AND deleted_at IS NULL', [$id]);
    if (!is_array($row)) {
        fin_error('Transaksi tidak ditemukan', 404);
    }
    if ($action === 'delete') {
        if ($row['journal_id']) {
            fin_error('Transaksi sudah diposting. Batalkan jurnal terlebih dahulu.', 409);
        }
        mkt_run('UPDATE ' . $table . ' SET deleted_at = ?, updated_by = ?, updated_at = ? WHERE id = ?', [fin_now(), fin_user()['id'], fin_now(), $id]);
        fin_audit($type, $id, 'soft_delete', $row, null);
        fin_ok(['message' => 'Transaksi dihapus (soft delete)']);
    }
    if ($action === 'reject') {
        if (!in_array($row['status'], ['pending', 'approval'], true)) {
            fin_error('Hanya transaksi menunggu persetujuan yang dapat ditolak', 409);
        }
        mkt_run('UPDATE ' . $table . ' SET status = \'rejected\' WHERE id = ?', [$id]);
        fin_audit($type, $id, 'reject', ['status' => $row['status']], ['status' => 'rejected', 'note' => fin_text('note', '', 255)]);
        fin_ok(['message' => 'Transaksi ditolak']);
    }
    if ($action === 'approve') {
        if (!in_array($row['status'], ['pending', 'approval', 'draft'], true)) {
            fin_error('Transaksi tidak dapat disetujui', 409);
        }
        $user = fin_user();
        mkt_run('UPDATE ' . $table . ' SET status = \'approved\', approved_by = ?, approved_at = ? WHERE id = ?', [$user['id'], fin_now(), $id]);
        mkt_run('INSERT INTO fin_approvals (entity_type, entity_id, action, approver_id, approver_name, approver_role, note, created_at) VALUES (?, ?, \'approve\', ?, ?, ?, ?, ?)', [
            $type, $id, $user['id'], $user['email'], $user['role_id'], fin_text('note', '', 255), fin_now()
        ]);
        fin_audit($type, $id, 'approve', ['status' => $row['status']], ['status' => 'approved']);
        fin_ok(['message' => 'Transaksi disetujui']);
    }
    if ($action === 'cancel') {
        if (!$row['journal_id']) {
            mkt_run('UPDATE ' . $table . ' SET status = \'cancelled\', cancelled_reason = ? WHERE id = ?', [fin_text('reason', 'Dibatalkan', 255), $id]);
            fin_audit($type, $id, 'cancel', ['status' => $row['status']], ['status' => 'cancelled']);
            fin_ok(['message' => 'Transaksi dibatalkan']);
        }
        $db = $GLOBALS['db'];
        $db->begin_transaction();
        try {
            fin_reverse_journal((int)$row['journal_id'], fin_text('reason', 'Pembatalan transaksi', 255));
            fin_cash_movement((int)$row['account_id'], fin_cents($row['amount']), $type === 'income' ? -1 : 1, $row['transaction_date'], 'reversal', $type, $id, 'Pembatalan ' . $row['transaction_no'], null);
            mkt_run('UPDATE ' . $table . ' SET status = \'cancelled\', journal_id = NULL, cancelled_reason = ? WHERE id = ?', [fin_text('reason', 'Dibatalkan', 255), $id]);
            fin_audit($type, $id, 'cancel', ['status' => $row['status'], 'journal_id' => $row['journal_id']], ['status' => 'cancelled']);
            $db->commit();
        } catch (Exception $e) {
            $db->rollback();
            fin_error('Gagal membatalkan transaksi: ' . $e->getMessage(), 500);
        }
        fin_ok(['message' => 'Transaksi dibatalkan dengan jurnal koreksi']);
    }
    if ($action === 'post') {
        if (!in_array($row['status'], ['approved', 'pending', 'draft'], true)) {
            fin_error('Transaksi tidak dapat diposting', 409);
        }
        if ($row['journal_id']) {
            fin_error('Transaksi sudah diposting', 409);
        }
        fin_guard_period($row['transaction_date']);
        $db = $GLOBALS['db'];
        $db->begin_transaction();
        try {
            $amount = fin_cents($row['amount']);
            $cashCode = fin_api_account_coa($row['account_id']);
            $categoryCode = fin_api_coa_for_category($type, $row['category']);
            $lines = $type === 'income'
                ? [['code' => $cashCode, 'debit' => $amount, 'credit' => 0], ['code' => $categoryCode, 'debit' => 0, 'credit' => $amount]]
                : [['code' => $categoryCode, 'debit' => $amount, 'credit' => 0], ['code' => $cashCode, 'debit' => 0, 'credit' => $amount]];
            $journalId = fin_journal($row['transaction_date'], strtoupper($type) . ' ' . $row['transaction_no'] . ' - ' . $row['description'], $lines, $type, (int)$row['id']);
            if ($row['account_id'] && $row['payment_status'] === 'paid') {
                fin_cash_movement((int)$row['account_id'], $amount, $type === 'income' ? 1 : -1, $row['transaction_date'], $type, $type, (int)$row['id'], $row['transaction_no']);
            }
            mkt_run('UPDATE ' . $table . ' SET status = \'posted\', journal_id = ?, payment_status = \'paid\' WHERE id = ?', [$journalId, $id]);
            fin_audit($type, $id, 'post', ['status' => $row['status']], ['status' => 'posted', 'journal_id' => $journalId]);
            $db->commit();
        } catch (Exception $e) {
            $db->rollback();
            fin_error('Gagal mem posting transaksi: ' . $e->getMessage(), 500);
        }
        fin_ok(['message' => 'Transaksi berhasil diposting ke jurnal', 'journal_id' => $journalId]);
    }
    fin_error('Aksi tidak dikenal', 400);
}

function fin_api_cash_accounts()
{
    fin_require('finance/cash', 'is_view');
    $rows = mkt_all('SELECT * FROM fin_cash_accounts WHERE deleted_at IS NULL ORDER BY code ASC');
    $data = [];
    foreach ($rows as $row) {
        $row['current_balance_value'] = fin_money($row['current_balance']);
        $row['opening_balance_value'] = fin_money($row['opening_balance']);
        $data[] = $row;
    }
    fin_ok(['data' => $data]);
}

function fin_api_cash_account_save($id = null)
{
    fin_require('finance/cash', $id ? 'is_edit' : 'is_create');
    $existing = $id ? mkt_one('SELECT * FROM fin_cash_accounts WHERE id = ? AND deleted_at IS NULL', [$id]) : null;
    if ($id && !is_array($existing)) {
        fin_error('Rekening tidak ditemukan', 404);
    }
    $code = fin_text('code', '', 30);
    $name = fin_text('name', '', 150);
    if ($code === '' || $name === '') {
        fin_error('Kode dan nama rekening wajib diisi', 422);
    }
    $opening = fin_cents(fin_value('opening_balance', 0));
    $currentBalanceRaw = fin_value('current_balance', null);
    $coaCode = fin_text('coa_code', '101', 30);
    fin_account_by_code($coaCode);
    $fields = [
        'code' => $code,
        'name' => $name,
        'bank_name' => fin_text('bank_name', '', 150) ?: null,
        'account_number' => fin_text('account_number', '', 60) ?: null,
        'owner_name' => fin_text('owner_name', '', 150) ?: null,
        'account_type' => fin_text('account_type', 'bank', 30),
        'coa_code' => $coaCode,
        'opening_balance' => fin_money($opening),
        'currency' => fin_text('currency', 'IDR', 10),
        'is_active' => fin_bool('is_active', true) ? 1 : 0,
        'updated_at' => fin_now()
    ];
    if ($currentBalanceRaw !== null && $currentBalanceRaw !== '') {
        $fields['current_balance'] = fin_money(fin_cents($currentBalanceRaw));
    }
    $db = $GLOBALS['db'];
    $db->begin_transaction();
    try {
        if ($existing) {
            $sets = [];
            $params = [];
            foreach ($fields as $key => $value) {
                $sets[] = $key . ' = ?';
                $params[] = $value;
            }
            $params[] = $id;
            mkt_run('UPDATE fin_cash_accounts SET ' . implode(', ', $sets) . ' WHERE id = ?', $params);
            fin_audit('cash_account', $id, 'update', $existing, array_merge($existing, $fields));
        } else {
            $fields['current_balance'] = fin_money($currentBalanceRaw !== null && $currentBalanceRaw !== '' ? fin_cents($currentBalanceRaw) : $opening);
            $fields['created_by'] = fin_user()['id'];
            $fields['created_at'] = fin_now();
            $result = mkt_run('INSERT INTO fin_cash_accounts (' . implode(', ', array_keys($fields)) . ') VALUES (' . implode(', ', array_fill(0, count($fields), '?')) . ')', array_values($fields));
            $id = (int)$result['insertId'];
            if ($opening !== 0) {
                fin_journal(date('Y-m-d'), 'Saldo awal ' . $name, [
                    ['code' => $coaCode, 'debit' => $opening, 'credit' => 0],
                    ['code' => '301', 'debit' => 0, 'credit' => $opening]
                ], 'cash_opening', $id);
                mkt_run('INSERT INTO fin_cash_movements (account_id, movement_date, movement_type, amount, direction, balance_after, reference_type, reference_id, description, created_by, created_at) VALUES (?, ?, \'opening\', ?, ?, ?, \'cash_account\', ?, ?, ?, ?)', [
                    $id,
                    date('Y-m-d'),
                    fin_money(abs($opening)),
                    $opening > 0 ? 1 : 0,
                    fin_money($opening),
                    $id,
                    'Saldo awal ' . $name,
                    fin_user()['id'],
                    fin_now()
                ]);
            }
            fin_audit('cash_account', $id, 'create', null, $fields);
        }
        $db->commit();
    } catch (Exception $e) {
        $db->rollback();
        fin_error('Gagal menyimpan rekening: ' . $e->getMessage(), 500);
    }
    fin_ok(['id' => $id, 'message' => 'Rekening berhasil disimpan']);
}

function fin_api_cash_movements()
{
    fin_require('finance/cash', 'is_view');
    $where = ['1 = 1'];
    $params = [];
    $accountId = fin_int('account_id', 0);
    if ($accountId) {
        $where[] = 'account_id = ?';
        $params[] = $accountId;
    }
    $from = trim((string)fin_value('from', ''));
    $to = trim((string)fin_value('to', ''));
    if ($from !== '') {
        $where[] = 'movement_date >= ?';
        $params[] = $from;
    }
    if ($to !== '') {
        $where[] = 'movement_date <= ?';
        $params[] = $to;
    }
    $page = fin_pagination();
    $whereSql = implode(' AND ', $where);
    $total = mkt_one('SELECT COUNT(*) AS total FROM fin_cash_movements WHERE ' . $whereSql, $params);
    $sql = 'SELECT m.*, a.name AS account_name FROM fin_cash_movements m INNER JOIN fin_cash_accounts a ON a.id = m.account_id WHERE ' . $whereSql . ' ORDER BY m.movement_date DESC, m.id DESC';
    if (!$page['all']) {
        $sql .= ' LIMIT ' . (int)$page['limit'] . ' OFFSET ' . (int)$page['offset'];
    }
    $rows = mkt_all($sql, $params);
    foreach ($rows as &$row) {
        $row['amount_value'] = fin_money($row['amount']);
        $row['balance_after_value'] = fin_money($row['balance_after']);
    }
    fin_ok(['data' => $rows, 'total' => (int)$total['total'], 'page' => $page['page']]);
}

function fin_api_cash_movement_create()
{
    fin_require('finance/cash', 'is_create');
    $accountId = fin_int('account_id', 0);
    $amount = fin_cents(fin_value('amount', 0));
    $direction = fin_int('direction', 1) > 0 ? 1 : -1;
    $date = fin_date('movement_date');
    if (!$accountId || $amount <= 0) {
        fin_error('Rekening dan nominal wajib diisi', 422);
    }
    fin_guard_period($date);
    $db = $GLOBALS['db'];
    $db->begin_transaction();
    try {
        $cashCode = fin_api_account_coa($accountId);
        $counterCode = $direction > 0 ? '403' : '509';
        $lines = $direction > 0
            ? [['code' => $cashCode, 'debit' => $amount, 'credit' => 0], ['code' => $counterCode, 'debit' => 0, 'credit' => $amount]]
            : [['code' => $counterCode, 'debit' => $amount, 'credit' => 0], ['code' => $cashCode, 'debit' => 0, 'credit' => $amount]];
        $journalId = fin_journal($date, 'Kas ' . ($direction > 0 ? 'masuk' : 'keluar') . ' - ' . fin_text('description', '', 255), $lines, 'cash_movement', null);
        fin_cash_movement($accountId, $amount, $direction, $date, $direction > 0 ? 'cash_in' : 'cash_out', 'cash_movement', $journalId, fin_text('description', '', 255));
        $db->commit();
    } catch (Exception $e) {
        $db->rollback();
        fin_error('Gagal mencatat mutasi kas: ' . $e->getMessage(), 500);
    }
    fin_ok(['message' => 'Mutasi kas berhasil dicatat']);
}

function fin_api_transfer_create()
{
    fin_require('finance/cash', 'is_create');
    $from = fin_int('from_account_id', 0);
    $to = fin_int('to_account_id', 0);
    $amount = fin_cents(fin_value('amount', 0));
    $date = fin_date('transfer_date');
    if (!$from || !$to || $from === $to || $amount <= 0) {
        fin_error('Rekening asal dan tujuan harus berbeda dengan nominal valid', 422);
    }
    fin_guard_period($date);
    $db = $GLOBALS['db'];
    $db->begin_transaction();
    try {
        $no = fin_number('TRF', $date);
        $result = mkt_run('INSERT INTO fin_transfers (transfer_no, transfer_date, from_account_id, to_account_id, amount, description, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
            $no, $date, $from, $to, fin_money($amount), fin_text('description', '', 255), fin_user()['id'], fin_now()
        ]);
        $transferId = (int)$result['insertId'];
        $fromCode = fin_api_account_coa($from);
        $toCode = fin_api_account_coa($to);
        fin_journal($date, 'Transfer antar rekening ' . $no, [
            ['code' => $toCode, 'debit' => $amount, 'credit' => 0],
            ['code' => $fromCode, 'debit' => 0, 'credit' => $amount]
        ], 'transfer', $transferId);
        fin_cash_movement($from, $amount, -1, $date, 'transfer_out', 'transfer', $transferId, 'Transfer ke rekening #' . $to, $transferId);
        fin_cash_movement($to, $amount, 1, $date, 'transfer_in', 'transfer', $transferId, 'Transfer dari rekening #' . $from, $transferId);
        fin_audit('transfer', $transferId, 'create', null, ['transfer_no' => $no, 'amount' => fin_money($amount)]);
        $db->commit();
    } catch (Exception $e) {
        $db->rollback();
        fin_error('Gagal transfer: ' . $e->getMessage(), 500);
    }
    fin_ok(['id' => $transferId, 'message' => 'Transfer berhasil dicatat (tidak memengaruhi laba rugi)']);
}

function fin_api_transfer_list()
{
    fin_require('finance/cash', 'is_view');
    $rows = mkt_all('SELECT t.*, fa.name AS from_account, ta.name AS to_account FROM fin_transfers t INNER JOIN fin_cash_accounts fa ON fa.id = t.from_account_id INNER JOIN fin_cash_accounts ta ON ta.id = t.to_account_id WHERE t.deleted_at IS NULL ORDER BY t.transfer_date DESC, t.id DESC LIMIT 500');
    foreach ($rows as &$row) {
        $row['amount_value'] = fin_money($row['amount']);
    }
    fin_ok(['data' => $rows]);
}

function fin_api_cash_reconcile($accountId)
{
    fin_require('finance/cash', 'is_edit');
    $account = mkt_one('SELECT * FROM fin_cash_accounts WHERE id = ? AND deleted_at IS NULL', [$accountId]);
    if (!is_array($account)) {
        fin_error('Rekening tidak ditemukan', 404);
    }
    $target = fin_cents(fin_value('actual_balance', $account['current_balance']));
    $difference = $target - fin_cents($account['current_balance']);
    if ($difference === 0) {
        fin_ok(['message' => 'Saldo sudah sesuai', 'difference' => '0.00']);
    }
    $date = fin_date('reconciliation_date');
    fin_guard_period($date);
    $db = $GLOBALS['db'];
    $db->begin_transaction();
    try {
        $code = fin_api_account_coa($accountId);
        $lines = $difference > 0
            ? [['code' => $code, 'debit' => $difference, 'credit' => 0], ['code' => '403', 'debit' => 0, 'credit' => $difference]]
            : [['code' => '509', 'debit' => abs($difference), 'credit' => 0], ['code' => $code, 'debit' => 0, 'credit' => abs($difference)]];
        $journalId = fin_journal($date, 'Rekonsiliasi ' . $account['name'], $lines, 'reconciliation', $accountId);
        fin_cash_movement($accountId, abs($difference), $difference > 0 ? 1 : -1, $date, 'reconciliation', 'reconciliation', $journalId, 'Penyesuaian rekonsiliasi');
        fin_audit('cash_account', $accountId, 'reconcile', ['balance' => $account['current_balance']], ['actual_balance' => fin_money($target)]);
        $db->commit();
    } catch (Exception $e) {
        $db->rollback();
        fin_error('Gagal rekonsiliasi: ' . $e->getMessage(), 500);
    }
    fin_ok(['message' => 'Rekonsiliasi berhasil', 'difference' => fin_money($difference)]);
}

function fin_api_dispatch_core($method, $path)
{
    $segments = explode('/', trim($path, '/'));
    if (count($segments) < 3 || $segments[0] !== 'api' || $segments[1] !== 'finance') {
        return false;
    }
    $resource = $segments[2];
    $id = isset($segments[3]) ? (int)$segments[3] : 0;
    $action = isset($segments[4]) ? $segments[4] : '';

    if ($resource === 'incomes' || $resource === 'expenses') {
        $type = $resource === 'incomes' ? 'income' : 'expense';
        if ($method === 'GET' && !$id) {
            fin_api_transaction_list($type);
        }
        if ($method === 'POST' && !$id) {
            fin_api_transaction_save($type);
        }
        if ($method === 'PUT' && $id && !$action) {
            fin_api_transaction_save($type, $id);
        }
        if ($method === 'POST' && $id && in_array($action, ['approve', 'reject', 'post', 'cancel'], true)) {
            fin_api_transaction_action($type, $id, $action);
        }
        if ($method === 'DELETE' && $id) {
            fin_api_transaction_action($type, $id, 'delete');
        }
    }

    if ($resource === 'cash-accounts') {
        if ($method === 'GET' && !$id) {
            fin_api_cash_accounts();
        }
        if ($method === 'POST' && !$id) {
            fin_api_cash_account_save();
        }
        if ($method === 'PUT' && $id) {
            fin_api_cash_account_save($id);
        }
        if ($method === 'DELETE' && $id) {
            fin_require('finance/cash', 'is_delete');
            $used = mkt_one('SELECT COUNT(*) AS total FROM fin_cash_movements WHERE account_id = ?', [$id]);
            if ((int)$used['total'] > 0) {
                fin_error('Rekening sudah memiliki mutasi. Nonaktifkan saja (is_active = 0).', 409);
            }
            mkt_run('UPDATE fin_cash_accounts SET deleted_at = ?, updated_at = ? WHERE id = ?', [fin_now(), fin_now(), $id]);
            fin_audit('cash_account', $id, 'soft_delete');
            fin_ok(['message' => 'Rekening dihapus']);
        }
    }

    if ($resource === 'cash-movements') {
        if ($method === 'GET') {
            fin_api_cash_movements();
        }
        if ($method === 'POST') {
            fin_api_cash_movement_create();
        }
    }

    if ($resource === 'transfers') {
        if ($method === 'GET') {
            fin_api_transfer_list();
        }
        if ($method === 'POST') {
            fin_api_transfer_create();
        }
    }

    if ($resource === 'cash' && $method === 'POST' && $action === 'reconcile') {
        fin_api_cash_reconcile($id);
    }

    return false;
}

function finance_api_dispatch($method, $uri)
{
    $path = fin_api_path($uri);
    if (strpos($path, '/api/finance') !== 0) {
        return false;
    }
    $method = strtoupper(trim($method));
    if (fin_api_dispatch_core($method, $path)) {
        return true;
    }
    if (function_exists('fin_api_dispatch_extended') && fin_api_dispatch_extended($method, $path)) {
        return true;
    }
    fin_error('Endpoint keuangan tidak ditemukan', 404);
}
