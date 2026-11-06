/** New-match preference bounds. Recovered active deadlines are deliberately not rewritten. */
export function normalizeDiscussionMinutes(value:unknown):number {
  return typeof value==='number' && Number.isFinite(value) ? Math.max(0.5,Math.min(3,Math.round(value*2)/2)) : 1;
}
export function discussionTimeLabel(seconds:number):string {
  const minutes=Math.floor(seconds/60),rest=seconds%60;
  return [minutes?`${minutes} ${minutes===1?'minute':'minutes'}`:'',rest?`${rest} seconds`:''].filter(Boolean).join(' ');
}
