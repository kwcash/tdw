<?php
/**
 * Upload this alongside index.html, open it in a browser, confirm every line
 * says OK, then DELETE IT. It reports whether the server can run the
 * instrument. It never prints the API key itself.
 */

declare(strict_types=1);
header('Content-Type: text/plain; charset=utf-8');

echo "This file is running from:\n  " . __DIR__ . "\n\n";

echo "PHP version: " . PHP_VERSION;
echo PHP_VERSION_ID >= 70400 ? "  OK\n" : "  TOO OLD, need 7.4 or newer\n";

echo "cURL extension: ";
echo function_exists('curl_init') ? "present  OK\n" : "MISSING, the tool cannot call the API\n";

foreach (['analyze.php', 'index.html', 'questions.html'] as $needed) {
    echo "File " . $needed . ": ";
    echo is_readable(__DIR__ . '/' . $needed)
        ? "present  OK\n"
        : "MISSING from this folder, upload it here\n";
}

$candidates = [
    __DIR__ . '/../../private/tdw-config.php',
    __DIR__ . '/../../tdw-config.php',
    __DIR__ . '/../tdw-config.php',
];

$basedir = ini_get('open_basedir');
echo "\nopen_basedir: " . ($basedir === '' || $basedir === false ? "not set, PHP can read anywhere\n" : $basedir . "\n");
if ($basedir) {
    echo "  PHP can ONLY read inside those paths. A config outside them is\n";
    echo "  invisible even when it exists. The private directory is normally allowed.\n";
}

echo "\nLooking for tdw-config.php in these exact places:\n";
$found = null;
foreach ($candidates as $path) {
    // realpath() returns false for a file that does not exist, so resolve the
    // directory instead. The whole point here is naming the exact folder.
    $dir = realpath(dirname($path));
    $shown = $dir === false ? $path : $dir . '/' . basename($path);
    if (is_readable($path)) {
        echo "  FOUND      " . $shown . "\n";
        if ($found === null) {
            $found = $path;
        }
    } elseif (file_exists($path)) {
        echo "  UNREADABLE " . $shown . "  (fix its permissions, 644 is fine)\n";
    } else {
        echo "  not here   " . $shown . "\n";
    }
}

// Catch the two most common near-misses.
foreach ($candidates as $path) {
    $stray = dirname($path) . '/tdw-config.example.php';
    if (file_exists($stray) && !file_exists($path)) {
        $dir = realpath(dirname($path));
        echo "\n  NOTE: found tdw-config.example.php in " . ($dir === false ? dirname($path) : $dir)
            . "\n        Rename it to tdw-config.php, dropping the .example part.\n";
    }
}

echo "\nConfig file: ";
if ($found === null) {
    echo "NOT FOUND\n";
    echo "  Put it at the FIRST path listed above, inside the private directory.\n";
    echo "  That folder sits outside the web root, so the key cannot be downloaded,\n";
    echo "  and control panels that set open_basedir still let PHP read it.\n";
} else {
    $config = require $found;
    $key = is_array($config) && !empty($config['api_key']) ? (string) $config['api_key'] : '';
    if ($key === '') {
        echo "found, but it has no api_key value\n";
    } elseif (str_contains($key, 'REPLACE-ME')) {
        echo "found, but the api_key is still the placeholder\n";
    } elseif (!str_starts_with($key, 'sk-ant-')) {
        echo "found, but the api_key does not look like an Anthropic key\n";
    } else {
        echo "found, api_key set (" . strlen($key) . " characters)  OK\n";
    }

    if (str_contains(str_replace('\\', '/', (string) realpath($found)), '/public_html/')) {
        echo "  WARNING: this config sits inside public_html. It works, but move it\n";
        echo "  one level above public_html so it stays out of the web root.\n";
    }
}

echo "\nOutbound HTTPS: ";
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

echo "\nWhen every line says OK, delete this file and use index.html.\n";
