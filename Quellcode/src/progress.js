'use strict';
// Player progress (Regelwerk §6): eleven belts, three wins per full colour, the in-between
// belt shows after the second win. Only wins against the computer count; nothing else is stored.
const Progress=(()=>{
const BELTS=[
 {name:'Weiß',wins:0,colors:['#f2eee2']},
 {name:'Weiß-Gelb',wins:2,colors:['#f2eee2','#e9c43a']},
 {name:'Gelb',wins:3,colors:['#e9c43a']},
 {name:'Gelb-Orange',wins:5,colors:['#e9c43a','#e07a2a']},
 {name:'Orange',wins:6,colors:['#e07a2a']},
 {name:'Orange-Grün',wins:8,colors:['#e07a2a','#3f9a4e']},
 {name:'Grün',wins:9,colors:['#3f9a4e']},
 {name:'Grün-Schwarz',wins:11,colors:['#3f9a4e','#1d1f22']},
 {name:'Schwarz',wins:12,colors:['#1d1f22']},
 {name:'Meister 1',wins:15,colors:['#1d1f22'],stripes:1},
 {name:'Meister 2',wins:18,colors:['#1d1f22'],stripes:2}
];
const MAX=18,KEY='strichkampf.siege';
// Broken values (empty, null, -1, 101, "abc", 2.5) become a safe number between 0 and 18.
function clean(value){const n=typeof value==='string'&&value.trim()!==''?Number(value):value;return Number.isInteger(n)?Math.max(0,Math.min(MAX,n)):0;}
function belt(wins){
 wins=clean(wins);let i=0;for(let k=0;k<BELTS.length;k++)if(wins>=BELTS[k].wins)i=k;
 const b=BELTS[i],next=BELTS[i+1]||null;
 return {index:i,name:b.name,colors:b.colors,stripes:b.stripes||0,wins,next:next?{name:next.name,at:next.wins,remaining:next.wins-wins}:null};
}
// The opponent is the computer level above the player's belt: Grün up to 8 wins, Schwarz up to 11, then Meister 2.
function level(wins){wins=clean(wins);return wins>=12?3:wins>=9?2:1;}
function load(storage){try{return clean(storage?.getItem(KEY));}catch{return 0;}}
function save(storage,wins){try{if(!storage)return false;storage.setItem(KEY,String(clean(wins)));return true;}catch{return false;}}
function recordWin(storage,wins){const before=belt(wins),after=belt(clean(wins)+1);save(storage,after.wins);return {wins:after.wins,belt:after,newBelt:after.index>before.index};}
function reset(storage){save(storage,0);return 0;}
return {BELTS,MAX,KEY,clean,belt,level,load,save,recordWin,reset};
})();
