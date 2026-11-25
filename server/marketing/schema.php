<?php

function marketing_schema_install(mysqli $db): void
{
    $db->query("CREATE TABLE IF NOT EXISTS marketing_contacts (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        name VARCHAR(190) NOT NULL,
        email VARCHAR(190) DEFAULT NULL,
        whatsapp VARCHAR(30) DEFAULT NULL,
        company VARCHAR(190) DEFAULT NULL,
        segment VARCHAR(100) NOT NULL DEFAULT 'Prospek',
        category VARCHAR(100) DEFAULT NULL,
        source VARCHAR(100) DEFAULT NULL,
        opt_in TINYINT(1) NOT NULL DEFAULT 0,
        consent_at DATETIME DEFAULT NULL,
        unsubscribed TINYINT(1) NOT NULL DEFAULT 0,
        unsubscribed_at DATETIME DEFAULT NULL,
        unsubscribe_token VARCHAR(64) DEFAULT NULL,
        notes TEXT NULL,
        extra LONGTEXT NULL,
        created_by INT DEFAULT NULL,
        updated_by INT DEFAULT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME DEFAULT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_marketing_contacts_email (email),
        UNIQUE KEY uq_marketing_contacts_whatsapp (whatsapp),
        UNIQUE KEY uq_marketing_contacts_unsubscribe_token (unsubscribe_token),
        KEY idx_marketing_contacts_segment (segment),
        KEY idx_marketing_contacts_category (category),
        KEY idx_marketing_contacts_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS marketing_contact_groups (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        name VARCHAR(190) NOT NULL,
        description TEXT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'custom',
        filter_rules LONGTEXT NULL,
        created_by INT DEFAULT NULL,
        updated_by INT DEFAULT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME DEFAULT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_marketing_contact_groups_name (name),
        KEY idx_marketing_contact_groups_type (type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS marketing_contact_group_members (
        group_id INT UNSIGNED NOT NULL,
        contact_id INT UNSIGNED NOT NULL,
        PRIMARY KEY (group_id, contact_id),
        KEY idx_marketing_group_members_contact (contact_id),
        CONSTRAINT fk_marketing_group_members_group FOREIGN KEY (group_id) REFERENCES marketing_contact_groups (id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_marketing_group_members_contact FOREIGN KEY (contact_id) REFERENCES marketing_contacts (id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS marketing_consent_logs (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        contact_id INT UNSIGNED NOT NULL,
        action VARCHAR(50) NOT NULL,
        source VARCHAR(100) DEFAULT NULL,
        ip VARCHAR(45) DEFAULT NULL,
        user_id INT DEFAULT NULL,
        note VARCHAR(255) DEFAULT NULL,
        created_at DATETIME NOT NULL,
        PRIMARY KEY (id),
        KEY idx_marketing_consent_logs_contact (contact_id),
        KEY idx_marketing_consent_logs_created_at (created_at),
        CONSTRAINT fk_marketing_consent_logs_contact FOREIGN KEY (contact_id) REFERENCES marketing_contacts (id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS marketing_campaigns (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        name VARCHAR(190) NOT NULL,
        type ENUM('email','whatsapp','both') NOT NULL DEFAULT 'email',
        status ENUM('draft','scheduled','queued','running','completed','cancelled','paused') NOT NULL DEFAULT 'draft',
        recipients_config LONGTEXT NULL,
        email_subject VARCHAR(190) DEFAULT NULL,
        email_from_name VARCHAR(190) DEFAULT NULL,
        email_from_email VARCHAR(190) DEFAULT NULL,
        email_template_id INT UNSIGNED DEFAULT NULL,
        email_content LONGTEXT NULL,
        email_schedule_at DATETIME DEFAULT NULL,
        whatsapp_template_id INT UNSIGNED DEFAULT NULL,
        whatsapp_content TEXT NULL,
        whatsapp_schedule_at DATETIME DEFAULT NULL,
        created_by INT DEFAULT NULL,
        updated_by INT DEFAULT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME DEFAULT NULL,
        started_at DATETIME DEFAULT NULL,
        completed_at DATETIME DEFAULT NULL,
        PRIMARY KEY (id),
        KEY idx_marketing_campaigns_status (status),
        KEY idx_marketing_campaigns_type (type),
        KEY idx_marketing_campaigns_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS marketing_campaign_recipients (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        campaign_id INT UNSIGNED NOT NULL,
        contact_id INT UNSIGNED NOT NULL,
        channel ENUM('email','whatsapp') NOT NULL,
        status ENUM('pending','queued','sent','delivered','opened','clicked','bounced','failed','read','invalid','skipped') NOT NULL DEFAULT 'pending',
        attempts INT NOT NULL DEFAULT 0,
        last_error TEXT NULL,
        external_id VARCHAR(191) DEFAULT NULL,
        sent_at DATETIME DEFAULT NULL,
        delivered_at DATETIME DEFAULT NULL,
        opened_at DATETIME DEFAULT NULL,
        clicked_at DATETIME DEFAULT NULL,
        read_at DATETIME DEFAULT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME DEFAULT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_marketing_campaign_recipients_target (campaign_id, contact_id, channel),
        KEY idx_marketing_campaign_recipients_status (campaign_id, status),
        KEY idx_marketing_campaign_recipients_contact (contact_id),
        KEY idx_marketing_campaign_recipients_external (external_id),
        CONSTRAINT fk_marketing_campaign_recipients_campaign FOREIGN KEY (campaign_id) REFERENCES marketing_campaigns (id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_marketing_campaign_recipients_contact FOREIGN KEY (contact_id) REFERENCES marketing_contacts (id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS marketing_email_templates (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        name VARCHAR(190) NOT NULL,
        subject VARCHAR(190) DEFAULT NULL,
        html LONGTEXT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_by INT DEFAULT NULL,
        updated_by INT DEFAULT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME DEFAULT NULL,
        PRIMARY KEY (id),
        KEY idx_marketing_email_templates_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS marketing_whatsapp_templates (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        name VARCHAR(190) NOT NULL,
        template_name VARCHAR(190) NOT NULL,
        language VARCHAR(20) NOT NULL DEFAULT 'id',
        category VARCHAR(100) DEFAULT NULL,
        components LONGTEXT NULL,
        content TEXT NULL,
        approved TINYINT(1) NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_by INT DEFAULT NULL,
        updated_by INT DEFAULT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME DEFAULT NULL,
        PRIMARY KEY (id),
        KEY idx_marketing_whatsapp_templates_name (template_name),
        KEY idx_marketing_whatsapp_templates_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS marketing_email_logs (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        campaign_id INT UNSIGNED DEFAULT NULL,
        recipient_id BIGINT UNSIGNED DEFAULT NULL,
        contact_id INT UNSIGNED DEFAULT NULL,
        event VARCHAR(50) NOT NULL,
        message_id VARCHAR(191) DEFAULT NULL,
        detail LONGTEXT NULL,
        occurred_at DATETIME NOT NULL,
        PRIMARY KEY (id),
        KEY idx_marketing_email_logs_campaign (campaign_id),
        KEY idx_marketing_email_logs_recipient (recipient_id),
        KEY idx_marketing_email_logs_contact (contact_id),
        KEY idx_marketing_email_logs_event (event),
        KEY idx_marketing_email_logs_occurred_at (occurred_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS marketing_whatsapp_logs (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        campaign_id INT UNSIGNED DEFAULT NULL,
        recipient_id BIGINT UNSIGNED DEFAULT NULL,
        contact_id INT UNSIGNED DEFAULT NULL,
        event VARCHAR(50) NOT NULL,
        message_id VARCHAR(191) DEFAULT NULL,
        detail LONGTEXT NULL,
        occurred_at DATETIME NOT NULL,
        PRIMARY KEY (id),
        KEY idx_marketing_whatsapp_logs_campaign (campaign_id),
        KEY idx_marketing_whatsapp_logs_recipient (recipient_id),
        KEY idx_marketing_whatsapp_logs_contact (contact_id),
        KEY idx_marketing_whatsapp_logs_event (event),
        KEY idx_marketing_whatsapp_logs_occurred_at (occurred_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS marketing_queue (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        channel ENUM('email','whatsapp') NOT NULL,
        campaign_id INT UNSIGNED DEFAULT NULL,
        recipient_id BIGINT UNSIGNED DEFAULT NULL,
        contact_id INT UNSIGNED DEFAULT NULL,
        payload LONGTEXT NULL,
        status ENUM('pending','processing','done','failed') NOT NULL DEFAULT 'pending',
        attempts INT NOT NULL DEFAULT 0,
        max_attempts INT NOT NULL DEFAULT 3,
        available_at DATETIME NOT NULL,
        locked_at DATETIME DEFAULT NULL,
        locked_by VARCHAR(100) DEFAULT NULL,
        last_error TEXT NULL,
        created_at DATETIME NOT NULL,
        processed_at DATETIME DEFAULT NULL,
        PRIMARY KEY (id),
        KEY idx_marketing_queue_channel_status (channel, status),
        KEY idx_marketing_queue_available (status, available_at),
        KEY idx_marketing_queue_campaign (campaign_id),
        KEY idx_marketing_queue_recipient (recipient_id),
        KEY idx_marketing_queue_lock (status, locked_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS marketing_settings (
        setting_key VARCHAR(100) NOT NULL,
        setting_value LONGTEXT NULL,
        is_encrypted TINYINT(1) NOT NULL DEFAULT 0,
        updated_by INT DEFAULT NULL,
        updated_at DATETIME DEFAULT NULL,
        PRIMARY KEY (setting_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $insertDefaultSetting = $db->prepare("INSERT IGNORE INTO marketing_settings (setting_key, setting_value, is_encrypted, updated_by, updated_at) VALUES (?, ?, 0, NULL, NOW())");
    foreach (marketing_setting_defaults() as $defaultKey => $defaultValue) {
        $defaultValue = (string)$defaultValue;
        if ($defaultValue === '' || strpos($defaultKey, 'smtp_status') === 0) {
            continue;
        }
        $insertDefaultSetting->bind_param('ss', $defaultKey, $defaultValue);
        $insertDefaultSetting->execute();
    }
    $insertDefaultSetting->close();

    $db->query("CREATE TABLE IF NOT EXISTS marketing_unsubscribes (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        contact_id INT UNSIGNED DEFAULT NULL,
        email VARCHAR(190) NOT NULL,
        channel VARCHAR(30) NOT NULL DEFAULT 'all',
        source VARCHAR(100) DEFAULT NULL,
        reason VARCHAR(255) DEFAULT NULL,
        created_at DATETIME NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_marketing_unsubscribes_email_channel (email, channel),
        KEY idx_marketing_unsubscribes_contact (contact_id),
        CONSTRAINT fk_marketing_unsubscribes_contact FOREIGN KEY (contact_id) REFERENCES marketing_contacts (id) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS marketing_activity_logs (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id INT DEFAULT NULL,
        user_name VARCHAR(150) NOT NULL DEFAULT 'Unknown',
        role_id INT DEFAULT NULL,
        action VARCHAR(50) NOT NULL,
        module VARCHAR(100) NOT NULL,
        description TEXT NULL,
        created_at DATETIME NOT NULL,
        PRIMARY KEY (id),
        KEY idx_marketing_activity_logs_user (user_id),
        KEY idx_marketing_activity_logs_module (module),
        KEY idx_marketing_activity_logs_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS marketing_rate_limits (
        rate_key VARCHAR(191) NOT NULL,
        hits INT NOT NULL DEFAULT 0,
        window_start DATETIME DEFAULT NULL,
        created_at DATETIME NOT NULL,
        PRIMARY KEY (rate_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $menus = [
        [200, 1, 'Marketing Center', 'marketing-center', 'Modul marketing, campaign, dan analytics', 190, '', 'Megaphone'],
        [201, 200, 'Dashboard Marketing', 'marketing-center/dashboard', 'Ringkasan performa marketing', 191, '', 'LayoutDashboard'],
        [202, 200, 'Kontak & Database', 'marketing-center/contacts', 'Kelola kontak dan database prospek', 192, '', 'Users'],
        [203, 200, 'Grup & Segmentasi', 'marketing-center/groups', 'Kelola grup dan segmentasi kontak', 193, '', 'UsersRound'],
        [204, 200, 'Email Marketing', 'marketing-center/email', 'Kelola kampanye email marketing', 194, '', 'Mail'],
        [205, 200, 'WhatsApp Marketing', 'marketing-center/whatsapp', 'Kelola kampanye WhatsApp marketing', 195, '', 'MessageCircle'],
        [206, 200, 'Campaign Management', 'marketing-center/campaigns', 'Kelola seluruh kampanye marketing', 196, '', 'Megaphone'],
        [207, 200, 'Template Pesan', 'marketing-center/templates', 'Kelola template email dan WhatsApp', 197, '', 'FileText'],
        [208, 200, 'Analytics & Reports', 'marketing-center/analytics', 'Laporan dan analisis performa', 198, '', 'BarChart3'],
        [209, 200, 'Integrasi & Pengaturan', 'marketing-center/settings', 'Pengaturan integrasi layanan marketing', 199, '', 'Settings']
    ];

    $insertMenu = $db->prepare("INSERT IGNORE INTO menu (menu_id, parent_id, title, url, description, menu_order, type, is_view, is_create, is_edit, is_delete, is_export, is_duplicate, is_unlock, is_active, class_active, icon)
        VALUES (?, ?, ?, ?, ?, ?, 'menu', 1, 1, 1, 1, 1, 1, 1, 1, ?, ?)");
    $updateMenu = $db->prepare("UPDATE menu SET parent_id = ?, title = ?, url = ?, description = ?, menu_order = ?, type = 'menu', is_view = 1, is_create = 1, is_edit = 1, is_delete = 1, is_export = 1, is_duplicate = 1, is_unlock = 1, is_active = 1, class_active = ?, icon = ? WHERE menu_id = ?");

    foreach ($menus as $menu) {
        $menuId = (int)$menu[0];
        $parentId = (int)$menu[1];
        $title = (string)$menu[2];
        $url = (string)$menu[3];
        $description = (string)$menu[4];
        $menuOrder = (int)$menu[5];
        $classActive = (string)$menu[6];
        $icon = (string)$menu[7];

        $insertMenu->bind_param('iisssiss', $menuId, $parentId, $title, $url, $description, $menuOrder, $classActive, $icon);
        $insertMenu->execute();

        $updateMenu->bind_param('isssissi', $parentId, $title, $url, $description, $menuOrder, $classActive, $icon, $menuId);
        $updateMenu->execute();
    }

    $insertMenu->close();
    $updateMenu->close();

    $db->query("INSERT IGNORE INTO module_authority (role_id, menu_id, is_view, is_create, is_edit, is_delete, is_export, is_duplicate, is_unlock)
        SELECT r.role_id, m.menu_id,
            CASE WHEN r.role_id IN (1, 7) THEN 1 ELSE 0 END,
            CASE WHEN r.role_id IN (1, 7) THEN 1 ELSE 0 END,
            CASE WHEN r.role_id IN (1, 7) THEN 1 ELSE 0 END,
            CASE WHEN r.role_id IN (1, 7) THEN 1 ELSE 0 END,
            CASE WHEN r.role_id IN (1, 7) THEN 1 ELSE 0 END,
            CASE WHEN r.role_id IN (1, 7) THEN 1 ELSE 0 END,
            CASE WHEN r.role_id IN (1, 7) THEN 1 ELSE 0 END
        FROM roles r
        INNER JOIN menu m ON m.menu_id BETWEEN 200 AND 209");

    $autoResult = $db->query("SELECT AUTO_INCREMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'menu' LIMIT 1");
    $autoIncrement = 0;
    if ($autoResult) {
        $autoRow = $autoResult->fetch_assoc();
        if (is_array($autoRow) && isset($autoRow['AUTO_INCREMENT'])) {
            $autoIncrement = (int)$autoRow['AUTO_INCREMENT'];
        }
    }
    if ($autoIncrement < 210) {
        $db->query("ALTER TABLE menu AUTO_INCREMENT = 210");
    }
}
