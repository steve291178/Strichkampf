'use strict';
// Original procedural foley in the spirit of 80s kung-fu cinema: filtered swishes, cracking hits,
// synthetic kiai shouts and an arena announcer built from formant synthesis.
// Everything is generated with Web Audio at play time. No film recordings or external audio files are used.
const DojoAudio=(()=>{
let ctx=null,master=null,compressor=null,room=null,enabled=true,noise=null,lastVoice=-1,lastKiai=-1;
// Variant for Stefan (H9): 'A' = long rising "wataaa", 'B' = short sharp "hyah".
let kiaiVariant='A';
const announcer={busyUntil:0,pending:null};
// Loudness per sound family, calibrated with tests/hoerprobe.html so peaks land between −12 and −1 dBFS.
const LEVEL={master:.9,hiss:5,tone:2.5,thump:1,voice:1,kiai:1,grunt:1,say:1};
function build(context){
 ctx=context;master=ctx.createGain();master.gain.value=LEVEL.master;compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-10;compressor.knee.value=4;compressor.ratio.value=4;compressor.attack.value=.002;compressor.release.value=.12;master.connect(compressor);compressor.connect(ctx.destination);
 // A short slap-back echo gives announcer and big hits an arena feel.
 room=ctx.createGain();room.gain.value=.22;const delay=ctx.createDelay(.5);delay.delayTime.value=.11;const feedback=ctx.createGain();feedback.gain.value=.28;const damp=ctx.createBiquadFilter();damp.type='lowpass';damp.frequency.value=2200;room.connect(delay);delay.connect(damp);damp.connect(feedback);feedback.connect(delay);damp.connect(master);
 noise=ctx.createBuffer(1,Math.ceil(ctx.sampleRate),ctx.sampleRate);const data=noise.getChannelData(0);let n=93;for(let i=0;i<data.length;i++){n=(n*16807)%2147483647;data[i]=(n/1073741823.5)-1;}
}
function open(){if(!enabled)return null;try{if(!ctx)build(new(window.AudioContext||window.webkitAudioContext)());if(ctx.state==='suspended')ctx.resume().catch(()=>{});return ctx;}catch{return null;}}
// Tests and the listening page attach their own (offline) context.
function attach(context){ctx=null;build(context);announcer.busyUntil=0;announcer.pending=null;lastVoice=-1;lastKiai=-1;}
const ready=()=>enabled&&ctx&&ctx.state!=='closed';
function env(g,t,attack,duration,volume,delay=0){g.gain.setValueAtTime(.0001,t+delay);g.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),t+delay+attack);g.gain.exponentialRampToValueAtTime(.0001,t+delay+duration);}
function tone(f1,f2,duration,volume,type='sine',delay=0,echo=0){if(!ready())return;const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f1,t+delay);o.frequency.exponentialRampToValueAtTime(Math.max(20,f2),t+delay+duration);env(g,t,.003,duration,volume*LEVEL.tone,delay);o.connect(g);g.connect(master);if(echo)g.connect(room);o.start(t+delay);o.stop(t+delay+duration+.01);o.onended=()=>{o.disconnect();g.disconnect();};}
function hiss(duration,volume,f1,f2,type='bandpass',delay=0,attack=.005,q=null){if(!ready()||!noise)return;const t=ctx.currentTime,s=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=noise;s.loop=true;filter.type=type;filter.Q.value=q??(type==='bandpass'?.8:.7);filter.frequency.setValueAtTime(f1,t+delay);filter.frequency.exponentialRampToValueAtTime(Math.max(40,f2),t+delay+duration);env(g,t,attack,duration,volume*LEVEL.hiss,delay);s.connect(filter);filter.connect(g);g.connect(master);s.start(t+delay);s.stop(t+delay+duration+.01);s.onended=()=>{s.disconnect();filter.disconnect();g.disconnect();};}
// A soft-clipped low thump: the "crack" body of every impact.
function thump(f1,f2,duration,volume,delay=0,drive=2.5){if(!ready())return;const t=ctx.currentTime,o=ctx.createOscillator(),shaper=ctx.createWaveShaper(),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(f1,t+delay);o.frequency.exponentialRampToValueAtTime(Math.max(20,f2),t+delay+duration);const curve=new Float32Array(256);for(let i=0;i<256;i++){const x=i/127.5-1;curve[i]=Math.tanh(x*drive);}shaper.curve=curve;env(g,t,.004,duration,volume*LEVEL.thump,delay);o.connect(shaper);shaper.connect(g);g.connect(master);g.connect(room);o.start(t+delay);o.stop(t+delay+duration+.02);o.onended=()=>{o.disconnect();shaper.disconnect();g.disconnect();};}
// Voice source: a sawtooth through parallel formant filters, lightly overdriven.
function formantVoice(t,pitchFrom,pitchTo,duration,formants,volume,{vibrato=0,growl=false,delay=0,type='sawtooth'}={}){
 if(!ready())return;const o=ctx.createOscillator(),nodes=[];o.type=type;o.frequency.setValueAtTime(pitchFrom,t+delay);o.frequency.exponentialRampToValueAtTime(Math.max(30,pitchTo),t+delay+duration);
 if(vibrato){const lfo=ctx.createOscillator(),lg=ctx.createGain();lfo.frequency.value=5.5;lg.gain.value=vibrato;lfo.connect(lg);lg.connect(o.frequency);lfo.start(t+delay);lfo.stop(t+delay+duration+.02);nodes.push(lfo,lg);}
 let source=o;if(growl){const am=ctx.createOscillator(),ag=ctx.createGain(),amp=ctx.createGain();am.frequency.value=28;ag.gain.value=.45;amp.gain.value=.55;am.connect(ag);ag.connect(amp.gain);o.connect(amp);am.start(t+delay);am.stop(t+delay+duration+.02);source=amp;nodes.push(am,ag,amp);}
 volume*=LEVEL.voice;
 // A low-passed copy of the source gives the voice a chest; the formants above it shape the vowel.
 const body=ctx.createBiquadFilter(),bg=ctx.createGain();body.type='lowpass';body.frequency.value=1000;env(bg,t,.02,duration,.3*volume,delay);source.connect(body);body.connect(bg);bg.connect(master);bg.connect(room);nodes.push(body,bg);
 for(const [freq,gain,q] of formants){const b=ctx.createBiquadFilter(),g=ctx.createGain();b.type='bandpass';b.frequency.setValueAtTime(freq[0],t+delay);b.frequency.exponentialRampToValueAtTime(freq[1]||freq[0],t+delay+duration);b.Q.value=q||5;env(g,t,.02,duration,gain*volume,delay);source.connect(b);b.connect(g);g.connect(master);g.connect(room);nodes.push(b,g);}
 o.start(t+delay);o.stop(t+delay+duration+.02);o.onended=()=>{o.disconnect();nodes.forEach(n=>n.disconnect());};
}
function kiai(strong=false){
 if(!ready()||ctx.currentTime-lastKiai<.5)return;lastKiai=ctx.currentTime;const t=ctx.currentTime;
 if(kiaiVariant==='A'){
  // "Wataaa": starts with a breathy W, opens into a long bright A that falls at the end.
  hiss(.07,.08,900,1400,'bandpass',0,.01);
  formantVoice(t,230,300,.16,[[[600,700],1],[[1000,1150],.5],[[2400,2500],.2]],(strong?.9:.7)*LEVEL.kiai,{delay:.03,vibrato:0});
  formantVoice(t,300,185,strong?.42:.32,[[[760,700],1],[[1150,1050],.6],[[2500,2450],.25]],(strong?1:.8)*LEVEL.kiai,{delay:.17,vibrato:9});
 }else{
  // "Hyah": sharp H burst and a short clipped A.
  hiss(.05,.12,1200,2600,'highpass',0,.004);
  formantVoice(t,330,170,strong?.24:.18,[[[730,650],1],[[1090,1000],.6],[[2440,2400],.2]],(strong?1:.8)*LEVEL.kiai,{delay:.03,vibrato:4});
 }
}
function grunt(strong=false){
 if(!ready()||ctx.currentTime-lastVoice<.42)return;lastVoice=ctx.currentTime;const t=ctx.currentTime,duration=strong?.24:.16;
 formantVoice(t,strong?132:151,72,duration,[[[650,420],1],[[1150,880],.5]],LEVEL.grunt,{vibrato:0});
}
// --- Announcer ---------------------------------------------------------------------------------
// Phonemes: vowels as formant triples (Hz), consonants as noise bursts or short voiced buzzes.
const VOWELS={A:[730,1090,2440],E:[530,1840,2480],I:[270,2290,3010],O:[570,840,2410],U:[300,870,2240],AE:[660,1720,2410],ER:[490,1350,1690],AI:[[730,270],[1090,2290],[2440,3010]],EI:[[530,270],[1840,2290],[2480,3010]],OU:[[570,300],[840,870],[2410,2240]]};
const CONSONANTS={F:['noise',.07,1400,3200,'highpass'],S:['noise',.09,4200,6500,'highpass'],SH:['noise',.09,2200,3600,'bandpass'],T:['burst',.035,2800,1800],K:['burst',.045,1400,900],P:['burst',.035,500,300],B:['burst',.04,420,260,true],D:['burst',.035,1800,1200,true],G:['burst',.04,1100,700,true],M:['nasal',.07,250,1000],N:['nasal',.07,280,1500],R:['growl',.08,420,1300],L:['growl',.07,400,1200],W:['nasal',.06,300,700],H:['noise',.05,900,1600,'bandpass'],V:['growl',.06,300,1000],'_':['pause',.07]};
const PHRASES={
 fight:[['F',.07],['AI',.28],['T',.05]],
 ko:[['K',.05],['EI',.22],['_',.05],['OU',.34]],
 combo:[['K',.05],['O',.16],['M',.06],['B',.05],['OU',.22]],
 breaker:[['K',.05],['O',.14],['M',.06],['B',.05],['OU',.16],['_',.06],['B',.05],['R',.06],['EI',.2],['K',.05],['ER',.2]],
 perfect:[['P',.05],['ER',.14],['F',.06],['E',.12],['K',.05],['T',.05]],
 seven:[['S',.08],['E',.16],['V',.06],['E',.1],['N',.08]],
 eight:[['EI',.26],['T',.06]],
 nine:[['N',.07],['AI',.3],['N',.08]],
 winner:[['W',.06],['I',.14],['N',.07],['ER',.22]],
 belt:[['N',.06],['U',.16],['_',.06],['B',.05],['E',.14],['L',.06],['T',.06]],
 time:[['T',.05],['AI',.3],['M',.1]],
 double:[['D',.05],['A',.14],['B',.05],['L',.1],['_',.06],['K',.05],['EI',.2],['_',.05],['OU',.3]],
 final:[['F',.07],['AI',.18],['N',.06],['L',.1],['_',.06],['H',.05],['I',.2],['T',.06]]
};
function say(name){
 if(!ready()||!PHRASES[name])return 0;const now=ctx.currentTime;
 if(now<announcer.busyUntil){announcer.pending={name,at:announcer.busyUntil};return 0;}
 const t=now;let at=0;const pitch=96;
 for(const [ph,dur] of PHRASES[name]){
  if(VOWELS[ph]){const f=VOWELS[ph].map(v=>Array.isArray(v)?v:[v,v]);formantVoice(t,pitch*1.08,pitch*.9,dur,[[f[0],1,6],[f[1],.55,7],[f[2],.22,7]],LEVEL.say,{vibrato:3,growl:true,delay:at});}
  else{const c=CONSONANTS[ph]||CONSONANTS._;
   if(c[0]==='noise')hiss(c[1],.25*LEVEL.say,c[2],c[3],c[4],at,.008);
   else if(c[0]==='burst'){hiss(c[1],.3*LEVEL.say,c[2],c[3],'bandpass',at,.002,1.5);if(c[4])formantVoice(t,pitch,pitch*.85,c[1],[[[c[3],c[3]],.7,5]],LEVEL.say,{delay:at,growl:true});}
   else if(c[0]==='nasal')formantVoice(t,pitch,pitch*.95,c[1],[[[c[2],c[2]],.8,6],[[c[3],c[3]],.2,7]],LEVEL.say,{delay:at,growl:true});
   else if(c[0]==='growl')formantVoice(t,pitch*.95,pitch,c[1],[[[c[2],c[2]],.8,5],[[c[3],c[3]],.35,6]],LEVEL.say,{delay:at,growl:true});
  }
  at+=dur;
 }
 announcer.busyUntil=t+at+.12;return at;
}
function tick(){if(!ready()||!announcer.pending)return;if(ctx.currentTime>=announcer.pending.at){const name=announcer.pending.name;announcer.pending=null;say(name);}}
function sting(kind){
 if(!ready())return;
 if(kind==='gong'){thump(180,60,.9,.35,0,1.6);tone(392,392,.7,.08,'triangle',0,1);tone(587,560,.6,.05,'sine',.02,1);}
 else if(kind==='chance'){tone(523,523,.07,.06);tone(659,659,.07,.06,'sine',.07);tone(784,784,.14,.07,'sine',.14,1);}
 else if(kind==='chain'){tone(440,660,.08,.16,'square');}
 else if(kind==='drop'){tone(520,180,.18,.16,'triangle');}
 else if(kind==='belt'){for(const [i,f] of [523,659,784,1047].entries())tone(f,f,.22,.07,'sine',i*.11,1);}
 else if(kind==='round'){thump(160,50,.6,.3,0,1.8);hiss(.3,.1,1000,140,'lowpass');}
}
const KICKS=['kick','side','sweep','air'];
function play(e){
 if(!e||!ready()||ctx.state!=='running'&&!ctx.length)return;
 const type=typeof e==='string'?e:e.type,kind=e.kind||'jab',strong=!!e.strong,kick=KICKS.includes(kind);
 if(type==='swing'){hiss(kick?.24:.14,kick?.2:.18,kick?420:700,kick?2400:3100,'bandpass',0,kick?.045:.025);if(kick)hiss(.18,.06,200,900,'lowpass',.02,.03);}
 else if(type==='hit'){
  const reaction=kind==='body'?'body':kind==='sweep'?'down':strong?'knee':'head';
  hiss(.05,kick?.5:.38,1900,700,'bandpass');hiss(.024,.18,3700,2100,'highpass',.012);
  if(reaction==='head')thump(kick?104:158,42,.17,.32);
  else if(reaction==='body'){thump(96,36,.26,.42,0,3.5);grunt(true);}
  else if(reaction==='knee'){thump(120,38,.24,.44,0,3);thump(70,30,.3,.3,.09,2);}
  else{thump(110,34,.22,.38);thump(55,24,.45,.4,.12,2);hiss(.3,.09,500,90,'lowpass',.1,.02);grunt(false);}
  if(strong||e.combo>=7)kiai(strong);
  if(e.combo>=7&&e.combo<=9)say(['seven','eight','nine'][e.combo-7]);
 }
 else if(type==='block'){hiss(.065,.3,1500,650,'bandpass');tone(420,210,.08,.14,'triangle');}
 else if(type==='parry'){hiss(.065,.3,1500,650,'bandpass');tone(420,210,.08,.14,'triangle');tone(990,740,.23,.09,'sine',.012,1);tone(1470,1390,.16,.035,'sine',.02,1);say('perfect');}
 else if(type==='breaker'){hiss(.08,.36,1600,500,'bandpass');tone(1180,880,.3,.1,'sine',0,1);tone(1760,1600,.22,.05,'sine',.02,1);thump(140,28,.5,.42,.02,2);say('breaker');}
 else if(type==='step'||type==='land'){hiss(type==='land'?.085:.045,type==='land'?.11:.052,650,220,'lowpass');}
 else if(type==='jump')hiss(.11,.065,420,1250,'bandpass');
 else if(type==='combo'){if(e.phase==='chance'){sting('chance');say('combo');}else if(e.phase==='chain')sting('chain');}
 else if(type==='drop')sting('drop');
 else if(type==='start'){sting('gong');say('fight');}
 else if(type==='round'){sting('round');say(e.reason==='double'?'double':e.reason==='time'?'time':'ko');}
 else if(type==='match'){sting('round');if(e.reason==='time')say('time');else say('winner');}
 else if(type==='sudden')say('final');
 else if(type==='belt'){sting('belt');say('belt');}
}
return {unlock:open,attach,tick,say,parts:{tone,hiss,thump,formantVoice,kiai,grunt,sting},levels:LEVEL,setEnabled:value=>{enabled=value;if(master)master.gain.setTargetAtTime(value?LEVEL.master:0,ctx.currentTime,.03);if(value)open();},setKiaiVariant:v=>{kiaiVariant=v==='B'?'B':'A';},play,PHRASES};
})();
