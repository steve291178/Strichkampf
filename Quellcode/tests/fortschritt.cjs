// Gürtel-Prüfungen (Regelwerk §6): Siege → Gürtel, Gürtel → KI-Stufe, Speichern mit kaputten Werten.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const context=vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','src','progress.js'),'utf8')+'\nglobalThis.P=Progress;',context);
const P=context.P;
const fakeStorage=()=>{const data={};return {data,getItem:k=>k in data?data[k]:null,setItem(k,v){data[k]=String(v);}};};
let checks=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
test('Elf Gürtel in der Reihenfolge des Regelwerks',()=>{assert.deepEqual([...P.BELTS.map(b=>b.name)],['Weiß','Weiß-Gelb','Gelb','Gelb-Orange','Orange','Orange-Grün','Grün','Grün-Schwarz','Schwarz','Meister 1','Meister 2']);});
test('Siege → Gürtel mit Grenzen beider Seiten',()=>{
 const expect={0:'Weiß',1:'Weiß',2:'Weiß-Gelb',3:'Gelb',4:'Gelb',5:'Gelb-Orange',6:'Orange',7:'Orange',8:'Orange-Grün',9:'Grün',10:'Grün',11:'Grün-Schwarz',12:'Schwarz',13:'Schwarz',14:'Schwarz',15:'Meister 1',16:'Meister 1',17:'Meister 1',18:'Meister 2',19:'Meister 2',40:'Meister 2'};
 for(const [wins,name] of Object.entries(expect))assert.equal(P.belt(Number(wins)).name,name,wins+' Siege');
});
const same=(a,b)=>assert.equal(JSON.stringify(a),JSON.stringify(b));
test('Nächster Gürtel und verbleibende Siege',()=>{same(P.belt(0).next,{name:'Weiß-Gelb',at:2,remaining:2});same(P.belt(2).next,{name:'Gelb',at:3,remaining:1});same(P.belt(17).next,{name:'Meister 2',at:18,remaining:1});assert.equal(P.belt(18).next,null);});
test('Gegner ist die KI-Stufe über dem Gürtel (Grenzen 8/9 und 11/12)',()=>{for(const [wins,level] of [[0,1],[8,1],[9,2],[11,2],[12,3],[18,3],[99,3]])assert.equal(P.level(wins),level,wins+' Siege');});
test('Kaputte Werte werden ruhig zu 0 bzw. 18',()=>{for(const [value,result] of [['',0],[null,0],[undefined,0],[-1,0],[101,18],['abc',0],[2.5,0],['2.5',0],[true,0],['12',12],[18,18],[19,18],[NaN,0],[Infinity,0]])assert.equal(P.clean(value),result,String(value));});
test('Laden und Speichern mit Schein-Speicher',()=>{const s=fakeStorage();assert.equal(P.load(s),0);assert(P.save(s,7));assert.equal(s.data[P.KEY],'7');assert.equal(P.load(s),7);s.data[P.KEY]='abc';assert.equal(P.load(s),0);s.data[P.KEY]='101';assert.equal(P.load(s),18);});
test('Fehlender oder kaputter Speicher stört nicht',()=>{assert.equal(P.load(null),0);assert.equal(P.load(undefined),0);assert.equal(P.save(null,3),false);const broken={getItem(){throw Error('privat');},setItem(){throw Error('privat');}};assert.equal(P.load(broken),0);assert.equal(P.save(broken,3),false);const r=P.recordWin(broken,4);assert.equal(r.wins,5);});
test('Ein Sieg zählt hoch, meldet neue Gürtel und läuft bei 18 nicht über',()=>{
 const s=fakeStorage();let r=P.recordWin(s,0);assert.equal(r.wins,1);assert.equal(r.newBelt,false);
 r=P.recordWin(s,1);assert.equal(r.wins,2);assert.equal(r.newBelt,true);assert.equal(r.belt.name,'Weiß-Gelb');
 r=P.recordWin(s,17);assert.equal(r.wins,18);assert(r.newBelt);assert.equal(r.belt.name,'Meister 2');
 r=P.recordWin(s,18);assert.equal(r.wins,18);assert.equal(r.newBelt,false);assert.equal(s.data[P.KEY],'18');
 assert.equal(P.reset(s),0);assert.equal(P.load(s),0);
});
console.log(checks+' Gürtel-Prüfungen bestanden');
