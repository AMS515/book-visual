/**
 * js/physics/ch4_p13_q2_antenna_resonance_calc.js
 * Interactive 3D Simulation for Page 13:
 * 1) "قارن بين الهوائي النصف موجي والهوائي ربع الموجي ؟"
 * 2) "عندما نلمس هوائي الراديو تزداد شدة الاستقبال تحسناً وضح ذلك"
 * 3) "حساب طول الهوائي" (l = lambda/2, l = lambda/4, lambda = c/f, f_r = 1 / (2*pi*sqrt(L*C)))
 */

const SPEED_OF_LIGHT = 3e8; // m/s

export default {
  id: 'ch4_p13_q2_antenna_resonance_calc',

  source: {
    page: 13,
    seqPage: 10,
    questionNumber: 2,
    printedTitle: 'مقارنة الهوائي النصف موجي والربع موجي + حساب طول الهوائي والتردد الرنيني'
  },

  hotspot: {
    seqPage: 10,
    printedPage: 13,
    rect: { x: 0.06, y: 0.69, w: 0.88, h: 0.20 }
  },

  focusPose: {
    position: [0.0, 1.50, 1.10],
    target: [0.0, 0.14, 0.0],
    fov: 38
  },

  controls: [
    {
      id: 'frequencyMHz',
      label: 'تردد الموجة المرسلة أو المستقبلة',
      symbol: 'f',
      unit: 'MHz',
      min: 30,
      max: 300,
      step: 5,
      default: 100,
      derivedFromBook: true
    },
    {
      id: 'inductanceUH',
      label: 'معامل الحث الذاتي لدائرة الاهتزاز',
      symbol: 'L',
      unit: 'μH',
      min: 0.1,
      max: 10.0,
      step: 0.1,
      default: 2.5,
      derivedFromBook: true
    },
    {
      id: 'capacitancePF',
      label: 'سعة المتسعة لدائرة الاهتزاز',
      symbol: 'C',
      unit: 'pF',
      min: 0.2,
      max: 10.0,
      step: 0.1,
      default: 1.0,
      derivedFromBook: true
    },
    {
      id: 'touchRadioAntenna',
      type: 'toggle',
      label: 'لمس هوائي الراديو (سؤال أعلى ص13)',
      labels: ['بدون لمس (سعة C اعتيادية)', 'عند لمس الهوائي (يصبح λ/4 وتقل C فيزداد الانتقاء)'],
      default: false
    },
    {
      id: 'probePosNorm',
      label: 'موضع المقارنة على الهوائيين (0 = المنتصف/الأرض، 1 = الطرف)',
      symbol: 'x / \\ell',
      unit: '',
      min: 0,
      max: 1,
      step: 0.05,
      default: 1.0,
      derivedFromBook: true
    }
  ],

  /**
   * Pure physics solver implementing all four textbook boxes on Page 13:
   * 1) lambda = c / f
   * 2) Half-wave antenna length: l_half = lambda / 2
   * 3) Quarter-wave grounded antenna length: l_quarter = lambda / 4
   * 4) Natural resonant frequency: f_r = 1 / (2 * pi * sqrt(L * C))
   * Plus the effect of touching the radio antenna (C decreases -> Quality factor Q increases).
   */
  solve(state) {
    const fHz = Math.max(1e6, (state.frequencyMHz || 100) * 1e6);
    const wavelengthM = SPEED_OF_LIGHT / fHz; // lambda = c / f

    const lengthHalfWaveM = wavelengthM / 2; // l = lambda / 2
    const lengthQuarterWaveM = wavelengthM / 4; // l = lambda / 4

    const L_Henry = Math.max(0.05, state.inductanceUH || 2.5) * 1e-6;
    // Touching the antenna decreases effective capacitance C and sharpens selectivity (Q factor)
    const rawC_pF = Math.max(0.1, state.capacitancePF || 1.0);
    const effectiveC_pF = state.touchRadioAntenna ? rawC_pF * 0.65 : rawC_pF;
    const C_Farad = effectiveC_pF * 1e-12;

    const resonantFreqHz = 1 / (2 * Math.PI * Math.sqrt(L_Henry * C_Farad));
    const resonantFreqMHz = resonantFreqHz / 1e6;

    // Quality factor & reception strength indicator
    const qualityFactor = state.touchRadioAntenna ? 'حاد وجيد جداً (Q عالي)' : 'اعتيادي';

    // Normalized V and I distributions along both antennas at probePosNorm (0 = center/ground, 1 = end)
    const u = Math.max(0, Math.min(1, state.probePosNorm ?? 1));
    const vNorm = Math.sin(u * Math.PI * 0.5);
    const iNorm = Math.cos(u * Math.PI * 0.5);

    return {
      wavelengthM,
      lengthHalfWaveM,
      lengthQuarterWaveM,
      effectiveC_pF,
      resonantFreqMHz,
      qualityFactor,
      vNorm,
      iNorm
    };
  },

  readouts: [
    {
      label: 'الطول الموجي (\\lambda = c/f)',
      symbol: '\\lambda',
      unit: 'm',
      value: (out) => out.wavelengthM.toFixed(2)
    },
    {
      label: 'طول الهوائي النصف موجي (\\lambda/2)',
      symbol: '\\ell_{1/2}',
      unit: 'm',
      value: (out) => out.lengthHalfWaveM.toFixed(2)
    },
    {
      label: 'طول الهوائي الربع موجي (\\lambda/4)',
      symbol: '\\ell_{1/4}',
      unit: 'm',
      value: (out) => out.lengthQuarterWaveM.toFixed(2)
    },
    {
      label: 'التردد الرنيني الطبيعي (f_r)',
      symbol: 'f_r',
      unit: 'MHz',
      value: (out) => out.resonantFreqMHz.toFixed(1)
    },
    {
      label: 'عامل الجودة والانتقاء',
      symbol: 'Q',
      unit: '',
      format: (out) => out.qualityFactor
    }
  ],

  build(THREE, rootGroup, helpers) {
    const { ink } = helpers;
    const modelGroup = new THREE.Group();
    rootGroup.add(modelGroup);

    const baseY = 0.22;

    // ==================== 1. RIGHT SIDE: HALF-WAVE DIPOLE (الهوائي النصف موجي l = λ/2) ====================
    const rightX = 0.30;
    const halfDipoleGroup = new THREE.Group();
    halfDipoleGroup.position.set(rightX, baseY, 0);
    modelGroup.add(halfDipoleGroup);

    const rodGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.18, 16);
    const topHalfRod = ink.createPaperMesh(rodGeo, ink.sharedMaterials.accentOrange.clone());
    const botHalfRod = ink.createPaperMesh(rodGeo, ink.sharedMaterials.accentOrange.clone());
    halfDipoleGroup.add(topHalfRod, botHalfRod);

    const halfWaveTitle = ink.createPrintedLabel('الهوائي النصف موجي (ℓ = λ/2)', {
      bgColor: 'rgba(223, 100, 38, 0.94)',
      textColor: '#ffffff',
      scale: 0.13
    });
    halfWaveTitle.position.set(0, 0.28, 0);
    halfDipoleGroup.add(halfWaveTitle);

    const halfWaveNote = ink.createPrintedLabel('غير مؤرض • Vmax عند النهايتين • Imax بالمنتصف', {
      scale: 0.11
    });
    halfWaveNote.position.set(0, -0.24, 0.06);
    halfDipoleGroup.add(halfWaveNote);

    // Standing wave envelopes on Half-Wave Dipole (Red = Voltage V, Blue = Current I)
    const SEG = 40;
    const hwVoltGeo = new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: SEG + 1 }, () => new THREE.Vector3())
    );
    const hwVoltLine = new THREE.Line(hwVoltGeo, new THREE.LineBasicMaterial({ color: 0xd93829 }));
    const hwCurrGeo = new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: SEG + 1 }, () => new THREE.Vector3())
    );
    const hwCurrLine = new THREE.Line(hwCurrGeo, new THREE.LineBasicMaterial({ color: 0x1d5b8c }));
    halfDipoleGroup.add(hwVoltLine, hwCurrLine);

    // ==================== 2. LEFT SIDE: QUARTER-WAVE GROUNDED (الهوائي الربع موجي المؤرض l = λ/4) ====================
    const leftX = -0.30;
    const quarterGroup = new THREE.Group();
    quarterGroup.position.set(leftX, baseY, 0);
    modelGroup.add(quarterGroup);

    // Ground plate at y = 0 of quarterGroup
    const gndPlateGeo = new THREE.BoxGeometry(0.34, 0.012, 0.22);
    const gndPlate = ink.createPaperMesh(gndPlateGeo, ink.sharedMaterials.accentBlue.clone());
    gndPlate.material.transparent = true;
    gndPlate.material.opacity = 0.30;
    quarterGroup.add(gndPlate);

    const qwRealRod = ink.createPaperMesh(rodGeo.clone(), ink.sharedMaterials.accentGreen.clone());
    const qwImageRod = new THREE.Mesh(rodGeo.clone(), ink.sharedMaterials.glass.clone());
    quarterGroup.add(qwRealRod, qwImageRod);

    const quarterWaveTitle = ink.createPrintedLabel('الهوائي الربع موجي المؤرض (ℓ = λ/4)', {
      bgColor: 'rgba(26, 140, 91, 0.94)',
      textColor: '#ffffff',
      scale: 0.13
    });
    quarterWaveTitle.position.set(0, 0.28, 0);
    quarterGroup.add(quarterWaveTitle);

    const quarterWaveNote = ink.createPrintedLabel('متصل بالأرض • Vmax بالطليقة • Imax بالمؤرضة', {
      scale: 0.11
    });
    quarterWaveNote.position.set(0, -0.24, 0.06);
    quarterGroup.add(quarterWaveNote);

    const qwVoltGeo = new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: SEG + 1 }, () => new THREE.Vector3())
    );
    const qwVoltLine = new THREE.Line(qwVoltGeo, new THREE.LineBasicMaterial({ color: 0xd93829 }));
    const qwCurrGeo = new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: SEG + 1 }, () => new THREE.Vector3())
    );
    const qwCurrLine = new THREE.Line(qwCurrGeo, new THREE.LineBasicMaterial({ color: 0x1d5b8c }));
    quarterGroup.add(qwVoltLine, qwCurrLine);

    // ==================== 3. CENTER: LC RESONANCE & SELECTIVITY CURVE (f_r = 1 / 2π√LC) ====================
    const centerGroup = new THREE.Group();
    centerGroup.position.set(0, baseY - 0.04, 0);
    modelGroup.add(centerGroup);

    const resCardGeo = new THREE.BoxGeometry(0.24, 0.22, 0.02);
    const resCard = ink.createPaperMesh(resCardGeo, ink.sharedMaterials.paper);
    centerGroup.add(resCard);

    // Resonance selectivity curve (bell curve showing Q sharpness when touching antenna)
    const resCurveGeo = new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: SEG + 1 }, () => new THREE.Vector3())
    );
    const resCurveLine = new THREE.Line(
      resCurveGeo,
      new THREE.LineBasicMaterial({ color: 0xd93829 })
    );
    centerGroup.add(resCurveLine);

    const frLabel = ink.createPrintedLabel('دائرة الرنين LC', {
      bgColor: '#1d5b8c',
      textColor: '#ffffff',
      scale: 0.12
    });
    frLabel.position.set(0, 0.16, 0.02);
    centerGroup.add(frLabel);

    // Draggable comparison marker
    const markerGeo = new THREE.SphereGeometry(0.022, 16, 16);
    const markerRight = ink.createPaperMesh(markerGeo, ink.sharedMaterials.accentRed.clone());
    const markerLeft = ink.createPaperMesh(markerGeo, ink.sharedMaterials.accentRed.clone());
    markerRight.userData.draggable = true;
    markerLeft.userData.draggable = true;
    halfDipoleGroup.add(markerRight);
    quarterGroup.add(markerLeft);

    return {
      draggableMeshes: [markerRight, markerLeft],

      onDrag(localPt, state) {
        const norm = THREE.MathUtils.clamp(Math.abs(localPt.y - baseY) / 0.18, 0, 1);
        state.probePosNorm = Number(norm.toFixed(2));
      },

      update(state, out) {
        // Scale antennas visually according to wavelength (lambda = c / f)
        const scale = THREE.MathUtils.clamp((100 / (state.frequencyMHz || 100)) ** 0.35, 0.6, 1.35);
        const quarterLen = 0.14 * scale; // l = lambda / 4
        const gap = 0.012;

        // 1. Update Right Half-Wave Dipole (Total length = 2 * quarterLen = lambda / 2)
        topHalfRod.scale.set(1, quarterLen / 0.18, 1);
        botHalfRod.scale.set(1, quarterLen / 0.18, 1);
        topHalfRod.position.set(0, gap + quarterLen * 0.5, 0);
        botHalfRod.position.set(0, -gap - quarterLen * 0.5, 0);

        const hwV = hwVoltLine.geometry.attributes.position;
        const hwI = hwCurrLine.geometry.attributes.position;
        for (let i = 0; i <= SEG; i++) {
          const u = (i / SEG) * 2 - 1; // -1 to +1
          const y = u * quarterLen;
          const vAmp = Math.abs(Math.sin(u * Math.PI * 0.5)) * 0.095;
          const iAmp = Math.cos(u * Math.PI * 0.5) * 0.095;
          hwV.setXYZ(i, vAmp, y, 0.01);
          hwI.setXYZ(i, -iAmp, y, 0.01);
        }
        hwV.needsUpdate = true;
        hwI.needsUpdate = true;

        // 2. Update Left Quarter-Wave Grounded Monopole (Real above ground = quarterLen, Image below = quarterLen)
        qwRealRod.scale.set(1, quarterLen / 0.18, 1);
        qwImageRod.scale.set(1, quarterLen / 0.18, 1);
        qwRealRod.position.set(0, quarterLen * 0.5, 0);
        qwImageRod.position.set(0, -quarterLen * 0.5, 0);

        const qwV = qwVoltLine.geometry.attributes.position;
        const qwI = qwCurrLine.geometry.attributes.position;
        for (let i = 0; i <= SEG; i++) {
          const u = i / SEG; // 0 (grounded base) to +1 (free top end)
          const y = u * quarterLen;
          const vAmp = Math.sin(u * Math.PI * 0.5) * 0.095;
          const iAmp = Math.cos(u * Math.PI * 0.5) * 0.095;
          qwV.setXYZ(i, vAmp, y, 0.01);
          qwI.setXYZ(i, -iAmp, y, 0.01);
        }
        qwV.needsUpdate = true;
        qwI.needsUpdate = true;

        // Position comparison probe spheres on both antennas
        const probeU = THREE.MathUtils.clamp(state.probePosNorm ?? 1, 0, 1);
        markerRight.position.set(0, probeU * quarterLen, 0.025);
        markerLeft.position.set(0, probeU * quarterLen, 0.025);

        // 3. Update Center Resonance Selectivity Curve (Sharpens when touchRadioAntenna is true)
        const rPos = resCurveLine.geometry.attributes.position;
        const qWidth = state.touchRadioAntenna ? 0.18 : 0.42;
        const peakBoost = state.touchRadioAntenna ? 0.085 : 0.055;
        for (let i = 0; i <= SEG; i++) {
          const xNorm = (i / SEG) * 2 - 1; // -1 to +1
          const x = xNorm * 0.095;
          const bell = 1 / (1 + (xNorm / qWidth) ** 2);
          const y = -0.07 + bell * peakBoost * 1.8;
          rPos.setXYZ(i, x, y, 0.015);
        }
        rPos.needsUpdate = true;
        frLabel.userData.updateText(`fr = ${out.resonantFreqMHz.toFixed(1)} MHz`);
      },

      dispose() {
        rootGroup.remove(modelGroup);
      }
    };
  }
};