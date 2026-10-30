const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const context = vm.createContext({});
vm.runInContext(['engine.js', 'rig.js','controls.js'].map(f => fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n') + '\nglobalThis.C=Combat;globalThis.R=KarateRig;globalThis.M=ControlMap;', context);
const {C,R} = context;
function setup(distance=95){const g=C.create();g.phase='fight';g.fighters[0].x=450;g.fighters[1].x=450+distance;return g;}
function tick(g, input=C.blank(), edge=C.blank(), other=C.blank(), otherEdge=C.blank()){C.step(g,[input,other],[edge,otherEdge]);}
function run(g,n=120,input=C.blank(),other=C.blank()){for(let i=0;i<n;i++)tick(g,input,C.blank(),other);}
function attack(f,kind,t=0){f.attack={kind,t,hand:0,spent:[],};}
let checks=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
test('All seven techniques can connect with a body',()=>{assert.equal(Object.keys(C.MOVES).length,7);for(const kind of Object.keys(C.MOVES)){const g=setup();attack(g.fighters[0],kind);run(g,150);assert(g.fighters[1].hp<C.HP,kind);}});
test('Duel damage follows the rulebook: light −½, strong −1, never below 0, round resets to 20',()=>{
 const light=['jab','body','sweep'],strongKinds=['lunge','kick','side','air'];
 for(const kind of Object.keys(C.MOVES)){const g=setup();attack(g.fighters[0],kind);run(g,150);assert.equal(g.fighters[1].hp,C.HP-(light.includes(kind)?.5:1),kind);assert.equal(C.MOVES[kind].damage,light.includes(kind)?.5:1);}
 assert.deepEqual(strongKinds.map(k=>C.MOVES[k].damage),[1,1,1,1]);
 let g=setup();g.fighters[1].hp=.5;attack(g.fighters[0],'kick');run(g,150);assert.equal(g.fighters[1].hp,0);assert.equal(g.phase,'break');
 g=setup();g.fighters[1].hp=19.5;attack(g.fighters[0],'kick');run(g,150);assert.equal(g.fighters[1].hp,18.5);
 g=setup();g.fighters[1].hp=.5;attack(g.fighters[0],'jab');run(g,150);assert.equal(g.phase,'break');run(g,400);assert.equal(g.fighters[1].hp,C.HP);assert.equal(g.round,2);
});
test('No damage beyond the visible limb',()=>{const g=setup(180);attack(g.fighters[0],'jab');run(g);assert.equal(g.fighters[1].hp,C.HP);});
test('Every contact originates at the visible striking limb',()=>{for(const kind of Object.keys(C.MOVES))for(const face of [1,-1]){const g=setup();if(face<0){g.fighters[0].x=545;g.fighters[1].x=450;g.fighters[0].face=-1;g.fighters[1].face=1;}attack(g.fighters[0],kind);for(let n=0;n<150;n++){const before=g.eventId;tick(g);for(const e of g.events.filter(e=>e.id>before&&e.type==='hit')){assert(Number.isFinite(e.x)&&Number.isFinite(e.y));assert(Math.abs(e.x-g.fighters[0].x)<150);}}assert(g.fighters[1].hp<C.HP,kind+' mirrored '+face);}});
test('A jumping opponent clears a low sweep',()=>{const g=setup();attack(g.fighters[0],'sweep',.3);g.fighters[1].y=240;g.fighters[1].vy=200;run(g,25);assert.equal(g.fighters[1].hp,C.HP);});
test('Correct high block and low block stop matching attacks',()=>{for(const kind of ['jab','sweep']){const g=setup();attack(g.fighters[0],kind);run(g,130,C.blank(),{...C.blank(),block:true,down:kind==='sweep'});assert.equal(g.fighters[1].hp,C.HP);assert(g.events.some(e=>e.type==='block'||e.type==='parry'));}});
test('Wrong block height leaves an opening',()=>{const g=setup();attack(g.fighters[0],'sweep');run(g,130,C.blank(),{...C.blank(),block:true});assert(g.fighters[1].hp<C.HP);});
test('One attack cannot damage twice',()=>{const g=setup();attack(g.fighters[0],'jab');run(g);assert.equal(g.fighters[1].hp,19.5);});
test('Simultaneous lethal contacts replay the round without scoring',()=>{const g=setup();for(const f of g.fighters){f.hp=.5;attack(f,'jab',C.MOVES.jab.wind-C.DT);}tick(g);assert.equal(g.phase,'break');assert.equal(g.roundWinner,-1);assert.deepEqual([...g.scores],[0,0]);});
test('Late buffered input executes exactly once',()=>{const g=setup(300),a=g.fighters[0];attack(a,'jab',C.MOVES.jab.duration-.06);tick(g,C.blank(),{...C.blank(),kick:true});run(g,10);assert.equal(a.attack.kind,'kick');run(g,160);assert.equal(a.attack,null);assert.equal(g.events.filter(e=>e.type==='swing').length,1);});
test('Early input expires instead of becoming a surprise attack',()=>{const g=setup(300);attack(g.fighters[0],'side');tick(g,C.blank(),{...C.blank(),punch:true});run(g,150);assert.equal(g.fighters[0].attack,null);assert(!g.events.some(e=>e.type==='swing'));});
test('Held attack does not auto-repeat',()=>{const g=setup(300),held={...C.blank(),punch:true};tick(g,held,held);run(g,200,held);assert.equal(g.events.filter(e=>e.type==='swing').length,1);});
test('Blocking cancels buffered attacks',()=>{const g=setup(300);attack(g.fighters[0],'jab',.3);tick(g,C.blank(),{...C.blank(),kick:true});run(g,30,{...C.blank(),block:true});assert.equal(g.fighters[0].buffer,null);assert.equal(g.fighters[0].attack,null);});
test('Paused simulation does not advance attacks or buffer timers',()=>{const g=setup();attack(g.fighters[0],'kick');g.paused[0]=true;const before=JSON.stringify(g);run(g);assert.equal(JSON.stringify(g),before);});
test('Serialized online state resolves identically',()=>{const g=setup(),copy=JSON.parse(JSON.stringify(g));for(let i=0;i<180;i++){const edge=i===0?{...C.blank(),kick:true}:C.blank();tick(g,C.blank(),edge);tick(copy,C.blank(),edge);}assert.equal(JSON.stringify(g),JSON.stringify(copy));});
test('All move poses retain upper/lower limb lengths and finite joints',()=>{
 for(const kind of Object.keys(C.MOVES))for(const hand of [0,1])for(let t=0;t<C.MOVES[kind].duration;t+=1/120){
  const f=C.fighter(0);attack(f,kind,t);f.attack.hand=hand;const p=R.pose(f);
  for(const [limb,lengths] of [[p.frontArm,[37,36]],[p.backArm,[37,36]],[p.frontLeg,[55,55]],[p.backLeg,[55,55]]]){
   for(const q of limb)assert(q.every(Number.isFinite));
   for(let i=0;i<2;i++)assert(Math.abs(Math.hypot(limb[i+1][0]-limb[i][0],limb[i+1][1]-limb[i][1])-lengths[i])<.001,kind);
  }
 }
});
test('Support foot does not slide during forward/backward steps on either side',()=>{
 const smooth=t=>t*t*(3-2*t);
 for(const face of [1,-1])for(const relative of [1,-1])for(const phase of [.1,.2,.35,.45,.55,.65,.8,.9]){
  const f=C.fighter(0),length=relative>0?36:30,dir=face*relative;f.face=face;f.x=450+dir*length*smooth(phase);f.stride={t:phase*.36,duration:.36,dir,length};
  const p=R.pose(f),frontFirst=relative>0,supportIsFront=phase<.5?!frontFirst:frontFirst;
  const foot=supportIsFront?p.frontLeg[2]:p.backLeg[2],start=supportIsFront?42:-43;
  const expected=450+face*start+(phase>.5?dir*length:0);
  assert(Math.abs(f.x+face*foot[0]-expected)<.001,'foot slides');assert(Math.abs(foot[1]+4)<.001,'support foot floats');
 }
});
test('Ground kicks keep the supporting foot planted',()=>{for(const kind of ['kick','side','sweep'])for(let t=0;t<C.MOVES[kind].duration;t+=.01){const f=C.fighter(0);attack(f,kind,t);const foot=R.pose(f).backLeg[2];assert(Math.abs(foot[0]+43)<.001&&Math.abs(foot[1]+4)<.001,kind);}});


test('Both legs keep support grounded and can hit on either facing',()=>{
 for(const kind of ['kick','side','sweep'])for(const leg of [0,1])for(const face of [1,-1]){
  const g=setup(90),a=g.fighters[0];a.face=face;g.fighters[1].x=a.x+90*face;g.fighters[1].face=-face;attack(a,kind);a.attack.leg=leg;
  for(let n=0;n<130;n++){if(a.attack){const p=R.pose(a),foot=leg?p.frontLeg[2]:p.backLeg[2];assert(Math.abs(foot[0]-(leg?42:-43))<.001);assert(Math.abs(foot[1]+4)<.001);}tick(g);}
  assert(g.fighters[1].hp<C.HP,kind+' leg '+leg+' face '+face);
 }
});
test('Interrupted steps retain the support foot throughout the kick',()=>{
 for(const leg of [0,1])for(const phase of [.12,.4,.65,.88]){
  const g=setup(400),a=g.fighters[0];a.nextLeg=leg;a.stride={t:phase*.36,duration:.36,dir:1,length:36};
  const before=R.pose(a),anchor=(leg?before.frontLeg:before.backLeg)[2];tick(g,C.blank(),{...C.blank(),kick:true});
  const start=R.pose(a);assert(Math.hypot(...start.frontLeg[2].map((x,i)=>x-before.frontLeg[2][i]))<.001);assert(Math.hypot(...start.backLeg[2].map((x,i)=>x-before.backLeg[2][i]))<.001);
  for(let n=0;n<86;n++){tick(g);if(a.attack&&a.attack.t>.1){const p=R.pose(a),foot=leg?p.frontLeg[2]:p.backLeg[2];assert(Math.abs(foot[0]-anchor[0])<.01,'anchor slides');assert(Math.abs(foot[1]+4)<.01);}}
  run(g,80);assert.equal(a.settle,null);
 }
});
test('An interrupted step settles its feet when blocking',()=>{
 const g=setup(400),a=g.fighters[0];a.stride={t:.11,duration:.36,dir:1,length:36};const before=R.pose(a);tick(g,{...C.blank(),block:true});const p=R.pose(a);assert(Math.abs(p.frontLeg[2][0]-before.frontLeg[2][0])<.01);assert(a.settle);run(g,40,{...C.blank(),block:true});assert.equal(a.settle,null);
});
test('Repeated kicks alternate both legs without holding to auto-repeat',()=>{
 const g=setup(400),a=g.fighters[0],legs=[];for(let n=0;n<4;n++){tick(g,C.blank(),{...C.blank(),kick:true});legs.push(a.attack.leg);run(g,130);}assert.deepEqual(legs,[0,1,0,1]);
});
function winPoint(g,winner=0){g.phase='fight';g.fighters=[C.fighter(0),C.fighter(1)];g.fighters[0].x=450;g.fighters[1].x=545;g.fighters[1-winner].hp=.5;attack(g.fighters[winner],'jab',C.MOVES.jab.wind-C.DT);tick(g);}
test('Two points end the match; a point resets health and start positions',()=>{
 const g=C.create({mode:'points'});winPoint(g);assert.equal(g.phase,'break');assert.deepEqual([...g.scores],[1,0]);run(g,450);assert.equal(g.fighters[1].hp,C.HP);assert.equal(g.fighters[1].x,830);winPoint(g);assert.equal(g.phase,'over');assert.equal(g.winner,0);
});
test('Three-point option and two-round life mode keep their own targets',()=>{
 for(const mode of ['duel','points']){const g=C.create({mode,pointsToWin:3});winPoint(g);run(g,450);assert.equal(g.round,mode==='duel'?2:1);winPoint(g);assert.equal(g.phase,mode==='duel'?'over':'break');if(mode==='points'){run(g,450);winPoint(g);assert.equal(g.phase,'over');}}
});
test('Tied timer enters overtime, whose first point ends the match',()=>{
 const g=C.create({mode:'points',timeLimit:60});g.phase='fight';g.clock=C.DT/2;tick(g);assert(g.suddenDeath);winPoint(g);assert.equal(g.phase,'over');assert.equal(g.winner,0);assert.equal(g.scores[0],1);
});
test('Double knockout in overtime preserves sudden death and the score',()=>{
 const g=C.create({timeLimit:60});g.phase='fight';g.clock=0;g.suddenDeath=true;g.fighters[1].x=545;
 for(const f of g.fighters)attack(f,'jab',C.MOVES.jab.wind-C.DT);tick(g);assert.equal(g.phase,'break');run(g,450);assert(g.suddenDeath);assert.equal(g.clock,0);assert.deepEqual([...g.scores],[0,0]);
});
test('The classic map distinguishes attacks and high/low guards on both sides',()=>{
 const M=context.M;for(const face of [1,-1]){const forward=face===1?'right':'left',back=face===1?'left':'right';
 let m=M.classic({action:true,[back]:true},true,face);assert(m.edge.kick&&!m.edge.punch);
 m=M.classic({action:true,up:true,[forward]:true},true,face);assert(m.edge.up&&m.edge.kick);
 for(const low of [false,true]){m=M.classic({[back]:true,[low?'down':'up']:true},false,face);assert(m.input.block);assert.equal(m.input.down,low);assert(!m.edge.up);}
 m=M.classic({action:true},false,face);assert(!m.edge.punch,'held action repeats');
 }
});
test('Timed duel: more hit points win, equal hit points go to overtime (10,5 : 10 and 10 : 10)',()=>{
 let g=C.create({timeLimit:60});g.phase='fight';g.clock=C.DT/2;g.fighters[0].hp=10.5;g.fighters[1].hp=10;tick(g);assert.equal(g.phase,'break');assert.equal(g.roundWinner,0);
 g=C.create({timeLimit:60});g.phase='fight';g.clock=C.DT/2;g.fighters[0].hp=10;g.fighters[1].hp=10;tick(g);assert(g.suddenDeath);assert.equal(g.phase,'fight');
});
test('Point mode preserves perfect blocks',()=>{
 const g=C.create({mode:'points'});g.phase='fight';const a=g.fighters[0];
 g.fighters[1].x=a.x+95;attack(a,'jab',C.MOVES.jab.wind-.02);tick(g,C.blank(),C.blank(),{...C.blank(),block:true});assert(g.events.some(e=>e.type==='parry'));assert.equal(g.scores[0],0);
});
// --- Combo-System (Regelwerk §5): Treffer über echte Tastendrücke, damit Takt und Taste geprüft werden.
function fresh(g,{clock=0,block=false,down=false,blockAt=-1}={}){const [a,b]=g.fighters;g.freeze=0;g.freezeQueue=[null,null];a.x=450;b.x=545;a.face=1;b.face=-1;for(const f of [a,b]){f.attack=null;f.stun=0;f.invuln=0;f.knockback=0;f.stride=null;f.settle=null;f.buffer=null;f.block=false;f.blockHeld=false;f.guardRelease=1;f.parryCooldown=0;f.reactionTime=0;f.reaction=null;f.hit=0;f.stagger=0;}a.comboClock=clock;return {block,down,blockAt};}
// Drückt eine Taste und spielt, bis ein Treffer, Block oder Breaker gemeldet wird. blockAt = Tick, ab dem der Verteidiger blockt.
function strike(g,key,mods={},defend={}){const before=g.eventId;const edge={...C.blank(),[key]:true},input={...C.blank(),right:!!mods.forward,down:!!mods.down};let n=0;for(;n<80;n++){const guard=defend.blockAt>=0&&n>=defend.blockAt?{...C.blank(),block:true,down:!!defend.down}:defend.block?{...C.blank(),block:true,down:!!defend.down}:C.blank();tick(g,n?C.blank():input,n?C.blank():edge,guard);const hit=g.events.find(e=>e.id>before&&['hit','block','parry','breaker'].includes(e.type));if(hit)return {event:hit,events:g.events.filter(e=>e.id>before),tick:n};}return {event:null,events:g.events.filter(e=>e.id>before),tick:n};}
function chain(g,count){let last=null;for(let i=0;i<count;i++){fresh(g);last=strike(g,i%2?'kick':'punch');assert.equal(last.event.type,'hit','Treffer '+(i+1));}return last;}
const nextKey=g=>g.fighters[0].comboKey,otherKey=g=>nextKey(g)==='punch'?'kick':'punch';
test('Combo: two hits open nothing, the third opens the chance (2/3)',()=>{
 const g=setup();chain(g,2);assert.equal(g.fighters[0].combo,2);assert(!g.events.some(e=>e.type==='combo'));assert.equal(g.fighters[0].comboKey,null);
 const r=chain(g,1);assert.equal(g.fighters[0].combo,3);assert(r.events.some(e=>e.type==='combo'&&e.phase==='chance'&&e.count===3));assert.equal(g.fighters[0].comboKey,'kick','after a punch the kick is announced');
});
test('Combo beat: a technique started 0,49 s after the contact continues, 0,51 s breaks the chain',()=>{
 let g=setup();chain(g,3);fresh(g,{clock:.49});let r=strike(g,nextKey(g));assert.equal(r.event.type,'hit');assert.equal(g.fighters[0].combo,4);assert(r.events.some(e=>e.type==='combo'&&e.phase==='chain'&&e.count===4));
 g=setup();chain(g,3);fresh(g,{clock:.51});r=strike(g,nextKey(g));assert(r.events.some(e=>e.type==='drop'));assert.equal(r.event.type,'hit');assert.equal(g.fighters[0].combo,1);
});
test('Combo beat: the wrong key breaks the chain, the announced key alternates punch/kick',()=>{
 const g=setup();chain(g,3);assert.equal(nextKey(g),'kick');fresh(g);let r=strike(g,otherKey(g));assert(r.events.some(e=>e.type==='drop'));assert.equal(g.fighters[0].combo,1);
 fresh(g);strike(g,'kick');fresh(g);strike(g,'punch');assert.equal(g.fighters[0].combo,3);assert.equal(nextKey(g),'kick');fresh(g);r=strike(g,'kick');assert.equal(g.fighters[0].combo,4);assert.equal(nextKey(g),'punch');
});
test('Combo chain: an ordinary block of hit 4–6 ends the combo',()=>{const g=setup();chain(g,3);fresh(g);const r=strike(g,nextKey(g),{},{block:true});assert.equal(r.event.type,'block');assert.equal(g.fighters[0].combo,0);assert.equal(g.fighters[1].hp,C.HP-2);});
test('Combo Breaker: matching block 0,125 s before contact of hit 4 breaks, 0,158 s before is an ordinary block, from hit 7 on no breaker',()=>{
 // Fronttritt: erst den Kontakt-Tick T messen; Block ab Tick T−15 → 0,125 s vor Kontakt, ab T−19 → 0,158 s davor.
 let g=setup();chain(g,3);assert.equal(nextKey(g),'kick');fresh(g);const T=strike(g,'kick').tick;assert(T>30&&T<40,'Kontakt-Tick '+T);
 g=setup();chain(g,3);fresh(g);let r=strike(g,'kick',{},{blockAt:T-15});assert.equal(r.event.type,'breaker',JSON.stringify(r.event));assert.equal(g.fighters[0].combo,0);assert(g.fighters[0].stun>.5,'attacker staggers');
 g=setup();chain(g,3);fresh(g);r=strike(g,'kick',{},{blockAt:T-19});assert.equal(r.event.type,'block');assert.equal(g.fighters[0].combo,0);
 g=setup();chain(g,6);fresh(g);assert.equal(g.fighters[0].combo,6);assert.equal(nextKey(g),'punch');r=strike(g,'punch',{},{blockAt:2});assert.equal(r.event.type,'hit','hit 7 cannot be blocked');assert.equal(r.event.combo,7);
 g=setup();chain(g,5);assert.equal(nextKey(g),'kick');fresh(g);r=strike(g,'kick',{},{blockAt:T-15});assert.equal(r.event.type,'breaker','hit 6 can still be broken');
});
test('Combo show: hits 7–9 land through a matching guard, the combo ends after 9 and the next hit counts as 1',()=>{
 const g=setup();chain(g,6);const hp=g.fighters[1].hp;
 for(let n=7;n<=9;n++){fresh(g);const r=strike(g,nextKey(g),{},{block:true});assert.equal(r.event.type,'hit','hit '+n);assert.equal(r.event.combo,n);assert(r.events.some(e=>e.type==='combo'&&e.phase==='show'&&e.count===n));}
 assert.equal(g.fighters[1].hp,hp-2);assert.equal(g.fighters[0].combo,0);assert.equal(g.fighters[0].comboKey,null);
 fresh(g);const r=strike(g,'punch');assert.equal(r.event.combo,1);
});
test('Combo resets when the attacker is hit and at the end of a round; nine strong hits cost nine points',()=>{
 let g=setup();chain(g,4);fresh(g);g.fighters[1].comboClock=0;const b=g.fighters[1];b.x=545;b.face=-1;attack(b,'jab',C.MOVES.jab.wind-C.DT);tick(g);assert.equal(g.fighters[0].combo,0);
 g=setup();chain(g,3);g.fighters[1].hp=.5;fresh(g);strike(g,nextKey(g));assert.equal(g.phase,'break');run(g,400);assert.equal(g.fighters[0].combo,0);assert.equal(g.fighters[0].hp,C.HP);
 g=setup();const hp=g.fighters[1].hp;for(let i=0;i<9;i++){fresh(g);const r=strike(g,i%2?'kick':'punch',{forward:true});assert.equal(r.event.type,'hit');assert.equal(r.event.damage,1);}assert.equal(g.fighters[1].hp,hp-9);
});
test('Point mode: no combo events, counters stay at zero',()=>{const g=C.create({mode:'points'});g.phase='fight';g.fighters[1].hp=C.HP;fresh(g);const r=strike(g,'punch');assert.equal(r.event.type,'hit');assert.equal(r.event.combo,0);assert.equal(g.fighters[0].combo,0);assert(!g.events.some(e=>e.type==='combo'));});
test('Serialized online state resolves a combo identically',()=>{const g=setup(),copy=JSON.parse(JSON.stringify(g));for(let i=0;i<4;i++){for(const x of [g,copy]){fresh(x);strike(x,x.fighters[0].comboKey||(i%2?'kick':'punch'));}}assert.equal(g.fighters[0].combo,4);assert.equal(JSON.stringify(g),JSON.stringify(copy));});
// --- Schritt 4: Anatomie und Trefferreaktionen (Plan 4a/4b), gemessen an der Pose.
const joints=p=>[p.hip,p.shoulder,p.neck,p.head,...p.frontArm,...p.backArm,...p.frontLeg,...p.backLeg];
const lengthsOk=p=>{for(const [limb,lengths] of [[p.frontArm,[37,36]],[p.backArm,[37,36]],[p.frontLeg,[55,55]],[p.backLeg,[55,55]]])for(let i=0;i<2;i++)if(Math.abs(Math.hypot(limb[i+1][0]-limb[i][0],limb[i+1][1]-limb[i][1])-lengths[i])>.001)return false;return true;};
function reacting(kind,age){const f=C.fighter(0);f.reaction=kind;f.reactionTime=C.MOVES&&C.REACTIONS[kind][0]*(1-age);return R.pose(f);}
test('Weight sits over the planted foot during a step (hip within 20 of the support foot) and between the feet when standing or blocking',()=>{
 for(const rel of [1,-1])for(const phase of [.25,.75]){const f=C.fighter(0);const length=rel>0?36:30;f.stride={t:phase*.36,duration:.36,dir:rel,length};const p=R.pose(f);
  const frontFirst=rel>0,support=phase<.5?(frontFirst?p.backLeg[2]:p.frontLeg[2]):(frontFirst?p.frontLeg[2]:p.backLeg[2]);
  assert(Math.abs(p.hip[0]-support[0])<=20,`Schritt ${rel} Phase ${phase}: Hüfte ${p.hip[0].toFixed(1)} Standfuß ${support[0].toFixed(1)}`);}
 for(const block of [false,true])for(const crouch of [false,true]){const f=C.fighter(0);f.block=block;f.crouch=crouch;const p=R.pose(f);assert(p.hip[0]>p.backLeg[2][0]&&p.hip[0]<p.frontLeg[2][0],'Hüfte zwischen den Füßen');}
});
test('No joint goes below the floor line in any technique, block or reaction',()=>{
 const states=[];for(const kind of Object.keys(C.MOVES))for(let t=0;t<C.MOVES[kind].duration;t+=.02){const f=C.fighter(0);f.attack={kind,t,spent:[],hand:0,leg:0,stance:null};states.push(f);}
 for(const kind of Object.keys(C.REACTIONS))for(let age=0;age<=1;age+=.05){const f=C.fighter(0);f.reaction=kind;f.reactionTime=C.REACTIONS[kind][0]*(1-age);states.push(f);}
 for(const f of states){const p=R.pose(f);assert(lengthsOk(p),'Segmentlängen');for(const q of joints(p))assert(q[1]<=0,`Gelenk unter dem Boden: ${JSON.stringify(q)} bei ${f.attack?.kind||f.reaction}`);}
});
test('Body hit folds the torso forward by at least 0,45 rad and drops the hip at least 8 units',()=>{const idle=R.pose(C.fighter(0)),p=reacting('body',.45);assert(p.lean-idle.lean>=.45,'lean '+(p.lean-idle.lean).toFixed(2));assert(p.hip[1]-idle.hip[1]>=8,'hip '+(p.hip[1]-idle.hip[1]).toFixed(1));});
test('Strong hit drops to one knee: hip at least 35 lower, rear knee at most 12 above the floor, back up at the end',()=>{const idle=R.pose(C.fighter(0)),p=reacting('knee',.45);assert(p.hip[1]-idle.hip[1]>=35,'hip '+(p.hip[1]-idle.hip[1]).toFixed(1));assert(-p.backLeg[1][1]<=12,'knee height '+(-p.backLeg[1][1]).toFixed(1));const end=reacting('knee',1);assert(Math.abs(end.hip[1]-idle.hip[1])<.5);assert.deepEqual([...C.REACTIONS.knee],[.45,.30]);});
test('Sweep knocks down: head at most 60 above the floor after 0,25 s, standing again by 0,65 s',()=>{const f=C.fighter(0);f.reaction='down';f.reactionTime=C.REACTIONS.down[0]-.25;const p=R.pose(f);assert(-p.head[1]<=60,'head height '+(-p.head[1]).toFixed(1));const idle=R.pose(C.fighter(0)),end=reacting('down',1);assert(Math.abs(end.hip[1]-idle.hip[1])<.5&&Math.abs(end.head[1]-idle.head[1])<.5);assert.deepEqual([...C.REACTIONS.down],[.65,.50]);});
test('Reaction kinds follow the technique: body, down for the sweep, knee for strong hits, head for light high hits; no block or attack while stunned, free right after',()=>{
 const expect={jab:'head',body:'body',sweep:'down',lunge:'knee',kick:'knee',side:'knee',air:'knee'};
 for(const [kind,reaction] of Object.entries(expect)){const g=setup();attack(g.fighters[0],kind);let n=0;while(!g.fighters[1].reaction&&n<150){tick(g);n++;}const d=g.fighters[1];assert.equal(d.reaction,reaction,kind);assert.equal(d.stun,C.REACTIONS[reaction][1]);
  const held={...C.blank(),block:true};let ticks=0;while(d.stun>0&&ticks<200){tick(g,C.blank(),C.blank(),held);if(d.stun>0)assert(!d.block,'no block while stunned after '+kind);ticks++;}assert(ticks>=Math.round(C.REACTIONS[reaction][1]*120)-1,'stun lasted '+ticks+' ticks');tick(g,C.blank(),C.blank(),held);assert(d.block,'free right after the stun: '+kind);}
});
test('No slow motion: hit-stop never exceeds 0,065 s',()=>{const src=require('node:fs').readFileSync(require('node:path').join(root,'src','engine.js'),'utf8');for(const m of src.matchAll(/g\.freeze=Math\.max\(g\.freeze,(.*?)\);/g))for(const v of m[1].match(/\.\d+/g))assert(Number(v)<=.065,'freeze '+v);const g=setup();attack(g.fighters[0],'kick');let max=0;for(let i=0;i<150;i++){tick(g);max=Math.max(max,g.freeze);}assert(max<=.065&&max>0);});
console.log(checks+' combat, movement and rules checks passed');
