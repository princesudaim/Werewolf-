#!/usr/bin/env python3
"""Prepare five game-end cues: remove leading dead air, then first <=7 seconds, no padding or added delay.
Requires the same numpy/pyloudnorm/imageio-ffmpeg tools as prepare-card-reveals.py.
Example: PYTHONPATH=.cache/audio-tools python ... --input google_drive
Only creates game-end assets/catalog and adds their offline entries. Other audio is untouched.
"""
import argparse
import hashlib
import importlib.util
import json
import re
import subprocess
import wave
from pathlib import Path
import numpy as np
import imageio_ffmpeg

ROOT=Path(__file__).resolve().parents[1]
SR=48000
TARGET=-12.
SOURCES={'game-end-01': ('boop.mp3', '02727bb6f35a7feb581fc0a3a998df11'), 'game-end-02': ('game ends.mp3', '5899263378e12d8152f44c02cd9b9a3f'), 'game-end-03': ('meow meow.MP3', '182b51a64e1a1231c1f654b65a8ff7b8'), 'game-end-04': ('prowl goku.mp3', 'c314edefbba059065513488340d246da'), 'game-end-05': ('skele rosting.mp3', '771b92fb7fad83e5ab72a60a8cf32dd5')}


def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--input',type=Path,required=True);args=parser.parse_args()
 spec=importlib.util.spec_from_file_location('reveal_meter',ROOT/'scripts/prepare-card-reveals.py');meter=importlib.util.module_from_spec(spec);spec.loader.exec_module(meter)
 ff=imageio_ffmpeg.get_ffmpeg_exe()
 def run(extra,data=None):
  return subprocess.run([ff,'-hide_banner','-loglevel','error','-threads','1',*extra],input=data,stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=True).stdout
 def process(audio,filters):
  raw=run(['-f','f32le','-ar',str(SR),'-ac','2','-i','pipe:0','-af',filters,'-f','f32le','-ac','2','pipe:1'],audio.astype('<f4').tobytes())
  result=np.frombuffer(raw,dtype='<f4').reshape(-1,2).astype(float);assert len(result)==len(audio);return result
 def limit(audio,gain):
  return process(audio,f'volume={gain}dB,aresample=192000,alimiter=limit=0.80:attack=5:release=50:level=false:latency=true,aresample=48000')
 out=ROOT/'public/werewolf/audio/game-end/v1';out.mkdir(parents=True,exist_ok=True);cues={}
 for key,(filename,expected_md5) in SOURCES.items():
  path=args.input/filename;original=path.read_bytes();assert hashlib.md5(original).hexdigest()==expected_md5,filename
  raw=run(['-i',str(path),'-ar',str(SR),'-ac','2','-f','f32le','pipe:1']);audio=np.frombuffer(raw,dtype='<f4').reshape(-1,2).astype(float)
  source_frames=len(audio)
  # Find leading dead air after level compensation, preserving 10ms before onset.
  # Do not remove quiet interior gaps or truncate speech; take <=7s from this onset.
  reference=audio[:7*SR];detector_gain=TARGET-meter.loudness_stats(reference)['active_p90']
  hits=np.flatnonzero(np.max(np.abs(reference*10**(detector_gain/20)),axis=1)>=10**(-55/20));assert len(hits)
  source_start_frame=max(0,int(hits[0])-480)
  audio=audio[source_start_frame:source_start_frame+7*SR].copy();frames=len(audio);assert frames>=4800;audio[-240:]*=np.linspace(1,0,240)[:,None]
  initial=TARGET-meter.loudness_stats(audio)['active_p90']
  compressed=process(audio,f'volume={initial}dB,acompressor=threshold=0.1:ratio=2:attack=8:release=100:makeup=1:knee=2.8:link=maximum:detection=rms')
  low,high=-24.,24.
  for _ in range(15):
   mid=(low+high)/2
   if meter.loudness_stats(limit(compressed,mid))['active_p90']<TARGET:low=mid
   else:high=mid
  gain=(low+high)/2;processed=limit(compressed,gain);assert len(processed)==frames
  pcm=np.round(processed*32767).astype('<i2');actual=pcm.astype(float)/32768;stats=meter.loudness_stats(actual)
  assert abs(stats['active_p90']-TARGET)<.08;assert np.max(np.abs(actual))<.999
  dest=out/(key+'.wav')
  with wave.open(str(dest),'wb') as w:w.setparams((2,2,SR,0,'NONE','not compressed'));w.writeframes(pcm.tobytes())
  scan=subprocess.run([ff,'-hide_banner','-i',str(dest),'-af','loudnorm=I=-14:TP=-1:LRA=11:print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
  true_peak=float(json.loads(re.findall(r'\{[^{}]+\}',scan.stderr)[-1])['input_tp']);assert true_peak<=-1.
  cues[key]={'file':'./werewolf/audio/game-end/v1/'+dest.name,'source':filename,'source_md5':expected_md5,'source_sha256':hashlib.sha256(original).hexdigest(),'frames':frames,'source_frames':source_frames,'source_start_frame':source_start_frame,'onset_lead_frames':480,'onset_threshold_dbfs':-55,'seconds':frames/SR,'loop':False,'bytes':dest.stat().st_size,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'target_active_p90':TARGET,'output_stats':{k:round(v,3) for k,v in stats.items()},'true_peak_db':true_peak}
  print(key,cues[key]['seconds'],'seconds, active P90',stats['active_p90'],'dBTP',true_peak,flush=True)
 manifest={'edition':'drive-game-end-20261106-v1','sample_rate':SR,'channels':2,'policy':'One random nonrepeating shot only for a new final-results screen. Leading dead air removed with a 10ms onset safety margin; first <=7s of remaining recording, no padding, no intentional delay, no looping, no old victory/MVP overlap or recovery replay.','cues':cues}
 (ROOT/'src/game-end-audio-catalog.json').write_text(json.dumps(manifest,indent=2)+'\n')
 sw=ROOT/'public/sw.js';text=sw.read_text();match=re.search(r'const CORE = (\[[\s\S]*?\]);',text);core=json.loads(re.sub(r',\s*\]',']',match[1]));core=[p for p in core if not p.startswith('werewolf/audio/game-end/')];core.extend(c['file'][2:] for c in cues.values());sw.write_text(text[:match.start(1)]+json.dumps(core,indent=2)+text[match.end(1):])
 print('PASS: first <=7 seconds without padding, final PCM loudness and true peaks verified; five offline assets added.')

if __name__=='__main__':main()
