/**
 * js/camera.js
 * Smooth CAD/Map-grade camera rig:
 * - Exponential wheel/pinch zoom with inertia
 * - Zoom-to-cursor (point on desk/book plane under cursor stays anchored)
 * - Constrained pan within book bounds & polar angle above desk
 * - Double-tap / double-click smooth zoom to point, double-tap again to reset
 * - Interruptible transitions for overview, spread, and Focus Mode
 */

import * as THREE from 'three';

export class CameraRig {
  constructor(camera, domElement, callbacks = {}) {
    this.camera = camera;
    this.domElement = domElement;
    this.callbacks = callbacks; // { requestRender, onZoomDistanceChange }

    // Spherical orbit coordinates around `target`
    this.target = new THREE.Vector3(0, 0, 0);
    this.desiredTarget = new THREE.Vector3(0, 0, 0);

    this.spherical = new THREE.Spherical(4.2, 0.32, 0); // radius, phi (polar), theta (azimuth)
    this.desiredSpherical = new THREE.Spherical(4.2, 0.32, 0);

    this.minDistance = 1.05;
    this.maxDistance = 6.8;
    this.minPolarAngle = 0.05; // nearly top-down
    this.maxPolarAngle = Math.PI * 0.42; // never go below the desk
    this.panBounds = { x: 2.5, z: 1.9 };

    this.reducedMotion = false;
    this.isZoomedInByDoubleTap = false;

    // Pointer / Touch tracking
    this.isDragging = false;
    this.dragMode = 'pan'; // 'pan' or 'orbit'
    this.prevPointer = new THREE.Vector2();
    this.activePointers = new Map();
    this.prevPinchDist = 0;
    this.prevPinchCenter = new THREE.Vector2();
    this.lastTapTime = 0;

    // Raycaster for zoom-to-cursor on the book horizontal plane (y = 0)
    this.raycaster = new THREE.Raycaster();
    this.bookPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.setDefaultOverviewPose(true);
    this.bindEvents();
  }

  getDefaultPose() {
    const isPortrait = window.innerWidth <= 768 && window.innerHeight > window.innerWidth;
    return {
      target: new THREE.Vector3(0, 0, 0),
      radius: isPortrait ? 3.85 : 4.15,
      phi: isPortrait ? 0.14 : 0.30,
      theta: 0
    };
  }

  setDefaultOverviewPose(instant = false) {
    const pose = this.getDefaultPose();
    this.desiredTarget.copy(pose.target);
    this.desiredSpherical.set(pose.radius, pose.phi, pose.theta);
    this.isZoomedInByDoubleTap = false;

    if (instant || this.reducedMotion) {
      this.target.copy(this.desiredTarget);
      this.spherical.copy(this.desiredSpherical);
      this.applySphericalToCamera();
    }
    this.callbacks.requestRender?.();
  }

  /**
   * Intersects screen normalized device coordinates (-1..1) with horizontal book plane y=0.
   */
  intersectBookPlane(clientX, clientY) {
    const rect = this.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = new THREE.Vector3();
    const ok = this.raycaster.ray.intersectPlane(this.bookPlane, hit);
    return ok ? hit : null;
  }

  /**
   * Exponential zoom keeping the world point under (clientX, clientY) anchored.
   */
  zoomAtScreenPoint(zoomFactor, clientX, clientY) {
    const oldRadius = this.desiredSpherical.radius;
    const newRadius = THREE.MathUtils.clamp(oldRadius * zoomFactor, this.minDistance, this.maxDistance);
    const ratio = 1 - newRadius / oldRadius;

    const hitPoint = this.intersectBookPlane(clientX, clientY);
    if (hitPoint) {
      this.desiredTarget.x += (hitPoint.x - this.desiredTarget.x) * ratio;
      this.desiredTarget.z += (hitPoint.z - this.desiredTarget.z) * ratio;
      this.clampTargetBounds();
    }

    this.desiredSpherical.radius = newRadius;
    this.callbacks.requestRender?.();
  }

  zoomStep(factor) {
    const rect = this.domElement.getBoundingClientRect();
    this.zoomAtScreenPoint(factor, rect.left + rect.width * 0.5, rect.top + rect.height * 0.5);
  }

  clampTargetBounds() {
    this.desiredTarget.x = THREE.MathUtils.clamp(this.desiredTarget.x, -this.panBounds.x, this.panBounds.x);
    this.desiredTarget.z = THREE.MathUtils.clamp(this.desiredTarget.z, -this.panBounds.z, this.panBounds.z);
  }

  bindEvents() {
    // 1. Wheel / Trackpad pinch zoom
    this.domElement.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const delta = THREE.MathUtils.clamp(e.deltaY, -120, 120);
        const factor = Math.exp(delta * 0.0014);
        this.zoomAtScreenPoint(factor, e.clientX, e.clientY);
      },
      { passive: false }
    );

    // 2. Pointer Down
    this.domElement.addEventListener('pointerdown', (e) => {
      this.domElement.setPointerCapture(e.pointerId);
      this.activePointers.set(e.pointerId, new THREE.Vector2(e.clientX, e.clientY));

      if (this.activePointers.size === 1) {
        // Check double-tap / double-click
        const now = performance.now();
        if (now - this.lastTapTime < 280) {
          this.handleDoubleTap(e.clientX, e.clientY);
          this.lastTapTime = 0;
          return;
        }
        this.lastTapTime = now;

        this.isDragging = true;
        // Right-click or Shift/Alt orbits; left-click / 1-finger pans on overview
        this.dragMode = e.button === 2 || e.shiftKey || e.altKey ? 'orbit' : 'pan';
        this.prevPointer.set(e.clientX, e.clientY);
      } else if (this.activePointers.size === 2) {
        const pts = Array.from(this.activePointers.values());
        this.prevPinchDist = pts[0].distanceTo(pts[1]);
        this.prevPinchCenter.addVectors(pts[0], pts[1]).multiplyScalar(0.5);
      }
    });

    // 3. Pointer Move
    this.domElement.addEventListener('pointermove', (e) => {
      if (!this.activePointers.has(e.pointerId)) return;
      this.activePointers.set(e.pointerId, new THREE.Vector2(e.clientX, e.clientY));

      if (this.activePointers.size === 2) {
        const pts = Array.from(this.activePointers.values());
        const dist = pts[0].distanceTo(pts[1]);
        const center = new THREE.Vector2().addVectors(pts[0], pts[1]).multiplyScalar(0.5);

        if (this.prevPinchDist > 10) {
          const zoomFactor = this.prevPinchDist / dist;
          this.zoomAtScreenPoint(zoomFactor, center.x, center.y);
        }

        // Two-finger pan
        const dx = center.x - this.prevPinchCenter.x;
        const dy = center.y - this.prevPinchCenter.y;
        this.panByPixels(dx, dy);

        this.prevPinchDist = dist;
        this.prevPinchCenter.copy(center);
        return;
      }

      if (this.isDragging && this.activePointers.size === 1) {
        const dx = e.clientX - this.prevPointer.x;
        const dy = e.clientY - this.prevPointer.y;
        this.prevPointer.set(e.clientX, e.clientY);

        if (this.dragMode === 'orbit') {
          this.desiredSpherical.theta -= dx * 0.0055;
          this.desiredSpherical.phi = THREE.MathUtils.clamp(
            this.desiredSpherical.phi - dy * 0.0055,
            this.minPolarAngle,
            this.maxPolarAngle
          );
          this.callbacks.requestRender?.();
        } else {
          this.panByPixels(dx, dy);
        }
      }
    });

    // 4. Pointer Up / Cancel
    const onPointerUp = (e) => {
      this.activePointers.delete(e.pointerId);
      if (this.activePointers.size === 0) {
        this.isDragging = false;
      }
    };
    this.domElement.addEventListener('pointerup', onPointerUp);
    this.domElement.addEventListener('pointercancel', onPointerUp);
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  panByPixels(dx, dy) {
    const scale = this.desiredSpherical.radius * 0.00145;
    const cosT = Math.cos(this.desiredSpherical.theta);
    const sinT = Math.sin(this.desiredSpherical.theta);

    this.desiredTarget.x -= (dx * cosT + dy * sinT) * scale;
    this.desiredTarget.z -= (-dx * sinT + dy * cosT) * scale;
    this.clampTargetBounds();
    this.callbacks.requestRender?.();
  }

  handleDoubleTap(clientX, clientY) {
    if (this.isZoomedInByDoubleTap || this.desiredSpherical.radius < 2.2) {
      this.setDefaultOverviewPose(false);
    } else {
      const hit = this.intersectBookPlane(clientX, clientY);
      if (hit) {
        this.desiredTarget.set(hit.x, 0, hit.z);
        this.clampTargetBounds();
        this.desiredSpherical.radius = 1.85;
        this.desiredSpherical.phi = 0.22;
        this.isZoomedInByDoubleTap = true;
        this.callbacks.requestRender?.();
      }
    }
  }

  /**
   * Smoothly glides camera to frame a specific 3D hotspot region on a page.
   */
  glideToHotspot(worldTransform) {
    if (!worldTransform) return;
    this.desiredTarget.copy(worldTransform.center);
    this.clampTargetBounds();
    this.desiredSpherical.radius = Math.max(1.55, Math.max(worldTransform.width, worldTransform.height) * 1.65);
    this.desiredSpherical.phi = 0.36;
    this.desiredSpherical.theta = 0;
    this.callbacks.requestRender?.();
  }

  applySphericalToCamera() {
    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
  }

  update(dt) {
    const damping = this.reducedMotion ? 28.0 : 10.5;

    const prevX = this.target.x;
    const prevZ = this.target.z;
    const prevR = this.spherical.radius;
    const prevPhi = this.spherical.phi;
    const prevTheta = this.spherical.theta;

    this.target.x = THREE.MathUtils.damp(this.target.x, this.desiredTarget.x, damping, dt);
    this.target.y = THREE.MathUtils.damp(this.target.y, this.desiredTarget.y, damping, dt);
    this.target.z = THREE.MathUtils.damp(this.target.z, this.desiredTarget.z, damping, dt);

    this.spherical.radius = THREE.MathUtils.damp(this.spherical.radius, this.desiredSpherical.radius, damping, dt);
    this.spherical.phi = THREE.MathUtils.damp(this.spherical.phi, this.desiredSpherical.phi, damping, dt);
    this.spherical.theta = THREE.MathUtils.damp(this.spherical.theta, this.desiredSpherical.theta, damping, dt);

    this.applySphericalToCamera();
    this.callbacks.onZoomDistanceChange?.(this.spherical.radius);

    const deltaSum =
      Math.abs(this.target.x - this.desiredTarget.x) +
      Math.abs(this.target.z - this.desiredTarget.z) +
      Math.abs(this.spherical.radius - this.desiredSpherical.radius) +
      Math.abs(this.spherical.phi - this.desiredSpherical.phi) +
      Math.abs(this.spherical.theta - this.desiredSpherical.theta);

    const moved =
      Math.abs(prevX - this.target.x) +
      Math.abs(prevZ - this.target.z) +
      Math.abs(prevR - this.spherical.radius) +
      Math.abs(prevPhi - this.spherical.phi) +
      Math.abs(prevTheta - this.spherical.theta) >
      1e-5;

    return deltaSum > 0.0005 || moved;
  }
}