<?php
require_once __DIR__ . '/helpers.php';

$method = $_SERVER['REQUEST_METHOD'];
$file = __DIR__ . '/../data/payment.json';

if ($method === 'GET') {
    if (!file_exists($file)) {
        respon(['banks' => [], 'qris' => ['aktif' => false, 'gambar' => '', 'atas_nama' => ''], 'wa_konfirmasi' => '', 'ongkir' => []]);
    }
    $data = json_decode(file_get_contents($file), true);
    respon($data);
}

if ($method === 'PUT') {
    $data = bodyJson();
    $current = file_exists($file) ? json_decode(file_get_contents($file), true) : [];
    $merged = array_merge($current, $data);
    file_put_contents($file, json_encode($merged, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    respon(['message' => 'Pengaturan pembayaran disimpan', 'data' => $merged]);
}
