<?php

function fin_api_employees()
{
    fin_require('finance/payroll', 'is_view');
    $rows = mkt_all('SELECT e.*, s.base_salary, s.allowance_position, s.allowance_transport, s.allowance_meal, s.allowance_other, s.bpjs_health, s.bpjs_employment, s.pph21 FROM fin_employees e LEFT JOIN fin_employee_salaries s ON s.employee_id = e.id WHERE e.deleted_at IS NULL ORDER BY e.name ASC');
    fin_ok(['data' => $rows]);
}

function fin_api_employee_save($id = null)
{
    fin_require('finance/payroll', $id ? 'is_edit' : 'is_create');
    $existing = $id ? mkt_one('SELECT * FROM fin_employees WHERE id = ? AND deleted_at IS NULL', [$id]) : null;
    if ($id && !is_array($existing)) {
        fin_error('Karyawan tidak ditemukan', 404);
    }
    $code = fin_text('employee_code', '', 40);
    $name = fin_text('name', '', 150);
    if ($code === '' || $name === '') {
        fin_error('Kode dan nama karyawan wajib diisi', 422);
    }
    $duplicate = mkt_one('SELECT id FROM fin_employees WHERE employee_code = ?' . ($id ? ' AND id <> ?' : ''), $id ? [$code, $id] : [$code]);
    if (is_array($duplicate)) {
        fin_error('Kode karyawan sudah digunakan', 409);
    }
    $salary = [
        'base_salary' => fin_money(fin_cents(fin_value('base_salary', 0))),
        'allowance_position' => fin_money(fin_cents(fin_value('allowance_position', 0))),
        'allowance_transport' => fin_money(fin_cents(fin_value('allowance_transport', 0))),
        'allowance_meal' => fin_money(fin_cents(fin_value('allowance_meal', 0))),
        'allowance_other' => fin_money(fin_cents(fin_value('allowance_other', 0))),
        'bpjs_health' => fin_money(fin_cents(fin_value('bpjs_health', 0))),
        'bpjs_employment' => fin_money(fin_cents(fin_value('bpjs_employment', 0))),
        'pph21' => fin_money(fin_cents(fin_value('pph21', 0))),
    ];
    $db = $GLOBALS['db'];
    $db->begin_transaction();
    try {
        $fields = [
            'employee_code' => $code,
            'name' => $name,
            'user_id' => fin_int('user_id', 0) ?: null,
            'position' => fin_text('position', '', 120) ?: null,
            'department' => fin_text('department', '', 120) ?: null,
            'bank_name' => fin_text('bank_name', '', 120) ?: null,
            'bank_account' => fin_text('bank_account', '', 80) ?: null,
            'join_date' => fin_value('join_date', '') ? fin_date('join_date') : null,
            'is_active' => fin_bool('is_active', true) ? 1 : 0,
            'updated_at' => fin_now()
        ];
        if ($existing) {
            $sets = [];
            $params = [];
            foreach ($fields as $key => $value) {
                $sets[] = $key . ' = ?';
                $params[] = $value;
            }
            $params[] = $id;
            mkt_run('UPDATE fin_employees SET ' . implode(', ', $sets) . ' WHERE id = ?', $params);
            fin_audit('employee', $id, 'update', $existing, array_merge($existing, $fields));
        } else {
            $fields['created_at'] = fin_now();
            $result = mkt_run('INSERT INTO fin_employees (' . implode(', ', array_keys($fields)) . ') VALUES (' . implode(', ', array_fill(0, count($fields), '?')) . ')', array_values($fields));
            $id = (int)$result['insertId'];
            fin_audit('employee', $id, 'create', null, $fields);
        }
        $salary['employee_id'] = $id;
        $salary['updated_by'] = fin_user()['id'];
        $salary['updated_at'] = fin_now();
        $existsSalary = mkt_one('SELECT id FROM fin_employee_salaries WHERE employee_id = ?', [$id]);
        if ($existsSalary) {
            $sets = [];
            $params = [];
            foreach ($salary as $key => $value) {
                $sets[] = $key . ' = ?';
                $params[] = $value;
            }
            $params[] = $id;
            mkt_run('UPDATE fin_employee_salaries SET ' . implode(', ', $sets) . ' WHERE employee_id = ?', $params);
        } else {
            mkt_run('INSERT INTO fin_employee_salaries (' . implode(', ', array_keys($salary)) . ') VALUES (' . implode(', ', array_fill(0, count($salary), '?')) . ')', array_values($salary));
        }
        $db->commit();
    } catch (Exception $e) {
        $db->rollback();
        fin_error('Gagal menyimpan karyawan: ' . $e->getMessage(), 500);
    }
    fin_ok(['id' => $id, 'message' => 'Karyawan berhasil disimpan']);
}

function fin_api_payroll_components()
{
    fin_require('finance/payroll', 'is_view');
    fin_ok(['data' => mkt_all('SELECT * FROM fin_payroll_components ORDER BY component_type, code')]);
}

function fin_api_payroll_component_save($id = null)
{
    fin_require('finance/payroll', $id ? 'is_edit' : 'is_create');
    $code = fin_text('code', '', 40);
    $name = fin_text('name', '', 120);
    $type = fin_text('component_type', 'earning', 20);
    if ($code === '' || $name === '' || !in_array($type, ['earning', 'deduction'], true)) {
        fin_error('Komponen gaji tidak valid', 422);
    }
    $fields = [
        'code' => $code,
        'name' => $name,
        'component_type' => $type,
        'calculation' => fin_text('calculation', 'fixed', 20),
        'default_amount' => fin_money(fin_cents(fin_value('default_amount', 0))),
        'is_active' => fin_bool('is_active', true) ? 1 : 0
    ];
    if ($id) {
        $sets = [];
        $params = [];
        foreach ($fields as $key => $value) {
            $sets[] = $key . ' = ?';
            $params[] = $value;
        }
        $params[] = $id;
        mkt_run('UPDATE fin_payroll_components SET ' . implode(', ', $sets) . ' WHERE id = ?', $params);
        fin_audit('payroll_component', $id, 'update');
    } else {
        $fields['created_at'] = fin_now();
        $result = mkt_run('INSERT INTO fin_payroll_components (' . implode(', ', array_keys($fields)) . ') VALUES (' . implode(', ', array_fill(0, count($fields), '?')) . ')', array_values($fields));
        $id = (int)$result['insertId'];
        fin_audit('payroll_component', $id, 'create');
    }
    fin_ok(['id' => $id, 'message' => 'Komponen gaji disimpan']);
}

function fin_api_payroll_periods()
{
    fin_require('finance/payroll', 'is_view');
    $rows = mkt_all('SELECT p.*, (SELECT COUNT(*) FROM fin_payroll_records r WHERE r.period_id = p.id) AS employee_count, (SELECT COALESCE(SUM(r.net_pay), 0) FROM fin_payroll_records r WHERE r.period_id = p.id) AS total_net FROM fin_payroll_periods p ORDER BY p.period DESC, p.id DESC LIMIT 500');
    foreach ($rows as &$row) {
        $row['total_net_value'] = fin_money($row['total_net']);
    }
    fin_ok(['data' => $rows]);
}

function fin_api_payroll_generate()
{
    fin_require('finance/payroll', 'is_create');
    $period = fin_period('period');
    $department = fin_text('department', '', 120);
    fin_guard_period($period . '-01');
    $start = $period . '-01';
    $end = date('Y-m-t', strtotime($start));
    $payDay = max(1, min(28, fin_int('pay_day', (int)fin_setting('payroll_pay_day', '25'))));
    $payDate = $period . '-' . str_pad((string)$payDay, 2, '0', STR_PAD_LEFT);
    $db = $GLOBALS['db'];
    $db->begin_transaction();
    try {
        $periodRow = mkt_one('SELECT * FROM fin_payroll_periods WHERE period = ? AND department = ?', [$period, $department]);
        if (is_array($periodRow)) {
            if ($periodRow['status'] !== 'draft') {
                fin_error('Periode payroll sudah diproses', 409);
            }
            $periodId = (int)$periodRow['id'];
        } else {
            $result = mkt_run('INSERT INTO fin_payroll_periods (period, start_date, end_date, pay_date, status, department, created_by, created_at) VALUES (?, ?, ?, ?, \'draft\', ?, ?, ?)', [
                $period, $start, $end, $payDate, $department, fin_user()['id'], fin_now()
            ]);
            $periodId = (int)$result['insertId'];
        }
        $sql = 'SELECT e.*, s.base_salary, s.allowance_position, s.allowance_transport, s.allowance_meal, s.allowance_other, s.bpjs_health, s.bpjs_employment, s.pph21 FROM fin_employees e LEFT JOIN fin_employee_salaries s ON s.employee_id = e.id WHERE e.deleted_at IS NULL AND e.is_active = 1';
        $params = [];
        if ($department !== '') {
            $sql .= ' AND e.department = ?';
            $params[] = $department;
        }
        $employees = mkt_all($sql, $params);
        $generated = 0;
        foreach ($employees as $employee) {
            $exists = mkt_one('SELECT id FROM fin_payroll_records WHERE period_id = ? AND employee_id = ?', [$periodId, $employee['id']]);
            if (is_array($exists)) {
                continue;
            }
            $base = fin_cents($employee['base_salary']);
            $income = $base
                + fin_cents($employee['allowance_position'])
                + fin_cents($employee['allowance_transport'])
                + fin_cents($employee['allowance_meal'])
                + fin_cents($employee['allowance_other']);
            $deduction = fin_cents($employee['bpjs_health']) + fin_cents($employee['bpjs_employment']) + fin_cents($employee['pph21']);
            mkt_run(
                'INSERT INTO fin_payroll_records (period_id, employee_id, employee_code, employee_name, position, department, base_salary, allowance_position, allowance_transport, allowance_meal, allowance_other, bpjs_health, bpjs_employment, pph21, total_income, total_deduction, net_pay, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, \'draft\', ?)',
                [
                    $periodId,
                    $employee['id'],
                    $employee['employee_code'],
                    $employee['name'],
                    $employee['position'],
                    $employee['department'],
                    $employee['base_salary'],
                    $employee['allowance_position'],
                    $employee['allowance_transport'],
                    $employee['allowance_meal'],
                    $employee['allowance_other'],
                    $employee['bpjs_health'],
                    $employee['bpjs_employment'],
                    $employee['pph21'],
                    fin_money($income),
                    fin_money($deduction),
                    fin_money($income - $deduction),
                    fin_now()
                ]
            );
            $generated++;
        }
        fin_audit('payroll_period', $periodId, 'generate', null, ['period' => $period, 'department' => $department, 'generated' => $generated]);
        $db->commit();
    } catch (Exception $e) {
        $db->rollback();
        fin_error('Gagal generate payroll: ' . $e->getMessage(), 500);
    }
    fin_ok(['period_id' => $periodId, 'generated' => $generated, 'message' => 'Payroll berhasil digenerate']);
}

function fin_api_payroll_records()
{
    fin_require('finance/payroll', 'is_view');
    $periodId = fin_int('period_id', 0);
    $employeeId = fin_int('employee_id', 0);
    $where = ['1 = 1'];
    $params = [];
    if ($periodId) {
        $where[] = 'r.period_id = ?';
        $params[] = $periodId;
    }
    if ($employeeId) {
        $where[] = 'r.employee_id = ?';
        $params[] = $employeeId;
    }
    $rows = mkt_all('SELECT r.*, p.period, p.pay_date, p.status AS period_status FROM fin_payroll_records r INNER JOIN fin_payroll_periods p ON p.id = r.period_id WHERE ' . implode(' AND ', $where) . ' ORDER BY p.period DESC, r.employee_name ASC LIMIT 1000', $params);
    foreach ($rows as &$row) {
        foreach (['base_salary', 'allowance_position', 'allowance_transport', 'allowance_meal', 'allowance_other', 'bonus', 'overtime', 'deduction_late', 'deduction_loan', 'bpjs_health', 'bpjs_employment', 'pph21', 'deduction_other', 'total_income', 'total_deduction', 'net_pay'] as $field) {
            $row[$field . '_value'] = fin_money($row[$field]);
        }
    }
    fin_ok(['data' => $rows]);
}

function fin_api_payroll_record_update($id)
{
    fin_require('finance/payroll', 'is_edit');
    $record = mkt_one('SELECT r.*, p.status AS period_status FROM fin_payroll_records r INNER JOIN fin_payroll_periods p ON p.id = r.period_id WHERE r.id = ?', [$id]);
    if (!is_array($record)) {
        fin_error('Data payroll tidak ditemukan', 404);
    }
    if (!in_array($record['period_status'], ['draft', 'approval'], true)) {
        fin_error('Payroll yang sudah disetujui/dibayar tidak dapat diubah', 409);
    }
    $fields = [
        'base_salary', 'allowance_position', 'allowance_transport', 'allowance_meal', 'allowance_other',
        'bonus', 'overtime', 'deduction_late', 'deduction_loan', 'bpjs_health', 'bpjs_employment', 'pph21', 'deduction_other'
    ];
    $values = [];
    $adjustments = [];
    foreach ($fields as $field) {
        $raw = fin_value($field, null);
        if ($raw === null) {
            $values[$field] = $record[$field];
            continue;
        }
        $cents = fin_cents($raw);
        if ($cents < 0) {
            fin_error('Komponen gaji tidak boleh negatif', 422);
        }
        $values[$field] = fin_money($cents);
        if (fin_cents($record[$field]) !== $cents) {
            $adjustments[] = [$field, $record[$field], $values[$field]];
        }
    }
    $reason = fin_text('reason', '', 255);
    if (count($adjustments) > 0 && $reason === '') {
        fin_error('Alasan koreksi wajib diisi', 422);
    }
    $income = 0;
    foreach (['base_salary', 'allowance_position', 'allowance_transport', 'allowance_meal', 'allowance_other', 'bonus', 'overtime'] as $field) {
        $income += fin_cents($values[$field]);
    }
    $deduction = 0;
    foreach (['deduction_late', 'deduction_loan', 'bpjs_health', 'bpjs_employment', 'pph21', 'deduction_other'] as $field) {
        $deduction += fin_cents($values[$field]);
    }
    $values['total_income'] = fin_money($income);
    $values['total_deduction'] = fin_money($deduction);
    $values['net_pay'] = fin_money($income - $deduction);
    $values['updated_at'] = fin_now();
    $db = $GLOBALS['db'];
    $db->begin_transaction();
    try {
        $sets = [];
        $params = [];
        foreach ($values as $key => $value) {
            $sets[] = $key . ' = ?';
            $params[] = $value;
        }
        $params[] = $id;
        mkt_run('UPDATE fin_payroll_records SET ' . implode(', ', $sets) . ' WHERE id = ?', $params);
        foreach ($adjustments as $adjustment) {
            mkt_run('INSERT INTO fin_payroll_adjustments (payroll_record_id, field_name, old_value, new_value, reason, changed_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [
                $id, $adjustment[0], $adjustment[1], $adjustment[2], $reason, fin_user()['id'], fin_now()
            ]);
        }
        fin_audit('payroll_record', $id, 'correction', $record, array_merge($record, $values, ['reason' => $reason]));
        $db->commit();
    } catch (Exception $e) {
        $db->rollback();
        fin_error('Gagal mengoreksi payroll: ' . $e->getMessage(), 500);
    }
    fin_ok(['message' => 'Koreksi payroll tersimpan dan tercatat di audit']);
}

function fin_api_payroll_period_action($periodId, $action)
{
    fin_require('finance/payroll', 'is_edit');
    $period = mkt_one('SELECT * FROM fin_payroll_periods WHERE id = ?', [$periodId]);
    if (!is_array($period)) {
        fin_error('Periode payroll tidak ditemukan', 404);
    }
    if ($action === 'submit') {
        if ($period['status'] !== 'draft') {
            fin_error('Hanya payroll draft yang dapat diajukan', 409);
        }
        mkt_run('UPDATE fin_payroll_periods SET status = \'approval\' WHERE id = ?', [$periodId]);
        mkt_run('UPDATE fin_payroll_records SET status = \'approval\' WHERE period_id = ?', [$periodId]);
        fin_notify('payroll_approval', 'Persetujuan payroll ' . $period['period'], 'Payroll periode ' . $period['period'] . ' menunggu persetujuan', 'payroll_period', $periodId, $period['pay_date']);
        fin_audit('payroll_period', $periodId, 'submit', ['status' => $period['status']], ['status' => 'approval']);
        fin_ok(['message' => 'Payroll diajukan untuk persetujuan']);
    }
    if ($action === 'approve') {
        if (!fin_can_approve()) {
            fin_error('Anda tidak memiliki kewenangan persetujuan', 403);
        }
        if ($period['status'] !== 'approval') {
            fin_error('Payroll tidak dalam status menunggu persetujuan', 409);
        }
        fin_guard_period($period['start_date']);
        $records = mkt_all('SELECT * FROM fin_payroll_records WHERE period_id = ?', [$periodId]);
        if (count($records) === 0) {
            fin_error('Tidak ada data payroll pada periode ini', 422);
        }
        $total = 0;
        foreach ($records as $row) {
            $total += fin_cents($row['net_pay']);
        }
        $db = $GLOBALS['db'];
        $db->begin_transaction();
        try {
            $journalId = fin_journal($period['end_date'], 'Beban gaji periode ' . $period['period'], [
                ['code' => '501', 'debit' => $total, 'credit' => 0],
                ['code' => '202', 'debit' => 0, 'credit' => $total]
            ], 'payroll', $periodId);
            mkt_run('UPDATE fin_payroll_periods SET status = \'approved\', approved_by = ?, approved_at = ?, journal_id = ? WHERE id = ?', [fin_user()['id'], fin_now(), $journalId, $periodId]);
            mkt_run('UPDATE fin_payroll_records SET status = \'approved\' WHERE period_id = ?', [$periodId]);
            fin_audit('payroll_period', $periodId, 'approve', ['status' => $period['status']], ['status' => 'approved', 'journal_id' => $journalId]);
            $db->commit();
        } catch (Exception $e) {
            $db->rollback();
            fin_error('Gagal menyetujui payroll: ' . $e->getMessage(), 500);
        }
        fin_ok(['message' => 'Payroll disetujui', 'journal_id' => $journalId]);
    }
    if ($action === 'pay') {
        if ($period['status'] !== 'approved') {
            fin_error('Payroll harus disetujui sebelum dibayar', 409);
        }
        $accountId = fin_int('account_id', $period['account_id']) ?: null;
        if (!$accountId) {
            fin_error('Rekening pembayaran gaji wajib dipilih', 422);
        }
        $records = mkt_all('SELECT * FROM fin_payroll_records WHERE period_id = ?', [$periodId]);
        $total = 0;
        foreach ($records as $row) {
            $total += fin_cents($row['net_pay']);
        }
        $db = $GLOBALS['db'];
        $db->begin_transaction();
        try {
            $journalId = fin_journal($period['end_date'], 'Pembayaran gaji periode ' . $period['period'], [
                ['code' => '202', 'debit' => $total, 'credit' => 0],
                ['code' => fin_api_account_coa($accountId), 'debit' => 0, 'credit' => $total]
            ], 'payroll_payment', $periodId);
            fin_cash_movement($accountId, $total, -1, $period['end_date'], 'payroll', 'payroll_period', $periodId, 'Pembayaran gaji ' . $period['period']);
            $reference = fin_number('GAJ', $period['end_date']);
            mkt_run('UPDATE fin_payroll_periods SET status = \'paid\', paid_at = ?, paid_by = ?, account_id = ?, journal_id = ? WHERE id = ?', [fin_now(), fin_user()['id'], $accountId, $journalId, $periodId]);
            mkt_run('UPDATE fin_payroll_records SET status = \'paid\', payment_reference = ? WHERE period_id = ?', [$reference, $periodId]);
            fin_audit('payroll_period', $periodId, 'pay', ['status' => $period['status']], ['status' => 'paid', 'account_id' => $accountId]);
            $db->commit();
        } catch (Exception $e) {
            $db->rollback();
            fin_error('Gagal membayar payroll: ' . $e->getMessage(), 500);
        }
        fin_ok(['message' => 'Pembayaran gaji massal berhasil', 'reference' => $reference]);
    }
    fin_error('Aksi payroll tidak dikenal', 400);
}

function fin_api_payroll_slip($recordId)
{
    fin_require('finance/payroll', 'is_view');
    $row = mkt_one('SELECT r.*, p.period, p.pay_date FROM fin_payroll_records r INNER JOIN fin_payroll_periods p ON p.id = r.period_id WHERE r.id = ?', [$recordId]);
    if (!is_array($row)) {
        fin_error('Slip gaji tidak ditemukan', 404);
    }
    $row['company_name'] = fin_setting('company_name', 'Perusahaan');
    fin_ok(['data' => $row]);
}

function fin_api_payroll_report()
{
    fin_require('finance/payroll', 'is_view');
    $periodId = fin_int('period_id', 0);
    $period = $periodId ? mkt_one('SELECT * FROM fin_payroll_periods WHERE id = ?', [$periodId]) : null;
    $where = $periodId ? 'WHERE r.period_id = ?' : '';
    $params = $periodId ? [$periodId] : [];
    $row = mkt_one('SELECT COUNT(*) AS employees, COALESCE(SUM(r.total_income),0) AS income, COALESCE(SUM(r.total_deduction),0) AS deduction, COALESCE(SUM(r.net_pay),0) AS net FROM fin_payroll_records r ' . $where, $params);
    $byDept = mkt_all('SELECT r.department, COUNT(*) AS employees, SUM(r.net_pay) AS net FROM fin_payroll_records r ' . $where . ' GROUP BY r.department ORDER BY r.department', $params);
    fin_ok([
        'period' => $period,
        'summary' => [
            'employees' => (int)$row['employees'],
            'total_income' => fin_money($row['income']),
            'total_deduction' => fin_money($row['deduction']),
            'net_pay' => fin_money($row['net'])
        ],
        'departments' => $byDept
    ]);
}

function fin_api_budgets()
{
    fin_require('finance/budgets', 'is_view');
    $year = fin_int('year', (int)date('Y'));
    $month = fin_int('month', 0);
    $where = ['b.budget_year = ?'];
    $params = [$year];
    if ($month > 0) {
        $where[] = 'b.budget_month = ?';
        $params[] = $month;
    }
    $rows = mkt_all('SELECT b.* FROM fin_budgets b WHERE ' . implode(' AND ', $where) . ' AND b.deleted_at IS NULL ORDER BY b.budget_month ASC, b.category ASC', $params);
    $data = [];
    foreach ($rows as $row) {
        $realization = fin_api_budget_realization($row['category'], (int)$row['budget_year'], (int)$row['budget_month']);
        $budget = fin_cents($row['amount']);
        $percentage = $budget > 0 ? round(($realization / $budget) * 100, 2) : 0;
        $row['realization'] = fin_money($realization);
        $row['realization_value'] = $realization;
        $row['budget_value'] = $budget;
        $row['difference'] = fin_money($budget - $realization);
        $row['usage_percentage'] = $percentage;
        $row['warning'] = $percentage >= 100 ? 'over' : ($percentage >= (float)$row['warning_threshold'] ? 'near' : 'safe');
        $data[] = $row;
    }
    fin_ok(['data' => $data, 'year' => $year, 'month' => $month]);
}

function fin_api_budget_realization($category, $year, $month)
{
    $from = $month > 0 ? sprintf('%04d-%02d-01', $year, $month) : sprintf('%04d-01-01', $year);
    $to = $month > 0 ? date('Y-m-t', strtotime($from)) : sprintf('%04d-12-31', $year);
    $expense = mkt_one('SELECT COALESCE(SUM(amount),0) AS total FROM fin_expenses WHERE deleted_at IS NULL AND status = \'posted\' AND category = ? AND transaction_date BETWEEN ? AND ?', [$category, $from, $to]);
    $total = fin_cents($expense['total']);
    if ($category === 'gaji_dan_tunjangan') {
        $payroll = mkt_one('SELECT COALESCE(SUM(r.net_pay),0) AS total FROM fin_payroll_records r INNER JOIN fin_payroll_periods p ON p.id = r.period_id WHERE p.status = \'paid\' AND p.start_date BETWEEN ? AND ?', [$from, $to]);
        $total += fin_cents($payroll['total']);
    }
    return $total;
}

function fin_api_budget_save($id = null)
{
    fin_require('finance/budgets', $id ? 'is_edit' : 'is_create');
    $category = fin_text('category', '', 60);
    $year = fin_int('budget_year', (int)date('Y'));
    $month = fin_int('budget_month', 0);
    if (!array_key_exists($category, fin_api_categories('expense')) || $year < 2000 || $year > 2100 || $month < 0 || $month > 12) {
        fin_error('Data anggaran tidak valid', 422);
    }
    $fields = [
        'category' => $category,
        'budget_year' => $year,
        'budget_month' => $month,
        'amount' => fin_money(fin_cents(fin_value('amount', 0))),
        'warning_threshold' => min(100, max(1, (int)fin_value('warning_threshold', 80))),
        'notes' => fin_text('notes', '', 255) ?: null,
        'updated_at' => fin_now()
    ];
    $duplicate = mkt_one('SELECT id FROM fin_budgets WHERE category = ? AND budget_year = ? AND budget_month = ?' . ($id ? ' AND id <> ?' : ''), $id ? [$category, $year, $month, $id] : [$category, $year, $month]);
    if (is_array($duplicate)) {
        fin_error('Anggaran untuk kategori dan periode ini sudah ada', 409);
    }
    if ($id) {
        $sets = [];
        $params = [];
        foreach ($fields as $key => $value) {
            $sets[] = $key . ' = ?';
            $params[] = $value;
        }
        $params[] = $id;
        mkt_run('UPDATE fin_budgets SET ' . implode(', ', $sets) . ' WHERE id = ?', $params);
        fin_audit('budget', $id, 'update');
    } else {
        $fields['created_by'] = fin_user()['id'];
        $fields['created_at'] = fin_now();
        $result = mkt_run('INSERT INTO fin_budgets (' . implode(', ', array_keys($fields)) . ') VALUES (' . implode(', ', array_fill(0, count($fields), '?')) . ')', array_values($fields));
        $id = (int)$result['insertId'];
        fin_audit('budget', $id, 'create');
    }
    fin_ok(['id' => $id, 'message' => 'Anggaran disimpan']);
}

function fin_api_assets()
{
    fin_require('finance/assets', 'is_view');
    $rows = mkt_all('SELECT * FROM fin_assets WHERE deleted_at IS NULL ORDER BY asset_code ASC');
    foreach ($rows as &$row) {
        $row['cost_value'] = fin_money($row['cost']);
        $row['book_value_value'] = fin_money($row['book_value']);
        $row['accumulated_depreciation_value'] = fin_money($row['accumulated_depreciation']);
    }
    fin_ok(['data' => $rows]);
}

function fin_api_depreciation_amount($costCents, $residualCents, $lifeMonths, $method, $accumulatedCents)
{
    $life = max(1, $lifeMonths);
    $depreciable = max(0, $costCents - $residualCents);
    $remaining = max(0, $depreciable - $accumulatedCents);
    if ($method === 'declining_balance') {
        $rate = 2 / $life;
        $amount = (int)round($remaining * $rate);
    } else {
        $amount = (int)floor($depreciable / $life);
    }
    return min($remaining, max(0, $amount));
}

function fin_api_asset_save($id = null)
{
    fin_require('finance/assets', $id ? 'is_edit' : 'is_create');
    $code = fin_text('asset_code', '', 40);
    $name = fin_text('name', '', 180);
    $cost = fin_cents(fin_value('cost', 0));
    if ($code === '' || $name === '' || $cost <= 0) {
        fin_error('Kode, nama, dan harga perolehan wajib diisi', 422);
    }
    $method = fin_text('depreciation_method', 'straight_line', 30);
    if (!in_array($method, ['straight_line', 'declining_balance'], true)) {
        fin_error('Metode penyusutan tidak valid', 422);
    }
    $fields = [
        'asset_code' => $code,
        'name' => $name,
        'category' => fin_text('category', '', 60),
        'purchase_date' => fin_date('purchase_date'),
        'cost' => fin_money($cost),
        'useful_life_months' => max(1, fin_int('useful_life_months', 12)),
        'residual_value' => fin_money(fin_cents(fin_value('residual_value', 0))),
        'depreciation_method' => $method,
        'status' => fin_text('status', 'active', 20),
        'account_id' => fin_int('account_id', 0) ?: null,
        'notes' => fin_text('notes', '', 2000) ?: null,
        'updated_at' => fin_now()
    ];
    $db = $GLOBALS['db'];
    $db->begin_transaction();
    try {
        if ($id) {
            $sets = [];
            $params = [];
            foreach ($fields as $key => $value) {
                $sets[] = $key . ' = ?';
                $params[] = $value;
            }
            $params[] = $id;
            mkt_run('UPDATE fin_assets SET ' . implode(', ', $sets) . ' WHERE id = ?', $params);
            fin_audit('asset', $id, 'update');
        } else {
            $fields['book_value'] = fin_money($cost);
            $fields['created_by'] = fin_user()['id'];
            $fields['created_at'] = fin_now();
            $result = mkt_run('INSERT INTO fin_assets (' . implode(', ', array_keys($fields)) . ') VALUES (' . implode(', ', array_fill(0, count($fields), '?')) . ')', array_values($fields));
            $id = (int)$result['insertId'];
            if ($fields['account_id']) {
                fin_guard_period($fields['purchase_date']);
                $journalId = fin_journal($fields['purchase_date'], 'Pembelian aset ' . $name, [
                    ['code' => '130', 'debit' => $cost, 'credit' => 0],
                    ['code' => fin_api_account_coa($fields['account_id']), 'debit' => 0, 'credit' => $cost]
                ], 'asset_purchase', $id);
                fin_cash_movement((int)$fields['account_id'], $cost, -1, $fields['purchase_date'], 'asset_purchase', 'asset', $id, 'Pembelian aset ' . $name);
                mkt_run('UPDATE fin_assets SET journal_id = ? WHERE id = ?', [$journalId, $id]);
            }
            fin_audit('asset', $id, 'create');
        }
        $db->commit();
    } catch (Exception $e) {
        $db->rollback();
        fin_error('Gagal menyimpan aset: ' . $e->getMessage(), 500);
    }
    fin_ok(['id' => $id, 'message' => 'Aset disimpan']);
}

function fin_api_asset_depreciate()
{
    fin_require('finance/assets', 'is_create');
    $period = fin_period('period');
    fin_guard_period($period . '-01');
    $db = $GLOBALS['db'];
    $db->begin_transaction();
    try {
        $assets = mkt_all("SELECT * FROM fin_assets WHERE deleted_at IS NULL AND status = 'active' AND purchase_date <= ?", [$period . '-31']);
        $count = 0;
        foreach ($assets as $asset) {
            $exists = mkt_one('SELECT id FROM fin_asset_depreciations WHERE asset_id = ? AND period = ?', [$asset['id'], $period]);
            if (is_array($exists)) {
                continue;
            }
            $amount = fin_api_depreciation_amount(fin_cents($asset['cost']), fin_cents($asset['residual_value']), (int)$asset['useful_life_months'], $asset['depreciation_method'], fin_cents($asset['accumulated_depreciation']));
            if ($amount <= 0) {
                continue;
            }
            $accumulated = fin_cents($asset['accumulated_depreciation']) + $amount;
            $book = fin_cents($asset['cost']) - $accumulated;
            $journalId = fin_journal($period . '-28', 'Penyusutan ' . $asset['name'] . ' ' . $period, [
                ['code' => '504', 'debit' => $amount, 'credit' => 0],
                ['code' => '135', 'debit' => 0, 'credit' => $amount]
            ], 'depreciation', (int)$asset['id']);
            mkt_run('INSERT INTO fin_asset_depreciations (asset_id, period, amount, accumulated_after, book_value_after, journal_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [
                $asset['id'], $period, fin_money($amount), fin_money($accumulated), fin_money($book), $journalId, fin_now()
            ]);
            mkt_run('UPDATE fin_assets SET accumulated_depreciation = ?, book_value = ?, updated_at = ? WHERE id = ?', [fin_money($accumulated), fin_money($book), fin_now(), $asset['id']]);
            $count++;
        }
        fin_audit('asset', null, 'depreciate', null, ['period' => $period, 'count' => $count]);
        $db->commit();
    } catch (Exception $e) {
        $db->rollback();
        fin_error('Gagal menghitung penyusutan: ' . $e->getMessage(), 500);
    }
    fin_ok(['count' => $count, 'message' => 'Penyusutan periode ' . $period . ' berhasil diposting']);
}

function fin_api_asset_depreciations()
{
    fin_require('finance/assets', 'is_view');
    $rows = mkt_all('SELECT d.*, a.name AS asset_name, a.asset_code FROM fin_asset_depreciations d INNER JOIN fin_assets a ON a.id = d.asset_id ORDER BY d.period DESC, d.id DESC LIMIT 500');
    fin_ok(['data' => $rows]);
}

function fin_api_debts()
{
    fin_require('finance/debts', 'is_view');
    $status = trim((string)fin_value('status', ''));
    $where = ['deleted_at IS NULL'];
    $params = [];
    if ($status !== '') {
        $where[] = 'status = ?';
        $params[] = $status;
    }
    $rows = mkt_all('SELECT * FROM fin_debts WHERE ' . implode(' AND ', $where) . ' ORDER BY due_date ASC, id DESC LIMIT 1000', $params);
    foreach ($rows as &$row) {
        $row['days_remaining'] = (int)((strtotime($row['due_date']) - strtotime(date('Y-m-d'))) / 86400);
    }
    fin_ok(['data' => $rows]);
}

function fin_api_debt_save($id = null)
{
    fin_require('finance/debts', $id ? 'is_edit' : 'is_create');
    $creditor = fin_text('creditor_name', '', 180);
    $amount = fin_cents(fin_value('amount', 0));
    if ($creditor === '' || $amount <= 0) {
        fin_error('Kreditur dan nominal utang wajib diisi', 422);
    }
    $date = fin_date('debt_date');
    $due = fin_date('due_date');
    if ($due < $date) {
        fin_error('Jatuh tempo tidak boleh sebelum tanggal utang', 422);
    }
    fin_guard_period($date);
    $fields = [
        'creditor_name' => $creditor,
        'debt_date' => $date,
        'due_date' => $due,
        'amount' => fin_money($amount),
        'description' => fin_text('description', '', 500),
        'account_id' => fin_int('account_id', 0) ?: null,
        'notes' => fin_text('notes', '', 2000) ?: null,
        'updated_at' => fin_now()
    ];
    $db = $GLOBALS['db'];
    $db->begin_transaction();
    try {
        if ($id) {
            $existing = mkt_one('SELECT * FROM fin_debts WHERE id = ? AND deleted_at IS NULL', [$id]);
            if (!is_array($existing)) {
                fin_error('Utang tidak ditemukan', 404);
            }
            $sets = [];
            $params = [];
            foreach ($fields as $key => $value) {
                $sets[] = $key . ' = ?';
                $params[] = $value;
            }
            $params[] = $id;
            mkt_run('UPDATE fin_debts SET ' . implode(', ', $sets) . ' WHERE id = ?', $params);
            fin_audit('debt', $id, 'update', $existing);
        } else {
            $no = fin_number('UTG', $date);
            $fields['transaction_no'] = $no;
            $fields['remaining'] = fin_money($amount);
            $fields['created_by'] = fin_user()['id'];
            $fields['created_at'] = fin_now();
            $result = mkt_run('INSERT INTO fin_debts (' . implode(', ', array_keys($fields)) . ') VALUES (' . implode(', ', array_fill(0, count($fields), '?')) . ')', array_values($fields));
            $id = (int)$result['insertId'];
            $journalId = fin_journal($date, 'Utang usaha ' . $no . ' - ' . $creditor, [
                ['code' => fin_api_coa_for_category('expense', 'pengeluaran_lainnya'), 'debit' => $amount, 'credit' => 0],
                ['code' => '201', 'debit' => 0, 'credit' => $amount]
            ], 'debt', $id);
            mkt_run('UPDATE fin_debts SET journal_id = ? WHERE id = ?', [$journalId, $id]);
            fin_notify('debt_due', 'Jatuh tempo utang', $creditor . ' sebesar Rp ' . number_format((float)fin_money($amount), 0, ',', '.'), 'debt', $id, $due);
            fin_audit('debt', $id, 'create', null, $fields);
        }
        $db->commit();
    } catch (Exception $e) {
        $db->rollback();
        fin_error('Gagal menyimpan utang: ' . $e->getMessage(), 500);
    }
    fin_ok(['id' => $id, 'message' => 'Utang disimpan']);
}

function fin_api_debt_payment($debtId)
{
    fin_require('finance/debts', 'is_edit');
    $debt = mkt_one('SELECT * FROM fin_debts WHERE id = ? AND deleted_at IS NULL', [$debtId]);
    if (!is_array($debt)) {
        fin_error('Utang tidak ditemukan', 404);
    }
    $amount = fin_cents(fin_value('amount', 0));
    $remaining = fin_cents($debt['remaining']);
    if ($amount <= 0 || $amount > $remaining) {
        fin_error('Nominal pembayaran tidak valid', 422);
    }
    $accountId = fin_int('account_id', $debt['account_id']) ?: null;
    if (!$accountId) {
        fin_error('Rekening sumber dana wajib dipilih', 422);
    }
    $date = fin_date('payment_date');
    fin_guard_period($date);
    $db = $GLOBALS['db'];
    $db->begin_transaction();
    try {
        $journalId = fin_journal($date, 'Pembayaran utang ' . $debt['transaction_no'], [
            ['code' => '201', 'debit' => $amount, 'credit' => 0],
            ['code' => fin_api_account_coa($accountId), 'debit' => 0, 'credit' => $amount]
        ], 'debt_payment', $debtId);
        fin_cash_movement($accountId, $amount, -1, $date, 'debt_payment', 'debt', $debtId, 'Pembayaran utang ' . $debt['transaction_no']);
        $result = mkt_run('INSERT INTO fin_debt_payments (debt_id, payment_date, amount, account_id, proof_file, description, journal_id, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
            $debtId, $date, fin_money($amount), $accountId, fin_upload('proof_file'), fin_text('description', '', 255), $journalId, fin_user()['id'], fin_now()
        ]);
        $newRemaining = $remaining - $amount;
        mkt_run('UPDATE fin_debts SET paid_amount = ?, remaining = ?, status = ? WHERE id = ?', [
            fin_money(fin_cents($debt['paid_amount']) + $amount),
            fin_money($newRemaining),
            $newRemaining <= 0 ? 'paid' : 'partial',
            $debtId
        ]);
        fin_audit('debt', $debtId, 'payment', ['remaining' => $debt['remaining']], ['remaining' => fin_money($newRemaining), 'payment_id' => $result['insertId']]);
        $db->commit();
    } catch (Exception $e) {
        $db->rollback();
        fin_error('Gagal mencatat pembayaran utang: ' . $e->getMessage(), 500);
    }
    fin_ok(['message' => 'Pembayaran utang berhasil dicatat']);
}

function fin_api_debt_payments($debtId)
{
    fin_require('finance/debts', 'is_view');
    fin_ok(['data' => mkt_all('SELECT * FROM fin_debt_payments WHERE debt_id = ? ORDER BY payment_date DESC', [$debtId])]);
}

function fin_api_receivables()
{
    fin_require('finance/receivables', 'is_view');
    $where = ['deleted_at IS NULL'];
    $params = [];
    $status = trim((string)fin_value('status', ''));
    if ($status !== '') {
        $where[] = 'status = ?';
        $params[] = $status;
    }
    $rows = mkt_all('SELECT * FROM fin_receivables WHERE ' . implode(' AND ', $where) . ' ORDER BY due_date ASC, id DESC LIMIT 1000', $params);
    foreach ($rows as &$row) {
        $row['days_remaining'] = (int)((strtotime($row['due_date']) - strtotime(date('Y-m-d'))) / 86400);
    }
    fin_ok(['data' => $rows]);
}

function fin_api_receivable_save($id = null)
{
    fin_require('finance/receivables', $id ? 'is_edit' : 'is_create');
    $invoice = fin_text('invoice_no', '', 80);
    $customer = fin_text('customer_name', '', 180);
    $amount = fin_cents(fin_value('amount', 0));
    if ($invoice === '' || $customer === '' || $amount <= 0) {
        fin_error('Nomor invoice, pelanggan, dan nominal wajib diisi', 422);
    }
    $date = fin_date('invoice_date');
    $due = fin_date('due_date');
    if ($due < $date) {
        fin_error('Jatuh tempo tidak boleh sebelum tanggal invoice', 422);
    }
    fin_guard_period($date);
    $duplicate = mkt_one('SELECT id FROM fin_receivables WHERE invoice_no = ?' . ($id ? ' AND id <> ?' : ''), $id ? [$invoice, $id] : [$invoice]);
    if (is_array($duplicate)) {
        fin_error('Nomor invoice sudah tercatat', 409);
    }
    $fields = [
        'invoice_no' => $invoice,
        'customer_name' => $customer,
        'invoice_date' => $date,
        'due_date' => $due,
        'amount' => fin_money($amount),
        'description' => fin_text('description', '', 500),
        'account_id' => fin_int('account_id', 0) ?: null,
        'notes' => fin_text('notes', '', 2000) ?: null,
        'updated_at' => fin_now()
    ];
    $db = $GLOBALS['db'];
    $db->begin_transaction();
    try {
        if ($id) {
            $existing = mkt_one('SELECT * FROM fin_receivables WHERE id = ? AND deleted_at IS NULL', [$id]);
            if (!is_array($existing)) {
                fin_error('Piutang tidak ditemukan', 404);
            }
            $sets = [];
            $params = [];
            foreach ($fields as $key => $value) {
                $sets[] = $key . ' = ?';
                $params[] = $value;
            }
            $params[] = $id;
            mkt_run('UPDATE fin_receivables SET ' . implode(', ', $sets) . ' WHERE id = ?', $params);
            fin_audit('receivable', $id, 'update', $existing);
        } else {
            $fields['remaining'] = fin_money($amount);
            $fields['created_by'] = fin_user()['id'];
            $fields['created_at'] = fin_now();
            $result = mkt_run('INSERT INTO fin_receivables (' . implode(', ', array_keys($fields)) . ') VALUES (' . implode(', ', array_fill(0, count($fields), '?')) . ')', array_values($fields));
            $id = (int)$result['insertId'];
            $journalId = fin_journal($date, 'Piutang usaha invoice ' . $invoice . ' - ' . $customer, [
                ['code' => '110', 'debit' => $amount, 'credit' => 0],
                ['code' => '401', 'debit' => 0, 'credit' => $amount]
            ], 'receivable', $id);
            mkt_run('UPDATE fin_receivables SET journal_id = ? WHERE id = ?', [$journalId, $id]);
            fin_notify('receivable_due', 'Jatuh tempo piutang', $customer . ' sebesar Rp ' . number_format((float)fin_money($amount), 0, ',', '.'), 'receivable', $id, $due);
            fin_audit('receivable', $id, 'create', null, $fields);
        }
        $db->commit();
    } catch (Exception $e) {
        $db->rollback();
        fin_error('Gagal menyimpan piutang: ' . $e->getMessage(), 500);
    }
    fin_ok(['id' => $id, 'message' => 'Piutang disimpan']);
}

function fin_api_receivable_payment($receivableId)
{
    fin_require('finance/receivables', 'is_edit');
    $receivable = mkt_one('SELECT * FROM fin_receivables WHERE id = ? AND deleted_at IS NULL', [$receivableId]);
    if (!is_array($receivable)) {
        fin_error('Piutang tidak ditemukan', 404);
    }
    $amount = fin_cents(fin_value('amount', 0));
    $remaining = fin_cents($receivable['remaining']);
    if ($amount <= 0 || $amount > $remaining) {
        fin_error('Nominal pembayaran tidak valid', 422);
    }
    $accountId = fin_int('account_id', $receivable['account_id']) ?: null;
    if (!$accountId) {
        fin_error('Rekening penerima wajib dipilih', 422);
    }
    $date = fin_date('payment_date');
    fin_guard_period($date);
    $db = $GLOBALS['db'];
    $db->begin_transaction();
    try {
        $journalId = fin_journal($date, 'Penerimaan piutang invoice ' . $receivable['invoice_no'], [
            ['code' => fin_api_account_coa($accountId), 'debit' => $amount, 'credit' => 0],
            ['code' => '110', 'debit' => 0, 'credit' => $amount]
        ], 'receivable_payment', $receivableId);
        fin_cash_movement($accountId, $amount, 1, $date, 'receivable_payment', 'receivable', $receivableId, 'Penerimaan piutang ' . $receivable['invoice_no']);
        $result = mkt_run('INSERT INTO fin_receivable_payments (receivable_id, payment_date, amount, account_id, proof_file, description, journal_id, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
            $receivableId, $date, fin_money($amount), $accountId, fin_upload('proof_file'), fin_text('description', '', 255), $journalId, fin_user()['id'], fin_now()
        ]);
        $newRemaining = $remaining - $amount;
        mkt_run('UPDATE fin_receivables SET received_amount = ?, remaining = ?, status = ? WHERE id = ?', [
            fin_money(fin_cents($receivable['received_amount']) + $amount),
            fin_money($newRemaining),
            $newRemaining <= 0 ? 'paid' : 'partial',
            $receivableId
        ]);
        fin_audit('receivable', $receivableId, 'payment', ['remaining' => $receivable['remaining']], ['remaining' => fin_money($newRemaining), 'payment_id' => $result['insertId']]);
        $db->commit();
    } catch (Exception $e) {
        $db->rollback();
        fin_error('Gagal mencatat penerimaan piutang: ' . $e->getMessage(), 500);
    }
    fin_ok(['message' => 'Penerimaan piutang berhasil dicatat']);
}

function fin_api_receivable_payments($receivableId)
{
    fin_require('finance/receivables', 'is_view');
    fin_ok(['data' => mkt_all('SELECT * FROM fin_receivable_payments WHERE receivable_id = ? ORDER BY payment_date DESC', [$receivableId])]);
}

function fin_api_accounts()
{
    fin_require('finance/accounts', 'is_view');
    $group = trim((string)fin_value('group', ''));
    $where = $group !== '' ? 'WHERE account_group = ?' : '';
    $rows = mkt_all('SELECT * FROM fin_accounts ' . $where . ' ORDER BY code ASC', $group !== '' ? [$group] : []);
    fin_ok(['data' => $rows]);
}

function fin_api_account_save($id = null)
{
    fin_require('finance/accounts', $id ? 'is_edit' : 'is_create');
    $code = fin_text('code', '', 30);
    $name = fin_text('name', '', 150);
    $group = fin_text('account_group', '', 20);
    if ($code === '' || $name === '' || !in_array($group, ['asset', 'liability', 'equity', 'revenue', 'expense'], true)) {
        fin_error('Data akun tidak valid', 422);
    }
    $fields = [
        'code' => $code,
        'name' => $name,
        'account_group' => $group,
        'sub_group' => fin_text('sub_group', '', 80) ?: null,
        'normal_balance' => fin_text('normal_balance', 'debit', 10) === 'credit' ? 'credit' : 'debit',
        'is_active' => fin_bool('is_active', true) ? 1 : 0
    ];
    $duplicate = mkt_one('SELECT id FROM fin_accounts WHERE code = ?' . ($id ? ' AND id <> ?' : ''), $id ? [$code, $id] : [$code]);
    if (is_array($duplicate)) {
        fin_error('Kode akun sudah digunakan', 409);
    }
    if ($id) {
        $used = mkt_one('SELECT COUNT(*) AS total FROM fin_journal_lines WHERE account_id = ?', [$id]);
        if ((int)$used['total'] > 0 && $fields['code'] !== mkt_one('SELECT code FROM fin_accounts WHERE id = ?', [$id])['code']) {
            fin_error('Kode akun yang sudah dipakai jurnal tidak dapat diubah', 409);
        }
        $sets = [];
        $params = [];
        foreach ($fields as $key => $value) {
            $sets[] = $key . ' = ?';
            $params[] = $value;
        }
        $params[] = $id;
        mkt_run('UPDATE fin_accounts SET ' . implode(', ', $sets) . ' WHERE id = ?', $params);
        fin_audit('account', $id, 'update');
    } else {
        $fields['created_at'] = fin_now();
        $result = mkt_run('INSERT INTO fin_accounts (' . implode(', ', array_keys($fields)) . ') VALUES (' . implode(', ', array_fill(0, count($fields), '?')) . ')', array_values($fields));
        $id = (int)$result['insertId'];
        fin_audit('account', $id, 'create');
    }
    fin_ok(['id' => $id, 'message' => 'Akun disimpan']);
}

function fin_api_journals()
{
    fin_require('finance/journals', 'is_view');
    $page = fin_pagination();
    $where = ['1 = 1'];
    $params = [];
    $from = trim((string)fin_value('from', ''));
    $to = trim((string)fin_value('to', ''));
    if ($from !== '') {
        $where[] = 'journal_date >= ?';
        $params[] = $from;
    }
    if ($to !== '') {
        $where[] = 'journal_date <= ?';
        $params[] = $to;
    }
    $search = trim((string)fin_value('search', ''));
    if ($search !== '') {
        $where[] = '(journal_no LIKE ? OR description LIKE ?)';
        $params[] = '%' . $search . '%';
        $params[] = '%' . $search . '%';
    }
    $whereSql = implode(' AND ', $where);
    $total = mkt_one('SELECT COUNT(*) AS total FROM fin_journals WHERE ' . $whereSql, $params);
    $sql = 'SELECT * FROM fin_journals WHERE ' . $whereSql . ' ORDER BY journal_date DESC, id DESC';
    if (!$page['all']) {
        $sql .= ' LIMIT ' . (int)$page['limit'] . ' OFFSET ' . (int)$page['offset'];
    }
    fin_ok(['data' => mkt_all($sql, $params), 'total' => (int)$total['total'], 'page' => $page['page']]);
}

function fin_api_journal_detail($journalId)
{
    fin_require('finance/journals', 'is_view');
    $journal = mkt_one('SELECT * FROM fin_journals WHERE id = ?', [$journalId]);
    if (!is_array($journal)) {
        fin_error('Jurnal tidak ditemukan', 404);
    }
    $journal['lines'] = mkt_all('SELECT l.*, a.code, a.name AS account_name FROM fin_journal_lines l INNER JOIN fin_accounts a ON a.id = l.account_id WHERE l.journal_id = ? ORDER BY l.line_order', [$journalId]);
    fin_ok(['data' => $journal]);
}

function fin_api_journal_manual()
{
    fin_require('finance/journals', 'is_create');
    $lines = fin_value('lines', []);
    if (!is_array($lines) || count($lines) < 2) {
        fin_error('Jurnal minimal memiliki dua baris', 422);
    }
    $date = fin_date('journal_date');
    fin_guard_period($date);
    $db = $GLOBALS['db'];
    $db->begin_transaction();
    try {
        $journalId = fin_journal($date, fin_text('description', 'Jurnal manual', 500), $lines, 'manual', null);
        $db->commit();
    } catch (Exception $e) {
        $db->rollback();
        fin_error('Gagal menyimpan jurnal: ' . $e->getMessage(), 500);
    }
    fin_ok(['id' => $journalId, 'message' => 'Jurnal berhasil diposting']);
}

function fin_api_journal_cancel($journalId)
{
    fin_require('finance/journals', 'is_edit');
    $db = $GLOBALS['db'];
    $db->begin_transaction();
    try {
        $reversalId = fin_reverse_journal($journalId, fin_text('reason', 'Pembatalan jurnal', 255));
        $db->commit();
    } catch (Exception $e) {
        $db->rollback();
        fin_error('Gagal membatalkan jurnal: ' . $e->getMessage(), 500);
    }
    fin_ok(['reversal_journal_id' => $reversalId, 'message' => 'Jurnal dibatalkan dengan jurnal koreksi']);
}

function fin_api_ledger()
{
    fin_require('finance/ledger', 'is_view');
    $accountId = fin_int('account_id', 0);
    if (!$accountId) {
        fin_error('Akun wajib dipilih', 422);
    }
    $from = trim((string)fin_value('from', date('Y-m-01')));
    $to = trim((string)fin_value('to', date('Y-m-t')));
    $account = mkt_one('SELECT * FROM fin_accounts WHERE id = ?', [$accountId]);
    if (!is_array($account)) {
        fin_error('Akun tidak ditemukan', 404);
    }
    $rows = mkt_all('SELECT j.journal_no, j.journal_date, j.description, l.debit, l.credit FROM fin_journal_lines l INNER JOIN fin_journals j ON j.id = l.journal_id WHERE l.account_id = ? AND j.status = \'posted\' AND j.journal_date BETWEEN ? AND ? ORDER BY j.journal_date ASC, j.id ASC', [$accountId, $from, $to]);
    $balance = 0;
    $data = [];
    foreach ($rows as $row) {
        $balance += ($account['normal_balance'] === 'debit')
            ? fin_cents($row['debit']) - fin_cents($row['credit'])
            : fin_cents($row['credit']) - fin_cents($row['debit']);
        $row['balance'] = fin_money($balance);
        $data[] = $row;
    }
    fin_ok(['data' => $data, 'account' => $account, 'from' => $from, 'to' => $to, 'ending_balance' => fin_money($balance)]);
}

function fin_api_trial_balance()
{
    fin_require('finance/trial-balance', 'is_view');
    $asOf = trim((string)fin_value('as_of', date('Y-m-d')));
    $rows = mkt_all("SELECT a.*, COALESCE(SUM(l.debit),0) AS debit, COALESCE(SUM(l.credit),0) AS credit FROM fin_accounts a LEFT JOIN fin_journal_lines l ON l.account_id = a.id LEFT JOIN fin_journals j ON j.id = l.journal_id AND j.status = 'posted' AND j.journal_date <= ? WHERE a.is_active = 1 GROUP BY a.id ORDER BY a.code", [$asOf]);
    $totalDebit = 0;
    $totalCredit = 0;
    $data = [];
    foreach ($rows as $row) {
        $debit = fin_cents($row['debit']);
        $credit = fin_cents($row['credit']);
        $totalDebit += $debit;
        $totalCredit += $credit;
        $row['debit_value'] = $debit;
        $row['credit_value'] = $credit;
        $data[] = $row;
    }
    fin_ok(['data' => $data, 'total_debit' => fin_money($totalDebit), 'total_credit' => fin_money($totalCredit), 'balanced' => $totalDebit === $totalCredit, 'as_of' => $asOf]);
}

function fin_api_fiscal_periods()
{
    fin_require('finance/settings', 'is_view');
    fin_ok(['data' => mkt_all('SELECT * FROM fin_fiscal_periods ORDER BY period DESC LIMIT 120')]);
}

function fin_api_fiscal_period_action($periodId, $action)
{
    fin_require('finance/settings', 'is_edit');
    $row = mkt_one('SELECT * FROM fin_fiscal_periods WHERE id = ?', [$periodId]);
    if (!is_array($row)) {
        fin_error('Periode tidak ditemukan', 404);
    }
    $status = $action === 'close' ? 'closed' : ($action === 'open' ? 'open' : null);
    if (!$status) {
        fin_error('Aksi tidak dikenal', 400);
    }
    mkt_run('UPDATE fin_fiscal_periods SET status = ?, closed_by = ?, closed_at = ? WHERE id = ?', [
        $status,
        $status === 'closed' ? fin_user()['id'] : null,
        $status === 'closed' ? fin_now() : null,
        $periodId
    ]);
    fin_audit('fiscal_period', $periodId, $action);
    fin_ok(['message' => 'Status periode diperbarui']);
}

function fin_api_fiscal_period_ensure()
{
    fin_require('finance/settings', 'is_edit');
    $period = fin_period('period');
    mkt_run('INSERT IGNORE INTO fin_fiscal_periods (period, status, created_at) VALUES (?, \'open\', ?)', [$period, fin_now()]);
    fin_ok(['message' => 'Periode tersedia']);
}

function fin_api_dashboard()
{
    fin_require('finance/dashboard', 'is_view');
    list($from, $to) = fin_period_bounds();
    $cash = mkt_one('SELECT COALESCE(SUM(current_balance),0) AS total FROM fin_cash_accounts WHERE deleted_at IS NULL AND is_active = 1');
    $income = mkt_one('SELECT COALESCE(SUM(amount),0) AS total FROM fin_incomes WHERE deleted_at IS NULL AND status = \'posted\' AND transaction_date BETWEEN ? AND ?', [$from, $to]);
    $expense = mkt_one('SELECT COALESCE(SUM(amount),0) AS total FROM fin_expenses WHERE deleted_at IS NULL AND status = \'posted\' AND transaction_date BETWEEN ? AND ?', [$from, $to]);
    $payroll = mkt_one('SELECT COALESCE(SUM(r.net_pay),0) AS total FROM fin_payroll_records r INNER JOIN fin_payroll_periods p ON p.id = r.period_id WHERE p.status = \'paid\' AND p.end_date BETWEEN ? AND ?', [$from, $to]);
    $receivable = mkt_one('SELECT COALESCE(SUM(remaining),0) AS total FROM fin_receivables WHERE deleted_at IS NULL');
    $debt = mkt_one('SELECT COALESCE(SUM(remaining),0) AS total FROM fin_debts WHERE deleted_at IS NULL');
    $asset = mkt_one('SELECT COALESCE(SUM(book_value),0) AS total FROM fin_assets WHERE deleted_at IS NULL');
    $liabilities = 0;
    foreach (mkt_all("SELECT id FROM fin_accounts WHERE account_group = 'liability' AND is_active = 1") as $account) {
        $liabilities += fin_account_balance_by_id((int)$account['id'], $to);
    }
    $totals = fin_totals_for_period($from, $to);
    $cashFlow = mkt_all("SELECT movement_type, direction, SUM(amount) AS total FROM fin_cash_movements WHERE movement_date BETWEEN ? AND ? GROUP BY movement_type, direction ORDER BY movement_type", [$from, $to]);

    $months = [];
    for ($i = 5; $i >= 0; $i--) {
        $monthStart = date('Y-m-01', strtotime('-' . $i . ' months'));
        $monthEnd = date('Y-m-t', strtotime($monthStart));
        $monthLabel = date('M', strtotime($monthStart));
        $in = mkt_one('SELECT COALESCE(SUM(amount),0) AS total FROM fin_incomes WHERE deleted_at IS NULL AND status = \'posted\' AND transaction_date BETWEEN ? AND ?', [$monthStart, $monthEnd]);
        $ex = mkt_one('SELECT COALESCE(SUM(amount),0) AS total FROM fin_expenses WHERE deleted_at IS NULL AND status = \'posted\' AND transaction_date BETWEEN ? AND ?', [$monthStart, $monthEnd]);
        $pl = fin_totals_for_period($monthStart, $monthEnd);
        $months[] = [
            'month' => $monthLabel,
            'income' => (float)fin_money($in['total']),
            'expense' => (float)fin_money($ex['total']),
            'profit' => fin_money($pl['revenue'] - $pl['expense'])
        ];
    }

    $recent = [];
    foreach (['income' => 'fin_incomes', 'expense' => 'fin_expenses'] as $type => $table) {
        $rows = mkt_all('SELECT id, transaction_no, transaction_date, description, amount, status, category FROM ' . $table . ' WHERE deleted_at IS NULL ORDER BY transaction_date DESC, id DESC LIMIT 8');
        foreach ($rows as $row) {
            $recent[] = [
                'id' => (int)$row['id'],
                'type' => $type,
                'number' => $row['transaction_no'],
                'date' => $row['transaction_date'],
                'description' => $row['description'] ?: fin_api_category_name($type, $row['category']),
                'amount' => fin_money($row['amount']),
                'status' => $row['status']
            ];
        }
    }
    usort($recent, function ($a, $b) {
        return strcmp($b['date'], $a['date']);
    });
    fin_ok([
        'period' => ['from' => $from, 'to' => $to],
        'summary' => [
            'cash_balance' => fin_money($cash['total']),
            'income' => fin_money($income['total']),
            'expense' => fin_money($expense['total']),
            'payroll' => fin_money($payroll['total']),
            'profit_loss' => fin_money($totals['revenue'] - $totals['expense']),
            'receivables' => fin_money($receivable['total']),
            'debts' => fin_money($debt['total']),
            'assets' => fin_money($asset['total']),
            'liabilities' => fin_money($liabilities)
        ],
        'cash_flow' => $cashFlow,
        'monthly' => $months,
        'recent_transactions' => array_slice($recent, 0, 10),
        'alerts' => fin_api_alerts()
    ]);
}

function fin_account_balance_by_id($accountId, $asOf = null)
{
    $account = mkt_one('SELECT * FROM fin_accounts WHERE id = ?', [$accountId]);
    if (!is_array($account)) {
        return 0;
    }
    $params = [$accountId];
    $dateSql = '';
    if ($asOf) {
        $dateSql = ' AND j.journal_date <= ?';
        $params[] = $asOf;
    }
    $row = mkt_one('SELECT COALESCE(SUM(l.debit),0) AS debit, COALESCE(SUM(l.credit),0) AS credit FROM fin_journal_lines l INNER JOIN fin_journals j ON j.id = l.journal_id WHERE l.account_id = ? AND j.status = \'posted\'' . $dateSql, $params);
    $debit = fin_cents($row['debit']);
    $credit = fin_cents($row['credit']);
    return $account['normal_balance'] === 'debit' ? $debit - $credit : $credit - $debit;
}

function fin_api_alerts()
{
    $alerts = [];
    $soon = date('Y-m-d', strtotime('+' . max(1, fin_int('reminder_days', 7)) . ' days'));
    foreach (mkt_all('SELECT id, invoice_no, customer_name, due_date, remaining FROM fin_receivables WHERE deleted_at IS NULL AND status <> \'paid\' AND due_date <= ? ORDER BY due_date LIMIT 20', [$soon]) as $row) {
        $alerts[] = ['type' => 'receivable', 'title' => 'Piutang jatuh tempo', 'description' => $row['invoice_no'] . ' - ' . $row['customer_name'], 'amount' => fin_money($row['remaining']), 'date' => $row['due_date']];
    }
    foreach (mkt_all('SELECT id, transaction_no, creditor_name, due_date, remaining FROM fin_debts WHERE deleted_at IS NULL AND status <> \'paid\' AND due_date <= ? ORDER BY due_date LIMIT 20', [$soon]) as $row) {
        $alerts[] = ['type' => 'debt', 'title' => 'Utang jatuh tempo', 'description' => $row['transaction_no'] . ' - ' . $row['creditor_name'], 'amount' => fin_money($row['remaining']), 'date' => $row['due_date']];
    }
    foreach (mkt_all('SELECT p.id, p.period, p.pay_date FROM fin_payroll_periods p WHERE p.status = \'approved\' AND p.pay_date <= ? ORDER BY p.pay_date LIMIT 10', [$soon]) as $row) {
        $alerts[] = ['type' => 'payroll', 'title' => 'Pembayaran gaji', 'description' => 'Periode ' . $row['period'] . ' menunggu pembayaran', 'amount' => null, 'date' => $row['pay_date']];
    }
    return $alerts;
}

function fin_api_report($type)
{
    fin_require('finance/reports', 'is_view');
    list($from, $to) = fin_period_bounds();
    $allowed = ['incomes', 'expenses', 'payroll', 'cash', 'profit-loss', 'balance-sheet', 'cash-flow', 'equity', 'debts-receivables', 'assets', 'budgets'];
    if (!in_array($type, $allowed, true)) {
        fin_error('Jenis laporan tidak dikenal', 404);
    }
    $report = ['type' => $type, 'from' => $from, 'to' => $to, 'company' => fin_setting('company_name', 'Perusahaan')];

    if ($type === 'incomes' || $type === 'expenses') {
        $table = $type === 'incomes' ? 'fin_incomes' : 'fin_expenses';
        $column = $type === 'incomes' ? 'customer_name' : 'vendor_name';
        $rows = mkt_all('SELECT transaction_no, transaction_date, category, ' . $column . ' AS party_name, description, amount, payment_method, invoice_no, status FROM ' . $table . ' WHERE deleted_at IS NULL AND transaction_date BETWEEN ? AND ? ORDER BY transaction_date DESC', [$from, $to]);
        $total = 0;
        foreach ($rows as &$row) {
            $total += fin_cents($row['amount']);
            $row['amount_value'] = (float)fin_money($row['amount']);
        }
        $report['rows'] = $rows;
        $report['total'] = fin_money($total);
    }

    if ($type === 'payroll') {
        $rows = mkt_all('SELECT r.employee_code, r.employee_name, r.department, p.period, r.total_income, r.total_deduction, r.net_pay, r.status FROM fin_payroll_records r INNER JOIN fin_payroll_periods p ON p.id = r.period_id WHERE p.end_date BETWEEN ? AND ? ORDER BY p.period DESC, r.employee_name', [$from, $to]);
        $total = 0;
        foreach ($rows as &$row) {
            $total += fin_cents($row['net_pay']);
        }
        $report['rows'] = $rows;
        $report['total'] = fin_money($total);
    }

    if ($type === 'cash' || $type === 'cash-flow') {
        $rows = mkt_all('SELECT m.movement_date, m.movement_type, m.description, m.amount, m.direction, a.name AS account_name FROM fin_cash_movements m INNER JOIN fin_cash_accounts a ON a.id = m.account_id WHERE m.movement_date BETWEEN ? AND ? ORDER BY m.movement_date DESC, m.id DESC', [$from, $to]);
        $in = 0;
        $out = 0;
        foreach ($rows as &$row) {
            if ((int)$row['direction'] === 1) {
                $in += fin_cents($row['amount']);
            } else {
                $out += fin_cents($row['amount']);
            }
        }
        $report['rows'] = $rows;
        $report['total_in'] = fin_money($in);
        $report['total_out'] = fin_money($out);
        $report['net'] = fin_money($in - $out);
    }

    if ($type === 'profit-loss') {
        $totals = fin_totals_for_period($from, $to);
        $groups = mkt_all("SELECT a.account_group, a.code, a.name, SUM(CASE WHEN a.normal_balance = 'credit' THEN l.credit - l.debit ELSE l.debit - l.credit END) AS amount FROM fin_journal_lines l INNER JOIN fin_journals j ON j.id = l.journal_id INNER JOIN fin_accounts a ON a.id = l.account_id WHERE j.status = 'posted' AND j.journal_date BETWEEN ? AND ? AND a.account_group IN ('revenue','expense') GROUP BY a.account_group, a.code, a.name ORDER BY a.account_group, a.code", [$from, $to]);
        foreach ($groups as &$group) {
            $group['amount_value'] = fin_money($group['amount']);
        }
        $report['groups'] = $groups;
        $report['revenue'] = fin_money($totals['revenue']);
        $report['expense'] = fin_money($totals['expense']);
        $report['profit_loss'] = fin_money($totals['revenue'] - $totals['expense']);
    }

    if ($type === 'balance-sheet') {
        $balances = ['asset' => [], 'liability' => [], 'equity' => []];
        $sums = ['asset' => 0, 'liability' => 0, 'equity' => 0];
        $accounts = mkt_all("SELECT * FROM fin_accounts WHERE is_active = 1 AND account_group IN ('asset','liability','equity') ORDER BY code");
        foreach ($accounts as $account) {
            $balance = fin_account_balance_by_id((int)$account['id'], $to);
            $contra = $account['account_group'] === 'asset' && $account['normal_balance'] === 'credit';
            $signed = $contra ? -$balance : $balance;
            $balances[$account['account_group']][] = ['code' => $account['code'], 'name' => $account['name'], 'balance' => fin_money($signed)];
            $sums[$account['account_group']] += $signed;
        }
        $pl = fin_totals_for_period(date('Y-01-01', strtotime($to)), $to);
        $currentEarnings = $pl['revenue'] - $pl['expense'];
        $sums['equity'] += $currentEarnings;
        $report['accounts'] = $balances;
        $report['current_earnings'] = fin_money($currentEarnings);
        $report['totals'] = [
            'assets' => fin_money($sums['asset']),
            'liabilities' => fin_money($sums['liability']),
            'equity' => fin_money($sums['equity']),
            'liabilities_plus_equity' => fin_money($sums['liability'] + $sums['equity']),
            'balanced' => $sums['asset'] === $sums['liability'] + $sums['equity']
        ];
    }

    if ($type === 'equity') {
        $rows = [];
        foreach (mkt_all("SELECT * FROM fin_accounts WHERE account_group = 'equity' AND is_active = 1 ORDER BY code") as $account) {
            $rows[] = ['code' => $account['code'], 'name' => $account['name'], 'balance' => fin_money(fin_account_balance_by_id((int)$account['id'], $to))];
        }
        $pl = fin_totals_for_period(date('Y-01-01', strtotime($to)), $to);
        $report['rows'] = $rows;
        $report['current_earnings'] = fin_money($pl['revenue'] - $pl['expense']);
    }

    if ($type === 'debts-receivables') {
        $report['debts'] = mkt_all('SELECT transaction_no, creditor_name, debt_date, due_date, amount, paid_amount, remaining, status FROM fin_debts WHERE deleted_at IS NULL ORDER BY due_date ASC');
        $report['receivables'] = mkt_all('SELECT invoice_no, customer_name, invoice_date, due_date, amount, received_amount, remaining, status FROM fin_receivables WHERE deleted_at IS NULL ORDER BY due_date ASC');
    }

    if ($type === 'assets') {
        $report['rows'] = mkt_all('SELECT asset_code, name, category, purchase_date, cost, useful_life_months, depreciation_method, accumulated_depreciation, book_value, status FROM fin_assets WHERE deleted_at IS NULL ORDER BY asset_code');
    }

    if ($type === 'budgets') {
        $year = (int)date('Y', strtotime($to));
        $month = date('Y-m', strtotime($to)) === date('Y-m') ? (int)date('m') : 0;
        $budgets = mkt_all('SELECT * FROM fin_budgets WHERE deleted_at IS NULL AND budget_year = ? AND (budget_month = ? OR budget_month = 0) ORDER BY budget_month, category', [$year, $month]);
        foreach ($budgets as &$budget) {
            $realization = fin_api_budget_realization($budget['category'], (int)$budget['budget_year'], (int)$budget['budget_month']);
            $value = fin_cents($budget['amount']);
            $budget['realization'] = fin_money($realization);
            $budget['difference'] = fin_money($value - $realization);
            $budget['usage_percentage'] = $value > 0 ? round($realization / $value * 100, 2) : 0;
        }
        $report['rows'] = $budgets;
    }

    fin_ok($report);
}

function fin_api_bootstrap()
{
    fin_require('finance/dashboard', 'is_view');
    $accounts = mkt_all('SELECT id, code, name, account_group, normal_balance FROM fin_accounts WHERE is_active = 1 ORDER BY code');
    $cashAccounts = mkt_all('SELECT id, code, name, account_type, coa_code, current_balance FROM fin_cash_accounts WHERE deleted_at IS NULL AND is_active = 1 ORDER BY code');
    foreach ($cashAccounts as &$account) {
        $account['current_balance_value'] = fin_money($account['current_balance']);
    }
    fin_ok([
        'income_categories' => fin_api_categories('income'),
        'expense_categories' => fin_api_categories('expense'),
        'accounts' => $accounts,
        'cash_accounts' => $cashAccounts,
        'settings' => [
            'approval_limit' => fin_money(fin_cents(fin_setting('approval_limit', '10000000'))),
            'company_name' => fin_setting('company_name', 'Perusahaan'),
            'payroll_pay_day' => fin_setting('payroll_pay_day', '25'),
            'reminder_days' => fin_setting('reminder_days', '7')
        ],
        'can_approve' => fin_can_approve()
    ]);
}

function fin_api_settings()
{
    fin_require('finance/settings', 'is_view');
    $keys = ['income_coa_map', 'expense_coa_map', 'approval_limit', 'approver_roles', 'payroll_pay_day', 'reminder_days', 'company_name', 'currency'];
    $data = [];
    foreach ($keys as $key) {
        $data[$key] = fin_setting($key, '');
    }
    fin_ok(['data' => $data]);
}

function fin_api_settings_save()
{
    fin_require('finance/settings', 'is_edit');
    $payload = body();
    $allowed = ['income_coa_map', 'expense_coa_map', 'approval_limit', 'approver_roles', 'payroll_pay_day', 'reminder_days', 'company_name', 'currency'];
    $updates = [];
    foreach ($allowed as $key) {
        if (!array_key_exists($key, $payload)) {
            continue;
        }
        $value = is_array($payload[$key]) ? json_encode($payload[$key]) : trim((string)$payload[$key]);
        if ($key === 'approval_limit' && fin_cents($value) < 0) {
            fin_error('Batas persetujuan tidak valid', 422);
        }
        $updates[$key] = $value;
    }
    if (count($updates) === 0) {
        fin_error('Tidak ada pengaturan yang dikirim', 422);
    }
    $db = $GLOBALS['db'];
    $db->begin_transaction();
    try {
        foreach ($updates as $key => $value) {
            mkt_run('UPDATE fin_settings SET setting_value = ?, updated_by = ?, updated_at = ? WHERE setting_key = ?', [$value, fin_user()['id'], fin_now(), $key]);
        }
        fin_audit('settings', null, 'update', null, $updates);
        $db->commit();
    } catch (Exception $e) {
        $db->rollback();
        fin_error('Gagal menyimpan pengaturan: ' . $e->getMessage(), 500);
    }
    fin_ok(['message' => 'Pengaturan disimpan']);
}

function fin_api_notifications()
{
    fin_require('finance/dashboard', 'is_view');
    $user = fin_user();
    $rows = mkt_all('SELECT * FROM fin_notifications WHERE is_read = 0 AND (user_id IS NULL OR user_id = ? OR role_id = ?) ORDER BY created_at DESC LIMIT 100', [$user['id'], $user['role_id']]);
    fin_ok(['data' => $rows, 'alerts' => fin_api_alerts()]);
}

function fin_api_notification_read($id = null)
{
    fin_require('finance/dashboard', 'is_edit');
    if ($id) {
        mkt_run('UPDATE fin_notifications SET is_read = 1 WHERE id = ?', [$id]);
    } else {
        mkt_run('UPDATE fin_notifications SET is_read = 1 WHERE user_id IS NULL');
    }
    fin_ok(['message' => 'Notifikasi ditandai dibaca']);
}

function fin_api_audit()
{
    fin_require('finance/audit', 'is_view');
    $page = fin_pagination();
    $where = ['1 = 1'];
    $params = [];
    $entity = trim((string)fin_value('entity_type', ''));
    if ($entity !== '') {
        $where[] = 'entity_type = ?';
        $params[] = $entity;
    }
    $search = trim((string)fin_value('search', ''));
    if ($search !== '') {
        $where[] = '(user_name LIKE ? OR action LIKE ?)';
        $params[] = '%' . $search . '%';
        $params[] = '%' . $search . '%';
    }
    $whereSql = implode(' AND ', $where);
    $total = mkt_one('SELECT COUNT(*) AS total FROM fin_audit_logs WHERE ' . $whereSql, $params);
    $sql = 'SELECT * FROM fin_audit_logs WHERE ' . $whereSql . ' ORDER BY created_at DESC, id DESC';
    if (!$page['all']) {
        $sql .= ' LIMIT ' . (int)$page['limit'] . ' OFFSET ' . (int)$page['offset'];
    }
    fin_ok(['data' => mkt_all($sql, $params), 'total' => (int)$total['total'], 'page' => $page['page']]);
}

function fin_api_approvals()
{
    fin_require('finance/approvals', 'is_view');
    $items = [];
    foreach (mkt_all('SELECT id, transaction_no AS number, transaction_date AS date, amount, status, category FROM fin_incomes WHERE deleted_at IS NULL AND status = \'pending\'') as $row) {
        $items[] = array_merge($row, ['entity_type' => 'income', 'label' => fin_api_category_name('income', $row['category'])]);
    }
    foreach (mkt_all('SELECT id, transaction_no AS number, transaction_date AS date, amount, status, category FROM fin_expenses WHERE deleted_at IS NULL AND status = \'pending\'') as $row) {
        $items[] = array_merge($row, ['entity_type' => 'expense', 'label' => fin_api_category_name('expense', $row['category'])]);
    }
    foreach (mkt_all('SELECT id, period AS number, pay_date AS date, status FROM fin_payroll_periods WHERE status = \'approval\'') as $row) {
        $items[] = array_merge($row, ['amount' => '0.00', 'entity_type' => 'payroll_period', 'label' => 'Penggajian ' . $row['number']]);
    }
    fin_ok(['data' => $items, 'can_approve' => fin_can_approve(), 'history' => mkt_all('SELECT * FROM fin_approvals ORDER BY created_at DESC LIMIT 100')]);
}

function fin_api_dispatch_extended($method, $path)
{
    $segments = explode('/', trim($path, '/'));
    if (count($segments) < 3 || $segments[0] !== 'api' || $segments[1] !== 'finance') {
        return false;
    }
    $resource = $segments[2];
    $id = isset($segments[3]) && is_numeric($segments[3]) ? (int)$segments[3] : 0;
    $action = isset($segments[3]) && !is_numeric($segments[3]) ? $segments[3] : (isset($segments[4]) ? $segments[4] : '');

    if ($resource === 'bootstrap' && $method === 'GET') {
        fin_api_bootstrap();
    }
    if ($resource === 'dashboard' && $method === 'GET') {
        fin_api_dashboard();
    }
    if ($resource === 'employees') {
        if ($method === 'GET' && !$id) {
            fin_api_employees();
        }
        if (($method === 'POST' && !$id) || ($method === 'PUT' && $id)) {
            fin_api_employee_save($id ?: null);
        }
    }
    if ($resource === 'payroll') {
        if ($resource === 'payroll' && isset($segments[3]) && $segments[3] === 'components') {
            if ($method === 'GET') {
                fin_api_payroll_components();
            }
            if ($method === 'POST') {
                fin_api_payroll_component_save();
            }
        }
        if (isset($segments[3]) && $segments[3] === 'periods') {
            if ($method === 'GET' && !isset($segments[4])) {
                fin_api_payroll_periods();
            }
            $periodId = isset($segments[4]) ? (int)$segments[4] : 0;
            if ($method === 'POST' && $periodId && isset($segments[5])) {
                fin_api_payroll_period_action($periodId, $segments[5]);
            }
        }
        if (isset($segments[3]) && $segments[3] === 'generate' && $method === 'POST') {
            fin_api_payroll_generate();
        }
        if (isset($segments[3]) && $segments[3] === 'records') {
            if ($method === 'GET' && !isset($segments[4])) {
                fin_api_payroll_records();
            }
            if ($method === 'PUT' && isset($segments[4])) {
                fin_api_payroll_record_update((int)$segments[4]);
            }
        }
        if (isset($segments[3]) && $segments[3] === 'slips' && $method === 'GET' && isset($segments[4])) {
            fin_api_payroll_slip((int)$segments[4]);
        }
        if (isset($segments[3]) && $segments[3] === 'report' && $method === 'GET') {
            fin_api_payroll_report();
        }
    }
    if ($resource === 'budgets') {
        if ($method === 'GET' && !$id) {
            fin_api_budgets();
        }
        if (($method === 'POST' && !$id) || ($method === 'PUT' && $id)) {
            fin_api_budget_save($id ?: null);
        }
        if ($method === 'DELETE' && $id) {
            fin_require('finance/budgets', 'is_delete');
            mkt_run('UPDATE fin_budgets SET deleted_at = ?, updated_at = ? WHERE id = ?', [fin_now(), fin_now(), $id]);
            fin_audit('budget', $id, 'soft_delete');
            fin_ok(['message' => 'Anggaran dihapus']);
        }
    }
    if ($resource === 'assets') {
        if ($method === 'POST' && isset($segments[3]) && $segments[3] === 'depreciate') {
            fin_api_asset_depreciate();
        }
        if ($method === 'GET' && isset($segments[3]) && $segments[3] === 'depreciations') {
            fin_api_asset_depreciations();
        }
        if ($method === 'GET' && !$id) {
            fin_api_assets();
        }
        if (($method === 'POST' && !$id) || ($method === 'PUT' && $id)) {
            fin_api_asset_save($id ?: null);
        }
        if ($method === 'DELETE' && $id) {
            fin_require('finance/assets', 'is_delete');
            mkt_run('UPDATE fin_assets SET deleted_at = ?, updated_at = ? WHERE id = ?', [fin_now(), fin_now(), $id]);
            fin_audit('asset', $id, 'soft_delete');
            fin_ok(['message' => 'Aset dihapus']);
        }
    }
    if ($resource === 'debts') {
        if ($method === 'GET' && !$id) {
            fin_api_debts();
        }
        if (($method === 'POST' && !$id) || ($method === 'PUT' && $id)) {
            fin_api_debt_save($id ?: null);
        }
        if ($method === 'DELETE' && $id) {
            fin_require('finance/debts', 'is_delete');
            mkt_run('UPDATE fin_debts SET deleted_at = ? WHERE id = ?', [fin_now(), $id]);
            fin_audit('debt', $id, 'soft_delete');
            fin_ok(['message' => 'Utang dihapus']);
        }
        if ($id && isset($segments[4]) && $segments[4] === 'payments') {
            if ($method === 'GET') {
                fin_api_debt_payments($id);
            }
            if ($method === 'POST') {
                fin_api_debt_payment($id);
            }
        }
    }
    if ($resource === 'reset-all' && $method === 'POST') {
        fin_api_reset_all();
    }
    if ($resource === 'seed-dummy' && $method === 'POST') {
        fin_api_seed_dummy();
    }
    if ($resource === 'receivables') {
        if ($method === 'GET' && !$id) {
            fin_api_receivables();
        }
        if (($method === 'POST' && !$id) || ($method === 'PUT' && $id)) {
            fin_api_receivable_save($id ?: null);
        }
        if ($method === 'DELETE' && $id) {
            fin_require('finance/receivables', 'is_delete');
            mkt_run('UPDATE fin_receivables SET deleted_at = ? WHERE id = ?', [fin_now(), $id]);
            fin_audit('receivable', $id, 'soft_delete');
            fin_ok(['message' => 'Piutang dihapus']);
        }
        if ($id && isset($segments[4]) && $segments[4] === 'payments') {
            if ($method === 'GET') {
                fin_api_receivable_payments($id);
            }
            if ($method === 'POST') {
                fin_api_receivable_payment($id);
            }
        }
    }
    if ($resource === 'accounts') {
        if ($method === 'GET' && !$id) {
            fin_api_accounts();
        }
        if (($method === 'POST' && !$id) || ($method === 'PUT' && $id)) {
            fin_api_account_save($id ?: null);
        }
    }
    if ($resource === 'journals') {
        if ($method === 'GET' && !$id) {
            fin_api_journals();
        }
        if ($method === 'GET' && $id) {
            fin_api_journal_detail($id);
        }
        if ($method === 'POST' && !$id) {
            fin_api_journal_manual();
        }
        if ($method === 'POST' && $id && $action === 'cancel') {
            fin_api_journal_cancel($id);
        }
    }
    if ($resource === 'ledger' && $method === 'GET') {
        fin_api_ledger();
    }
    if ($resource === 'trial-balance' && $method === 'GET') {
        fin_api_trial_balance();
    }
    if ($resource === 'fiscal-periods') {
        if ($method === 'GET') {
            fin_api_fiscal_periods();
        }
        if ($method === 'POST' && !$id) {
            fin_api_fiscal_period_ensure();
        }
        if ($method === 'POST' && $id && $action) {
            fin_api_fiscal_period_action($id, $action);
        }
    }
    if ($resource === 'reports' && $method === 'GET') {
        fin_api_report($action !== '' ? (string)$action : (string)fin_value('type', 'profit-loss'));
    }
    if ($resource === 'settings') {
        if ($method === 'GET') {
            fin_api_settings();
        }
        if ($method === 'PUT' || $method === 'POST') {
            fin_api_settings_save();
        }
    }
    if ($resource === 'notifications') {
        if ($method === 'GET') {
            fin_api_notifications();
        }
        if ($method === 'POST') {
            fin_api_notification_read($id ?: null);
        }
    }
    if ($resource === 'audit' && $method === 'GET') {
        fin_api_audit();
    }
    if ($resource === 'approvals' && $method === 'GET') {
        fin_api_approvals();
    }
    return false;
}

function fin_api_reset_all()
{
    fin_require('finance/dashboard', 'is_delete');
    $db = $GLOBALS['db'];
    $db->begin_transaction();
    try {
        $tables = [
            'fin_cash_movements',
            'fin_transfers',
            'fin_journal_lines',
            'fin_journals',
            'fin_incomes',
            'fin_expenses',
            'fin_debt_payments',
            'fin_debts',
            'fin_receivable_payments',
            'fin_receivables',
            'fin_asset_depreciations',
            'fin_assets',
            'fin_budgets',
            'fin_payroll_records',
            'fin_payroll_adjustments',
            'fin_payroll_periods',
            'fin_notifications',
            'fin_audit_logs',
            'fin_cash_accounts'
        ];
        foreach ($tables as $table) {
            mkt_run('DELETE FROM ' . $table);
        }
        mkt_run('DELETE FROM fin_sequences');
        $db->commit();
    } catch (Exception $e) {
        $db->rollback();
        fin_error('Gagal reset data keuangan: ' . $e->getMessage(), 500);
    }
    fin_ok(['message' => 'Semua data transaksi keuangan berhasil direset']);
}

function fin_api_seed_dummy()
{
    fin_require('finance/dashboard', 'is_create');
    $db = $GLOBALS['db'];
    $db->begin_transaction();
    try {
        $today = date('Y-m-d');
        $userId = is_array(fin_user()) ? fin_user()['id'] : null;

        // Cash accounts
        mkt_run("INSERT INTO fin_cash_accounts (code, name, bank_name, account_number, account_type, coa_code, opening_balance, current_balance, currency, is_active, created_by, created_at, updated_at) VALUES ('BCA', 'Bank BCA', 'BCA', '1234567890', 'bank', '101', '10000000.00', '10000000.00', 'IDR', 1, ?, ?, ?)", [$userId, fin_now(), fin_now()]);
        mkt_run("INSERT INTO fin_cash_accounts (code, name, bank_name, account_number, account_type, coa_code, opening_balance, current_balance, currency, is_active, created_by, created_at, updated_at) VALUES ('CASH', 'Kas Tunai', NULL, NULL, 'cash', '101', '2000000.00', '2000000.00', 'IDR', 1, ?, ?, ?)", [$userId, fin_now(), fin_now()]);
        $accounts = mkt_all("SELECT id FROM fin_cash_accounts WHERE deleted_at IS NULL ORDER BY id ASC");
        $accountId = (int)$accounts[0]['id'];

        // Incomes (posted) across 12 months
        for ($m = 0; $m < 12; $m++) {
            $date = date('Y-m-d', strtotime("-$m months", strtotime($today)));
            for ($i = 1; $i <= 2; $i++) {
                $amount = 1000000 * ($i + $m);
                $no = fin_number('PMA', $date);
                mkt_run("INSERT INTO fin_incomes (transaction_no, transaction_date, category, customer_name, description, amount, payment_method, account_id, status, payment_status, created_by, created_at, updated_at) VALUES (?, ?, 'pendapatan_jasa', ?, ?, ?, 'transfer', ?, 'posted', 'paid', ?, ?, ?)", [$no, $date, 'PT Contoh ' . $i, 'Pemasukan dummy ' . ($m + 1) . '-' . $i, $amount, $accountId, $userId, fin_now(), fin_now()]);
                $incomeId = (int)$db->insert_id;
                $cashCode = fin_api_account_coa($accountId);
                $revCode = fin_api_coa_for_category('income', 'pendapatan_jasa');
                $journalId = fin_journal($date, 'Pemasukan ' . $no, [['code' => $cashCode, 'debit' => $amount, 'credit' => 0], ['code' => $revCode, 'debit' => 0, 'credit' => $amount]], 'income', $incomeId);
                mkt_run('UPDATE fin_incomes SET journal_id = ? WHERE id = ?', [$journalId, $incomeId]);
                fin_cash_movement($accountId, fin_cents($amount), 1, $date, 'income', 'income', $incomeId, $no);
            }
        }

        // Expenses (posted) across 12 months
        for ($m = 0; $m < 12; $m++) {
            $date = date('Y-m-d', strtotime("-$m months", strtotime($today)));
            for ($i = 1; $i <= 2; $i++) {
                $amount = 500000 * ($i + $m);
                $no = fin_number('PMK', $date);
                mkt_run("INSERT INTO fin_expenses (transaction_no, transaction_date, category, vendor_name, description, amount, payment_method, account_id, status, payment_status, created_by, created_at, updated_at) VALUES (?, ?, 'operasional_kantor', ?, ?, ?, 'transfer', ?, 'posted', 'paid', ?, ?, ?)", [$no, $date, 'Vendor Dummy ' . $i, 'Pengeluaran dummy ' . ($m + 1) . '-' . $i, $amount, $accountId, $userId, fin_now(), fin_now()]);
                $expenseId = (int)$db->insert_id;
                $cashCode = fin_api_account_coa($accountId);
                $expCode = fin_api_coa_for_category('expense', 'operasional_kantor');
                $journalId = fin_journal($date, 'Pengeluaran ' . $no, [['code' => $expCode, 'debit' => $amount, 'credit' => 0], ['code' => $cashCode, 'debit' => 0, 'credit' => $amount]], 'expense', $expenseId);
                mkt_run('UPDATE fin_expenses SET journal_id = ? WHERE id = ?', [$journalId, $expenseId]);
                fin_cash_movement($accountId, fin_cents($amount), -1, $date, 'expense', 'expense', $expenseId, $no);
            }
        }

        // Transfer
        if (count($accounts) >= 2) {
            $fromId = (int)$accounts[0]['id'];
            $toId = (int)$accounts[1]['id'];
            $trfNo = fin_number('TRF', $today);
            mkt_run("INSERT INTO fin_transfers (transfer_no, transfer_date, from_account_id, to_account_id, amount, description, created_by, created_at) VALUES (?, ?, ?, ?, '250000.00', 'Transfer dummy', ?, ?)", [$trfNo, $today, $fromId, $toId, $userId, fin_now()]);
            $transferId = (int)$db->insert_id;
            fin_cash_movement($fromId, fin_cents(250000), -1, $today, 'transfer_out', 'transfer', $transferId, 'Transfer keluar dummy');
            fin_cash_movement($toId, fin_cents(250000), 1, $today, 'transfer_in', 'transfer', $transferId, 'Transfer masuk dummy');
        }

        // Debt
        mkt_run("INSERT INTO fin_debts (transaction_no, creditor_name, debt_date, due_date, amount, paid_amount, remaining, status, created_by, created_at, updated_at) VALUES (?, 'Bank Dummy', ?, ?, '5000000.00', '0.00', '5000000.00', 'unpaid', ?, ?, ?)", [fin_number('UTG', $today), $today, $today, $userId, fin_now(), fin_now()]);

        // Receivable
        mkt_run("INSERT INTO fin_receivables (invoice_no, customer_name, invoice_date, due_date, amount, received_amount, remaining, status, created_by, created_at, updated_at) VALUES (?, 'Customer Dummy', ?, ?, '3000000.00', '0.00', '3000000.00', 'unpaid', ?, ?, ?)", [fin_number('PRT', $today), $today, $today, $userId, fin_now(), fin_now()]);

        // Asset
        mkt_run("INSERT INTO fin_assets (asset_code, name, category, purchase_date, cost, useful_life_months, residual_value, depreciation_method, status, created_by, created_at, updated_at) VALUES (?, 'Laptop Dummy', 'peralatan', ?, '15000000.00', 36, '1000000.00', 'straight_line', 'active', ?, ?, ?)", [fin_number('AST', $today), $today, $userId, fin_now(), fin_now()]);

        // Budget
        $periodYear = (int)date('Y');
        $periodMonth = (int)date('n');
        mkt_run("INSERT INTO fin_budgets (category, budget_year, budget_month, amount, warning_threshold, notes, created_by, created_at, updated_at) VALUES ('operasional_kantor', ?, ?, '5000000.00', 80.00, 'Budget dummy', ?, ?, ?)", [$periodYear, $periodMonth, $userId, fin_now(), fin_now()]);

        // Employee + payroll
        $empCount = (int)mkt_one("SELECT COUNT(*) AS total FROM fin_employees WHERE deleted_at IS NULL")['total'];
        if ($empCount === 0) {
            mkt_run("INSERT INTO fin_employees (employee_code, name, position, department, join_date, is_active, created_at, updated_at) VALUES ('EMP001', 'Karyawan Dummy', 'Staff', 'Umum', ?, 1, ?, ?)", [$today, fin_now(), fin_now()]);
            $empId = (int)$db->insert_id;
            mkt_run("INSERT INTO fin_employee_salaries (employee_id, base_salary, allowance_position, allowance_transport, allowance_meal, allowance_other, bpjs_health, bpjs_employment, pph21, updated_at) VALUES (?, '5000000.00', '500000.00', '300000.00', '300000.00', '0.00', '100000.00', '100000.00', '0.00', ?)", [$empId, fin_now()]);
        }
        $periodCode = date('Y-m');
        $existingPeriod = mkt_one("SELECT id FROM fin_payroll_periods WHERE period = ? AND (department IS NULL OR department = '')", [$periodCode]);
        if (!is_array($existingPeriod)) {
            mkt_run("INSERT INTO fin_payroll_periods (period, start_date, end_date, pay_date, status, created_by, created_at) VALUES (?, ?, ?, ?, 'draft', ?, ?)", [$periodCode, $today, $today, $today, $userId, fin_now()]);
            $periodId = (int)$db->insert_id;
            $emp = mkt_one("SELECT id, employee_code, name, position, department FROM fin_employees WHERE deleted_at IS NULL LIMIT 1");
            if (is_array($emp)) {
                mkt_run("INSERT INTO fin_payroll_records (period_id, employee_id, employee_code, employee_name, position, department, base_salary, allowance_position, allowance_transport, allowance_meal, total_income, total_deduction, net_pay, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, '5000000.00', '500000.00', '300000.00', '300000.00', '6100000.00', '200000.00', '5900000.00', 'draft', ?, ?)", [$periodId, $emp['id'], $emp['employee_code'], $emp['name'], $emp['position'], $emp['department'], fin_now(), fin_now()]);
            }
        }

        $db->commit();
    } catch (Exception $e) {
        $db->rollback();
        fin_error('Gagal membuat data dummy: ' . $e->getMessage(), 500);
    }
    fin_ok(['message' => 'Data dummy berhasil dibuat']);
}
