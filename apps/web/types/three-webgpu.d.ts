declare module 'three/examples/jsm/renderers/webgpu/WebGPURenderer.js' {
  import { WebGLRenderer, WebGLRendererParameters } from 'three';
  export class WebGPURenderer extends WebGLRenderer {
    constructor(parameters?: WebGLRendererParameters & { antialias?: boolean });
  }
}
