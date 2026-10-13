import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
// @ts-ignore - three/examples/jsm modules don't always ship type definitions
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
// @ts-ignore - three/examples/jsm modules don't always ship type definitions
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

/* -------------------------------------------------------------------------- */
/*  Types and static metadata                                                  */
/* -------------------------------------------------------------------------- */

export type SensorId = 'Accelerometer' | 'HumiditySensor' | 'Temperaturesensor';
export type ComponentId = SensorId | 'digital_twin_1';

type OrbitControlsT = InstanceType<typeof OrbitControls>;
type ViewName = 'iso' | 'front' | 'back' | 'left' | 'right' | 'top';

interface Props {
  modelUrl: string;
  /** NORMAL | WARNING | ABNORMAL, shown as a small status chip in the viewport. */
  condition?: string;
  /** Optional controlled selection. Leave undefined for uncontrolled. */
  selected?: SensorId | null;
  onSelect?: (id: SensorId | null) => void;
}

const SENSORS: { id: SensorId; label: string; measures: string; color: string }[] = [
  { id: 'Accelerometer', label: 'Accelerometer', measures: 'Measures vibration and motion.', color: '#2979FF' },
  { id: 'HumiditySensor', label: 'Humidity sensor', measures: 'Measures relative humidity.', color: '#43A047' },
  { id: 'Temperaturesensor', label: 'Temperature sensor', measures: 'Measures temperature.', color: '#E53935' },
];

// Same hues the rest of the page uses for machine state.
const CONDITION: Record<string, { label: string; color: string }> = {
  NORMAL: { label: 'Normal', color: '#2dd4bf' },
  WARNING: { label: 'Warning', color: '#f59e0b' },
  ABNORMAL: { label: 'Abnormal', color: '#ef4444' },
};

const VIEWS: { id: ViewName; label: string; dir: [number, number, number] }[] = [
  { id: 'iso', label: 'Iso', dir: [1, 0.75, 1] },
  { id: 'front', label: 'Front', dir: [0, 0.08, 1] },
  { id: 'back', label: 'Back', dir: [0, 0.08, -1] },
  { id: 'left', label: 'Left', dir: [-1, 0.08, 0] },
  { id: 'right', label: 'Right', dir: [1, 0.08, 0] },
  { id: 'top', label: 'Top', dir: [0, 1, 0.0001] },
];

interface Display {
  opacity: number;
  edges: boolean;
  grid: boolean;
  labels: boolean;
  axes: boolean;
  autoRotate: boolean;
}

interface Placement { x: number; y: number; z: number }

/* -------------------------------------------------------------------------- */
/*  Theme: read the app's existing Tailwind tokens so the palette is unchanged */
/* -------------------------------------------------------------------------- */

interface Theme {
  inset: string;
  raised: string;
  edge: string;
  edgeStrong: string;
  brand: string;
  muted: string;
}

const PROBES: Record<keyof Theme, [string, 'backgroundColor' | 'color']> = {
  inset: ['bg-surface-inset', 'backgroundColor'],
  raised: ['bg-surface-raised', 'backgroundColor'],
  edge: ['text-edge', 'color'],
  edgeStrong: ['text-edge-strong', 'color'],
  brand: ['bg-brand', 'backgroundColor'],
  muted: ['text-txt-muted', 'color'],
};

const FALLBACK_THEME: Theme = {
  inset: '#0b1118',
  raised: '#121a24',
  edge: '#243040',
  edgeStrong: '#36465b',
  brand: '#2dd4bf',
  muted: '#8b98a9',
};

let scratchCtx: CanvasRenderingContext2D | null = null;

/** Normalise any CSS colour (rgb, oklch, ...) to #rrggbb through a canvas pixel. */
function cssToHex(css: string, fallback: string): string {
  try {
    if (!scratchCtx) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      scratchCtx = canvas.getContext('2d', { willReadFrequently: true });
    }
    const ctx = scratchCtx;
    if (!ctx) return fallback;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000';
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    if (a === 0) return fallback;
    return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
  } catch {
    return fallback;
  }
}

function readTheme(host: HTMLElement): Theme {
  const out = { ...FALLBACK_THEME };
  (Object.keys(PROBES) as (keyof Theme)[]).forEach((key) => {
    const [cls, prop] = PROBES[key];
    const el = document.createElement('div');
    el.className = cls;
    el.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;width:0;height:0';
    host.appendChild(el);
    out[key] = cssToHex(getComputedStyle(el)[prop], FALLBACK_THEME[key]);
    host.removeChild(el);
  });
  return out;
}

/* -------------------------------------------------------------------------- */
/*  Three.js helpers                                                           */
/* -------------------------------------------------------------------------- */

interface SensorRecord {
  mesh: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  center: THREE.Vector3;
  size: number;
}

interface Tween {
  fromDir: THREE.Vector3;
  q: THREE.Quaternion;
  fromLen: number;
  toLen: number;
  fromT: THREE.Vector3;
  toT: THREE.Vector3;
  start: number;
  dur: number;
}

interface Ctx {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControlsT;
  body: THREE.Mesh | null;
  edges: THREE.LineSegments | null;
  grid: THREE.GridHelper | null;
  sensors: Map<SensorId, SensorRecord>;
  selBox: THREE.LineSegments;
  selSize: number;
  selStart: number;
  center: THREE.Vector3;
  radius: number;
  box: THREE.Box3;
  tween: Tween | null;
  hover: SensorId | null;
  pointer: { x: number; y: number; dirty: boolean };
}

const isMesh = (o: THREE.Object3D): o is THREE.Mesh => (o as THREE.Mesh).isMesh === true;
const easeInOutCubic = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function componentOf(o: THREE.Object3D): ComponentId | null {
  const name = o.name || o.parent?.name || '';
  if (name.includes('Accelerometer')) return 'Accelerometer';
  if (name.includes('HumiditySensor')) return 'HumiditySensor';
  if (name.includes('Temperaturesensor')) return 'Temperaturesensor';
  if (name.includes('digital_twin_1')) return 'digital_twin_1';
  return null;
}

function fitDistance(c: Ctx): number {
  const vFov = THREE.MathUtils.degToRad(c.camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * c.camera.aspect);
  return (c.radius * 0.85) / Math.sin(Math.min(vFov, hFov) / 2);
}

function startTween(c: Ctx, toPos: THREE.Vector3, toTarget: THREE.Vector3, dur: number) {
  if (prefersReducedMotion() || dur <= 0) {
    c.camera.position.copy(toPos);
    c.controls.target.copy(toTarget);
    c.controls.update();
    c.tween = null;
    return;
  }
  const fromO = c.camera.position.clone().sub(c.controls.target);
  const toO = toPos.clone().sub(toTarget);
  const fromDir = fromO.clone().normalize();
  const toDir = toO.clone().normalize();
  c.tween = {
    fromDir,
    q: new THREE.Quaternion().setFromUnitVectors(fromDir, toDir),
    fromLen: fromO.length(),
    toLen: toO.length(),
    fromT: c.controls.target.clone(),
    toT: toTarget.clone(),
    start: performance.now(),
    dur,
  };
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else if (mat) mat.dispose();
  });
}

function makeGrid(c: Ctx, theme: Theme) {
  if (c.grid) {
    c.scene.remove(c.grid);
    disposeObject(c.grid);
  }
  const size = Math.ceil((Math.max(c.box.max.x - c.box.min.x, c.box.max.z - c.box.min.z) * 2.4) / 100) * 100;
  const grid = new THREE.GridHelper(size, size / 50, new THREE.Color(theme.edgeStrong), new THREE.Color(theme.edge));
  grid.position.set(c.center.x, c.box.min.y - 0.5, c.center.z);
  c.scene.add(grid);
  c.grid = grid;
}

/* -------------------------------------------------------------------------- */
/*  Small UI pieces                                                            */
/* -------------------------------------------------------------------------- */

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const iconBtn =
  'flex h-8 w-8 items-center justify-center rounded-md border border-edge bg-surface-raised text-txt-secondary transition-colors hover:bg-surface-hover hover:text-txt-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand motion-reduce:transition-none';

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-txt-secondary">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand motion-reduce:transition-none ${
          checked ? 'border-brand bg-brand' : 'border-edge-strong bg-surface-inset'
        }`}
      >
        <span
          className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-txt-primary transition-all motion-reduce:transition-none ${
            checked ? 'left-[18px]' : 'left-[3px]'
          }`}
        />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Viewer                                                                     */
/* -------------------------------------------------------------------------- */

export function PrinterViewer3D({ modelUrl, condition = 'NORMAL', selected: selectedProp, onSelect }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<Ctx | null>(null);
  const pinRefs = useRef<Partial<Record<SensorId, HTMLDivElement | null>>>({});
  const gizmoRefs = useRef<(SVGGElement | null)[]>([]);
  const themeRef = useRef<Theme>(FALLBACK_THEME);

  const [theme, setTheme] = useState<Theme>(FALLBACK_THEME);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [hintVisible, setHintVisible] = useState(true);
  const [activeView, setActiveView] = useState<ViewName | null>('iso');
  const [hovered, setHovered] = useState<SensorId | null>(null);
  const [innerSelected, setInnerSelected] = useState<SensorId | null>(null);
  const [hidden, setHidden] = useState<Record<ComponentId, boolean>>({
    Accelerometer: false,
    HumiditySensor: false,
    Temperaturesensor: false,
    digital_twin_1: false,
  });
  const [placements, setPlacements] = useState<Record<SensorId, Placement> | null>(null);
  const [bodySize, setBodySize] = useState<Placement | null>(null);
  const [display, setDisplay] = useState<Display>({
    opacity: 0.6,
    edges: true,
    grid: true,
    labels: true,
    axes: true,
    autoRotate: false,
  });

  const selected = selectedProp !== undefined ? selectedProp : innerSelected;
  const patch = (p: Partial<Display>) => setDisplay((d) => ({ ...d, ...p }));

  const select = useCallback(
    (id: SensorId | null) => {
      setInnerSelected(id);
      onSelect?.(id);
    },
    [onSelect]
  );
  const selectRef = useRef(select);
  selectRef.current = select;

  /* ---- camera actions ---------------------------------------------------- */

  const setView = useCallback((view: ViewName) => {
    const c = ctxRef.current;
    if (!c) return;
    const def = VIEWS.find((v) => v.id === view)!;
    const dir = new THREE.Vector3(...def.dir).normalize();
    startTween(c, c.center.clone().addScaledVector(dir, fitDistance(c)), c.center.clone(), 750);
    setActiveView(view);
  }, []);

  const fit = useCallback(() => {
    const c = ctxRef.current;
    if (!c) return;
    const dir = c.camera.position.clone().sub(c.controls.target).normalize();
    startTween(c, c.center.clone().addScaledVector(dir, fitDistance(c)), c.center.clone(), 600);
  }, []);

  const dolly = useCallback((factor: number) => {
    const c = ctxRef.current;
    if (!c) return;
    const target = c.controls.target.clone();
    const off = c.camera.position.clone().sub(target);
    const len = THREE.MathUtils.clamp(off.length() * factor, c.controls.minDistance, c.controls.maxDistance);
    startTween(c, target.clone().add(off.setLength(len)), target, 220);
  }, []);

  const focus = useCallback((id: SensorId) => {
    const c = ctxRef.current;
    const rec = c?.sensors.get(id);
    if (!c || !rec) return;
    let dir = c.camera.position.clone().sub(c.controls.target);
    if (dir.lengthSq() < 1e-6) dir.set(1, 0.75, 1);
    dir.normalize();
    startTween(c, rec.center.clone().addScaledVector(dir, rec.size * 5), rec.center.clone(), 700);
    setActiveView(null);
  }, []);

  const pickFromList = (id: SensorId) => {
    select(id);
    focus(id);
  };

  /* ---- init: renderer, scene, loop, model --------------------------------- */

  useEffect(() => {
    const host = hostRef.current;
    const wrap = wrapRef.current;
    if (!host || !wrap) return;

    let disposed = false;
    setReady(false);
    setError(null);
    setProgress(0);

    const th = readTheme(wrap);
    themeRef.current = th;
    setTheme(th);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      setError("WebGL isn't available in this browser, so the 3D model can't be shown.");
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const canvas = renderer.domElement;
    canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
    host.appendChild(canvas);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(th.inset);

    const camera = new THREE.PerspectiveCamera(40, 1, 1, 20000);
    const controls: OrbitControlsT = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;
    controls.autoRotateSpeed = 1.2;

    // Light intensities changed meaning in three r155; keep the look the same on both.
    const k = Number(THREE.REVISION) >= 155 ? Math.PI : 1;
    scene.add(new THREE.HemisphereLight(0xffffff, new THREE.Color(th.raised), 0.9 * k));
    const key = new THREE.DirectionalLight(0xffffff, 1.1 * k);
    key.position.set(300, 600, 400);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.45 * k);
    fill.position.set(-400, 200, -300);
    scene.add(fill);

    const selBox = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
      new THREE.LineBasicMaterial({ color: new THREE.Color(th.brand), depthTest: false, transparent: true })
    );
    selBox.renderOrder = 10;
    selBox.visible = false;
    scene.add(selBox);

    const c: Ctx = {
      renderer,
      scene,
      camera,
      controls,
      body: null,
      edges: null,
      grid: null,
      sensors: new Map(),
      selBox,
      selSize: 20,
      selStart: 0,
      center: new THREE.Vector3(),
      radius: 300,
      box: new THREE.Box3(),
      tween: null,
      hover: null,
      pointer: { x: 0, y: 0, dirty: false },
    };
    ctxRef.current = c;

    const onControlsStart = () => {
      c.tween = null;
      setActiveView(null);
      setHintVisible(false);
    };
    controls.addEventListener('start', onControlsStart);

    /* resize */
    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    /* picking */
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const pick = (clientX: number, clientY: number): SensorId | null => {
      const rect = canvas.getBoundingClientRect();
      ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const targets: THREE.Object3D[] = [];
      c.sensors.forEach((rec) => rec.mesh.visible && targets.push(rec.mesh));
      const hit = raycaster.intersectObjects(targets, false)[0];
      return hit ? (hit.object.userData.id as SensorId) : null;
    };

    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY };
      wrap.focus({ preventScroll: true });
    };
    const onUp = (e: PointerEvent) => {
      if (!down || e.button !== 0) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved < 5) selectRef.current(pick(e.clientX, e.clientY));
    };
    const onMove = (e: PointerEvent) => {
      c.pointer.x = e.clientX;
      c.pointer.y = e.clientY;
      c.pointer.dirty = true;
    };
    const onLeave = () => {
      c.pointer.dirty = false;
      if (c.hover) {
        c.hover = null;
        setHovered(null);
      }
      canvas.style.cursor = '';
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);

    /* loop */
    const tmpV = new THREE.Vector3();
    const tmpQ = new THREE.Quaternion();
    const tmpDir = new THREE.Vector3();
    const camQInv = new THREE.Quaternion();
    const MACHINE_AXES = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0)];
    let raf = 0;

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now();

      if (c.tween) {
        const t = c.tween;
        const e = easeInOutCubic(Math.min(1, (now - t.start) / t.dur));
        tmpQ.identity().slerp(t.q, e);
        tmpDir.copy(t.fromDir).applyQuaternion(tmpQ);
        controls.target.lerpVectors(t.fromT, t.toT, e);
        camera.position.copy(controls.target).addScaledVector(tmpDir, THREE.MathUtils.lerp(t.fromLen, t.toLen, e));
        if (now - t.start >= t.dur) c.tween = null;
      }
      controls.update();

      if (c.pointer.dirty) {
        c.pointer.dirty = false;
        const id = pick(c.pointer.x, c.pointer.y);
        if (id !== c.hover) {
          c.hover = id;
          setHovered(id);
          canvas.style.cursor = id ? 'pointer' : '';
        }
      }

      if (c.selBox.visible) {
        const e = 1 - Math.pow(1 - Math.min(1, (now - c.selStart) / 240), 3);
        c.selBox.scale.setScalar(c.selSize * (1.9 + 0.9 * (1 - e)));
      }

      renderer.render(scene, camera);

      // Overlays use fresh camera matrices, so update them after rendering.
      const w = host.clientWidth;
      const h = host.clientHeight;
      c.sensors.forEach((rec, id) => {
        const el = pinRefs.current[id];
        if (!el) return;
        tmpV.copy(rec.center).project(camera);
        const visible = rec.mesh.visible && tmpV.z > -1 && tmpV.z < 1;
        el.style.visibility = visible ? 'visible' : 'hidden';
        if (visible) el.style.transform = `translate3d(${(tmpV.x * 0.5 + 0.5) * w}px, ${(-tmpV.y * 0.5 + 0.5) * h}px, 0)`;
      });

      camQInv.copy(camera.quaternion).invert();
      for (let i = 0; i < 3; i++) {
        const g = gizmoRefs.current[i];
        if (!g) continue;
        tmpV.copy(MACHINE_AXES[i]).applyQuaternion(camQInv);
        const line = g.children[0] as SVGLineElement;
        const text = g.children[1] as SVGTextElement;
        line.setAttribute('x2', String(50 + tmpV.x * 28));
        line.setAttribute('y2', String(50 - tmpV.y * 28));
        text.setAttribute('x', String(50 + tmpV.x * 41));
        text.setAttribute('y', String(54 - tmpV.y * 41));
        g.style.opacity = String(0.4 + 0.6 * (tmpV.z * 0.5 + 0.5));
      }
    };
    raf = requestAnimationFrame(loop);

    /* model */
    new GLTFLoader().load(
      modelUrl,
      (gltf: { scene: THREE.Group }) => {
        if (disposed) return;
        const model = gltf.scene;
        model.updateMatrixWorld(true);

        model.traverse((o: THREE.Object3D) => {
          if (!isMesh(o)) return;
          const id = componentOf(o);
          if (id === 'digital_twin_1') {
            (o.material as THREE.Material).dispose?.();
            const body = new THREE.Color(th.raised).lerp(new THREE.Color(th.muted), 0.55);
            o.material = new THREE.MeshStandardMaterial({
              color: body,
              roughness: 0.62,
              metalness: 0.1,
              polygonOffset: true,
              polygonOffsetFactor: 1,
              polygonOffsetUnits: 1,
            });
            c.body = o;
          } else if (id) {
            const meta = SENSORS.find((s) => s.id === id)!;
            (o.material as THREE.Material).dispose?.();
            const material = new THREE.MeshStandardMaterial({
              color: new THREE.Color(meta.color),
              emissive: new THREE.Color(meta.color),
              emissiveIntensity: 0,
              roughness: 0.45,
              metalness: 0,
            });
            o.material = material;
            o.userData.id = id;
            const box = new THREE.Box3().setFromObject(o);
            const size = box.getSize(new THREE.Vector3());
            c.sensors.set(id, { mesh: o, material, center: box.getCenter(new THREE.Vector3()), size: Math.max(size.x, size.y, size.z) });
          }
        });

        scene.add(model);
        c.box.setFromObject(model);
        c.box.getCenter(c.center);
        const size = c.box.getSize(new THREE.Vector3());
        c.radius = size.length() / 2;
        controls.minDistance = 20;
        controls.maxDistance = c.radius * 6;
        makeGrid(c, th);

        // Opening move: ease in from a wider angle to the isometric fit.
        const iso = new THREE.Vector3(...VIEWS[0].dir).normalize();
        const dist = fitDistance(c);
        const start = new THREE.Vector3(1.5, 0.95, 1.8).normalize();
        camera.position.copy(c.center).addScaledVector(start, dist * 1.45);
        controls.target.copy(c.center);
        controls.update();
        startTween(c, c.center.clone().addScaledVector(iso, dist), c.center.clone(), 1400);

        const place = {} as Record<SensorId, Placement>;
        c.sensors.forEach((rec, id) => {
          // Machine coordinates: X = model X, Y = -model Z, Z = model Y (up).
          place[id] = { x: rec.center.x, y: -rec.center.z, z: rec.center.y };
        });
        setPlacements(place);
        setBodySize({ x: size.x, y: size.z, z: size.y });
        setReady(true);
      },
      (ev: ProgressEvent) => {
        if (!disposed && ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
      },
      () => {
        if (!disposed) setError(`Couldn't load the model from ${modelUrl}.`);
      }
    );

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.removeEventListener('start', onControlsStart);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      controls.dispose();
      disposeObject(scene);
      renderer.dispose();
      renderer.forceContextLoss();
      if (canvas.parentElement === host) host.removeChild(canvas);
      ctxRef.current = null;
    };
  }, [modelUrl, reloadKey]);

  /* ---- follow theme changes (light/dark switch) --------------------------- */

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const refresh = () => {
      const next = readTheme(wrap);
      if (JSON.stringify(next) !== JSON.stringify(themeRef.current)) {
        themeRef.current = next;
        setTheme(next);
      }
    };
    const mo = new MutationObserver(refresh);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] });
    return () => mo.disconnect();
  }, []);

  useEffect(() => {
    const c = ctxRef.current;
    if (!c || !ready) return;
    c.scene.background = new THREE.Color(theme.inset);
    (c.selBox.material as THREE.LineBasicMaterial).color.set(theme.brand);
    if (c.body) (c.body.material as THREE.MeshStandardMaterial).color.set(new THREE.Color(theme.raised).lerp(new THREE.Color(theme.muted), 0.55));
    if (c.edges) (c.edges.material as THREE.LineBasicMaterial).color.set(theme.muted);
    makeGrid(c, theme);
    if (c.grid) c.grid.visible = display.grid;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, ready]);

  /* ---- apply display settings to the scene -------------------------------- */

  useEffect(() => {
    const c = ctxRef.current;
    if (!c || !ready || !c.body) return;
    const m = c.body.material as THREE.MeshStandardMaterial;
    const solid = display.opacity >= 0.99;
    m.opacity = display.opacity;
    m.transparent = !solid;
    m.depthWrite = solid;
    m.side = solid ? THREE.DoubleSide : THREE.FrontSide;
    m.needsUpdate = true;
  }, [display.opacity, ready]);

  useEffect(() => {
    const c = ctxRef.current;
    if (!c || !ready || !c.body) return;
    if (display.edges && !c.edges) {
      const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(themeRef.current.muted), transparent: true, opacity: 0.45, depthWrite: false });
      c.edges = new THREE.LineSegments(new THREE.EdgesGeometry(c.body.geometry, 30), mat);
      c.body.add(c.edges);
    }
    if (c.edges) c.edges.visible = display.edges;
  }, [display.edges, ready]);

  useEffect(() => {
    const c = ctxRef.current;
    if (c?.grid) c.grid.visible = display.grid;
  }, [display.grid, ready]);

  useEffect(() => {
    const c = ctxRef.current;
    if (c) c.controls.autoRotate = display.autoRotate && !prefersReducedMotion();
  }, [display.autoRotate, ready]);

  useEffect(() => {
    const c = ctxRef.current;
    if (!c || !ready) return;
    c.sensors.forEach((rec, id) => (rec.mesh.visible = !hidden[id]));
    if (c.body) c.body.visible = !hidden.digital_twin_1;
  }, [hidden, ready]);

  useEffect(() => {
    const c = ctxRef.current;
    if (!c || !ready) return;
    c.sensors.forEach((rec, id) => {
      rec.material.emissiveIntensity = id === selected ? 0.55 : id === hovered ? 0.3 : 0;
    });
  }, [selected, hovered, ready]);

  useEffect(() => {
    const c = ctxRef.current;
    if (!c || !ready) return;
    const rec = selected ? c.sensors.get(selected) : undefined;
    if (rec) {
      c.selBox.visible = rec.mesh.visible;
      c.selBox.position.copy(rec.center);
      c.selSize = rec.size;
      c.selStart = performance.now();
    } else {
      c.selBox.visible = false;
    }
  }, [selected, hidden, ready]);

  /* ---- keyboard ------------------------------------------------------------ */

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const idx = '123456'.indexOf(e.key);
    if (idx >= 0 && e.key.length === 1) return setView(VIEWS[idx].id);
    if (e.key === '+' || e.key === '=') return dolly(0.75);
    if (e.key === '-' || e.key === '_') return dolly(1.33);
    if (e.key === 'f' || e.key === 'F') return fit();
    if (e.key === 'Escape') return select(null);
  };

  /* ---- render ---------------------------------------------------------------- */

  const cond = CONDITION[condition] ?? CONDITION.NORMAL;
  const selMeta = SENSORS.find((s) => s.id === selected);
  const selPos = selected && placements ? placements[selected] : null;
  const fmt = (n: number) => n.toFixed(1);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      {/* ------------------------------ Viewport ------------------------------ */}
      <div
        ref={wrapRef}
        tabIndex={0}
        role="group"
        aria-label="3D printer model. Keys 1 to 6 change the view, plus and minus zoom, F fits the model, Escape clears the selection."
        onKeyDown={onKeyDown}
        className="relative h-[420px] overflow-hidden rounded-lg border border-edge bg-surface-inset outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand sm:h-[540px] lg:h-[620px]"
      >
        <div ref={hostRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

        {/* Sensor pins */}
        {display.labels && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {SENSORS.map((s) => {
              const isSel = selected === s.id;
              const isHov = hovered === s.id;
              return (
                <div key={s.id} ref={(el) => { pinRefs.current[s.id] = el; }} className="absolute left-0 top-0" style={{ visibility: 'hidden', zIndex: isSel ? 2 : 1 }}>
                  <button
                    type="button"
                    aria-pressed={isSel}
                    aria-label={s.label}
                    onClick={() => select(isSel ? null : s.id)}
                    onMouseEnter={() => setHovered(s.id)}
                    onMouseLeave={() => setHovered((h) => (h === s.id ? null : h))}
                    className="pointer-events-auto flex items-center gap-1.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    style={{ marginLeft: -8, marginTop: -8 }}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 bg-surface-inset ${isSel ? 'border-brand' : ''}`}
                      style={isSel ? undefined : { borderColor: s.color }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
                    </span>
                    <span
                      className={`whitespace-nowrap rounded-md border bg-surface-raised px-2 py-0.5 text-xs ${
                        isSel ? 'border-brand text-txt-primary' : isHov ? 'border-edge-strong text-txt-primary' : 'border-edge text-txt-secondary'
                      }`}
                    >
                      {s.label}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Views */}
        <div className="absolute left-3 top-3 max-w-[calc(100%-4rem)] overflow-x-auto rounded-md border border-edge bg-surface-raised p-0.5">
          <div className="flex gap-0.5" role="group" aria-label="Camera view">
            {VIEWS.map((v, i) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                aria-pressed={activeView === v.id}
                title={`${v.label} view (${i + 1})`}
                className={`rounded px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand motion-reduce:transition-none ${
                  activeView === v.id ? 'bg-surface-hover text-txt-primary ring-1 ring-edge-strong' : 'text-txt-muted hover:text-txt-primary'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Zoom and framing */}
        <div className="absolute right-3 top-3 flex flex-col gap-1.5">
          <button type="button" className={iconBtn} onClick={() => dolly(0.75)} title="Zoom in (+)" aria-label="Zoom in">
            <Icon><path d="M8 3v10M3 8h10" /></Icon>
          </button>
          <button type="button" className={iconBtn} onClick={() => dolly(1.33)} title="Zoom out (-)" aria-label="Zoom out">
            <Icon><path d="M3 8h10" /></Icon>
          </button>
          <button type="button" className={iconBtn} onClick={fit} title="Fit model (F)" aria-label="Fit model to view">
            <Icon><path d="M3 6V3h3M10 3h3v3M13 10v3h-3M6 13H3v-3" /></Icon>
          </button>
          <button
            type="button"
            className={`${iconBtn} ${display.autoRotate ? 'border-brand text-txt-primary' : ''}`}
            onClick={() => patch({ autoRotate: !display.autoRotate })}
            aria-pressed={display.autoRotate}
            title="Auto-rotate"
            aria-label="Auto-rotate"
          >
            <Icon><path d="M13 8a5 5 0 1 1-1.5-3.5M13 2.5v3h-3" /></Icon>
          </button>
        </div>

        {/* Hint */}
        <p className={`pointer-events-none absolute bottom-14 left-3 max-w-[16rem] text-2xs text-txt-faint transition-opacity duration-500 motion-reduce:transition-none ${hintVisible && ready ? 'opacity-100' : 'opacity-0'}`}>
          Drag to rotate, scroll or pinch to zoom, right-drag to pan.
        </p>

        {/* Condition */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-md border border-edge bg-surface-raised px-2.5 py-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: cond.color }} />
          <span className="text-xs text-txt-muted">Condition</span>
          <span className="text-xs text-txt-primary">{cond.label}</span>
        </div>

        {/* Axis gizmo */}
        {display.axes && (
          <svg viewBox="0 0 100 100" className="pointer-events-none absolute bottom-3 right-3 h-[72px] w-[72px] text-txt-muted" aria-hidden="true">
            {['X', 'Y', 'Z'].map((l, i) => (
              <g key={l} ref={(el) => { gizmoRefs.current[i] = el; }}>
                <line x1="50" y1="50" x2="50" y2="50" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <text x="50" y="50" textAnchor="middle" fontSize="12" fontWeight="600" fill="currentColor">{l}</text>
              </g>
            ))}
          </svg>
        )}

        {/* Loading */}
        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-inset">
            <div className="flex flex-col items-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-edge border-t-brand motion-reduce:animate-none" />
              <p className="text-sm text-txt-secondary">
                Loading model{progress > 0 && <span className="tnum"> {progress}%</span>}
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-inset p-6">
            <div className="flex max-w-sm flex-col items-center gap-3 text-center">
              <p className="text-sm text-alert">{error}</p>
              <p className="text-xs text-txt-muted">Check that the file exists and is served from your public folder, then try again.</p>
              <button type="button" onClick={() => setReloadKey((n) => n + 1)} className="rounded-md border border-edge bg-surface-raised px-3 py-1.5 text-xs text-txt-primary hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                Try again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------ Side panel ----------------------------- */}
      <aside className="flex flex-col gap-5 overflow-y-auto rounded-lg border border-edge bg-surface-raised p-4 lg:h-[620px]">
        {/* Components */}
        <section>
          <h3 className="mb-2 text-sm font-medium text-txt-secondary">Components</h3>
          <ul className="flex flex-col gap-1">
            {SENSORS.map((s) => {
              const isSel = selected === s.id;
              const isHidden = hidden[s.id];
              return (
                <li key={s.id} className={`flex items-center gap-1 rounded-md border ${isSel ? 'border-brand bg-surface-hover' : 'border-transparent'}`}>
                  <button
                    type="button"
                    onClick={() => (isSel ? select(null) : pickFromList(s.id))}
                    onMouseEnter={() => setHovered(s.id)}
                    onMouseLeave={() => setHovered((h) => (h === s.id ? null : h))}
                    aria-pressed={isSel}
                    disabled={!ready || isHidden}
                    className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-2 py-2 text-left hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
                    <span className="truncate text-sm text-txt-primary">{s.label}</span>
                  </button>
                  <button
                    type="button"
                    className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded text-txt-muted hover:text-txt-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    onClick={() => {
                      setHidden((h) => ({ ...h, [s.id]: !h[s.id] }));
                      if (isSel && !isHidden) select(null);
                    }}
                    aria-pressed={isHidden}
                    aria-label={isHidden ? `Show ${s.label}` : `Hide ${s.label}`}
                    title={isHidden ? 'Show' : 'Hide'}
                  >
                    <Icon>
                      <path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" />
                      <circle cx="8" cy="8" r="1.8" />
                      {isHidden && <path d="M2 2l12 12" />}
                    </Icon>
                  </button>
                </li>
              );
            })}
            <li className="flex items-center gap-1 rounded-md border border-transparent">
              <div className="flex min-w-0 flex-1 items-center gap-2.5 px-2 py-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm border border-edge-strong bg-surface-inset" />
                <div className="min-w-0">
                  <p className="truncate text-sm text-txt-primary">Printer body</p>
                  {bodySize && (
                    <p className="tnum text-2xs text-txt-faint">
                      {Math.round(bodySize.x)} × {Math.round(bodySize.y)} × {Math.round(bodySize.z)} mm
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded text-txt-muted hover:text-txt-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                onClick={() => setHidden((h) => ({ ...h, digital_twin_1: !h.digital_twin_1 }))}
                aria-pressed={hidden.digital_twin_1}
                aria-label={hidden.digital_twin_1 ? 'Show printer body' : 'Hide printer body'}
                title={hidden.digital_twin_1 ? 'Show' : 'Hide'}
              >
                <Icon>
                  <path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" />
                  <circle cx="8" cy="8" r="1.8" />
                  {hidden.digital_twin_1 && <path d="M2 2l12 12" />}
                </Icon>
              </button>
            </li>
          </ul>
        </section>

        {/* Selection details */}
        <section className="border-t border-edge pt-4" aria-live="polite">
          <h3 className="mb-2 text-sm font-medium text-txt-secondary">Selected sensor</h3>
          {selMeta && selPos ? (
            <div className="rounded-md border border-edge bg-surface-inset p-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: selMeta.color }} />
                <span className="text-sm text-txt-primary">{selMeta.label}</span>
              </div>
              <p className="mt-1 text-xs text-txt-muted">{selMeta.measures}</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {(['x', 'y', 'z'] as const).map((axis) => (
                  <div key={axis} className="flex flex-col items-center gap-0.5">
                    <span className="text-2xs text-txt-muted">{axis.toUpperCase()}</span>
                    <span className="font-mono text-sm tnum text-txt-primary">{fmt(selPos[axis])}</span>
                  </div>
                ))}
              </div>
              <p className="mt-1 text-center text-2xs text-txt-faint">Position in mm, from the model origin</p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => focus(selMeta.id)} className="flex-1 rounded-md border border-edge bg-surface-raised px-3 py-1.5 text-xs text-txt-primary hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                  Focus
                </button>
                <button type="button" onClick={() => select(null)} className="flex-1 rounded-md border border-edge bg-surface-raised px-3 py-1.5 text-xs text-txt-secondary hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-txt-muted">Select a sensor in the model or the list to see where it sits on the printer.</p>
          )}
        </section>

        {/* Display */}
        <section className="border-t border-edge pt-4">
          <h3 className="mb-3 text-sm font-medium text-txt-secondary">Display</h3>
          <div className="flex flex-col gap-3.5">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="body-opacity" className="text-xs text-txt-secondary">Body opacity</label>
                <span className="flex items-center gap-2">
                  <button type="button" onClick={() => patch({ opacity: 1 })} className="text-2xs text-txt-muted hover:text-txt-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">Solid</button>
                  <button type="button" onClick={() => patch({ opacity: 0.2 })} className="text-2xs text-txt-muted hover:text-txt-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">X-ray</button>
                  <span className="tnum w-9 text-right text-xs text-txt-primary">{Math.round(display.opacity * 100)}%</span>
                </span>
              </div>
              <input
                id="body-opacity"
                type="range"
                min={0.05}
                max={1}
                step={0.05}
                value={display.opacity}
                onChange={(e) => patch({ opacity: Number(e.target.value) })}
                className="w-full accent-brand"
              />
            </div>
            <Switch label="Edges" checked={display.edges} onChange={(v) => patch({ edges: v })} />
            <Switch label="Grid" checked={display.grid} onChange={(v) => patch({ grid: v })} />
            <Switch label="Sensor labels" checked={display.labels} onChange={(v) => patch({ labels: v })} />
            <Switch label="Axis indicator" checked={display.axes} onChange={(v) => patch({ axes: v })} />
            <Switch label="Auto-rotate" checked={display.autoRotate} onChange={(v) => patch({ autoRotate: v })} />
          </div>
        </section>
      </aside>
    </div>
  );
}
