from pathlib import Path
import re
root=Path(__file__).parent
(root/'dist').mkdir(exist_ok=True)
shell=(root/'src/shell.html').read_text()
parts=[]
for path in ['src/peerjs.min.js','src/engine.js','src/rig.js','src/controls.js','src/ai.js','src/progress.js','src/audio.js','src/game.js']:
 code=(root/path).read_text()
 if path.endswith('peerjs.min.js'):
  code='/*!\n'+(root/'src/PEERJS-LICENSE.txt').read_text()+'\n*/\n'+code
 code=re.sub(r'//# sourceMappingURL=.*','',code)
 code=code.replace('</script','<\\/script')
 parts.append('<script>\n'+code+'\n</script>')
html=shell.replace('<!--SCRIPTS-->','\n'.join(parts))
(root/'dist/index.html').write_text(html)
(root/'dist/Strichkampf.html').write_text(html)
print('Built',len(html.encode()),'bytes')
