<?php
header("Content-Type: application/json; charset=utf-8");
session_start();

if (!isset($_SESSION["user_id"])) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "You are not logged in."]);
    exit;
}

$host = "localhost";
$user = "root";
$pass = "";
$db   = "auth_db";

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database connection failed."]);
    exit;
}

$conn->set_charset("utf8mb4");
$user_id = (int)$_SESSION["user_id"];
$data = json_decode(file_get_contents("php://input"), true);
$identity = (string)($data["identity"] ?? "");

// A selected role is for a newly registered member. It does not grant admin access.
$check = $conn->prepare("SELECT identity, is_admin FROM users WHERE id=? LIMIT 1");
$check->bind_param("i", $user_id);
$check->execute();
$currentUser = $check->get_result()->fetch_assoc();
$check->close();
if (!$currentUser || (int)$currentUser["is_admin"] === 1) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "This account cannot use the registration profile form."]);
    exit;
}
if ($currentUser["identity"] !== null && $currentUser["identity"] !== $identity) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "Your account already has a different profile type."]);
    exit;
}

function requireFields(array $data, array $fields): bool {
    foreach ($fields as $field) {
        if (trim((string)($data[$field] ?? "")) === "") return false;
    }
    return true;
}

function getExistingId(mysqli $conn, string $table, int $userId): ?int {
    $stmt = $conn->prepare("SELECT id FROM {$table} WHERE user_id = ? LIMIT 1");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $id = $result->num_rows ? (int)$result->fetch_assoc()["id"] : null;
    $stmt->close();
    return $id;
}

try {
    $conn->begin_transaction();

    if ($identity === "resident") {
        $fields = ["contact_number", "house_address", "barangay", "city", "province", "postal_code"];
        if (!requireFields($data, $fields)) {
            throw new Exception("Please complete all resident information.");
        }

        $contact_number = trim($data["contact_number"]);
        $house_address  = trim($data["house_address"]);
        $barangay       = trim($data["barangay"]);
        $city           = trim($data["city"]);
        $province       = trim($data["province"]);
        $postal_code    = trim($data["postal_code"]);
        $existingId = getExistingId($conn, "resident_profiles", $user_id);

        if ($existingId !== null) {
            $stmt = $conn->prepare("UPDATE resident_profiles SET contact_number=?, house_address=?, barangay=?, city=?, province=?, postal_code=? WHERE id=?");
            $stmt->bind_param("ssssssi", $contact_number, $house_address, $barangay, $city, $province, $postal_code, $existingId);
        } else {
            $stmt = $conn->prepare("INSERT INTO resident_profiles (user_id, contact_number, house_address, barangay, city, province, postal_code) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("issssss", $user_id, $contact_number, $house_address, $barangay, $city, $province, $postal_code);
        }

        if (!$stmt->execute()) throw new Exception("Failed to save resident profile.");
        $stmt->close();

        $update = $conn->prepare("UPDATE users SET identity='resident' WHERE id=?");
        $update->bind_param("i", $user_id);
        if (!$update->execute()) throw new Exception("Failed to update account identity.");
        $update->close();
        $_SESSION["user_identity"] = "resident";

        $conn->commit();
        echo json_encode(["success" => true, "message" => "Resident profile saved successfully.", "redirect" => "forms/dashboard.php"]);
        exit;
    }

    if ($identity === "government_official") {
        $fields = ["position", "government_office", "barangay", "office_address", "city", "province", "contact_number", "employee_id", "official_email"];
        if (!requireFields($data, $fields)) {
            throw new Exception("Please complete all government official information.");
        }

        $position          = trim($data["position"]);
        $government_office = trim($data["government_office"]);
        $barangay          = trim($data["barangay"]);
        $office_address    = trim($data["office_address"]);
        $city              = trim($data["city"]);
        $province          = trim($data["province"]);
        $contact_number    = trim($data["contact_number"]);
        $employee_id       = trim($data["employee_id"]);
        $official_email    = strtolower(trim($data["official_email"]));

        if (!filter_var($official_email, FILTER_VALIDATE_EMAIL)) {
            throw new Exception("Please enter a valid official email address.");
        }

        $existingId = getExistingId($conn, "government_profiles", $user_id);

        if ($existingId !== null) {
            $stmt = $conn->prepare("UPDATE government_profiles SET `position`=?, government_office=?, office_address=?, barangay=?, city=?, province=?, contact_number=?, employee_id=?, official_email=? WHERE id=?");
            $stmt->bind_param("sssssssssi", $position, $government_office, $office_address, $barangay, $city, $province, $contact_number, $employee_id, $official_email, $existingId);
        } else {
            $stmt = $conn->prepare("INSERT INTO government_profiles (user_id, `position`, government_office, office_address, barangay, city, province, contact_number, employee_id, official_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("isssssssss", $user_id, $position, $government_office, $office_address, $barangay, $city, $province, $contact_number, $employee_id, $official_email);
        }

        if (!$stmt->execute()) throw new Exception("Failed to save government official profile.");
        $stmt->close();

        $update = $conn->prepare("UPDATE users SET identity='government_official', official_verification='pending', official_reviewed_by=NULL, official_reviewed_at=NULL, official_review_note=NULL WHERE id=?");
        $update->bind_param("i", $user_id);
        if (!$update->execute()) throw new Exception("Failed to update account identity.");
        $update->close();
        $_SESSION["user_identity"] = "government_official";

        $conn->commit();
        echo json_encode(["success" => true, "message" => "Government official profile saved. Await administrator verification before official actions are available.", "redirect" => "forms/dashboard.php"]);
        exit;
    }

    throw new Exception("Invalid identity selected.");
} catch (Throwable $e) {
    if ($conn->errno === 0) {
        // Transaction state is handled below; this branch is only to keep the response clean.
    }
    try { $conn->rollback(); } catch (Throwable $ignored) {}
    http_response_code(400);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}

$conn->close();
?>
