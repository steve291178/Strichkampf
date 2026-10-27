'use strict';
// Two-bone limbs keep upper/lower arm and leg lengths fixed throughout each move.
const KarateRig=(()=>{
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
function joint(root,target,l1,l2,bend=1){const dx=target[0]-root[0],dy=target[1]-root[1],raw=Math.hypot(dx,dy)||1,d=clamp(raw,Math.abs(l1-l2)+.01,l1+l2-.05),ux=dx/raw,uy=dy/raw,along=(l1*l1-l2*l2+d*d)/(2*d),h=Math.sqrt(Math.max(0,l1*l1-along*along));return {mid:[root[0]+ux*along-uy*h*bend,root[1]+uy*along+ux*h*bend],end:[root[0]+ux*d,root[1]+uy*d]};}
function envelope(t,wind,active,kick=false){
 const launch=kick?.10:.085,hold=active*.28,recover=kick?.20:.15;
 if(t<wind)return smooth((t-wind+launch)/launch);
 return 1-smooth((t-wind-hold)/recover);
}
function pose(f,elapsed=0){
 const atk=f.attack,m=atk?Combat.MOVES[atk.kind]:null;
 const lowAttack=['body','sweep'].includes(atk?.kind);
 const low=lowAttack?smooth(atk.t/.10)*(1-smooth((atk.t-m.duration+.12)/.12)):f.crouch?1:0;
 let hip=mix([-5,-94],[-19,-56],low),lean=.035+.46*low;
 let frontFoot=[42,-4],backFoot=[-43,-4],frontHand=mix([43,-151],[37,-103],low),backHand=mix([9,-154],[26,-115],low);
 let strike=null,strikeHand=0,strikeLeg=0,kick=false,extension=0,turn=0;
 if(f.stride&&!atk){
  const s=f.stride,p=s.t/s.duration,rel=s.dir*f.face,travel=s.length*smooth(p);
  const lead=s.length*smooth(p*2),follow=s.length*smooth(p*2-1),frontFirst=rel>0;
  const firstLift=Math.sin(clamp(p*2)*Math.PI)*5,secondLift=Math.sin(clamp(p*2-1)*Math.PI)*4;
  frontFoot=[42+rel*((frontFirst?lead:follow)-travel),-4-(frontFirst?firstLift:secondLift)];
  backFoot=[-43+rel*((frontFirst?follow:lead)-travel),-4-(frontFirst?secondLift:firstLift)];
  // The grounded foot stays fixed in world space as the pelvis passes over it.
  hip[0]-=rel*3*Math.sin(p*Math.PI);hip[1]+=Math.sin(p*Math.PI)*2;
  lean+=rel*.035*Math.sin(p*Math.PI);
 }
 if(f.settle&&!atk&&f.y===0){
  const p=clamp(f.settle.t/f.settle.duration),a=smooth(p*2),b=smooth(p*2-1);
  frontFoot=mix(f.settle.front,frontFoot,a);backFoot=mix(f.settle.back,backFoot,b);
  frontFoot[1]-=Math.sin(clamp(p*2)*Math.PI)*5;
  backFoot[1]-=Math.sin(clamp(p*2-1)*Math.PI)*5;
 }
 if(f.y>0){hip=[-8,-89];frontFoot=[36,-46];backFoot=[-35,-37];frontHand=[35,-153];backHand=[3,-145];lean=-.04;}
 if(atk){
  let wind=m.wind,hand=atk.hand||0;
  if(m.beats){let beat=0;for(let i=1;i<m.beats.length;i++)if(atk.t>=m.beats[i]-.10)beat=i;wind=m.beats[beat];hand=(hand+beat)%2;}
  kick=!['jab','lunge','body','combo'].includes(atk.kind);
  extension=envelope(atk.t,wind,m.active,kick);strikeHand=hand;
  if(!kick){
   const body=atk.kind==='body',e=extension;
   turn=e*(hand?1:-.45);lean+=(body?.14:hand?.13:.065)*e;
   hip[0]+=e*(hand?8:3);
   const target=body?[hand?91:82,-86]:[hand?100:88,-m.height];
   if(hand)backHand=mix(backHand,target,e);else frontHand=mix(frontHand,target,e);
   // Rear straight rotates hip and shoulder; the free hand protects the jaw.
   if(hand)frontHand=mix(frontHand,body?[29,-117]:[30,-158],e);
   else backHand=mix(backHand,body?[30,-117]:[20,-162],e);
   if(atk.kind==='lunge'){
    const progress=smooth(atk.t/m.wind),advance=20*progress,settle=smooth((atk.t-m.wind)/.22);
    frontFoot=mix(atk.stance?.front||[42,-4],[62,-4],progress);
    frontFoot[0]-=advance;frontFoot[1]-=Math.sin(clamp(atk.t/m.wind)*Math.PI)*5;
    backFoot=mix(atk.stance?.back||[-43,-4],[-23,-4],settle);
    backFoot[0]-=advance;backFoot[1]-=Math.sin(settle*Math.PI)*4;
    hip[0]+=4*e;
   }
   strike='hand';
  }else{
   const chamber=smooth(atk.t/Math.max(.1,m.wind*.55))*(1-smooth((atk.t-m.wind-m.active)/.25));
   if(atk.kind==='sweep'){
    hip=mix(hip,[-22,-57],chamber);lean=.54;
    frontFoot=mix(frontFoot,[13,-32],chamber);frontFoot=mix(frontFoot,[88,-16],extension);
    frontHand=[28,-115];backHand=[18,-115];
   }else{
    const side=atk.kind==='side';
    hip=mix(hip,[-27+(side?24:10)*extension,-94+(side?6*extension:0)],chamber);
    lean=-.04-(side?.42:.21)*chamber;turn=side?-.6*extension:0;
    frontFoot=mix(frontFoot,[10,-75],chamber);
    const target=side?[109,-146]:atk.kind==='air'?[100,-74]:[96,-112];
    frontFoot=mix(frontFoot,target,extension);
    if(f.y>0)backFoot=[-34,-43];
    frontHand=[32,-149];backHand=[-1,-140];
   }
   strikeLeg=atk.leg||0;
   if(strikeLeg){
    const raised=frontFoot;frontFoot=f.y>0?[35,-40]:[42,-4];backFoot=mix([-43,-4],raised,chamber);
    hip[0]+=40*chamber*(1-.35*extension);
   }
   strike='foot';
  }
  // A step interrupted by an attack settles during preparation instead of snapping.
  if(atk.stance&&atk.kind!=='lunge'&&f.y===0){
   const blend=smooth(atk.t/Math.min(.11,m.wind*.7));
   if(kick){
    if(strikeLeg){frontFoot=atk.stance.front.slice();frontFoot[1]+=( -4-frontFoot[1])*smooth(atk.t/.075);backFoot=mix(atk.stance.back,backFoot,blend);}
    else{backFoot=atk.stance.back.slice();backFoot[1]+=( -4-backFoot[1])*smooth(atk.t/.075);frontFoot=mix(atk.stance.front,frontFoot,blend);}
   }else{frontFoot=atk.stance.front.slice();backFoot=atk.stance.back.slice();}
  }
 }
 if(f.block){if(low){frontHand=[43,-79];backHand=[26,-112];}else{frontHand=[34,-174];backHand=[42,-145];}lean-=.045;}
 if(f.reactionTime>0){
  const duration=f.reaction==='stumble'?.48:.28,age=1-clamp(f.reactionTime/duration),amount=Math.sin(Math.PI*clamp(age*1.12))*.8;
  if(f.reaction==='body'){lean+=.56*amount;hip[1]+=7*amount;frontHand=mix(frontHand,[37,-91],amount);backHand=mix(backHand,[24,-111],amount);}
  else if(f.reaction==='low'){hip[1]+=9*amount;frontFoot[1]-=11*amount;lean-=.12*amount;}
  else{lean-=.30*amount;hip[0]-=6*amount;frontHand=mix(frontHand,[39,-126],amount);backHand=mix(backHand,[7,-145],amount);if(f.reaction==='stumble'){backFoot[0]-=18*amount;backFoot[1]-=7*Math.sin(age*Math.PI*2)**2;}}
 }else if(f.stagger>0){const amount=Math.sin(clamp(f.stagger/.55)*Math.PI*.75);lean-=amount*.35;hip[0]-=amount*4;frontHand=[42,-132];backHand=[7,-139];}
 // Reachable planted feet keep their exact targets, with knees flexing as needed.
 if(f.y===0)for(const [foot,offset] of [[frontFoot,7],[backFoot,-7]]){
  const dx=foot[0]-hip[0]-offset;
  if(Math.abs(dx)<109.8)hip[1]=Math.max(hip[1],foot[1]-Math.sqrt(109.8**2-dx*dx));
 }
 const shoulder=[hip[0]+Math.sin(lean)*61,hip[1]-Math.cos(lean)*61];
 const neck=[shoulder[0]+Math.sin(lean*.5)*9,shoulder[1]-9];
 const head=[neck[0]+2,neck[1]-19];
 const frontShoulder=[shoulder[0]+10-turn*4,shoulder[1]+3];
 const backShoulder=[shoulder[0]-11+turn*19,shoulder[1]-1];
 const fh=joint(frontShoulder,frontHand,37,36,1),bh=joint(backShoulder,backHand,37,36,1);
 const frontHip=[hip[0]+7,hip[1]],backHip=[hip[0]-7,hip[1]];
 const fl=joint(frontHip,frontFoot,55,55,-1),bl=joint(backHip,backFoot,55,55,-1);
 return {hip,shoulder,neck,head,frontArm:[frontShoulder,fh.mid,fh.end],backArm:[backShoulder,bh.mid,bh.end],frontLeg:[frontHip,fl.mid,fl.end],backLeg:[backHip,bl.mid,bl.end],strike:strike==='hand'?(strikeHand?bh.end:fh.end):strike==='foot'?(strikeLeg?bl.end:fl.end):null,kick,strikeLeg,extension,lean,turn};
}
// Collision geometry shares the exact pose used by the canvas renderer.
function geometry(f){
 const p=pose(f),world=q=>[f.x+q[0]*f.face,Combat.FLOOR-f.y+q[1]];
 const capsule=(a,b,r)=>({a:world(a),b:world(b),r});
 const body=[capsule(p.head,p.head,15.5),capsule(p.shoulder,p.hip,17)];
 for(const leg of [p.frontLeg,p.backLeg]){body.push(capsule(leg[0],leg[1],12),capsule(leg[1],leg[2],8));}
 const guard=f.block?[capsule(p.frontArm[1],p.frontArm[2],10),capsule(p.backArm[1],p.backArm[2],10)]:[];
 const strike=!p.strike?null:p.kick?capsule([p.strike[0]-4,p.strike[1]+1],[p.strike[0]+12,p.strike[1]-2],4):capsule(p.strike,p.strike,6.3);
 return {body,guard,strike};
}
function pointSegment(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],d=dx*dx+dy*dy,t=d?clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dy)/d):0;return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}
function touches(s,t){
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const a=cross(s.a,s.b,t.a),b=cross(s.a,s.b,t.b),c=cross(t.a,t.b,s.a),d=cross(t.a,t.b,s.b);
 const crossing=((a<0&&b>0)||(a>0&&b<0))&&((c<0&&d>0)||(c>0&&d<0));
 return crossing||Math.min(pointSegment(s.a,t.a,t.b),pointSegment(s.b,t.a,t.b),pointSegment(t.a,s.a,s.b),pointSegment(t.b,s.a,s.b))<=s.r+t.r;
}
return {pose,joint,geometry,touches};
})();
