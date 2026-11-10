/**
 * js/book.js
 * 3D Hardcover RTL Arabic Book with cylindrical spine curvature, dynamic page-block thickness,
 * smooth page curl turning, lazy texture management, high-res crossfade, and RTL hotspots.
 */

import * as THREE from 'three';
import { BOOK_CONFIG, PAGES_MANIFEST, QUESTIONS_REGISTRY } from './registry.js';

export class Textbook3D {
  constructor(scene, renderer, callbacks = {}) {
    this.scene = scene;
    this.renderer = renderer;
    this.callbacks = callbacks; // { onLoadingChange, onSpreadChange, onHotspotSelect, requestRender }

    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.textureLoader = new THREE.TextureLoader();

    // Cache of loaded textures: Map<seqPage, { low: Texture, hi: Texture, isHiActive: boolean }>
    this.textureCache = new Map();

    // Mode: false = two-page spread (desktop/landscape), true = single page (mobile portrait)
    this.singlePageMode = window.innerWidth <= 768 && window.innerHeight > window.innerWidth;

    // Spread index:
    // Spread 0: Right page = seqPage 1 (Cover)
    // Spread 1: Right page = seqPage 2 (p.4), Left page = seqPage 3 (p.5)
    // Spread 2: Right page = seqPage 4 (p.6), Left page = seqPage 5 (p.7)
    // Spread 3: Right page = seqPage 6 (p.8), Left page = seqPage 7 (p.9)
    // Spread 4: Right page = seqPage 8 (p.11), Left page = seqPage 9 (p.12)
    // Spread 5: Right page = seqPage 10 (p.13)
    this.spreads = this.buildSpreadsList();
    this.currentSpreadIndex = 0;
    this.currentSinglePageSeq = 1;

    // Spine curvature: 1 = natural resting curve, 0 = flat (Focus Mode or mobile portrait)
    this.curvature = this.singlePageMode ? 0.0 : BOOK_CONFIG.restingCurvature;
    this.targetCurvature = this.curvature;

    // Turning animation state
    this.turnState = {
      active: false,
      direction: 1, // +1 next (RTL: left-to-right curl), -1 prev
      progress: 0,
      duration: 0.68,
      fromSpread: 0,
      toSpread: 0
    };

    this.buildDeskAndEnvironment();
    this.buildBookStructure();
    this.updateBookLayout();
  }

  buildSpreadsList() {
    const spreads = [];
    // Spread 0: Cover on right side
    spreads.push({ rightSeq: 1, leftSeq: null });
    for (let seq = 2; seq <= PAGES_MANIFEST.length; seq += 2) {
      spreads.push({
        rightSeq: seq,
        leftSeq: seq + 1 <= PAGES_MANIFEST.length ? seq + 1 : null
      });
    }
    return spreads;
  }

  buildDeskAndEnvironment() {
    // Matte wooden/warm desk plane receiving soft shadows
    const deskGeo = new THREE.PlaneGeometry(28, 22);
    const deskMat = new THREE.MeshStandardMaterial({
      color: 0xdfd8ce,
      roughness: 0.92,
      metalness: 0.02
    });
    this.deskMesh = new THREE.Mesh(deskGeo, deskMat);
    this.deskMesh.rotation.x = -Math.PI / 2;
    this.deskMesh.position.y = -0.09;
    this.deskMesh.receiveShadow = true;
    this.scene.add(this.deskMesh);
  }

  buildBookStructure() {
    const { pageWidth: W, pageHeight: H, pageSegmentsX: SX, pageSegmentsY: SY } = BOOK_CONFIG;

    // 1. Hardcover boards (Right board, Left board, Spine bridge)
    const coverMat = new THREE.MeshStandardMaterial({
      color: 0x1b2d42,
      roughness: 0.72,
      metalness: 0.08
    });

    const boardW = W + 0.08;
    const boardH = H + 0.10;
    const boardT = 0.024;

    this.rightCover = new THREE.Mesh(new THREE.BoxGeometry(boardW, boardT, boardH), coverMat);
    this.rightCover.position.set(boardW * 0.5 + 0.01, -0.055, 0);
    this.rightCover.castShadow = true;
    this.rightCover.receiveShadow = true;
    this.root.add(this.rightCover);

    this.leftCover = new THREE.Mesh(new THREE.BoxGeometry(boardW, boardT, boardH), coverMat);
    this.leftCover.position.set(-boardW * 0.5 - 0.01, -0.055, 0);
    this.leftCover.castShadow = true;
    this.leftCover.receiveShadow = true;
    this.root.add(this.leftCover);

    this.spineCover = new THREE.Mesh(new THREE.BoxGeometry(0.11, boardT, boardH), coverMat);
    this.spineCover.position.set(0, -0.058, 0);
    this.spineCover.castShadow = true;
    this.root.add(this.spineCover);

    // 2. Stacked page-block edges on Right and Left (thickness changes as you progress)
    const blockMat = new THREE.MeshStandardMaterial({
      color: 0xf4efe4,
      roughness: 0.85,
      metalness: 0.0
    });

    this.rightBlock = new THREE.Mesh(new THREE.BoxGeometry(W, 0.05, H), blockMat);
    this.rightBlock.castShadow = true;
    this.rightBlock.receiveShadow = true;
    this.root.add(this.rightBlock);

    this.leftBlock = new THREE.Mesh(new THREE.BoxGeometry(W, 0.05, H), blockMat);
    this.leftBlock.castShadow = true;
    this.leftBlock.receiveShadow = true;
    this.root.add(this.leftBlock);

    // 3. Blue ribbon bookmark emerging from the spine
    const ribbonShape = new THREE.PlaneGeometry(0.065, H + 0.28, 1, 16);
    const ribbonPos = ribbonShape.attributes.position;
    for (let i = 0; i < ribbonPos.count; i++) {
      const z = ribbonPos.getY(i);
      ribbonPos.setZ(i, Math.sin(z * 2.5) * 0.004);
    }
    ribbonShape.computeVertexNormals();
    const ribbonMat = new THREE.MeshStandardMaterial({
      color: 0x1d5b8c,
      roughness: 0.6,
      side: THREE.DoubleSide
    });
    this.ribbonMesh = new THREE.Mesh(ribbonShape, ribbonMat);
    this.ribbonMesh.rotation.x = -Math.PI / 2;
    this.ribbonMesh.position.set(0.0, 0.008, 0.09);
    this.root.add(this.ribbonMesh);

    // 4. Subdivided Right & Left Active Page Meshes (48x32 segments)
    this.rightPageGeo = new THREE.PlaneGeometry(W, H, SX, SY);
    this.rightPageGeo.rotateX(-Math.PI / 2);
    this.rightPageBasePos = this.rightPageGeo.attributes.position.clone();

    this.leftPageGeo = new THREE.PlaneGeometry(W, H, SX, SY);
    this.leftPageGeo.rotateX(-Math.PI / 2);
    this.leftPageBasePos = this.leftPageGeo.attributes.position.clone();

    this.rightPageMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.78,
      metalness: 0.01
    });
    this.leftPageMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.78,
      metalness: 0.01
    });

    this.rightPageMesh = new THREE.Mesh(this.rightPageGeo, this.rightPageMat);
    this.rightPageMesh.castShadow = true;
    this.rightPageMesh.receiveShadow = true;
    this.rightPageMesh.userData = { side: 'right' };
    this.root.add(this.rightPageMesh);

    this.leftPageMesh = new THREE.Mesh(this.leftPageGeo, this.leftPageMat);
    this.leftPageMesh.castShadow = true;
    this.leftPageMesh.receiveShadow = true;
    this.leftPageMesh.userData = { side: 'left' };
    this.root.add(this.leftPageMesh);

    // 5. Turning Page Mesh (Double-sided via front/back group) for curl animation
    this.turnPageGeo = new THREE.PlaneGeometry(W, H, SX, SY);
    this.turnPageGeo.rotateX(-Math.PI / 2);
    this.turnPageBasePos = this.turnPageGeo.attributes.position.clone();

    this.turnFrontMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.76,
      side: THREE.FrontSide
    });
    this.turnBackMat = new THREE.MeshStandardMaterial({
      color: 0xf7f4eb,
      roughness: 0.78,
      side: THREE.BackSide
    });

    this.turnPageGroup = new THREE.Group();
    this.turnFrontMesh = new THREE.Mesh(this.turnPageGeo, this.turnFrontMat);
    this.turnBackMesh = new THREE.Mesh(this.turnPageGeo, this.turnBackMat);
    this.turnFrontMesh.castShadow = true;
    this.turnGroupVisible(false);
    this.turnPageGroup.add(this.turnFrontMesh, this.turnBackMesh);
    this.root.add(this.turnPageGroup);

    this.applyPageCurvature(this.curvature);
  }

  turnGroupVisible(visible) {
    this.turnPageGroup.visible = visible;
  }

  /**
   * Cylindrical bend around the spine axis controlled by one `curvature` parameter (0..1).
   * When curvature = 0, the page is completely flat (used in Focus Mode).
   */
  applyPageCurvature(curvature) {
    const W = BOOK_CONFIG.pageWidth;
    const archHeight = 0.068 * curvature;
    const spineDip = 0.028 * curvature;

    // Deform right page (x from 0 at spine to +W at outer edge)
    const rPos = this.rightPageGeo.attributes.position;
    const rBase = this.rightPageBasePos;
    for (let i = 0; i < rPos.count; i++) {
      const lx = rBase.getX(i); // -W/2 .. +W/2
      const u = (lx + W * 0.5) / W; // 0 at spine, 1 at outer right edge
      const worldX = u * W;
      const yOffset = Math.sin(u * Math.PI) * archHeight - (1 - u) * spineDip * Math.exp(-u * 6);
      rPos.setX(i, worldX);
      rPos.setY(i, yOffset);
      rPos.setZ(i, rBase.getZ(i));
    }
    rPos.needsUpdate = true;
    this.rightPageGeo.computeVertexNormals();

    // Deform left page (x from 0 at spine to -W at outer left edge)
    const lPos = this.leftPageGeo.attributes.position;
    const lBase = this.leftPageBasePos;
    for (let i = 0; i < lPos.count; i++) {
      const lx = lBase.getX(i); // -W/2 .. +W/2
      const u = (W * 0.5 - lx) / W; // 0 at spine, 1 at outer left edge
      const worldX = -u * W;
      const yOffset = Math.sin(u * Math.PI) * archHeight - (1 - u) * spineDip * Math.exp(-u * 6);
      lPos.setX(i, worldX);
      lPos.setY(i, yOffset);
      lPos.setZ(i, lBase.getZ(i));
    }
    lPos.needsUpdate = true;
    this.leftPageGeo.computeVertexNormals();
  }

  /**
   * Deforms the turning sheet with a travelling curl across the spine.
   * progress: 0..1, direction: +1 (Next in RTL: curls from Left to Right) or -1 (Prev: Right to Left)
   */
  applyCurlDeformation(progress, direction) {
    const W = BOOK_CONFIG.pageWidth;
    const pos = this.turnPageGeo.attributes.position;
    const base = this.turnPageBasePos;

    // Angle sweeps from 0 to PI
    const theta = progress * Math.PI;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const curlAmt = Math.sin(progress * Math.PI); // peaks at mid-turn

    for (let i = 0; i < pos.count; i++) {
      const lx = base.getX(i);
      const lz = base.getZ(i);
      // radial distance from spine (0..W)
      const u = (lx + W * 0.5) / W;
      const r = u * W;

      // Travelling wave bend along u
      const bendAngle = theta * Math.pow(u, 0.22 * curlAmt);
      const sign = direction > 0 ? -1 : 1; // +1 Next starts on Left (-X) and folds to Right (+X)

      const x = sign * r * Math.cos(bendAngle);
      const y = Math.abs(r * Math.sin(bendAngle)) * 0.52 + Math.sin(u * Math.PI) * 0.08 * curlAmt + 0.008;

      pos.setX(i, x);
      pos.setY(i, y);
      pos.setZ(i, lz);
    }
    pos.needsUpdate = true;
    this.turnPageGeo.computeVertexNormals();
  }

  /**
   * Updates stacked page-block thicknesses on Right and Left based on current reading progress.
   * In RTL: as you advance spreads, Right block gets thinner (already read) or Left block gets thinner.
   */
  updateBlockThickness() {
    const W = BOOK_CONFIG.pageWidth;
    const totalSpreads = Math.max(1, this.spreads.length - 1);
    const progress = this.currentSpreadIndex / totalSpreads;

    // In Arabic RTL: unread pages sit on the Left, read pages accumulate on the Right
    const rightThickness = THREE.MathUtils.lerp(0.012, 0.062, progress);
    const leftThickness = THREE.MathUtils.lerp(0.062, 0.012, progress);

    this.rightBlock.scale.y = rightThickness / 0.05;
    this.rightBlock.position.set(W * 0.5, -rightThickness * 0.5 - 0.002, 0);

    this.leftBlock.scale.y = leftThickness / 0.05;
    this.leftBlock.position.set(-W * 0.5, -leftThickness * 0.5 - 0.002, 0);

    this.rightPageMesh.position.y = 0.002;
    this.leftPageMesh.position.y = 0.002;
  }

  /**
   * Creates a high-clarity procedural fallback texture if the image file is still loading or missing,
   * so the user never sees a blank or black mesh.
   */
  createFallbackPageTexture(pageMeta) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1448;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#faf7f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header bar matching the textbook style
    ctx.strokeStyle = '#1d5b8c';
    ctx.lineWidth = 4;
    ctx.strokeRect(48, 48, canvas.width - 96, canvas.height - 96);

    ctx.fillStyle = '#1d5b8c';
    ctx.font = 'bold 34px Cairo, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('الأستاذ : عبد الله الغانم — الفيزياء للسادس العلمي', canvas.width / 2, 120);

    ctx.fillStyle = '#1e242b';
    ctx.font = 'bold 38px Cairo, sans-serif';
    ctx.fillText(pageMeta.title, canvas.width / 2, 260);

    ctx.fillStyle = '#525c68';
    ctx.font = '26px Cairo, sans-serif';
    ctx.fillText(
      `صفحة تسلسلية ${pageMeta.seqPage} (صفحة الكتاب المطبوعة: ${pageMeta.printedPage})`,
      canvas.width / 2,
      330
    );

    ctx.font = '22px Cairo, sans-serif';
    ctx.fillStyle = '#c96a28';
    ctx.fillText(
      `ضع ملف الصورة في: pages/page-${String(pageMeta.seqPage).padStart(3, '0')}.webp أو ${pageMeta.rawFile}`,
      canvas.width / 2,
      410
    );

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.maxAnisotropy;
    return tex;
  }

  /**
   * Resolves and loads texture for `seqPage`, trying sequential `pages/page-00X.webp`,
   * printed `pages/page-00Y.webp`, and original attached filename `10001284XX.webp`.
   */
  async loadPageTexture(seqPage, highRes = false) {
    const pageMeta = PAGES_MANIFEST.find((p) => p.seqPage === seqPage);
    if (!pageMeta) return null;

    if (!this.textureCache.has(seqPage)) {
      this.textureCache.set(seqPage, {
        low: this.createFallbackPageTexture(pageMeta),
        hi: null,
        isHiActive: false,
        loadingLow: false,
        loadingHi: false
      });
    }

    const entry = this.textureCache.get(seqPage);
    if (!highRes && entry.loadingLow) return entry.low;
    if (highRes && (entry.hi || entry.loadingHi)) return entry.hi || entry.low;

    const padSeq = String(pageMeta.seqPage).padStart(3, '0');
    const padPrinted = String(pageMeta.printedPage).padStart(3, '0');

    const candidateUrls = highRes
      ? [
          `./pages-hi/page-${padSeq}.webp`,
          `./pages-hi/page-${padPrinted}.webp`,
          `./pages-hi/${pageMeta.rawFile}`
        ]
      : [
          `./pages/page-${padSeq}.webp`,
          `./pages/${pageMeta.rawFile}`,
          `./${pageMeta.rawFile}`,
          `./pages/page-${padPrinted}.webp`
        ];

    if (highRes) entry.loadingHi = true;
    else entry.loadingLow = true;

    this.callbacks.onLoadingChange?.(true);

    for (const url of candidateUrls) {
      try {
        const tex = await new Promise((resolve, reject) => {
          this.textureLoader.load(url, resolve, undefined, reject);
        });
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.anisotropy = this.maxAnisotropy;

        if (highRes) {
          entry.hi = tex;
        } else {
          if (entry.low) entry.low.dispose();
          entry.low = tex;
        }
        this.applyCurrentSpreadTextures();
        this.callbacks.requestRender?.();
        break;
      } catch (_) {
        // Continue to next candidate path
      }
    }

    this.callbacks.onLoadingChange?.(false);
    return highRes ? entry.hi || entry.low : entry.low;
  }

  /**
   * Lazy Loading: keeps current spread ± 2 spreads in memory, disposes distant textures.
   */
  manageLazyMemory() {
    const minSpread = Math.max(0, this.currentSpreadIndex - BOOK_CONFIG.lazySpreadRadius);
    const maxSpread = Math.min(this.spreads.length - 1, this.currentSpreadIndex + BOOK_CONFIG.lazySpreadRadius);

    const activeSeqPages = new Set();
    for (let s = minSpread; s <= maxSpread; s++) {
      const sp = this.spreads[s];
      if (sp.rightSeq) activeSeqPages.add(sp.rightSeq);
      if (sp.leftSeq) activeSeqPages.add(sp.leftSeq);
    }

    // Trigger background load for nearby spreads
    for (const seq of activeSeqPages) {
      this.loadPageTexture(seq, false);
    }

    // Dispose textures outside the window
    for (const [seq, entry] of this.textureCache.entries()) {
      if (!activeSeqPages.has(seq)) {
        if (entry.low) entry.low.dispose();
        if (entry.hi) entry.hi.dispose();
        this.textureCache.delete(seq);
      }
    }
  }

  /**
   * Swaps in `pages-hi` texture when camera zooms close to a page.
   */
  checkHighResSwap(cameraDistance) {
    const wantsHi = cameraDistance < BOOK_CONFIG.hiResZoomDistanceThreshold;
    const spread = this.spreads[this.currentSpreadIndex];
    if (!spread) return;

    [spread.rightSeq, spread.leftSeq].forEach((seq) => {
      if (!seq) return;
      const entry = this.textureCache.get(seq);
      if (!entry) return;
      if (wantsHi && !entry.hi && !entry.loadingHi) {
        this.loadPageTexture(seq, true);
      } else if (wantsHi && entry.hi && !entry.isHiActive) {
        entry.isHiActive = true;
        this.applyCurrentSpreadTextures();
      } else if (!wantsHi && entry.isHiActive) {
        entry.isHiActive = false;
        this.applyCurrentSpreadTextures();
      }
    });
  }

  getBestTexture(seqPage) {
    if (!seqPage) return null;
    const entry = this.textureCache.get(seqPage);
    if (!entry) {
      this.loadPageTexture(seqPage, false);
      return this.textureCache.get(seqPage)?.low || null;
    }
    return entry.isHiActive && entry.hi ? entry.hi : entry.low;
  }

  applyCurrentSpreadTextures() {
    if (this.singlePageMode) {
      const tex = this.getBestTexture(this.currentSinglePageSeq);
      this.rightPageMesh.visible = true;
      this.leftPageMesh.visible = false;
      this.leftCover.visible = false;
      this.leftBlock.visible = false;
      this.spineCover.visible = false;
      this.ribbonMesh.visible = false;

      // Center the single page horizontally on mobile portrait
      this.rightPageMesh.position.x = -BOOK_CONFIG.pageWidth * 0.5;
      this.rightCover.position.x = 0;
      this.rightBlock.position.x = 0;

      this.rightPageMat.map = tex;
      this.rightPageMat.needsUpdate = true;
      return;
    }

    // Two-page spread mode
    this.rightPageMesh.position.x = 0;
    this.rightCover.position.x = (BOOK_CONFIG.pageWidth + 0.08) * 0.5 + 0.01;
    this.spineCover.visible = true;
    this.ribbonMesh.visible = true;

    const spread = this.spreads[this.currentSpreadIndex];
    if (!spread) return;

    if (spread.rightSeq) {
      this.rightPageMesh.visible = true;
      this.rightCover.visible = true;
      this.rightBlock.visible = true;
      this.rightPageMat.map = this.getBestTexture(spread.rightSeq);
      this.rightPageMat.needsUpdate = true;
    } else {
      this.rightPageMesh.visible = false;
    }

    if (spread.leftSeq) {
      this.leftPageMesh.visible = true;
      this.leftCover.visible = true;
      this.leftBlock.visible = true;
      this.leftPageMat.map = this.getBestTexture(spread.leftSeq);
      this.leftPageMat.needsUpdate = true;
    } else {
      this.leftPageMesh.visible = false;
      this.leftCover.visible = this.currentSpreadIndex > 0;
      this.leftBlock.visible = false;
    }
  }

  updateBookLayout() {
    this.singlePageMode = window.innerWidth <= 768 && window.innerHeight > window.innerWidth;
    this.targetCurvature = this.singlePageMode ? 0.0 : BOOK_CONFIG.restingCurvature;
    this.updateBlockThickness();
    this.manageLazyMemory();
    this.applyCurrentSpreadTextures();
    this.callbacks.onSpreadChange?.(this.getCurrentVisiblePagesInfo());
    this.callbacks.requestRender?.();
  }

  getCurrentVisiblePagesInfo() {
    if (this.singlePageMode) {
      const p = PAGES_MANIFEST.find((m) => m.seqPage === this.currentSinglePageSeq);
      return {
        singleMode: true,
        rightPage: p,
        leftPage: null,
        canNext: this.currentSinglePageSeq < PAGES_MANIFEST.length,
        canPrev: this.currentSinglePageSeq > 1
      };
    }
    const spread = this.spreads[this.currentSpreadIndex];
    const rightPage = spread.rightSeq ? PAGES_MANIFEST.find((m) => m.seqPage === spread.rightSeq) : null;
    const leftPage = spread.leftSeq ? PAGES_MANIFEST.find((m) => m.seqPage === spread.leftSeq) : null;
    return {
      singleMode: false,
      rightPage,
      leftPage,
      canNext: this.currentSpreadIndex < this.spreads.length - 1,
      canPrev: this.currentSpreadIndex > 0
    };
  }

  /**
   * Initiates a smooth page-curl turn in RTL order.
   */
  turnNext() {
    if (this.turnState.active) return;
    if (this.singlePageMode) {
      if (this.currentSinglePageSeq < PAGES_MANIFEST.length) {
        this.currentSinglePageSeq++;
        this.updateBookLayout();
      }
      return;
    }

    if (this.currentSpreadIndex >= this.spreads.length - 1) return;
    const fromSp = this.spreads[this.currentSpreadIndex];
    const toSp = this.spreads[this.currentSpreadIndex + 1];

    this.turnState.active = true;
    this.turnState.direction = 1;
    this.turnState.progress = 0;
    this.turnState.fromSpread = this.currentSpreadIndex;
    this.turnState.toSpread = this.currentSpreadIndex + 1;

    // Front of curling sheet shows old left page (or cover), back shows new right page
    this.turnFrontMat.map = this.getBestTexture(fromSp.leftSeq || fromSp.rightSeq);
    this.turnFrontMat.needsUpdate = true;
    this.turnBackMat.map = this.getBestTexture(toSp.rightSeq);
    this.turnBackMat.needsUpdate = true;

    this.turnGroupVisible(true);
    this.callbacks.requestRender?.();
  }

  turnPrev() {
    if (this.turnState.active) return;
    if (this.singlePageMode) {
      if (this.currentSinglePageSeq > 1) {
        this.currentSinglePageSeq--;
        this.updateBookLayout();
      }
      return;
    }

    if (this.currentSpreadIndex <= 0) return;
    const fromSp = this.spreads[this.currentSpreadIndex];
    const toSp = this.spreads[this.currentSpreadIndex - 1];

    this.turnState.active = true;
    this.turnState.direction = -1;
    this.turnState.progress = 0;
    this.turnState.fromSpread = this.currentSpreadIndex;
    this.turnState.toSpread = this.currentSpreadIndex - 1;

    this.turnFrontMat.map = this.getBestTexture(fromSp.rightSeq);
    this.turnFrontMat.needsUpdate = true;
    this.turnBackMat.map = this.getBestTexture(toSp.leftSeq || toSp.rightSeq);
    this.turnBackMat.needsUpdate = true;

    this.turnGroupVisible(true);
    this.callbacks.requestRender?.();
  }

  jumpToSeqPage(seqPage) {
    this.currentSinglePageSeq = THREE.MathUtils.clamp(seqPage, 1, PAGES_MANIFEST.length);
    const targetSpread = this.spreads.findIndex(
      (s) => s.rightSeq === seqPage || s.leftSeq === seqPage
    );
    if (targetSpread !== -1) {
      this.currentSpreadIndex = targetSpread;
    }
    this.updateBookLayout();
  }

  /**
   * Computes the 3D world position & bounding box of a hotspot rectangle on its page.
   * RTL rect origin is top-right: x in [0..1] from right edge, y in [0..1] from top edge.
   */
  getHotspotWorldTransform(hotspot) {
    const W = BOOK_CONFIG.pageWidth;
    const H = BOOK_CONFIG.pageHeight;
    const spread = this.spreads[this.currentSpreadIndex];

    let isRightSide = true;
    if (this.singlePageMode) {
      if (this.currentSinglePageSeq !== hotspot.seqPage) return null;
    } else {
      if (spread.rightSeq === hotspot.seqPage) isRightSide = true;
      else if (spread.leftSeq === hotspot.seqPage) isRightSide = false;
      else return null;
    }

    const { x, y, w, h } = hotspot.rect;
    // Local page coordinates: right edge of page is +W/2, left edge is -W/2
    const cxLocal = W * 0.5 - (x + w * 0.5) * W;
    const czLocal = -H * 0.5 + (y + h * 0.5) * H;

    let pageCenterOffsetX = 0;
    if (this.singlePageMode) {
      pageCenterOffsetX = 0;
    } else {
      pageCenterOffsetX = isRightSide ? W * 0.5 : -W * 0.5;
    }

    const worldX = pageCenterOffsetX + cxLocal;
    const worldZ = czLocal;
    const u = isRightSide ? worldX / W : -worldX / W;
    const worldY = Math.sin(THREE.MathUtils.clamp(u, 0, 1) * Math.PI) * 0.068 * this.curvature + 0.008;

    return {
      center: new THREE.Vector3(worldX, worldY, worldZ),
      width: w * W,
      height: h * H,
      isRightSide
    };
  }

  /**
   * Updates book curvature and page curl animation each frame. Returns true if still animating.
   */
  update(dt) {
    let dirty = false;

    // Smoothly damp curvature toward targetCurvature
    if (Math.abs(this.curvature - this.targetCurvature) > 0.001) {
      this.curvature = THREE.MathUtils.damp(this.curvature, this.targetCurvature, 8.5, dt);
      this.applyPageCurvature(this.curvature);
      dirty = true;
    }

    // Update page turning curl animation
    if (this.turnState.active) {
      this.turnState.progress += dt / this.turnState.duration;
      if (this.turnState.progress >= 1.0) {
        this.turnState.active = false;
        this.turnGroupVisible(false);
        this.currentSpreadIndex = this.turnState.toSpread;
        this.updateBookLayout();
      } else {
        // Smooth easeInOutCubic
        const t = this.turnState.progress;
        const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        this.applyCurlDeformation(eased, this.turnState.direction);
      }
      dirty = true;
    }

    return dirty;
  }
}