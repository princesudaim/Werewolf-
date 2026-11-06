# Werewolf — GitHub Pages ready — 922fb159607f

## Which ZIP to use

Use the **GitHub-Pages-Final-Launch.zip**, not the Full-Game-Backup ZIP.
Extract it first. `index.html`, `sw.js`, `werewolf/`, `audio/`, the icons,
`manifest.webmanifest` and `.nojekyll` belong at the SAME level in the repository.
Do not upload the ZIP itself or put everything inside an extra ZIP-name folder.
No npm install, build, server, database, secret, or API key is needed to host it.

## Simple GitHub website upload

1. Open the chosen repository and its intended publishing branch, usually `main`.
2. Add files → Upload files: upload the EXTRACTED CONTENTS at repository root,
   keeping the `werewolf/` and `audio/` directories intact. Preserve unrelated
   repository files. Include `.nojekyll` (it is hidden on some computers).
3. Check that `index.html` is directly at root, not in `site/`, `Website/`,
   `Source/`, or an extra outer folder. Commit only with the owner's approval.
4. Repository Settings → Pages → Build and deployment → Source:
   **Deploy from a branch** → choose the approved branch and **/(root)** → Save.
5. Wait for GitHub's Pages deployment to finish. Open the actual URL shown in
   Settings → Pages. Project-subdirectory URLs are supported.

If this repository already deploys through GitHub Actions, review its workflow
first. Keep ONE intended publisher. With owner approval either configure that
workflow to publish these root files, or use the simple branch/root method above.
This ZIP intentionally does not add a competing deployment workflow.
GitHub permissions, private-repository Pages restrictions, and account limits
must be resolved by the owner. Never ask for passwords or access tokens.

## Instructions for GitHub Copilot

Copy the extracted launch contents into the approved repository root unchanged.
Do not regenerate/minify assets: the offline worker validates exact SHA-256/size.
Check Pages source and any existing workflows before proposing deployment.
Ask before committing, pushing, merging, deleting unrelated files or deploying.
Do not rename or switch an Arena session branch. Never invent the live URL.
Check avatars, role handoffs, Settings, audio, discussion/voting, results/MVP,
START AGAIN, and an offline reopen after the first complete online download.

## Offline use and existing games

First visit online and allow the offline files to finish downloading. At the menu,
Settings → OFFLINE & UPDATES shows the controls. Close all game tabs/app windows
and reopen before relying on offline play or taking an update. Do not clear
storage or force a refresh/update during an active match. Recovery remains local,
opt-in, private plaintext data with a fixed 24-hour lifetime; it is not in Drive.

## Release

Release `922fb159607f` also changes the former Muted role to **Muter**. Muter can
speak and choose another living player at night to silence for the following day.
The morning names the muted player; voting/night abilities remain usable. Silence
expires at the next night, and Police blocking/corruption prevent it. Saved matches
and settings remain compatible. Muter has an estimated power of 4/10, feeds both
randomizers, and is an eligible Madman disguise (fake silence has no effect).
Effective opponent silence earns +2 MVP; ally silence is -2; cancelled/skipped
actions earn nothing. Role details, reference descriptions and audit docs agree.

This release includes the seven supplied ORIGINAL photo files in displayed
avatar slots 1, 2, 3, 5, 6, 7 and 8. Number 4 and the other unselected avatars are
unchanged. Old saved portrait paths resolve to the corresponding new photos.
There are still 19 avatars. No cropping, resizing, re-encoding or AI editing was
applied to the supplied files; the existing avatar UI controls only display size.
All earlier gameplay and sound features, including reveal, night/discussion,
voted-out, final-result and morning-death one-shots/settings, remain included.
There is no Download Game button, looping music or animal ambience.
`RELEASE.json` records every original runtime file hash. Chromium tests are not a
physical-device certification. Confirm rights to distribute supplied photos,
artwork, sounds and fonts before making a public site.

## Full backup

The separate Full-Game-Backup ZIP contains ready-to-host `Werewolf-Game/Website/`,
editable code/tests/scripts under `Werewolf-Game/Source/`, and every required asset.
To avoid storing identical assets twice and exceed neither Drive's upload limit
nor unnecessarily inflate the backup, shared source assets are stored ONCE in
Website. After extracting the FULL backup, before editing/building Source, run:

    node Werewolf-Game/RESTORE-SOURCE-ASSETS.mjs

Node.js 22 is needed for source development anyway. The offline restore script
copies the original asset bytes back to Source/public and verifies SHA-256/size;
it never overwrites a conflicting modified source asset. No internet is needed.
The ready-built Website works immediately, without running this restore step.
Then in Source run `npm ci`, `npx tsc --noEmit`, tests and `npm run build`.
Private browser profiles, uploaded player photos, rankings, match saves,
node_modules, caches and environment secrets are NOT included.
