# Werewolf — launch-ready game

Latest prepared game release: **922fb159607f**.

- `index.html` is a tiny relative launcher into `Werewolf-Game/Website/`.
- `Werewolf-Game/Website/` is the complete built game: no API, secrets, database,
  npm install, build, or backend needed to host it. Relative project URLs work.
- `Werewolf-Game/Source/` contains editable source, tests and reproducible scripts.
- `Werewolf-Game/GITHUB-PAGES-HANDOFF.md` documents the separate root-ready launch ZIP.

## GitHub Pages when you are ready to publish

This commit prepares the site; it does **not** enable Pages or deploy anything.
In Settings → Pages, use **Deploy from a branch**, select the branch containing
this version (`arena/091ce6f8-werewolf` for this saved version), and **/(root)**.
The root launcher opens the complete Website subfolder without copying assets.
Use the URL GitHub provides. There is no competing deployment workflow.

The separate Drive launch ZIP instead places `index.html` and every game asset
directly at its ZIP root. Either hosting layout works; do not mix their workers.

## Edit or test after a fresh clone — Node.js 22+

Large shared assets are tracked once in Website, not duplicated in Source/public.
Restore the exact verified source copies first (idempotent, no downloads):

```sh
node Werewolf-Game/RESTORE-SOURCE-ASSETS.mjs
cd Werewolf-Game/Source
npm ci
npm run test:unit
npm run build
```

The restore refuses damaged assets or overwriting modified source files. It does
not contain match data, private messages, credentials or browser storage.

## Latest changes

- DEAD/ESCAPED badges live inside square target photos; no extra status row.
- Unique compact role symbols on selected private night targets only (Doctor cross,
  original Werewolf claw). No public hidden-role markers or invented passive actions.
- Regular button audio alone raised +9.54dB, with mute/volume controls and headroom.
- Previously prepared ballot clips, elimination priority, Muter, death scoring,
  avatar originals, pack privacy and saved-match recovery preserved.

Validation: 775 unit tests and 55 focused UI tests; native-browser checks cover
markers/layout/privacy/axe, feedback levels/fallback, ballots, phases, elimination,
recovery and Muter. This is not a claim of a full UI-suite or physical-device audit.
