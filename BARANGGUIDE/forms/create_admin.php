<?php

if (PHP_SAPI !== "cli") {
    http_response_code(403);
    exit("Forbidden");
}

$email = strtolower(trim((string)($argv[1] ?? "")));
$name = trim((string)($argv[2] ?? "Administrator"));
$password = getenv("BARANGUIDE_ADMIN_PASSWORD");

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $name === "" || !$password || strlen($password) < 12) {
    exit("Usage: set BARANGUIDE_ADMIN_PASSWORD to a 12+ character password, then run: php forms/create_admin.php admin@example.com \"Your Name\"\n");
}

$conn = new mysqli("localhost", "root", "", "auth_db");
if ($conn->connect_error) exit("Cannot connect to auth_db. Import database_setup.sql first.\n");
$conn->set_charset("utf8mb4");

$column = $conn->query("SHOW COLUMNS FROM users LIKE 'is_admin'");
if (!$column || $column->num_rows === 0) exit("Run database_setup.sql again to add the is_admin column.\n");

$hash = password_hash($password, PASSWORD_DEFAULT);
$check = $conn->prepare("SELECT id FROM users WHERE email=? LIMIT 1");
$check->bind_param("s", $email);
$check->execute();
$row = $check->get_result()->fetch_assoc();
$check->close();

if ($row) {
    $id = (int)$row["id"];
    $update = $conn->prepare("UPDATE users SET name=?, password_hash=?, is_admin=1 WHERE id=?");
    $update->bind_param("ssi", $name, $hash, $id);
    $ok = $update->execute();
    $update->close();
} else {
    $insert = $conn->prepare("INSERT INTO users (name, email, password_hash, is_admin) VALUES (?, ?, ?, 1)");
    $insert->bind_param("sss", $name, $email, $hash);
    $ok = $insert->execute();
    $insert->close();
}

$conn->close();
if (!$ok) exit("Could not create or update the administrator.\n");
echo "Administrator account configured for $email. Sign in through login.html.\n";
?>
