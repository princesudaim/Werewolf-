"""Boost only feedback-button fallback recordings by 3x (+9.54dB), without changing scene cues."""
from pathlib import Path
import array,hashlib,json,math,sys,wave
root=Path(__file__).resolve().parents[1];original=json.loads((root/'src/audio-catalog.json').read_text())
result={'edition':'button-only-3x-v1','gain':3,'gain_db':20*math.log10(3),'cues':{}}
for key in ['tap','confirm','invalid','select','add','remove','randomize','navigate']:
 cue=original['cues'][key];p=root/'public'/cue['file'][2:];data=p.read_bytes();assert hashlib.sha256(data).hexdigest()==cue['sha256']
 with wave.open(str(p),'rb') as w:
  params=w.getparams();assert w.getsampwidth()==2;pcm=array.array('h',w.readframes(w.getnframes()))
 if sys.byteorder!='little':pcm.byteswap()
 boosted=array.array('h',(x*3 for x in pcm));assert max(abs(x) for x in boosted)<32767
 if sys.byteorder!='little':boosted.byteswap()
 target=root/f'public/werewolf/audio/buttons/v1/button-{key}.wav';target.parent.mkdir(parents=True,exist_ok=True)
 with wave.open(str(target),'wb') as w:w.setparams(params);w.writeframes(boosted.tobytes())
 result['cues'][key]={'file':'./'+target.relative_to(root/'public').as_posix(),'seconds':cue['seconds'],'source_sha256':cue['sha256'],'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'bytes':target.stat().st_size,'peak':round(max(abs(x) for x in pcm)*3/32768,6)}
(root/'src/button-audio-catalog.json').write_text(json.dumps(result,indent=2)+'\n')
