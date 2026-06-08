<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

function bacaJson($file) {
    $path = __DIR__ . '/../data/' . $file;
    if (!file_exists($path)) return [];
    $data = file_get_contents($path);
    return json_decode($data, true) ?: [];
}

function tulisJson($file, $data) {
    $path = __DIR__ . '/../data/' . $file;
    return file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function respon($data, $kode = 200) {
    http_response_code($kode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function bodyJson() {
    $input = file_get_contents('php://input');
    return json_decode($input, true) ?: [];
}
