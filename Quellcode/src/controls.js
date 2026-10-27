'use strict';
// Input schemes produce the same actions; rules and networking stay independent.
const ControlMap=(()=>{
 function classic(raw,pressed,face=1){
  const input=Combat.blank(),edge=Combat.blank();
  const forward=face===1?raw.right:raw.left,back=face===1?raw.left:raw.right;
  const toward=face===1?'right':'left';
  if(raw.action||pressed){
   if(raw.up&&forward){input.up=true;input.kick=true;if(pressed){edge.up=true;edge.kick=true;}}
   else if(raw.up){input[toward]=true;input.kick=true;if(pressed)edge.kick=true;}
   else if(raw.down){input.down=true;if(forward||back){input.kick=true;if(pressed)edge.kick=true;}else{input.punch=true;if(pressed)edge.punch=true;}}
   else if(back){input.kick=true;if(pressed)edge.kick=true;}
   else{input.punch=true;if(forward)input[toward]=true;if(pressed)edge.punch=true;}
  }else if(back&&(raw.up||raw.down)){
   input.block=true;input.down=!!raw.down;
  }else{input.left=!!raw.left;input.right=!!raw.right;input.down=!!raw.down;input.up=!!raw.up;}
  // Touch has a direct block helper; specials remain available in the life mode.
  if(raw.block){input.block=true;input.down=!!raw.down;edge.punch=edge.kick=edge.up=false;}
  input.combo=!!raw.combo;
  return {input,edge};
 }
 return {classic};
})();
