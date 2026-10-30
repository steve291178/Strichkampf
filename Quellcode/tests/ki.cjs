// KI-Prüfungen (Regelwerk §6, §7 Schritt 2): simulierte Matches ohne Browser.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const context=vm.createContext({});
vm.runInContext(['engine.js','rig.js','ai.js'].map(f=>fs.readFileSync(path.join(root,'src',f),'utf8')).join('\n')+'\nglobalThis.C=Combat;globalThis.AI=DojoAI;',context);
const {C,AI}=context;
const lcg=seed=>{let s=seed%2147483647||1;return ()=>{s=(s*16807)%2147483647;return s/2147483647;};};
// Zufalls-Bot: wahllose Tasten, drei Entscheidungen je Sekunde (40 % davon Angriffe) – ein hastiger Mensch.
function randomBot(random){let timer=0,input=C.blank();return {think(g,dt){if(g.phase!=='fight')return {input:C.blank(),edges:C.blank()};timer-=dt;if(timer>0)return {input,edges:C.blank()};timer=.33;const a=C.blank(),e=C.blank();const dir=random();if(dir<.3)a.left=true;else if(dir<.6)a.right=true;if(random()<.2)a.down=true;if(random()<.2)a.block=true;const act=random();if(act<.2)e.punch=true;else if(act<.4)e.kick=true;else if(act<.55)e.up=true;input=a;return {input:a,edges:e};}};}
function player(level,self,random){if(level==='random')return randomBot(random);const s=AI.create(level,self,random);return {state:s,think:(g,dt)=>AI.think(s,g,dt)};}
// Ein Match; Abbruch nach 240 s Spielzeit zählt als Unentschieden (-1).
function match(levelA,levelB,seed,options){const g=C.create(options),random=lcg(seed),a=player(levelA,0,random),b=player(levelB,1,random);let steps=0;while(g.phase!=='over'&&steps<120*240){const ia=a.think(g,C.DT),ib=b.think(g,C.DT);C.step(g,[ia.input,ib.input],[ia.edges,ib.edges]);steps++;}return {winner:g.phase==='over'?g.winner:-1,game:g,a,b};}
// Zehn Matches, Seiten wechseln je Match; zurück kommt die Zahl der Siege von "high".
function series(high,low,seedBase=1,count=10,options){let wins=0;for(let i=0;i<count;i++){const highLeft=i%2===0,r=match(highLeft?high:low,highLeft?low:high,seedBase+i*7919,options);if(r.winner===(highLeft?0:1))wins++;}return wins;}
let checks=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
test('Reaktion und Takt sinken, Blockquote steigt von Stufe zu Stufe',()=>{const L=AI.LEVELS;for(const n of [1,2]){assert(L[n+1].reaction<L[n].reaction,'Reaktion '+n);assert(L[n+1].tick[1]<L[n].tick[1],'Takt '+n);assert(L[n+1].block>L[n].block,'Block '+n);}assert.equal(L[1].styles.length,1);assert.equal(L[2].styles.length,2);assert.equal(L[3].styles.length,3);});
test('Kaputte Stufen (0, 4, -1, null, "x", 2.5, leer) werden ruhig zu Stufe 1',()=>{for(const v of [0,4,-1,null,'x',2.5,undefined,''])assert.equal(AI.create(v).level,1,String(v));for(const v of [1,2,3,'2'])assert.equal(AI.create(v).level,Number(v));});
test('Gleicher Startwert ergibt denselben Kampf',()=>{const x=match(2,3,42),y=match(2,3,42);assert.equal(JSON.stringify(x.game),JSON.stringify(y.game));assert.notEqual(JSON.stringify(match(2,3,43).game),JSON.stringify(x.game));});
test('Die KI drückt nur Tasten, die auch ein Mensch hat',()=>{const g=C.create();g.phase='fight';const s=AI.create(3,1,lcg(5));const keys=Object.keys(C.blank()).sort();for(let i=0;i<600;i++){const out=AI.think(s,g,C.DT);assert.deepEqual(Object.keys(out.input).sort(),keys);assert.deepEqual(Object.keys(out.edges).sort(),keys);C.step(g,[C.blank(),out.input],[C.blank(),out.edges]);}});
test('Stufe 1 (Grün) schlägt einen Zufalls-Bot in mindestens 9 von 10 Matches',()=>{const w=series(1,'random',100);console.log('   Stufe 1 gegen Zufall: '+w+' von 10');assert(w>=9);});
test('Stufe 2 (Schwarz) schlägt Stufe 1 in mindestens 7 von 10 Matches',()=>{const w=series(2,1,200);console.log('   Stufe 2 gegen 1: '+w+' von 10');assert(w>=7);});
test('Stufe 3 (Meister 2) schlägt Stufe 2 in mindestens 7 von 10 Matches',()=>{const w=series(3,2,300);console.log('   Stufe 3 gegen 2: '+w+' von 10');assert(w>=7);});
test('Stilwechsel: Stufe 1 keiner, Stufe 2 je Runde, Stufe 3 alle 4 s oder nach Treffer',()=>{
 const r1=match(1,1,11);assert.equal(r1.a.state.switches,0);assert.equal(r1.b.state.switches,0);
 const r2=match(2,2,12);assert(r2.a.state.switches>=1&&r2.b.state.switches>=1,'Stufe 2 wechselt je Runde');assert.equal(r2.a.state.switches,r2.a.state.exchange,'genau ein Wechsel je neuem Austausch');
 const r3=match(3,3,13);assert(r3.a.state.switches>=3,'Stufe 3: '+r3.a.state.switches);
 const s=AI.create(3,1,lcg(1));const g=C.create();g.phase='fight';for(let i=0;i<120*4.1;i++)AI.think(s,g,C.DT);assert.equal(s.switches,1,'Wechsel nach 4 s ohne Treffer');g.fighters[1].hp-=10;AI.think(s,g,C.DT);assert.equal(s.switches,2,'Wechsel nach kassiertem Treffer');
});
test('Ein Match endet in endlicher Zeit (unter 240 s) auf allen Stufen',()=>{for(const [x,y] of [[1,1],[2,2],[3,3],[1,3]]){const r=match(x,y,500+x*10+y);assert.notEqual(r.winner,-1,x+' gegen '+y+' Unentschieden nach '+r.game.elapsed.toFixed(1)+' s');}});
console.log(checks+' KI-Prüfungen bestanden');
