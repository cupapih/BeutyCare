<?php
require_once __DIR__ . '/helpers.php';

$paymentFile = __DIR__ . '/../data/payment.json';
$payment = json_decode(file_get_contents($paymentFile), true);
$biteshipKey = $payment['biteship_api_key'] ?? '';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($action === 'lookup' && $method === 'GET') {
    $resi = $_GET['resi'] ?? '';
    if (empty($resi)) {
        respon(['error' => 'Nomor resi wajib diisi'], 400);
    }

    if (empty($biteshipKey)) {
        respon(['error' => 'API key Biteship belum diatur', 'note' => 'Atur di Admin > Pembayaran']);
    }

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://api.biteship.com/v1/trackings/' . urlencode($resi));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: ' . $biteshipKey,
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        respon(['error' => 'Gagal terhubung ke Biteship: ' . $error], 500);
    }

    $data = json_decode($response, true);

    if ($httpCode !== 200 || ($data['status'] ?? '') !== 'success') {
        $msg = $data['message'] ?? $data['error'] ?? 'Resi tidak ditemukan';
        respon(['error' => $msg, 'http' => $httpCode], 200);
    }

    $dest = $data['destination'] ?? [];
    $origin = $data['origin'] ?? [];
    $history = $data['history'] ?? [];
    $latest = !empty($history) ? $history[count($history) - 1] : null;

    $result = [
        'resi' => $resi,
        'courier' => $data['courier']['company'] ?? 'J&T',
        'status' => $data['status'] ?? '',
        'receiver_name' => $dest['contact_name'] ?? '',
        'receiver_phone' => $dest['contact_phone'] ?? '',
        'receiver_address' => $dest['address'] ?? '',
        'receiver_city' => $dest['city'] ?? '',
        'sender_name' => $origin['contact_name'] ?? '',
        'latest_status' => $latest ? ($latest['note'] ?? '') : '',
        'latest_date' => $latest ? ($latest['updated_at'] ?? '') : '',
    ];

    // Find matching orders
    $ordersFile = __DIR__ . '/../data/orders.json';
    $orders = file_exists($ordersFile) ? (json_decode(file_get_contents($ordersFile), true) ?: []) : [];
    $matchedOrders = [];

    $recvName = strtolower(trim($result['receiver_name']));
    $recvCity = strtolower(trim($result['receiver_city']));
    $recvPhone = preg_replace('/[^0-9]/', '', $result['receiver_phone']);

    foreach ($orders as $o) {
        if (in_array($o['status'] ?? '', ['Menunggu', 'Diproses'])) {
            $orderName = strtolower(trim($o['nama'] ?? ''));
            $orderCity = strtolower(trim($o['kota_tujuan'] ?? ''));
            $orderPhone = preg_replace('/[^0-9]/', '', $o['no_hp'] ?? '');

            $score = 0;
            // Name match
            if ($recvName && $orderName) {
                if ($recvName === $orderName) $score += 3;
                elseif (strpos($recvName, $orderName) !== false || strpos($orderName, $recvName) !== false) $score += 2;
                elseif (similar_text($recvName, $orderName) > 60) $score += 1;
            }
            // City match
            if ($recvCity && $orderCity) {
                if ($recvCity === $orderCity) $score += 2;
                elseif (strpos($recvCity, $orderCity) !== false || strpos($orderCity, $recvCity) !== false) $score += 1;
            }
            // Phone match
            if ($recvPhone && $orderPhone && $recvPhone === $orderPhone) $score += 3;

            if ($score > 0) {
                $matchedOrders[] = [
                    'order' => $o,
                    'match_score' => $score
                ];
            }
        }
    }

    // Sort by match score desc
    usort($matchedOrders, fn($a, $b) => $b['match_score'] - $a['match_score']);

    $result['matched_orders'] = array_slice($matchedOrders, 0, 5);
    $result['match_count'] = count($matchedOrders);

    respon($result);
}
