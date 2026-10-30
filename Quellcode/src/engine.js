'use strict';
const Combat=(()=>{
const W=1280,FLOOR=542,DT=1/120,STEP_TIME=.36,STEP_REST=.07,PARRY_WINDOW=.14;
// Regelwerk §5, Combo (nur Duell): Treffer 1–3 öffnen die Chance, 4–6 laufen nur im Takt mit der
// angezeigten Taste weiter (Combo Breaker = perfekter Block), 7–9 sind nicht blockbar, Ende bei 9.
const COMBO_BEAT=.5,COMBO_CHAIN=3,COMBO_SHOW=6,COMBO_MAX=9;
// Regelwerk §4: Duell startet mit 20 Trefferpunkten, leichte Technik −½, starke −1.
const HP=20;
const MOVES={
 jab:{damage:.5,duration:.38,wind:.13,active:.085,reach:88,height:153,level:'high',label:'Gerade'},
 lunge:{damage:1,duration:.68,wind:.27,active:.09,reach:105,height:153,level:'high',label:'Schrittgerade'},
 body:{damage:.5,duration:.44,wind:.17,active:.09,reach:88,height:83,level:'low',label:'Körperschlag'},
 kick:{damage:1,duration:.76,wind:.32,active:.105,reach:110,height:113,level:'high',label:'Fronttritt'},
 side:{damage:1,duration:.9,wind:.4,active:.11,reach:120,height:148,level:'high',label:'Seitwärtstritt'},
 sweep:{damage:.5,duration:.79,wind:.34,active:.11,reach:103,height:18,level:'low',label:'Beinfeger'},
 air:{damage:1,duration:.7,wind:.23,active:.11,reach:117,height:73,level:'high',label:'Sprungtritt'}
};
const PUNCHES=['jab','lunge','body'];
const strong=m=>m.damage>=1;
const blank=()=>({left:false,right:false,up:false,down:false,punch:false,kick:false,block:false});
const fighter=i=>({id:i,x:i?830:450,y:0,vy:0,hp:HP,face:i?-1:1,nextHand:0,nextLeg:0,attack:null,stun:0,invuln:0,crouch:false,block:false,walk:0,move:0,hit:0,stride:null,settle:null,stepRest:0,guardAge:9,guardRelease:1,blockHeld:false,parryCooldown:0,parryFlash:0,stagger:0,buffer:null,reaction:null,reactionTime:0,knockback:0,fall:0,combo:0,comboClock:0,comboKey:null});
const rules=options=>({mode:options?.mode==='points'?'points':'duel',pointsToWin:options?.pointsToWin===3?3:2,roundsToWin:2,timeLimit:[60,90].includes(options?.timeLimit)?options.timeLimit:0});
const create=options=>{const r=rules(options);return {phase:'countdown',countdown:2.1,elapsed:0,paused:[false,false],fighters:[fighter(0),fighter(1)],winner:null,eventId:0,events:[],rules:r,scores:[0,0],round:1,clock:r.timeLimit,suddenDeath:false,freeze:0,breakTime:0,roundWinner:null,roundReason:'',exchange:0,freezeQueue:[null,null]};};
function resetExchange(g){g.fighters=[fighter(0),fighter(1)];g.phase='countdown';g.countdown=1.5;g.freeze=0;g.freezeQueue=[null,null];g.exchange++;g.roundWinner=null;if(g.rules.mode==='duel'&&g.roundReason!=='double'){g.clock=g.rules.timeLimit;g.suddenDeath=false;}event(g,{type:'reset'});}
function finishExchange(g,winner,reason){
 g.roundWinner=winner;g.roundReason=reason;g.breakTime=2.1;g.freeze=0;
 if(winner>=0)g.scores[winner]++;
 const target=g.rules.mode==='points'?g.rules.pointsToWin:g.rules.roundsToWin;
 const complete=winner>=0&&(g.scores[winner]>=target||(g.rules.mode==='points'&&g.suddenDeath));
 g.phase=complete?'over':'break';g.winner=complete?winner:null;
 for(const f of g.fighters){f.attack=null;f.buffer=null;f.stride=null;f.settle=null;f.block=false;if(f.hp===0)f.fall=.001;}
 event(g,{type:complete?'match':'round',winner,reason});
}
function advanceFall(g,dt){for(const f of g.fighters)if(f.fall>0)f.fall=Math.min(1,f.fall+dt/.55);}

const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
function event(g,e){g.events.push({...e,id:++g.eventId});if(g.events.length>32)g.events.shift();}
function dropCombo(g,f){if(f.combo>=COMBO_CHAIN)event(g,{type:'drop',who:f.id,count:f.combo});f.combo=0;f.comboKey=null;}
function beginAttack(g,f,kind){const punching=PUNCHES.includes(kind),hand=punching?f.nextHand:0;
 // Chain phase: the next technique must start within the beat and use the announced key.
 if(f.combo>=COMBO_CHAIN&&(f.comboClock>COMBO_BEAT||(punching?'punch':'kick')!==f.comboKey))dropCombo(g,f);
if(punching)f.nextHand=(f.nextHand+1)%2;const leg=punching?0:f.nextLeg;if(!punching)f.nextLeg=1-f.nextLeg;const stance=f.stride||f.settle?KarateRig.pose(f):null;f.attack={kind,t:0,spent:[],hand,leg,stance:stance?{front:stance.frontLeg[2],back:stance.backLeg[2]}:null};f.crouch=kind==='body'||kind==='sweep';f.block=false;f.stride=null;f.settle=null;f.buffer=null;event(g,{type:'swing',who:f.id,kind});}
// Recover an interrupted stance with two short foot placements, never a teleport.
function settleFeet(f,p){
 const front=p.frontLeg[2],back=p.backLeg[2];
 if(Math.hypot(front[0]-42,front[1]+4)+Math.hypot(back[0]+43,back[1]+4)>.15)
  f.settle={front:front.slice(),back:back.slice(),t:0,duration:.18};
}
function tickFighter(g,f,o,input,edge,dt){
 if(f.settle){f.settle.t+=dt;if(f.settle.t>=f.settle.duration)f.settle=null;}
 for(const k of ['stun','invuln','hit','stepRest','parryCooldown','parryFlash','stagger','reactionTime'])f[k]=Math.max(0,f[k]-dt);
 if(f.knockback){const move=f.knockback*(1-Math.exp(-15*dt));f.x+=move;f.knockback-=move;if(Math.abs(f.knockback)<.05)f.knockback=0;}
 f.guardAge+=dt;const releasedFor=f.guardRelease;f.guardRelease=input.block?0:f.guardRelease+dt;
 if(f.buffer){f.buffer.ttl-=dt;if(f.buffer.ttl<=0)f.buffer=null;}
 f.comboClock=Math.min(9,f.comboClock+dt);
 if(f.attack){f.attack.t+=dt;const m=MOVES[f.attack.kind];if(f.attack.t>=m.duration){const ending=KarateRig.pose(f);f.attack=null;if(f.y===0)settleFeet(f,ending);}}
 if(!f.attack)f.face=o.x>=f.x?1:-1;
 const ground=f.y===0;
 const free=!f.attack&&f.stun===0;
 if(input.block&&!f.blockHeld&&releasedFor>=.12&&free&&ground&&f.parryCooldown===0)f.guardAge=0;
 f.blockHeld=input.block;f.crouch=ground&&input.down&&free;f.block=ground&&input.block&&free;f.move=0;
 if((f.block||f.crouch||f.stun>0)&&f.stride){const ending=KarateRig.pose(f);f.stride=null;settleFeet(f,ending);}
 if(edge.punch||edge.kick){f.buffer={punch:!!edge.punch,kick:!!edge.kick,down:!!input.down,forward:f.face===1?input.right:input.left,ttl:.12};}
 if(input.block)f.buffer=null;
 if(free){
  if(edge.up&&ground&&!f.block){f.vy=625;f.y=.01;f.crouch=false;f.stride=null;f.settle=null;event(g,{type:'jump',who:f.id});}
  let kind=null;const q=f.buffer;
  if(q&&!f.block){if(q.punch&&ground)kind=q.down?'body':q.forward?'lunge':'jab';else if(q.kick)kind=f.y>0?'air':q.down?'sweep':q.forward?'side':'kick';}
  if(kind)beginAttack(g,f,kind);
  else if(!f.block&&!f.crouch){
   const dir=Number(input.right)-Number(input.left);
   if(f.y>0){f.x+=dir*125*dt;f.move=dir;}
   else{if(!f.stride&&!f.settle&&dir&&f.stepRest===0){const available=dir>0?W-75-f.x:f.x-75,length=Math.min(dir===f.face?36:30,available);if(length>.1)f.stride={t:0,duration:STEP_TIME,dir,length};}
    if(f.stride){const s=f.stride,old=smooth(s.t/s.duration);s.t=Math.min(s.duration,s.t+dt);f.x+=s.dir*s.length*(smooth(s.t/s.duration)-old);f.move=s.dir;f.walk=s.t/s.duration;if(s.t>=s.duration){f.stride=null;f.stepRest=STEP_REST;event(g,{type:'step',who:f.id});}}
   }
  }
 }
 if(f.attack?.kind==='lunge'){const t=f.attack.t,w=MOVES.lunge.wind;f.x+=f.face*20*(smooth(t/w)-smooth(Math.max(0,t-dt)/w));}
 if(f.y>0||f.vy>0){f.y+=f.vy*dt;f.vy-=1850*dt;if(f.y<0){f.y=0;f.vy=0;event(g,{type:'land',who:f.id});}}
 f.x=Math.max(75,Math.min(W-75,f.x));
}
function collision(a,b,duel){
 const atk=a.attack;if(!atk||b.invuln>0||atk.spent.length)return null;const m=MOVES[atk.kind];
 // Contact begins during the final extension, not only once the limb is fully out.
 if(atk.t<m.wind-.055||atk.t>m.wind+m.active)return null;
 const dx=(b.x-a.x)*a.face;if(dx<0)return null;
 const strike=KarateRig.geometry(a).strike,target=KarateRig.geometry(b);if(!strike)return null;
 const facing=(a.x-b.x)*b.face>=0;
 const guarded=b.block&&facing&&(m.level==='low'?b.crouch:!b.crouch)&&!(duel&&a.combo>=COMBO_SHOW);
 const guardContact=guarded&&target.guard.some(part=>KarateRig.touches(strike,part));
 if(!guardContact&&!target.body.some(part=>KarateRig.touches(strike,part)))return null;
 atk.spent.push(0);
 return {a,b,m,kind:atk.kind,blocked:guarded,x:(strike.a[0]+strike.b[0])/2,y:(strike.a[1]+strike.b[1])/2};
}
function step(g,inputs,edges,dt=DT){
 if(g.paused.some(Boolean))return;
 if(g.phase==='over'){advanceFall(g,dt);return;}
 g.elapsed+=dt;
 if(g.phase==='break'){advanceFall(g,dt);g.breakTime-=dt;if(g.breakTime<=0){if(g.rules.mode==='duel'&&g.roundWinner>=0)g.round++;resetExchange(g);}return;}
 if(g.freeze>0){
  for(let i=0;i<2;i++){if(inputs[i].block)g.freezeQueue[i]=null;else if(['up','punch','kick'].some(k=>edges[i][k]))g.freezeQueue[i]={input:{...inputs[i]},edge:{...edges[i]}};}
  g.freeze=Math.max(0,g.freeze-dt);return;
 }
 inputs=inputs.slice();edges=edges.slice();
 for(let i=0;i<2;i++){const pending=g.freezeQueue[i];if(pending&&!inputs[i].block&&!['up','punch','kick'].some(k=>edges[i][k])){inputs[i]=pending.input;edges[i]=pending.edge;}g.freezeQueue[i]=null;}
 if(g.phase==='countdown'){g.countdown-=dt;if(g.countdown<=0){g.phase='fight';event(g,{type:'start'});}return;}
 const [a,b]=g.fighters;tickFighter(g,a,b,inputs[0],edges[0],dt);tickFighter(g,b,a,inputs[1],edges[1],dt);
 const dx=b.x-a.x,min=56;if(Math.abs(dx)<min&&Math.abs(a.y-b.y)<140){const dir=dx>=0?1:-1,shift=(min-Math.abs(dx))/2;a.x-=dir*shift;b.x+=dir*shift;}for(const f of g.fighters)f.x=Math.max(75,Math.min(W-75,f.x));
 const duel=g.rules.mode==='duel',contacts=[collision(a,b,duel),collision(b,a,duel)].filter(Boolean);
 // Resolve both collected contacts together so a simultaneous KO stays possible.
 for(const {a:att,b:def,m,kind,blocked,x,y} of contacts){
  if(blocked){const perfect=def.guardAge<=PARRY_WINDOW&&def.parryCooldown===0,breaker=perfect&&duel&&att.combo>=COMBO_CHAIN;
   if(perfect){att.stun=.55;att.stagger=.55;att.attack=null;att.stride=null;att.settle=null;att.buffer=null;def.parryFlash=.48;def.parryCooldown=.65;def.guardAge=9;}
   att.knockback-=att.face*(breaker?26:perfect?18:7);g.freeze=Math.max(g.freeze,perfect?.045:.02);
   if(duel&&att.combo>=COMBO_CHAIN){att.combo=0;att.comboKey=null;}
   event(g,{type:breaker?'breaker':perfect?'parry':'block',x,y,who:def.id,kind});
  }else{
   def.hp=g.rules.mode==='points'||g.suddenDeath?0:Math.max(0,def.hp-m.damage);
   def.stun=.21;def.invuln=.24;def.hit=.22;
   def.reaction=kind==='body'?'body':kind==='sweep'?'low':'high';def.reactionTime=.28;
   g.freeze=Math.max(g.freeze,strong(m)?.045:.03);def.block=false;def.attack=null;def.stride=null;def.settle=null;def.buffer=null;
   let combo=0;
   if(duel){
    att.combo++;att.comboClock=0;combo=att.combo;att.comboKey=combo>=COMBO_CHAIN?(PUNCHES.includes(kind)?'kick':'punch'):null;
    def.combo=0;def.comboKey=null;
   }
   // Inside a combo the defender stays close, so the beat remains reachable.
   def.knockback+=att.face*(combo>COMBO_CHAIN?4:strong(m)?16:9);
   event(g,{type:'hit',x,y,who:att.id,damage:m.damage,label:m.label,kind,strong:strong(m),combo});
   if(combo>=COMBO_CHAIN){event(g,{type:'combo',who:att.id,count:combo,phase:combo===COMBO_CHAIN?'chance':combo<=COMBO_SHOW?'chain':'show'});if(combo>=COMBO_MAX){att.combo=0;att.comboKey=null;}}
  }
 }
 if(a.hp===0||b.hp===0){finishExchange(g,a.hp===b.hp?-1:a.hp>0?0:1,a.hp===b.hp?'double':g.rules.mode==='points'?'point':'ko');return;}
 if(g.rules.timeLimit&&!g.suddenDeath){
  g.clock=Math.max(0,g.clock-dt);
  if(g.clock===0){
   const values=g.rules.mode==='points'?g.scores:g.fighters.map(f=>f.hp);
   if(values[0]===values[1]){g.suddenDeath=true;event(g,{type:'sudden'});}
   else{const winner=values[0]>values[1]?0:1;if(g.rules.mode==='points'){g.phase='over';g.winner=winner;g.roundReason='time';event(g,{type:'match',winner,reason:'time'});}else finishExchange(g,winner,'time');}
  }
 }
}
return {W,FLOOR,DT,HP,MOVES,STEP_TIME,STEP_REST,PARRY_WINDOW,COMBO_BEAT,COMBO_CHAIN,COMBO_SHOW,COMBO_MAX,blank,fighter,create,rules,step};
})();
