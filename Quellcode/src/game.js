'use strict';
(()=>{
const $=id=>document.getElementById(id),stage=$('stage'),canvas=$('canvas'),ctx=canvas.getContext('2d');
const {W,FLOOR,DT,MOVES,blank,create,step}=Combat,H=720,COLORS=['#bd8064','#83a99d'];
let game=null,mode='menu',localId=0,lastEvent=0,acc=0,nowTime=0,lastFrame=0,effects=[],trails=[[],[]],shake=0,shakeStrength=0;
let muted=false,touchEnabled=matchMedia('(pointer:coarse)').matches,lastDevice='keyboard',selectedPad=null,padMenu=false;
let peer=null,conn=null,generation=0,connectTimer=null,roomCode='',remoteInput=blank(),remoteEdges=blank(),remoteSeq=-1,sequence=0,lastSend=0,lastSnapshot=0,lastReceived=0,lastPing=0,ping=0,ready=[false,false],remoteRematch=false,localRematch=false;
let classicActionQueued=false,classicWasAction=false,classicWasUp=false;
let renderFighters=null,aiState=null,wasHelpPaused=false,helpFocus=null;
const keys=new Set(),touch=blank(),prevInput=blank();let queuedEdges=blank(),observedInput=blank(),toastTimer=null;
const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
// Belt progress lives in this browser only; a missing or blocked store just keeps it for the session.
const store=(()=>{try{return window.localStorage||null;}catch{return null;}})();
let wins=Progress.load(store),promotion=null,resetArmed=null;
const aiLevel=()=>Progress.level(wins);
// Variant for Stefan (H9): the figure wears the earned belt against the computer; false keeps the fighter colour.
const BELT_ON_GI=true;
// Variant for Stefan (H9): kiai 'A' = long "wataaa", 'B' = short "hyah".
const KIAI_VARIANT='A';DojoAudio.setKiaiVariant(KIAI_VARIANT);
function beltColors(f){if(mode!=='ai'||!BELT_ON_GI||!aiState)return null;if(f.id===0)return Progress.belt(wins);return {colors:[DojoAI.LEVELS[aiState.level].belt==='green'?'#3f9a4e':'#1d1f22'],stripes:aiState.level===3?2:0};}
function updateBelt(){const b=Progress.belt(wins),lv=DojoAI.LEVELS[aiLevel()];$('belt-line').textContent=`Dein Gürtel: ${b.name} · Gegner: ${lv.name} (KI-Stufe ${aiLevel()})`+(b.next?` · noch ${b.next.remaining} ${b.next.remaining===1?'Sieg':'Siege'} bis ${b.next.name}`:' · höchster Gürtel erreicht');}
$('belt-reset').onclick=()=>{if(resetArmed){clearTimeout(resetArmed);resetArmed=null;wins=Progress.reset(store);updateBelt();$('belt-reset').textContent='Gürtel zurücksetzen';showToast('Gürtel zurückgesetzt: Weiß.');}else{$('belt-reset').textContent='Wirklich? Noch einmal tippen.';resetArmed=setTimeout(()=>{resetArmed=null;$('belt-reset').textContent='Gürtel zurücksetzen';},4000);}};
function showToast(s){$('toast').textContent=s;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3000);}
function panels(id){for(const p of document.querySelectorAll('.panel'))p.hidden=p.id!==id;}
function setTouch(v){touchEnabled=v;stage.classList.toggle('touch-on',v);$('touch-btn').setAttribute('aria-pressed',String(v));}
setTouch(touchEnabled);
function unlock(){DojoAudio.unlock();}
stage.addEventListener('pointerdown',unlock,{passive:true});
function selectedRules(){return Combat.rules({mode:$('rule-select').value,pointsToWin:Number($('points-select').value),timeLimit:Number($('timer-select').value)});}
function ruleText(r){return r.mode==='points'?`Punktkampf · ${r.pointsToWin} Punkte zum Matchsieg${r.timeLimit?' · '+r.timeLimit+' Sekunden':''}`:`Duell · 20 Trefferpunkte · zwei Rundensiege${r.timeLimit?' · '+r.timeLimit+' Sekunden pro Runde':''}`;}
function classicControls(){return $('control-select').value==='classic';}
function updateSettings(){const r=selectedRules();$('point-setting').hidden=r.mode!=='points';$('match-summary').textContent=ruleText(r);document.querySelector('[data-action="kick"]').hidden=classicControls();document.querySelector('[data-action="punch"]').textContent=classicControls()?'Aktion':'Schlag';}
$('rule-select').onchange=()=>{$('control-select').value=$('rule-select').value==='points'?'classic':'direct';updateSettings();};
for(const id of ['control-select','timer-select','points-select'])$(id).onchange=updateSettings;
updateSettings();updateBelt();
function clearInput(){classicActionQueued=false;classicWasAction=false;classicWasUp=false;if(game){game.freezeQueue=[null,null];for(const f of game.fighters)f.buffer=null;}keys.clear();Object.assign(touch,blank());Object.assign(prevInput,blank());queuedEdges=blank();observedInput=blank();$('knob').style.transform='';document.querySelectorAll('.held').forEach(e=>e.classList.remove('held'));}
function closeNetwork(){generation++;clearTimeout(connectTimer);const c=conn,p=peer;conn=null;peer=null;c?.close();p?.destroy();remoteInput=blank();remoteEdges=blank();remoteSeq=-1;ready=[false,false];lastReceived=0;roomCode='';}
function home(){closeNetwork();game=null;mode='menu';clearInput();renderFighters=null;effects=[];trails=[[],[]];stage.classList.remove('playing');$('pause-btn').hidden=true;$('help').hidden=true;panels('home-panel');$('net-status').textContent='SOLO & ONLINE';updateBelt();$('create-btn').disabled=false;$('join-btn').disabled=false;$('ai-btn').focus({preventScroll:true});}
function startGame(selectedMode){mode=selectedMode;localId=mode==='guest'?1:0;game=create(selectedRules());renderFighters=null;lastEvent=0;effects=[];trails=[[],[]];aiState=mode==='ai'?DojoAI.create(aiLevel(),1):null;lastFrame=performance.now();acc=0;ready=[false,false];localRematch=false;remoteRematch=false;remoteInput=blank();remoteEdges=blank();clearInput();stage.classList.add('playing');$('pause-btn').hidden=false;panels(null);unlock();if(mode==='host')sendState();promotion=null;if(mode==='ai')$('net-status').textContent=`DU: KORALLE · ${Progress.belt(wins).name.toUpperCase()} · COMPUTER: JADE · ${DojoAI.LEVELS[aiState.level].name.toUpperCase()}`;}
$('ai-btn').onclick=()=>{closeNetwork();startGame('ai');};
$('online-btn').onclick=()=>{panels('online-panel');$('online-hint').textContent='Ihr braucht beide eine Internetverbindung.';$('online-hint').classList.remove('error');$('create-btn').disabled=false;$('join-btn').disabled=false;};
document.querySelectorAll('.back-home').forEach(b=>b.onclick=home);
$('touch-btn').onclick=()=>setTouch(!touchEnabled);
$('sound-btn').onclick=()=>{muted=!muted;$('sound-btn').textContent=muted?'Ton aus':'Ton an';$('sound-btn').setAttribute('aria-pressed',String(!muted));DojoAudio.setEnabled(!muted);unlock();DojoAudio.play({type:'block'});};
$('full-btn').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else showToast('Vollbild ist in diesem Browser nicht verfügbar.');}catch{showToast('Vollbild ist hier nicht verfügbar. Das Spiel bleibt spielbar.');}};
function pausedUI(){if(!game)return;if(game.phase==='over'){if(game.fighters.every(f=>f.hp>0||f.fall>=.85))showResult();return;}if(game.paused.some(Boolean)){panels('pause-panel');const own=game.paused[localId],other=game.paused[1-localId];$('pause-message').textContent=other?'Dein Gegner hat pausiert. Ihr müsst beide bereit sein.':'Bereit für den nächsten Schlag?';$('resume-btn').disabled=!own;$('resume-btn').textContent=own?'Weiterkämpfen':'Warte auf deinen Gegner';}else panels(null);}
function setPause(value){if(!game||game.phase==='over')return;clearInput();game.paused[localId]=value;if(mode==='guest')send({type:'pause',value});else if(mode==='host')sendState();pausedUI();}
function togglePause(){if(game)setPause(!game.paused[localId]);}
$('pause-btn').onclick=togglePause;$('resume-btn').onclick=()=>setPause(false);
function openHelp(){helpFocus=document.activeElement;wasHelpPaused=!!game?.paused[localId];if(game)setPause(true);$('help').hidden=false;$('close-help').focus();}
function closeHelp(){$('help').hidden=true;if(game&&!wasHelpPaused)setPause(false);helpFocus?.focus?.({preventScroll:true});}
$('help-btn').onclick=openHelp;$('learn-btn').onclick=openHelp;$('close-help').onclick=closeHelp;
function showResult(){panels('result-panel');const w=game.winner;$('result-title').textContent=w===-1?'Unentschieden':(w===0?'Koralle':'Jade')+' gewinnt das Match.';$('result-description').textContent=`${game.scores[0]} : ${game.scores[1]} ${game.rules.mode==='points'?'Punkte':'Runden'}${game.roundReason==='time'?' · nach Zeitablauf':''}.`;$('belt-result').textContent=mode!=='ai'?'':promotion?`Neuer Gürtel: ${promotion.name}!`:w===0?`Gürtel: ${Progress.belt(wins).name}`+(Progress.belt(wins).next?` · noch ${Progress.belt(wins).next.remaining} bis ${Progress.belt(wins).next.name}`:''):'';$('rematch-btn').disabled=localRematch;$('rematch-hint').textContent=localRematch?'Du bist bereit. Warte auf deinen Gegner.':remoteRematch?'Dein Gegner möchte eine Revanche.':'';}
$('rematch-btn').onclick=()=>{if(mode==='ai')startGame('ai');else{localRematch=true;send({type:'rematch'});if(mode==='host'&&remoteRematch)startGame('host');else showResult();}};
const bindings={KeyF:'forward',KeyD:'back',ArrowLeft:'left',ArrowRight:'right',KeyW:'up',ArrowUp:'up',ArrowDown:'down',KeyJ:'punch',KeyK:'kick',KeyS:'highBlock',Space:'lowBlock'};
addEventListener('keydown',e=>{
 if(e.code==='Escape'){e.preventDefault();if(!$('help').hidden)closeHelp();else if(game)togglePause();else if(!$('online-panel').hidden||!$('lobby-panel').hidden)home();return;}
 if(e.code==='Tab'&&!$('help').hidden){const items=[...$('help').querySelectorAll('button,a')];if(e.shiftKey&&document.activeElement===items[0]){items.at(-1).focus();e.preventDefault();}else if(!e.shiftKey&&document.activeElement===items.at(-1)){items[0].focus();e.preventDefault();}return;}
 if(e.target instanceof HTMLInputElement||e.target.tagName==='SELECT')return;
 if(e.code==='Enter'&&e.target===document.body){if(mode==='menu')$('ai-btn').click();else if(game?.paused[localId])setPause(false);return;}
 const action=bindings[e.code];if(!action||!$('help').hidden)return;
 // Space keeps its usual button activation outside an active duel.
 if(e.code==='Space'&&(!game||game.paused.some(Boolean)||game.phase==='over'))return;e.preventDefault();if(e.repeat)return;keys.add(e.code);if(classicControls()){if(['KeyJ','Space'].includes(e.code))classicActionQueued=true;}else if(['up','punch','kick'].includes(action))queuedEdges[action]=true;lastDevice='keyboard';unlock();
});
addEventListener('keyup',e=>keys.delete(e.code));
function loseFocus(){clearInput();if(game&&game.phase!=='over')setPause(true);}
addEventListener('blur',loseFocus);document.addEventListener('visibilitychange',()=>{if(document.hidden)loseFocus();});
const touchOwners=new Map();
document.querySelectorAll('[data-action]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();const a=b.dataset.action;b.setPointerCapture(e.pointerId);touchOwners.set(e.pointerId,a);touch[a]=true;if(classicControls()&&a==='punch')classicActionQueued=true;else queuedEdges[a]=true;b.classList.add('held');lastDevice='touch';unlock();});const release=e=>{const a=touchOwners.get(e.pointerId);touchOwners.delete(e.pointerId);if(a&&!Array.from(touchOwners.values()).includes(a)){touch[a]=false;b.classList.remove('held');}};b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);});
let stickPointer=null;const stick=$('stick');function moveStick(e){const r=stick.getBoundingClientRect(),dx=(e.clientX-r.left-r.width/2)/(r.width/2),dy=(e.clientY-r.top-r.height/2)/(r.height/2);touch.left=dx<-.27;touch.right=dx>.27;touch.down=dy>.35;const up=dy<-.5;if(up&&!touch.up&&!classicControls())queuedEdges.up=true;touch.up=up;const length=Math.max(1,Math.hypot(dx,dy));$('knob').style.transform=`translate(${dx/length*r.width*.28}px,${dy/length*r.height*.28}px)`;}
stick.addEventListener('pointerdown',e=>{if(stickPointer!==null)return;e.preventDefault();stickPointer=e.pointerId;stick.setPointerCapture(e.pointerId);moveStick(e);lastDevice='touch';unlock();});stick.addEventListener('pointermove',e=>{if(e.pointerId===stickPointer)moveStick(e);});function releaseStick(e){if(e.pointerId!==stickPointer)return;stickPointer=null;touch.left=touch.right=touch.up=touch.down=false;$('knob').style.transform='';}stick.addEventListener('pointerup',releaseStick);stick.addEventListener('pointercancel',releaseStick);stick.addEventListener('lostpointercapture',releaseStick);
function gamepads(){try{return navigator.getGamepads?Array.from(navigator.getGamepads()).filter(p=>p?.connected):[];}catch{return [];}}
let padWarned=false,padName='';
function sampleInput(){let a=blank();const isClassic=classicControls();let padAction=false;
 const self=game?.fighters[localId],opponent=game?.fighters[1-localId];
 const toward=(self&&opponent?opponent.x>=self.x:localId===0)?'right':'left';
 for(const code of keys){const k=bindings[code];if(k==='forward')a[toward]=true;else if(k==='back')a[toward==='right'?'left':'right']=true;else if(k in a)a[k]=true;}for(const k in a)a[k] ||=touch[k];const ps=gamepads(),valid=ps.filter(p=>p.mapping==='standard');if(selectedPad!==null&&!valid.some(p=>p.index===selectedPad)){selectedPad=null;const label=$('pad-status');if(label)label.textContent='Controller getrennt. Tastatur und Touch bleiben verfügbar.';if(game)loseFocus();showToast('Controller getrennt. Tastatur und Touch bleiben verfügbar.');}if(selectedPad===null&&valid.length){selectedPad=valid[0].index;padName=valid[0].id||'Gamepad';const label=$('pad-status');if(label)label.textContent='Verbunden: '+padName;showToast(isClassic?'Controller bereit · Stick + ✕/A für Techniken':'Controller bereit · □/X Schlag · ○/B Tritt · L1/L2 Block');}
const p=valid.find(p=>p.index===selectedPad);if(p){const b=n=>!!p.buttons[n]?.pressed;const active=p.buttons.some(b=>b.pressed)||p.axes.some(v=>Math.abs(v)>.3);if(active){lastDevice='pad';if(touchEnabled)setTouch(false);}a.left ||=p.axes[0]<-.3||b(14);a.right ||=p.axes[0]>.3||b(15);a.up ||=p.axes[1]<-.55||b(12)||(!isClassic&&b(0));padAction=b(0);a.down ||=p.axes[1]>.55||b(13);a.punch ||=b(2);a.kick ||=b(1);a.block ||=b(4);if(b(6)){a.down=true;a.block=true;}if(active)unlock();const menu=b(9);if(menu&&!padMenu){unlock();if(!$('help').hidden)closeHelp();else if(game)togglePause();else if(mode==='menu'&&!$('home-panel').hidden)$('ai-btn').click();}padMenu=menu;
}else if(ps.length&&!padWarned){padWarned=true;showToast('Controller ohne Standard-Layout erkannt. Nutze bitte Tastatur oder Touch.');}
if(isClassic){
 const action=keys.has('KeyJ')||keys.has('Space')||touch.punch||padAction;
 const raw={...a,action,block:touch.block};
 const pressed=classicActionQueued||(action&&!classicWasAction),mapped=ControlMap.classic(raw,pressed,toward==='right'?1:-1);
 if(raw.up&&!classicWasUp&&!action&&!mapped.input.block)mapped.edge.up=true;
 classicActionQueued=false;classicWasAction=action;classicWasUp=raw.up;a=mapped.input;
 for(const k in mapped.edge)queuedEdges[k] ||=mapped.edge[k];
}else{
 if(keys.has('Space')){a.block=true;a.down=true;}else if(keys.has('KeyS')){a.block=true;a.down=false;}
 for(const k of ['up','punch','kick'])if(a[k]&&!observedInput[k])queuedEdges[k]=true;
}
observedInput={...a};
return a;}
function takeEdges(){const e=queuedEdges;queuedEdges=blank();return e;}
function send(data){if(!conn?.open)return;try{if(conn.dataChannel?.bufferedAmount>256000)return;conn.send(data);}catch{}}
function sendState(){if(game)send({type:'state',game});}
function netFail(message){closeNetwork();game=null;mode='menu';stage.classList.remove('playing');$('pause-btn').hidden=true;panels('online-panel');$('online-hint').textContent=message;$('online-hint').classList.add('error');$('create-btn').disabled=false;$('join-btn').disabled=false;clearInput();}
const randomCode=()=>{const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',a=new Uint8Array(6);crypto.getRandomValues(a);return Array.from(a,x=>alphabet[x%alphabet.length]).join('');};
function online(host){unlock();if(!host&&!/^[A-Z2-9]{6}$/.test($('join-code').value.trim().toUpperCase())){$('online-hint').textContent='Bitte den sechsstelligen Raumcode eingeben (ohne 0 und 1).';return;}
closeNetwork();mode=host?'host':'guest';localId=host?0:1;const gen=generation;roomCode=host?randomCode():$('join-code').value.trim().toUpperCase();$('create-btn').disabled=true;$('join-btn').disabled=true;$('online-hint').classList.remove('error');$('online-hint').textContent='Verbindung wird vorbereitet …';
if(typeof Peer==='undefined'){netFail('Die Verbindungskomponente fehlt. Bitte die vollständige Spieldatei neu öffnen.');return;}
try{peer=new Peer(host?'strichkampf-v7-'+roomCode:undefined,{debug:0,config:{iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun.cloudflare.com:3478'}]}});}catch{netFail('Dieser Browser kann die Online-Verbindung nicht öffnen.');return;}
connectTimer=setTimeout(()=>{if(gen===generation)netFail('Keine Verbindung möglich. Code prüfen, Raum neu eröffnen oder ein anderes Netz versuchen. Manche Router benötigen einen zusätzlichen Relay-Dienst.');},20000);
peer.on('open',()=>{if(gen!==generation)return;panels('lobby-panel');$('room-code').textContent=roomCode;$('fight-online-btn').hidden=true;$('copy-btn').hidden=!host;$('lobby-tag').textContent=host?'DEIN RAUMCODE':'RAUMCODE';$('lobby-title').textContent=host?'Dein Gegner fehlt noch.':'Gegner wird gesucht …';$('lobby-hint').textContent=host?'Gib diesen Code an deinen Mitspieler weiter.':'Die Verbindung zum Gastgeber wird aufgebaut.';
 if(host){clearTimeout(connectTimer);$('net-status').textContent='WARTE AUF GEGNER';}
 else{const c=peer.connect('strichkampf-v7-'+roomCode,{reliable:true,serialization:'json',metadata:{version:7}});attachConnection(c,gen);}
});
peer.on('connection',c=>{if(gen!==generation||!host||conn){c.on('open',()=>{try{c.send({type:'busy'});}catch{}setTimeout(()=>c.close(),100);});return;}if(c.metadata?.version!==7){c.close();return;}attachConnection(c,gen);});
peer.on('error',err=>{if(gen!==generation)return;if(conn?.open){showToast('Raumvermittlung unterbrochen; das laufende Duell bleibt verbunden.');return;}const messages={'peer-unavailable':'Raum nicht gefunden. Nutzt beide die neue Spieldatei, prüft den Code und lasst den Raum geöffnet.','unavailable-id':'Dieser Raumcode ist schon belegt. Bitte erneut einen Raum eröffnen.','network':'Der Verbindungsdienst ist nicht erreichbar. Bitte später erneut versuchen.','browser-incompatible':'Dieser Browser unterstützt die Online-Verbindung nicht.'};netFail(messages[err.type]||'Online-Verbindung fehlgeschlagen. Bitte Raum neu eröffnen oder ein anderes Netz versuchen.');});
peer.on('disconnected',()=>{if(gen===generation&&!conn?.open)netFail('Die Verbindung zum Raumdienst wurde unterbrochen. Bitte erneut versuchen.');});
}
function attachConnection(c,gen){conn=c;c.on('open',()=>{if(gen!==generation)return;clearTimeout(connectTimer);lastReceived=performance.now();$('lobby-title').textContent='Ihr seid verbunden.';$('lobby-hint').textContent=mode==='host'?'Du spielst Koralle. Dein Gegner spielt Jade.':'Du spielst Jade. Der Gastgeber startet das Duell.';$('fight-online-btn').hidden=mode!=='host';$('net-status').textContent='VERBUNDEN';$('lobby-rules').textContent=mode==='host'?ruleText(selectedRules()):'Spielregeln werden vom Gastgeber übernommen.';send({type:'hello',version:7});if(mode==='host')send({type:'settings',rules:selectedRules()});});c.on('data',d=>{if(gen!==generation||!d||typeof d!=='object')return;lastReceived=performance.now();receive(d);});c.on('close',()=>{if(gen===generation)netFail('Dein Gegner hat die Verbindung beendet. Du kannst einen neuen Raum eröffnen.');});c.on('error',()=>{if(gen===generation)netFail('Die direkte Verbindung ist abgebrochen. Bitte erneut verbinden.');});}
function validGame(g){return g&&['countdown','fight','break','over'].includes(g.phase)&&g.rules&&['duel','points'].includes(g.rules.mode)&&[2,3].includes(g.rules.pointsToWin)&&[0,60,90].includes(g.rules.timeLimit)&&Array.isArray(g.scores)&&g.scores.length===2&&g.scores.every(v=>Number.isInteger(v)&&v>=0&&v<=3)&&Number.isFinite(g.clock)&&Number.isFinite(g.freeze)&&Number.isFinite(g.breakTime)&&Number.isFinite(g.elapsed)&&Number.isFinite(g.countdown)&&Array.isArray(g.paused)&&g.paused.length===2&&g.paused.every(v=>typeof v==='boolean')&&Array.isArray(g.fighters)&&g.fighters.length===2&&g.fighters.every(f=>f&&['x','y','hp','face','walk','stun','hit','vy','invuln','guardAge','parryCooldown','parryFlash','stagger','reactionTime','knockback','fall','combo','comboClock'].every(k=>Number.isFinite(f[k]))&&(f.comboKey===null||['punch','kick'].includes(f.comboKey))&&(f.reaction===null||f.reaction in Combat.REACTIONS)&&f.x>=0&&f.x<=1280&&f.y>=0&&f.y<600&&f.hp>=0&&f.hp<=Combat.HP&&(!f.attack||(MOVES[f.attack.kind]&&Number.isFinite(f.attack.t)&&Array.isArray(f.attack.spent)))&&(!f.stride||['t','duration','dir','length'].every(k=>Number.isFinite(f.stride[k]))))&&Number.isInteger(g.eventId)&&Array.isArray(g.events)&&g.events.length<=32;}
function receive(d){
 if(d.type==='hello'&&mode==='host'){send({type:'settings',rules:selectedRules()});return;}
 if(d.type==='settings'&&mode==='guest'){$('lobby-rules').textContent=ruleText(Combat.rules(d.rules));return;}
 if(d.type==='busy'){netFail('Dieser Raum ist bereits voll. Bitte einen neuen Raum eröffnen.');return;}
 if(d.type==='ping'){send({type:'pong',at:d.at});return;}if(d.type==='pong'&&Number.isFinite(d.at)){ping=Math.max(0,Math.round(performance.now()-d.at));return;}
 if(mode==='host'){
  if(d.type==='input'&&Number.isInteger(d.seq)&&d.seq>remoteSeq){remoteSeq=d.seq;for(const k in blank()){const next=d.input?.[k]===true;if(['up','punch','kick'].includes(k)&&d.edges?.[k]===true)remoteEdges[k]=true;remoteInput[k]=next;}}
  if(d.type==='pause'&&game&&typeof d.value==='boolean'){game.paused[1]=d.value;game.freezeQueue=[null,null];for(const f of game.fighters)f.buffer=null;remoteInput=blank();remoteEdges=blank();pausedUI();sendState();}
  if(d.type==='rematch'&&game?.phase==='over'){remoteRematch=true;if(localRematch)startGame('host');else showResult();}
 }else if(mode==='guest'){
  if(d.type==='state'&&validGame(d.game)){
   const fresh=!game||d.game.elapsed<game.elapsed-.5,wasOver=game?.phase==='over';if(fresh){lastEvent=0;effects=[];trails=[[],[]];renderFighters=null;localRematch=false;remoteRematch=false;clearInput();}
   game=d.game;stage.classList.add('playing');$('pause-btn').hidden=false;pausedUI();consumeEvents();if(wasOver&&game.phase!=='over')panels(null);
  }
  if(d.type==='rematch'&&game?.phase==='over'){remoteRematch=true;showResult();}
 }
}
$('create-btn').onclick=()=>online(true);$('join-btn').onclick=()=>online(false);$('join-code').addEventListener('keydown',e=>{if(e.key==='Enter')online(false);});$('fight-online-btn').onclick=()=>{if(conn?.open)startGame('host');};
$('copy-btn').onclick=async()=>{try{await navigator.clipboard.writeText(roomCode);showToast('Raumcode kopiert.');}catch{const selection=getSelection(),r=document.createRange();r.selectNodeContents($('room-code'));selection.removeAllRanges();selection.addRange(r);showToast('Code markiert. Mit Strg+C / ⌘C kopieren.');}};
function networkTick(now,input){if(!conn?.open)return;if(now-lastPing>1000){lastPing=now;send({type:'ping',at:now});}if(lastReceived&&now-lastReceived>12000){netFail('Die Verbindung antwortet nicht mehr. Bitte einen neuen Raum eröffnen.');return;}
if(game){$('net-status').textContent=(localId===0?'DU: KORALLE':'DU: JADE')+' · '+(ping?ping+' ms':'ONLINE')+(ping>160?' · VERZÖGERUNG':'');if(mode==='guest'&&now-lastSend>=1000/60){lastSend=now;send({type:'input',seq:++sequence,input:game.paused.some(Boolean)?blank():input,edges:takeEdges()});}if(mode==='host'&&now-lastSnapshot>=1000/30){lastSnapshot=now;sendState();}}
}
// Effects (Plan 4c): sparks fly from the contact, a ring and impact lines mark it, big hits flash the screen,
// combo counts float up and the show phase leaves a glowing trail on the striking limb. Reduced motion halves it all.
const EFFECT_LIMIT=400;
function addEffect(e){effects.push(e);if(effects.length>EFFECT_LIMIT)effects.splice(0,effects.length-EFFECT_LIMIT);}
function sparks(x,y,color,n,speed=1){if(!Number.isFinite(x)||!Number.isFinite(y))return;for(let i=0;i<n;i++){const angle=Math.random()*Math.PI*2,s=(90+Math.random()*240)*speed;addEffect({type:'spark',x,y,vx:Math.cos(angle)*s,vy:Math.sin(angle)*s-60,life:.34+Math.random()*.12,max:.42,color,width:1.5+Math.random()*2});}}
function ring(x,y,color,radius,life=.22){if(!Number.isFinite(x)||!Number.isFinite(y))return;addEffect({type:'ring',x,y,color,radius,life,max:life});}
function impactLines(x,y,color,n,length){if(!Number.isFinite(x)||!Number.isFinite(y))return;for(let i=0;i<n;i++){const angle=Math.random()*Math.PI*2;addEffect({type:'line',x,y,angle,length:length*(.6+Math.random()*.6),color,life:.14,max:.14});}}
function flash(color,life=.12){addEffect({type:'flash',color,life,max:life});}
function floatText(x,y,label,size,color,life=.55){if(!Number.isFinite(x)||!Number.isFinite(y))return;addEffect({type:'text',x,y,label,size,color,life,max:life,vy:-70});}
function bigText(label,color,life=.9){addEffect({type:'big',label,color,life,max:life});}
function hitEffects(e){
 const color=COLORS[e.who]||'#f2e8bd',scale=reduce?.5:1,show=e.combo>=7,strong=e.strong;
 sparks(e.x,e.y,show?'#ffd36b':color,Math.round((show?28:strong?14:7)*scale),show?1.4:strong?1.15:1);
 ring(e.x,e.y,show?'#ffd36b':'#fff3d0',show?70:strong?50:34);
 impactLines(e.x,e.y,show?'#fff0ab':'#fff3d0',Math.round((show?10:strong?8:4)*scale),show?90:strong?60:40);
 if(e.combo>=4&&!show)floatText(e.x,e.y-30,`COMBO ${e.combo}`,22,'#fff0ab');
 if(show){if(!reduce)flash('#ffd36b22',.14);bigText(`${e.combo} TREFFER`,'#ffd36b');}
 shake=reduce?0:show||strong?.08:.04;shakeStrength=show?9:strong?6:4;
}
function guardEffects(e){
 const breaker=e.type==='breaker',perfect=e.type==='parry',scale=reduce?.5:1,color=e.type==='block'?'#f8eac5':'#fff0ad';
 sparks(e.x,e.y,color,Math.round((breaker?26:perfect?17:7)*scale),breaker?1.3:1);ring(e.x,e.y,color,breaker?80:perfect?56:30,breaker?.3:.2);
 if(breaker){if(!reduce)flash('#fff0ad2a',.16);bigText('COMBO BREAKER!','#fff0ad',1.1);shake=reduce?0:.08;shakeStrength=8;}
 else if(perfect)impactLines(e.x,e.y,color,Math.round(6*scale),50);
}
function updateEffects(dt){
 for(const e of effects){e.life-=dt;if(e.type==='spark'){e.x+=e.vx*dt;e.y+=e.vy*dt;e.vy+=520*dt;e.vx*=1-1.6*dt;}else if(e.type==='text')e.y+=e.vy*dt;}
 effects=effects.filter(e=>e.life>0);
 if(game&&game.rules.mode==='duel')for(const f of game.fighters){const t=trails[f.id];if(f.combo>=Combat.COMBO_SHOW&&f.attack){const q=KarateRig.pose(f).strike;if(q)t.push({x:f.x+q[0]*f.face,y:FLOOR-f.y+q[1],life:.25});}for(const n of t)n.life-=dt;trails[f.id]=t.filter(n=>n.life>0).slice(-14);}
 shake=Math.max(0,shake-dt);
}
function drawEffects(){
 for(let i=0;i<2;i++){const t=trails[i];if(t.length>1){ctx.strokeStyle=COLORS[i];ctx.lineCap='round';for(let k=1;k<t.length;k++){ctx.globalAlpha=t[k].life/.25*.7;ctx.lineWidth=2+t[k].life*28;ctx.beginPath();ctx.moveTo(t[k-1].x,t[k-1].y);ctx.lineTo(t[k].x,t[k].y);ctx.stroke();}}}
 for(const e of effects){const a=e.life/e.max;
  if(e.type==='spark'){ctx.globalAlpha=a;ctx.strokeStyle=e.color;ctx.lineWidth=e.width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x-e.vx*.03,e.y-e.vy*.03);ctx.stroke();}
  else if(e.type==='ring'){ctx.globalAlpha=a*.8;circle(e.x,e.y,e.radius*(1-a*.8),e.color,false,2+a*3);}
  else if(e.type==='line'){ctx.globalAlpha=a;ctx.strokeStyle=e.color;ctx.lineWidth=1+a*2.5;ctx.beginPath();const r0=e.length*(1-a)*.35+8,r1=r0+e.length*a;ctx.moveTo(e.x+Math.cos(e.angle)*r0,e.y+Math.sin(e.angle)*r0);ctx.lineTo(e.x+Math.cos(e.angle)*r1,e.y+Math.sin(e.angle)*r1);ctx.stroke();}
  else if(e.type==='flash'){ctx.globalAlpha=a;ctx.fillStyle=e.color;ctx.fillRect(0,0,W,H);}
  else if(e.type==='text'){ctx.globalAlpha=Math.min(1,a*1.5);text(e.label,e.x,e.y,e.size,e.color,'center',800);}
  else if(e.type==='big'){const pop=1+Math.max(0,a-.8)*3;ctx.globalAlpha=Math.min(1,a*2);text(e.label,640,300,Math.round(54*pop),e.color,'center',900);}
 }
 ctx.globalAlpha=1;
}
function consumeEvents(){if(!game)return;for(const e of game.events){if(e.id<=lastEvent)continue;lastEvent=e.id;DojoAudio.play(e);
 if(e.type==='hit'){hitEffects(e);rumble(e.who!==localId?(e.combo>=7?.7:.35):.10,e.combo>=7?120:75);}
 else if(e.type==='block'||e.type==='parry'||e.type==='breaker'){guardEffects(e);if(e.who===localId)rumble(e.type==='block'?.17:.55,e.type==='block'?45:140);}
 else if(e.type==='round'){clearInput();remoteInput=blank();remoteEdges=blank();renderFighters=null;}
 else if(e.type==='reset'){clearInput();remoteInput=blank();remoteEdges=blank();renderFighters=null;effects=[];trails=[[],[]];}
 else if(e.type==='sudden')showToast('Verlängerung · der nächste eindeutige Treffer entscheidet.');
 else if(e.type==='match'){clearInput();if(mode==='ai'&&e.winner===0){const r=Progress.recordWin(store,wins);wins=r.wins;promotion=r.newBelt?r.belt:null;updateBelt();if(promotion)DojoAudio.play({type:'belt'});}if(game.fighters.every(f=>f.hp>0))showResult();}
}}
function rumble(strength,duration){const p=gamepads().find(p=>p.index===selectedPad);try{p?.vibrationActuator?.playEffect('dual-rumble',{duration,strongMagnitude:strength,weakMagnitude:strength*.65})?.catch(()=>{});}catch{}}
function line(points,color,width=7){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();}
function circle(x,y,r,color,fill=true,width=2){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(fill){ctx.fillStyle=color;ctx.fill();}else{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}}
function text(s,x,y,size,color,align='center',weight=500){ctx.fillStyle=color;ctx.font=(Math.round(weight/100)*100)+' '+size+'px Arial, sans-serif';ctx.textAlign=align;ctx.fillText(s,x,y);}
const scene=document.createElement('canvas');scene.width=W;scene.height=H;
function drawBackground(){const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#294a48');g.addColorStop(.43,'#9b9a72');g.addColorStop(.75,'#d5b580');g.addColorStop(1,'#777e67');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
circle(640,241,94,'#e8c690');circle(640,241,113,'#e8c69012');
function ridge(points,color){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,525);for(const p of points)ctx.lineTo(...p);ctx.lineTo(W,525);ctx.closePath();ctx.fill();}
ridge([[0,285],[117,251],[211,299],[345,215],[443,284],[543,300],[640,332],[789,269],[951,239],[1103,297],[1207,251],[1280,265]],'#577367');ridge([[0,348],[143,301],[281,365],[455,297],[599,346],[743,331],[895,385],[1055,304],[1280,335]],'#3a5c51');ridge([[0,410],[107,374],[267,421],[431,392],[591,438],[713,385],[894,424],[1077,384],[1280,416]],'#2c5146');
ctx.fillStyle='#203e36';for(let i=0;i<18;i++)ctx.fillRect(i*79+8,449,5,80);ctx.fillRect(0,458,W,6);ctx.fillRect(0,492,W,5);
// Simple canvas scenery stays part of the game's renderer.
for(const x of [110,1170]){line([[x-53,534],[x-45,307]],'#213f36',13);line([[x+53,534],[x+45,307]],'#213f36',13);line([[x-67,338],[x+67,338]],'#213f36',10);line([[x-84,304],[x,315],[x+84,304]],'#213f36',15);}
ctx.fillStyle='#ada88a';ctx.fillRect(0,FLOOR,W,H-FLOOR);ctx.fillStyle='#334638';ctx.fillRect(0,FLOOR,W,5);ctx.strokeStyle='#596b5250';ctx.lineWidth=1;for(let i=-4;i<16;i++){ctx.beginPath();ctx.moveTo(640+(i*105-640)*.72,FLOOR);ctx.lineTo(i*105,H);ctx.stroke();}for(const y of [587,650,715]){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}line([[429,558],[471,558]],'#aa765d',3);line([[809,558],[851,558]],'#567d67',3);
const shade=ctx.createLinearGradient(0,0,0,H);shade.addColorStop(0,'#102b3160');shade.addColorStop(.24,'#102b3100');shade.addColorStop(.72,'#102b3100');shade.addColorStop(1,'#123b2d3a');ctx.fillStyle=shade;ctx.fillRect(0,0,W,H);
// A fixed grain keeps the flat illustration from looking plastic.
let seed=17;for(let i=0;i<7000;i++){seed=(seed*16807)%2147483647;const x=seed%W;seed=(seed*16807)%2147483647;const y=seed%H;ctx.fillStyle=i%2?'#102c2310':'#fff3c90b';ctx.fillRect(x,y,1,1);}
scene.getContext('2d').drawImage(canvas,0,0);}
drawBackground();
function drawFighter(f,ambient=false){
 const p=KarateRig.pose(f,nowTime/1000),color=COLORS[f.id],ink='#172521',cloth=f.id?'#879b94':'#e7e0cd',shade=f.id?'#566e67':'#b7ae97',skin='#e4bc98',skinShade='#c9a07c';
 ctx.save();ctx.translate(f.x,FLOOR);ctx.fillStyle='#183c3438';ctx.beginPath();ctx.ellipse(0,7,49-f.y*.04,8,0,0,Math.PI*2);ctx.fill();ctx.translate(0,-f.y);ctx.scale(f.face,1);
 if(f.fall>0){
  const t=Math.min(1,f.fall),ease=t*t*(3-2*t),angle=(-Math.PI/2+.10)*ease;
  const points=[[p.head,15.5],[p.shoulder,17],[p.hip,20]];
  for(const limb of [p.frontArm,p.backArm,p.frontLeg,p.backLeg])limb.forEach((q,i)=>points.push([q,i===2?7:12]));
  const bottom=Math.max(...points.map(([q,r])=>q[0]*Math.sin(angle)+q[1]*Math.cos(angle)+r));
  ctx.translate(-7*ease,Math.min(0,3-bottom)-5*Math.sin(t*Math.PI));ctx.rotate(angle);
 }
 function polygon(points,fill,stroke=ink,width=2){ctx.beginPath();points.forEach((v,i)=>i?ctx.lineTo(...v):ctx.moveTo(...v));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.lineJoin='round';ctx.stroke();}}
 function sleeve(a,b,w1,w2,fill){const d=Math.hypot(b[0]-a[0],b[1]-a[1])||1,n=[-(b[1]-a[1])/d,(b[0]-a[0])/d];polygon([[a[0]+n[0]*w1,a[1]+n[1]*w1],[b[0]+n[0]*w2,b[1]+n[1]*w2],[b[0]-n[0]*w2,b[1]-n[1]*w2],[a[0]-n[0]*w1,a[1]-n[1]*w1]],fill);}
 const along=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
 // Joints are drawn as discs with a short crease so knees and elbows read as hinges.
 function hinge(q,r,fill,from,to){circle(q[0],q[1],r,fill);const d=Math.hypot(to[0]-from[0],to[1]-from[1])||1,n=[-(to[1]-from[1])/d,(to[0]-from[0])/d];line([[q[0]+n[0]*r*.6,q[1]+n[1]*r*.6],[q[0]-n[0]*r*.6,q[1]-n[1]*r*.6]],ink+'55',1.5);}
 function foot(ankle,shin,kicking){const d=Math.hypot(ankle[0]-shin[0],ankle[1]-shin[1])||1,u=[(ankle[0]-shin[0])/d,(ankle[1]-shin[1])/d];
  // Heel behind the ankle, toes ahead; a kicking foot points its toes, a planted one lies flat.
  const heel=kicking?[ankle[0]-u[0]*4-u[1]*6,ankle[1]-u[1]*4+u[0]*6]:[ankle[0]-9,ankle[1]+3],toe=kicking?[ankle[0]+u[1]*13+u[0]*2,ankle[1]-u[0]*13+u[1]*2]:[ankle[0]+14,ankle[1]+3];
  polygon([heel,[ankle[0]-3,ankle[1]-5],[ankle[0]+5,ankle[1]-4],toe,kicking?[toe[0]-u[1]*2+u[0]*3,toe[1]+u[0]*2+u[1]*3]:[toe[0]-1,toe[1]+3],kicking?heel:[heel[0]+2,heel[1]+3]],skin,ink,2);}
 function leg(points,back){const [root,knee,ankle]=points,fill=back?shade:cloth,cuff=along(knee,ankle,.82);
  sleeve(root,knee,16,12,fill);sleeve(knee,cuff,12,9,fill);hinge(knee,11,fill,root,ankle);
  line([cuff,ankle],ink,10);line([cuff,ankle],skin,6);
  const kicking=(back?1:0)===(p.strikeLeg||0)&&p.kick&&p.extension>.25;foot(ankle,cuff,kicking);
  line([[root[0]+3,root[1]+12],[knee[0]+3,knee[1]-6]],'#38584830',1.4);}
 function arm(points,back){const [root,elbow,hand]=points,cuff=along(elbow,hand,.62),fill=back?shade:cloth;
  line([cuff,hand],ink,10);line([cuff,hand],skin,6);sleeve(root,elbow,13,10,fill);sleeve(elbow,cuff,10,8,fill);hinge(elbow,8,fill,root,hand);
  // Fist: a knuckle ridge on the striking side.
  circle(hand[0],hand[1],6.6,ink);circle(hand[0],hand[1],4.8,skin);line([[hand[0]+1,hand[1]-3],[hand[0]+4,hand[1]+1]],skinShade,1.6);}
 leg(p.backLeg,true);leg(p.frontLeg,false);
 const s=p.shoulder,h=p.hip,fs=p.frontArm[0],bs=p.backArm[0],waist=along(h,s,.42),waistWidth=14,hipWidth=20;
 // Pelvis block under the belt, then the jacket with a tapered waist, chest and a shoulder yoke that turns with the hips.
 polygon([[h[0]-hipWidth,h[1]-3],[h[0]+hipWidth,h[1]-3],[h[0]+hipWidth-4,h[1]+20],[h[0]+2,h[1]+24],[h[0]-hipWidth+4,h[1]+19]],cloth);
 polygon([[bs[0]-6,bs[1]-4],[fs[0]+8,fs[1]-2],[waist[0]+waistWidth+2,waist[1]],[h[0]+hipWidth+1,h[1]+9],[h[0]+1,h[1]+13],[h[0]-hipWidth-1,h[1]+8],[waist[0]-waistWidth,waist[1]]],cloth);
 line([[s[0]-10,s[1]],[s[0]+2,s[1]+20],[h[0]+10,h[1]-9]],shade,5);line([[s[0]+11,s[1]],[s[0]+2,s[1]+20],[h[0]-6,h[1]-5]],ink,2);line([[s[0]-7,s[1]+2],[s[0]+2,s[1]+20]],'#ffffff70',2);
 line([[waist[0]-waistWidth+3,waist[1]+1],[waist[0]+waistWidth-2,waist[1]+2]],shade+'80',2);
 polygon([[p.neck[0]-7,p.neck[1]+2],[p.neck[0]+7,p.neck[1]+2],[fs[0]+6,fs[1]-1],[bs[0]-5,bs[1]-2]],cloth);line([[bs[0]-5,bs[1]-2],[fs[0]+6,fs[1]-1]],ink,2.5);
 // The obi shows the earned belt against the computer (two colours for an in-between belt, red marks for Meister).
 const belt=beltColors(f),bc=belt?belt.colors:[color],b1=bc[0],b2=bc[bc.length-1];
 line([[h[0]-hipWidth,h[1]-1],[h[0]+hipWidth-1,h[1]-1]],ink,9);line([[h[0]-hipWidth+1,h[1]-1],[h[0],h[1]-1]],b1,5);line([[h[0],h[1]-1],[h[0]+hipWidth-2,h[1]-1]],b2,5);const sway=Math.sin(nowTime*.008+f.walk*3)*2;circle(h[0]+5,h[1],4.5,ink);circle(h[0]+5,h[1],3,b2);line([[h[0]+5,h[1]],[h[0]+10+sway,h[1]+24]],ink,6);line([[h[0]+5,h[1]],[h[0]+10+sway,h[1]+24]],b2,3);line([[h[0]+5,h[1]],[h[0]-1+sway,h[1]+19]],b1,3);
 if(belt&&belt.stripes)for(let i=0;i<belt.stripes;i++)line([[h[0]+7+sway*.7,h[1]+16-i*4],[h[0]+11+sway*.7,h[1]+17-i*4]],'#d84a3a',2);
 arm(p.backArm,true);
 // Neck with a hint of trapezius, then the head: skull, jaw, ear, brow line and the headband with its tail.
 line([p.shoulder,[p.head[0],p.head[1]+10]],ink,12);line([p.shoulder,[p.head[0],p.head[1]+10]],skin,7);
 arm(p.frontArm,false);
 circle(p.head[0],p.head[1],15.5,ink);circle(p.head[0],p.head[1],13,skin);
 ctx.fillStyle=skin;ctx.beginPath();ctx.ellipse(p.head[0]+4,p.head[1]+8,9,6,.3,0,Math.PI*2);ctx.fill();ctx.strokeStyle=ink;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.head[0]+4,p.head[1]+8,9,6,.3,.2,Math.PI-.5);ctx.stroke();
 circle(p.head[0]-9,p.head[1]+1,3.2,ink);circle(p.head[0]-9,p.head[1]+1,2,skinShade);
 line([[p.head[0]+6,p.head[1]-2],[p.head[0]+13,p.head[1]-1]],ink,1.7);line([[p.head[0]+9,p.head[1]+1.5],[p.head[0]+11,p.head[1]+1.5]],ink,2.2);
 line([[p.head[0]-13,p.head[1]-6],[p.head[0]+13,p.head[1]-6]],color,5);line([[p.head[0]-12,p.head[1]-5],[p.head[0]-30,p.head[1]+sway]],color,3);
 if(f.hit>0){circle(p.head[0],p.head[1],13,'#fff5d34f');}
 if(p.strike&&p.extension>.70&&!reduce){const q=p.strike;line([[q[0]-15,q[1]-8],[q[0]+9,q[1]-8]],color+'65',2);}
 if(f.block){ctx.strokeStyle=f.parryFlash>0?'#ffebad':'#f4f0d077';ctx.lineWidth=f.parryFlash>0?3:1.5;ctx.beginPath();ctx.arc(17,f.crouch?-83:-151,44,-.85,.85);ctx.stroke();}
 ctx.restore();
 if(f.parryFlash>0)text('PERFEKTER BLOCK',f.x,FLOOR-f.y-232,15,'#fff0ac','center',800);
 if(ambient)text(f.id?'02 / JADE':'01 / KORALLE',f.x,FLOOR+42,14,'#2e4a3b','center',650);
}
// Which key continues the combo, in the words of the device the local player is using.
function comboHint(key,mine){const punch=key==='punch';if(!mine)return punch?'SCHLAG':'TRITT';if(classicControls())return punch?'AKTION':'ZURÜCK + AKTION';if(lastDevice==='pad')return punch?'SCHLAG □/X':'TRITT ○/B';if(lastDevice==='touch')return punch?'SCHLAG':'TRITT';return punch?'SCHLAG (J)':'TRITT (K)';}
function drawHUD(){
 const points=game.rules.mode==='points',target=points?game.rules.pointsToWin:2;
 ctx.fillStyle='#143731d0';ctx.fillRect(0,0,W,125);
 for(const f of game.fighters){
  const left=f.id?813:47,width=420,label=(f.id?'JADE':'KORALLE')+(f.id===localId?(mode==='ai'?' / DU · '+Progress.belt(wins).name.toUpperCase():' / DU'):mode==='ai'?' / COMPUTER · '+DojoAI.LEVELS[aiState.level].name.toUpperCase():' / GEGNER');
  text(label,f.id?1233:47,40,16,COLORS[f.id],f.id?'right':'left',700);
  if(!points){ctx.fillStyle='#0d2520';ctx.fillRect(left,52,width,17);ctx.fillStyle=COLORS[f.id];ctx.fillRect(f.id?left+width-width*f.hp/Combat.HP:left,52,width*f.hp/Combat.HP,17);text(String(f.hp).replace('.',','),f.id?left:left+width,91,15,'#f0ead3',f.id?'left':'right',600);}
  for(let n=0;n<target;n++)circle(f.id?left+width-10-n*27:left+10+n*27,points?70:87,points?9:6,n<game.scores[f.id]?COLORS[f.id]:'#b0bdb1',n<game.scores[f.id],1.5);
  if(points)text(`${game.scores[f.id]} / ${target} PUNKTE`,f.id?left+width:left,111,15,'#e4e5d1',f.id?'right':'left',600);
  else if(f.combo>=Combat.COMBO_CHAIN&&f.comboKey){
   // Chain phase: announce the next key and show how much of the beat is left.
   const mine=f.id===localId,show=f.combo>=Combat.COMBO_SHOW,label=show?`COMBO ${f.combo} · SHOW!`:`COMBO ${f.combo} · ${comboHint(f.comboKey,mine)}`;
   text(label,f.id?left+width:left,114,14,show?'#ffd36b':'#fff0ab',f.id?'right':'left',800);
   const rest=Math.max(0,1-f.comboClock/Combat.COMBO_BEAT),bar=120;ctx.fillStyle='#0d2520';ctx.fillRect(f.id?left+width-bar:left,119,bar,4);ctx.fillStyle=show?'#ffd36b':'#fff0ab';ctx.fillRect(f.id?left+width-bar*rest:left,119,bar*rest,4);
  }
  else if(f.combo>0)text(`${f.combo} ${f.combo===1?'TREFFER':'TREFFER IN FOLGE'}`,f.id?left+width:left,114,13,'#c0cdba',f.id?'right':'left',600);

 }
 const clock=game.suddenDeath?'NÄCHSTER TREFFER':game.rules.timeLimit?String(Math.ceil(game.clock)).padStart(2,'0'):'OHNE ZEITLIMIT';
 text(points?'PUNKTKAMPF':`RUNDE ${game.round}`,640,76,15,'#e8e2c9','center',700);text(clock,640,103,game.suddenDeath?13:16,'#e8e2c9','center',600);
 if(game.phase==='countdown')text(game.countdown>1?'BEREIT?':'KÄMPFT!',640,230,42,'#f5ecd1','center',800);
 if(game.phase==='break'){
  const who=game.roundWinner===0?'KORALLE':'JADE';
  const title=game.roundWinner<0?'GLEICHZEITIG!':points?`PUNKT FÜR ${who}`:`RUNDE AN ${who}`;
  text(title,640,225,32,'#f5ecd1','center',800);
  text(game.roundWinner<0?'Kein Punkt · neuer Austausch':`${game.scores[0]} : ${game.scores[1]}`,640,261,22,'#f5ecd1','center',600);
 }
}
const ambient=[{...Combat.fighter(0),x:265},{...Combat.fighter(1),x:1015}];
function draw(dt){ctx.save();if(shake>0)ctx.translate((Math.random()-.5)*shakeStrength*1.5,(Math.random()-.5)*shakeStrength);ctx.drawImage(scene,0,0);if(game){if(mode==='guest'){if(!renderFighters)renderFighters=structuredClone(game.fighters);renderFighters.forEach((r,i)=>{const f=game.fighters[i],alpha=1-Math.exp(-22*dt);const x=r.x+(f.x-r.x)*alpha,y=r.y+(f.y-r.y)*alpha;Object.assign(r,f,{x,y});drawFighter(r);});}else game.fighters.forEach(f=>drawFighter(f));drawHUD();}else ambient.forEach(f=>drawFighter(f,true));
drawEffects();ctx.restore();}
let lastTip='';
function frame(now){nowTime=now;const dt=Math.min(.05,(now-lastFrame)/1000||0);lastFrame=now;DojoAudio.tick();const input=sampleInput();networkTick(now,input);
const tip=classicControls()?(lastDevice==='pad'?'KLASSIK · Stick + ✕/A · zurück+oben/unten: Block · ?: alle Techniken':'KLASSIK · Pfeile oder F/D + J/Leertaste · zurück+oben/unten: Block · ?: Techniken'):lastDevice==='pad'?'STICK Schritte · □/X Schlag · ○/B Tritt · L1/LB hoch · L2/LT tief':lastDevice==='touch'?'LINKS Schritte · RECHTS angreifen · ↓ + Block: unten':'F vor · D zurück · J Schlag · K Tritt · S Block · Leertaste Block unten · W Sprung';if(tip!==lastTip){lastTip=tip;$('input-tip').textContent=tip;}
if(game&&mode!=='guest'&&!game.paused.some(Boolean)){
 acc+=dt;let first=true;while(acc>=DT){const humanEdge=first?takeEdges():blank();first=false;let other;if(mode==='ai')other=DojoAI.think(aiState,game,DT);else{other={input:remoteInput,edges:remoteEdges};remoteEdges=blank();}step(game,[input,other.input],[humanEdge,other.edges],DT);acc-=DT;}consumeEvents();
}else{acc=0;if(mode!=='guest')takeEdges();}
if(!game?.paused.some(Boolean))updateEffects(dt);if(game?.phase==='over'&&game.fighters.every(f=>f.hp>0||f.fall>=.85)&&$('result-panel').hidden)showResult();draw(dt);requestAnimationFrame(frame);}
requestAnimationFrame(frame);
// Optional browser agent interface uses the same visible actions.
const modelContext=document.modelContext;if(modelContext?.registerTool){const lifecycle=new AbortController();addEventListener('pagehide',()=>lifecycle.abort(),{once:true});for(const tool of [{name:'read_duel_state',description:'Read current Strichkampf mode, health and pause state.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:input=>{if(input&&Object.keys(input).length)throw Error('No arguments expected');return {mode,phase:game?.phase||'menu',health:game?.fighters.map(f=>f.hp)||[],paused:game?.paused||[]};}},{name:'start_solo_duel',description:'Start a new duel against the computer from the main menu.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(input&&Object.keys(input).length)throw Error('No arguments expected');if(mode!=='menu'||game)throw Error('Return to the main menu first');$('ai-btn').click();return {mode,phase:game.phase};}}])try{Promise.resolve(modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}
})();
