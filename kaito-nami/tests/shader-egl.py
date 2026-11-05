import ctypes as C,re,sys
from pathlib import Path
E=C.CDLL('libEGL.so.1');ptr=C.c_void_p;I=C.c_int;U=C.c_uint
for name,restype,args in [('eglGetPlatformDisplay',ptr,[U,ptr,ptr]),('eglInitialize',U,[ptr,C.POINTER(I),C.POINTER(I)]),('eglBindAPI',U,[U]),('eglChooseConfig',U,[ptr,C.POINTER(I),C.POINTER(ptr),I,C.POINTER(I)]),('eglCreateContext',ptr,[ptr,ptr,ptr,C.POINTER(I)]),('eglCreatePbufferSurface',ptr,[ptr,ptr,C.POINTER(I)]),('eglMakeCurrent',U,[ptr,ptr,ptr,ptr]),('eglGetProcAddress',ptr,[C.c_char_p])]:
 f=getattr(E,name);f.restype=restype;f.argtypes=args
D=E.eglGetPlatformDisplay(0x31DD,None,None);a=I();b=I()
assert E.eglInitialize(D,C.byref(a),C.byref(b)), 'EGL initialization unavailable'
assert E.eglBindAPI(0x30A0)
attrs=(I*13)(0x3040,4,0x3033,1,0x3024,8,0x3023,8,0x3022,8,0x3025,24,0x3038);config=ptr();num=I()
assert E.eglChooseConfig(D,attrs,C.byref(config),1,C.byref(num)) and num.value
context=E.eglCreateContext(D,config,None,(I*3)(0x3098,2,0x3038));surface=E.eglCreatePbufferSurface(D,config,(I*5)(0x3057,1,0x3056,1,0x3038))
assert context and surface and E.eglMakeCurrent(D,surface,surface,context)
def f(name,result,*args):
 address=E.eglGetProcAddress(name.encode());assert address,name
 return C.CFUNCTYPE(result,*args)(address)
create=f('glCreateShader',U,U);source=f('glShaderSource',None,U,I,C.POINTER(C.c_char_p),ptr);compile=f('glCompileShader',None,U);status=f('glGetShaderiv',None,U,U,C.POINTER(I));log=f('glGetShaderInfoLog',None,U,I,ptr,ptr)
newprogram=f('glCreateProgram',U);attach=f('glAttachShader',None,U,U);link=f('glLinkProgram',None,U);programstatus=f('glGetProgramiv',None,U,U,C.POINTER(I));programlog=f('glGetProgramInfoLog',None,U,I,ptr,ptr)
args=[a for a in sys.argv[1:] if not a.startswith('--')];safe='--safe' in sys.argv
s=Path(args[0] if args else str(Path(__file__).resolve().parents[1]/'src'/'game.js')).read_text()
for variant in ([''] if safe else ['', '#define INSTANCED\n']):
 program=newprogram()
 for name,kind in [('vertex',0x8B31),('fragment',0x8B30)]:
  source_name='safeFragment' if safe and name=='fragment' else name
  text=((variant if name=='vertex' else '')+re.search(r'const '+source_name+r'=`([^`]+)`',s).group(1)).encode();shader=create(kind);raw=C.c_char_p(text);source(shader,1,C.byref(raw),None);compile(shader);ok=I();status(shader,0x8B81,C.byref(ok));buf=C.create_string_buffer(4096);log(shader,4096,None,buf);print('INSTANCED' if variant else 'FALLBACK',name,'COMPILE',bool(ok.value),buf.value.decode());assert ok.value
  attach(program,shader)
 link(program);ok=I();programstatus(program,0x8B82,C.byref(ok));buf=C.create_string_buffer(4096);programlog(program,4096,None,buf);print('PROGRAM LINK',bool(ok.value),buf.value.decode());assert ok.value
