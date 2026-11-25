<?php

function finance_schema_install($db)
{
    $db->query("CREATE TABLE IF NOT EXISTS fin_sequences (
        seq_key VARCHAR(60) NOT NULL,
        seq_value INT NOT NULL DEFAULT 0,
        PRIMARY KEY (seq_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS fin_settings (
        setting_key VARCHAR(100) NOT NULL,
        setting_value TEXT NULL,
        updated_by INT DEFAULT NULL,
        updated_at DATETIME DEFAULT NULL,
        PRIMARY KEY (setting_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS fin_fiscal_periods (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        period VARCHAR(7) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'open',
        closed_by INT DEFAULT NULL,
        closed_at DATETIME DEFAULT NULL,
        created_at DATETIME NOT NULL,
        UNIQUE KEY uniq_fin_fiscal_period (period)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS fin_cash_accounts (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(30) NOT NULL,
        name VARCHAR(150) NOT NULL,
        bank_name VARCHAR(150) DEFAULT NULL,
        account_number VARCHAR(60) DEFAULT NULL,
        owner_name VARCHAR(150) DEFAULT NULL,
        account_type VARCHAR(30) NOT NULL DEFAULT 'bank',
        coa_code VARCHAR(30) NOT NULL DEFAULT '101',
        opening_balance DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        current_balance DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        currency VARCHAR(10) NOT NULL DEFAULT 'IDR',
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_by INT DEFAULT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME DEFAULT NULL,
        deleted_at DATETIME DEFAULT NULL,
        UNIQUE KEY uniq_fin_cash_code (code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS fin_transfers (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        transfer_no VARCHAR(40) NOT NULL,
        transfer_date DATE NOT NULL,
        from_account_id INT NOT NULL,
        to_account_id INT NOT NULL,
        amount DECIMAL(18,2) NOT NULL,
        description VARCHAR(255) DEFAULT NULL,
        created_by INT DEFAULT NULL,
        created_at DATETIME NOT NULL,
        deleted_at DATETIME DEFAULT NULL,
        UNIQUE KEY uniq_fin_transfer_no (transfer_no),
        KEY idx_fin_transfer_accounts (from_account_id, to_account_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS fin_cash_movements (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        account_id INT NOT NULL,
        movement_date DATE NOT NULL,
        movement_type VARCHAR(30) NOT NULL,
        amount DECIMAL(18,2) NOT NULL,
        direction TINYINT(1) NOT NULL,
        balance_after DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        reference_type VARCHAR(40) DEFAULT NULL,
        reference_id INT DEFAULT NULL,
        transfer_id INT DEFAULT NULL,
        description VARCHAR(255) DEFAULT NULL,
        created_by INT DEFAULT NULL,
        created_at DATETIME NOT NULL,
        KEY idx_fin_cash_movement_account (account_id, movement_date),
        KEY idx_fin_cash_movement_ref (reference_type, reference_id),
        KEY idx_fin_cash_movement_transfer (transfer_id),
        CONSTRAINT fk_fin_cash_movement_account FOREIGN KEY (account_id) REFERENCES fin_cash_accounts (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS fin_incomes (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        transaction_no VARCHAR(40) NOT NULL,
        external_ref VARCHAR(120) DEFAULT NULL,
        transaction_date DATE NOT NULL,
        category VARCHAR(60) NOT NULL,
        customer_name VARCHAR(180) DEFAULT NULL,
        description VARCHAR(500) DEFAULT NULL,
        amount DECIMAL(18,2) NOT NULL,
        payment_method VARCHAR(40) NOT NULL DEFAULT 'transfer',
        account_id INT DEFAULT NULL,
        invoice_no VARCHAR(80) DEFAULT NULL,
        proof_file VARCHAR(255) DEFAULT NULL,
        payment_status VARCHAR(20) NOT NULL DEFAULT 'paid',
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        notes TEXT NULL,
        journal_id INT DEFAULT NULL,
        approved_by INT DEFAULT NULL,
        approved_at DATETIME DEFAULT NULL,
        cancelled_reason VARCHAR(255) DEFAULT NULL,
        created_by INT DEFAULT NULL,
        updated_by INT DEFAULT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME DEFAULT NULL,
        deleted_at DATETIME DEFAULT NULL,
        UNIQUE KEY uniq_fin_income_no (transaction_no),
        UNIQUE KEY uniq_fin_income_ref (external_ref),
        KEY idx_fin_income_date_status (transaction_date, status),
        KEY idx_fin_income_category (category)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS fin_expenses (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        transaction_no VARCHAR(40) NOT NULL,
        external_ref VARCHAR(120) DEFAULT NULL,
        transaction_date DATE NOT NULL,
        category VARCHAR(60) NOT NULL,
        vendor_name VARCHAR(180) DEFAULT NULL,
        description VARCHAR(500) DEFAULT NULL,
        amount DECIMAL(18,2) NOT NULL,
        payment_method VARCHAR(40) NOT NULL DEFAULT 'transfer',
        account_id INT DEFAULT NULL,
        invoice_no VARCHAR(80) DEFAULT NULL,
        proof_file VARCHAR(255) DEFAULT NULL,
        payment_status VARCHAR(20) NOT NULL DEFAULT 'paid',
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        notes TEXT NULL,
        journal_id INT DEFAULT NULL,
        approved_by INT DEFAULT NULL,
        approved_at DATETIME DEFAULT NULL,
        cancelled_reason VARCHAR(255) DEFAULT NULL,
        created_by INT DEFAULT NULL,
        updated_by INT DEFAULT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME DEFAULT NULL,
        deleted_at DATETIME DEFAULT NULL,
        UNIQUE KEY uniq_fin_expense_no (transaction_no),
        UNIQUE KEY uniq_fin_expense_ref (external_ref),
        KEY idx_fin_expense_date_status (transaction_date, status),
        KEY idx_fin_expense_category (category)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS fin_employees (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        employee_code VARCHAR(40) NOT NULL,
        user_id INT DEFAULT NULL,
        name VARCHAR(150) NOT NULL,
        position VARCHAR(120) DEFAULT NULL,
        department VARCHAR(120) DEFAULT NULL,
        bank_name VARCHAR(120) DEFAULT NULL,
        bank_account VARCHAR(80) DEFAULT NULL,
        join_date DATE DEFAULT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL,
        updated_at DATETIME DEFAULT NULL,
        deleted_at DATETIME DEFAULT NULL,
        UNIQUE KEY uniq_fin_employee_code (employee_code),
        KEY idx_fin_employee_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS fin_payroll_components (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(40) NOT NULL,
        name VARCHAR(120) NOT NULL,
        component_type VARCHAR(20) NOT NULL,
        calculation VARCHAR(20) NOT NULL DEFAULT 'fixed',
        default_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL,
        UNIQUE KEY uniq_fin_payroll_component (code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS fin_employee_salaries (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        base_salary DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        allowance_position DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        allowance_transport DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        allowance_meal DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        allowance_other DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        bpjs_health DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        bpjs_employment DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        pph21 DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        updated_by INT DEFAULT NULL,
        updated_at DATETIME NOT NULL,
        UNIQUE KEY uniq_fin_employee_salary (employee_id),
        CONSTRAINT fk_fin_salary_employee FOREIGN KEY (employee_id) REFERENCES fin_employees (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS fin_payroll_periods (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        period VARCHAR(7) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        pay_date DATE DEFAULT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        department VARCHAR(120) DEFAULT NULL,
        approved_by INT DEFAULT NULL,
        approved_at DATETIME DEFAULT NULL,
        paid_at DATETIME DEFAULT NULL,
        paid_by INT DEFAULT NULL,
        account_id INT DEFAULT NULL,
        journal_id INT DEFAULT NULL,
        created_by INT DEFAULT NULL,
        created_at DATETIME NOT NULL,
        UNIQUE KEY uniq_fin_payroll_period (period, department)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS fin_payroll_records (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        period_id INT NOT NULL,
        employee_id INT NOT NULL,
        employee_code VARCHAR(40) DEFAULT NULL,
        employee_name VARCHAR(150) DEFAULT NULL,
        position VARCHAR(120) DEFAULT NULL,
        department VARCHAR(120) DEFAULT NULL,
        base_salary DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        allowance_position DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        allowance_transport DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        allowance_meal DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        allowance_other DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        bonus DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        overtime DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        deduction_late DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        deduction_loan DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        bpjs_health DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        bpjs_employment DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        pph21 DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        deduction_other DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        total_income DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        total_deduction DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        net_pay DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        payment_reference VARCHAR(120) DEFAULT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME DEFAULT NULL,
        UNIQUE KEY uniq_fin_payroll_record (period_id, employee_id),
        KEY idx_fin_payroll_record_status (status),
        CONSTRAINT fk_fin_payroll_record_period FOREIGN KEY (period_id) REFERENCES fin_payroll_periods (id),
        CONSTRAINT fk_fin_payroll_record_employee FOREIGN KEY (employee_id) REFERENCES fin_employees (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS fin_payroll_adjustments (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        payroll_record_id INT NOT NULL,
        field_name VARCHAR(60) NOT NULL,
        old_value DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        new_value DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        reason VARCHAR(255) NOT NULL,
        changed_by INT DEFAULT NULL,
        created_at DATETIME NOT NULL,
        KEY idx_fin_payroll_adjustment_record (payroll_record_id),
        CONSTRAINT fk_fin_payroll_adjustment_record FOREIGN KEY (payroll_record_id) REFERENCES fin_payroll_records (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS fin_budgets (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        category VARCHAR(60) NOT NULL,
        budget_year SMALLINT NOT NULL,
        budget_month TINYINT NOT NULL DEFAULT 0,
        amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        warning_threshold DECIMAL(5,2) NOT NULL DEFAULT 80.00,
        notes VARCHAR(255) DEFAULT NULL,
        created_by INT DEFAULT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME DEFAULT NULL,
        deleted_at DATETIME DEFAULT NULL,
        UNIQUE KEY uniq_fin_budget (category, budget_year, budget_month)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS fin_assets (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        asset_code VARCHAR(40) NOT NULL,
        name VARCHAR(180) NOT NULL,
        category VARCHAR(60) NOT NULL,
        purchase_date DATE NOT NULL,
        cost DECIMAL(18,2) NOT NULL,
        useful_life_months INT NOT NULL DEFAULT 12,
        residual_value DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        depreciation_method VARCHAR(30) NOT NULL DEFAULT 'straight_line',
        accumulated_depreciation DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        book_value DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        account_id INT DEFAULT NULL,
        journal_id INT DEFAULT NULL,
        notes TEXT NULL,
        created_by INT DEFAULT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME DEFAULT NULL,
        deleted_at DATETIME DEFAULT NULL,
        UNIQUE KEY uniq_fin_asset_code (asset_code),
        KEY idx_fin_asset_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS fin_asset_depreciations (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        asset_id INT NOT NULL,
        period VARCHAR(7) NOT NULL,
        amount DECIMAL(18,2) NOT NULL,
        accumulated_after DECIMAL(18,2) NOT NULL,
        book_value_after DECIMAL(18,2) NOT NULL,
        journal_id INT DEFAULT NULL,
        created_at DATETIME NOT NULL,
        UNIQUE KEY uniq_fin_depreciation (asset_id, period),
        CONSTRAINT fk_fin_depreciation_asset FOREIGN KEY (asset_id) REFERENCES fin_assets (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS fin_debts (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        transaction_no VARCHAR(40) NOT NULL,
        creditor_name VARCHAR(180) NOT NULL,
        debt_date DATE NOT NULL,
        due_date DATE NOT NULL,
        amount DECIMAL(18,2) NOT NULL,
        paid_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        remaining DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
        description VARCHAR(500) DEFAULT NULL,
        account_id INT DEFAULT NULL,
        journal_id INT DEFAULT NULL,
        notes TEXT NULL,
        created_by INT DEFAULT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME DEFAULT NULL,
        deleted_at DATETIME DEFAULT NULL,
        UNIQUE KEY uniq_fin_debt_no (transaction_no),
        KEY idx_fin_debt_due (due_date, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS fin_debt_payments (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        debt_id INT NOT NULL,
        payment_date DATE NOT NULL,
        amount DECIMAL(18,2) NOT NULL,
        account_id INT NOT NULL,
        proof_file VARCHAR(255) DEFAULT NULL,
        description VARCHAR(255) DEFAULT NULL,
        journal_id INT DEFAULT NULL,
        created_by INT DEFAULT NULL,
        created_at DATETIME NOT NULL,
        KEY idx_fin_debt_payment_debt (debt_id),
        CONSTRAINT fk_fin_debt_payment_debt FOREIGN KEY (debt_id) REFERENCES fin_debts (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS fin_receivables (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        invoice_no VARCHAR(80) NOT NULL,
        customer_name VARCHAR(180) NOT NULL,
        invoice_date DATE NOT NULL,
        due_date DATE NOT NULL,
        amount DECIMAL(18,2) NOT NULL,
        received_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        remaining DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
        description VARCHAR(500) DEFAULT NULL,
        account_id INT DEFAULT NULL,
        journal_id INT DEFAULT NULL,
        notes TEXT NULL,
        created_by INT DEFAULT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME DEFAULT NULL,
        deleted_at DATETIME DEFAULT NULL,
        UNIQUE KEY uniq_fin_receivable_invoice (invoice_no),
        KEY idx_fin_receivable_due (due_date, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS fin_receivable_payments (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        receivable_id INT NOT NULL,
        payment_date DATE NOT NULL,
        amount DECIMAL(18,2) NOT NULL,
        account_id INT NOT NULL,
        proof_file VARCHAR(255) DEFAULT NULL,
        description VARCHAR(255) DEFAULT NULL,
        journal_id INT DEFAULT NULL,
        created_by INT DEFAULT NULL,
        created_at DATETIME NOT NULL,
        KEY idx_fin_receivable_payment_parent (receivable_id),
        CONSTRAINT fk_fin_receivable_payment_parent FOREIGN KEY (receivable_id) REFERENCES fin_receivables (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS fin_accounts (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(30) NOT NULL,
        name VARCHAR(150) NOT NULL,
        account_group VARCHAR(20) NOT NULL,
        sub_group VARCHAR(80) DEFAULT NULL,
        normal_balance VARCHAR(10) NOT NULL DEFAULT 'debit',
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL,
        UNIQUE KEY uniq_fin_account_code (code),
        KEY idx_fin_account_group (account_group)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS fin_journals (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        journal_no VARCHAR(40) NOT NULL,
        journal_date DATE NOT NULL,
        description VARCHAR(500) DEFAULT NULL,
        reference_type VARCHAR(40) DEFAULT NULL,
        reference_id INT DEFAULT NULL,
        total_debit DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        total_credit DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        status VARCHAR(20) NOT NULL DEFAULT 'posted',
        created_by INT DEFAULT NULL,
        created_at DATETIME NOT NULL,
        cancelled_by INT DEFAULT NULL,
        cancelled_at DATETIME DEFAULT NULL,
        cancelled_reason VARCHAR(255) DEFAULT NULL,
        reversal_of INT DEFAULT NULL,
        UNIQUE KEY uniq_fin_journal_no (journal_no),
        KEY idx_fin_journal_date (journal_date, status),
        KEY idx_fin_journal_ref (reference_type, reference_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS fin_journal_lines (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        journal_id INT NOT NULL,
        account_id INT NOT NULL,
        debit DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        credit DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        description VARCHAR(255) DEFAULT NULL,
        line_order INT NOT NULL DEFAULT 0,
        KEY idx_fin_journal_line_journal (journal_id),
        KEY idx_fin_journal_line_account (account_id),
        CONSTRAINT fk_fin_journal_line_journal FOREIGN KEY (journal_id) REFERENCES fin_journals (id),
        CONSTRAINT fk_fin_journal_line_account FOREIGN KEY (account_id) REFERENCES fin_accounts (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS fin_approvals (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        entity_type VARCHAR(40) NOT NULL,
        entity_id INT NOT NULL,
        action VARCHAR(20) NOT NULL DEFAULT 'approve',
        approver_id INT DEFAULT NULL,
        approver_name VARCHAR(150) DEFAULT NULL,
        approver_role INT DEFAULT NULL,
        note VARCHAR(255) DEFAULT NULL,
        created_at DATETIME NOT NULL,
        KEY idx_fin_approval_entity (entity_type, entity_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS fin_audit_logs (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        entity_type VARCHAR(40) NOT NULL,
        entity_id INT DEFAULT NULL,
        action VARCHAR(30) NOT NULL,
        old_values TEXT NULL,
        new_values TEXT NULL,
        user_id INT DEFAULT NULL,
        user_name VARCHAR(150) DEFAULT NULL,
        role_id INT DEFAULT NULL,
        ip_address VARCHAR(64) DEFAULT NULL,
        created_at DATETIME NOT NULL,
        KEY idx_fin_audit_entity (entity_type, entity_id),
        KEY idx_fin_audit_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS fin_notifications (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT DEFAULT NULL,
        role_id INT DEFAULT NULL,
        type VARCHAR(40) NOT NULL,
        title VARCHAR(180) NOT NULL,
        message VARCHAR(500) DEFAULT NULL,
        reference_type VARCHAR(40) DEFAULT NULL,
        reference_id INT DEFAULT NULL,
        due_date DATE DEFAULT NULL,
        is_read TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL,
        KEY idx_fin_notification_user (user_id, is_read),
        KEY idx_fin_notification_due (due_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    finance_schema_seed_accounts($db);
    finance_schema_seed_settings($db);
    finance_schema_seed_roles_menus($db);
}

function finance_schema_seed_accounts($db)
{
    $accounts = [
        ['101', 'Kas', 'asset', 'Kas', 'debit'],
        ['102', 'Bank', 'asset', 'Bank', 'debit'],
        ['110', 'Piutang usaha', 'asset', 'Piutang', 'debit'],
        ['120', 'Persediaan', 'asset', 'Persediaan', 'debit'],
        ['130', 'Aset tetap', 'asset', 'Aset tetap', 'debit'],
        ['135', 'Akumulasi penyusutan', 'asset', 'Aset tetap', 'credit'],
        ['201', 'Utang usaha', 'liability', 'Utang', 'credit'],
        ['202', 'Utang gaji', 'liability', 'Utang', 'credit'],
        ['203', 'Utang pajak', 'liability', 'Utang', 'credit'],
        ['209', 'Kewajiban lainnya', 'liability', 'Utang', 'credit'],
        ['301', 'Modal perusahaan', 'equity', 'Modal', 'credit'],
        ['310', 'Saldo laba', 'equity', 'Modal', 'credit'],
        ['320', 'Laba tahun berjalan', 'equity', 'Modal', 'credit'],
        ['401', 'Pendapatan usaha', 'revenue', 'Pendapatan', 'credit'],
        ['402', 'Pendapatan jasa', 'revenue', 'Pendapatan', 'credit'],
        ['403', 'Pendapatan lainnya', 'revenue', 'Pendapatan', 'credit'],
        ['501', 'Beban gaji', 'expense', 'Beban', 'debit'],
        ['502', 'Beban operasional', 'expense', 'Beban', 'debit'],
        ['503', 'Beban pemasaran', 'expense', 'Beban', 'debit'],
        ['504', 'Beban penyusutan', 'expense', 'Beban', 'debit'],
        ['505', 'Beban pajak', 'expense', 'Beban', 'debit'],
        ['509', 'Beban lainnya', 'expense', 'Beban', 'debit'],
    ];
    $stmt = $db->prepare("INSERT IGNORE INTO fin_accounts (code, name, account_group, sub_group, normal_balance, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, NOW())");
    foreach ($accounts as $a) {
        $stmt->bind_param('sssss', $a[0], $a[1], $a[2], $a[3], $a[4]);
        $stmt->execute();
    }
    $stmt->close();
}

function finance_schema_seed_settings($db)
{
    $incomeMap = [
        'pendapatan_proyek' => '401',
        'pendapatan_jasa' => '402',
        'pendapatan_penjualan' => '401',
        'pendapatan_langganan' => '401',
        'pendapatan_investasi' => '403',
        'pendapatan_lainnya' => '403',
    ];
    $expenseMap = [
        'gaji_dan_tunjangan' => '501',
        'operasional_kantor' => '502',
        'internet_telekomunikasi' => '502',
        'sewa_kantor' => '502',
        'listrik_air' => '502',
        'transportasi_perjalanan' => '502',
        'konsumsi_kantor' => '502',
        'pembelian_aset' => '130',
        'pemasaran' => '503',
        'biaya_proyek' => '502',
        'pajak_administrasi' => '505',
        'langganan_software' => '502',
        'pemeliharaan' => '502',
        'pengeluaran_lainnya' => '509',
    ];
    $settings = [
        'income_coa_map' => json_encode($incomeMap),
        'expense_coa_map' => json_encode($expenseMap),
        'approval_limit' => '10000000',
        'approver_roles' => json_encode([1, 7, 8, 9]),
        'payroll_pay_day' => '25',
        'reminder_days' => '7',
        'company_name' => 'Perusahaan',
        'currency' => 'IDR',
    ];
    $stmt = $db->prepare("INSERT IGNORE INTO fin_settings (setting_key, setting_value, updated_at) VALUES (?, ?, NOW())");
    foreach ($settings as $key => $value) {
        $stmt->bind_param('ss', $key, $value);
        $stmt->execute();
    }
    $stmt->close();
}

function finance_schema_seed_roles_menus($db)
{
    $roles = [
        [8, 'Direktur', 'Melihat seluruh laporan keuangan dan menyetujui transaksi'],
        [9, 'Finance Manager', 'Mengelola keuangan dan persetujuan'],
        [10, 'Finance Staff', 'Input dan mengelola transaksi keuangan'],
        [11, 'HR', 'Mengelola data karyawan dan penggajian'],
        [12, 'Auditor', 'Akses baca laporan dan riwayat transaksi'],
    ];
    $stmt = $db->prepare("INSERT IGNORE INTO roles (role_id, name_role, description, `lock`) VALUES (?, ?, ?, 0)");
    foreach ($roles as $r) {
        $stmt->bind_param('iss', $r[0], $r[1], $r[2]);
        $stmt->execute();
    }
    $stmt->close();

    $menus = [
        [300, 1, 'Manajemen Keuangan', 'finance', 'Modul manajemen keuangan perusahaan', 300, 'Wallet'],
        [301, 300, 'Dashboard Keuangan', 'finance/dashboard', 'Ringkasan kondisi keuangan', 301, 'LayoutDashboard'],
        [302, 300, 'Pemasukan', 'finance/incomes', 'Pencatatan pemasukan perusahaan', 302, 'ArrowDownLeft'],
        [303, 300, 'Pengeluaran', 'finance/expenses', 'Pencatatan pengeluaran perusahaan', 303, 'ArrowUpRight'],
        [304, 300, 'Penggajian', 'finance/payroll', 'Penggajian karyawan bulanan', 304, 'Users'],
        [305, 300, 'Kas dan Rekening', 'finance/cash', 'Kas, bank, dan mutasi rekening', 305, 'Landmark'],
        [306, 300, 'Anggaran', 'finance/budgets', 'Anggaran dan realisasi', 306, 'PieChart'],
        [307, 300, 'Aset Perusahaan', 'finance/assets', 'Aset tetap dan penyusutan', 307, 'Package'],
        [308, 300, 'Utang', 'finance/debts', 'Manajemen utang perusahaan', 308, 'CreditCard'],
        [309, 300, 'Piutang', 'finance/receivables', 'Manajemen piutang perusahaan', 309, 'HandCoins'],
        [310, 300, 'Akuntansi', 'finance/accounting', 'Pembukuan berpasangan', 310, 'BookOpen'],
        [311, 310, 'Chart of Accounts', 'finance/accounts', 'Daftar akun akuntansi', 311, 'ListTree'],
        [312, 310, 'Jurnal Umum', 'finance/journals', 'Jurnal transaksi', 312, 'NotebookPen'],
        [313, 310, 'Buku Besar', 'finance/ledger', 'Buku besar per akun', 313, 'BookOpen'],
        [314, 310, 'Neraca Saldo', 'finance/trial-balance', 'Neraca saldo', 314, 'Scale'],
        [315, 300, 'Laporan Keuangan', 'finance/reports', 'Laporan keuangan perusahaan', 315, 'FileBarChart'],
        [316, 315, 'Laba Rugi', 'finance/reports/profit-loss', 'Laporan laba rugi', 316, 'TrendingUp'],
        [317, 315, 'Neraca', 'finance/reports/balance-sheet', 'Laporan posisi keuangan', 317, 'Scale'],
        [318, 315, 'Arus Kas', 'finance/reports/cash-flow', 'Laporan arus kas', 318, 'Activity'],
        [319, 315, 'Perubahan Ekuitas', 'finance/reports/equity', 'Laporan perubahan ekuitas', 319, 'RefreshCcw'],
        [320, 300, 'Pengaturan Keuangan', 'finance/settings', 'Pengaturan modul keuangan', 320, 'Settings'],
        [321, 300, 'Persetujuan', 'finance/approvals', 'Antrian persetujuan transaksi', 321, 'ClipboardCheck'],
        [322, 300, 'Audit Keuangan', 'finance/audit', 'Riwayat perubahan keuangan', 322, 'History'],
    ];
    $insertMenu = $db->prepare("INSERT IGNORE INTO menu (menu_id, parent_id, title, url, description, menu_order, type, is_view, is_create, is_edit, is_delete, is_export, is_duplicate, is_unlock, is_active, class_active, icon) VALUES (?, ?, ?, ?, ?, ?, 'menu', 1, 1, 1, 1, 1, 0, 0, 1, '', ?)");
    $updateMenu = $db->prepare("UPDATE menu SET parent_id = ?, title = ?, url = ?, description = ?, menu_order = ?, is_active = 1, icon = ? WHERE menu_id = ? AND url = ?");
    foreach ($menus as $m) {
        $insertMenu->bind_param('iisssis', $m[0], $m[1], $m[2], $m[3], $m[4], $m[5], $m[6]);
        $insertMenu->execute();
        $updateMenu->bind_param('isssisis', $m[1], $m[2], $m[3], $m[4], $m[5], $m[6], $m[0], $m[3]);
        $updateMenu->execute();
    }
    $insertMenu->close();
    $updateMenu->close();

    $directorViewOnly = [8, 12];
    $auditorOnly = [12];
    $hrRoles = [1, 7, 11];
    $financeWrite = [1, 7, 9, 10];
    $financeApprove = [1, 7, 8, 9];

    $rules = [];
    foreach ($menus as $m) {
        $id = (int)$m[0];
        $url = (string)$m[3];
        foreach ([1, 7, 8, 9, 10, 11, 12] as $roleId) {
            $view = 1;
            $create = 0;
            $edit = 0;
            $delete = 0;
            $export = 1;
            if (in_array($roleId, $financeWrite, true)) {
                $create = 1;
                $edit = 1;
                $delete = in_array($roleId, [1, 7, 9], true) ? 1 : 0;
            }
            if (in_array($roleId, $financeApprove, true) && in_array($id, [302, 303, 304, 321], true)) {
                $edit = 1;
            }
            if (in_array($roleId, $hrRoles, true) && in_array($id, [304], true)) {
                $create = 1;
                $edit = 1;
            }
            if (in_array($roleId, $auditorOnly, true)) {
                $view = 1;
                $create = 0;
                $edit = 0;
                $delete = 0;
                $export = 1;
            }
            if (in_array($id, [320, 322], true) && in_array($roleId, $directorViewOnly, true)) {
                $view = 1;
                $create = 0;
                $edit = 0;
                $delete = 0;
            }
            $rules[] = [$roleId, $id, $view, $create, $edit, $delete, $export];
        }
    }
    $stmt = $db->prepare("INSERT IGNORE INTO module_authority (role_id, menu_id, is_view, is_create, is_edit, is_delete, is_export, is_duplicate, is_unlock) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)");
    foreach ($rules as $r) {
        $stmt->bind_param('iiiiiii', $r[0], $r[1], $r[2], $r[3], $r[4], $r[5], $r[6]);
        $stmt->execute();
    }
    $stmt->close();
}
