<?php

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    
    $dataDir = __DIR__ . '/data';
    if (!is_dir($dataDir)) {
        mkdir($dataDir, 0777, true);
    }

  
    $filename = $dataDir . '/polygons_' . time() . '.json';
    file_put_contents($filename, json_encode($data, JSON_PRETTY_PRINT));

    
    echo json_encode(['status' => 'success']);
    exit;
}


http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
