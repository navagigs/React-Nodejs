<?php

function marketing_id_list($value)
{
    $ids = [];
    if (is_array($value)) {
        foreach ($value as $item) {
            foreach (marketing_id_list($item) as $id) {
                $ids[] = $id;
            }
        }
        return array_values(array_unique($ids));
    }

    $parts = preg_split('/[^0-9]+/', (string)$value, -1, PREG_SPLIT_NO_EMPTY);
    if (!is_array($parts)) {
        return $ids;
    }
    foreach ($parts as $part) {
        $id = (int)$part;
        if ($id > 0) {
            $ids[] = $id;
        }
    }
    return array_values(array_unique($ids));
}

function marketing_config_values($value)
{
    if (is_array($value)) {
        $values = [];
        foreach ($value as $item) {
            if (is_scalar($item) && trim((string)$item) !== '') {
                $values[] = trim((string)$item);
            }
        }
        return array_values(array_unique($values));
    }
    $value = trim((string)$value);
    return $value === '' ? [] : [$value];
}

function marketing_resolve_recipients(array $config, string $channel): array
{
    $channel = strtolower(trim($channel));
    $where = ['c.unsubscribed = 0', 'c.opt_in = 1'];
    $params = [];
    $join = '';

    if ($channel === 'email') {
        $where[] = "c.email IS NOT NULL AND c.email <> ''";
    } elseif ($channel === 'whatsapp') {
        $where[] = "c.whatsapp IS NOT NULL AND c.whatsapp <> ''";
    } else {
        $where[] = "((c.email IS NOT NULL AND c.email <> '') OR (c.whatsapp IS NOT NULL AND c.whatsapp <> ''))";
    }

    $mode = strtolower(trim((string)(isset($config['mode']) ? $config['mode'] : 'all')));
    if ($mode === 'segment') {
        $segments = marketing_config_values(isset($config['segment']) ? $config['segment'] : (isset($config['segments']) ? $config['segments'] : []));
        if ($segments) {
            $where[] = 'c.segment IN (' . implode(',', array_fill(0, count($segments), '?')) . ')';
            foreach ($segments as $segment) {
                $params[] = $segment;
            }
        } else {
            $where[] = '1 = 0';
        }
    } elseif ($mode === 'category') {
        $categories = marketing_config_values(isset($config['category']) ? $config['category'] : (isset($config['categories']) ? $config['categories'] : []));
        if ($categories) {
            $where[] = 'c.category IN (' . implode(',', array_fill(0, count($categories), '?')) . ')';
            foreach ($categories as $category) {
                $params[] = $category;
            }
        } else {
            $where[] = '1 = 0';
        }
    } elseif ($mode === 'group') {
        $groupIds = marketing_id_list(isset($config['group_id']) ? $config['group_id'] : (isset($config['group_ids']) ? $config['group_ids'] : []));
        if (!$groupIds) {
            $groupNames = marketing_config_values(isset($config['group']) ? $config['group'] : (isset($config['groups']) ? $config['groups'] : []));
            if ($groupNames) {
                $rows = mkt_all(
                    'SELECT id FROM marketing_contact_groups WHERE name IN (' . implode(',', array_fill(0, count($groupNames), '?')) . ')',
                    $groupNames
                );
                foreach ($rows as $row) {
                    $groupIds[] = (int)$row['id'];
                }
            }
        }
        if ($groupIds) {
            $join = ' INNER JOIN marketing_contact_group_members gm ON gm.contact_id = c.id';
            $where[] = 'gm.group_id IN (' . implode(',', array_fill(0, count($groupIds), '?')) . ')';
            foreach ($groupIds as $groupId) {
                $params[] = $groupId;
            }
        } else {
            $where[] = '1 = 0';
        }
    } elseif ($mode === 'manual') {
        $contactIds = marketing_id_list(isset($config['contact_ids']) ? $config['contact_ids'] : (isset($config['contacts']) ? $config['contacts'] : []));
        if ($contactIds) {
            $where[] = 'c.id IN (' . implode(',', array_fill(0, count($contactIds), '?')) . ')';
            foreach ($contactIds as $contactId) {
                $params[] = $contactId;
            }
        } else {
            $where[] = '1 = 0';
        }
    }

    $rows = mkt_all(
        'SELECT c.* FROM marketing_contacts c' . $join . ' WHERE ' . implode(' AND ', $where) . ' ORDER BY c.id ASC',
        $params
    );

    $unique = [];
    foreach ($rows as $row) {
        $id = (int)(isset($row['id']) ? $row['id'] : 0);
        if ($id > 0 && !isset($unique[$id])) {
            $unique[$id] = $row;
        }
    }
    return array_values($unique);
}

function marketing_email_template_content($templateId)
{
    $templateId = (int)$templateId;
    if ($templateId <= 0) {
        return ['subject' => '', 'html' => ''];
    }
    $row = mkt_one('SELECT subject, html FROM marketing_email_templates WHERE id = ? AND is_active = 1 LIMIT 1', [$templateId]);
    if (!is_array($row)) {
        return ['subject' => '', 'html' => ''];
    }
    return [
        'subject' => (string)(isset($row['subject']) ? $row['subject'] : ''),
        'html' => (string)(isset($row['html']) ? $row['html'] : '')
    ];
}

function marketing_whatsapp_template_data($templateId)
{
    $templateId = (int)$templateId;
    if ($templateId <= 0) {
        return null;
    }
    return mkt_one('SELECT template_name, language, components, content FROM marketing_whatsapp_templates WHERE id = ? AND is_active = 1 LIMIT 1', [$templateId]);
}

function marketing_campaign_payload($campaign, $channel, $contact, $recipientId)
{
    $campaign = is_array($campaign) ? $campaign : [];
    $contact = is_array($contact) ? $contact : [];
    $channel = strtolower((string)$channel);
    $emailTemplate = marketing_email_template_content(isset($campaign['email_template_id']) ? $campaign['email_template_id'] : 0);
    $whatsappTemplate = marketing_whatsapp_template_data(isset($campaign['whatsapp_template_id']) ? $campaign['whatsapp_template_id'] : 0);
    $emailContent = (string)(isset($campaign['email_content']) ? $campaign['email_content'] : '');
    $emailSubject = (string)(isset($campaign['email_subject']) ? $campaign['email_subject'] : '');

    return [
        'campaign_id' => (int)(isset($campaign['id']) ? $campaign['id'] : 0),
        'campaign_name' => (string)(isset($campaign['name']) ? $campaign['name'] : ''),
        'recipient_id' => (int)$recipientId,
        'contact_id' => (int)(isset($contact['id']) ? $contact['id'] : 0),
        'channel' => $channel,
        'email_subject' => $emailSubject !== '' ? $emailSubject : $emailTemplate['subject'],
        'email_content' => $emailContent !== '' ? $emailContent : $emailTemplate['html'],
        'email_from_name' => (string)(isset($campaign['email_from_name']) ? $campaign['email_from_name'] : ''),
        'email_from_email' => (string)(isset($campaign['email_from_email']) ? $campaign['email_from_email'] : ''),
        'email_template_id' => (int)(isset($campaign['email_template_id']) ? $campaign['email_template_id'] : 0),
        'whatsapp_template_id' => (int)(isset($campaign['whatsapp_template_id']) ? $campaign['whatsapp_template_id'] : 0),
        'whatsapp_template_name' => is_array($whatsappTemplate) ? (string)$whatsappTemplate['template_name'] : '',
        'whatsapp_language' => is_array($whatsappTemplate) ? (string)$whatsappTemplate['language'] : 'id',
        'whatsapp_components' => is_array($whatsappTemplate) ? $whatsappTemplate['components'] : null,
        'whatsapp_content' => (string)(isset($campaign['whatsapp_content']) ? $campaign['whatsapp_content'] : (is_array($whatsappTemplate) ? $whatsappTemplate['content'] : '')),
        'contact' => [
            'id' => (int)(isset($contact['id']) ? $contact['id'] : 0),
            'name' => (string)(isset($contact['name']) ? $contact['name'] : ''),
            'email' => (string)(isset($contact['email']) ? $contact['email'] : ''),
            'whatsapp' => (string)(isset($contact['whatsapp']) ? $contact['whatsapp'] : ''),
            'company' => (string)(isset($contact['company']) ? $contact['company'] : ''),
            'category' => (string)(isset($contact['category']) ? $contact['category'] : ''),
            'segment' => (string)(isset($contact['segment']) ? $contact['segment'] : ''),
            'unsubscribe_token' => (string)(isset($contact['unsubscribe_token']) ? $contact['unsubscribe_token'] : '')
        ]
    ];
}

function marketing_enqueue_campaign(int $campaignId): array
{
    $counts = [
        'email' => ['recipients' => 0, 'queued' => 0],
        'whatsapp' => ['recipients' => 0, 'queued' => 0]
    ];

    $campaign = mkt_one('SELECT * FROM marketing_campaigns WHERE id = ? LIMIT 1', [$campaignId]);
    if (!is_array($campaign)) {
        return $counts;
    }

    $type = strtolower((string)(isset($campaign['type']) ? $campaign['type'] : 'email'));
    $channels = $type === 'email' ? ['email'] : ($type === 'whatsapp' ? ['whatsapp'] : ['email', 'whatsapp']);

    $config = [];
    if (!empty($campaign['recipients_config'])) {
        $decoded = json_decode((string)$campaign['recipients_config'], true);
        if (is_array($decoded)) {
            $config = $decoded;
        }
    }

    $now = marketing_now();
    $hasFuture = false;
    $totalQueued = 0;

    foreach ($channels as $channel) {
        $scheduleKey = $channel === 'email' ? 'email_schedule_at' : 'whatsapp_schedule_at';
        $availableAt = !empty($campaign[$scheduleKey]) ? (string)$campaign[$scheduleKey] : $now;
        $scheduledTime = strtotime($availableAt);
        if (!$scheduledTime) {
            $availableAt = $now;
        } elseif ($scheduledTime > time()) {
            $hasFuture = true;
        }

        foreach (marketing_resolve_recipients($config, $channel) as $contact) {
            $contactId = (int)$contact['id'];
            $insert = mkt_run(
                "INSERT IGNORE INTO marketing_campaign_recipients (campaign_id, contact_id, channel, status, attempts, created_at, updated_at)
                VALUES (?, ?, ?, 'pending', 0, ?, ?)",
                [$campaignId, $contactId, $channel, $now, $now]
            );
            if ($insert['affectedRows'] > 0) {
                $counts[$channel]['recipients']++;
            }

            $recipient = mkt_one(
                'SELECT id FROM marketing_campaign_recipients WHERE campaign_id = ? AND contact_id = ? AND channel = ? LIMIT 1',
                [$campaignId, $contactId, $channel]
            );
            if (!is_array($recipient)) {
                continue;
            }

            $payload = json_encode(marketing_campaign_payload($campaign, $channel, $contact, (int)$recipient['id']), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $queued = mkt_run(
                "INSERT IGNORE INTO marketing_queue (channel, campaign_id, recipient_id, contact_id, payload, status, attempts, max_attempts, available_at, created_at)
                VALUES (?, ?, ?, ?, ?, 'pending', 0, 3, ?, ?)",
                [$channel, $campaignId, (int)$recipient['id'], $contactId, $payload, $availableAt, $now]
            );
            if ($queued['affectedRows'] > 0) {
                $counts[$channel]['queued']++;
                $totalQueued++;
            }
        }
    }

    $status = $totalQueued > 0 ? ($hasFuture ? 'queued' : 'running') : 'running';
    mkt_run(
        "UPDATE marketing_campaigns SET status = ?, started_at = ?, completed_at = NULL, updated_at = ? WHERE id = ?",
        [$status, $totalQueued > 0 && !$hasFuture ? $now : null, $now, $campaignId]
    );

    return $counts;
}

function marketing_cancel_campaign(int $campaignId): void
{
    $now = marketing_now();
    mkt_run(
        "UPDATE marketing_queue SET status = 'failed', last_error = 'Dibatalkan', locked_at = NULL, locked_by = NULL, processed_at = ?
        WHERE campaign_id = ? AND status IN ('pending', 'processing')",
        [$now, $campaignId]
    );
    mkt_run(
        "UPDATE marketing_campaign_recipients SET status = 'skipped', last_error = 'Dibatalkan', updated_at = ?
        WHERE campaign_id = ? AND status IN ('pending', 'queued')",
        [$now, $campaignId]
    );
    mkt_run(
        "UPDATE marketing_campaigns SET status = 'cancelled', completed_at = ?, updated_at = ? WHERE id = ?",
        [$now, $now, $campaignId]
    );
}

function marketing_campaign_stats(int $campaignId): array
{
    $stats = [
        'email' => ['recipients' => 0, 'queued' => 0, 'by_status' => []],
        'whatsapp' => ['recipients' => 0, 'queued' => 0, 'by_status' => []]
    ];

    $recipientRows = mkt_all(
        'SELECT channel, status, COUNT(*) AS total FROM marketing_campaign_recipients WHERE campaign_id = ? GROUP BY channel, status',
        [$campaignId]
    );
    foreach ($recipientRows as $row) {
        $channel = strtolower((string)(isset($row['channel']) ? $row['channel'] : ''));
        if (!isset($stats[$channel])) {
            continue;
        }
        $status = (string)(isset($row['status']) ? $row['status'] : '');
        $total = (int)(isset($row['total']) ? $row['total'] : 0);
        $stats[$channel]['recipients'] += $total;
        $stats[$channel]['by_status'][$status] = $total;
    }

    $queueRows = mkt_all(
        'SELECT channel, status, COUNT(*) AS total FROM marketing_queue WHERE campaign_id = ? GROUP BY channel, status',
        [$campaignId]
    );
    foreach ($queueRows as $row) {
        $channel = strtolower((string)(isset($row['channel']) ? $row['channel'] : ''));
        if (!isset($stats[$channel])) {
            continue;
        }
        $status = (string)(isset($row['status']) ? $row['status'] : '');
        $total = (int)(isset($row['total']) ? $row['total'] : 0);
        $stats[$channel]['queued'] += $total;
        if (!isset($stats[$channel]['by_status'][$status])) {
            $stats[$channel]['by_status'][$status] = 0;
        }
        $stats[$channel]['by_status'][$status] += $total;
    }

    $stats['total_recipients'] = $stats['email']['recipients'] + $stats['whatsapp']['recipients'];
    $stats['total_queued'] = $stats['email']['queued'] + $stats['whatsapp']['queued'];
    return $stats;
}

function marketing_queue_claim(string $channel, string $workerId, int $limit = 20): array
{
    global $db;

    $channel = strtolower(trim($channel));
    if (!in_array($channel, ['email', 'whatsapp'], true)) {
        return [];
    }
    $limit = max(1, min(100, $limit));

    $db->begin_transaction();
    try {
        mkt_run(
            "UPDATE marketing_queue SET status = 'pending', locked_at = NULL, locked_by = NULL
            WHERE channel = ? AND status = 'processing' AND (locked_at IS NULL OR locked_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE))",
            [$channel]
        );

        $selected = mkt_all(
            "SELECT q.id FROM marketing_queue q
            INNER JOIN marketing_campaign_recipients r ON r.id = q.recipient_id
            INNER JOIN marketing_campaigns c ON c.id = q.campaign_id
            INNER JOIN marketing_contacts ct ON ct.id = q.contact_id
            WHERE q.channel = ? AND q.status = 'pending' AND q.available_at <= NOW()
            AND r.status IN ('pending', 'queued') AND c.status IN ('queued', 'scheduled', 'running')
            AND ct.unsubscribed = 0 AND ct.opt_in = 1
            ORDER BY q.available_at ASC, q.id ASC
            LIMIT $limit FOR UPDATE",
            [$channel]
        );

        if (!$selected) {
            $db->commit();
            return [];
        }

        $queueIds = [];
        foreach ($selected as $row) {
            $queueIds[] = (int)$row['id'];
        }
        $placeholders = implode(',', array_fill(0, count($queueIds), '?'));
        mkt_run(
            "UPDATE marketing_queue SET status = 'processing', attempts = attempts + 1, locked_at = NOW(), locked_by = ?
            WHERE id IN ($placeholders)",
            array_merge([substr($workerId, 0, 100)], $queueIds)
        );

        $rows = mkt_all(
            "SELECT q.id AS queue_id, q.channel AS queue_channel, q.payload AS queue_payload, q.attempts AS queue_attempts,
                q.max_attempts AS queue_max_attempts, q.available_at AS queue_available_at,
                r.id AS recipient_id, r.status AS recipient_status,
                c.id AS campaign_id, c.name AS campaign_name, c.type AS campaign_type, c.status AS campaign_status,
                c.email_subject, c.email_content, c.email_from_name, c.email_from_email, c.email_template_id,
                c.whatsapp_template_id, c.whatsapp_content,
                ct.id AS contact_id, ct.name AS contact_name, ct.email AS contact_email, ct.whatsapp AS contact_whatsapp,
                ct.company AS contact_company, ct.category AS contact_category, ct.segment AS contact_segment,
                ct.unsubscribe_token AS contact_unsubscribe_token
            FROM marketing_queue q
            INNER JOIN marketing_campaign_recipients r ON r.id = q.recipient_id
            INNER JOIN marketing_campaigns c ON c.id = q.campaign_id
            INNER JOIN marketing_contacts ct ON ct.id = q.contact_id
            WHERE q.id IN ($placeholders)
            ORDER BY q.available_at ASC, q.id ASC",
            $queueIds
        );

        $db->commit();
        return $rows;
    } catch (Throwable $e) {
        $db->rollback();
        throw $e;
    }
}

function marketing_queue_done(int $queueId, bool $ok, string $error = '', string $externalId = '', string $status = '')
{
    $job = mkt_one(
        "SELECT q.id AS queue_id, q.channel, q.campaign_id, q.contact_id, q.attempts, q.max_attempts,
            r.id AS recipient_id
        FROM marketing_queue q
        LEFT JOIN marketing_campaign_recipients r ON r.id = q.recipient_id
        WHERE q.id = ? LIMIT 1",
        [$queueId]
    );
    if (!is_array($job)) {
        return false;
    }

    $now = marketing_now();
    $channel = strtolower((string)(isset($job['channel']) ? $job['channel'] : 'email'));
    $allowed = ['pending', 'queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'read', 'invalid', 'skipped'];
    $status = strtolower(trim($status));
    if (!in_array($status, $allowed, true)) {
        $status = $ok ? 'sent' : 'failed';
    }
    $error = substr($error, 0, 1000);
    $externalId = substr($externalId, 0, 191);

    $campaignId = (int)(isset($job['campaign_id']) ? $job['campaign_id'] : 0);
    $contactId = (int)(isset($job['contact_id']) ? $job['contact_id'] : 0);
    $recipientId = (int)(isset($job['recipient_id']) ? $job['recipient_id'] : 0);
    $attempts = (int)(isset($job['attempts']) ? $job['attempts'] : 0);
    $maxAttempts = max(1, (int)(isset($job['max_attempts']) ? $job['max_attempts'] : 3));

    if ($ok) {
        mkt_run(
            "UPDATE marketing_queue SET status = 'done', last_error = NULL, locked_at = NULL, locked_by = NULL, processed_at = ? WHERE id = ?",
            [$now, $queueId]
        );
        if ($recipientId > 0) {
            mkt_run(
                "UPDATE marketing_campaign_recipients SET status = ?, external_id = ?, last_error = NULL, sent_at = COALESCE(sent_at, ?), updated_at = ? WHERE id = ?",
                [$status, $externalId !== '' ? $externalId : null, $now, $now, $recipientId]
            );
        }
        $event = $status;
    } else {
        $retry = $attempts < $maxAttempts;
        $delay = max(1, (int)pow(2, max(1, $attempts)));
        if ($retry) {
            mkt_run(
                "UPDATE marketing_queue SET status = 'pending', last_error = ?, locked_at = NULL, locked_by = NULL,
                available_at = DATE_ADD(NOW(), INTERVAL $delay SECOND) WHERE id = ?",
                [$error, $queueId]
            );
        } else {
            mkt_run(
                "UPDATE marketing_queue SET status = 'failed', last_error = ?, locked_at = NULL, locked_by = NULL, processed_at = ? WHERE id = ?",
                [$error, $now, $queueId]
            );
        }
        if ($recipientId > 0) {
            mkt_run(
                "UPDATE marketing_campaign_recipients SET status = ?, last_error = ?, updated_at = ? WHERE id = ?",
                [$retry ? 'queued' : 'failed', $error, $now, $recipientId]
            );
        }
        $event = 'failed';
    }

    $detail = json_encode([
        'queue_id' => $queueId,
        'attempts' => $attempts,
        'max_attempts' => $maxAttempts,
        'error' => $error,
        'recipient_status' => $status
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $table = $channel === 'whatsapp' ? 'marketing_whatsapp_logs' : 'marketing_email_logs';
    mkt_run(
        "INSERT INTO $table (campaign_id, recipient_id, contact_id, event, message_id, detail, occurred_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [$campaignId > 0 ? $campaignId : null, $recipientId > 0 ? $recipientId : null, $contactId > 0 ? $contactId : null, $event, $externalId !== '' ? $externalId : null, $detail, $now]
    );

    if ($campaignId > 0) {
        $pending = mkt_one(
            "SELECT COUNT(*) AS total FROM marketing_queue WHERE campaign_id = ? AND status IN ('pending', 'processing')",
            [$campaignId]
        );
        if (is_array($pending) && (int)$pending['total'] === 0) {
            mkt_run(
                "UPDATE marketing_campaigns SET status = 'completed', completed_at = ?, updated_at = ? WHERE id = ? AND status <> 'cancelled'",
                [$now, $now, $campaignId]
            );
        }
    }

    return true;
}

function marketing_release_stale_locks()
{
    $result = mkt_run(
        "UPDATE marketing_queue SET status = 'pending', locked_at = NULL, locked_by = NULL, last_error = 'Lock stale dilepas'
        WHERE status = 'processing' AND (locked_at IS NULL OR locked_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE))"
    );
    return $result['affectedRows'];
}

function marketing_process_due_schedules()
{
    $result = mkt_run(
        "UPDATE marketing_campaigns c SET c.status = 'running', c.started_at = COALESCE(c.started_at, NOW()), c.updated_at = NOW()
        WHERE c.status IN ('queued', 'scheduled')
        AND EXISTS (SELECT 1 FROM marketing_queue q WHERE q.campaign_id = c.id AND q.status = 'pending' AND q.available_at <= NOW())"
    );
    mkt_run(
        "UPDATE marketing_campaign_recipients r INNER JOIN marketing_queue q ON q.recipient_id = r.id
        SET r.status = 'pending', r.updated_at = NOW()
        WHERE q.status = 'pending' AND q.available_at <= NOW() AND r.status = 'queued'"
    );
    return $result['affectedRows'];
}
