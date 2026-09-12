<?php
/**
 * The Instrument: reads a submitted situation through the Total Domain War
 * framework. Runs server-side so the API key never reaches the browser.
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

const MAX_STORY_CHARS = 6000;
const RATE_LIMIT_MAX = 8;
const RATE_LIMIT_WINDOW = 900; // 15 minutes

function fail(int $status, string $message): void
{
    http_response_code($status);
    echo json_encode(['error' => $message]);
    exit;
}

/**
 * Places tdw-config.php may live, best first. The private directory comes
 * first because control panels that set open_basedir (Hestia among them)
 * allow it but not the domain root, so a config above public_html is
 * invisible to PHP even when it is present and readable.
 */
function config_paths(): array
{
    return [
        __DIR__ . '/../../private/tdw-config.php',
        __DIR__ . '/../../tdw-config.php',
        __DIR__ . '/../tdw-config.php',
    ];
}

function load_config(): array
{
    static $config = null;

    if ($config === null) {
        $config = [];
        foreach (config_paths() as $path) {
            if (is_readable($path)) {
                $loaded = require $path;
                if (is_array($loaded)) {
                    $config = $loaded;
                    break;
                }
            }
        }
    }

    return $config;
}

function load_api_key(): string
{
    $config = load_config();
    if (!empty($config['api_key'])) {
        return (string) $config['api_key'];
    }

    $fromEnv = getenv('ANTHROPIC_API_KEY');
    if (is_string($fromEnv) && $fromEnv !== '') {
        return $fromEnv;
    }

    error_log('TDW instrument: no config found. open_basedir=' . (ini_get('open_basedir') ?: 'not set')
        . ' tried=' . implode(', ', config_paths()));
    fail(500, 'The instrument is not configured yet.');
}

function load_model(): string
{
    $config = load_config();
    return !empty($config['model']) ? (string) $config['model'] : 'claude-opus-5';
}

function load_effort(): string
{
    $config = load_config();
    return !empty($config['effort']) ? (string) $config['effort'] : 'medium';
}

/**
 * File-backed per-IP throttle. This is the only cost guard in front of a paid
 * API on a public form, so it fails closed if the store cannot be written.
 */
function enforce_rate_limit(): void
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $file = sys_get_temp_dir() . '/tdw-rate-' . hash('sha256', $ip) . '.json';
    $now = time();

    $handle = @fopen($file, 'c+');
    if ($handle === false) {
        return;
    }

    if (flock($handle, LOCK_EX)) {
        $raw = stream_get_contents($handle);
        $hits = json_decode($raw ?: '[]', true);
        if (!is_array($hits)) {
            $hits = [];
        }

        $hits = array_values(array_filter($hits, static function ($t) use ($now) {
            return is_int($t) && ($now - $t) < RATE_LIMIT_WINDOW;
        }));

        if (count($hits) >= RATE_LIMIT_MAX) {
            flock($handle, LOCK_UN);
            fclose($handle);
            fail(429, 'Too many requests. Try again in a few minutes.');
        }

        $hits[] = $now;
        ftruncate($handle, 0);
        rewind($handle);
        fwrite($handle, json_encode($hits));
        fflush($handle);
        flock($handle, LOCK_UN);
    }

    fclose($handle);
}

const SYSTEM_PROMPT = <<<'PROMPT'
You are the Instrument, a reading tool built on the framework from the book Total Domain War.

The framework has three layers.

Ten dimensions, the physics of the conflict: Time (the horizon), Entropy (disorder), Topology (network shape), Asymmetry (existing leverage imbalance), Agency (capture of a rival's own institutions), Resonance (moving belief rather than interest), Phase (synchronization across domains), Gradient (pressure engineered on purpose), Criticality (tipping points and chokepoints), Coherence (alignment of all institutions toward one aim, the master dimension).

Twelve domains, the battlefields, in this fixed order: Kinetic, Economic, Financial, Information, Psychological, Legal, Association, Cyber, Cultural, AI and Cognitive, Biological, Data and Surveillance.

Thirty-six stratagems, grouped in six: Superiority, Confrontation, Attack, Confusion, Control, Desperate Situations. Stratagem 35, Chain the Stratagems, is the meta-layer: a single stratagem is dangerous, chained they are decisive.

A user will submit a story: a situation, a negotiation, a market move, a piece of news, a personal account, anything. Read it the way the book reads a case. Do not assume the Chinese Communist Party is involved unless the story actually names or clearly implies that actor; the framework is general, the Party is only the book's running example of an actor who has mastered it.

Reply in exactly this structure, using these headings:

## Dimensions in play
Name only the dimensions the story actually shows evidence for, most load-bearing first. One or two sentences each, tied to a specific detail in the story, not the abstract definition.

## Domains engaged
Name only the domains the story actually touches, in the fixed order above. One sentence each.

## Stratagem
Name the single stratagem (or, if the story shows a sequence, the chain) that best names the pattern. State it plainly, then explain the fit in two or three sentences.

## The read
Two or three sentences stating, in plain terms, who holds the advantage in this situation and why, using the dimensions above as the reasoning, not just the outcome.

## The counter
One concrete, actionable paragraph: what the disadvantaged party could actually do, aimed at the dimension that is actually failing, not a generic recommendation.

House style, follow it exactly: active voice, name the actor. No em dashes, use separate sentences or a plain connector. Maximum two commas per sentence. No colons or semicolons in body prose. Cut any word that does not advance the point. If the Chinese Communist Party is genuinely the actor in the story, call it the Chinese Communist Party, the Party, or Beijing, never "China" or "the Chinese." If the story is too thin to support a section, say so briefly in that section rather than inventing detail.
PROMPT;

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    fail(405, 'Use POST.');
}

if (!function_exists('curl_init')) {
    fail(500, 'The instrument cannot reach the API from this server.');
}

$raw = file_get_contents('php://input');
$payload = json_decode($raw ?: '', true);
$story = is_array($payload) && isset($payload['story']) ? trim((string) $payload['story']) : '';

if ($story === '') {
    fail(400, 'Submit a story first.');
}
if (mb_strlen($story) > MAX_STORY_CHARS) {
    fail(400, 'Keep it under ' . MAX_STORY_CHARS . ' characters.');
}

enforce_rate_limit();

$apiKey = load_api_key();

// Opus 5 runs adaptive thinking by default, and thinking tokens count toward
// max_tokens. 1200 would truncate the reply mid-section, so leave real headroom
// and let effort control the spend instead.
//
// The request streams. A model that thinks before answering can take minutes,
// and a silent connection for that long is killed by the web server in front
// of PHP, which reaches the visitor as a 504 rather than as an answer.
$body = json_encode([
    'model' => load_model(),
    'max_tokens' => 4000,
    'output_config' => ['effort' => load_effort()],
    'system' => SYSTEM_PROMPT,
    'messages' => [
        ['role' => 'user', 'content' => $story],
    ],
    'fallbacks' => 'default',
    'stream' => true,
]);

set_time_limit(600);

// Stop anything from holding the response back, and tell nginx not to buffer
// it, so the keepalives below actually reach the browser.
header('X-Accel-Buffering: no');
while (ob_get_level() > 0) {
    ob_end_flush();
}
ob_implicit_flush(true);

$reply = '';
$streamError = null;
$stopReason = '';
$buffer = '';
$lastPing = microtime(true);

/**
 * Anthropic sends server-sent events. Pull the text out as it arrives, and
 * emit a space every couple of seconds so the connection never sits idle.
 * JSON.parse ignores leading whitespace, so the padding costs the caller
 * nothing.
 */
$onChunk = function ($ch, string $chunk) use (&$reply, &$streamError, &$stopReason, &$buffer, &$lastPing): int {
    $length = strlen($chunk);
    $buffer .= $chunk;

    while (($breakAt = strpos($buffer, "\n")) !== false) {
        $line = trim(substr($buffer, 0, $breakAt));
        $buffer = substr($buffer, $breakAt + 1);

        if (strncmp($line, 'data:', 5) !== 0) {
            continue;
        }

        $event = json_decode(trim(substr($line, 5)), true);
        if (!is_array($event)) {
            continue;
        }

        $type = $event['type'] ?? '';
        if ($type === 'content_block_delta' && ($event['delta']['type'] ?? '') === 'text_delta') {
            $reply .= (string) ($event['delta']['text'] ?? '');
        } elseif ($type === 'message_delta' && isset($event['delta']['stop_reason'])) {
            $stopReason = (string) $event['delta']['stop_reason'];
        } elseif ($type === 'error') {
            $streamError = (string) ($event['error']['message'] ?? 'stream error');
        }
    }

    $now = microtime(true);
    if ($now - $lastPing > 2.0) {
        echo ' ';
        flush();
        $lastPing = $now;
    }

    return $length;
};

$ch = curl_init('https://api.anthropic.com/v1/messages');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $body,
    CURLOPT_WRITEFUNCTION => $onChunk,
    CURLOPT_TIMEOUT => 540,
    CURLOPT_HTTPHEADER => [
        'content-type: application/json',
        'x-api-key: ' . $apiKey,
        'anthropic-version: 2023-06-01',
        // Visitors submit arbitrary text, so a safety refusal is a real case.
        // Server-side fallback routes it to another model instead of failing.
        'anthropic-beta: server-side-fallback-2026-07-01',
    ],
]);

$ok = curl_exec($ch);
$status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$curlError = curl_error($ch);
curl_close($ch);

// Output has already started, so the status code is fixed at 200. Errors ride
// in the body instead, and the caller checks for them either way.
if ($ok === false && $reply === '') {
    error_log('TDW instrument: request failed. ' . $curlError);
    echo json_encode(['error' => 'The instrument failed to respond. Try again shortly.']);
    exit;
}

if ($status < 200 || $status >= 300) {
    error_log('TDW instrument: API returned ' . $status . '. ' . ($streamError ?? ''));
    echo json_encode(['error' => 'The instrument failed to respond. Try again shortly.']);
    exit;
}

if ($stopReason === 'refusal') {
    echo json_encode(['error' => 'The instrument declined to read that one. Try a different situation.']);
    exit;
}

if ($reply === '') {
    error_log('TDW instrument: empty reply. ' . ($streamError ?? 'no error reported'));
    echo json_encode(['error' => 'The instrument returned nothing. Try again shortly.']);
    exit;
}

echo json_encode(['reply' => $reply]);
