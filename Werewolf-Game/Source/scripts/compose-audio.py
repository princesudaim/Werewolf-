#!/usr/bin/env python3
"""NIGHTFALL effects only: buttons, events and brief celebrations.
Deterministic synthesis, not field recordings or downloaded commercial samples.
Render-only dependencies: scripts/audio-requirements.txt. Runtime needs neither.
"""
import hashlib
import json
from pathlib import Path
import wave
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/werewolf/audio/v3'
SR=24000
RNG=np.random.default_rng(20261104)
# Short mono PCM effects; no background audio.
WINS={
 'wolf':[50,57,62], 'village':[55,59,62,67], 'jester':[60,63,67],
 'serialkiller':[48,55,60], 'raven':[57,60,64], 'whitewolf':[53,60,65],
 'mindflayer':[51,58,63], 'friends':[60,64,67], 'wolf-friends':[50,57,62,66],
 'draw':[53,50],
}
CUES={
 'tap':(.10,[55]),'confirm':(.20,[60,64]),'invalid':(.17,[50,48]),
 'select':(.12,[57]),'add':(.19,[57,60]),'remove':(.19,[57,53]),
 'randomize':(.30,[55,60,57]),'navigate':(.15,[55,57]),
 'start':(.65,[48,55,60]),'handoff':(.15,[55]),'reveal':(.20,[57,60]),
 'discussion':(.30,[55,60]),'warning':(.25,[60,60]),'time-up':(.40,[55,60,64]),
 'vote-open':(.32,[50,55]),'elimination':(.42,[48,43]),'divided':(.32,[53,55]),
 'mvp':(.55,[60,64,67]),
}
for side,notes in WINS.items():CUES['win-'+side]=(.70 if side=='draw' else 1.20,notes)

def smooth_noise(length,cutoff=1200):
 # FFT-domain rolloff, zero DC, periodic by construction. No audio RNG in gameplay.
 freqs=np.fft.rfftfreq(length,1/SR)
 spectrum=RNG.normal(size=len(freqs))+1j*RNG.normal(size=len(freqs))
 spectrum*=1/np.sqrt(np.maximum(freqs,45))
 spectrum*=1/(1+(freqs/cutoff)**6)
 spectrum[0]=0
 wave=np.fft.irfft(spectrum,n=length)
 return wave/max(np.std(wave),1e-12)

def envelope(t,duration,attack=.02,release=.06):
 return np.minimum(1,t/attack)*np.minimum(1,(duration-t)/release)

def soft_note(midi,duration):
 t=np.arange(max(1,int(duration*SR)))/SR;f=440*2**((midi-69)/12)
 env=(1-np.exp(-t/.025))*np.exp(-t/.18)*np.minimum(1,(duration-t)/.065)
 return (np.sin(2*np.pi*f*t)+.10*np.sin(4*np.pi*f*t)*np.exp(-t*8))*env

def finish_cue(buf,target=.036):
 buf-=buf.mean();fade=min(int(.015*SR),len(buf)//4)
 buf[:fade]*=np.linspace(0,1,fade);buf[-fade:]*=np.linspace(1,0,fade)
 buf*=min(target/max(float(np.sqrt(np.mean(buf**2))),1e-12),.24/max(float(abs(buf).max()),1e-12))
 return buf

def cue(key,duration,notes):
 buf=np.zeros(int(duration*SR));spacing=min(.14,(duration-.12)/max(1,len(notes)))
 for i,note in enumerate(notes):
  when=i*spacing;remaining=duration-when
  sig=soft_note(note,min(.45,remaining));start=int(when*SR)
  buf[start:start+len(sig)]+=sig*.22
 if key.startswith('win-') and key!='win-draw':
  # Two quiet, filtered applause-like claps: a celebration, not a result-song loop.
  for when in [.48,.72]:
   d=.11;x=np.arange(int(d*SR))/SR
   clap=smooth_noise(len(x),1700)*np.sin(np.pi*x/d)**2*np.exp(-x*12)
   start=int(when*SR);buf[start:start+len(x)]+=clap*.025
 return finish_cue(buf,.032 if key in ['tap','select','navigate'] else .038)

if __name__=='__main__':
 OUT.mkdir(parents=True,exist_ok=True)
 catalog={'edition':'nightfall-shared-wins-20261104','sampleRate':SR,'music':{},'cues':{},'provenance':'Original short interaction, event, winner and MVP effects. No animal sounds, background music or ambience.'}
 for old in [*OUT.glob('music-*.wav'),OUT/'cues-rooster.wav']:
  if old.exists():old.unlink()
 entries = [('cues',key,cue(key,*spec)) for key,spec in CUES.items()]
 for group,key,buf in entries:
  file=OUT/(group+'-'+key+'.wav');pcm=np.round(buf*32767).astype('<i2')
  with wave.open(str(file),'wb') as w:w.setparams((1,2,SR,0,'NONE','not compressed'));w.writeframes(pcm.tobytes())
  data=file.read_bytes();catalog[group][key]={'file':'./werewolf/audio/v3/'+file.name,'seconds':round(len(buf)/SR,4),'peak':round(float(abs(buf).max()),6),'rms':round(float(np.sqrt(np.mean(buf**2))),6),'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)}
  print(group,key,len(data),flush=True)
 (ROOT/'src/audio-catalog.json').write_text(json.dumps(catalog,indent=2)+'\n')
 # Update the asset-only part of the worker without changing activation/repair policy.
 sw=ROOT/'public/sw.js';text=sw.read_text();import re
 match=re.search(r'const CORE = (\[[\s\S]*?\]);',text)
 core=json.loads(re.sub(r',\s*\]',']',match[1]));core=[p for p in core if not p.startswith('werewolf/audio/')]
 core += [v['file'][2:] for group in ['music','cues'] for v in catalog[group].values()]
 sw.write_text(text[:match.start(1)]+json.dumps(core,indent=2)+text[match.end(1):])
 print('Rendered',len(catalog['cues']),'short cues; no background music or ambience.')
