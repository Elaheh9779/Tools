<?php
$folder = __DIR__ . '/images/';
$images = glob($folder . '*.{jpg,jpeg,png}', GLOB_BRACE);

if (!$images) {
    http_response_code(404);
    echo json_encode(['error' => 'No images found']);
    exit;
}

$randomImage = $images[array_rand($images)];
$imagePath = 'images/' . basename($randomImage);

echo json_encode(['image' => $imagePath]);
