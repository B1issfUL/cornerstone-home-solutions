import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import lightPlateUrl from '../assets/crystals/crystals-light.webp';
import darkPlateUrl from '../assets/crystals/crystals-dark.webp';
import depthMapUrl from '../assets/crystals/crystals-depth.webp';

/*
  Hybrid crystal environment.
  1. Photographic plate (the reference crystal renders) drawn by a shader with a hand-built
     depth map: depth-based mouse/scroll parallax, a scroll-driven turn of the main formation,
     gentle drift, and glistening that brightens the plate's own specular highlights.
  2. Real 3D crystal fragments in front of the plate that rotate fully with scroll. They
     sample the plate itself (refraction + internal reflection), so their colour matches the scene.
  Aux map channels: R = depth (0 far, 1 near), G = specular highlights, B = main formation mask.
*/

const IMAGE_SIZE = new THREE.Vector2(1672, 940);
const FORMATION_CENTER = new THREE.Vector2(1215 / 1672, 1 - 500 / 940);

const plateVertex = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const plateFragment = `
  uniform sampler2D uLight;
  uniform sampler2D uDark;
  uniform sampler2D uAux;
  uniform float uMix;
  uniform float uTime;
  uniform float uAngle;
  uniform float uGlint;
  uniform float uImageAspect;
  uniform float uVeil;
  uniform vec2 uVisible;
  uniform vec2 uFocus;
  uniform vec2 uShift;
  uniform vec2 uCenter;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  vec2 turn(vec2 p, vec2 c, float a) {
    p -= c; p.x *= uImageAspect;
    p = mat2(cos(a), -sin(a), sin(a), cos(a)) * p;
    p.x /= uImageAspect;
    return p + c;
  }

  void main() {
    vec2 uv = uFocus + (vUv - 0.5) * uVisible;
    float depth = texture2D(uAux, uv).r;
    vec2 drift = vec2(sin(uTime * 0.31 + depth * 5.0), cos(uTime * 0.23 + depth * 4.0)) * 0.0016 * depth;
    vec2 p = uv - uShift * (depth - 0.3) - drift;
    p = turn(p, uCenter, uAngle * texture2D(uAux, p).b);
    vec3 aux = texture2D(uAux, p).rgb;
    vec3 col = mix(texture2D(uLight, p).rgb, texture2D(uDark, p).rgb, uMix);

    // Glistening: the plate's own highlights flare as a soft light band and sparse noise pass over them.
    float band = pow(0.5 + 0.5 * sin(dot(p, vec2(5.2, -3.1)) * 3.14159 - uTime * 0.55), 8.0);
    float n1 = noise(p * vec2(70.0, 40.0) + vec2(uTime * 0.18, -uTime * 0.11));
    float n2 = noise(p * vec2(41.0, 23.0) - vec2(uTime * 0.09, uTime * 0.14));
    float twinkle = smoothstep(0.62, 0.92, n1 * n2 * 1.9);
    vec3 warm = mix(vec3(1.0, 0.94, 0.82), vec3(1.0, 0.8, 0.5), uMix);
    float spec = aux.g;
    float glow = texture2D(uAux, p, 3.0).g;
    col += warm * spec * (0.28 * band + 0.75 * twinkle) * uGlint;
    col += warm * glow * (0.05 + 0.16 * band + 0.2 * twinkle) * uGlint * mix(0.45, 1.0, uMix);

    // Quiet the left column a touch so the headline and form stay readable.
    // Veil sits on the copy column only; the blurred foreground crystals at the far left stay vivid.
    float veil = uVeil * smoothstep(0.02, 0.12, vUv.x) * (1.0 - smoothstep(0.36, 0.56, vUv.x)) * smoothstep(0.0, 0.25, vUv.y);
    col = mix(col, mix(vec3(0.965, 0.955, 0.94), vec3(0.02, 0.018, 0.016), uMix), veil);
    gl_FragColor = vec4(col, 1.0);
  }
`;

// Gem shader for the 3D fragments: each facet shows the photographic plate behind it, shifted by
// the facet normal (refraction plus an internal reflection), with Fresnel-bright bevels.
const gemVertex = `
  varying vec3 vViewPos;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewPos = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;
const gemFragment = `
  uniform sampler2D uLight;
  uniform sampler2D uDark;
  uniform float uMix;
  uniform float uTime;
  uniform vec2 uVisible;
  uniform vec2 uFocus;
  uniform vec2 uRes;
  uniform float uSeed;
  varying vec3 vViewPos;
  vec3 plate(vec2 uv) { return mix(texture2D(uLight, uv).rgb, texture2D(uDark, uv).rgb, uMix); }
  void main() {
    vec3 n = normalize(cross(dFdx(vViewPos), dFdy(vViewPos)));
    vec2 uv = uFocus + (gl_FragCoord.xy / uRes - 0.5) * uVisible;
    vec3 behind = plate(uv + n.xy * 0.03);
    vec3 inner = plate(uv - n.xy * 0.11 + vec2(0.015, 0.02));
    float facet = 0.5 + 0.5 * sin(dot(n, vec3(3.1, 2.3, 1.7)) * 3.0 + uTime * 0.45 + uSeed);
    float fresnel = pow(1.0 - abs(n.z), 2.2);
    vec3 tint = mix(vec3(1.0, 0.97, 0.92), vec3(1.0, 0.88, 0.7), uMix);
    vec3 warm = mix(vec3(1.0, 0.96, 0.88), vec3(1.0, 0.83, 0.56), uMix);
    vec3 col = (behind * 0.6 + inner * 0.45 * (0.6 + 0.8 * facet)) * tint;
    col = mix(col, col * vec3(0.55, 0.5, 0.42), uMix * 0.35 * (1.0 - facet));
    col += warm * fresnel * (0.55 + 0.9 * facet);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const loadTexture = (loader, url) => new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));

export default function ChromeEnvironment() {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    const lowPower = window.innerWidth < 700 || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: !lowPower, powerPreference: 'high-performance' });
    } catch {
      host.dataset.renderState = 'fallback';
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1 : 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.autoClear = false;
    renderer.domElement.className = 'chrome-scene';
    host.dataset.renderState = 'loading';

    let disposed = false;
    const disposables = [];
    const track = (item) => { disposables.push(item); return item; };

    const scene = new THREE.Scene();
    const plateUniforms = {
      uLight: { value: null }, uDark: { value: null }, uAux: { value: null },
      uMix: { value: 0 }, uTime: { value: 0 }, uAngle: { value: 0 }, uGlint: { value: 1 },
      uImageAspect: { value: IMAGE_SIZE.x / IMAGE_SIZE.y }, uVeil: { value: 0.22 },
      uVisible: { value: new THREE.Vector2(1, 1) }, uFocus: { value: new THREE.Vector2(0.5, 0.5) },
      uShift: { value: new THREE.Vector2() }, uCenter: { value: FORMATION_CENTER.clone() },
    };
    const plateMaterial = track(new THREE.ShaderMaterial({
      uniforms: plateUniforms, vertexShader: plateVertex, fragmentShader: plateFragment,
      depthTest: false, depthWrite: false, toneMapped: false,
    }));
    const plateGeometry = track(new THREE.PlaneGeometry(2, 2));
    // The plate is part of the 3D scene (drawn first, full-screen) its uniforms are shared with the gem shader.
    const plate = new THREE.Mesh(plateGeometry, plateMaterial);
    plate.renderOrder = -1;
    plate.frustumCulled = false;
    scene.add(plate);

    // 3D fragments
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(0, 0, 17);
    const gemGeometry = track(new RoundedBoxGeometry(1, 1, 1, 1, 0.14));
    const gemUniforms = {
      uLight: plateUniforms.uLight, uDark: plateUniforms.uDark, uMix: plateUniforms.uMix,
      uTime: plateUniforms.uTime, uVisible: plateUniforms.uVisible, uFocus: plateUniforms.uFocus,
      uRes: { value: new THREE.Vector2(1, 1) },
    };
    const fragments = [];
    const layout = [
      // x, y, z, size — kept to the right half and the top/bottom margins so the copy stays clear
      [2.4, 3.5, 0.6, 0.36], [7.9, 3.2, 0.8, 0.44], [9.1, -1.0, 0.2, 0.32], [5.2, -4.4, 1.0, 0.4],
      [0.4, -4.6, -0.6, 0.3], [-9.6, 3.9, -1.2, 0.26], [9.6, 1.6, -1.0, 0.28], [-9.2, 1.4, 0.4, 0.34],
    ];
    layout.forEach(([x, y, z, size], i) => {
      const material = track(new THREE.ShaderMaterial({
        uniforms: { ...gemUniforms, uSeed: { value: i * 1.7 } },
        vertexShader: gemVertex, fragmentShader: gemFragment, toneMapped: false,
      }));
      const mesh = new THREE.Mesh(gemGeometry, material);
      mesh.position.set(x, y, z);
      mesh.scale.setScalar(size);
      mesh.rotation.set(0.5 + i * 0.7, 0.3 + i * 0.45, i * 0.31);
      scene.add(mesh);
      fragments.push({ mesh, x, y, rx: mesh.rotation.x, ry: mesh.rotation.y, speed: 0.28 + (i % 5) * 0.06, spin: 0.7 + (i % 4) * 0.25 });
    });

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
    const finePointer = window.matchMedia('(pointer: fine)');
    let dark = false;
    let mobile = false;
    let ready = false;
    let scrollTarget = window.scrollY;
    let smoothScroll = scrollTarget;
    let pointerX = 0; let pointerY = 0; let smoothX = 0; let smoothY = 0;
    let frame = 0; let lastTime = 0; let motionTime = 0; let lastRenderTime = 0;
    let needsRender = true;

    const syncTheme = () => {
      const theme = document.documentElement.dataset.theme;
      dark = theme === 'dark' || (theme !== 'light' && systemDark.matches);
      renderer.toneMappingExposure = dark ? 1.05 : 1.2;
      needsRender = true;
    };
    const syncSize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      renderer.getDrawingBufferSize(gemUniforms.uRes.value);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      mobile = width < 860;
      // Landscape: fit the plate's width like the reference layouts (up to 14% extra height is
      // mirror-extended under the header). Portrait/narrow: cover-fit, centred on the formation.
      const coverScale = Math.max(width / IMAGE_SIZE.x, height / IMAGE_SIZE.y);
      const widthScale = Math.max((width / IMAGE_SIZE.x) * 1.02, height / (IMAGE_SIZE.y * 1.14));
      const scale = mobile ? coverScale * 1.04 : Math.min(widthScale, coverScale * 1.04);
      const visible = new THREE.Vector2(width / (IMAGE_SIZE.x * scale), height / (IMAGE_SIZE.y * scale));
      plateUniforms.uVisible.value.copy(visible);
      plateUniforms.uFocus.value.set(
        mobile ? THREE.MathUtils.clamp(0.72, visible.x / 2, 1 - visible.x / 2) : 0.5 + Math.max(0, 1 - visible.x) / 2,
        // Anchor the bottom edge; any overflow lands at the top, behind the header.
        visible.y > 1 ? visible.y / 2 : 0.5,
      );
      plateUniforms.uVeil.value = mobile ? 0 : 0.42;
      fragments.forEach(({ mesh }, i) => { mesh.visible = !(mobile || lowPower) || i < 5; });
      needsRender = true;
    };

    const onScroll = () => { scrollTarget = window.scrollY; };
    const onPointer = (event) => {
      if (!finePointer.matches) return;
      pointerX = event.clientX / window.innerWidth - 0.5;
      pointerY = event.clientY / window.innerHeight - 0.5;
    };
    const onContextLost = (event) => {
      event.preventDefault();
      host.dataset.renderState = 'fallback';
      cancelAnimationFrame(frame);
    };
    const resizeObserver = new ResizeObserver(syncSize);
    const themeObserver = new MutationObserver(syncTheme);

    const render = (now) => {
      if (disposed) return;
      frame = requestAnimationFrame(render);
      const still = reducedMotion.matches;
      const mixTarget = dark ? 1 : 0;
      const mixing = Math.abs(plateUniforms.uMix.value - mixTarget) > 0.002;
      if (document.hidden || (still && !needsRender && !mixing)) { lastTime = now; return; }
      // Below the hero the plate sits behind frosted sections, so 30 FPS is enough there.
      const throttled = lowPower || mobile || window.scrollY > window.innerHeight * 0.9;
      if (throttled && now - lastRenderTime < 1000 / 30) return;
      lastRenderTime = now;
      const dt = Math.min((now - (lastTime || now)) / 1000, 0.05);
      lastTime = now;
      if (!still) motionTime += dt;

      // Smooth theme cross-fade (instant under reduced motion).
      plateUniforms.uMix.value = still ? mixTarget : plateUniforms.uMix.value + (mixTarget - plateUniforms.uMix.value) * (1 - Math.exp(-dt * 4));

      smoothScroll += (scrollTarget - smoothScroll) * (1 - Math.exp(-dt * 7));
      smoothX += (pointerX - smoothX) * (1 - Math.exp(-dt * 3));
      smoothY += (pointerY - smoothY) * (1 - Math.exp(-dt * 3));
      const progress = still ? 0 : smoothScroll * 0.00055;
      const scrollRatio = still ? 0 : Math.min(smoothScroll / window.innerHeight, 1.5);
      const px = still ? 0 : smoothX; const py = still ? 0 : smoothY;

      // Plate: depth parallax (pointer + scroll), formation turns with scroll and reverses on the way back up.
      plateUniforms.uShift.value.set(px * 0.022, -py * 0.016 - scrollRatio * 0.035);
      plateUniforms.uAngle.value = Math.sin(progress * 1.5) * 0.12;
      plateUniforms.uTime.value = still ? 2.0 : motionTime;

      camera.position.set(px * 0.7, -py * 0.45, 17);
      camera.lookAt(0, 0, 0);
      fragments.forEach(({ mesh, x, y, rx, ry, speed, spin }, i) => {
        mesh.rotation.x = rx + progress * spin + motionTime * 0.06 * (i % 2 ? 1 : -1);
        mesh.rotation.y = ry + progress * (spin + 0.5) + motionTime * 0.05;
        mesh.position.x = x;
        mesh.position.y = y + Math.sin(motionTime * speed + i) * 0.1 + scrollRatio * (0.6 + (i % 3) * 0.35);
      });

      renderer.clear();
      renderer.render(scene, camera);
      host.dataset.scrollRotation = progress.toFixed(3);
      needsRender = false;
    };

    const loader = new THREE.TextureLoader();
    Promise.all([loadTexture(loader, lightPlateUrl), loadTexture(loader, darkPlateUrl), loadTexture(loader, depthMapUrl)])
      .then(([light, darkPlate, aux]) => {
        if (disposed) { [light, darkPlate, aux].forEach((t) => t.dispose()); return; }
        [light, darkPlate, aux].forEach((t) => {
          t.minFilter = THREE.LinearMipmapLinearFilter;
          t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping;
          t.generateMipmaps = true;
          track(t);
        });
        plateUniforms.uLight.value = light;
        plateUniforms.uDark.value = darkPlate;
        plateUniforms.uAux.value = aux;
        syncTheme();
        plateUniforms.uMix.value = dark ? 1 : 0;
        host.appendChild(renderer.domElement);
        host.dataset.renderState = 'ready';
        ready = true;
        resizeObserver.observe(host);
        syncSize();
        frame = requestAnimationFrame(render);
      })
      .catch(() => { if (!disposed) host.dataset.renderState = 'fallback'; });

    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onPointer, { passive: true });
    systemDark.addEventListener('change', syncTheme);
    syncTheme();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointer);
      systemDark.removeEventListener('change', syncTheme);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      themeObserver.disconnect();
      resizeObserver.disconnect();
      disposables.forEach((item) => item.dispose());
      renderer.dispose();
      if (ready) renderer.domElement.remove();
    };
  }, []);

  return <div className="chrome-environment" ref={hostRef} aria-hidden="true" />;
}
