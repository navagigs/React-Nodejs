<?php

require __DIR__ . '/cli_bootstrap.php';

function marketing_worker_send(string $channel, array $job): array
{
    $function = $channel === 'email' ? 'marketing_send_email' : 'marketing_send_whatsapp';
    if (!function_exists($function)) {
        return ['ok' => false, 'error' => 'Fungsi pengirim tidak tersedia'];
    }

    $payload = [];
    if (isset($job['queue_payload'])) {
        $decoded = json_decode((string)$job['queue_payload'], true);
        if (is_array($decoded)) {
            $payload = $decoded;
        }
    }

    try {
        $reflection = new ReflectionFunction($function);
        $parameterCount = $reflection->getNumberOfParameters();
    } catch (Throwable $e) {
        $parameterCount = 3;
    }

    if ($parameterCount >= 3) {
        $campaign = [
            'id' => isset($job['campaign_id']) ? (int)$job['campaign_id'] : 0,
            'name' => isset($job['campaign_name']) ? (string)$job['campaign_name'] : '',
            'type' => isset($job['campaign_type']) ? (string)$job['campaign_type'] : $channel,
            'email_subject' => isset($payload['email_subject']) && $payload['email_subject'] !== '' ? (string)$payload['email_subject'] : (isset($job['email_subject']) ? (string)$job['email_subject'] : ''),
            'email_content' => isset($payload['email_content']) && $payload['email_content'] !== '' ? (string)$payload['email_content'] : (isset($job['email_content']) ? (string)$job['email_content'] : ''),
            'email_template_id' => isset($job['email_template_id']) ? (int)$job['email_template_id'] : 0,
            'whatsapp_template_id' => isset($job['whatsapp_template_id']) ? (int)$job['whatsapp_template_id'] : 0,
            'whatsapp_content' => isset($payload['whatsapp_content']) && $payload['whatsapp_content'] !== '' ? (string)$payload['whatsapp_content'] : (isset($job['whatsapp_content']) ? (string)$job['whatsapp_content'] : '')
        ];

        $contact = isset($payload['contact']) && is_array($payload['contact']) ? $payload['contact'] : [];
        $contact = array_merge([
            'id' => isset($job['contact_id']) ? (int)$job['contact_id'] : 0,
            'name' => isset($job['contact_name']) ? (string)$job['contact_name'] : '',
            'email' => isset($job['contact_email']) ? (string)$job['contact_email'] : '',
            'whatsapp' => isset($job['contact_whatsapp']) ? (string)$job['contact_whatsapp'] : '',
            'company' => isset($job['contact_company']) ? (string)$job['contact_company'] : '',
            'category' => isset($job['contact_category']) ? (string)$job['contact_category'] : '',
            'segment' => isset($job['contact_segment']) ? (string)$job['contact_segment'] : '',
            'unsubscribe_token' => isset($job['contact_unsubscribe_token']) ? (string)$job['contact_unsubscribe_token'] : ''
        ], $contact);

        $recipient = [
            'id' => isset($job['recipient_id']) ? (int)$job['recipient_id'] : 0,
            'queue_id' => isset($job['queue_id']) ? (int)$job['queue_id'] : 0,
            'contact_id' => isset($job['contact_id']) ? (int)$job['contact_id'] : 0,
            'channel' => $channel,
            'payload' => $payload
        ];

        $result = $function($campaign, $contact, $recipient);
    } else {
        $result = $function($job);
    }

    if (!is_array($result)) {
        return ['ok' => false, 'error' => 'Hasil pengiriman tidak valid'];
    }
    if (!isset($result['external_id']) && isset($result['message_id'])) {
        $result['external_id'] = (string)$result['message_id'];
    }
    return $result;
}

function marketing_worker_cycle(array $channels, int $limit, string $workerId): void
{
    $scheduled = marketing_process_due_schedules();
    $released = marketing_release_stale_locks();
    echo 'Jadwal diproses: ' . $scheduled . ', lock dilepas: ' . $released . PHP_EOL;

    foreach ($channels as $channel) {
        $jobs = marketing_queue_claim($channel, $workerId, $limit);
        echo 'Antrian ' . $channel . ': ' . count($jobs) . ' item' . PHP_EOL;

        foreach ($jobs as $job) {
            $payload = [];
            if (isset($job['queue_payload'])) {
                $decoded = json_decode((string)$job['queue_payload'], true);
                if (is_array($decoded)) {
                    $payload = $decoded;
                }
            }

            $result = marketing_worker_send($channel, $job);

            $ok = !empty($result['ok']);
            $error = isset($result['error']) ? (string)$result['error'] : '';
            $externalId = isset($result['external_id']) ? (string)$result['external_id'] : '';
            $status = isset($result['status']) ? (string)$result['status'] : '';
            marketing_queue_done((int)$job['queue_id'], $ok, $error, $externalId, $status);

            $contactId = (int)(isset($payload['contact_id']) ? $payload['contact_id'] : (isset($job['contact_id']) ? $job['contact_id'] : 0));
            echo ($ok ? 'Terkirim' : 'Gagal') . ' ' . $channel . ' untuk kontak #' . $contactId . ($error !== '' ? ': ' . $error : '') . PHP_EOL;
        }
    }
}

$options = [
    'once' => false,
    'daemon' => false,
    'limit' => 20,
    'channel' => '',
    'sleep' => 5
];

foreach (array_slice($argv, 1) as $arg) {
    if ($arg === '--once') {
        $options['once'] = true;
    } elseif ($arg === '--daemon') {
        $options['daemon'] = true;
    } elseif (preg_match('/^--limit=(\d+)$/', $arg, $match)) {
        $options['limit'] = max(1, min(100, (int)$match[1]));
    } elseif (preg_match('/^--channel=(email|whatsapp)$/', $arg, $match)) {
        $options['channel'] = $match[1];
    } elseif (preg_match('/^--sleep=(\d+)$/', $arg, $match)) {
        $options['sleep'] = max(1, (int)$match[1]);
    } else {
        fwrite(STDERR, 'Argumen tidak dikenali: ' . $arg . PHP_EOL);
        exit(1);
    }
}

$channels = $options['channel'] !== '' ? [$options['channel']] : ['email', 'whatsapp'];
$workerId = 'worker-' . substr(md5((string)gethostname() . '-' . getmypid()), 0, 12);

if ($options['daemon']) {
    echo 'Worker marketing berjalan' . PHP_EOL;
    while (true) {
        marketing_worker_cycle($channels, $options['limit'], $workerId);
        sleep($options['sleep']);
    }
}

marketing_worker_cycle($channels, $options['limit'], $workerId);
echo 'Siklus worker marketing selesai' . PHP_EOL;
