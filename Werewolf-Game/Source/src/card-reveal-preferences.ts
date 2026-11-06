/** Device-only preferences, deliberately separate from match snapshots and legacy effects. */
export const CARD_REVEAL_PREFERENCES_KEY='werewolf.card-reveal.v1';
export type CardRevealPreferences={enabled:boolean;volume:number};
export function normalizeCardRevealPreferences(value:unknown,initialEnabled=true):CardRevealPreferences {
  const input=value&&typeof value==='object'?value as Record<string,unknown>:{};
  return {enabled:typeof input.enabled==='boolean'?input.enabled:initialEnabled,volume:typeof input.volume==='number'&&Number.isFinite(input.volume)?Math.round(Math.max(0,Math.min(100,input.volume))):50};
}
/** Independent entropy: never consumes or seeds the gameplay randomizer. */
let fallbackCounter=0;
export function revealRandomIndex(count:number):number {
  if(count<=1)return 0;
  try {
    const limit=Math.floor(0x100000000/count)*count,word=new Uint32Array(1);
    for(let attempt=0;attempt<8;attempt++){
      globalThis.crypto.getRandomValues(word);
      if(word[0]<limit)return word[0]%count;
    }
  }catch{/* Deterministic independent fallback for browsers without crypto. */}
  return fallbackCounter++%count;
}
