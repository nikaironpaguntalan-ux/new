<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/bg_access.php';
$user = bg_user();
if ((int)$user['is_admin'] !== 1) bg_json(403, 'Administrator access required.');
$db = new mysqli('localhost', 'root', '', 'auth_db');
if ($db->connect_error) bg_json(500, 'Account database is unavailable.');
$db->set_charset('utf8mb4');
$result = $db->query("SELECT u.id, u.name, u.email, u.official_verification, u.official_reviewed_at, u.official_review_note,
    p.`position`, p.government_office, p.employee_id, p.official_email, p.city, p.province
    FROM users u LEFT JOIN government_profiles p ON p.user_id=u.id
    WHERE u.identity='government_official' AND u.is_admin=0 ORDER BY
    FIELD(u.official_verification,'pending','rejected','verified'), u.id DESC");
if (!$result) bg_json(500, 'Import the BIOGUARD migration before using verification.');
echo json_encode(['status'=>'success','data'=>$result->fetch_all(MYSQLI_ASSOC)]);
$db->close();
