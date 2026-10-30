// Effekt-Prüfungen (Plan 4c): Teilchenzahlen je Trefferstärke, Obergrenze 400, Abklingen, Zeichnen ohne Fehler.
const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path');
const {environment}=require('./umgebung.cjs');
const env=environment();env.$('ai-btn').click();env.c.__render=true;
const g=env.t.game;g.phase='over';// kein laufender Kampf, damit nur die eingespeisten Ereignisse Effekte erzeugen
const count=type=>env.t.effects.filter(e=>e.type===type).length;
let checks=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
function fire(e){const x=env.t.game;x.events.push({...e,id:++x.eventId});env.frame();}
function clear(){env.t.effects.length=0;}
test('Light hit 7 sparks, strong hit 14, show hit 28, plus ring and impact lines',()=>{
 clear();fire({type:'hit',x:600,y:400,who:0,kind:'jab',damage:.5,strong:false,combo:1});assert.equal(count('spark'),7);assert.equal(count('ring'),1);assert.equal(count('line'),4);assert.equal(count('big'),0);
 clear();fire({type:'hit',x:600,y:400,who:0,kind:'kick',damage:1,strong:true,combo:2});assert.equal(count('spark'),14);assert.equal(count('line'),8);
 clear();fire({type:'hit',x:600,y:400,who:0,kind:'kick',damage:1,strong:true,combo:7});assert.equal(count('spark'),28);assert.equal(count('big'),1);assert.equal(count('flash'),1);assert(env.t.effects.some(e=>e.type==='big'&&e.label==='7 TREFFER'));
 clear();fire({type:'hit',x:600,y:400,who:0,kind:'jab',damage:.5,strong:false,combo:5});assert(env.t.effects.some(e=>e.type==='text'&&e.label==='COMBO 5'));
});
test('Block, perfect block and combo breaker have their own effects; the breaker shows its big text',()=>{
 clear();fire({type:'block',x:600,y:400,who:1,kind:'jab'});assert.equal(count('spark'),7);assert.equal(count('big'),0);
 clear();fire({type:'parry',x:600,y:400,who:1,kind:'jab'});assert.equal(count('spark'),17);assert.equal(count('line'),6);
 clear();fire({type:'breaker',x:600,y:400,who:1,kind:'kick'});assert.equal(count('spark'),26);assert(env.t.effects.some(e=>e.type==='big'&&e.label==='COMBO BREAKER!'));
});
test('Broken coordinates (NaN, undefined) create no effect and no error',()=>{clear();fire({type:'hit',x:NaN,y:undefined,who:0,kind:'jab',damage:.5,strong:false,combo:1});assert.equal(count('spark'),0);assert.equal(count('ring'),0);});
test('60 seconds with 30 hits: never more than 400 effects, everything fades within 2 seconds',()=>{
 clear();let peak=0;for(let i=0;i<3600;i++){if(i%120===0&&i<3600){fire({type:'hit',x:500+Math.random()*300,y:400,who:i%2,kind:'kick',damage:1,strong:true,combo:7});}else env.frame();peak=Math.max(peak,env.t.effects.length);}
 assert(peak<=400,'peak '+peak);assert(peak>30);env.run(130);assert.equal(env.t.effects.length,0);
});
test('A burst of 200 hits in one second stays under the limit',()=>{clear();for(let i=0;i<200;i++)fire({type:'hit',x:600,y:400,who:0,kind:'kick',damage:1,strong:true,combo:8});assert(env.t.effects.length<=400);env.run(150);assert.equal(env.t.effects.length,0);});
test('The show phase leaves a trail on the striking limb that fades afterwards',()=>{
 const f=g.fighters[0];f.combo=7;f.comboKey='kick';f.attack={kind:'kick',t:.2,spent:[],hand:0,leg:0,stance:null};env.frame();env.frame();assert(env.t.trails[0].length>=2);f.attack=null;f.combo=0;env.run(40);assert.equal(env.t.trails[0].length,0);
});
// Bildprobe eines Treffermoments mit allen Effekten.
env.$('ai-btn').click();const g2=env.t.game;g2.phase='fight';clear();g2.fighters[0].x=560;g2.fighters[1].x=690;g2.fighters[0].attack={kind:'lunge',t:.27,spent:[],hand:0,leg:0,stance:null};g2.fighters[1].reaction='knee';g2.fighters[1].reactionTime=.3;g2.fighters[0].combo=7;
fire({type:'hit',x:665,y:395,who:0,kind:'lunge',damage:1,strong:true,combo:7});env.run(3);env.t.nowTime=3000;env.t.draw(0);
const out=path.join(__dirname,'..','bildproben');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'effekte.png'),env.canvas.toBuffer('image/png'));
console.log(checks+' Effekt-Prüfungen bestanden · Bildprobe bildproben/effekte.png');
