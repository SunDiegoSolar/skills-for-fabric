import { lookAt, multiply, perspective, applyWarp } from "./math.js";

const VERT = `#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec2 aUv;
layout(location = 2) in vec2 aDest;
uniform mat4 uMvp;
uniform int uMode;
uniform vec2 uPan;
out vec2 vUv;
void main() {
  vUv = aUv + uPan;
  if (uMode == 0) {
    gl_Position = uMvp * vec4(aPos, 1.0);
  } else {
    gl_Position = vec4(aDest, 0.0, 1.0);
  }
}
`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uMedia;
uniform sampler2D uMask;
uniform vec2 uMaskSize;
uniform int uHasMedia;
uniform int uOmitBlack;
uniform int uInvertMask;
uniform float uThreshold;
uniform float uBlackLevel;
uniform vec3 uTint;
uniform int uSelected;
uniform int uWire;
uniform int uInvertCh;
uniform int uFlip;
uniform int uFlop;
out vec4 frag;
void main() {
  vec2 uv = fract(vUv);
  if (uFlip == 1) uv.x = 1.0 - uv.x;
  if (uFlop == 1) uv.y = 1.0 - uv.y;
  vec4 color = uHasMedia == 1 ? texture(uMedia, uv) : vec4(uTint, 1.0);
  if (uInvertCh == 1) color.rgb = color.bgr;
  float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  if (uOmitBlack == 1 && luma < uThreshold) discard;
  if (uOmitBlack == 2 && luma >= uThreshold) discard;
  vec2 maskUv = gl_FragCoord.xy / uMaskSize;
  float m = texture(uMask, maskUv).r;
  bool hole = m < 0.5;
  if (uInvertMask == 1) hole = !hole;
  if (hole) discard;
  color.rgb = color.rgb * (1.0 - uBlackLevel) + uBlackLevel;
  if (uSelected == 1) color.rgb = mix(color.rgb, vec3(0.91, 0.75, 0.48), 0.22);
  if (uWire == 1) color = vec4(0.91, 0.75, 0.48, 1.0);
  frag = color;
}
`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(sh));
  }
  return sh;
}

function faceVerts(face, warp, outputMode) {
  const data = [];
  const tris = face.tris || [];
  for (const tri of tris) {
    for (const c of tri) {
      const t = c.t || [0, 0];
      let d = c.dest || [t[0] * 2 - 1, t[1] * 2 - 1];
      if (outputMode) d = applyWarp(warp, d[0], d[1]);
      const v = c.v;
      data.push(v[0], v[1], v[2], t[0], t[1], d[0], d[1]);
    }
  }
  return new Float32Array(data);
}

export function createRenderer(canvas) {
  const gl = canvas.getContext("webgl2", { antialias: true, premultipliedAlpha: false });
  if (!gl) throw new Error("WebGL2 is required");
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.bindAttribLocation(prog, 0, "aPos");
  gl.bindAttribLocation(prog, 1, "aUv");
  gl.bindAttribLocation(prog, 2, "aDest");
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));

  const loc = (name) => gl.getUniformLocation(prog, name);
  const buf = gl.createBuffer();
  const mediaTex = gl.createTexture();
  const maskTex = gl.createTexture();
  for (const tex of [mediaTex, maskTex]) {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([40, 42, 50, 255]));
  }

  function setTexture(tex, source) {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  }

  function whiteMask() {
    const data = new Uint8Array(4).fill(255);
    gl.bindTexture(gl.TEXTURE_2D, maskTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  }
  whiteMask();

  function draw(state) {
    const { mesh, warp, camera, mode, selectedFace, media, maskCanvas, flags } = state;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.043, 0.047, 0.063, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (mode === "geometry") gl.enable(gl.DEPTH_TEST);
    else gl.disable(gl.DEPTH_TEST);
    gl.useProgram(prog);

    const eye = [
      Math.cos(camera.yaw) * Math.cos(camera.pitch) * camera.dist,
      Math.sin(camera.pitch) * camera.dist,
      Math.sin(camera.yaw) * Math.cos(camera.pitch) * camera.dist,
    ];
    const mvp = multiply(
      perspective(45, canvas.width / Math.max(1, canvas.height), 0.05, 40),
      lookAt(eye, [0, 0, 0], [0, 1, 0]),
    );
    gl.uniformMatrix4fv(loc("uMvp"), false, mvp);
    gl.uniform1i(loc("uMode"), mode === "geometry" ? 0 : 1);
    gl.uniform1i(loc("uOmitBlack"), flags.omitBlack);
    gl.uniform1i(loc("uInvertMask"), flags.invertMask ? 1 : 0);
    gl.uniform1f(loc("uThreshold"), flags.threshold);
    gl.uniform1f(loc("uBlackLevel"), flags.blackLevel);
    gl.uniform1i(loc("uInvertCh"), flags.invertChannels ? 1 : 0);
    gl.uniform1i(loc("uFlip"), flags.flip ? 1 : 0);
    gl.uniform1i(loc("uFlop"), flags.flop ? 1 : 0);
    gl.uniform2f(loc("uMaskSize"), canvas.width, canvas.height);
    gl.uniform1i(loc("uWire"), 0);

    gl.activeTexture(gl.TEXTURE1);
    if (maskCanvas) setTexture(maskTex, maskCanvas);
    gl.bindTexture(gl.TEXTURE_2D, maskTex);
    gl.uniform1i(loc("uMask"), 1);

    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    const stride = 28;
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 12);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, stride, 20);

    let boundMedia = null;
    const outputMode = mode !== "geometry";
    for (const face of mesh.faces) {
      if (face.omit && !flags.invertFaces) continue;
      if (!face.omit && flags.invertFaces) continue;
      const source = face.media || media;
      gl.uniform1i(loc("uHasMedia"), source ? 1 : 0);
      if (source && source !== boundMedia) {
        gl.activeTexture(gl.TEXTURE0);
        setTexture(mediaTex, source);
        gl.uniform1i(loc("uMedia"), 0);
        boundMedia = source;
      }
      gl.uniform2f(loc("uPan"), face.anim.u, face.anim.v);
      gl.uniform1i(loc("uSelected"), face.id === selectedFace ? 1 : 0);
      const tint = face.id === selectedFace ? [0.91, 0.75, 0.48] : [0.22, 0.28, 0.36];
      gl.uniform3fv(loc("uTint"), tint);
      const data = faceVerts(face, warp, outputMode);
      if (!data.length) continue;
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
      gl.drawArrays(gl.TRIANGLES, 0, data.length / 7);
      if (flags.showGrid !== false) {
        gl.uniform1i(loc("uWire"), 1);
        const outline = [];
        for (let idx = 0; idx < face.verts.length; idx += 1) {
          const p = face.verts[idx];
          const t = face.uvs[idx] || [0, 0];
          let d = face.dest[idx] || [t[0] * 2 - 1, t[1] * 2 - 1];
          if (outputMode) d = applyWarp(warp, d[0], d[1]);
          outline.push(p[0], p[1], p[2], t[0], t[1], d[0], d[1]);
        }
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(outline), gl.DYNAMIC_DRAW);
        gl.drawArrays(gl.LINE_LOOP, 0, face.verts.length);
        gl.uniform1i(loc("uWire"), 0);
      }
    }
  }

  return { gl, draw, canvas };
}
