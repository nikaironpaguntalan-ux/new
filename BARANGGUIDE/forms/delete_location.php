
<?php
header("Content-Type: application/json; charset=utf-8");

session_start();

if (!isset($_SESSION["user_id"])) {
    http_response_code(401);

    echo json_encode([
        "status" => "error",
        "message" => "Please sign in first."
    ]);

    exit;
}

if (empty($_SESSION["is_admin"])) {
    http_response_code(403);

    echo json_encode([
        "status" => "error",
        "message" => "Only an administrator can delete a mapped location."
    ]);

    exit;
}

$host = "localhost";
$user = "root";
$pass = "";
$db = "mappingproject";

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    http_response_code(500);

    echo json_encode([
        "status" => "error",
        "message" => "Database connection failed."
    ]);

    exit;
}

$conn->set_charset("utf8mb4");

$id = filter_input(INPUT_POST, "id", FILTER_VALIDATE_INT);

if (!$id) {
    echo json_encode([
        "status" => "error",
        "message" => "Invalid location ID."
    ]);

    $conn->close();
    exit;
}

$stmt = $conn->prepare("DELETE FROM locationtagging WHERE id = ?");

$stmt->bind_param("i", $id);

if ($stmt->execute() && $stmt->affected_rows > 0) {
    echo json_encode([
        "status" => "success",
        "message" => "Location deleted successfully."
    ]);
} else {
    echo json_encode([
        "status" => "error",
        "message" => "Location not found or could not be deleted."
    ]);
}

$stmt->close();
$conn->close();
?>
