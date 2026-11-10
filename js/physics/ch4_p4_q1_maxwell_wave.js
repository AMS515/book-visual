/**
 * js/physics/ch4_p4_q1_maxwell_wave.js
 * Page 4, Question 1: "ما هو استنتاج ماكسويل؟"
 * 3D Transverse Electromagnetic Wave (الموجة الكهرومغناطيسية):
 * - Vertical Electric Field wave (E - Red) & Perpendicular Horizontal Magnetic Field wave (B - Blue)
 * - Oscillating in phase (بنفس الطور) and perpendicular to the direction of propagation (اتجاه الانتشار)
 * - Interactive 3D wavelength caliper (الطول الموجي λ) draggable directly in 3D.
 */

const SPEED_OF_LIGHT = 3e8; // 3 x 10^8 m/s (printed on page 4)

export default {
  id: 'ch4_p4_q1_maxwell_wave',

  source: {
    page: 4,
    seqPage: 2,
    questionNumber: 1,
    printedTitle: 'سؤال : ما هو استنتاج ماكسويل؟ (انتشار الموجة الكهرومغناطيسية)'
  },

  hotspot: {
    seqPage: 2,
    printedPage: 4,
    rect: { x: 0.51, y: 0.11, w: 0.43, h: 0.15 }
  },

  focusPose: {
    position: [0.0, 1.35, 1.15],
    target: [0.0, 0.15, 0.0],
    fov: 38
  },

  controls: [
    {
      id: 'frequencyMHz',
      label: 'تردد الموجة الكهرومغناطيسية',
      symbol: 'f',
      unit: 'MHz',
      min: 60,
      max: 600,
      step: 10,
      default: 150,
      derivedFromBook: false
    },
    {
      id: 'electricAmp',
      label: 'سعة المجال الكهربائي (E)',
      symbol: 'E_{\\max}',
      unit: 'V/m',
      min: 30,
      max: 240,
      step: 10,
      default: 120,
      derivedFromBook: false
    },
    {
      id: 'mediumIndex',
      label: 'معامل الوسط المادي (1 = الفراغ)',
      symbol: 'n',
      unit: '',
      min: 1.0,
      max: 2.5,
      step: 0.05,
      default: 1.0,
      derivedFromBook: true
    },
    {
      id: 'phaseDeg',
      label: 'الطور اللحظي للموجة',
      symbol: '\\phi',
      unit: 'deg',
      min: 0,
      max: 360,
      step: 2,
      default: 0,
      derivedFromBook: true
    },
    {
      id: 'showVectors',
      type: 'toggle',
      label: 'إظهار أسهم متجهات المجالين (E ⊥ B)',
      labels: ['مخفي', 'ظاهر'],
      default: true
    },
    {
      id: 'autoPlay',
      type: 'toggle',
      label: 'انتشار الموجة مع الزمن',
      labels: ['متوقف', 'ينتشر بسرعة الضوء'],
      default: true
    }
  ],

  solve(state) {
    const fHz = Math.max(1e6, (state.frequencyMHz || 150) * 1e6);
    const n = Math.max(1.0, state.mediumIndex || 1.0);
    const waveSpeed = SPEED_OF_LIGHT / n; // Page 5 point 04: decreases in material media
    const wavelengthM = waveSpeed / fHz; // lambda = v / f
    const eMax = state.electricAmp ?? 120;
    const bMaxMicroT = (eMax / waveSpeed) * 1e6; // B in microTesla

    return {
      frequencyHz: fHz,
      waveSpeedMpS: waveSpeed,
      wavelengthM,
      eMax,
      bMaxMicroT,
      phaseDiffDeg: 0 // Page 5 & 6: كلا المجالين يتذبذبان بطور واحد ومتعامدان
    };
  },

  readouts: [
    {
      label: 'سرعة الانتشار في الوسط',
      symbol: 'v',
      unit: 'm/s',
      format: (out) => `${(out.waveSpeedMpS / 1e8).toFixed(2)} × 10⁸ m/s`
    },
    {
      label: 'الطول الموجي (λ = c/f)',
      symbol: '\\lambda',
      unit: 'm',
      value: (out) => out.wavelengthM.toFixed(2)
    },
    {
      label: 'سعة المجال الكهربائي',
      symbol: 'E_{\\max}',
      unit: 'V/m',
      value: (out) => out.eMax.toFixed(0)
    },
    {
      label: 'سعة المجال المغناطيسي',
      symbol: 'B_{\\max}',
      unit: 'μT',
      value: (out) => out.bMaxMicroT.toFixed(2)
    },
    {
      label: 'فرق الطور بين E و B',
      symbol: '\\Delta\\phi',
      unit: 'deg',
      format: () => '0° (متلازمان بطور واحد)'
    }
  ],

  step(state, out, dt) {
    if (!state.autoPlay) return false;
    const speedFactor = (state.frequencyMHz || 150) / (150 * (state.mediumIndex || 1));
    state.phaseDeg = (state.phaseDeg + 110 * speedFactor * dt) % 360;
    return true;
  },

  build(THREE, rootGroup, helpers) {
    const { ink } = helpers;
    const group = new THREE.Group();
    rootGroup.add(group);

    const centerY = 0.22;
    const axisLen = 0.86;

    // 1. Propagation Direction Axis (اتجاه الانتشار)
    const axisGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-axisLen * 0.5, centerY, 0),
      new THREE.Vector3(axisLen * 0.5 + 0.06, centerY, 0)
    ]);
    const axisLine = new THREE.Line(axisGeo, ink.sharedMaterials.inkLine);
    group.add(axisLine);

    const axisArrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.018, 0.048, 14),
      ink.sharedMaterials.inkLine
    );
    axisArrow.rotation.z = -Math.PI / 2;
    axisArrow.position.set(axisLen * 0.5 + 0.06, centerY, 0);
    group.add(axisArrow);

    // 2. Sinusoidal Curves for E (Vertical XY plane) and B (Horizontal XZ plane)
    const SEGMENTS = 96;
    const ePts = Array.from({ length: SEGMENTS + 1 }, () => new THREE.Vector3());
    const bPts = Array.from({ length: SEGMENTS + 1 }, () => new THREE.Vector3());

    const eWaveGeo = new THREE.BufferGeometry().setFromPoints(ePts);
    const bWaveGeo = new THREE.BufferGeometry().setFromPoints(bPts);

    const eWaveMat = new THREE.LineBasicMaterial({ color: 0xd93829 });
    const bWaveMat = new THREE.LineBasicMaterial({ color: 0x1d5b8c });

    const eWaveLine = new THREE.Line(eWaveGeo, eWaveMat);
    const bWaveLine = new THREE.Line(bWaveGeo, bWaveMat);
    group.add(eWaveLine, bWaveLine);

    // 3. Vector Comb Arrows for E (vertical red) and B (horizontal blue)
    const NUM_VECTORS = 25;
    const vectorsGroup = new THREE.Group();
    group.add(vectorsGroup);

    const eStems = [];
    const bStems = [];
    const stemGeo = new THREE.CylinderGeometry(0.003, 0.003, 1, 6);

    for (let i = 0; i < NUM_VECTORS; i++) {
      const eStem = new THREE.Mesh(stemGeo, ink.sharedMaterials.accentRed);
      const bStem = new THREE.Mesh(stemGeo, ink.sharedMaterials.accentBlue);
      bStem.rotation.x = Math.PI / 2;
      vectorsGroup.add(eStem, bStem);
      eStems.push(eStem);
      bStems.push(bStem);
    }

    // 4. Interactive Wavelength Caliper (الطول الموجي λ) with draggable handle
    const caliperGroup = new THREE.Group();
    group.add(caliperGroup);

    const caliperPts = [
      new THREE.Vector3(-0.2, 0, 0),
      new THREE.Vector3(-0.2, 0.04, 0),
      new THREE.Vector3(0.2, 0.04, 0),
      new THREE.Vector3(0.2, 0, 0)
    ];
    const caliperGeo = new THREE.BufferGeometry().setFromPoints(caliperPts);
    const caliperLine = new THREE.Line(caliperGeo, ink.sharedMaterials.inkLine);
    caliperGroup.add(caliperLine);

    const dragKnob = ink.createPaperMesh(
      new THREE.SphereGeometry(0.024, 16, 16),
      ink.sharedMaterials.accentOrange
    );
    dragKnob.userData.draggable = true;
    caliperGroup.add(dragKnob);

    // 5. Printed Arabic Labels matching page 4 figure
    const lblE = ink.createPrintedLabel('المجال الكهربائي (E)', {
      bgColor: '#d93829',
      textColor: '#ffffff',
      scale: 0.13
    });
    lblE.position.set(0.30, centerY + 0.21, 0);
    group.add(lblE);

    const lblB = ink.createPrintedLabel('المجال المغناطيسي (B)', {
      bgColor: '#1d5b8c',
      textColor: '#ffffff',
      scale: 0.13
    });
    lblB.position.set(0.25, centerY - 0.05, 0.18);
    group.add(lblB);

    const lblProp = ink.createPrintedLabel('اتجاه الانتشار', { scale: 0.12 });
    lblProp.position.set(axisLen * 0.5 + 0.05, centerY + 0.08, 0);
    group.add(lblProp);

    const lblLambda = ink.createPrintedLabel('الطول الموجي (λ)', { scale: 0.13 });
    caliperGroup.add(lblLambda);

    return {
      draggableMeshes: [dragKnob],

      onDrag(localPt, state) {
        // Dragging the wavelength caliper knob horizontally adjusts frequencyMHz
        const span = THREE.MathUtils.clamp(Math.abs(localPt.x) * 2.2, 0.18, 0.72);
        const mappedFreq = Math.round(THREE.MathUtils.mapLinear(span, 0.18, 0.72, 500, 80) / 10) * 10;
        state.frequencyMHz = THREE.MathUtils.clamp(mappedFreq, 60, 600);
      },

      update(state, out) {
        const ampScale = THREE.MathUtils.clamp((state.electricAmp || 120) / 120, 0.25, 1.8) * 0.14;
        // Visual wavelength inside the 0.86m model box
        const visualLambda = THREE.MathUtils.clamp(out.wavelengthM * 0.21, 0.18, 0.68);
        const k = (Math.PI * 2) / visualLambda;
        const phi = ((state.phaseDeg || 0) * Math.PI) / 180;

        const ePos = eWaveGeo.attributes.position;
        const bPos = bWaveGeo.attributes.position;

        for (let i = 0; i <= SEGMENTS; i++) {
          const u = i / SEGMENTS;
          const x = (u - 0.5) * axisLen;
          const val = Math.sin(k * (x + axisLen * 0.5) - phi);

          // E oscillates vertically (Y), B oscillates horizontally (Z) in exact same phase
          ePos.setXYZ(i, x, centerY + val * ampScale, 0);
          bPos.setXYZ(i, x, centerY, val * ampScale);
        }
        ePos.needsUpdate = true;
        bPos.needsUpdate = true;

        vectorsGroup.visible = Boolean(state.showVectors);
        if (vectorsGroup.visible) {
          for (let i = 0; i < NUM_VECTORS; i++) {
            const u = i / (NUM_VECTORS - 1);
            const x = (u - 0.5) * axisLen;
            const val = Math.sin(k * (x + axisLen * 0.5) - phi);
            const mag = Math.abs(val * ampScale);

            const eStem = eStems[i];
            const bStem = bStems[i];

            if (mag < 0.004) {
              eStem.visible = false;
              bStem.visible = false;
            } else {
              eStem.visible = true;
              bStem.visible = true;
              eStem.scale.set(1, mag, 1);
              eStem.position.set(x, centerY + (val * ampScale) * 0.5, 0);

              bStem.scale.set(1, mag, 1);
              bStem.position.set(x, centerY, (val * ampScale) * 0.5);
            }
          }
        }

        // Update wavelength caliper between two crests
        const xStart = -axisLen * 0.38;
        const xEnd = Math.min(axisLen * 0.45, xStart + visualLambda);
        const topY = centerY + ampScale + 0.03;

        const cPos = caliperGeo.attributes.position;
        cPos.setXYZ(0, xStart, topY - 0.025, 0);
        cPos.setXYZ(1, xStart, topY, 0);
        cPos.setXYZ(2, xEnd, topY, 0);
        cPos.setXYZ(3, xEnd, topY - 0.025, 0);
        cPos.needsUpdate = true;

        dragKnob.position.set(xEnd, topY, 0);
        lblLambda.position.set((xStart + xEnd) * 0.5, topY + 0.055, 0);
        lblLambda.userData.updateText(`الطول الموجي λ = ${out.wavelengthM.toFixed(2)} m`);
      },

      dispose() {
        rootGroup.remove(group);
      }
    };
  }
};