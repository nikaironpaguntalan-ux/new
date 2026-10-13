<?php

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/bg_access.php';

bg_user();

$db = bg_map_db();

$result = $db->query("SELECT id, latitude, longitude, report_type, risk_category, risk_detail,
    location_name, severity, description, photo_path, status, verification_status,
    verification_note, created_at, verified_at FROM community_reports ORDER BY id DESC");

if (!$result) {
    bg_json(500, 'Please run database_setup.sql / upgrade_bioguard.sql.');
}
echo json_encode(['status'=>'success','data'=>$result->fetch_all(MYSQLI_ASSOC)]);

$db->close();
