/** Observe real decoded sources, GainNodes and media playback without replacing audio. */
export function installBallotProbe({fallback=false}={}){
 if(fallback){Object.defineProperty(window,'AudioContext',{configurable:true,value:undefined});Object.defineProperty(window,'webkitAudioContext',{configurable:true,value:undefined});}
 window.__ballotProbe={decoded:[],plays:[],active:new Set(),maxVoices:0,presses:[],oscillators:0,html:[]};const probe=window.__ballotProbe;
 document.addEventListener('click',event=>{const button=event.target.closest?.('[data-ballot-submit]');if(button&&!button.disabled)probe.presses.push({at:performance.now(),label:button.textContent});},true);
 const relevant=file=>file.startsWith('ballot-')||file.startsWith('voted-out-');
 const category=file=>file.startsWith('ballot-')?'ballot':'elimination';
 const C=window.AudioContext,files=new WeakMap(),buffers=new WeakMap(),originalFetch=window.fetch;
 window.fetch=async(...args)=>{const response=await originalFetch(...args),file=String(args[0]).split('/').pop();if(relevant(file)){const array=response.arrayBuffer.bind(response);response.arrayBuffer=async()=>{const bytes=await array();files.set(bytes,file);return bytes;};}return response;};
 if(C)window.AudioContext=class extends C{
  async decodeAudioData(bytes){const buffer=await super.decodeAudioData(bytes);if(files.has(bytes)){buffers.set(buffer,files.get(bytes));probe.decoded.push(files.get(bytes));}return buffer;}
  createOscillator(){const oscillator=super.createOscillator(),start=oscillator.start.bind(oscillator);oscillator.start=(...args)=>{probe.oscillators++;return start(...args);};return oscillator;}
  createBufferSource(){const source=super.createBufferSource(),start=source.start.bind(source),stop=source.stop.bind(source),connect=source.connect.bind(source);let gain,event;
   source.connect=(node,...args)=>{if(node instanceof GainNode)gain=node;return connect(node,...args);};
   source.start=(...args)=>{const file=buffers.get(source.buffer);if(file){event={file,category:category(file),at:performance.now(),latencyMs:performance.now()-(probe.presses.at(-1)?.at??0),volume:gain?.gain.value,loop:source.loop,native:true,ended:false,stopped:false,ballotsAtStart:probe.plays.filter(p=>p.category==='ballot'&&!p.stopped&&!p.ended).length};probe.plays.push(event);probe.active.add(source);probe.maxVoices=Math.max(probe.maxVoices,probe.active.size);source.addEventListener('ended',()=>{event.ended=true;probe.active.delete(source);});}return start(...args);};
   source.stop=(...args)=>{if(event){event.stopped=true;probe.active.delete(source);}return stop(...args);};return source;
  }
 };
 const A=window.Audio;window.Audio=function(...args){const p=new A(...args),play=p.play.bind(p),pause=p.pause.bind(p);let event;p.play=()=>{const file=p.src.split('/').pop();if(p.volume>0){probe.html.push(file);if(relevant(file)){event={file,category:category(file),at:performance.now(),latencyMs:performance.now()-(probe.presses.at(-1)?.at??0),volume:p.volume,loop:p.loop,native:false,ended:false,stopped:false,ballotsAtStart:probe.plays.filter(e=>e.category==='ballot'&&!e.stopped&&!e.ended).length};probe.plays.push(event);probe.active.add(p);probe.maxVoices=Math.max(probe.maxVoices,probe.active.size);}}return play();};p.pause=()=>{if(event&&!event.ended)event.stopped=true;probe.active.delete(p);return pause();};p.addEventListener('ended',()=>{if(event)event.ended=true;probe.active.delete(p);});return p;};window.Audio.prototype=A.prototype;
}
