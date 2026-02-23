import { Texture, WebGLRenderer, WebGLRenderTarget, Scene, OrthographicCamera } from 'three';

export class GameRender {
    renderer: WebGLRenderer;
    rtTexture: WebGLRenderTarget;
    sceneRTT: Scene;
    cameraRTT: OrthographicCamera;
    gameTexture: Texture;
    canvas: HTMLCanvasElement;
    isAnimated: boolean;

    constructor();
    resize(): void;
    animate(): void;
    startStream(): MediaStream;
    stop(): void;
}

export default GameRender;
