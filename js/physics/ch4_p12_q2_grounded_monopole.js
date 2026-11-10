/**
 * js/physics/ch4_p12_q2_grounded_monopole.js
 * Interactive 3D Simulation for Page 12, Question 2:
 * "ما الفائدة العملية من تأريض احد أقطاب الهوائي في عملية إرسال وتسلم الموجات الكهرومغناطيسية ؟"
 * "شكل (يوضح الهوائي المؤرض وكيفية توزيع الفولطية و التيار على طول سلك الهوائي و الارض)"
 */

const SPEED_OF_LIGHT = 3e8; // m/s

export default {
  id: 'ch4_p12_q2_grounded_monopole',

  source: {
    page: 12,
    seqPage: 9,
    questionNumber: 2,
    printedTitle: 'سؤال : ما الفائدة العملية من تأريض احد أقطاب الهوائي في عملية إرسال وتسلم الموجات الكهرومغناطيسية ؟'
  },

  hotspot: {
    seqPage: 9,
    printedPage: 12,
    rect: { x: 0.06, y: 0.71, w: 0.88, h: 0.21 }
  },

  focusPose: {
    position: [0.0, 1.45, 1.05],
    target: [0.0, 0.15, 0.0],
    fov: 38
  },

  controls: [
    {
      id: 'isGrounded',
      type: 'toggle',
      label: 'حالة تأريض أحد أقطاب الهوائي',
      labels: ['غير مؤرض (تنعدم الصورة في الأرض)', 'مؤرض (ربع موجة λ/4 + قطب تصويري)'],
      default: true
    },
    {
      id: 'frequencyMHz',
      label: 'تردد الإشارة المرسلة أو المستلمة',
      symbol: 'f',
      unit: 'MHz',
      min: 50,
      max: 500,
      step: 10,
      default: 150,
      derivedFromBook: true
    },
    {
      id: 'vMax',
      label: 'الفولطية العظمى للمصدر المتناوب',
      symbol: 'V_{\\max}',
      unit: 'V',
      min: 5,
      max: 50,
      step: 1,
      default: 24,
      derivedFromBook: false
    },
    {
      id: 'probeHeightNorm',
      label: 'موضع القياس على السلك (0 = النهاية المؤرضة، 1 = الطليقة)',
      symbol: 'y / \\ell',
      unit: '',
      min: 0,
      max: 1,
      step: 0.02,
      default: 0.0,
      derivedFromBook: true
    },
    {
      id: 'showImagePole',
      type: 'toggle',
      label: 'إظهار الشكل التصويري للقطب الثنائي تحت مستوى الأرض',
      labels: ['مخفي', 'ظاهر (صورة الجهد في الأرض)'],
      default: true
    },
    {
      id: 'autoPlay',
      type: 'toggle',
      label: 'التذبذب الزمني للمصدر المتناوب (~)',
      labels: ['متوقف (عرض القيم العظمى)', 'يعمل تلقائياً'],
      default: true
    }
  ],

  /**
   * Pure physics solver based on Page 12 & Page 13 rules:
   * - lambda = c / f
   * - Grounded monopole physical length: l = lambda / 4
   * - Earth creates a virtual image of length lambda / 4, completing a lambda / 2 dipole.
   * - At grounded base (y/l = 0): Voltage is minimum (~0), Current is maximum (I_max).
   * - At free top end (y/l = 1): Voltage is maximum (V_max), Current is minimum (~0).
   */
  solve(state) {
    const fHz = Math.max(1e6, (state.frequencyMHz || 150) * 1e6);
    const wavelengthM = SPEED_OF_LIGHT / fHz;
    const quarterWaveM = wavelengthM / 4;
    const effectiveHalfWaveM = state.isGrounded ? wavelengthM / 2 : quarterWaveM;

    const vMax = state.vMax ?? 24;
    const iMax = vMax / 73; // Reference radiation resistance in Ohms

    const u = Math.max(0, Math.min(1, state.probeHeightNorm ?? 0));
    const angle = u * (Math.PI * 0.5); // 0 at ground, PI/2 at top tip

    const vAtProbe = vMax * Math.sin(angle);
    const iAtProbe = iMax * Math.cos(angle);
    const bAtProbeNorm = Math.cos(angle); // B-field proportional to current I

    let pointDescription = 'بين النهايتين';
    if (u <= 0.08) {
      pointDescription = 'النهاية المؤرضة (الفولطية أقل ما يمكن والتيار أعظم ما يمكن)';
    } else if (u >= 0.92) {
      pointDescription = 'النهاية الطليقة (الفولطية أعظم ما يمكن والتيار أقل ما يمكن)';
    }

    return {
      wavelengthM,
      quarterWaveM,
      effectiveHalfWaveM,
      vMax,
      iMax,
      vAtProbe,
      iAtProbe,
      bAtProbeNorm,
      pointDescription
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
      label: 'طول الهوائي المؤرض (\\ell = \\lambda/4)',
      symbol: '\\ell',
      unit: 'm',
      value: (out) => out.quarterWaveM.toFixed(2)
    },
    {
      label: 'الطول المكافئ مع صورة الأرض',
      symbol: '\\ell_{\\text{eff}}',
      unit: 'm',
      value: (out) => out.effectiveHalfWaveM.toFixed(2)
    },
    {
      label: 'الفولطية عند نقطة القياس',
      symbol: 'V(y)',
      unit: 'V',
      value: (out) => out.vAtProbe.toFixed(1)
    },
    {
      label: 'التيار عند نقطة القياس',
      symbol: 'I(y)',
      unit: 'A',
      value: (out) => out.iAtProbe.toFixed(2)
    },
    {
      label: 'حالة نقطة القياس',
      symbol: '\\text{State}',
      unit: '',
      format: (out) => out.pointDescription
    }
  ],

  step(state, out, dt) {
    if (!state.autoPlay) return false;
    state._phase = ((state._phase || 0) + dt * 3.2) % (Math.PI * 2);
    return true;
  },

  build(THREE, rootGroup, helpers) {
    const { ink } = helpers;
    const modelGroup = new THREE.Group();
    rootGroup.add(modelGroup);

    const groundY = 0.28;

    // 1. Earth Ground Plane (مستوى الارض) — translucent glass/paper plane at groundY
    const groundGeo = new THREE.BoxGeometry(1.15, 0.012, 0.42);
    const groundMesh = ink.createPaperMesh(groundGeo, ink.sharedMaterials.accentBlue.clone());
    groundMesh.material.transparent = true;
    groundMesh.material.opacity = 0.25;
    groundMesh.position.set(0, groundY, 0);
    modelGroup.add(groundMesh);

    const groundLabel = ink.createPrintedLabel('مستوى الارض', {
      bgColor: 'rgba(29, 91, 140, 0.92)',
      textColor: '#ffffff',
      scale: 0.13
    });
    groundLabel.position.set(-0.02, groundY + 0.04, 0.16);
    modelGroup.add(groundLabel);

    // 2. Left Diagram: Real Quarter-Wave Monopole (above ground) & Dashed Virtual Image (below ground)
    const leftX = -0.26;
    const basePoleLen = 0.24;

    const realPoleGeo = new THREE.CylinderGeometry(0.014, 0.014, basePoleLen, 16);
    const realPole = ink.createPaperMesh(realPoleGeo, ink.sharedMaterials.paperWarm.clone());
    modelGroup.add(realPole);

    // Virtual image pole (الشكل التصويري للقطب الثنائي للهوائي) below ground
    const imagePoleGeo = new THREE.CylinderGeometry(0.012, 0.012, basePoleLen, 16);
    const imagePoleMat = ink.sharedMaterials.glass.clone();
    imagePoleMat.color.setHex(0xd96b27);
    imagePoleMat.opacity = 0.45;
    const imagePole = new THREE.Mesh(imagePoleGeo, imagePoleMat);
    modelGroup.add(imagePole);

    // Grounding symbol lines (رمز التأريض)
    const gndSymbolGroup = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const w = 0.07 - i * 0.02;
      const gGeo = new THREE.BoxGeometry(w, 0.006, 0.008);
      const gBar = new THREE.Mesh(gGeo, ink.sharedMaterials.inkLine);
      gBar.position.set(leftX - 0.06, groundY + 0.02 - i * 0.016, 0);
      gndSymbolGroup.add(gBar);
    }
    modelGroup.add(gndSymbolGroup);

    const imageLabel = ink.createPrintedLabel('الشكل التصويري للقطب الثنائي للهوائي (λ/4)', {
      bgColor: 'rgba(250, 246, 238, 0.95)',
      textColor: '#c95b1e',
      scale: 0.13
    });
    imageLabel.position.set(leftX, groundY - 0.22, 0.08);
    modelGroup.add(imageLabel);

    // 3. Right Diagram: AC Feed Source (~) + V, I (i/2), and B-field distribution curves
    const rightX = 0.24;
    const rightRealPole = ink.createPaperMesh(realPoleGeo.clone(), ink.sharedMaterials.paper.clone());
    const rightImagePole = new THREE.Mesh(imagePoleGeo.clone(), imagePoleMat);
    modelGroup.add(rightRealPole, rightImagePole);

    // AC Oscillator circle (~) at ground level
    const acGeo = new THREE.CylinderGeometry(0.036, 0.036, 0.022, 24);
    acGeo.rotateX(Math.PI / 2);
    const acMesh = ink.createPaperMesh(acGeo, ink.sharedMaterials.paper);
    acMesh.position.set(rightX, groundY, 0.02);
    modelGroup.add(acMesh);

    const acLabel = ink.createPrintedLabel('~ مصدر متناوب', { scale: 0.11 });
    acLabel.position.set(rightX - 0.11, groundY, 0.04);
    modelGroup.add(acLabel);

    // Distribution Curves (Current I in orange/red, Magnetic Field B / Voltage envelope in blue)
    const SEGMENTS = 48;
    const currentCurvePts = Array.from({ length: SEGMENTS + 1 }, () => new THREE.Vector3());
    const currentCurveGeo = new THREE.BufferGeometry().setFromPoints(currentCurvePts);
    const currentCurveLine = new THREE.Line(
      currentCurveGeo,
      new THREE.LineBasicMaterial({ color: 0xd96b27 })
    );
    modelGroup.add(currentCurveLine);

    const bFieldCurvePts = Array.from({ length: SEGMENTS + 1 }, () => new THREE.Vector3());
    const bFieldCurveGeo = new THREE.BufferGeometry().setFromPoints(bFieldCurvePts);
    const bFieldCurveLine = new THREE.Line(
      bFieldCurveGeo,
      new THREE.LineBasicMaterial({ color: 0x1d5b8c })
    );
    modelGroup.add(bFieldCurveLine);

    // Horizontal 3D Magnetic Field Ring around the antenna at probe height
    const bRingGeo = new THREE.RingGeometry(0.06, 0.068, 48);
    bRingGeo.rotateX(-Math.PI / 2);
    const bRingMat = new THREE.MeshBasicMaterial({
      color: 0x1d5b8c,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65
    });
    const bRingMesh = new THREE.Mesh(bRingGeo, bRingMat);
    modelGroup.add(bRingMesh);

    const bLabel = ink.createPrintedLabel('المجال المغناطيسي B', {
      textColor: '#1d5b8c',
      scale: 0.12
    });
    modelGroup.add(bLabel);

    const lambdaTopLabel = ink.createPrintedLabel('λ / 4 (حقيقي)', { scale: 0.12 });
    const lambdaBotLabel = ink.createPrintedLabel('λ / 4 (تصويري)', { scale: 0.12 });
    modelGroup.add(lambdaTopLabel, lambdaBotLabel);

    // 4. Interactive Draggable Measurement Probe Sphere along the antenna
    const probeGeo = new THREE.SphereGeometry(0.026, 20, 20);
    const probeMesh = ink.createPaperMesh(probeGeo, ink.sharedMaterials.accentRed.clone());
    probeMesh.userData.draggable = true;
    modelGroup.add(probeMesh);

    const probeReadoutLabel = ink.createPrintedLabel('نقطة القياس', {
      bgColor: '#1e242b',
      textColor: '#ffffff',
      scale: 0.12
    });
    modelGroup.add(probeReadoutLabel);

    return {
      draggableMeshes: [probeMesh],

      onDrag(localPt, state) {
        const scaleLen = THREE.MathUtils.clamp(300 / (state.frequencyMHz || 150) * 0.5, 0.55, 1.35);
        const poleH = basePoleLen * scaleLen;
        const norm = (localPt.y - groundY) / poleH;
        state.probeHeightNorm = Number(THREE.MathUtils.clamp(norm, 0, 1).toFixed(2));
      },

      update(state, out) {
        const freqScale = THREE.MathUtils.clamp((150 / (state.frequencyMHz || 150)) ** 0.35, 0.65, 1.35);
        const poleH = basePoleLen * freqScale;
        const showImg = Boolean(state.isGrounded && state.showImagePole);

        // Position left & right real poles (above ground)
        realPole.scale.set(1, freqScale, 1);
        realPole.position.set(leftX, groundY + poleH * 0.5, 0);

        rightRealPole.scale.set(1, freqScale, 1);
        rightRealPole.position.set(rightX, groundY + poleH * 0.5, 0);

        // Position virtual image poles (below ground)
        imagePole.visible = showImg;
        rightImagePole.visible = showImg;
        imageLabel.visible = showImg;
        lambdaBotLabel.visible = showImg;
        gndSymbolGroup.visible = Boolean(state.isGrounded);

        imagePole.scale.set(1, freqScale, 1);
        imagePole.position.set(leftX, groundY - poleH * 0.5, 0);

        rightImagePole.scale.set(1, freqScale, 1);
        rightImagePole.position.set(rightX, groundY - poleH * 0.5, 0);

        lambdaTopLabel.position.set(rightX + 0.22, groundY + poleH * 0.5, 0);
        lambdaBotLabel.position.set(rightX + 0.22, groundY - poleH * 0.5, 0);

        // Update standing wave curves for I (i/2) and B / V along [-poleH, +poleH]
        const phaseOsc = state.autoPlay ? Math.cos(state._phase || 0) : 1.0;
        const vFactor = THREE.MathUtils.clamp((state.vMax || 24) / 24, 0.4, 1.8);
        const maxCurveWidth = 0.14 * vFactor;

        const cPos = currentCurveLine.geometry.attributes.position;
        const bPos = bFieldCurveLine.geometry.attributes.position;

        for (let i = 0; i <= SEGMENTS; i++) {
          const t = i / SEGMENTS; // 0 (bottom image tip) to 1 (top real tip)
          const u = showImg ? t * 2 - 1 : t; // -1..+1 if image shown, else 0..+1
          const y = groundY + u * poleH;
          const angle = u * (Math.PI * 0.5);

          // Current & B-field peak at ground level (u = 0) and go to 0 at ends (|u| = 1)
          const currentEnv = Math.cos(angle) * maxCurveWidth * phaseOsc;
          // Voltage peaks at ends (|u| = 1) with opposite polarity in image
          const voltageEnv = Math.sin(angle) * maxCurveWidth * 0.9 * phaseOsc;

          cPos.setXYZ(i, rightX - Math.abs(currentEnv), y, 0.01);
          bPos.setXYZ(i, rightX + Math.abs(currentEnv) * 1.15 + voltageEnv * 0.25, y, 0.01);
        }
        cPos.needsUpdate = true;
        bPos.needsUpdate = true;

        // Position draggable probe and 3D Magnetic B-ring
        const probeU = THREE.MathUtils.clamp(state.probeHeightNorm || 0, 0, 1);
        const probeY = groundY + probeU * poleH;
        probeMesh.position.set(rightX, probeY, 0.025);

        const bScale = Math.max(0.25, out.bAtProbeNorm * vFactor * 1.3);
        bRingMesh.position.set(rightX, probeY, 0);
        bRingMesh.scale.set(bScale, 1, bScale);

        bLabel.position.set(rightX + 0.13, groundY + poleH * 0.25, 0.03);
        probeReadoutLabel.position.set(
          rightX - 0.16,
          probeY + 0.04,
          0.04
        );
        probeReadoutLabel.userData.updateText(
          `V=${out.vAtProbe.toFixed(1)}V | I=${out.iAtProbe.toFixed(2)}A`
        );
      },

      dispose() {
        rootGroup.remove(modelGroup);
      }
    };
  }
};