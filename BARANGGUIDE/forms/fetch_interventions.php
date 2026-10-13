
<?php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/bg_access.php';

bg_user();

$db = bg_map_db();

$result = $db->query(" SELECT i.id, i.report_id, i.agency, i.action_taken, i.status, i.scheduled_for, i.created_at, r.report_type,r.risk_detail
    FROM interventions i
    INNER JOIN community_reports r
        ON r.id = i.report_id
    ORDER BY i.id DESC
");

if (!$result) {
    bg_json(500, 'Please run the BIOGUARD database upgrade.');
}

echo json_encode([
    'status' => 'success',
    'data' => $result->fetch_all(MYSQLI_ASSOC)
]);

$db->close();
?>
