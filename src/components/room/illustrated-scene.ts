import { lightingAt } from '../home/illustration/daylight';
import { lampStrength, type LampMode } from '../home/illustration/preferences';
import { SPRITES, SPRITE_ANCHORS, type GirlFrame } from './activity';

const vertex = `attribute vec2 position;varying vec2 uv;void main(){uv=vec2((position.x+1.)*.5,(1.-position.y)*.5);gl_Position=vec4(position,0.,1.);}`;
const fragment = `precision highp float;
varying vec2 uv;uniform sampler2D backgroundMap,normalMap,characterMap,alphaMap,foregroundMap;
uniform vec3 lightDirection,lightColor,ambientColor;uniform float strength,lamp,flip;
uniform vec4 spriteRect,actorRect;
vec3 illuminate(vec3 c,vec3 n,vec2 p){
 float windowShade=mix(.65,1.,smoothstep(.18,.72,p.x+(lightDirection.x*.12)));
 float diffuse=max(0.,dot(normalize(n),normalize(lightDirection)));
 float pool=exp(-dot((p-vec2(.91,.40))*vec2(2.8,2.),(p-vec2(.91,.40))*vec2(2.8,2.))*4.);
 vec3 lit=c*(ambientColor+lightColor*strength*diffuse*windowShade+vec3(1.,.62,.3)*lamp*pool*.95);
 return lit/(1.+lit*.3);
}
void main(){
 vec3 base=texture2D(backgroundMap,uv).rgb;
 vec3 normal=mix(vec3(0.,0.,1.),texture2D(normalMap,uv).rgb*2.-1.,.72);
 vec3 color=illuminate(base,normal,uv);
 vec2 q=(uv-actorRect.xy)/actorRect.zw;
 // A subtle contact shadow pins the feet to the floor.
 float shadow=exp(-pow((uv.x-(actorRect.x+actorRect.z*.5))/.037,2.)-pow((uv.y-(actorRect.y+actorRect.w*.967))/.008,2.))*.19;
 color*=1.-shadow;
 if(q.x>=0.&&q.x<=1.&&q.y>=0.&&q.y<=1.){
   if(flip>.5)q.x=1.-q.x;
   vec2 atlas=spriteRect.xy+q*spriteRect.zw;
   float a=smoothstep(.45,.85,texture2D(alphaMap,atlas).r);
   // Slightly inset the matte to suppress colored checkerboard fringes.
   a=min(a,smoothstep(.45,.85,texture2D(alphaMap,atlas+vec2(.00065,0.)).r));
   a=min(a,smoothstep(.45,.85,texture2D(alphaMap,atlas-vec2(.00065,0.)).r));
   vec3 person=illuminate(texture2D(characterMap,atlas).rgb,vec3((q.x-.5)*.45,.12,1.),uv);
   color=mix(color,person,a);
 }
 float front=smoothstep(.2,.8,texture2D(foregroundMap,uv).r);
 color=mix(color,illuminate(base,normal,uv),front);
 gl_FragColor=vec4(color,1.);
}`;

export async function createIllustratedRoom(
  canvas: HTMLCanvasElement,
  signal: AbortSignal,
) {
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    powerPreference: 'low-power',
  });
  if (!gl) throw new Error('WebGL unavailable');
  const textures: WebGLTexture[] = [],
    shaders: WebGLShader[] = [];
  const program = gl.createProgram()!,
    buffer = gl.createBuffer()!;
  const dispose = () => {
    textures.forEach((t) => gl.deleteTexture(t));
    shaders.forEach((s) => gl.deleteShader(s));
    gl.deleteProgram(program);
    gl.deleteBuffer(buffer);
  };
  try {
    const sources = await Promise.all(
      ['background', 'normal', 'character', 'alpha', 'foreground'].map(
        (name) =>
          new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            const clean = () => {
              img.onload = null;
              img.onerror = null;
              signal.removeEventListener('abort', abort);
            };
            const abort = () => {
              clean();
              img.src = '';
              reject(new DOMException('Aborted', 'AbortError'));
            };
            img.onload = () => {
              clean();
              resolve(img);
            };
            img.onerror = () => {
              clean();
              reject(new Error(`Room art unavailable: ${name}`));
            };
            signal.addEventListener('abort', abort, { once: true });
            if (signal.aborted) abort();
            else img.src = `/art/room/${name}.webp`;
          }),
      ),
    );
    signal.throwIfAborted();
    for (const [type, source] of [
      [gl.VERTEX_SHADER, vertex],
      [gl.FRAGMENT_SHADER, fragment],
    ] as const) {
      const shader = gl.createShader(type)!;
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(shader) ?? 'shader');
      gl.attachShader(program, shader);
    }
    gl.bindAttribLocation(program, 0, 'position');
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error('Room shader link failed');
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const names = [
      'backgroundMap',
      'normalMap',
      'characterMap',
      'alphaMap',
      'foregroundMap',
    ];
    sources.forEach((img, i) => {
      const t = gl.createTexture()!;
      textures.push(t);
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.uniform1i(gl.getUniformLocation(program, names[i]!), i);
    });
    const u = Object.fromEntries(
      [
        'lightDirection',
        'lightColor',
        'ambientColor',
        'strength',
        'lamp',
        'flip',
        'spriteRect',
        'actorRect',
      ].map((n) => [n, gl.getUniformLocation(program, n)]),
    );
    return {
      dispose,
      draw(minutes: number, lampMode: LampMode, girl: GirlFrame) {
        if (signal.aborted || gl.isContextLost()) return;
        const box = canvas.getBoundingClientRect(),
          ratio = Math.min(
            devicePixelRatio || 1,
            1.5,
            1920 / Math.max(1, box.width),
          );
        const w = Math.max(1, Math.round(box.width * ratio)),
          h = Math.max(1, Math.round(box.height * ratio));
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
          gl.viewport(0, 0, w, h);
        }
        const light = lightingAt(minutes),
          frame = SPRITES[girl.frame]!;
        const height = 0.5,
          width = (height * (frame[2] / frame[3])) / 1.5;
        const anchor = (SPRITE_ANCHORS[girl.frame]! - frame[0]) / frame[2];
        gl.uniform4f(
          u.spriteRect!,
          frame[0] / 1536,
          frame[1] / 1024,
          frame[2] / 1536,
          frame[3] / 1024,
        );
        gl.uniform4f(
          u.actorRect!,
          girl.x - width * (girl.flip ? 1 - anchor : anchor),
          girl.y - height * 0.967,
          width,
          height,
        );
        gl.uniform1f(u.flip!, girl.flip ? 1 : 0);
        gl.uniform3fv(u.lightDirection!, light.direction);
        gl.uniform3fv(u.lightColor!, light.color);
        gl.uniform3fv(u.ambientColor!, light.ambient);
        gl.uniform1f(u.strength!, light.strength);
        gl.uniform1f(u.lamp!, lampStrength(lampMode, light.lamp));
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      },
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
