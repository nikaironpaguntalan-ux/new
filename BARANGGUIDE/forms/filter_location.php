
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

$categories = isset($_POST["category"])
    ? array_values(array_filter(
        (array) $_POST["category"],
        fn($v) => trim((string) $v) !== ""
    ))
    : [];

if (!$categories) {
    echo json_encode([
        "status" => "success",
        "data" => []
    ]);

    $conn->close();
    exit;
}

$placeholders = implode(",", array_fill(0, count($categories), "?"));

$stmt = $conn->prepare("
    SELECT
        latitude,
        longitude,
        category,
        name,
        description,
        id
    FROM locationtagging
    WHERE category IN ($placeholders)
    ORDER BY id ASC
");

$types = str_repeat("s", count($categories));

$stmt->bind_param($types, ...$categories);

$stmt->execute();

$result = $stmt->get_result();

$locations = [];

while ($row = $result->fetch_assoc()) {
    $locations[] = $row;
}

echo json_encode([
    "status" => "success",
    "data" => $locations
]);

$stmt->close();
$conn->close();
?>
