// Bildproben: rendert die Figur in festen Posen mit den echten Zeichenfunktionen nach bildproben/.
// Aufruf: node tests/bildproben.cjs  → bildproben/posen.png (Posenblatt) und bildproben/szene.png (ganze Arena).
const fs=require('fs'),path=require('path'),{createCanvas}=require('@napi-rs/canvas');
const {environment}=require('./umgebung.cjs');
const out=path.join(__dirname,'..','bildproben');fs.mkdirSync(out,{recursive:true});
const env=environment();env.$('ai-btn').click();env.c.__render=true;const C=require('vm').runInContext('Combat',env.c);
const g=env.t.game;g.phase='fight';
const attack=(f,kind,t)=>{f.attack={kind,t:t??C.MOVES[kind].wind,spent:[],hand:0,leg:0,stance:null};};
const react=(f,kind,age)=>{f.reaction=kind;f.reactionTime=C.REACTIONS[kind][0]*(1-age);};
const poses=[
 ['Grundstellung',f=>{}],
 ['Schritt vor · Gewicht hinten',f=>{f.stride={t:.09,duration:.36,dir:1,length:36};}],
 ['Schritt vor · Gewicht vorn',f=>{f.stride={t:.27,duration:.36,dir:1,length:36};}],
 ['Gerade',f=>attack(f,'jab')],
 ['Gerade · hintere Hand',f=>{attack(f,'jab');f.attack.hand=1;}],
 ['Schrittgerade',f=>attack(f,'lunge')],
 ['Körperschlag',f=>{attack(f,'body');f.crouch=true;}],
 ['Fronttritt',f=>attack(f,'kick')],
 ['Seitwärtstritt',f=>attack(f,'side')],
 ['Beinfeger',f=>{attack(f,'sweep');f.crouch=true;}],
 ['Sprungtritt',f=>{attack(f,'air');f.y=60;}],
 ['Block oben',f=>{f.block=true;}],
 ['Block unten',f=>{f.block=true;f.crouch=true;}],
 ['Perfekter Block',f=>{f.block=true;f.parryFlash=.3;}],
 ['Treffer Kopf',f=>react(f,'head',.45)],
 ['Treffer Körper · Magen',f=>react(f,'body',.45)],
 ['Schwerer Treffer · Knie',f=>react(f,'knee',.45)],
 ['Beinfeger · Sturz',f=>react(f,'down',.45)],
 ['Sturz · Aufstehen',f=>react(f,'down',.8)],
 ['Taumeln',f=>{f.stagger=.4;}],
 ['K. o.',f=>{f.fall=.9;f.hp=0;}],
 ['Ducken',f=>{f.crouch=true;}]
];
const cols=6,cell=[300,330],sheet=createCanvas(cols*cell[0],Math.ceil((poses.length+1)/cols)*cell[1]),sc=sheet.getContext('2d');
sc.fillStyle='#2b4440';sc.fillRect(0,0,sheet.width,sheet.height);
function snapshot(label,index,prepare,mode='ai'){
 g.fighters=[C.fighter(0),C.fighter(1)];const f=g.fighters[0];f.x=450;g.fighters[1].x=830;prepare(f);
 env.t.nowTime=1000;env.t.draw(0);
 const x=index%cols*cell[0],y=Math.floor(index/cols)*cell[1];
 sc.drawImage(env.canvas,450-150,C.FLOOR-290,300,320,x,y,300,320);
 sc.fillStyle='#f6efd9';sc.font='600 15px sans-serif';sc.textAlign='center';sc.fillText(label,x+150,y+318);
}
poses.forEach(([label,prepare],i)=>snapshot(label,i,prepare));
// Variante für Stefan (H9): Gürtel in Kämpferfarbe statt Ranggürtel – dazu kurz in den Online-Modus wechseln.
env.t.startGame('host');env.t.game.phase='fight';Object.assign(g,env.t.game);
snapshot('Variante B · Gürtel in Kämpferfarbe',poses.length,f=>{},'host');
fs.writeFileSync(path.join(out,'posen.png'),sheet.toBuffer('image/png'));
// Ganze Arena mit beiden Figuren im Duell gegen den Computer.
env.$('ai-btn').click();const game=env.t.game;game.phase='fight';game.fighters[0].x=560;game.fighters[1].x=690;attack(game.fighters[0],'lunge');react(game.fighters[1],'body',.4);game.fighters[0].combo=5;game.fighters[0].comboKey='kick';game.fighters[0].comboClock=.2;game.fighters[1].hp=12.5;game.fighters[0].hp=17;
env.t.nowTime=2000;env.t.draw(0);fs.writeFileSync(path.join(out,'szene.png'),env.canvas.toBuffer('image/png'));
console.log('Bildproben geschrieben: '+out+' (posen.png: '+(poses.length+1)+' Posen, szene.png)');
