<?php
require_once __DIR__ . '/helpers.php';

$usersFile = __DIR__ . '/../data/users.json';
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

function bacaUsers() {
    global $usersFile;
    return file_exists($usersFile) ? (json_decode(file_get_contents($usersFile), true) ?: []) : [];
}

function tulisUsers($data) {
    global $usersFile;
    file_put_contents($usersFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function buatToken($length = 32) {
    return bin2hex(random_bytes($length / 2));
}

if ($method === 'POST' && $action === 'register') {
    $data = bodyJson();
    $nama = trim($data['nama'] ?? '');
    $email = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';
    $no_hp = trim($data['no_hp'] ?? '');

    if (empty($nama) || empty($email) || empty($password)) {
        respon(['error' => 'Nama, email, dan password wajib diisi'], 400);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        respon(['error' => 'Email tidak valid'], 400);
    }
    if (strlen($password) < 6) {
        respon(['error' => 'Password minimal 6 karakter'], 400);
    }

    $users = bacaUsers();
    foreach ($users as $u) {
        if ($u['email'] === $email) {
            respon(['error' => 'Email sudah terdaftar'], 400);
        }
    }

    $ids = array_column($users, 'id');
    $newId = !empty($ids) ? max($ids) + 1 : 1;
    $token = buatToken();
    $user = [
        'id' => $newId,
        'nama' => $nama,
        'email' => $email,
        'password' => password_hash($password, PASSWORD_DEFAULT),
        'no_hp' => $no_hp,
        'token' => $token,
        'created_at' => date('Y-m-d H:i:s')
    ];
    $users[] = $user;
    tulisUsers($users);

    respon([
        'user' => ['id' => $user['id'], 'nama' => $user['nama'], 'email' => $user['email'], 'no_hp' => $user['no_hp']],
        'token' => $token
    ], 201);
}

if ($method === 'POST' && $action === 'login') {
    $data = bodyJson();
    $email = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';

    if (empty($email) || empty($password)) {
        respon(['error' => 'Email dan password wajib diisi'], 400);
    }

    $users = bacaUsers();
    $found = null;
    foreach ($users as &$u) {
        if ($u['email'] === $email && password_verify($password, $u['password'])) {
            $u['token'] = buatToken();
            $found = $u;
            break;
        }
    }
    if (!$found) {
        respon(['error' => 'Email atau password salah'], 401);
    }
    tulisUsers($users);

    respon([
        'user' => ['id' => $found['id'], 'nama' => $found['nama'], 'email' => $found['email'], 'no_hp' => $found['no_hp']],
        'token' => $found['token']
    ]);
}

if ($method === 'GET' && $action === 'me') {
    $headers = getallheaders();
    $token = $headers['Authorization'] ?? $_GET['token'] ?? '';
    if (empty($token)) {
        respon(['error' => 'Not authenticated'], 401);
    }
    $users = bacaUsers();
    foreach ($users as $u) {
        if ($u['token'] === $token) {
            respon([
                'user' => ['id' => $u['id'], 'nama' => $u['nama'], 'email' => $u['email'], 'no_hp' => $u['no_hp']]
            ]);
        }
    }
    respon(['error' => 'Invalid token'], 401);
}

if ($method === 'POST' && $action === 'logout') {
    $data = bodyJson();
    $token = $data['token'] ?? '';
    $users = bacaUsers();
    foreach ($users as &$u) {
        if ($u['token'] === $token) {
            $u['token'] = '';
            tulisUsers($users);
            respon(['message' => 'Logged out']);
        }
    }
    respon(['message' => 'OK']);
}
