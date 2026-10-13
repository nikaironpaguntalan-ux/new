<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/bg_access.php';
$user = bg_user();
bg_csrf();
$latitude = filter_input(INPUT_POST, 'latitude', FILTER_VALIDATE_FLOAT);
$longitude = filter_input(INPUT_POST, 'longitude', FILTER_VALIDATE_FLOAT);
$category = trim((string)($_POST['risk_category'] ?? ''));
$detail = trim((string)($_POST['risk_detail'] ?? ''));
$place = trim((string)($_POST['location_name'] ?? ''));
$severity = trim((string)($_POST['severity'] ?? ''));
$description = trim((string)($_POST['description'] ?? ''));

// Keep disease/hazard choices in a server-side allowlist; do not trust <select>.
$options = [
    'animal_transmitted' => ['Dengue', 'Rabies', 'Malaria', 'Leptospirosis', 'Chikungunya', 'Other human/vector-borne disease'],
    'animal_disease' => ['African Swine Fever (ASF)', 'Avian Influenza', 'Newcastle Disease', 'Foot-and-Mouth Disease', 'Other animal disease'],
    'habitat_risk' => ['Mosquito breeding site', 'Stagnant water', 'Rat/rodent infestation', 'Flood-prone area', 'Improper waste accumulation', 'Stray/aggressive animal area', 'Animal bite incident', 'Unusual animal deaths', 'Other environmental risk']
];
if ($latitude === false || $latitude === null || $longitude === false || $longitude === null ||
    $latitude < -90 || $latitude > 90 || $longitude < -180 || $longitude > 180 ||
    !isset($options[$category]) || !in_array($detail, $options[$category], true) ||
    !in_array($severity, ['low', 'moderate', 'high', 'critical'], true) ||
    $place === '' || strlen($place) > 120 || $description === '' || strlen($description) > 1000) {
    bg_json(400, 'Check the location, category, report type, urgency and description.');
}

$photoPath = null;
$photoFullPath = null;
if (!empty($_FILES['photo']['name'])) {
    $file = $_FILES['photo'];
    if ($file['error'] !== UPLOAD_ERR_OK || $file['size'] > 5 * 1024 * 1024 || $file['size'] <= 0 || !is_uploaded_file($file['tmp_name'])) {
        bg_json(400, 'Photo upload failed. Maximum size: 5 MB.');
    }
    // Determine type from file CONTENT, not user-supplied extension/type.
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    $types = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if (!isset($types[$mime]) || @getimagesize($file['tmp_name']) === false) bg_json(400, 'Only valid JPG, PNG and WEBP photos are accepted.');
    $folder = __DIR__ . '/../assets/uploads/reports';
    if (!is_dir($folder) && !mkdir($folder, 0755, true)) bg_json(500, 'Cannot create photo storage folder.');
    $filename = bin2hex(random_bytes(16)) . '.' . $types[$mime];
    $photoFullPath = $folder . '/' . $filename;
    if (!move_uploaded_file($file['tmp_name'], $photoFullPath)) bg_json(500, 'Could not save the photo.');
    $photoPath = '../assets/uploads/reports/' . $filename;
}
$db = bg_map_db();
$userId = (int)$user['id'];
// report_type kept for backward compatibility with the existing map code.
$stmt = $db->prepare("INSERT INTO community_reports
    (latitude, longitude, report_type, risk_category, risk_detail, location_name,
    severity, description, photo_path, verification_status, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', ?)");
if (!$stmt) {
    if ($photoFullPath) unlink($photoFullPath);
    bg_json(500, 'Import the BIOGUARD database upgrade first.');
}
$stmt->bind_param('ddsssssssi', $latitude, $longitude, $detail, $category, $detail, $place,
    $severity, $description, $photoPath, $userId);
$success = $stmt->execute();
$id = $db->insert_id;
$stmt->close();
$db->close();
if (!$success) {
    if ($photoFullPath) unlink($photoFullPath);
    bg_json(500, 'Could not save this report.');
}
echo json_encode(['status'=>'success','id'=>$id,'message'=>'Report submitted. Awaiting review by a verified government official.']);
