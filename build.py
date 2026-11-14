#!/usr/bin/env python3
"""Builds index.html, the whole game in one self-contained file, from the pieces in src/.
Run:  python3 build.py
"""
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')

def rd(name):
    with open(os.path.join(SRC, name), encoding='utf-8') as f:
        return f.read()

# the rocket editor + flight mode live in their own closure inside the UI script
flight = ('var FLT={on:false,vab:false},_rt=null,_rb=null;function recordTest(F,i,f){if(_rt)_rt(F,i,f);}function recordBurn(b){if(_rb)_rb(b);}\n(()=>{\n'
          + ''.join(rd(n) + '\n' for n in ['parts.js', 'orbit.js', 'world.js', 'vab.js', 'flight.js', 'autopilot.js', 'demo.js', 'map.js', 'lib.js', 'tut.js'])
          + '})();\n')
# sound + goals sit in the UI closure (so the test stand can use them) just before the flight bundle (so flight can too)
ui = rd('ui.js').replace('/*FLIGHT*/', rd('juice.js') + '\n' + flight)
# the display font (Rajdhani, SIL Open Font License), embedded so the game still works offline in one file
import base64
fonts = ''.join("@font-face{font-family:'Rajdhani';font-weight:%s;font-display:swap;src:url(data:font/woff2;base64,%s) format('woff2')}\n"
                % (w, base64.b64encode(open(os.path.join(SRC, 'fonts', 'rajdhani-latin-%s-normal.woff2' % w), 'rb').read()).decode())
                for w in ('400', '600'))
html = (rd('shell.html').replace('/*FONTS*/', fonts).replace('/*CORE*/', rd('core.js')).replace('/*GLUE*/', rd('glue.js'))
        .replace('/*GASES_VIEWS*/', rd('gv.js')).replace('/*UI*/', ui))
with open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8') as f:
    f.write(html)
print('built index.html (%d KB)' % (len(html.encode('utf-8')) // 1024))
