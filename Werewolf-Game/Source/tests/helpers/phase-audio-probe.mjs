/** Native buffer/gain/source instrumentation; no fake playback or audio replacement. */
export function installPhaseProbe(){
 window.__plays=[];window.__ended=[];window.__activePhase=new Set();window.__phaseTriggers={};window.__phaseDecoded=[];
 document.addEventListener('click',event=>{if(event.target.closest?.('button')?.textContent.includes('CONTINUE')&&document.querySelector('.screen-nightIntro'))__phaseTriggers['night-start.wav']=performance.now();},true);
 const timer=window.setTimeout;window.setTimeout=function(fn,ms,...args){return timer.call(this,ms===2000?function(...rest){if(document.querySelector('.screen-morning'))__phaseTriggers['meeting-start.wav']=performance.now();return fn(...rest);}:fn,ms,...args);};
 const C=window.AudioContext||window.webkitAudioContext,buffers=new WeakMap();if(!C)return;
 class Probe extends C{
  async decodeAudioData(bytes,...args){const file=bytes.byteLength===673240?'night-start.wav':bytes.byteLength===599680?'meeting-start.wav':null;const buffer=await super.decodeAudioData(bytes,...args);if(file){buffers.set(buffer,file);__phaseDecoded.push(file);}return buffer;}
  createBufferSource(){
   const source=super.createBufferSource(),start=source.start.bind(source),stop=source.stop.bind(source),connect=source.connect.bind(source);let gain,event;
   source.connect=(node,...args)=>{if(node instanceof GainNode)gain=node;return connect(node,...args);};
   source.start=(...args)=>{const file=buffers.get(source.buffer);if(file){event={file,time:performance.now(),latencyMs:performance.now()-__phaseTriggers[file],volume:gain?.gain.value,duration:source.buffer.duration,offset:args[1]||0,loop:source.loop,native:true,stopped:false,ended:false};__plays.push(event);__activePhase.add(source);source.addEventListener('ended',()=>{event.ended=true;__ended.push(file);__activePhase.delete(source);});}return start(...args);};
   source.stop=(...args)=>{if(event){event.stopped=true;__activePhase.delete(source);}return stop(...args);};return source;
  }
 }
 window.AudioContext=Probe;if(window.webkitAudioContext)window.webkitAudioContext=Probe;
}
