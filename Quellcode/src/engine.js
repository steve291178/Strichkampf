'use strict';
const Combat=(()=>{
const W=1280,FLOOR=542,DT=1/120,STEP_TIME=.36,STEP_REST=.07,PARRY_WINDOW=.14;
const MOVES={
 jab:{damage:10,duration:.38,wind:.13,active:.085,reach:88,height:153,level:'high',label:'Gerade'},
 lunge:{damage:20,duration:.68,wind:.27,active:.09,reach:105,height:153,level:'high',label:'Schrittgerade'},
 body:{damage:10,duration:.44,wind:.17,active:.09,reach:88,height:83,level:'low',label:'Körperschlag'},
 kick:{damage:20,duration:.76,wind:.32,active:.105,reach:110,height:113,level:'high',label:'Fronttritt'},
 side:{damage:20,duration:.9,wind:.4,active:.11,reach:120,height:148,level:'high',label:'Seitwärtstritt'},
 sweep:{damage:10,duration:.79,wind:.34,active:.11,reach:103,height:18,level:'low',label:'Beinfeger'},
 air:{damage:20,duration:.7,wind:.23,active:.11,reach:117,height:73,level:'high',label:'Sprungtritt'},
 combo:{damage:10,duration:1.06,wind:.14,active:.075,beats:[.14,.39,.64],reach:101,height:151,level:'high',label:'Dreier-Serie'}
};
const blank=()=>({left:false,right:false,up:false,down:false,punch:false,kick:false,block:false,combo:false});
const fighter=i=>({id:i,x:i?830:450,y:0,vy:0,hp:100,face:i?-1:1,nextHand:0,nextLeg:0,attack:null,stun:0,invuln:0,crouch:false,block:false,walk:0,move:0,hit:0,stride:null,settle:null,stepRest:0,guardAge:9,guardRelease:1,blockHeld:false,parryCooldown:0,parryFlash:0,stagger:0,streak:0,comboReady:false,buffer:null,reaction:null,reactionTime:0,knockback:0,fall:0});
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
function beginAttack(g,f,kind){const punching=['jab','lunge','body','combo'].includes(kind),hand=punching?f.nextHand:0;if(punching)f.nextHand=(f.nextHand+(kind==='combo'?3:1))%2;const leg=punching?0:f.nextLeg;if(!punching)f.nextLeg=1-f.nextLeg;const stance=f.stride||f.settle?KarateRig.pose(f):null;f.attack={kind,t:0,spent:[],hand,leg,sounded:[],stance:stance?{front:stance.frontLeg[2],back:stance.backLeg[2]}:null};f.crouch=kind==='body'||kind==='sweep';f.block=false;f.stride=null;f.settle=null;f.buffer=null;if(kind==='combo'){f.comboReady=false;f.streak=0;event(g,{type:'combo',who:f.id});}event(g,{type:'swing',who:f.id,kind});}
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
 if(f.attack){f.attack.t+=dt;const m=MOVES[f.attack.kind];if(m.beats)for(let i=1;i<m.beats.length;i++){if(f.attack.t>=m.beats[i]-.075&&!f.attack.sounded.includes(i)){f.attack.sounded.push(i);event(g,{type:'swing',who:f.id,kind:'jab'});}}if(f.attack.t>=m.duration){const ending=KarateRig.pose(f);f.attack=null;if(f.y===0)settleFeet(f,ending);}}
 if(!f.attack)f.face=o.x>=f.x?1:-1;
 const ground=f.y===0,comboRequested=g.rules.mode==='duel'&&edge.combo&&f.comboReady;
 // The second key of a near-simultaneous J+K press may replace the initial wind-up.
 if(comboRequested&&f.attack&&f.attack.t<.085&&['jab','kick','lunge','side'].includes(f.attack.kind))f.attack=null;
 const free=!f.attack&&f.stun===0;
 if(input.block&&!f.blockHeld&&releasedFor>=.12&&free&&ground&&f.parryCooldown===0)f.guardAge=0;
 f.blockHeld=input.block;f.crouch=ground&&input.down&&free;f.block=ground&&input.block&&free;f.move=0;
 if((f.block||f.crouch||f.stun>0)&&f.stride){const ending=KarateRig.pose(f);f.stride=null;settleFeet(f,ending);}
 if(edge.punch||edge.kick||comboRequested){f.buffer={punch:!!edge.punch,kick:!!edge.kick,combo:!!comboRequested,down:!!input.down,forward:f.face===1?input.right:input.left,ttl:.12};}
 if(input.block)f.buffer=null;
 if(free){
  if(edge.up&&ground&&!f.block){f.vy=625;f.y=.01;f.crouch=false;f.stride=null;f.settle=null;event(g,{type:'jump',who:f.id});}
  let kind=null;const q=f.buffer;
  if(q&&!f.block){if(q.combo&&f.comboReady&&ground)kind='combo';else if(q.punch&&ground)kind=q.down?'body':q.forward?'lunge':'jab';else if(q.kick)kind=f.y>0?'air':q.down?'sweep':q.forward?'side':'kick';}
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
function collision(a,b){
 const atk=a.attack;if(!atk||b.invuln>0)return null;const m=MOVES[atk.kind],beats=m.beats||[m.wind];
 // Contact begins during the final extension, not only once the limb is fully out.
 const beat=beats.findIndex((start,i)=>!atk.spent.includes(i)&&atk.t>=start-.055&&atk.t<=start+m.active);if(beat<0)return null;
 const dx=(b.x-a.x)*a.face;if(dx<0)return null;
 const strike=KarateRig.geometry(a).strike,target=KarateRig.geometry(b);if(!strike)return null;
 const facing=(a.x-b.x)*b.face>=0;
 const guarded=b.block&&facing&&(m.level==='low'?b.crouch:!b.crouch);
 const guardContact=guarded&&target.guard.some(part=>KarateRig.touches(strike,part));
 if(!guardContact&&!target.body.some(part=>KarateRig.touches(strike,part)))return null;
 atk.spent.push(beat);
 return {a,b,m,beat,kind:atk.kind,blocked:guarded,x:(strike.a[0]+strike.b[0])/2,y:(strike.a[1]+strike.b[1])/2};
}
function step(g,inputs,edges,dt=DT){
 if(g.paused.some(Boolean))return;
 if(g.phase==='over'){advanceFall(g,dt);return;}
 g.elapsed+=dt;
 if(g.phase==='break'){advanceFall(g,dt);g.breakTime-=dt;if(g.breakTime<=0){if(g.rules.mode==='duel'&&g.roundWinner>=0)g.round++;resetExchange(g);}return;}
 if(g.freeze>0){
  for(let i=0;i<2;i++){if(inputs[i].block)g.freezeQueue[i]=null;else if(['up','punch','kick','combo'].some(k=>edges[i][k]))g.freezeQueue[i]={input:{...inputs[i]},edge:{...edges[i]}};}
  g.freeze=Math.max(0,g.freeze-dt);return;
 }
 inputs=inputs.slice();edges=edges.slice();
 for(let i=0;i<2;i++){const pending=g.freezeQueue[i];if(pending&&!inputs[i].block&&!['up','punch','kick','combo'].some(k=>edges[i][k])){inputs[i]=pending.input;edges[i]=pending.edge;}g.freezeQueue[i]=null;}
 if(g.phase==='countdown'){g.countdown-=dt;if(g.countdown<=0){g.phase='fight';event(g,{type:'start'});}return;}
 const [a,b]=g.fighters;tickFighter(g,a,b,inputs[0],edges[0],dt);tickFighter(g,b,a,inputs[1],edges[1],dt);
 const dx=b.x-a.x,min=56;if(Math.abs(dx)<min&&Math.abs(a.y-b.y)<140){const dir=dx>=0?1:-1,shift=(min-Math.abs(dx))/2;a.x-=dir*shift;b.x+=dir*shift;}for(const f of g.fighters)f.x=Math.max(75,Math.min(W-75,f.x));
 const contacts=[collision(a,b),collision(b,a)].filter(Boolean);
 const damaged=new Set(contacts.filter(c=>!c.blocked).map(c=>c.b.id));
 // Resolve both collected contacts together so a simultaneous KO stays possible.
 for(const {a:att,b:def,m,kind,beat,blocked,x,y} of contacts){
  if(blocked){const perfect=def.guardAge<=PARRY_WINDOW&&def.parryCooldown===0;
   if(perfect){att.stun=.55;att.stagger=.55;att.attack=null;att.stride=null;att.settle=null;att.buffer=null;def.parryFlash=.48;def.parryCooldown=.65;def.guardAge=9;}
   att.knockback-=att.face*(perfect?18:7);g.freeze=Math.max(g.freeze,perfect?.045:.02);
   event(g,{type:perfect?'parry':'block',x,y,who:def.id,kind});
  }else{
   const finisher=kind==='combo'&&beat===2;
   def.hp=g.rules.mode==='points'||g.suddenDeath?0:Math.max(0,def.hp-m.damage);
   def.stun=finisher?.36:m.beats?.12:.21;def.invuln=m.beats?.14:.24;def.hit=.22;
   def.reaction=kind==='body'?'body':kind==='sweep'?'low':finisher?'stumble':'high';def.reactionTime=finisher?.48:.28;
   g.freeze=Math.max(g.freeze,finisher?.065:m.damage===20?.045:.03);def.block=false;def.attack=null;def.stride=null;def.settle=null;def.buffer=null;def.streak=0;def.comboReady=false;
   def.knockback+=att.face*(finisher?28:m.beats?4:m.damage===20?16:9);
   if(g.rules.mode==='duel'&&!m.beats&&!damaged.has(att.id)){att.streak=Math.min(3,att.streak+1);if(att.streak===3&&!att.comboReady){att.comboReady=true;event(g,{type:'ready',who:att.id});}}
   event(g,{type:'hit',x,y,who:att.id,damage:m.damage,label:m.label,kind,finisher});
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
return {W,FLOOR,DT,MOVES,STEP_TIME,STEP_REST,PARRY_WINDOW,blank,fighter,create,rules,step};
})();
