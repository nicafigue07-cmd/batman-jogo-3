/* WebGL 1 instancing with an ordinary draw fallback. Original code, MIT. */
(function(root){
class KaitoBatch {
  constructor(gl, vertex, fragment, fallbackProgram) {
    this.gl=gl;this.fallback=fallbackProgram;this.groups=new Map();
    this.stats={drawCalls:0,instances:0};this.enabled=false;
    if(root.KaitoBoot?.compatibility){this.reason='Modo de compatibilidade';return;}
    this.extension=gl.getExtension?.('ANGLE_instanced_arrays');
    if(!this.extension)return;
    let program;
    try {
      program=gl.createProgram();
      for(const [type,source] of [[gl.VERTEX_SHADER,'#define INSTANCED\n'+vertex],[gl.FRAGMENT_SHADER,fragment]]){
        const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
        if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));
        gl.attachShader(program,shader);gl.deleteShader(shader);
      }
      for(const [name,index] of [['p',0],['n',1],['iPos',2],['iSize',3],['iAngles',4],['iColor',5]])gl.bindAttribLocation(program,index,name);
      gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
      this.program=program;this.uniforms={};
      for(const name of ['vp','eye','time','water','daylight','horizon','quality','fogDistance'])this.uniforms[name]=gl.getUniformLocation(program,name);
      this.enabled=true;
    }catch(error){if(program)gl.deleteProgram(program);this.reason=String(error.message||error);root.KaitoBoot?.note('INSTANCING_FALLBACK',this.reason);}
  }
  begin(){this.stats.drawCalls=0;this.stats.instances=0;for(const group of this.groups.values())group.count=0;}
  submit(mesh,position,size,color,rotation,pitch,water){
    let group=this.groups.get(mesh);
    if(!group){group={mesh,water,count:0,capacity:128,data:new Float32Array(128*12),buffer:this.gl.createBuffer(),allocated:0};if(!group.buffer)throw Error('Memória gráfica insuficiente para agrupar objetos. Use o modo leve.');this.groups.set(mesh,group);}
    if(group.count===group.capacity){group.capacity*=2;const expanded=new Float32Array(group.capacity*12);expanded.set(group.data);group.data=expanded;}
    const i=group.count++*12,a=group.data;
    a[i]=position[0];a[i+1]=position[1];a[i+2]=position[2];
    a[i+3]=size[0];a[i+4]=size[1];a[i+5]=size[2];a[i+6]=rotation;a[i+7]=pitch;
    a[i+8]=color[0];a[i+9]=color[1];a[i+10]=color[2];a[i+11]=0;
    this.stats.instances++;
  }
  flush(frame){
    if(!this.enabled)return;
    const gl=this.gl,u=this.uniforms,extension=this.extension;
    gl.useProgram(this.program);gl.uniformMatrix4fv(u.vp,false,frame.vp);gl.uniform3fv(u.eye,frame.eye);
    gl.uniform1f(u.time,frame.time);gl.uniform1f(u.daylight,frame.daylight);gl.uniform3fv(u.horizon,frame.horizon);
    gl.uniform1f(u.quality,frame.quality);gl.uniform1f(u.fogDistance,frame.distance);
    for(let i=0;i<6;i++)gl.enableVertexAttribArray(i);
    for(const group of this.groups.values()){
      if(!group.count)continue;
      gl.bindBuffer(gl.ARRAY_BUFFER,group.mesh.b);
      gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);gl.vertexAttribPointer(1,3,gl.FLOAT,false,0,group.mesh.offset);
      gl.bindBuffer(gl.ARRAY_BUFFER,group.buffer);
      if(group.allocated!==group.data.byteLength){gl.bufferData(gl.ARRAY_BUFFER,group.data.byteLength,gl.DYNAMIC_DRAW);group.allocated=group.data.byteLength;}
      gl.bufferSubData(gl.ARRAY_BUFFER,0,group.data.subarray(0,group.count*12));
      for(const [index,size,offset] of [[2,3,0],[3,3,12],[4,2,24],[5,3,32]]){gl.vertexAttribPointer(index,size,gl.FLOAT,false,48,offset);extension.vertexAttribDivisorANGLE(index,1);}
      gl.uniform1f(u.water,group.water);
      extension.drawArraysInstancedANGLE(gl.TRIANGLES,0,group.mesh.count,group.count);this.stats.drawCalls++;
    }
    for(let i=2;i<6;i++){extension.vertexAttribDivisorANGLE(i,0);gl.disableVertexAttribArray(i);}
    gl.useProgram(this.fallback);
  }
}
root.KaitoBatch=KaitoBatch;
if(typeof module!=='undefined')module.exports=KaitoBatch;
})(typeof window!=='undefined'?window:globalThis);
