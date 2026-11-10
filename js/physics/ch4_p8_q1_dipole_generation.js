/**
 * js/physics/ch4_p8_q1_dipole_generation.js
 * Interactive 3D Physics Simulation for Page 8 & Page 9:
 * "وضح كيفية توليد الموجات الكهرومغناطيسية؟" (Stages 01, 02, 03, 04)
 *
 * Physics & Curriculum Fidelity:
 * - Two metallic rods (ثنائي قطب كهربائي) connected to an AC electrical oscillator (مذبذب كهربائي).
 * - Stage 01 (phase ~ 45°): Charges start moving apart (+q up, -q down), E-field arcs from + to -, B-field perpendicular (into page).
 * - Stage 02 (phase = 90°): Effective emf reaches maximum, charges reach rod ends, velocity v = 0, E-field lines spread widest.
 * - Stage 03 (phase = 165°): emf decreases, charges reverse direction moving toward center, E & B field line ends converge to form a closed loop.
 * - Stage 04 (phase = 215°): Polarity reverses (انقلاب القطبية: -q on upper rod, +q on lower rod), closed loops detach and propagate at c = 3e8 m/s.
 */

const SPEED_OF_LIGHT = 3e8; // m/s (as printed on page 4)

export default {
  id: 'ch4_p8_q1_dipole_generation',

  source: {
    page: 8,
    seqPage: 6,
    questionNumber: 1,
    printedTitle: 'سؤال : وضح كيفية توليد الموجات الكهرومغناطيسية؟ (المراحل 01 - 04)'
  },

  hotspot: {
    seqPage: 6,
    printedPage: 8,
    rect: { x: 0.49, y: 0.13, w: 0.44, h: 0.80 }
  },

  focusPose: {
    position: [0.45, 1.55, 1.05],
    target: [0.45, 0.12, 0.0],
    fov: 38
  },

  controls: [
    {
      id: 'stagePreset',
      type: 'SelectStage',
      label: 'مرحلة التوليد في الكتاب (01 - 04)',
      symbol: 'Stage',
      options: [
        { value: 0, label: 'تشغيل مستمر (توليد وانتشار)' },
        { value: 1, label: '01 - بدء حركة الشحنات وتوليد الخطوط' },
        { value: 2, label: '02 - أعظم emf وتوقف الشحنات في الطرفين' },
        { value: 3, label: '03 - تناقص emf وتقارب نهايتي الخطوط' },
        { value: 4, label: '04 - انقلاب القطبية وانفصال الحلقات' }
      ],
      default: 0,
      derivedFromBook: true
    },
    {
      id: 'phaseDeg',
      label: 'زاوية الطور اللحظي للمذبذب',
      symbol: '\\theta',
      unit: 'deg',
      min: 0,
      max: 360,
      step: 1,
      default: 45,
      derivedFromBook: true
    },
    {
      id: 'emfMax',
      label: 'القوة الدافعة الكهربائية العظمى (قيمة افتراضية)',
      symbol: '\\text{emf}_{\\max}',
      unit: 'V',
      min: 2,
      max: 24,
      step: 0.5,
      default: 12,
      derivedFromBook: false
    },
    {
      id: 'frequencyMHz',
      label: 'تردد المذبذب الكهربائي (قيمة افتراضية)',
      symbol: 'f',
      unit: 'MHz',
      min: 50,
      max: 600,
      step: 10,
      default: 150,
      derivedFromBook: false
    },
    {
      id: 'rodLengthFactor',
      label: 'طول ساقي ثنائي القطب',
      symbol: '\\ell',
      unit: 'm',
      min: 0.4,
      max: 2.0,
      step: 0.05,
      default: 1.0,
      derivedFromBook: true
    },
    {
      id: 'showMagneticRings',
      type: 'toggle',
      label: 'إظهار حلقات المجال المغناطيسي المتعامدة (B)',
      labels: ['مخفي', 'ظاهر (عمودي على E)'],
      default: true
    },
    {
      id: 'autoPlay',
      type: 'toggle',
      label: 'حركة التذبذب والانتشار التلقائي',
      labels: ['متوقف (يدوي)', 'يعمل تلقائياً'],
      default: true
    }
  ],

  /**
   * Pure physics solver using book formulas:
   * - lambda = c / f
   * - Instantaneous emf(t) = emf_max * sin(theta)
   * - Charge displacement along rod y(t) = (l/2) * sin(theta)
   * - Charge velocity v(t) proportional to cos(theta) (zero at theta = 90 deg in Stage 02)
   */
  solve(state) {
    const fHz = Math.max(1e6, (state.frequencyMHz || 150) * 1e6);
    const wavelength = SPEED_OF_LIGHT / fHz; // lambda = c / f
    const phaseRad = ((state.phaseDeg || 0) * Math.PI) / 180;

    const emfMax = state.emfMax ?? 12;
    const emfInst = emfMax * Math.sin(phaseRad);

    // Normalized charge position in [-1, +1] along each rod
    const chargePosNorm = Math.sin(phaseRad);
    // Normalized charge speed (0 when charge reaches rod tip at 90° / Stage 02)
    const chargeVelNorm = Math.cos(phaseRad);

    // Determine which textbook stage (01..04) corresponds to current phaseDeg
    const deg = ((state.phaseDeg % 360) + 360) % 360;
    let currentStageCode = '01';
    let stageDescription = 'حركة الشحنات المتعاكسة وبداية تكون المجالين';
    let bFieldDirection = 'نحو الداخل (⊗)';

    if (deg >= 70 && deg <= 115) {
      currentStageCode = '02';
      stageDescription = 'أعظم emf: وصول الشحنات للطرفين والسرعة = 0';
      bFieldDirection = 'نحو الداخل (⊗)';
    } else if (deg > 115 && deg < 180) {
      currentStageCode = '03';
      stageDescription = 'تناقص emf: انعكاس حركة الشحنات وتقارب نهايتي الخطوط';
      bFieldDirection = 'نحو الداخل (⊗)';
    } else if (deg >= 180) {
      currentStageCode = '04';
      stageDescription = 'انقلاب القطبية: انفصال الحلقات المغلقة وانتشارها';
      bFieldDirection = 'نحو الخارج (⊙)';
    }

    return {
      frequencyHz: fHz,
      wavelengthM: wavelength,
      emfInstantV: emfInst,
      chargePosNorm,
      chargeVelNorm,
      currentStageCode,
      stageDescription,
      bFieldDirection,
      polaritySign: deg < 180 ? 1 : -1
    };
  },

  readouts: [
    {
      label: 'المرحلة المطبوعة',
      symbol: '\\text{Stage}',
      unit: '',
      format: (out) => `المرحلة ${out.currentStageCode}`
    },
    {
      label: 'القوة الدافعة اللحظية',
      symbol: '\\text{emf}',
      unit: 'V',
      value: (out) => out.emfInstantV.toFixed(1)
    },
    {
      label: 'الطول الموجي (\\lambda = c/f)',
      symbol: '\\lambda',
      unit: 'm',
      value: (out) => out.wavelengthM.toFixed(2)
    },
    {
      label: 'سرعة الشحنات اللحظية',
      symbol: 'v_q / v_{\\max}',
      unit: '',
      value: (out) => Math.abs(out.chargeVelNorm).toFixed(2)
    },
    {
      label: 'اتجاه المجال المغناطيسي',
      symbol: '\\vec{B}',
      unit: '',
      format: (out) => out.bFieldDirection
    }
  ],

  /**
   * Advances phase continuously when autoPlay is enabled and stagePreset == 0.
   */
  step(state, out, dt) {
    if (!state.autoPlay || Number(state.stagePreset) !== 0) return false;
    // Speed scales gently with frequencyMHz so teacher sees the frequency effect live
    const degPerSec = 55 * ((state.frequencyMHz || 150) / 150);
    state.phaseDeg = (state.phaseDeg + degPerSec * dt) % 360;
    return true;
  },

  /**
   * Builds the 3D ink-wireframe / paper-craft model right over the printed figure on the page.
   */
  build(THREE, rootGroup, helpers) {
    const { ink } = helpers;
    const modelGroup = new THREE.Group();
    rootGroup.add(modelGroup);

    // 1. Electrical Oscillator Box (مذبذب كهربائي) on the left of the dipole rods
    const oscGeo = new THREE.BoxGeometry(0.22, 0.08, 0.20);
    const oscMesh = ink.createPaperMesh(oscGeo, ink.sharedMaterials.accentOrange.clone());
    oscMesh.position.set(-0.28, 0.24, 0);
    modelGroup.add(oscMesh);

    const oscLabel = ink.createPrintedLabel('مذبذب كهربائي', {
      bgColor: 'rgba(223, 100, 38, 0.95)',
      textColor: '#ffffff',
      scale: 0.14
    });
    oscLabel.position.set(-0.28, 0.34, 0);
    modelGroup.add(oscLabel);

    // Feed wires from oscillator to central dipole gap
    const wireMat = ink.sharedMaterials.inkLine;
    const topWireGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.17, 0.26, 0),
      new THREE.Vector3(-0.05, 0.26, 0)
    ]);
    const botWireGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.17, 0.22, 0),
      new THREE.Vector3(-0.05, 0.22, 0)
    ]);
    modelGroup.add(new THREE.Line(topWireGeo, wireMat));
    modelGroup.add(new THREE.Line(botWireGeo, wireMat));

    // 2. Two Metallic Dipole Rods (ساقين معدنيين) standing vertically above the page
    const rodRadius = 0.018;
    const baseRodHeight = 0.24;
    const upperRodGeo = new THREE.CylinderGeometry(rodRadius, rodRadius, baseRodHeight, 16);
    const lowerRodGeo = new THREE.CylinderGeometry(rodRadius, rodRadius, baseRodHeight, 16);

    const upperRodMat = ink.sharedMaterials.accentRed.clone();
    const lowerRodMat = ink.sharedMaterials.accentBlue.clone();

    const upperRod = ink.createPaperMesh(upperRodGeo, upperRodMat);
    const lowerRod = ink.createPaperMesh(lowerRodGeo, lowerRodMat);
    modelGroup.add(upperRod, lowerRod);

    const rodsLabel = ink.createPrintedLabel('ساقين معدنيين', { scale: 0.14 });
    rodsLabel.position.set(-0.05, 0.56, 0);
    modelGroup.add(rodsLabel);

    // 3. Interactive Charge Spheres (+q and -q) moving along the rods
    // Marked as draggable so the teacher can drag them directly in 3D!
    const chargeGeo = new THREE.SphereGeometry(0.032, 20, 20);
    const posChargeMat = new THREE.MeshStandardMaterial({ color: 0xd93829, roughness: 0.35 });
    const negChargeMat = new THREE.MeshStandardMaterial({ color: 0x1d5b8c, roughness: 0.35 });

    const upperCharge = ink.createPaperMesh(chargeGeo, posChargeMat);
    const lowerCharge = ink.createPaperMesh(chargeGeo, negChargeMat);
    upperCharge.userData.draggable = true;
    lowerCharge.userData.draggable = true;
    modelGroup.add(upperCharge, lowerCharge);

    const upperChargeSign = ink.createPrintedLabel('+q', {
      bgColor: '#d93829',
      textColor: '#ffffff',
      scale: 0.10
    });
    const lowerChargeSign = ink.createPrintedLabel('-q', {
      bgColor: '#1d5b8c',
      textColor: '#ffffff',
      scale: 0.10
    });
    modelGroup.add(upperChargeSign, lowerChargeSign);

    // 4. Dynamic Electric Field Arcs & Detaching Closed Loops (خطوط المجال الكهربائي)
    const NUM_ARCS = 3;
    const ARC_SEGMENTS = 40;
    const fieldLinesGroup = new THREE.Group();
    modelGroup.add(fieldLinesGroup);

    const nearArcs = [];
    const arrowCones = [];
    const coneGeo = new THREE.ConeGeometry(0.016, 0.042, 12);

    for (let i = 0; i < NUM_ARCS; i++) {
      const pts = Array.from({ length: ARC_SEGMENTS + 1 }, () => new THREE.Vector3());
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: i % 2 === 0 ? 0xd93829 : 0x1d5b8c,
        transparent: true,
        opacity: 0.9
      });
      const line = new THREE.Line(geo, mat);
      fieldLinesGroup.add(line);
      nearArcs.push(line);

      const arrowMat = new THREE.MeshBasicMaterial({ color: 0xd93829 });
      const cone = new THREE.Mesh(coneGeo, arrowMat);
      fieldLinesGroup.add(cone);
      arrowCones.push(cone);
    }

    // Detached propagating closed loops (Stage 03/04 radiation wavefronts)
    const NUM_DETACHED_LOOPS = 2;
    const detachedLoops = [];
    for (let k = 0; k < NUM_DETACHED_LOOPS; k++) {
      const pts = Array.from({ length: ARC_SEGMENTS + 1 }, () => new THREE.Vector3());
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: k === 0 ? 0xd93829 : 0x1d5b8c,
        transparent: true,
        opacity: 0.85
      });
      const loopLine = new THREE.Line(geo, mat);
      fieldLinesGroup.add(loopLine);
      detachedLoops.push(loopLine);
    }

    // 5. Magnetic Field Dots (• • •) & Perpendicular 3D Magnetic Rings (المجال المغناطيسي B)
    const bFieldGroup = new THREE.Group();
    modelGroup.add(bFieldGroup);

    const bDots = [];
    const dotGeo = new THREE.SphereGeometry(0.015, 14, 14);
    for (let i = 0; i < 4; i++) {
      const dot = new THREE.Mesh(dotGeo, ink.sharedMaterials.accentGreen);
      bFieldGroup.add(dot);
      bDots.push(dot);
    }

    const bRings = [];
    for (let i = 0; i < 3; i++) {
      const ringGeo = new THREE.RingGeometry(0.08 + i * 0.08, 0.086 + i * 0.08, 48);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x1a8c5b,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.42
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(0.14, 0.24, 0);
      bFieldGroup.add(ring);
      bRings.push(ring);
    }

    const eFieldLabel = ink.createPrintedLabel('خطوط المجال الكهربائي (E)', { scale: 0.15 });
    eFieldLabel.position.set(0.32, 0.48, 0);
    modelGroup.add(eFieldLabel);

    const stageBanner = ink.createPrintedLabel('المرحلة 01', {
      bgColor: '#1d5b8c',
      textColor: '#ffffff',
      scale: 0.16
    });
    stageBanner.position.set(0.05, 0.06, 0.32);
    modelGroup.add(stageBanner);

    return {
      // Expose draggable meshes for direct 3D manipulation
      draggableMeshes: [upperCharge, lowerCharge],

      onDrag(point3D, state) {
        // Dragging vertically changes the charge position along the rods -> updates phaseDeg
        const normY = THREE.MathUtils.clamp((point3D.y - 0.24) / 0.22, -0.98, 0.98);
        let deg = (Math.asin(normY) * 180) / Math.PI;
        if (deg < 0) deg += 360;
        state.stagePreset = 0;
        state.autoPlay = false;
        state.phaseDeg = Math.round(deg);
      },

      update(state, out) {
        // Handle stage preset button selection (01, 02, 03, 04)
        const preset = Number(state.stagePreset);
        if (preset === 1) state.phaseDeg = 45;
        else if (preset === 2) state.phaseDeg = 90;
        else if (preset === 3) state.phaseDeg = 162;
        else if (preset === 4) state.phaseDeg = 215;

        const rodScale = state.rodLengthFactor || 1.0;
        const halfGap = 0.025;
        const rodLen = baseRodHeight * rodScale;
        const centerY = 0.24;

        // Update upper & lower rod positions and polarity colors
        upperRod.scale.set(1, rodScale, 1);
        lowerRod.scale.set(1, rodScale, 1);
        upperRod.position.set(-0.05, centerY + halfGap + rodLen * 0.5, 0);
        lowerRod.position.set(-0.05, centerY - halfGap - rodLen * 0.5, 0);

        const isPositiveTop = out.polaritySign > 0;
        upperRodMat.color.setHex(isPositiveTop ? 0xd93829 : 0x1d5b8c);
        lowerRodMat.color.setHex(isPositiveTop ? 0x1d5b8c : 0xd93829);

        // Move charge spheres along the rods according to sin(theta)
        const absDisp = Math.abs(out.chargePosNorm) * (rodLen - 0.03) + halfGap + 0.015;
        upperCharge.position.set(-0.05, centerY + absDisp, 0.022);
        lowerCharge.position.set(-0.05, centerY - absDisp, 0.022);

        upperCharge.material.color.setHex(isPositiveTop ? 0xd93829 : 0x1d5b8c);
        lowerCharge.material.color.setHex(isPositiveTop ? 0x1d5b8c : 0xd93829);

        upperChargeSign.position.set(-0.12, upperCharge.position.y, 0.03);
        lowerChargeSign.position.set(-0.12, lowerCharge.position.y, 0.03);
        upperChargeSign.userData.updateText(isPositiveTop ? '+q' : '-q');
        lowerChargeSign.userData.updateText(isPositiveTop ? '-q' : '+q');

        // Update E-field near arcs (Stages 01, 02, 03, 04)
        const emfFactor = THREE.MathUtils.clamp((state.emfMax || 12) / 12, 0.4, 1.8);
        const deg = ((state.phaseDeg % 360) + 360) % 360;
        // Pinch factor approaches 0 near 170..180 deg (Stage 03 closed-loop formation)
        const pinch = deg > 120 && deg < 185 ? Math.max(0.02, (180 - deg) / 60) : 1.0;

        for (let i = 0; i < NUM_ARCS; i++) {
          const line = nearArcs[i];
          const posAttr = line.geometry.attributes.position;
          const baseWidth = (0.09 + i * 0.075) * emfFactor;
          const anchorY = absDisp * pinch;

          for (let j = 0; j <= ARC_SEGMENTS; j++) {
            const u = j / ARC_SEGMENTS; // 0 (top) to 1 (bottom)
            const angle = (u - 0.5) * Math.PI; // -PI/2 .. +PI/2
            const x = -0.05 + Math.cos(angle) * baseWidth * (0.4 + 0.6 * Math.abs(out.chargePosNorm));
            const y = centerY - Math.sin(angle) * Math.max(0.04, anchorY + i * 0.025);
            posAttr.setXYZ(j, x, y, 0);
          }
          posAttr.needsUpdate = true;
          line.material.color.setHex(isPositiveTop ? 0xd93829 : 0x1d5b8c);

          // Position directional arrow at mid-arc
          const cone = arrowCones[i];
          const midX = -0.05 + baseWidth * (0.4 + 0.6 * Math.abs(out.chargePosNorm));
          cone.position.set(midX, centerY, 0);
          cone.rotation.z = isPositiveTop ? Math.PI : 0;
          cone.material.color.setHex(isPositiveTop ? 0xd93829 : 0x1d5b8c);
        }

        // Update detached closed loops (visible especially in Stage 03 & Stage 04)
        const showDetached = deg >= 150 || state.autoPlay;
        const propOffset = ((deg % 180) / 180) * 0.26;
        for (let k = 0; k < NUM_DETACHED_LOOPS; k++) {
          const loopLine = detachedLoops[k];
          loopLine.visible = showDetached;
          if (!showDetached) continue;

          const posAttr = loopLine.geometry.attributes.position;
          const loopCenterX = 0.22 + k * 0.18 + propOffset;
          const rx = (0.065 + k * 0.015) * emfFactor;
          const ry = (0.15 + k * 0.03) * rodScale;

          for (let j = 0; j <= ARC_SEGMENTS; j++) {
            const a = (j / ARC_SEGMENTS) * Math.PI * 2;
            posAttr.setXYZ(j, loopCenterX + Math.cos(a) * rx, centerY + Math.sin(a) * ry, 0);
          }
          posAttr.needsUpdate = true;
        }

        // Update green B-field dots & perpendicular 3D rings
        for (let i = 0; i < bDots.length; i++) {
          bDots[i].position.set(0.03 + i * 0.075, centerY, 0.015);
          const s = 0.75 + 0.45 * Math.abs(out.chargeVelNorm);
          bDots[i].scale.setScalar(s);
        }

        const ringsVisible = Boolean(state.showMagneticRings);
        for (let i = 0; i < bRings.length; i++) {
          bRings[i].visible = ringsVisible;
          const rScale = (0.65 + 0.45 * Math.abs(out.chargePosNorm)) * emfFactor;
          bRings[i].scale.set(rScale, 1, rScale);
        }

        stageBanner.userData.updateText(`المرحلة ${out.currentStageCode}: ${out.stageDescription}`);
      },

      dispose() {
        rootGroup.remove(modelGroup);
      }
    };
  }
};
