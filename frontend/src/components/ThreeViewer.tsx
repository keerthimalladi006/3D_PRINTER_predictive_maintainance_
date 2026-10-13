import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
// @ts-ignore - three/examples/jsm modules don't have type definitions
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
// @ts-ignore - three/examples/jsm modules don't have type definitions
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export type ComponentName = 'Accelerometer' | 'HumiditySensor' | 'Temperaturesensor' | 'digital_twin_1' | null;

interface ThreeViewerProps {
  modelPath: string;
  onComponentSelect?: (component: ComponentName) => void;
  selectedComponent?: ComponentName;
}

export function ThreeViewer({ modelPath, onComponentSelect, selectedComponent }: ThreeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const componentMeshesRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const originalVisibilityRef = useRef<Map<string, boolean>>(new Map());
  const originalCameraStateRef = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize Three.js
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      10000
    );
    camera.position.set(300, 300, 300);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 200, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      controls.dispose();
    };
  }, []);

  // Load GLB model
  useEffect(() => {
    const loader = new GLTFLoader();
    
    loader.load(
      modelPath,
      (gltf: GLTF) => {
        const model = gltf.scene;
        modelRef.current = model;
        
        // Store component meshes
        const componentMap = new Map<string, THREE.Object3D>();
        const visibilityMap = new Map<string, boolean>();
        
        model.traverse((child: THREE.Object3D) => {
          if (isMesh(child)) {
            // Store original visibility
            visibilityMap.set(child.uuid, child.visible);
            
            // Map to component name based on parent hierarchy
            const componentName = getComponentName(child);
            if (componentName) {
              componentMap.set(componentName, child);
            }
          }
        });
        
        componentMeshesRef.current = componentMap;
        originalVisibilityRef.current = visibilityMap;
        
        // Center and scale model
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        model.position.sub(center);
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 200 / maxDim;
        model.scale.setScalar(scale);
        
        // Save original camera state
        originalCameraStateRef.current = {
          position: cameraRef.current?.position.clone() || new THREE.Vector3(),
          target: controlsRef.current?.target.clone() || new THREE.Vector3(),
        };
        
        sceneRef.current?.add(model);
        setLoading(false);
        console.log('GLB loaded successfully:', componentMap.size, 'components found');
      },
      (progress: ProgressEvent) => {
        console.log('Loading progress:', (progress.loaded / progress.total * 100).toFixed(1) + '%');
      },
      (error: ErrorEvent) => {
        console.error('Error loading GLB:', error);
        setError('Failed to load 3D model');
        setLoading(false);
      }
    );
  }, [modelPath]);

  // Handle component selection and isolation
  useEffect(() => {
    if (!modelRef.current || !sceneRef.current) return;

    const model = modelRef.current;
    const componentMeshes = componentMeshesRef.current;
    const originalVisibility = originalVisibilityRef.current;

    if (selectedComponent === null) {
      // Restore full model
      model.traverse((child: THREE.Object3D) => {
        if (isMesh(child)) {
          child.visible = originalVisibility.get(child.uuid as string) ?? true;
        }
      });
      
      // Restore camera
      if (originalCameraStateRef.current && cameraRef.current && controlsRef.current) {
        cameraRef.current.position.copy(originalCameraStateRef.current.position);
        controlsRef.current.target.copy(originalCameraStateRef.current.target);
      }
    } else {
      // Isolate selected component
      model.traverse((child: THREE.Object3D) => {
        if (isMesh(child)) {
          const componentName = getComponentName(child);
          child.visible = componentName === selectedComponent;
        }
      });
      
      // Frame camera on selected component
      const componentMesh = componentMeshes.get(selectedComponent || '');
      if (componentMesh && cameraRef.current && controlsRef.current) {
        const box = new THREE.Box3().setFromObject(componentMesh);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        
        const distance = maxDim * 2;
        cameraRef.current.position.set(
          center.x + distance,
          center.y + distance,
          center.z + distance
        );
        controlsRef.current.target.copy(center);
        controlsRef.current.update();
      }
    }
  }, [selectedComponent]);

  // Handle click detection
  const handleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !cameraRef.current || !sceneRef.current || !modelRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);

    const intersects = raycaster.intersectObjects(modelRef.current.children, true);

    if (intersects.length > 0) {
      const clickedObject = intersects[0].object;
      const componentName = getComponentName(clickedObject);
      
      if (componentName) {
        // Toggle: if already selected, deselect
        if (selectedComponent === componentName) {
          onComponentSelect?.(null);
        } else {
          onComponentSelect?.(componentName);
        }
      }
    }
  }, [selectedComponent, onComponentSelect]);

  // Reset camera
  const resetCamera = useCallback(() => {
    if (originalCameraStateRef.current && cameraRef.current && controlsRef.current) {
      cameraRef.current.position.copy(originalCameraStateRef.current.position);
      controlsRef.current.target.copy(originalCameraStateRef.current.target);
      controlsRef.current.update();
    }
    onComponentSelect?.(null);
  }, [onComponentSelect]);

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className="w-full h-full cursor-pointer"
        onClick={handleClick}
        style={{ minHeight: '500px' }}
      />
      
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-inset">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand mb-2"></div>
            <p className="text-sm text-txt-secondary">Loading 3D model...</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-inset">
          <div className="text-center">
            <p className="text-sm text-alert">{error}</p>
          </div>
        </div>
      )}
      
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={resetCamera}
          className="px-3 py-1.5 bg-surface-raised border border-edge rounded-md text-xs text-txt-secondary hover:bg-surface-hover transition-colors"
        >
          Reset Camera
        </button>
        {selectedComponent && (
          <button
            onClick={() => onComponentSelect?.(null)}
            className="px-3 py-1.5 bg-surface-raised border border-edge rounded-md text-xs text-txt-secondary hover:bg-surface-hover transition-colors"
          >
            Restore Full Model
          </button>
        )}
      </div>
      
      {selectedComponent && (
        <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-surface-raised border border-edge rounded-md">
          <p className="text-xs text-txt-secondary">
            Selected: <span className="text-txt-primary font-medium">{selectedComponent}</span>
          </p>
        </div>
      )}
    </div>
  );
}

// Helper function to check if object is a mesh
function isMesh(object: THREE.Object3D): object is THREE.Mesh {
  return (object as THREE.Mesh).isMesh === true;
}

// Helper function to get component name from object
function getComponentName(object: THREE.Object3D): ComponentName {
  const name = object.name || object.parent?.name || '';
  
  if (name.includes('Accelerometer')) return 'Accelerometer';
  if (name.includes('HumiditySensor')) return 'HumiditySensor';
  if (name.includes('Temperaturesensor')) return 'Temperaturesensor';
  if (name.includes('digital_twin_1')) return 'digital_twin_1';
  
  return null;
}
