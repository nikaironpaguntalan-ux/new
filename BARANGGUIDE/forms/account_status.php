<?php
header("Content-Type: application/json; charset=utf-8");
session_start();

echo json_encode([
    "signed_in" => isset($_SESSION["user_id"]),
    "identity" => $_SESSION["user_identity"] ?? "",
    "is_admin" => !empty($_SESSION["is_admin"])
]);
?>
