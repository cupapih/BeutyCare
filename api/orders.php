<?php
require_once __DIR__ . '/helpers.php';

$method = $_SERVER['REQUEST_METHOD'];
$orders = bacaJson('orders.json');

if ($method === 'GET') {
    $id = $_GET['id'] ?? null;
    $userId = $_GET['user_id'] ?? null;
    if ($id) {
        $order = current(array_filter($orders, fn($o) => $o['id'] == $id));
        $order ? respon($order) : respon(['error' => 'Pesanan tidak ditemukan'], 404);
    }
    if ($userId) {
        $userOrders = array_values(array_filter($orders, fn($o) => ($o['user_id'] ?? 0) == $userId));
        respon(array_reverse($userOrders));
    }
    $orders = array_reverse($orders);
    respon($orders);
}

if ($method === 'POST') {
    $data = bodyJson();
    if (empty($data['nama']) || empty($data['produk']) || empty($data['no_hp'])) {
        respon(['error' => 'Nama, produk, dan nomor HP wajib diisi'], 400);
    }
    $ids = array_column($orders, 'id');
    $maxId = !empty($ids) ? max($ids) : 0;
    $order = [
        'id' => $maxId + 1,
        'user_id' => $data['user_id'] ?? 0,
        'produk' => $data['produk'],
        'produk_id' => $data['produk_id'] ?? 0,
        'harga' => $data['harga'] ?? 0,
        'jumlah' => $data['jumlah'] ?? 1,
        'ongkir' => $data['ongkir'] ?? 0,
        'total' => $data['total'] ?? (($data['harga'] ?? 0) * ($data['jumlah'] ?? 1)),
        'nama' => $data['nama'],
        'no_hp' => $data['no_hp'],
        'alamat' => $data['alamat'] ?? '',
        'kota_tujuan' => $data['kota_tujuan'] ?? '',
        'kota_id' => $data['kota_id'] ?? '',
        'metode_pembayaran' => $data['metode_pembayaran'] ?? '',
        'kurir' => $data['kurir'] ?? '',
        'catatan' => $data['catatan'] ?? '',
        'resi' => '',
        'status' => 'Menunggu',
        'tanggal' => date('Y-m-d H:i:s')
    ];
    $orders[] = $order;
    tulisJson('orders.json', $orders);
    respon($order, 201);
}

if ($method === 'PUT') {
    $data = bodyJson();
    $id = $data['id'] ?? null;
    if (!$id) respon(['error' => 'ID diperlukan'], 400);
    
    $found = false;
    foreach ($orders as &$o) {
        if ($o['id'] == $id) {
            if (isset($data['status'])) $o['status'] = $data['status'];
            if (isset($data['resi'])) $o['resi'] = $data['resi'];
            $o['nama'] = $data['nama'] ?? $o['nama'];
            $o['no_hp'] = $data['no_hp'] ?? $o['no_hp'];
            $o['alamat'] = $data['alamat'] ?? $o['alamat'];
            $o['catatan'] = $data['catatan'] ?? $o['catatan'];
            $found = true;
            break;
        }
    }
    if (!$found) respon(['error' => 'Pesanan tidak ditemukan'], 404);
    tulisJson('orders.json', $orders);
    respon(['message' => 'Pesanan berhasil diperbarui']);
}

if ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) respon(['error' => 'ID diperlukan'], 400);
    
    $filtered = array_filter($orders, fn($o) => $o['id'] != $id);
    if (count($filtered) === count($orders)) {
        respon(['error' => 'Pesanan tidak ditemukan'], 404);
    }
    tulisJson('orders.json', array_values($filtered));
    respon(['message' => 'Pesanan berhasil dihapus']);
}
