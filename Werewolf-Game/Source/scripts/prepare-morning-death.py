#!/usr/bin/env python3
"""Prepare three morning-death cues: remove leading dead air, then full remaining recording, no padding or added delay.
Requires the same numpy/pyloudnorm/imageio-ffmpeg tools as prepare-card-reveals.py.
Example: PYTHONPATH=.cache/audio-tools python ... --input google_drive
Only creates morning-death assets/catalog and adds their offline entries. Other audio is untouched.
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
SOURCES={'morning-death-01': ('among us kill.mp3', 'f3b0dedf243efc4d02238124db3abd90'), 'morning-death-02': ('bell.mp3', '36054ab08b1f6483265c593014e0ea16'), 'morning-death-03': ('bone crack.mp3', 'ab70aad6c5b64baadc0f3ab317b231e2')}


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
 out=ROOT/'public/werewolf/audio/morning-death/v1';out.mkdir(parents=True,exist_ok=True);cues={}
 for key,(filename,expected_md5) in SOURCES.items():
  path=args.input/filename;original=path.read_bytes();assert hashlib.md5(original).hexdigest()==expected_md5,filename
  raw=run(['-i',str(path),'-ar',str(SR),'-ac','2','-f','f32le','pipe:1']);audio=np.frombuffer(raw,dtype='<f4').reshape(-1,2).astype(float)
  source_frames=len(audio)
  # Find leading dead air after level compensation, preserving 10ms before onset.
  # Do not remove quiet interior gaps or truncate speech; preserve the full remaining recording.
  reference=audio;detector_gain=TARGET-meter.loudness_stats(reference)['active_p90']
  hits=np.flatnonzero(np.max(np.abs(reference*10**(detector_gain/20)),axis=1)>=10**(-55/20));assert len(hits)
  source_start_frame=max(0,int(hits[0])-480)
  audio=audio[source_start_frame:].copy();frames=len(audio);assert frames>=4800;audio[-240:]*=np.linspace(1,0,240)[:,None]
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
  cues[key]={'file':'./werewolf/audio/morning-death/v1/'+dest.name,'source':filename,'source_md5':expected_md5,'source_sha256':hashlib.sha256(original).hexdigest(),'frames':frames,'source_frames':source_frames,'source_start_frame':source_start_frame,'onset_lead_frames':480,'onset_threshold_dbfs':-55,'seconds':frames/SR,'loop':False,'bytes':dest.stat().st_size,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'target_active_p90':TARGET,'output_stats':{k:round(v,3) for k,v in stats.items()},'true_peak_db':true_peak}
  print(key,cues[key]['seconds'],'seconds, active P90',stats['active_p90'],'dBTP',true_peak,flush=True)
 manifest={'edition':'drive-morning-death-20261106-v1','sample_rate':SR,'channels':2,'policy':'One random nonrepeating shot only when a morning report shows one or more deaths. Leading dead air removed with a 10ms onset safety margin; full remaining recording, no padding, no intentional delay, no looping, no no-death-report or recovery replay.','cues':cues}
 (ROOT/'src/morning-death-audio-catalog.json').write_text(json.dumps(manifest,indent=2)+'\n')
 sw=ROOT/'public/sw.js';text=sw.read_text();match=re.search(r'const CORE = (\[[\s\S]*?\]);',text);core=json.loads(re.sub(r',\s*\]',']',match[1]));core=[p for p in core if not p.startswith('werewolf/audio/morning-death/')];core.extend(c['file'][2:] for c in cues.values());sw.write_text(text[:match.start(1)]+json.dumps(core,indent=2)+text[match.end(1):])
 print('PASS: full remaining recording without padding, final PCM loudness and true peaks verified; three offline assets added.')

if __name__=='__main__':main()
