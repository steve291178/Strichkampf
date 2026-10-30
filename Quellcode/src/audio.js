'use strict';
// Original procedural foley: short mono cracks, filtered swishes and a synthetic kiai.
// No film recordings or external audio files are used.
const DojoAudio=(()=>{
let ctx=null,master=null,compressor=null,enabled=true,noise=null,lastVoice=-1;
function open(){if(!enabled)return null;try{if(!ctx){ctx=new(window.AudioContext||window.webkitAudioContext)();master=ctx.createGain();master.gain.value=.38;compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-14;compressor.ratio.value=6;compressor.attack.value=.002;compressor.release.value=.12;master.connect(compressor);compressor.connect(ctx.destination);noise=ctx.createBuffer(1,Math.ceil(ctx.sampleRate),ctx.sampleRate);const data=noise.getChannelData(0);let n=93;for(let i=0;i<data.length;i++){n=(n*16807)%2147483647;data[i]=(n/1073741823.5)-1;}}if(ctx.state==='suspended')ctx.resume().catch(()=>{});return ctx;}catch{return null;}}
function tone(f1,f2,duration,volume,type='sine',delay=0){if(!ctx||!enabled)return;const t=ctx.currentTime+delay,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f1,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f2),t+duration);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),t+.003);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(master);o.start(t);o.stop(t+duration+.01);o.onended=()=>{o.disconnect();g.disconnect();};}
function hiss(duration,volume,f1,f2,type='bandpass',delay=0,attack=.005){if(!ctx||!noise||!enabled)return;const t=ctx.currentTime+delay,s=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=noise;filter.type=type;filter.Q.value=type==='bandpass'?.8:.7;filter.frequency.setValueAtTime(f1,t);filter.frequency.exponentialRampToValueAtTime(Math.max(40,f2),t+duration);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(volume,.0002),t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+duration);s.connect(filter);filter.connect(g);g.connect(master);s.start(t);s.stop(t+duration+.01);s.onended=()=>{s.disconnect();filter.disconnect();g.disconnect();};}
function kiai(){if(!ctx||!enabled)return;const t=ctx.currentTime,o=ctx.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(165,t);o.frequency.exponentialRampToValueAtTime(104,t+.24);const nodes=[];for(const [freq,gain] of [[780,.05],[1180,.033],[2500,.01]]){const b=ctx.createBiquadFilter(),g=ctx.createGain();b.type='bandpass';b.frequency.value=freq;b.Q.value=6;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+.035);g.gain.exponentialRampToValueAtTime(.0001,t+.25);o.connect(b);b.connect(g);g.connect(master);nodes.push(b,g);}o.start(t);o.stop(t+.27);o.onended=()=>{o.disconnect();nodes.forEach(n=>n.disconnect());};}
function grunt(strong=false){
 if(!ctx||ctx.currentTime-lastVoice<.42)return;lastVoice=ctx.currentTime;
 const t=ctx.currentTime,duration=strong?.24:.16,o=ctx.createOscillator(),nodes=[];
 o.type='sawtooth';o.frequency.setValueAtTime(strong?132:151,t);o.frequency.exponentialRampToValueAtTime(72,t+duration);
 for(const [from,to,volume] of [[650,420,.036],[1150,880,.019]]){const b=ctx.createBiquadFilter(),g=ctx.createGain();b.type='bandpass';b.Q.value=5;b.frequency.setValueAtTime(from,t);b.frequency.exponentialRampToValueAtTime(to,t+duration);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(b);b.connect(g);g.connect(master);nodes.push(b,g);}
 o.start(t);o.stop(t+duration+.01);o.onended=()=>{o.disconnect();nodes.forEach(n=>n.disconnect());};
}
function play(type,kind='jab',strong=false){
 if(!enabled||!ctx||ctx.state!=='running')return;const kick=['kick','side','sweep','air'].includes(kind);
 if(type==='swing'){hiss(kick?.22:.135,kick?.18:.12,kick?480:720,kick?2200:2900,'bandpass',0,kick?.04:.025);}
 else if(type==='hit'){hiss(.055,kick?.48:.36,1900,700,'bandpass');tone(kick?102:155,42,kick?.24:.16,kick?.40:.29,'sine');hiss(.026,.16,3700,2100,'highpass',.013);if(kind==='body'||strong||kick)grunt(strong||kind==='body');}
 else if(type==='block'||type==='parry'){hiss(.065,.30,1500,650,'bandpass');tone(420,210,.08,.14,'triangle');if(type==='parry'){tone(990,740,.23,.09,'sine',.012);tone(1470,1390,.16,.035,'sine',.02);}}
 else if(type==='step'||type==='land'){hiss(type==='land'?.085:.045,type==='land'?.11:.034,650,220,'lowpass');}
 else if(type==='jump')hiss(.11,.065,420,1250,'bandpass');
 else if(type==='start'){tone(740,510,.42,.10,'sine');tone(1110,940,.3,.035,'sine');}
 else if(type==='ko'||type==='round'||type==='match'){tone(98,34,.5,.17,'triangle');hiss(.3,.1,1000,140,'lowpass');}
}
return {unlock:open,setEnabled:value=>{enabled=value;if(master)master.gain.setTargetAtTime(value?.38:0,ctx.currentTime,.03);if(value)open();},play};
})();
