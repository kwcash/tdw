<?php
/**
 * Only needed for the open reading at ai.html. The ten-question reading at
 * index.html needs no key and no config.
 *
 * Rename this file to tdw-config.php and upload it ONE LEVEL ABOVE
 * public_html, so it sits at:
 *
 *   /home/<user>/web/totaldomainwar.com/tdw-config.php
 *
 * Nothing outside public_html is reachable from the web, so the key in here
 * cannot be downloaded by a visitor. Do not put this file inside public_html
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
