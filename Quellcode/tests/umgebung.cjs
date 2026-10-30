// Gemeinsame Schein-Browserumgebung für Integrationstest und Bildproben: lädt das Spiel in einen
// Node-Kontext mit @napi-rs/canvas, Schein-DOM, Schein-Speicher und einem Schein-PeerJS.
const fs=require('fs'),vm=require('vm'),{createCanvas}=require('@napi-rs/canvas'),{EventEmitter}=require('events');
const path=require('path');const src=path.join(__dirname,'../src');
const engine=fs.readFileSync(path.join(src,'engine.js'),'utf8'),source=fs.readFileSync(path.join(src,'game.js'),'utf8');
const peers=new Map();const tasks=[];
class Link extends EventEmitter{constructor(peer){super();this.peer=peer;this.open=false;this.dataChannel={bufferedAmount:0};}send(d){if(this.other?.open)tasks.push(()=>this.other.emit('data',structuredClone(d)));}close(){if(this.open){this.open=false;this.emit('close');if(this.other.open){this.other.open=false;this.other.emit('close');}}}}
class Peer extends EventEmitter{constructor(id,options){super();this.id=id||'guest'+Math.random();peers.set(this.id,this);tasks.push(()=>this.emit('open',this.id));}connect(id,options){const a=new Link(id),b=new Link(this.id);a.other=b;b.other=a;b.metadata=options.metadata;tasks.push(()=>{const host=peers.get(id);if(!host){this.emit('error',{type:'peer-unavailable'});return;}a.open=b.open=true;host.emit('connection',b);if(b.open){b.emit('open');a.emit('open');}});return a;}destroy(){peers.delete(this.id);}}
function flush(){let n=0;while(tasks.length){tasks.shift()();if(++n>1000)throw Error('task loop');}}
function environment(){
 const canvas=createCanvas(1280,720),els={},listeners={},controls=[];let raf=null,time=0;
 class Element{constructor(id){this.id=id;this.tagName='DIV';this.hidden=false;this.style={};this.dataset={};this.value='';this.textContent='';this.classList={add(){},remove(){},toggle(){}};this.handlers={};}addEventListener(k,f){(this.handlers[k]??=[]).push(f);}setAttribute(){}focus(){}click(){this.onclick?.();}setPointerCapture(){}querySelectorAll(){return [];}getBoundingClientRect(){return {left:0,top:0,width:150,height:150};}dispatch(k,e){(this.handlers[k]||[]).forEach(f=>f(e));}}
 function $(id){return els[id]??=new Element(id);}
 for(const match of fs.readFileSync(path.join(src,'shell.html'),'utf8').matchAll(/id="([^"]+)"([^>]*)/g))$(match[1]).hidden=/hidden/.test(match[2]);
 for(const action of ['block','punch','kick']){const e=new Element(action);e.dataset.action=action;controls.push(e);}
 $('rule-select').value='duel';$('points-select').value='2';$('timer-select').value='0';$('control-select').value='direct';els.canvas=canvas;const panels=['home-panel','online-panel','lobby-panel','pause-panel','result-panel'].map($),back=[new Element('back')];
 const doc={body:new Element('body'),activeElement:null,hidden:false,getElementById:$,createElement:tag=>tag==='canvas'?createCanvas(1280,720):new Element(tag),querySelector:q=>controls.find(e=>q.includes(e.dataset.action)),querySelectorAll:q=>q==='.panel'?panels:q==='[data-action]'?controls:q==='.back-home'?back:[],addEventListener:(k,f)=>listeners[k]=f};
 const env={document:doc,window:{},navigator:{getGamepads:()=>[]},matchMedia:()=>({matches:false}),performance:{now:()=>time},crypto:require('crypto').webcrypto,structuredClone,console,localStorage:{data:{},getItem(k){return k in this.data?this.data[k]:null;},setItem(k,v){this.data[k]=String(v);}},HTMLInputElement:Element,setTimeout:()=>1,clearTimeout(){},requestAnimationFrame:f=>raf=f,addEventListener:(k,f)=>listeners[k]=f,Peer,AbortController,Math};env.window=env;env.globalThis=env;const c=vm.createContext(env);
 vm.runInContext(engine,c);for(const f of ['controls.js','ai.js','progress.js','rig.js','audio.js'])vm.runInContext(fs.readFileSync(path.join(src,f),'utf8'),c);
 vm.runInContext(source.replace('draw(dt);requestAnimationFrame(frame);','if(globalThis.__render)draw(dt);requestAnimationFrame(frame);').replace(/\}\)\(\);\s*$/,`globalThis.testing={get game(){return game},get mode(){return mode},get localId(){return localId},get touch(){return touch},get selectedPad(){return selectedPad},startGame,home,online,receive,sampleInput,takeEdges,keys,setPause,sendState,openHelp,closeHelp,clearInput,updateSettings,draw,drawFighter,get effects(){return effects},get trails(){return trails},set nowTime(v){nowTime=v}};})();`),c);
 return {c,els,$,canvas,controls,listeners,get t(){return c.testing;},frame(ms=16.667){time+=ms;raf(time);flush();},run(n){for(let i=0;i<n;i++)this.frame();}};
}
module.exports={environment,flush,peers,Peer};
