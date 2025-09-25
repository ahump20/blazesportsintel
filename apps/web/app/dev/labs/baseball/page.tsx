'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { WebGPURenderer } from 'three/examples/jsm/renderers/webgpu/WebGPURenderer.js';

type MaybeRenderer = THREE.WebGLRenderer | WebGPURenderer;

export default function BaseballStrikeZone() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let renderer: MaybeRenderer | null = null;
    let animationFrame = 0;
    let disposeControls: (() => void) | null = null;
    let isMounted = true;

    const width = container.clientWidth || 800;
    const height = 520;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(3.5, 2.5, 6.0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(5, 10, 7);
    scene.add(keyLight);

    const zone = new THREE.Box3(new THREE.Vector3(-0.85, 1.5, -0.1), new THREE.Vector3(0.85, 3.5, 0.1));
    scene.add(new THREE.Box3Helper(zone, 0x00ff00));

    const cubeGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const addVoxel = (x: number, y: number, z: number, intensity: number) => {
      const color = new THREE.Color().setHSL(0.66 - 0.66 * intensity, 1, 0.5);
      const material = new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.7 });
      const mesh = new THREE.Mesh(cubeGeometry, material);
      mesh.position.set(x, y, z);
      scene.add(mesh);
    };

    for (let i = 0; i < 150; i += 1) {
      const x = THREE.MathUtils.randFloat(-0.8, 0.8);
      const y = THREE.MathUtils.randFloat(1.6, 3.4);
      const z = THREE.MathUtils.randFloat(-0.08, 0.08);
      const intensity = Math.exp(-((x * x) + (y - 2.4) ** 2) * 0.6);
      addVoxel(x, y, z, intensity);
    }

    const setupRenderer = async () => {
      if (!isMounted) return;
      let RendererCtor: typeof WebGPURenderer | null = null;
      if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
        try {
          const mod = await import('three/examples/jsm/renderers/webgpu/WebGPURenderer.js');
          RendererCtor = mod.WebGPURenderer;
        } catch (error) {
          console.warn('WebGPU renderer unavailable, falling back to WebGL.', error);
        }
      }

      renderer = RendererCtor ? new RendererCtor({ antialias: true }) : new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      if (renderer instanceof THREE.WebGLRenderer) {
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
      }

      container.innerHTML = '';
      const domElement = 'domElement' in renderer ? renderer.domElement : null;
      if (domElement) container.appendChild(domElement);

      const controlsModule = await import('three/examples/jsm/controls/OrbitControls.js');
      const controls = new controlsModule.OrbitControls(camera, domElement || undefined);
      controls.target.set(0, 2.4, 0);
      controls.update();
      disposeControls = () => controls.dispose();

      const renderLoop = () => {
        if (!renderer) return;
        animationFrame = requestAnimationFrame(renderLoop);
        if ('render' in renderer) {
          renderer.render(scene, camera);
        }
      };
      renderLoop();
    };

    const handleResize = () => {
      if (!renderer) return;
      const nextWidth = container.clientWidth || 800;
      const nextHeight = 520;
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight);
    };

    setupRenderer();
    window.addEventListener('resize', handleResize);

    return () => {
      isMounted = false;
      window.removeEventListener('resize', handleResize);
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (disposeControls) disposeControls();
      if (renderer && 'dispose' in renderer && typeof renderer.dispose === 'function') {
        renderer.dispose();
      }
      container.innerHTML = '';
    };
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1>Baseball — Strike Zone 3D (WebGPU/WebGL)</h1>
      <div ref={containerRef} style={{ width: '100%', maxWidth: 980, border: '1px solid rgba(255,255,255,0.1)' }} />
      <p style={{ marginTop: 8 }}>Order: Baseball → Football → Basketball → Track &amp; Field.</p>
    </main>
  );
}
