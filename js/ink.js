/**
 * js/ink.js
 * Shared ink-wireframe / paper-craft visual system:
 * - Off-white paper materials with procedural cross-hatching
 * - Crisp black ink outlines (EdgesGeometry + LineSegments)
 * - Thin translucent glass material
 * - Printed-style Arabic 3D labels (Amiri / Cairo canvas sprites)
 * - Footprint dimming plane & Lift-Off animation controller
 */

import * as THREE from 'three';

export class InkSystem {
  constructor(renderer) {
    this.renderer = renderer;
    this.hatchTexture = this.createCrossHatchTexture();
    this.sharedMaterials = this.createSharedMaterials();
  }

  /**
   * Generates a procedural seamless cross-hatching canvas texture for shaded paper surfaces.
   */
  createCrossHatchTexture() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#faf6ee';
    ctx.fillRect(0, 0, size, size);

    // Primary diagonal ink hatch lines
    ctx.strokeStyle = 'rgba(30, 36, 43, 0.13)';
    ctx.lineWidth = 1.2;
    const step = 16;
    ctx.beginPath();
    for (let i = -size; i < size * 2; i += step) {
      ctx.moveTo(i, 0);
      ctx.lineTo(i + size, size);
    }
    ctx.stroke();

    // Secondary subtle cross-hatch
    ctx.strokeStyle = 'rgba(30, 36, 43, 0.06)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    for (let i = -size; i < size * 2; i += step * 2) {
      ctx.moveTo(i, size);
      ctx.lineTo(i + size, 0);
    }
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  createSharedMaterials() {
    return {
      paper: new THREE.MeshStandardMaterial({
        color: 0xfaf6ee,
        map: this.hatchTexture,
        roughness: 0.86,
        metalness: 0.02,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1
      }),
      paperWarm: new THREE.MeshStandardMaterial({
        color: 0xf3ece0,
        roughness: 0.88,
        metalness: 0.01
      }),
      inkLine: new THREE.LineBasicMaterial({
        color: 0x1a2026,
        transparent: true,
        opacity: 0.92
      }),
      inkDashed: new THREE.LineDashedMaterial({
        color: 0x2c353f,
        dashSize: 0.035,
        gapSize: 0.022,
        transparent: true,
        opacity: 0.8
      }),
      glass: new THREE.MeshPhysicalMaterial({
        color: 0xeef5fa,
        transparent: true,
        opacity: 0.34,
        roughness: 0.15,
        metalness: 0.05,
        transmission: 0.45,
        depthWrite: false
      }),
      accentRed: new THREE.MeshStandardMaterial({
        color: 0xd93829,
        roughness: 0.55,
        metalness: 0.08
      }),
      accentBlue: new THREE.MeshStandardMaterial({
        color: 0x1d5b8c,
        roughness: 0.55,
        metalness: 0.08
      }),
      accentOrange: new THREE.MeshStandardMaterial({
        color: 0xdf6426,
        roughness: 0.62,
        metalness: 0.05
      }),
      accentGreen: new THREE.MeshStandardMaterial({
        color: 0x1a8c5b,
        roughness: 0.5,
        metalness: 0.08
      })
    };
  }

  /**
   * Wraps any BufferGeometry in a paper-craft mesh with crisp black ink outlines.
   */
  createPaperMesh(geometry, material = this.sharedMaterials.paper, edgeThresholdAngle = 18) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const edgesGeo = new THREE.EdgesGeometry(geometry, edgeThresholdAngle);
    const outline = new THREE.LineSegments(edgesGeo, this.sharedMaterials.inkLine.clone());
    outline.userData.isInkOutline = true;
    mesh.add(outline);

    return mesh;
  }

  /**
   * Creates a dimming footprint overlay right on top of the printed figure area
   * so the printed figure looks like it lifted off the page.
   */
  createFootprintPad(width, height) {
    const group = new THREE.Group();

    const geo = new THREE.PlaneGeometry(width, height);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xf4efe4,
      transparent: true,
      opacity: 0.0,
      depthWrite: false
    });
    const pad = new THREE.Mesh(geo, mat);
    pad.position.y = 0.003;
    group.add(pad);

    // Subtle ink frame border around the lifted footprint
    const hw = width * 0.5;
    const hh = height * 0.5;
    const borderPts = [
      new THREE.Vector3(-hw, 0.004, -hh),
      new THREE.Vector3(hw, 0.004, -hh),
      new THREE.Vector3(hw, 0.004, hh),
      new THREE.Vector3(-hw, 0.004, hh),
      new THREE.Vector3(-hw, 0.004, -hh)
    ];
    const borderGeo = new THREE.BufferGeometry().setFromPoints(borderPts);
    const borderLine = new THREE.Line(borderGeo, this.sharedMaterials.inkDashed.clone());
    borderLine.computeLineDistances();
    group.add(borderLine);

    group.userData.padMaterial = mat;
    group.userData.borderMaterial = borderLine.material;
    return group;
  }

  /**
   * Creates a crisp printed-style Arabic or symbolic 3D sprite label.
   */
  createPrintedLabel(text, options = {}) {
    const {
      bgColor = 'rgba(250, 246, 238, 0.94)',
      textColor = '#1e242b',
      borderColor = 'rgba(30, 36, 43, 0.32)',
      scale = 0.24,
      fontSize = 36
    } = options;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const fontStr = `bold ${fontSize}px 'Amiri', 'Cairo', sans-serif`;
    ctx.font = fontStr;

    const metrics = ctx.measureText(text);
    const padX = 28;
    const padY = 18;
    const w = Math.ceil(metrics.width + padX * 2);
    const h = Math.ceil(fontSize * 1.45 + padY);

    canvas.width = THREE.MathUtils.ceilPowerOfTwo(w);
    canvas.height = THREE.MathUtils.ceilPowerOfTwo(h);

    const drawX = (canvas.width - w) * 0.5;
    const drawY = (canvas.height - h) * 0.5;

    // Pill background
    ctx.fillStyle = bgColor;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3;
    const r = 16;
    ctx.beginPath();
    ctx.roundRect(drawX, drawY, w, h, r);
    ctx.fill();
    ctx.stroke();

    // Printed Arabic text
    ctx.font = fontStr;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width * 0.5, canvas.height * 0.5 + 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;

    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });
    const sprite = new THREE.Sprite(mat);
    const aspect = canvas.width / canvas.height;
    sprite.scale.set(scale * aspect, scale, 1);
    sprite.renderOrder = 10;

    sprite.userData.updateText = (newText) => {
      if (sprite.userData.lastText === newText) return;
      sprite.userData.lastText = newText;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = bgColor;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(drawX, drawY, w, h, r);
      ctx.fill();
      ctx.stroke();
      ctx.font = fontStr;
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(newText, canvas.width * 0.5, canvas.height * 0.5 + 2);
      texture.needsUpdate = true;
    };

    return sprite;
  }

  /**
   * Applies the ~1.2s lift-off animation progress (0 = flat on page, 1 = fully extruded with slight overshoot).
   */
  applyLiftProgress(modelRoot, footprintPad, progress) {
    // Soft easeOutBack with subtle overshoot
    const c1 = 1.70158;
    const c3 = c1 + 1;
    const t = THREE.MathUtils.clamp(progress, 0, 1);
    const easeOutBack = t === 0 ? 0 : t === 1 ? 1 : 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);

    modelRoot.scale.set(1, Math.max(0.001, easeOutBack), 1);
    modelRoot.position.y = THREE.MathUtils.lerp(-0.01, 0.015, t);

    if (footprintPad) {
      footprintPad.userData.padMaterial.opacity = t * 0.62;
      footprintPad.userData.borderMaterial.opacity = t * 0.75;
    }
  }
}