<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/bg_access.php';
$user = bg_user();
if (!bg_official($user)) bg_json(403, 'Only admin-verified government officials can verify reports.');
bg_csrf();
$id = filter_input(INPUT_POST, 'report_id', FILTER_VALIDATE_INT);
$decision = trim((string)($_POST['decision'] ?? ''));
$notes = trim((string)($_POST['notes'] ?? ''));
if (!$id || !in_array($decision, ['verified','rejected'], true) || strlen($notes) > 1000 || ($decision === 'rejected' && $notes === '')) bg_json(400, 'Provide a valid decision and a reason when rejecting a report.');
$db = bg_map_db();
$stmt = $db->prepare("UPDATE community_reports SET verification_status=?, verification_note=?,
    verified_by=?, verified_at=NOW() WHERE id=? AND verification_status='pending'");
$userId = (int)$user['id'];
$stmt->bind_param('ssii', $decision, $notes, $userId, $id);
$ok = $stmt->execute() && $stmt->affected_rows === 1;
$stmt->close();
$db->close();
if (!$ok) bg_json(409, 'Report not found or already reviewed.');
echo json_encode(['status'=>'success','message'=>'Report ' . $decision . '.']);
