import {useSyncExternalStore} from 'react';
import {offlineMonitor,type OfflineMonitor} from './offline-status';
import './offline-notice.css';

export default function OfflineNotice({monitor=offlineMonitor}:{monitor?:Pick<OfflineMonitor,'subscribe'|'getSnapshot'|'check'|'repairMissing'>}) {
  const state=useSyncExternalStore(monitor.subscribe,monitor.getSnapshot,monitor.getSnapshot);
  if(!state.supported)return null;
  const copy={
    checking:'Checking offline files. Keep this page online while setup finishes.',
    ready:'Offline files are present on this device.',
    reopen:'Files downloaded. Close and reopen this game at the menu before relying on offline play.',
    incomplete:'Some offline files are missing. Keep an internet connection; reopening alone may not repair them.',
    unknown:'Offline files could not be checked. Do not rely on offline play yet.',
    error:'Offline setup did not finish. Reopen the game online at the menu to try again.',
  };
  return <section className="offline-notice" aria-labelledby="offline-notice-title">
    <h2 id="offline-notice-title">OFFLINE & UPDATES</h2>
    <p>{copy[state.availability]}</p>
    {state.waiting&&<p className="offline-update"><strong>Update downloaded.</strong> Finish any matches, close all game tabs and installed-app windows, then reopen. Refreshing keeps the current version.</p>}
    {state.installing&&<p>Downloading files. No open game will be refreshed.</p>}
    {state.installFailed&&state.availability!=='error'&&<p>An update could not finish downloading. No forced update was requested.</p>}
    {state.canRepair&&(state.availability==='incomplete'||state.repairState!=='idle')&&<details className="offline-repair"><summary>Restore missing files</summary><p>Download only this version's missing files. Recovery saves, profiles and rankings will not be erased. No page will be refreshed. A newer host version may not have the files this version needs.</p><button type="button" aria-disabled={state.availability!=='incomplete'||state.repairState==='working'||state.workerRepairing} onClick={()=>{if(state.availability==='incomplete'&&state.repairState!=='working'&&!state.workerRepairing)monitor.repairMissing();}}>DOWNLOAD MISSING FILES</button></details>}
    {state.repairState==='working'&&<p>Downloading missing files. Keep this page open if possible.</p>}
    {state.repairState==='done'&&<p>Missing files restored. No saved match data was changed.</p>}
    {state.repairState==='version'&&<p>The host has different file contents. No newer files were mixed into this version. Wait for an update or try again when this version is available.</p>}
    {state.repairState==='failed'&&<p>Repair could not finish. Keep an internet connection and try again. Some verified files may have been restored; saved match data was not erased.</p>}
    {state.repairState==='uncertain'&&<p>The repair result could not be confirmed. A download may still be running. Check the files again before retrying.</p>}
    <details><summary>About offline play</summary><p>This checks that the current worker has its expected files, not audio playback or file integrity. Your browser can remove these files later.</p><p>Offline files are not a saved match. Recovery is a separate choice for each match, lasts 24 hours and stores private roles and messages on this device.</p></details>
    <button type="button" aria-disabled={['checking','error'].includes(state.availability)} onClick={()=>{if(!['checking','error'].includes(state.availability))monitor.check();}}>CHECK OFFLINE FILES</button>
  </section>;
}
