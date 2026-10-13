
<?php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/bg_access.php';

$user = bg_user();

date_default_timezone_set('Asia/Manila');
if (!bg_official($user)) {
    bg_json(403, 'Only verified government officials can update interventions.');
}

bg_csrf();

$reportId = filter_input(INPUT_POST, 'report_id', FILTER_VALIDATE_INT);
$agency = trim((string) ($_POST['agency'] ?? ''));
$action = trim((string) ($_POST['action_taken'] ?? ''));
$status = trim((string) ($_POST['status'] ?? ''));
$date = trim((string) ($_POST['scheduled_for'] ?? ''));

if (!$reportId ||$agency === '' ||strlen($agency) > 150 ||$action === '' ||strlen($action) > 1000 ||!in_array($status, ['planned', 'ongoing', 'completed'], true)) {
    bg_json(400, 'Complete all intervention details.');
}

$scheduled = null;

if ($date !== '') {
    $dt = DateTimeImmutable::createFromFormat('!Y-m-d\TH:i', $date);
    if (!$dt || $dt->format('Y-m-d\TH:i') !== $date) {
        bg_json(400, 'Choose a valid intervention date and time.');
    }
    if ($status === 'planned' && $dt < new DateTimeImmutable('now')) {
        bg_json(400, 'Planned intervention must be scheduled in the future.');
    }
    $scheduled = $dt->format('Y-m-d H:i:s');
}

if ($status === 'planned' && $scheduled === null) {
    bg_json(400, 'A planned intervention requires a schedule.');
}
$db = bg_map_db();
$db->begin_transaction();
$check = $db->prepare("SELECT verification_status FROM community_reports WHERE id = ?FOR UPDATE");

$check->bind_param('i', $reportId);
$check->execute();
$report = $check->get_result()->fetch_assoc();
$check->close();
if (!$report || $report['verification_status'] !== 'verified') {
    $db->rollback();
    bg_json(403, 'Reports must be verified by a government official before intervention.');
}

$userId = (int) $user['id'];
$insert = $db->prepare("
    INSERT INTO interventions (report_id,agency,action_taken,status,scheduled_for,created_by)VALUES (?, ?, ?, ?, ?, ?)");

$insert->bind_param('issssi',$reportId,$agency,$action,$status,$scheduled,$userId
);
$reportStatus = $status === 'completed'? 'resolved'
    : ($status === 'ongoing' ? 'in_progress' : 'pending');

$update = $db->prepare("UPDATE community_reports SET status = ? WHERE id = ?
");

$update->bind_param('si',$reportStatus,$reportId
);

$ok = $insert->execute() && $update->execute();

if ($ok) {
    $db->commit();
} else {
    $db->rollback();
}

$insert->close();
$update->close();

$db->close();

if (!$ok) {
    bg_json(500, 'Unable to save intervention.');
}
echo json_encode([
    'status' => 'success',
    'message' => 'Intervention scheduled / updated successfully.'
]);
?>
