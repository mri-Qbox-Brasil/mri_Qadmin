// =============================================================================
// fivem-renderer.js - Raw WebGL Game Capture (screencapture-main method)
// =============================================================================

// ─── Config ──────────────────────────────────────────────────────────────────
const MAX_FPS = 45;           // Max stream framerate — easy to adjust
const DEBUG_OVERLAY = false;    // Set true to show the diagnostic overlay window

// ─── Shaders ─────────────────────────────────────────────────────────────────
const VERT = `
  attribute vec2 a_position;
  attribute vec2 a_texcoord;
  varying vec2 textureCoordinate;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    textureCoordinate = a_texcoord;
  }
`;

const FRAG = `
  varying highp vec2 textureCoordinate;
  uniform sampler2D external_texture;
  void main() {
    gl_FragColor = texture2D(external_texture, textureCoordinate);
  }
`;

function makeShader(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    const log = gl.getShaderInfoLog(s);
    if (log) console.error('[GameRender] Shader error:', log);
    return s;
}

// ─── GameRender Singleton ─────────────────────────────────────────────────────
class GameRender {
    constructor() {
        this.gl = null;
        this.glCanvas = null;
        this.isRunning = false;
        this.frameCount = 0;
        this.fps = -1;    // -1 = not yet measured; getFps() returns null until first full second
        this._fpsTimer = Date.now();
        this._lastFrame = 0;
        this._frameInterval = 1000 / MAX_FPS;
        this._overlayEl = null;

        this._loop = this._loop.bind(this);
    }

    // ── Public: getters ──────────────────────────────────────────────────────

    // Returns null before first full second of measurement
    getFps() { return this.fps >= 0 ? this.fps : null; }

    // ── Public: lifecycle ────────────────────────────────────────────────────

    init() {
        if (this.gl) return;
        console.log('[GameRender] Initializing raw WebGL capture (screencapture-main method)...');

        const W = window.innerWidth;
        const H = window.innerHeight;

        // Primary WebGL canvas — FiveM hooks into this context
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        canvas.style.display = 'none';
        document.body.appendChild(canvas);
        this.glCanvas = canvas;

        const gl = canvas.getContext('webgl', {
            antialias: false,
            depth: false,
            stencil: false,
            alpha: false,
            desynchronized: true,
            preserveDrawingBuffer: true,   // required for captureStream
            failIfMajorPerformanceCaveat: false,
        });
        if (!gl) { console.error('[GameRender] WebGL unavailable!'); return; }
        this.gl = gl;

        // CfxTexture handshake (texParameterf float + RESET)
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
            new Uint8Array([0, 0, 255, 255])); // blue placeholder

        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);

        // Magic hook sequence
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);          // ← TRIGGER
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);   // ← RESET
        console.log('[GameRender] CfxTexture Handshake ✅');

        // Shader program
        const prog = gl.createProgram();
        gl.attachShader(prog, makeShader(gl, gl.VERTEX_SHADER, VERT));
        gl.attachShader(prog, makeShader(gl, gl.FRAGMENT_SHADER, FRAG));
        gl.linkProgram(prog);
        gl.useProgram(prog);

        // Full-screen TRIANGLE_STRIP buffers
        const vb = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vb);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        const vloc = gl.getAttribLocation(prog, 'a_position');
        gl.enableVertexAttribArray(vloc);
        gl.vertexAttribPointer(vloc, 2, gl.FLOAT, false, 0, 0);

        const tb = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, tb);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
        const tloc = gl.getAttribLocation(prog, 'a_texcoord');
        gl.enableVertexAttribArray(tloc);
        gl.vertexAttribPointer(tloc, 2, gl.FLOAT, false, 0, 0);

        gl.uniform1i(gl.getUniformLocation(prog, 'external_texture'), 0);
        gl.viewport(0, 0, W, H);

        // Debug overlay (only if DEBUG_OVERLAY = true)
        if (DEBUG_OVERLAY) {
            const wrap = document.createElement('div');
            wrap.style.cssText = 'position:absolute;top:10px;left:10px;width:322px;height:182px;z-index:999999;border:3px solid lime;pointer-events:none;background:#000;';
            const oc = document.createElement('canvas');
            oc.width = 320; oc.height = 180;
            oc.style.cssText = 'width:320px;height:180px;display:block;';
            wrap.appendChild(oc);
            document.body.appendChild(wrap);
            this._overlayEl = wrap;
            this._overlayCtx = oc.getContext('2d');
            this._overlayC = oc;
        }

        this.isRunning = true;
        requestAnimationFrame(this._loop);
    }

    // Restart the renderer (e.g. after stream was closed and reopened)
    restart() {
        if (this.isRunning) return; // already running, nothing to do
        console.log('[GameRender] Restarting render loop...');
        this.isRunning = true;
        this._lastFrame = 0;
        requestAnimationFrame(this._loop);
    }

    // Call this when the stream consumer closes the modal
    pause() {
        this.isRunning = false;
    }

    // ── Public: stream ───────────────────────────────────────────────────────

    startStream() {
        this.init();
        if (!this.isRunning) this.restart();
        // Direct captureStream on the WebGL canvas — zero GPU↔CPU copy
        return this.glCanvas.captureStream(MAX_FPS);
    }

    // ── Private: render loop ─────────────────────────────────────────────────

    _loop(now) {
        if (!this.isRunning) return;
        requestAnimationFrame(this._loop);

        // FPS throttle — skip frame if we're ahead of schedule
        if (now - this._lastFrame < this._frameInterval) return;
        this._lastFrame = now;

        const gl = this.gl;
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.finish(); // flush GPU so captureStream gets the latest frame

        // FPS counter
        this.frameCount++;
        const elapsed = now - this._fpsTimer;
        if (elapsed >= 1000) {
            this.fps = Math.round(this.frameCount * 1000 / elapsed);
            this.frameCount = 0;
            this._fpsTimer = now;
        }

        // Debug overlay
        if (DEBUG_OVERLAY && this._overlayCtx) {
            const ctx = this._overlayCtx;
            ctx.drawImage(this.glCanvas, 0, 0, 320, 180);
            const pulse = Math.sin(now / 250) > 0;
            ctx.fillStyle = this.fps > 5
                ? (pulse ? '#00ff00' : '#003300')
                : (pulse ? '#ff8800' : '#221100');
            ctx.fillRect(0, 0, 14, 14);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 11px monospace';
            ctx.fillText(`${this.fps} fps`, 18, 11);
        }
    }
}

const instance = new GameRender();
export default instance;
