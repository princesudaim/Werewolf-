#!/usr/bin/env python3
"""Create a self-contained backup and root-ready GitHub Pages ZIP after npm run build.
Shared assets are stored once in the full backup to stay below Drive's upload cap.
Nothing is uploaded, pushed, deployed, or removed by this script.
"""
from pathlib import Path
import argparse, datetime, hashlib, json, re, zipfile
from zoneinfo import ZoneInfo

source = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path, default=source.parents[1] / '.cache' / 'backups')
args = parser.parse_args()
output = args.output.resolve()
output.mkdir(parents=True, exist_ok=True)
dist = source / 'dist'
sha = lambda data: hashlib.sha256(data).hexdigest()
worker = (dist / 'sw.js').read_text()
revision = re.search(r'const CACHE = PREFIX \+ "([^"]+)";', worker)[1]
digests = json.loads(re.search(r'const DIGESTS = (\{.*\});', worker)[1])
for name, expected in digests.items():
    data = (dist / ('index.html' if name == './' else name)).read_bytes()
    assert expected == {'sha256': sha(data), 'size': len(data)}, name
stamp = datetime.datetime.now(ZoneInfo('Asia/Karachi')).strftime('%Y-%m-%d_%H-%M-%S_PKT')
site_files = {p.relative_to(dist).as_posix(): p.read_bytes() for p in dist.rglob('*')
              if p.is_file() and p.name != 'Werewolf-Game.zip'}
with zipfile.ZipFile(dist / 'Werewolf-Game.zip') as old:
    assert old.testzip() is None
    original_backup = {i.filename: old.read(i) for i in old.infolist() if not i.is_dir()}
for name, data in site_files.items():
    assert original_backup['Werewolf-Game/Website/' + name] == data
# Check editable code, assets, tests and packaging scripts against this exact build.
for folder in ['src', 'public', 'tests', 'scripts']:
    for p in (source / folder).rglob('*'):
        if p.is_file():
            assert original_backup['Werewolf-Game/Source/' + p.relative_to(source).as_posix()] == p.read_bytes(), p

handoff = f'''# Werewolf — GitHub Pages ready — {revision}

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

Release `{revision}` also changes the former Muted role to **Muter**. Muter can
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
'''
release = {'revision': revision, 'offline_entries': len(digests),
           'website_files': {name: {'size': len(data), 'sha256': sha(data)} for name, data in sorted(site_files.items())},
           'github_deployment_performed': False, 'private_browser_data_included': False,
           'launch_layout': 'index.html and assets at ZIP root; Pages deploy-from-branch /(root)',
           'full_backup_shared_assets': 'Run node Werewolf-Game/RESTORE-SOURCE-ASSETS.mjs before building Source'}
launch_files = dict(site_files)
launch_files.update({'.nojekyll': b'', 'README-LAUNCH.md': handoff.encode(),
                     'COPILOT-HANDOFF.md': handoff.encode(),
                     'RELEASE.json': (json.dumps(release, indent=2) + '\n').encode()})
assert 'index.html' in launch_files and not any(p.startswith('site/') for p in launch_files)
backup_files = dict(original_backup)
shared = []
for name, data in sorted(list(backup_files.items())):
    prefix = 'Werewolf-Game/Source/public/'
    if not name.startswith(prefix):
        continue
    counterpart = 'Werewolf-Game/Website/' + name[len(prefix):]
    if backup_files.get(counterpart) == data:
        shared.append({'destination': name[len('Werewolf-Game/'):],
                       'source': counterpart[len('Werewolf-Game/'):],
                       'size': len(data), 'sha256': sha(data)})
        del backup_files[name]
restore = '''// Self-contained, byte-preserving restore of deduplicated source assets.
// Run after extracting the FULL backup, before building Source. Node.js 22+.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=new URL('./',import.meta.url);
const entries=JSON.parse(await readFile(new URL('SHARED-SOURCE-ASSETS.json',root),'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const verified=[];
for(const item of entries){
 if(!item.source.startsWith('Website/')||!item.destination.startsWith('Source/public/')||[item.source,item.destination].some(p=>p.includes('..')||p.includes('\\\\')))throw Error('Unsafe asset path');
 const bytes=await readFile(new URL(item.source,root));
 if(bytes.length!==item.size||sha(bytes)!==item.sha256)throw Error('Backup asset damaged: '+item.source);
 const target=new URL(item.destination,root);let existing;
 try{existing=await readFile(target);}catch(e){if(e.code!=='ENOENT')throw e;}
 if(existing&&(existing.length!==item.size||sha(existing)!==item.sha256))throw Error('Refusing to overwrite modified source asset: '+item.destination);
 verified.push({target,bytes});
}
for(const {target,bytes}of verified){await mkdir(dirname(fileURLToPath(target)),{recursive:true});await writeFile(target,bytes);}
console.log('Restored and verified '+verified.length+' original source assets. Source/public is complete.');
'''
backup_files.update({'Werewolf-Game/RESTORE-SOURCE-ASSETS.mjs': restore.encode(),
                     'Werewolf-Game/SHARED-SOURCE-ASSETS.json': (json.dumps(shared, indent=2)+'\n').encode(),
                     'Werewolf-Game/GITHUB-PAGES-HANDOFF.md': handoff.encode(),
                     'Werewolf-Game/START-HERE.txt': ('FULL GAME BACKUP — '+revision+'\n\nWebsite/ is complete and ready to host.\nBefore editing/building Source/, run:\n  node Werewolf-Game/RESTORE-SOURCE-ASSETS.mjs\nfrom the extraction parent (or node RESTORE-SOURCE-ASSETS.mjs inside Werewolf-Game).\nShared assets are stored once in Website to stay below Drive\'s upload limit.\nThe restore copies exact verified original bytes into Source/public.\nRead GITHUB-PAGES-HANDOFF.md. The separate launch ZIP is easier for Pages.\nNo private browser/match data is included.\n').encode()})
# Verify the complete original backup is recoverable from physical files + map.
restored = dict(backup_files)
for item in shared:
    data = backup_files['Werewolf-Game/'+item['source']]
    assert len(data) == item['size'] and sha(data) == item['sha256']
    restored['Werewolf-Game/'+item['destination']] = data
for name, data in original_backup.items():
    if name != 'Werewolf-Game/START-HERE.txt':
        assert restored[name] == data, name
packages = []
for label, files in [('Full-Game-Backup', backup_files), ('GitHub-Pages-Final-Launch', launch_files)]:
    path = output / f'Werewolf-Game_{stamp}_{revision}_{label}.zip'
    if path.exists():
        raise FileExistsError(f'Never overwrite a previous save: {path}')
    with zipfile.ZipFile(path, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for name, data in sorted(files.items()):
            z.writestr(name, data)
    with zipfile.ZipFile(path) as z:
        assert z.testzip() is None
        assert set(z.namelist()) == set(files)
        for name, data in files.items():
            assert z.read(name) == data, name
    assert path.stat().st_size <= 104857600, f'Split/compress before upload; too large: {path}'
    data = path.read_bytes()
    packages.append({'kind': label, 'file_path': str(path), 'name': path.name,
                     'size': len(data), 'md5': hashlib.md5(data).hexdigest(), 'sha256': sha(data),
                     'entries': len(files)})
receipt = {'revision': revision, 'created_at': stamp, 'packages': packages,
           'prior_backups_preserved': True, 'crc_and_every_entry_verified': True,
           'full_backup_restorable_original_files': len(original_backup),
           'shared_assets_stored_once': len(shared), 'shared_source_restore_verified': True,
           'runtime_files': len(site_files), 'offline_entries': len(digests)}
(output / 'final-launch-packages.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(receipt, indent=2))
