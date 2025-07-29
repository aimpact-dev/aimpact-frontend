import * as THREE from 'three';

interface SceneSettings {
  wireframe: boolean;
  rotationSpeed: number;
  backgroundColor: string;
  enableAnimation: boolean;
}

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private cube: THREE.Mesh;
  private animationId: number = 0;

  // FPS tracking
  private frameCount: number = 0;
  private lastTime: number = 0;
  private fps: number = 0;
  private fpsElement: HTMLElement;

  // Settings
  private settings: SceneSettings = {
    wireframe: false,
    rotationSpeed: 0.01,
    backgroundColor: '#1a1a1a',
    enableAnimation: true
  };

  constructor() {
    this.initScene();
    this.initUI();
    this.setupEventListeners();
    this.animate();
  }

  private initScene(): void {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.settings.backgroundColor);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 5;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    document.body.appendChild(this.renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    // Create a cube
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshLambertMaterial({
      color: 0x00ff00,
      wireframe: this.settings.wireframe
    });
    this.cube = new THREE.Mesh(geometry, material);
    this.cube.castShadow = true;
    this.scene.add(this.cube);

    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(10, 10);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  private initUI(): void {
    // FPS Counter
    this.fpsElement = document.createElement('div');
    this.fpsElement.id = 'fps-counter';
    this.fpsElement.textContent = 'FPS: 0';
    document.body.appendChild(this.fpsElement);

    // Settings Panel
    const settingsPanel = document.createElement('div');
    settingsPanel.id = 'settings-panel';
    settingsPanel.innerHTML = `
      <h3>Settings</h3>
      <div class="setting-item">
        <label>
          <input type="checkbox" id="wireframe" ${this.settings.wireframe ? 'checked' : ''}>
          Wireframe Mode
        </label>
      </div>
      <div class="setting-item">
        <label>
          Animation Speed: <span id="speed-value">${this.settings.rotationSpeed.toFixed(3)}</span>
        </label>
        <input type="range" id="rotation-speed" min="0" max="0.05" step="0.001" value="${this.settings.rotationSpeed}">
      </div>
      <div class="setting-item">
        <label>
          Background Color:
        </label>
        <input type="color" id="bg-color" value="${this.settings.backgroundColor}">
      </div>
      <div class="setting-item">
        <label>
          <input type="checkbox" id="enable-animation" ${this.settings.enableAnimation ? 'checked' : ''}>
          Enable Animation
        </label>
      </div>
      <button id="reset-button">Reset Scene</button>
    `;
    document.body.appendChild(settingsPanel);
  }

  private setupEventListeners(): void {
    // Window resize
    window.addEventListener('resize', () => this.onWindowResize());

    // Settings controls
    const wireframeToggle = document.getElementById('wireframe') as HTMLInputElement;
    wireframeToggle?.addEventListener('change', (e) => {
      this.settings.wireframe = (e.target as HTMLInputElement).checked;
      (this.cube.material as THREE.MeshLambertMaterial).wireframe = this.settings.wireframe;
    });

    const speedSlider = document.getElementById('rotation-speed') as HTMLInputElement;
    const speedValue = document.getElementById('speed-value');
    speedSlider?.addEventListener('input', (e) => {
      this.settings.rotationSpeed = parseFloat((e.target as HTMLInputElement).value);
      if (speedValue) speedValue.textContent = this.settings.rotationSpeed.toFixed(3);
    });

    const bgColorPicker = document.getElementById('bg-color') as HTMLInputElement;
    bgColorPicker?.addEventListener('change', (e) => {
      this.settings.backgroundColor = (e.target as HTMLInputElement).value;
      this.scene.background = new THREE.Color(this.settings.backgroundColor);
    });

    const animationToggle = document.getElementById('enable-animation') as HTMLInputElement;
    animationToggle?.addEventListener('change', (e) => {
      this.settings.enableAnimation = (e.target as HTMLInputElement).checked;
    });

    const resetButton = document.getElementById('reset-button');
    resetButton?.addEventListener('click', () => this.resetScene());
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateFPS(): void {
    this.frameCount++;
    const currentTime = performance.now();

    if (currentTime - this.lastTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
      this.fpsElement.textContent = `FPS: ${this.fps}`;
      this.frameCount = 0;
      this.lastTime = currentTime;
    }
  }

  private resetScene(): void {
    this.cube.rotation.set(0, 0, 0);
    this.cube.position.set(0, 0, 0);
    this.camera.position.set(0, 0, 5);
    this.camera.lookAt(0, 0, 0);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    if (this.settings.enableAnimation) {
      this.cube.rotation.x += this.settings.rotationSpeed;
      this.cube.rotation.y += this.settings.rotationSpeed;
    }

    this.updateFPS();
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.renderer.dispose();

    // Clean up geometries and materials
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (object.material instanceof THREE.Material) {
          object.material.dispose();
        }
      }
    });
  }
}

// Initialize the scene when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new SceneManager();
});
