<?php
/**
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

    // Optional. Defaults to claude-sonnet-5 if omitted.
    'model' => 'claude-sonnet-5',
];
