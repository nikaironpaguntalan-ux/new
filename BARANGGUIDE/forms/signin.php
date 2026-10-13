<?php
header("Content-Type: application/json; charset=utf-8");
session_start();

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
$data = json_decode(file_get_contents("php://input"), true);
$email    = strtolower(trim((string)($data["email"] ?? "")));
$password = (string)($data["password"] ?? "");

if ($email === "" || $password === "") {
    echo json_encode(["success" => false, "message" => "Please enter your email and password."]);
    exit;
}

$stmt = $conn->prepare("SELECT id, name, email, password_hash, COALESCE(identity, '') AS identity, is_admin FROM users WHERE email = ? LIMIT 1");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Invalid email or password."]);
    $stmt->close();
    $conn->close();
    exit;
}

$userData = $result->fetch_assoc();

if (!password_verify($password, $userData["password_hash"])) {
    echo json_encode(["success" => false, "message" => "Invalid email or password."]);
    $stmt->close();
    $conn->close();
    exit;
}

session_regenerate_id(true);
$_SESSION["user_id"] = (int)$userData["id"];
$_SESSION["user_name"] = $userData["name"];
$_SESSION["user_email"] = $userData["email"];
$_SESSION["user_identity"] = $userData["identity"];
$_SESSION["is_admin"] = (int)$userData["is_admin"] === 1;

$update = $conn->prepare("UPDATE users SET last_login_at = NOW() WHERE id = ?");
$update->bind_param("i", $userData["id"]);
$update->execute();
$update->close();

// Existing accounts go straight to the map, including the admin account.
$redirect = "forms/dashboard.php";

echo json_encode([
    "success" => true,
    "message" => "Sign in successful.",
    "redirect" => $redirect
]);

$stmt->close();
$conn->close();
?>
