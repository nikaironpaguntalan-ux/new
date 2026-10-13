<?php
header("Content-Type: application/json; charset=utf-8");
session_start();
if (!isset($_SESSION["user_id"])) { http_response_code(401); echo json_encode(["status"=>"error","message"=>"Please sign in first."]); exit; }
$host="localhost"; $user="root"; $pass=""; $db="mappingproject";
$conn=new mysqli($host,$user,$pass,$db);
if($conn->connect_error){http_response_code(500);echo json_encode(["status"=>"error","message"=>"Database connection failed."]);exit;}
$conn->set_charset("utf8mb4");
$lat=isset($_POST["latitude"])?(float)$_POST["latitude"]:null;
$lng=isset($_POST["longitude"])?(float)$_POST["longitude"]:null;
$cat=trim((string)($_POST["category"]??""));
$name=trim((string)($_POST["name"]??""));
$desc=trim((string)($_POST["description"]??""));
if($lat===null||$lng===null||$lat<-90||$lat>90||$lng<-180||$lng>180||$cat===""||$name===""||$desc===""){echo json_encode(["status"=>"error","message"=>"Please provide a valid location, category, name, and description."]);exit;}
$stmt=$conn->prepare("INSERT INTO locationtagging (latitude, longitude, category, name, description) VALUES (?, ?, ?, ?, ?)");
$stmt->bind_param("ddsss",$lat,$lng,$cat,$name,$desc);
if($stmt->execute()){echo json_encode(["status"=>"success","message"=>"Location saved.","id"=>$conn->insert_id]);}else{http_response_code(500);echo json_encode(["status"=>"error","message"=>"Insert failed."]);}
$stmt->close();$conn->close();
?>
