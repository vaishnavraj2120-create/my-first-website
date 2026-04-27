const indicator = document.querySelector(".scroll-indicator span");
const frameImage = document.querySelector(".product-frame");
const scrollCompletionRatio = 0.28;

let targetProgress = 0;
let smoothProgress = 0;
let previousTarget = 0;
let scrollDirection = 1;

const frameCount = 192;
const frameSources = Array.from(
  { length: frameCount },
  (_, index) => `.frame-${String(index).padStart(4, "0")}.jpg`,
);
const preloadedFrames = new Array(frameCount);
let currentFrameIndex = -1;

function updateMaxScrollProgress() {
  const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  targetProgress = Math.min((window.scrollY / maxScroll) / scrollCompletionRatio, 1);
}

function preloadFrames() {
  frameSources.forEach((src, index) => {
    const image = new Image();
    image.decoding = "async";
    image.loading = "eager";
    image.src = src;
    preloadedFrames[index] = image;
  });
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function renderFrame(progress) {
  const easedProgress = easeOutCubic(progress);
  const nextIndex = Math.min(frameCount - 1, Math.max(0, Math.round(easedProgress * (frameCount - 1))));
  if (nextIndex === currentFrameIndex) {
    return;
  }

  currentFrameIndex = nextIndex;
  const preloaded = preloadedFrames[nextIndex];
  frameImage.src = preloaded && preloaded.complete ? preloaded.src : frameSources[nextIndex];
}

window.addEventListener("scroll", () => {
  const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  const nextProgress = Math.min((window.scrollY / maxScroll) / scrollCompletionRatio, 1);
  scrollDirection = nextProgress >= previousTarget ? 1 : -1;
  previousTarget = nextProgress;
  targetProgress = nextProgress;
});

window.addEventListener("resize", updateMaxScrollProgress);

function bootThreeBackground() {
  if (!window.THREE) {
    return null;
  }

  const canvas = document.querySelector(".scene");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 5;

  const group = new THREE.Group();
  scene.add(group);

  const ambient = new THREE.AmbientLight(0xffffff, 1.35);
  scene.add(ambient);

  const directional = new THREE.DirectionalLight(0xffffff, 1.1);
  directional.position.set(0.6, 1, 1.8);
  scene.add(directional);

  const glowGeometry = new THREE.PlaneGeometry(7.2, 4.6, 1, 1);
  const glowMaterial = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uProgress: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uProgress;

      void main() {
        vec2 uv = vUv - 0.5;
        float angle = atan(uv.y, uv.x);
        float radius = length(uv);
        float sweep = 0.28 + 0.1 * sin(angle * 3.0 + uTime * 0.9);
        float ring = smoothstep(sweep + 0.1, sweep - 0.08, radius);
        float halo = smoothstep(0.68, 0.0, radius);
        vec3 colorA = vec3(0.98, 0.84, 0.62);
        vec3 colorB = vec3(0.54, 0.75, 0.83);
        vec3 color = mix(colorA, colorB, vUv.y + uProgress * 0.25);
        float alpha = ring * 0.24 + halo * 0.08;
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });

  const glowPlane = new THREE.Mesh(glowGeometry, glowMaterial);
  glowPlane.position.set(0, -0.05, -0.6);
  group.add(glowPlane);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  });

  return { renderer, scene, camera, group, glowMaterial };
}

const threeScene = bootThreeBackground();

function animate() {
  requestAnimationFrame(animate);

  smoothProgress += (targetProgress - smoothProgress) * 0.12;
  indicator.style.transform = `scaleY(${smoothProgress.toFixed(4)})`;
  renderFrame(smoothProgress);

  if (threeScene) {
    const { renderer, scene, camera, group, glowMaterial } = threeScene;
    glowMaterial.uniforms.uTime.value += 0.015;
    glowMaterial.uniforms.uProgress.value = smoothProgress;

    group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, (0.02 + smoothProgress * 0.04) * -1, 0.04);
    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, scrollDirection * 0.04, 0.04);
    group.position.y = THREE.MathUtils.lerp(group.position.y, smoothProgress * 0.08, 0.05);

    renderer.render(scene, camera);
  }
}

updateMaxScrollProgress();
preloadFrames();
renderFrame(0);
animate();
