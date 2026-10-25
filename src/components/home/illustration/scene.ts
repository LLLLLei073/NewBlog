import { imageCrop, lightingAt } from './daylight';
import { vertexShader, fragmentShader } from './shaders';
import { lampStrength, type LampMode } from './preferences';

export interface StudyScene {
  draw: (
    minutes: number,
    elapsed: number,
    motion: boolean,
    lamp?: LampMode,
  ) => void;
  dispose: () => void;
}

export async function createStudyScene(
  canvas: HTMLCanvasElement,
  signal: AbortSignal,
): Promise<StudyScene> {
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    powerPreference: 'low-power',
  });
  if (!gl) throw new Error('WebGL unavailable');
  const textures: WebGLTexture[] = [];
  const shaders: WebGLShader[] = [];
  let buffer: WebGLBuffer | null = null;
  let program: WebGLProgram | null = null;
  const dispose = () => {
    textures.forEach((texture) => gl.deleteTexture(texture));
    shaders.forEach((shader) => gl.deleteShader(shader));
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
  };
  const image = (url: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      const cleanup = () => {
        signal.removeEventListener('abort', abort);
        img.onload = null;
        img.onerror = null;
      };
      const abort = () => {
        cleanup();
        img.src = '';
        reject(new DOMException('Aborted', 'AbortError'));
      };
      img.onload = () => {
        cleanup();
        resolve(img);
      };
      img.onerror = () => {
        cleanup();
        reject(new Error(`Artwork unavailable: ${url}`));
      };
      signal.addEventListener('abort', abort, { once: true });
      if (signal.aborted) abort();
      else img.src = url;
    });
  try {
    const sources = await Promise.all(
      ['base.webp', 'normal.webp', 'motion.svg', 'closed.webp'].map((name) =>
        image(`/art/study/${name}`),
      ),
    );
    signal.throwIfAborted();
    for (const [kind, source] of [
      [gl.VERTEX_SHADER, vertexShader],
      [gl.FRAGMENT_SHADER, fragmentShader],
    ] as const) {
      const shader = gl.createShader(kind)!;
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(shader) ?? 'Shader compile failed');
    }
    program = gl.createProgram()!;
    shaders.forEach((shader) => gl.attachShader(program!, shader));
    gl.bindAttribLocation(program, 0, 'position');
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error(gl.getProgramInfoLog(program) ?? 'Shader link failed');
    gl.useProgram(program);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    for (let i = 0; i < sources.length; i++) {
      const texture = gl.createTexture()!;
      textures.push(texture);
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        sources[i]!,
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    const names = [
      'baseMap',
      'normalMap',
      'motionMap',
      'eyelidMap',
      'cropScale',
      'cropOffset',
      'lightDirection',
      'lightColor',
      'ambientColor',
      'lightStrength',
      'lampStrength',
      'elapsed',
      'blink',
      'motion',
    ] as const;
    const uniform = Object.fromEntries(
      names.map((name) => [name, gl.getUniformLocation(program!, name)]),
    ) as Record<(typeof names)[number], WebGLUniformLocation | null>;
    ['baseMap', 'normalMap', 'motionMap', 'eyelidMap'].forEach((name, i) =>
      gl.uniform1i(uniform[name as keyof typeof uniform], i),
    );
    return {
      dispose,
      draw(minutes, elapsed, motion, lamp = 'auto') {
        if (signal.aborted || gl.isContextLost()) return;
        const bounds = canvas.getBoundingClientRect();
        const ratio = Math.min(
          window.devicePixelRatio || 1,
          1.5,
          1920 / Math.max(bounds.width, bounds.height),
        );
        const width = Math.max(1, Math.round(bounds.width * ratio));
        const height = Math.max(1, Math.round(bounds.height * ratio));
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
          gl.viewport(0, 0, width, height);
        }
        const crop = imageCrop(
          bounds.width,
          bounds.height,
          sources[0]!.naturalWidth,
          sources[0]!.naturalHeight,
        );
        const light = lightingAt(minutes);
        const phase = elapsed % 5.7;
        const blink =
          motion && phase < 0.24 ? Math.sin((phase / 0.24) * Math.PI) : 0;
        gl.uniform2fv(uniform.cropScale, crop.scale);
        gl.uniform2fv(uniform.cropOffset, crop.offset);
        gl.uniform3fv(uniform.lightDirection, light.direction);
        gl.uniform3fv(uniform.lightColor, light.color);
        gl.uniform3fv(uniform.ambientColor, light.ambient);
        gl.uniform1f(uniform.lightStrength, light.strength);
        gl.uniform1f(uniform.lampStrength, lampStrength(lamp, light.lamp));
        gl.uniform1f(uniform.elapsed, elapsed);
        gl.uniform1f(uniform.blink, blink);
        gl.uniform1f(uniform.motion, motion ? 1 : 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      },
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
