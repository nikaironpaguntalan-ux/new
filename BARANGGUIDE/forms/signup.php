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
    echo json_encode([
        "success" => false,
        "message" => "Database connection failed."
    ]);
    exit;
}

$conn->set_charset("utf8mb4");
$data = json_decode(file_get_contents("php://input"), true);

$name     = trim((string)($data["name"] ?? ""));
$email    = strtolower(trim((string)($data["email"] ?? "")));
$password = (string)($data["password"] ?? "");

if ($name === "" || $email === "" || $password === "") {
    echo json_encode(["success" => false, "message" => "Please complete all fields."]);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(["success" => false, "message" => "Please enter a valid email address."]);
    exit;
}

if (strlen($password) < 8) {
    echo json_encode(["success" => false, "message" => "Password must contain at least 8 characters."]);
    exit;
}

$stmt = $conn->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    echo json_encode(["success" => false, "message" => "Email is already registered."]);
    $stmt->close();
    $conn->close();
    exit;
}
$stmt->close();

$passwordHash = password_hash($password, PASSWORD_DEFAULT);
$stmt = $conn->prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)");
$stmt->bind_param("sss", $name, $email, $passwordHash);

if ($stmt->execute()) {
    // Registration creates a session so the user can finish their profile immediately.
    session_regenerate_id(true);
    $_SESSION["user_id"] = (int)$conn->insert_id;
    $_SESSION["user_name"] = $name;
    $_SESSION["user_email"] = $email;
    $_SESSION["user_identity"] = "";
    $_SESSION["is_admin"] = false;

    echo json_encode([
        "success" => true,
        "message" => "Account created successfully.",
        "redirect" => "user.html"
    ]);
} else {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Failed to create account."]);
}

$stmt->close();
$conn->close();
?>
