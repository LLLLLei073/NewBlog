export const vertexShader = `
attribute vec2 position;
varying vec2 screenUV;
void main() {
  screenUV = vec2(position.x * .5 + .5, .5 - position.y * .5);
  gl_Position = vec4(position, 0., 1.);
}`;

// All maps use top-left origin in the original 1536 × 1024 artwork.
// The aligned generated normal and closed-eye layers share the base image's UVs.
// Closed frames are blended only inside the two original eye regions.
export const fragmentShader = `
precision mediump float;
varying vec2 screenUV;
uniform sampler2D baseMap;
uniform sampler2D normalMap;
uniform sampler2D motionMap;
uniform sampler2D eyelidMap;
uniform vec2 cropScale;
uniform vec2 cropOffset;
uniform vec3 lightDirection;
uniform vec3 lightColor;
uniform vec3 ambientColor;
uniform float lightStrength;
uniform float lampStrength;
uniform float elapsed;
uniform float blink;
uniform float motion;

float ellipse(vec2 uv, vec2 center, vec2 radius) {
  return 1. - smoothstep(.72, 1., length((uv - center) / radius));
}
void main() {
  vec2 uv = screenUV * cropScale + cropOffset;
  vec3 regions = texture2D(motionMap, uv).rgb;
  // Small displacement of the sweater and hair ends, never the supporting hand.
  uv.y += sin(elapsed * 1.25) * .0013 * regions.g;
  uv.x += sin(elapsed * 1.65 + uv.y * 16.) * .0018 * regions.r;
  vec3 base = texture2D(baseMap, uv).rgb;
  float eye = max(ellipse(uv,vec2(.7363,.3506),vec2(.019,.022)),ellipse(uv,vec2(.7812,.3691),vec2(.017,.020)));
  base = mix(base,texture2D(eyelidMap,uv).rgb, eye * blink);

  vec3 mappedNormal = texture2D(normalMap, uv).rgb;
  // The normal map depicts open eyes. Smooth those small regions on a blink,
  // otherwise its iris relief can remain visible on top of the closed texture.
  mappedNormal = mix(mappedNormal,texture2D(normalMap,uv+vec2(0.,.025)).rgb,eye*blink);
  vec3 n = normalize(mix(vec3(0.,0.,1.),mappedNormal * 2. - 1.,.75));
  float diffuse = dot(n, normalize(lightDirection));
  float cel = mix(.2, 1., smoothstep(.14,.5,diffuse));
  // A broad window-mullion shadow changes with the sun on interior surfaces.
  float windowShadow = .9 + .1 * smoothstep(.0,.12,abs(sin(uv.x * 23. + uv.y * 3. + lightDirection.x * 2.)));
  vec3 lit = base * (ambientColor + lightColor * lightStrength * cel * windowShadow);

  // A fixed lamp at the artwork's right, falling locally across face and desk.
  vec2 delta = (uv - vec2(.934,.439)) * vec2(1.5,1.);
  float pool = exp(-dot(delta, delta) * 12.);
  vec3 lampDirection = normalize(vec3(.934-uv.x, uv.y-.439, .28));
  float lampDiffuse = .18 + .82 * max(0.,dot(n,lampDirection));
  lit += base * vec3(1.,.70,.36) * pool * lampStrength * lampDiffuse * 1.2;
  float bulb = ellipse(uv, vec2(.944,.437), vec2(.037,.018));
  lit += vec3(1.,.67,.28) * bulb * lampStrength * .38;
  // Few diffuse motes in the window light; no separate particle engine.
  float dust = 0.;
  for (int i=0; i<12; i++) {
    float fi = float(i);
    vec2 p = vec2(fract(fi*.618 + elapsed*.003), fract(fi*.381 - elapsed*.007));
    p.x = .34 + p.x*.59;
    float d = length((uv-p) * vec2(1.5,1.));
    dust += (1.-smoothstep(.0008,.0028,d)) * (.4+.6*sin(fi+elapsed*.5)*sin(fi+elapsed*.5));
  }
  lit += vec3(.9,.78,.51) * dust * .18 * motion;
  // Gentle highlight compression retains skin detail under sun + lamp overlap.
  gl_FragColor = vec4(clamp(lit / (1. + lit * .3), 0., 1.), 1.);
}`;
