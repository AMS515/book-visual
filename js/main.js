/**
 * js/main.js
 * Application bootstrap, lighting & soft shadow setup, Focus Mode 3D model lift-off,
 * direct 3D manipulation raycasting, and physics fixed-timestep integration.
 */

import * as THREE from 'three';
import { Textbook3D } from './book.js';
import { CameraRig } from './camera.js';
import { HUDController } from './hud.js';
import { InkSystem } from './ink.js';
import dipoleModule from './physics/ch4_p8_q1_dipole_generation.js';

// Map of registered physics modules (Stage 2 includes Page 8 & Page 9 dipole generation; Stage 3 adds the rest)
const PHYSICS_MODULES = {
  ch4_p8_q1_dipole_generation: dipoleModule,
  ch4_p9_q1_dipole_detachment: dipoleModule
};

class InteractiveTextbookApp {
  constructor() {
    this.canvas = document.getElementById('book-canvas');
    this.focusHeader = document.getElementById('focus-header');
    this.focusQuestionTitle = document.getElementById('focus-question-title');
    this.btnExitFocus = document.getElementById('btn-exit-focus');

    this.needsRender = true;
    this.focusModeActive = false;
    this.activeQuestion = null;
    this.clock = new THREE.Clock();

    // Active 3D Focus Model state
    this.activeSim = null; // { moduleDef, state, instance, rootGroup, footprintPad, liftProgress, foldingBack }
    this.raycaster = new THREE.Raycaster();
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    this.isDragging3DHandle = false;

    this.initRendererAndScene();
    this.initLights();
    this.initComponents();
    this.bindGlobalEvents();
    this.bindDirect3DManipulation();
    this.startLoop();
  }

  initRendererAndScene() {
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        powerPreference: 'high-performance'
      });
    } catch (_) {
      document.getElementById('webgl-alert').classList.remove('hidden');
      throw new Error('WebGL not supported');
    }

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.04;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xe4ded5);

    this.camera = new THREE.PerspectiveCamera(
      38,
      window.innerWidth / window.innerHeight,
      0.1,
      40
    );

    this.ink = new InkSystem(this.renderer);
  }

  initLights() {
    const hemiLight = new THREE.HemisphereLight(0xfffcf5, 0xd5cbbd, 0.88);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfff8eb, 1.35);
    dirLight.position.set(2.8, 5.2, 2.6);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 1.0;
    dirLight.shadow.camera.far = 14.0;
    const d = 3.4;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0004;
    dirLight.shadow.normalBias = 0.015;
    this.scene.add(dirLight);
  }

  initComponents() {
    this.cameraRig = new CameraRig(this.camera, this.canvas, {
      requestRender: () => this.requestRender(),
      onZoomDistanceChange: (dist) => this.book?.checkHighResSwap(dist)
    });

    this.book = new Textbook3D(this.scene, this.renderer, {
      requestRender: () => this.requestRender(),
      onLoadingChange: (loading) => this.hud?.setLoading(loading),
      onSpreadChange: (info) => this.hud?.updatePageIndicator(info)
    });

    this.hud = new HUDController(this.book, this.cameraRig, {
      requestRender: () => this.requestRender(),
      onSelectQuestion: (q) => this.enterFocusMode(q),
      onResetQuestionState: () => this.resetActiveQuestionState(),
      onResetView: () => {
        if (this.focusModeActive && this.activeQuestion) {
          const tf = this.book.getHotspotWorldTransform(this.activeQuestion.hotspot);
          this.cameraRig.glideToHotspot(tf);
        } else {
          this.book.targetCurvature = this.book.singlePageMode ? 0.0 : 1.0;
          this.cameraRig.setDefaultOverviewPose(false);
        }
      }
    });

    this.hud.updatePageIndicator(this.book.getCurrentVisiblePagesInfo());
  }

  /**
   * Enters Focus Mode: flattens book, glides camera, dims figure footprint, and lifts 3D model.
   */
  enterFocusMode(question) {
    this.cleanupActiveSim();

    this.focusModeActive = true;
    this.activeQuestion = question;
    this.focusQuestionTitle.textContent = question.source.printedTitle;
    this.focusHeader.classList.remove('hidden');

    // 1. Flatten book curvature to 0
    this.book.targetCurvature = 0.0;

    // 2. Glide camera above the figure hotspot
    const tf = this.book.getHotspotWorldTransform(question.hotspot);
    this.cameraRig.glideToHotspot(tf);

    // 3. Build 3D simulation if registered
    const moduleDef = PHYSICS_MODULES[question.id];
    if (moduleDef && tf) {
      const state = {};
      for (const c of moduleDef.controls || []) {
        state[c.id] = c.default;
      }
      // If opened from Page 9 hotspot, start directly on Stage 04 (polarity reversal & detachment)
      if (question.id === 'ch4_p9_q1_dipole_detachment') {
        state.stagePreset = 4;
        state.phaseDeg = 215;
      }

      const rootGroup = new THREE.Group();
      rootGroup.position.set(tf.center.x, 0.005, tf.center.z);
      this.scene.add(rootGroup);

      const footprintPad = this.ink.createFootprintPad(tf.width, tf.height);
      footprintPad.position.set(tf.center.x, 0.002, tf.center.z);
      this.scene.add(footprintPad);

      const instance = moduleDef.build(THREE, rootGroup, { ink: this.ink });
      const out = moduleDef.solve(state);
      instance.update(state, out, 0);

      this.activeSim = {
        moduleDef,
        state,
        instance,
        rootGroup,
        footprintPad,
        liftProgress: 0.0,
        foldingBack: false
      };

      this.hud.showFocusPanels(moduleDef, state, () => {
        this.updateSimState(0);
      });
      this.hud.updateLiveReadouts(out);
    }

    this.requestRender();
  }

  resetActiveQuestionState() {
    if (!this.activeSim) return;
    const { moduleDef, state } = this.activeSim;
    for (const c of moduleDef.controls || []) {
      state[c.id] = c.default;
    }
    this.hud.syncControlsFromState(state);
    this.updateSimState(0);
  }

  updateSimState(dt) {
    if (!this.activeSim) return;
    const { moduleDef, state, instance } = this.activeSim;
    const out = moduleDef.solve(state);
    instance.update(state, out, dt);
    this.hud.updateLiveReadouts(out);
    this.requestRender();
  }

  cleanupActiveSim() {
    if (!this.activeSim) return;
    this.activeSim.instance?.dispose?.();
    this.scene.remove(this.activeSim.rootGroup);
    this.scene.remove(this.activeSim.footprintPad);
    this.activeSim = null;
  }

  exitFocusMode() {
    if (!this.focusModeActive) return;
    this.focusModeActive = false;
    this.activeQuestion = null;
    this.focusHeader.classList.add('hidden');
    this.hud.hideFocusPanels();

    if (this.activeSim) {
      this.activeSim.foldingBack = true;
    }

    this.book.targetCurvature = this.book.singlePageMode ? 0.0 : 1.0;
    this.cameraRig.setDefaultOverviewPose(false);
    this.requestRender();
  }

  /**
   * Direct 3D manipulation inside the scene (dragging charges / handles updates drawer state).
   */
  bindDirect3DManipulation() {
    this.canvas.addEventListener(
      'pointerdown',
      (e) => {
        if (!this.focusModeActive || !this.activeSim?.instance?.draggableMeshes) return;
        const rect = this.canvas.getBoundingClientRect();
        const ndc = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        this.raycaster.setFromCamera(ndc, this.camera);
        const hits = this.raycaster.intersectObjects(this.activeSim.instance.draggableMeshes, true);
        if (hits.length > 0) {
          e.stopImmediatePropagation();
          this.isDragging3DHandle = true;
          this.dragPlane.setFromNormalAndCoplanarPoint(
            new THREE.Vector3(0, 0, 1),
            hits[0].point
          );
          this.canvas.style.cursor = 'ns-resize';
        }
      },
      true
    );

    window.addEventListener(
      'pointermove',
      (e) => {
        if (!this.isDragging3DHandle || !this.activeSim) return;
        e.stopImmediatePropagation();
        const rect = this.canvas.getBoundingClientRect();
        const ndc = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        this.raycaster.setFromCamera(ndc, this.camera);
        const worldPt = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(this.dragPlane, worldPt)) {
          const localPt = this.activeSim.rootGroup.worldToLocal(worldPt.clone());
          this.activeSim.instance.onDrag?.(localPt, this.activeSim.state);
          this.hud.syncControlsFromState(this.activeSim.state);
          this.updateSimState(0);
        }
      },
      true
    );

    window.addEventListener(
      'pointerup',
      () => {
        if (this.isDragging3DHandle) {
          this.isDragging3DHandle = false;
          this.canvas.style.cursor = 'grab';
        }
      },
      true
    );
  }

  bindGlobalEvents() {
    this.btnExitFocus.addEventListener('click', () => this.exitFocusMode());

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.book.updateBookLayout();
      this.requestRender();
    });

    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.key === 'ArrowLeft') {
        if (!this.focusModeActive) this.book.turnNext();
      } else if (e.key === 'ArrowRight') {
        if (!this.focusModeActive) this.book.turnPrev();
      } else if (e.key === 'Escape') {
        this.exitFocusMode();
        document.getElementById('toc-modal')?.classList.add('hidden');
      } else if (e.key === '+' || e.key === '=') {
        this.cameraRig.zoomStep(0.82);
      } else if (e.key === '-' || e.key === '_') {
        this.cameraRig.zoomStep(1.22);
      } else if (e.key.toLowerCase() === 'r') {
        this.exitFocusMode();
        this.cameraRig.setDefaultOverviewPose(false);
      }
    });

    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      document.getElementById('webgl-alert').classList.remove('hidden');
    });
    document.getElementById('btn-webgl-recover').addEventListener('click', () => {
      window.location.reload();
    });
  }

  requestRender() {
    this.needsRender = true;
  }

  startLoop() {
    const tick = () => {
      requestAnimationFrame(tick);
      const dt = Math.min(this.clock.getDelta(), 0.05);

      const camDirty = this.cameraRig.update(dt);
      const bookDirty = this.book.update(dt);
      let simDirty = false;

      if (this.activeSim) {
        const { moduleDef, state, instance, rootGroup, footprintPad } = this.activeSim;

        // Animate lift-off (1.2s) or fold-back (0.45s)
        if (!this.activeSim.foldingBack && this.activeSim.liftProgress < 1.0) {
          this.activeSim.liftProgress = Math.min(1.0, this.activeSim.liftProgress + dt / 1.15);
          this.ink.applyLiftProgress(rootGroup, footprintPad, this.activeSim.liftProgress);
          simDirty = true;
        } else if (this.activeSim.foldingBack) {
          this.activeSim.liftProgress = Math.max(0.0, this.activeSim.liftProgress - dt / 0.45);
          this.ink.applyLiftProgress(rootGroup, footprintPad, this.activeSim.liftProgress);
          simDirty = true;
          if (this.activeSim.liftProgress <= 0.001) {
            this.cleanupActiveSim();
          }
        }

        // Step time-based oscillation
        if (this.activeSim && !this.activeSim.foldingBack && moduleDef.step) {
          const out = moduleDef.solve(state);
          if (moduleDef.step(state, out, dt)) {
            const newOut = moduleDef.solve(state);
            instance.update(state, newOut, dt);
            this.hud.syncControlsFromState(state);
            this.hud.updateLiveReadouts(newOut);
            simDirty = true;
          }
        }
      }

      if (this.needsRender || camDirty || bookDirty || simDirty) {
        this.renderer.render(this.scene, this.camera);
        this.hud.updateHotspotProjections(this.camera, this.focusModeActive);
        this.needsRender = false;
      }
    };
    requestAnimationFrame(tick);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new InteractiveTextbookApp();
});