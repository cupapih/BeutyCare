<?php
require_once __DIR__ . '/helpers.php';

$paymentFile = __DIR__ . '/../data/payment.json';
$payment = json_decode(file_get_contents($paymentFile), true);
$apiKey = $payment['rajaongkir_api_key'] ?? '';

$action = $_GET['action'] ?? '';

// Cache cities for 24 hours
$cacheFile = __DIR__ . '/../data/cities_cache.json';

if ($action === 'cities') {
    if (empty($apiKey)) {
        respon([]);
    }
    if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < 86400) {
        respon(json_decode(file_get_contents($cacheFile), true));
    }
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://api.rajaongkir.com/starter/city');
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['key: ' . $apiKey]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        respon([]);
    }
    $data = json_decode($response, true);
    $cities = array_map(function ($c) {
        return [
            'id' => (int)$c['city_id'],
            'label' => $c['type'] . ' ' . $c['city_name'] . ', ' . $c['province']
        ];
    }, $data['rajaongkir']['results'] ?? []);
    file_put_contents($cacheFile, json_encode($cities, JSON_UNESCAPED_UNICODE));
    respon($cities);
}

if ($action === 'cost') {
    if (empty($apiKey)) {
        respon(['error' => 'no_api_key']);
    }
    $destination = (int)($_GET['destination'] ?? 0);
    $courier = $_GET['courier'] ?? '';
    $weight = max(1, (int)($_GET['weight'] ?? 1));
    $origin = (int)($payment['origin_city_id'] ?? 79);

    if (!$destination) {
        respon(['error' => 'Pilih kota tujuan']);
    }

    $map = [
        'Gojek Instant' => null, 'Gojek Same Day' => null,
        'J&T Reguler' => 'jnt', 'J&T Express' => 'jnt',
        'SiCepat Reguler' => 'sicepat', 'SiCepat Halu' => 'sicepat',
        'JNE Reguler' => 'jne', 'JNE YES' => 'jne',
        'POS Indonesia' => 'pos'
    ];
    $rc = $map[$courier] ?? null;
    if (!$rc) {
        respon(['error' => 'not_supported']);
    }

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://api.rajaongkir.com/starter/cost');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
        'origin' => $origin,
        'destination' => $destination,
        'weight' => $weight * 1000,
        'courier' => $rc
    ]));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['key: ' . $apiKey]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        respon(['error' => 'api_error', 'http' => $httpCode]);
    }

    $data = json_decode($response, true);
    $costs = $data['rajaongkir']['results'][0]['costs'] ?? [];

    if (empty($costs)) {
        respon(['error' => 'Layanan tidak tersedia untuk tujuan ini', 'cost' => 0]);
    }

    $serviceMap = [];
    foreach ($costs as $s) {
        $sn = strtolower($s['service']);
        $costVal = $s['cost'][0]['value'] ?? 0;
        $etd = $s['cost'][0]['etd'] ?? '';

        if ($rc === 'jne') {
            if (strpos($sn, 'yes') !== false || strpos($sn, 'ytc') !== false) {
                $serviceMap[] = ['display' => 'JNE YES', 'cost' => $costVal, 'etd' => $etd];
            } else {
                $serviceMap[] = ['display' => 'JNE Reguler', 'cost' => $costVal, 'etd' => $etd];
            }
        } elseif ($rc === 'jnt') {
            if (strpos($sn, 'ez') !== false || strpos($sn, 'express') !== false) {
                $serviceMap[] = ['display' => 'J&T Express', 'cost' => $costVal, 'etd' => $etd];
            } else {
                $serviceMap[] = ['display' => 'J&T Reguler', 'cost' => $costVal, 'etd' => $etd];
            }
        } elseif ($rc === 'sicepat') {
            if (strpos($sn, 'halu') !== false) {
                $serviceMap[] = ['display' => 'SiCepat Halu', 'cost' => $costVal, 'etd' => $etd];
            } else {
                $serviceMap[] = ['display' => 'SiCepat Reguler', 'cost' => $costVal, 'etd' => $etd];
            }
        } elseif ($rc === 'pos') {
            $serviceMap[] = ['display' => 'POS Indonesia', 'cost' => $costVal, 'etd' => $etd];
        }
    }

    $matched = null;
    foreach ($serviceMap as $s) {
        if ($s['display'] === $courier) {
            $matched = $s;
            break;
        }
    }
    if (!$matched && !empty($serviceMap)) {
        $matched = $serviceMap[0];
    }

    if ($matched) {
        respon([
            'realtime' => true,
            'cost' => $matched['cost'],
            'etd' => $matched['etd'],
            'display' => $matched['display'],
            'courier_code' => $rc
        ]);
    }
    respon(['error' => 'Tidak ada ongkir tersedia', 'cost' => 0]);
}
