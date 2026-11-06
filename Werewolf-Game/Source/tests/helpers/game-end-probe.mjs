// Browser-side instrumentation only. Production playback uses real native nodes.
export function installGameEndProbe(){
 window.__endAudio={plays:[],decoded:0,maxVoices:0};const active=new Set(),files=new WeakMap(),buffers=new WeakMap(),originalFetch=window.fetch;
 window.fetch=async(...args)=>{const response=await originalFetch(...args),file=String(args[0]).split('/').pop();if(file.startsWith('game-end-')){const array=response.arrayBuffer.bind(response);response.arrayBuffer=async()=>{const bytes=await array();files.set(bytes,file);return bytes;};}return response;};
 const C=window.AudioContext;
 if(C)window.AudioContext=class extends C{
  async decodeAudioData(bytes){const buffer=await super.decodeAudioData(bytes);if(files.has(bytes)){buffers.set(buffer,files.get(bytes));__endAudio.decoded++;}return buffer;}
  createBufferSource(){const source=super.createBufferSource(),start=source.start.bind(source),stop=source.stop.bind(source),connect=source.connect.bind(source);let gain,event;
   source.connect=(...args)=>{if(args[0] instanceof GainNode)gain=args[0];return connect(...args);};
   source.start=(...args)=>{active.add(source);__endAudio.maxVoices=Math.max(__endAudio.maxVoices,active.size);const file=buffers.get(source.buffer);if(file){event={file,time:performance.now(),volume:gain?.gain.value,duration:source.buffer.duration,loop:source.loop,stopped:false,ended:false};__endAudio.plays.push(event);}source.addEventListener('ended',()=>{active.delete(source);if(event)event.ended=true;});return start(...args);};
   source.stop=(...args)=>{active.delete(source);if(event)event.stopped=true;return stop(...args);};return source;
  }
 };
 const A=window.Audio;window.Audio=function(...args){const p=new A(...args),play=p.play.bind(p);let current;p.play=()=>{const file=p.src.split('/').pop();if(p.volume>0&&file.startsWith('game-end-')){current={file,time:performance.now(),volume:p.volume,loop:p.loop,html:true,ended:false};__endAudio.plays.push(current);}return play();};p.addEventListener('ended',()=>{if(current)current.ended=true;});return p;};window.Audio.prototype=A.prototype;
}
