# Maintained sources

Edit these files and nothing in `out/`. Then run `python3 build.py` from the workspace and `bash run_checks.sh`.

- `engine.js` is the game engine. The engine is frozen. A change to it needs the owner's decision and a test against the previous engine, as `test/tier7.test.js` does.
- `shim.js` answers the page's `/api` calls in the browser and keeps the save in local storage.
- `app.js` is the page frame, the router and the older study pages.
- `board.js` is the board, the operations, the records and every page added since version 9. It holds the placeholder `__HELP__`.
- `help.json` holds every piece of help text the bundle shows. `build.py` puts it in place of `__HELP__`.
- `record.js` makes and checks result codes.
- `style.css` is the one stylesheet.

`build.py` joins the four script parts in that order into `out/game.js`. It writes `out/engine.js`, `out/record.js` and `parts/style.css` as well. The first check in `run_checks.sh` fails if `out/` is not what these sources make.
