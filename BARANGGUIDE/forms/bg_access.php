<?php
// BIOGUARD: always check the CURRENT database role, never trust a browser field.
function bg_json($code, $message) {
    http_response_code($code);
    echo json_encode(["status" => "error", "message" => $message]);
    exit;
}
function bg_user() {
    if (session_status() !== PHP_SESSION_ACTIVE) session_start();
    if (empty($_SESSION['user_id'])) bg_json(401, 'Please sign in first.');
    $db = new mysqli('localhost', 'root', '', 'auth_db');
    if ($db->connect_error) bg_json(500, 'Account database is unavailable.');
    $db->set_charset('utf8mb4');
    $id = (int)$_SESSION['user_id'];
    $stmt = $db->prepare('SELECT u.id, u.identity, u.is_admin, u.official_verification, u.official_review_note FROM users u WHERE u.id=? LIMIT 1');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    $db->close();
    if (!$user) bg_json(401, 'Account no longer exists. Please sign in again.');
    return $user;
}
function bg_official($user) {
    return $user['identity'] === 'government_official' && $user['official_verification'] === 'verified';
}
function bg_csrf() {
    $token = (string)($_POST['csrf_token'] ?? '');
    if (empty($_SESSION['report_csrf']) || !hash_equals($_SESSION['report_csrf'], $token)) {
        bg_json(403, 'Invalid request token. Reload your dashboard.');
    }
}
function bg_map_db() {
    $db = new mysqli('localhost', 'root', '', 'mappingproject');
    if ($db->connect_error) bg_json(500, 'Mapping database is unavailable.');
    $db->set_charset('utf8mb4');
    return $db;
}
