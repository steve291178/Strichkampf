'use strict';
// Computer opponent (Regelwerk §6). It reads the fight with a delay and presses the same
// keys a human could; it never touches the engine directly. Randomness is injectable so
// simulated matches repeat exactly for a given seed.
const DojoAI=(()=>{
// Level table: reaction = seconds of delay before the opponent's state is "seen",
// tick = seconds between decisions (min/max), block = chance to answer a seen attack with a block,
// guard = chance to keep the guard up while the opponent is close, punish = chance to strike
// right after the opponent's technique ends. Reaction and tick fall, block rises, from level to level.
const LEVELS={
 1:{name:'Grün',belt:'green',reaction:.18,tick:[.14,.24],block:.70,guard:.40,punish:.55,jumpSweep:.12,styles:['kicker'],switchEvery:0},
 2:{name:'Schwarz',belt:'black',reaction:.11,tick:[.09,.15],block:.82,guard:.50,punish:.75,jumpSweep:.22,styles:['kicker','boxer'],switchEvery:'round'},
 3:{name:'Meister 2',belt:'black',reaction:.05,tick:[.05,.08],block:.92,guard:.60,punish:.95,jumpSweep:.32,styles:['kicker','boxer','counter'],switchEvery:4}
};
// Fighting styles: preferred distance and how an open moment is spent (weights sum to 1).
const STYLES={
 kicker:{range:114,weights:[['back',.09],['forward',.08],['sweep',.12],['punch',.14],['kick',.37],['air',.10],['block',.10]]},
 boxer:{range:94,weights:[['back',.05],['forward',.16],['sweep',.05],['punch',.46],['kick',.14],['air',.03],['block',.11]]},
 counter:{range:120,weights:[['back',.18],['forward',.05],['sweep',.14],['punch',.12],['kick',.14],['air',.05],['block',.32]]}
};
// Broken level values (0, 4, -1, null, "x", 2.5) fall back quietly to level 1.
function level(value){const n=Number(value);return Number.isInteger(n)&&LEVELS[n]?n:1;}
function create(wanted,self=1,random=Math.random){
 const n=level(wanted);
 return {level:n,params:LEVELS[n],self,random,timer:0,input:Combat.blank(),memory:[],style:0,styleClock:0,switches:0,exchange:-1,lastHp:null,sawAttack:false};
}
function switchStyle(s){const count=s.params.styles.length;if(count<2)return;s.style=(s.style+1)%count;s.styleClock=0;s.switches++;}
function think(s,g,dt){
 const idle={input:Combat.blank(),edges:Combat.blank()};
 if(!g||!g.fighters)return idle;
 const me=g.fighters[s.self],foe=g.fighters[1-s.self];
 if(g.exchange!==s.exchange){
  // New exchange: forget the old fight, level 2 changes its style every round.
  const first=s.exchange<0;s.exchange=g.exchange;s.memory=[];s.timer=0;s.input=Combat.blank();s.lastHp=me.hp;s.sawAttack=false;
  if(!first&&s.params.switchEvery==='round')switchStyle(s);
 }
 if(g.phase!=='fight'||g.freeze>0)return idle;
 if(typeof s.params.switchEvery==='number'&&s.params.switchEvery>0){
  s.styleClock+=dt;
  if(s.styleClock>=s.params.switchEvery||me.hp<s.lastHp)switchStyle(s);
  s.lastHp=me.hp;
 }
 s.memory.push({at:g.elapsed,x:foe.x,y:foe.y,attack:foe.attack?foe.attack.kind:null,crouch:foe.crouch,hit:foe.hit>0});
 while(s.memory.length>120)s.memory.shift();
 s.timer-=dt;
 // Nothing old enough to have been seen yet: the AI is still blind right after a reset.
 const seen=s.memory.findLast(o=>o.at<=g.elapsed-s.params.reaction);
 if(!seen)return {input:s.input,edges:Combat.blank()};
 // Like a human, the AI reacts to an event (an attack starts or ends) at once; otherwise it decides on its own clock.
 const eventSeen=!!seen.attack!==s.sawAttack;
 if(s.timer>0&&!eventSeen)return {input:s.input,edges:Combat.blank()};
 const [tMin,tMax]=s.params.tick;s.timer=tMin+s.random()*(tMax-tMin);
 const style=STYLES[s.params.styles[s.style]],distance=Math.abs(seen.x-me.x);
 const forward=seen.x>me.x?'right':'left',back=forward==='right'?'left':'right';
 const a=Combat.blank(),e=Combat.blank(),r=s.random;
 const free=!me.attack&&me.stun===0;
 const justRecovered=s.sawAttack&&!seen.attack;s.sawAttack=!!seen.attack;
 const inRange=distance<128,threat=seen.attack&&distance<160;
 if(threat){
  // Never swing into a running attack: block it (as a short tap, so a fresh guard can be
  // a perfect block), hop over a sweep, or step out of range.
  if(r()<s.params.block){a.block=true;a.down=Combat.MOVES[seen.attack].level==='low';s.timer=.22;if(a.down&&r()<s.params.jumpSweep){a.block=false;e.up=true;}}
  else if(free&&distance>105)a[back]=true;
 }
 else if(seen.hit&&free&&r()<.5)a[back]=true;
 else if(justRecovered&&free&&distance<135&&r()<s.params.punish){if(distance>96){a[forward]=true;e.punch=true;}else e.punch=true;}
 else if(inRange&&free&&r()<s.params.guard){a.block=true;a.down=r()<.3;s.timer=.26;}
 else if(distance>style.range+6){a[forward]=true;if(distance>280&&r()<.10)e.up=true;}
 else if(free){
  let pick='block',roll=r(),acc=0;for(const [action,w] of style.weights){acc+=w;if(roll<acc){pick=action;break;}}
  if(pick==='back')a[back]=true;
  else if(pick==='forward')a[forward]=true;
  else if(pick==='sweep'){a.down=true;e.kick=true;}
  else if(pick==='punch'&&distance>110){e.kick=true;a[forward]=true;}
  else if(pick==='punch'){e.punch=true;if(distance>96)a[forward]=true;else if(r()<.35)a.down=true;}
  else if(pick==='kick'){e.kick=true;if(distance>108)a[forward]=true;}
  else if(pick==='air'){e.up=true;e.kick=true;}
  else{a.block=true;a.down=r()<.4;s.timer=.26;}
 }
 s.input=a;return {input:a,edges:e};
}
return {LEVELS,STYLES,level,create,think};
})();
