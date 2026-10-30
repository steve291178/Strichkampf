// Ton-Prüfungen (Plan 5a/5b) mit einem Schein-AudioContext: jedes Ereignis erzeugt Klangknoten,
// Ton aus erzeugt keine, kein fremdes Material, Ansager-Warteschlange, keine Dauerklänge.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'..','src','audio.js'),'utf8');
class Param{constructor(v=0){this.value=v;}setValueAtTime(){return this;}exponentialRampToValueAtTime(){return this;}linearRampToValueAtTime(){return this;}setTargetAtTime(){return this;}}
class Node{constructor(ctx){ctx.created.push(this);this.ctx=ctx;this.gain=new Param(1);this.frequency=new Param(440);this.Q=new Param(1);this.delayTime=new Param(0);this.threshold=new Param(-24);this.knee=new Param(30);this.ratio=new Param(12);this.attack=new Param(.003);this.release=new Param(.25);this.started=null;this.stopped=null;}connect(){return this;}disconnect(){}start(t=0){this.started=t;}stop(t=0){this.stopped=t;}}
class FakeContext{constructor(){this.created=[];this.currentTime=0;this.sampleRate=44100;this.state='running';this.destination={};}
 createOscillator(){return new Node(this);}createGain(){return new Node(this);}createBiquadFilter(){return new Node(this);}createBufferSource(){return new Node(this);}createDynamicsCompressor(){return new Node(this);}createWaveShaper(){return new Node(this);}createDelay(){return new Node(this);}
 createBuffer(ch,len){return {getChannelData:()=>new Float32Array(len)};}resume(){return Promise.resolve();}}
const context=vm.createContext({window:{},Float32Array});vm.runInContext(src+'\nglobalThis.A=DojoAudio;',context);
const A=context.A;const fake=new FakeContext();A.attach(fake);
const spoken=new Set(Object.keys(A.PHRASES));
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
function nodesFor(e,advance=5){const before=fake.created.length;fake.currentTime+=advance;A.play(e);return fake.created.slice(before);}
const events=[
 ['Wusch leicht',{type:'swing',kind:'jab'}],['Wusch stark',{type:'swing',kind:'kick'}],
 ['Treffer Kopf',{type:'hit',kind:'jab',strong:false,combo:1}],['Treffer Körper',{type:'hit',kind:'body',strong:false,combo:1}],['Treffer Knie',{type:'hit',kind:'kick',strong:true,combo:1}],['Treffer Sturz',{type:'hit',kind:'sweep',strong:false,combo:1}],['Treffer Show 7',{type:'hit',kind:'lunge',strong:true,combo:7}],
 ['Block',{type:'block',kind:'jab'}],['Perfekter Block',{type:'parry',kind:'kick'}],['Combo Breaker',{type:'breaker',kind:'kick'}],
 ['Schritt',{type:'step'}],['Landung',{type:'land'}],['Sprung',{type:'jump'}],
 ['Combo-Chance',{type:'combo',phase:'chance',count:3}],['Combo-Kette',{type:'combo',phase:'chain',count:4}],['Combo verloren',{type:'drop'}],
 ['Kampfstart',{type:'start'}],['Runde K.o.',{type:'round',reason:'ko'}],['Runde Zeit',{type:'round',reason:'time'}],['Runde Doppel',{type:'round',reason:'double'}],['Match',{type:'match',reason:'ko'}],['Verlängerung',{type:'sudden'}],['Neuer Gürtel',{type:'belt'}]
];
test('Jedes Spielereignis erzeugt mindestens einen Klangknoten',()=>{for(const [name,e] of events){const nodes=nodesFor(e);assert(nodes.length>=1,name+' erzeugt nichts');}});
test('Kein Klang außer dem Ansager dauert länger als 1,2 s',()=>{
 for(const [name,e] of events){const nodes=nodesFor(e,10);const start=fake.currentTime;for(const n of nodes)if(n.started!==null&&n.stopped!==null){const spokenHere=['parry','breaker','start','round','match','sudden','belt'].includes(e.type)||(e.type==='combo'&&e.phase==='chance')||(e.type==='hit'&&e.combo>=7);if(!spokenHere)assert(n.stopped-start<=1.2,name+' dauert '+(n.stopped-start).toFixed(2)+' s');assert(n.stopped-start<=3,name+' zu lang');}}
});
test('Ton aus: kein einziger Klangknoten, Ton an: wieder Klang',()=>{A.setEnabled(false);const off=nodesFor({type:'hit',kind:'kick',strong:true,combo:1});assert.equal(off.length,0);A.setEnabled(true);assert(nodesFor({type:'hit',kind:'kick',strong:true,combo:1}).length>0);});
test('Kaputte Ereignisse (leer, unbekannter Typ, fehlende Felder) stören nicht',()=>{for(const e of [{},{type:'unbekannt'},{type:'hit'},{type:'hit',kind:'zzz',combo:'x'},{type:'combo'},{type:'round'},'swing',null,undefined,42])A.play(e);});
test('Nur selbst erzeugter Ton: keine Dateien, kein Netz in audio.js',()=>{for(const word of ['http','fetch(','.mp3','.wav','.ogg','new Audio','XMLHttpRequest','<audio'])assert(!src.includes(word),word);assert(src.includes('createOscillator'));});
test('Ansager: nie zwei Ansagen gleichzeitig, höchstens eine wartend, die neueste ersetzt die ältere',()=>{
 fake.currentTime+=20;const before=fake.created.length;const len=A.say('fight');assert(len>0);const during=fake.created.length;
 assert.equal(A.say('ko'),0,'zweite Ansage wartet');assert.equal(A.say('winner'),0);assert.equal(fake.created.length,during,'nichts gesprochen solange besetzt');
 A.tick();assert.equal(fake.created.length,during,'tick vor Ende spricht nicht');
 fake.currentTime+=len+.2;A.tick();assert(fake.created.length>during,'nach Ende wird die wartende Ansage gesprochen');
 const afterOne=fake.created.length;fake.currentTime+=3;A.tick();assert.equal(fake.created.length,afterOne,'nur eine wartende Ansage (winner hat ko ersetzt)');
});
test('Alle Ansagen bestehen aus bekannten Lauten und dauern höchstens 1,6 s',()=>{for(const [name,phrase] of Object.entries(A.PHRASES)){const total=phrase.reduce((a,[,d])=>a+d,0);assert(total<=1.6,name+' '+total.toFixed(2)+' s');for(const [ph] of phrase)assert(typeof ph==='string'&&ph.length>0,name);}assert(spoken.has('fight')&&spoken.has('breaker')&&spoken.has('ko')&&spoken.has('belt')&&spoken.has('perfect')&&spoken.has('winner'));});
test('Kiai-Variante B lässt sich wählen und klingt (erzeugt Knoten)',()=>{A.setKiaiVariant('B');fake.currentTime+=5;const nodes=nodesFor({type:'hit',kind:'kick',strong:true,combo:1});assert(nodes.length>0);A.setKiaiVariant('A');});
console.log(checks+' Ton-Prüfungen bestanden');
