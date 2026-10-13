<?php
header("Content-Type: application/json; charset=utf-8");

$host="localhost";
$user="root";
$pass="";
$db="mappingproject";
$conn=new mysqli($host,$user,$pass,$db);
    session_start();

if (!isset($_SESSION["user_id"])) { http_response_code(401); 
    echo json_encode(["status"=>"error","message"=>"Please sign in first."]); exit; }

    if($conn->connect_error){http_response_code(500);echo json_encode(["status"=>"error","message"=>"Database connection failed."]);exit;}
        $conn->set_charset("utf8mb4");
        $result=$conn->query("SELECT latitude, longitude, category, name, description, id FROM locationtagging ORDER BY id ASC");
        $locations=[];
        if($result){while($row=$result->fetch_assoc()){$locations[]=$row;}}
            echo json_encode(["status"=>"success","data"=>$locations]);
                $conn->close();
?>
