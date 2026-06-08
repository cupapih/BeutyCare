<?php
require_once __DIR__ . '/helpers.php';

$method = $_SERVER['REQUEST_METHOD'];
$products = bacaJson('products.json');

if ($method === 'GET') {
    $id = $_GET['id'] ?? null;
    if ($id) {
        $product = current(array_filter($products, fn($p) => $p['id'] == $id));
        $product ? respon($product) : respon(['error' => 'Produk tidak ditemukan'], 404);
    }
    respon($products);
}

if ($method === 'POST') {
    $data = bodyJson();
    if (empty($data['nama']) || empty($data['harga'])) {
        respon(['error' => 'Nama dan harga wajib diisi'], 400);
    }
    $ids = array_column($products, 'id');
    $maxId = !empty($ids) ? max($ids) : 0;
    $data['id'] = $maxId + 1;
    $data['gambar'] = $data['gambar'] ?? 'img/all%20variety.jpg';
    $data['kategori'] = $data['kategori'] ?? 'Umum';
    $products[] = $data;
    tulisJson('products.json', $products);
    respon($data, 201);
}

if ($method === 'PUT') {
    $data = bodyJson();
    $id = $data['id'] ?? null;
    if (!$id) respon(['error' => 'ID diperlukan'], 400);
    
    $found = false;
    foreach ($products as &$p) {
        if ($p['id'] == $id) {
            $p['nama'] = $data['nama'] ?? $p['nama'];
            $p['deskripsi'] = $data['deskripsi'] ?? $p['deskripsi'];
            $p['harga'] = $data['harga'] ?? $p['harga'];
            $p['gambar'] = $data['gambar'] ?? $p['gambar'];
            $p['kategori'] = $data['kategori'] ?? $p['kategori'];
            $found = true;
            break;
        }
    }
    if (!$found) respon(['error' => 'Produk tidak ditemukan'], 404);
    tulisJson('products.json', $products);
    respon(['message' => 'Produk berhasil diperbarui']);
}

if ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) respon(['error' => 'ID diperlukan'], 400);
    
    $filtered = array_filter($products, fn($p) => $p['id'] != $id);
    if (count($filtered) === count($products)) {
        respon(['error' => 'Produk tidak ditemukan'], 404);
    }
    tulisJson('products.json', array_values($filtered));
    respon(['message' => 'Produk berhasil dihapus']);
}
