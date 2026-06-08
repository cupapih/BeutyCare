<?php
require_once __DIR__ . '/helpers.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET') {

    // Download / view digital product
    if ($action === 'view' || $action === 'download') {
        $produkId = $_GET['id'] ?? null;
        $orderId  = $_GET['order_id'] ?? null;
        $userId   = $_GET['user_id'] ?? null;

        if (!$produkId) respon(['error' => 'ID produk diperlukan'], 400);

        $products = bacaJson('products.json');
        $produk = current(array_filter($products, fn($p) => $p['id'] == $produkId));

        if (!$produk) respon(['error' => 'Produk tidak ditemukan'], 404);
        if (empty($produk['tipe']) || $produk['tipe'] === 'fisik') respon(['error' => 'Bukan produk digital'], 400);

        // If order_id provided, verify the user actually purchased this
        if ($orderId && $userId) {
            $orders = bacaJson('orders.json');
            $order = current(array_filter($orders, fn($o) => $o['id'] == $orderId && $o['user_id'] == $userId));
            if (!$order) respon(['error' => 'Pesanan tidak ditemukan'], 404);
            if ($order['status'] === 'Menunggu') respon(['error' => 'Pesanan masih menunggu pembayaran'], 400);
        }

        $filePath = __DIR__ . '/../' . $produk['file'];
        if (!file_exists($filePath)) respon(['error' => 'File produk tidak ditemukan'], 404);

        $content = file_get_contents($filePath);

        // For certificates, inject user name
        if ($produk['tipe'] === 'sertifikat' && $orderId) {
            $orders = bacaJson('orders.json');
            $order = current(array_filter($orders, fn($o) => $o['id'] == $orderId));
            if ($order && !empty($order['nama'])) {
                $content = str_replace('[Nama Pelanggan]', $order['nama'], $content);
                $content = str_replace('[Nama Lengkap]', $order['nama'], $content);
                $treatment = $order['produk'] ?? 'Skincare Treatment & Perawatan Kulit';
                $content = str_replace('Skincare Treatment &amp; Perawatan Kulit', $treatment, $content);
            }
        }

        // For vouchers, generate unique code and inject
        if ($produk['tipe'] === 'voucher') {
            $orders = bacaJson('orders.json');
            $order = current(array_filter($orders, fn($o) => $o['id'] == $orderId));
            $voucherCode = strtoupper(substr(md5($orderId . time() . uniqid()), 0, 4) . '-' . substr(md5(rand()), 0, 4) . '-' . substr(md5(rand()), 0, 4));

            $wa = '628123456789';
            $payment = bacaJson('payment.json');
            if (!empty($payment['wa_konfirmasi'])) $wa = $payment['wa_konfirmasi'];

            // Save voucher to data
            $vouchersFile = __DIR__ . '/../data/vouchers.json';
            $vouchers = file_exists($vouchersFile) ? json_decode(file_get_contents($vouchersFile), true) : [];
            $vouchers[] = [
                'kode' => $voucherCode,
                'order_id' => (int)$orderId,
                'user_id' => $userId ? (int)$userId : 0,
                'nama' => $order['nama'] ?? '',
                'created_at' => date('Y-m-d H:i:s'),
                'used' => false
            ];
            file_put_contents($vouchersFile, json_encode($vouchers, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

            $content = str_replace('[Kode Unik]', $voucherCode, $content);
            $content = str_replace('https://wa.me/628123456789', 'https://wa.me/' . $wa, $content);
            $content = str_replace('"#', '"https://wa.me/' . $wa . '?text=' . urlencode('Halo BeautyCare, saya ingin menggunakan voucher konsultasi online. Kode: ' . $voucherCode), $content);
        }

        header('Content-Type: text/html; charset=utf-8');
        echo $content;
        exit;
    }

    // Get user's purchased digital products
    if ($action === 'my-products') {
        $userId = $_GET['user_id'] ?? null;
        if (!$userId) respon(['error' => 'User ID diperlukan'], 400);

        $orders = bacaJson('orders.json');
        $products = bacaJson('products.json');

        $userOrders = array_filter($orders, fn($o) =>
            $o['user_id'] == $userId &&
            in_array($o['status'], ['Diproses', 'Dikirim', 'Selesai'])
        );

        $digitalOrders = [];
        foreach ($userOrders as $order) {
            $produk = current(array_filter($products, fn($p) => $p['id'] == $order['produk_id']));
            if ($produk && !empty($produk['tipe']) && $produk['tipe'] !== 'fisik') {
                $order['produk_detail'] = $produk;
                $digitalOrders[] = $order;
            }
        }

        respon(array_values($digitalOrders));
    }

    // Generate voucher code (for admin)
    if ($action === 'generate-voucher') {
        $code = strtoupper(substr(md5(uniqid()), 0, 4) . '-' . substr(md5(rand()), 0, 4) . '-' . substr(md5(rand()), 0, 4));
        respon(['kode' => $code]);
    }

    respon(['error' => 'Aksi tidak dikenal'], 400);
}

if ($method === 'POST') {
    $data = bodyJson();
    $action = $data['action'] ?? $_GET['action'] ?? '';

    // Mark voucher as used
    if ($action === 'use-voucher') {
        $kode = $data['kode'] ?? '';
        if (!$kode) respon(['error' => 'Kode voucher diperlukan'], 400);

        $vouchersFile = __DIR__ . '/../data/vouchers.json';
        $vouchers = file_exists($vouchersFile) ? json_decode(file_get_contents($vouchersFile), true) : [];

        $found = false;
        foreach ($vouchers as &$v) {
            if ($v['kode'] === $kode && !$v['used']) {
                $v['used'] = true;
                $v['used_at'] = date('Y-m-d H:i:s');
                $found = true;
                break;
            }
        }

        if (!$found) respon(['error' => 'Voucher tidak valid atau sudah digunakan'], 400);
        file_put_contents($vouchersFile, json_encode($vouchers, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        respon(['message' => 'Voucher berhasil digunakan']);
    }

    respon(['error' => 'Aksi tidak dikenal'], 400);
}
