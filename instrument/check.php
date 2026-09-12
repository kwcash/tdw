<?php
/**
 * Upload this alongside index.html, open it in a browser, confirm all four
 * lines say OK, then DELETE IT. It reports whether the server can run the
 * instrument. It never prints the API key itself.
 */

declare(strict_types=1);
header('Content-Type: text/plain; charset=utf-8');

echo "PHP version: " . PHP_VERSION;
echo PHP_VERSION_ID >= 70400 ? "  OK\n" : "  TOO OLD, need 7.4 or newer\n";

echo "cURL extension: ";
echo function_exists('curl_init') ? "present  OK\n" : "MISSING, the tool cannot call the API\n";

echo "Config file: ";
$found = null;
foreach ([__DIR__ . '/../../tdw-config.php', __DIR__ . '/../tdw-config.php'] as $path) {
    if (is_readable($path)) {
        $found = $path;
        break;
    }
}
if ($found === null) {
    echo "NOT FOUND, upload tdw-config.php above public_html\n";
} else {
    $config = require $found;
    $key = is_array($config) && !empty($config['api_key']) ? (string) $config['api_key'] : '';
    if ($key === '' || str_contains($key, 'REPLACE-ME')) {
        echo "found, but the api_key is still the placeholder\n";
    } else {
        echo "found, api_key set (" . strlen($key) . " characters)  OK\n";
    }
}

echo "Outbound HTTPS: ";
if (!function_exists('curl_init')) {
    echo "cannot test without cURL\n";
} else {
    $ch = curl_init('https://api.anthropic.com/v1/messages');
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_NOBODY => true]);
    curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);
    echo $err === '' ? "reachable  OK\n" : "BLOCKED, " . $err . "\n";
}

echo "\nIf all four say OK, delete this file and use index.html.\n";
