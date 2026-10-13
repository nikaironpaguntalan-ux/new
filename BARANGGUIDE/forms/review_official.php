<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/bg_access.php';
$user = bg_user();
if ((int)$user['is_admin'] !== 1) bg_json(403, 'Only administrators can review official accounts.');
bg_csrf();
$id = filter_input(INPUT_POST, 'user_id', FILTER_VALIDATE_INT);
$decision = (string)($_POST['decision'] ?? '');
$note = trim((string)($_POST['notes'] ?? ''));
if (!$id || (int)$id === (int)$user['id'] || !in_array($decision, ['verified', 'rejected'], true) || strlen($note) > 1000 || ($decision === 'rejected' && $note === '')) bg_json(400, 'Invalid account or decision.');
$db = new mysqli('localhost', 'root', '', 'auth_db');
if ($db->connect_error) bg_json(500, 'Account database is unavailable.');
$db->set_charset('utf8mb4');
$stmt = $db->prepare("UPDATE users u INNER JOIN government_profiles p ON p.user_id=u.id
    SET u.official_verification=?, u.official_review_note=?, u.official_reviewed_by=?, u.official_reviewed_at=NOW()
    WHERE u.id=? AND u.identity='government_official' AND u.is_admin=0");
$adminId = (int)$user['id'];
$stmt->bind_param('ssii', $decision, $note, $adminId, $id);
$ok = $stmt->execute() && $stmt->affected_rows > 0;
$stmt->close();
$db->close();
if (!$ok) bg_json(404, 'Account/profile not found.');
echo json_encode(['status'=>'success','message'=>'Official account ' . $decision . '.']);
