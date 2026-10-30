const fs=require('fs'),vm=require('vm'),{createCanvas}=require('@napi-rs/canvas'),{EventEmitter}=require('events');
const assert=require('assert');const path=require('path');const src=path.join(__dirname,'../src');const engine=fs.readFileSync(path.join(src,'engine.js'),'utf8'),source=fs.readFileSync(path.join(src,'game.js'),'utf8');
const peers=new Map();const tasks=[];
class Link extends EventEmitter{constructor(peer){super();this.peer=peer;this.open=false;this.dataChannel={bufferedAmount:0};}send(d){if(this.other?.open)tasks.push(()=>this.other.emit('data',structuredClone(d)));}close(){if(this.open){this.open=false;this.emit('close');if(this.other.open){this.other.open=false;this.other.emit('close');}}}}
class Peer extends EventEmitter{constructor(id,options){super();this.id=id||'guest'+Math.random();peers.set(this.id,this);tasks.push(()=>this.emit('open',this.id));}connect(id,options){const a=new Link(id),b=new Link(this.id);a.other=b;b.other=a;b.metadata=options.metadata;tasks.push(()=>{const host=peers.get(id);if(!host){this.emit('error',{type:'peer-unavailable'});return;}host.emit('connection',b);a.open=b.open=true;b.emit('open');a.emit('open');});return a;}destroy(){peers.delete(this.id);}}
function flush(){let n=0;while(tasks.length){tasks.shift()();if(++n>1000)throw Error('task loop');}}
function environment(){
 const canvas=createCanvas(1280,720),els={},listeners={},controls=[];let raf=null,time=0;
 class Element{constructor(id){this.id=id;this.tagName='DIV';this.hidden=false;this.style={};this.dataset={};this.value='';this.textContent='';this.classList={add(){},remove(){},toggle(){}};this.handlers={};}addEventListener(k,f){(this.handlers[k]??=[]).push(f);}setAttribute(){}focus(){}click(){this.onclick?.();}setPointerCapture(){}querySelectorAll(){return [];}getBoundingClientRect(){return {left:0,top:0,width:150,height:150};}dispatch(k,e){(this.handlers[k]||[]).forEach(f=>f(e));}}
 function $(id){return els[id]??=new Element(id);}
 for(const match of fs.readFileSync(path.join(src,'shell.html'),'utf8').matchAll(/id="([^"]+)"([^>]*)/g))$(match[1]).hidden=/hidden/.test(match[2]);
 for(const action of ['block','punch','kick','combo']){const e=new Element(action);e.dataset.action=action;controls.push(e);}
 $('rule-select').value='duel';$('points-select').value='2';$('timer-select').value='0';$('control-select').value='direct';els.canvas=canvas;const panels=['home-panel','online-panel','lobby-panel','pause-panel','result-panel'].map($),back=[new Element('back')];
 const doc={body:new Element('body'),activeElement:null,hidden:false,getElementById:$,createElement:tag=>tag==='canvas'?createCanvas(1280,720):new Element(tag),querySelector:q=>controls.find(e=>q.includes(e.dataset.action)),querySelectorAll:q=>q==='.panel'?panels:q==='[data-action]'?controls:q==='.back-home'?back:[],addEventListener:(k,f)=>listeners[k]=f};
 const env={document:doc,window:{},navigator:{getGamepads:()=>[]},matchMedia:()=>({matches:false}),performance:{now:()=>time},crypto:require('crypto').webcrypto,structuredClone,console,localStorage:{data:{},getItem(k){return k in this.data?this.data[k]:null;},setItem(k,v){this.data[k]=String(v);}},HTMLInputElement:Element,setTimeout:()=>1,clearTimeout(){},requestAnimationFrame:f=>raf=f,addEventListener:(k,f)=>listeners[k]=f,Peer,AbortController,Math};env.window=env;env.globalThis=env;const c=vm.createContext(env);
 vm.runInContext(engine,c);vm.runInContext(fs.readFileSync(path.join(src,'controls.js'),'utf8'),c);vm.runInContext(fs.readFileSync(path.join(src,'ai.js'),'utf8'),c);vm.runInContext(fs.readFileSync(path.join(src,'progress.js'),'utf8'),c);vm.runInContext(fs.readFileSync(path.join(src,'rig.js'),'utf8'),c);vm.runInContext(fs.readFileSync(path.join(src,'audio.js'),'utf8'),c);vm.runInContext(source.replace('draw(dt);requestAnimationFrame(frame);','if(globalThis.__render)draw(dt);requestAnimationFrame(frame);').replace(/\}\)\(\);\s*$/,`globalThis.testing={get game(){return game},get mode(){return mode},get localId(){return localId},get touch(){return touch},get selectedPad(){return selectedPad},startGame,home,online,receive,sampleInput,takeEdges,keys,setPause,sendState,openHelp,closeHelp,clearInput,updateSettings};})();`),c);
 return {c,els,$,canvas,controls,listeners,get t(){return c.testing;},frame(ms=16.667){time+=ms;raf(time);flush();},run(n){for(let i=0;i<n;i++)this.frame();}};
}

const host=environment(),guest=environment();host.$('rule-select').value='points';host.$('points-select').value='3';host.t.updateSettings();
host.t.online(true);flush();guest.$('join-code').value=host.$('room-code').textContent;guest.t.online(false);flush();host.$('fight-online-btn').click();flush();
for(let i=0;i<150;i++){host.frame();guest.frame();}assert.equal(guest.t.game.phase,'fight');assert.equal(guest.t.game.rules.mode,'points');assert.equal(guest.t.game.rules.pointsToWin,3);
console.log('PASS Host settings reach guest independently of local controls');
const C=vm.runInContext('Combat',host.c);
for(let point=1;point<=3;point++){
 const g=host.t.game;g.fighters=[C.fighter(0),C.fighter(1)];g.fighters[1].x=545;g.fighters[0].attack={kind:'jab',t:.13-C.DT,spent:[],sounded:[],hand:0};host.frame();host.t.sendState();flush();
 assert.equal(g.scores[0],point);assert.equal(guest.t.game.scores[0],point);assert.equal(guest.t.game.phase,point===3?'over':'break');
 for(let i=0;i<(point===3?40:245);i++){host.frame();guest.frame();}
}
assert(!host.$('result-panel').hidden);assert(!guest.$('result-panel').hidden);guest.$('rematch-btn').click();flush();host.$('rematch-btn').click();flush();assert.equal(guest.t.game.phase,'countdown');assert.deepEqual([...guest.t.game.scores],[0,0]);
console.log('PASS Network point scoring, falls, match result and mutual rematch');
guest.t.setPause(true);flush();assert(host.t.game.paused[1]);host.t.setPause(true);flush();guest.t.setPause(false);flush();assert(host.t.game.paused[0]);host.t.setPause(false);flush();assert(!guest.t.game.paused.some(Boolean));
console.log('PASS Both online players must release their own pause');
const pad=environment();pad.t.startGame('ai');let buttons=[],axes=[0,0];pad.c.navigator.getGamepads=()=>[{id:'Simulated Standard Controller',index:0,mapping:'standard',connected:true,axes,buttons:Array.from({length:17},(_,i)=>({pressed:buttons.includes(i)}))}];
buttons=[6];let a=pad.t.sampleInput();assert(a.block&&a.down);buttons=[4];a=pad.t.sampleInput();assert(a.block&&!a.down);buttons=[5];assert(pad.t.sampleInput().combo);assert(pad.t.takeEdges().combo);
pad.t.clearInput();pad.$('control-select').value='classic';pad.t.updateSettings();buttons=[0];axes=[-1,0];a=pad.t.sampleInput();assert(a.kick);assert(pad.t.takeEdges().kick);a=pad.t.sampleInput();assert(!pad.t.takeEdges().kick);buttons=[];axes=[-1,-1];a=pad.t.sampleInput();assert(a.block&&!a.down);axes=[-1,1];a=pad.t.sampleInput();assert(a.block&&a.down);
pad.c.navigator.getGamepads=()=>[];pad.t.sampleInput();assert(pad.t.game.paused[0]);
console.log('PASS Direct/classic controller mappings, no held repeat, disconnect pause');
const keys=environment();keys.t.startGame('ai');keys.t.keys.add('KeyF');assert(keys.t.sampleInput().right);keys.t.game.fighters[0].x=950;assert(keys.t.sampleInput().left);keys.t.clearInput();keys.t.keys.add('Space');a=keys.t.sampleInput();assert(a.block&&a.down);
keys.t.clearInput();keys.$('control-select').value='classic';keys.t.keys.add('KeyJ');a=keys.t.sampleInput();assert(a.punch);assert(keys.t.takeEdges().punch);keys.t.sampleInput();assert(!keys.t.takeEdges().punch);
console.log('PASS Relative keyboard movement and classic action');
const touch=environment();touch.$('control-select').value='classic';touch.t.startGame('ai');const action=touch.controls.find(e=>e.dataset.action==='punch');touch.t.touch.left=true;action.dispatch('pointerdown',{pointerId:1,preventDefault(){}});a=touch.t.sampleInput();assert(a.kick);assert(touch.t.takeEdges().kick);action.dispatch('pointerup',{pointerId:1});assert(!touch.t.touch.punch);
console.log('PASS Classic touch direction/action and release');
const solo=environment();let seed=912;solo.c.Math=Object.create(Math);solo.c.Math.random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};solo.$('ai-btn').click();solo.run(14000);assert.equal(solo.t.game.phase,'over');assert.equal(solo.t.game.winner,1);assert.equal(solo.t.game.scores[1],2);
console.log('PASS Delayed computer decisions complete a two-round match');
// Gürtel: nur ein eigener Sieg gegen den Computer zählt und landet im Speicher; Online-Siege und KI-Siege nicht.
assert.equal(host.c.localStorage.data['strichkampf.siege'],undefined);assert.equal(solo.c.localStorage.data['strichkampf.siege'],undefined);
const belt=environment();belt.$('ai-btn').click();assert(belt.$('belt-line').textContent.includes('Dein Gürtel: Weiß'),belt.$('belt-line').textContent);assert(belt.$('belt-line').textContent.includes('noch 2 Siege bis Weiß-Gelb'));
{const g=belt.t.game;g.scores[0]=1;g.phase='fight';g.fighters=[C.fighter(0),C.fighter(1)];g.fighters[1].x=545;g.fighters[1].hp=10;g.fighters[0].attack={kind:'jab',t:.13-C.DT,spent:[],sounded:[],hand:0};belt.frame();assert.equal(g.phase,'over');assert.equal(g.winner,0);belt.run(200);}
assert.equal(belt.c.localStorage.data['strichkampf.siege'],'1');assert(belt.$('belt-line').textContent.includes('noch 1 Sieg bis Weiß-Gelb'));assert(!belt.$('result-panel').hidden);assert(belt.$('belt-result').textContent.includes('Gürtel: Weiß'));
belt.$('belt-reset').click();belt.$('belt-reset').click();assert.equal(belt.c.localStorage.data['strichkampf.siege'],'0');assert(belt.$('belt-line').textContent.includes('noch 2 Siege'));
console.log('PASS Belt progress counts only own wins against the computer, is stored and can be reset');
// Exercise the shipped drawing functions for both modes and knockdowns.
for(const e of [host,keys,solo,belt]){e.c.__render=true;e.frame();}
console.log('PASS Canvas rendering in point mode, life mode and match result');
