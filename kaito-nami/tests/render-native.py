"""Render recorded game WebGL commands with native software EGL, not a browser test."""
import ctypes as C, importlib.util, json, sys
from pathlib import Path
from PIL import Image
frame_path=Path(sys.argv[1]);output=Path(sys.argv[2]);data=json.loads(frame_path.read_text())
saved_argv=sys.argv;sys.argv=[str(Path(__file__).with_name('shader-egl.py'))]
spec=importlib.util.spec_from_file_location('egl',Path(__file__).with_name('shader-egl.py'));api=importlib.util.module_from_spec(spec);spec.loader.exec_module(api);sys.argv=saved_argv
W,H=data['width'],data['height'];I,U,P=api.I,api.U,api.ptr
surface=api.E.eglCreatePbufferSurface(api.D,api.config,(I*5)(0x3057,W,0x3056,H,0x3038));assert surface and api.E.eglMakeCurrent(api.D,surface,surface,api.context)
program=api.newprogram()
for name,kind in [('vertex',0x8B31),('fragment',0x8B30)]:
 source=C.c_char_p((('#define INSTANCED\n' if data.get('instanced') and name=='vertex' else '')+data[name]).encode());shader=api.create(kind);api.source(shader,1,C.byref(source),None);api.compile(shader);ok=I();api.status(shader,0x8B81,C.byref(ok));assert ok.value;api.attach(program,shader)
api.f('glBindAttribLocation',None,U,U,C.c_char_p)(program,0,b'p');api.f('glBindAttribLocation',None,U,U,C.c_char_p)(program,1,b'n');
for name,index in [('iPos',2),('iSize',3),('iAngles',4),('iColor',5)]:api.f('glBindAttribLocation',None,U,U,C.c_char_p)(program,index,name.encode())
api.link(program);ok=I();api.programstatus(program,0x8B82,C.byref(ok));assert ok.value
api.f('glUseProgram',None,U)(program);api.f('glViewport',None,I,I,I,I)(0,0,W,H);api.f('glClearColor',None,C.c_float,C.c_float,C.c_float,C.c_float)(*data['background']);api.f('glClear',None,U)(16384|256);api.f('glEnable',None,U)(2929)
gen=api.f('glGenBuffers',None,I,C.POINTER(U));bind=api.f('glBindBuffer',None,U,U);upload=api.f('glBufferData',None,U,C.c_ssize_t,P,U);pointer=api.f('glVertexAttribPointer',None,U,I,U,U,I,P);enable=api.f('glEnableVertexAttribArray',None,U)
buffers={}
for record in data['buffers']:
 b=U();gen(1,C.byref(b));bind(34962,b);values=(C.c_float*len(record['data']))(*record['data']);upload(34962,C.sizeof(values),values,35044);buffers[record['id']]=b
locations={};loc=api.f('glGetUniformLocation',I,U,C.c_char_p);uniform1=api.f('glUniform1f',None,I,C.c_float);uniform3=api.f('glUniform3fv',None,I,I,P);matrix=api.f('glUniformMatrix4fv',None,I,I,U,P);draw=api.f('glDrawArrays',None,U,I,I)
for call in data['calls']:
 for key,value in call['uniforms'].items():
  if key not in locations:locations[key]=loc(program,key.encode())
  where=locations[key]
  if isinstance(value,list):
   values=(C.c_float*len(value))(*value)
   if len(value)==16:matrix(where,1,0,values)
   else:uniform3(where,1,values)
  else:uniform1(where,value)
 for key,attribute in call['attributes'].items():
  index=int(key);
  if data.get('instanced'):api.f('glVertexAttribDivisor',None,U,U)(index,call.get('divisors',{}).get(key,0))
  bind(34962,buffers[attribute['buffer']]);enable(index);pointer(index,attribute['size'],5126,0,attribute['stride'],P(attribute['offset']))
 if data.get('instanced'):api.f('glDrawArraysInstanced',None,U,I,I,I)(call['mode'],call['start'],call['count'],call['instances'])
 else:draw(call['mode'],call['start'],call['count'])
api.f('glFinish',None)();assert api.f('glGetError',U)()==0
pixels=(C.c_ubyte*(W*H*4))();api.f('glReadPixels',None,I,I,I,I,U,U,P)(0,0,W,H,6408,5121,pixels);image=Image.frombytes('RGBA',(W,H),bytes(pixels)).transpose(Image.Transpose.FLIP_TOP_BOTTOM);assert len(image.convert('RGB').getcolors(W*H))>30;image.save(output);print('Native EGL frame rendered:',output)
