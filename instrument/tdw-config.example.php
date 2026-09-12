<?php
/**
 * Only needed for the open reading at index.html. The ten-question reading at
 * questions.html needs no key and no config.
 *
 * Rename this file to tdw-config.php and upload it into the private
 * directory, so it sits at:
 *
 *   /home/<user>/web/totaldomainwar.com/private/tdw-config.php
 *
 * That directory is outside the web root, so the key in here cannot be
 * downloaded by a visitor. Use it rather than the domain root: control panels
 * that set open_basedir allow private but not the domain root, and a config
 * PHP cannot read reports as missing. Do not put this file inside public_html
 * and do not commit the filled-in version to git.
 */

return [
    'api_key' => 'sk-ant-REPLACE-ME',

    // Optional. Defaults to claude-opus-5.
    'model' => 'claude-opus-5',

    // Optional. How hard the model works per reading, which is the main cost
    // control. One of low, medium, high, xhigh, max. Defaults to medium.
    // Drop to low to roughly halve the spend per reading.
    'effort' => 'medium',
];
