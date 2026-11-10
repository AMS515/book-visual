/**
 * js/physics/ch4_p6_q3_hertz_spark.js
 * Page 6, Question 3 & Page 7, Question 1:
 * "كيف تمكن العالم هرتز من توليد الموجات الكهرومغناطيسية؟"
 * "ما الشرط اللازم للحصول على الشرارة الكهربائية بين نهايتي الحلقة المعدنية المستقبل في جهاز هرتز؟"
 *
 * Interactive Conditions from Book:
 * 1. Sufficient voltage gradient across transmitter electrodes (توافر انحدار جهد كافٍ).
 * 2. Receiver ring must have a specific resonant diameter (أن تكون الحلقة ذات قطر محدد).
 * 3. Receiver gap line must be parallel to transmitter spark axis (يوازي الخط الواصل بين قطبي المرسل: θ = 0°).
 */

export default {
  id: 'ch4_p6_q3_hertz_spark',

  source: {
    page: 6,
    seqPage: 4,
    questionNumber: 3,
    printedTitle: 'سؤال : كيف تمكن العالم هرتز من توليد الموجات الكهرومغناطيسية؟ (جهاز هرتز)'
  },

  hotspot: {
    seqPage: 4,
    printedPage: 6,
    rect: { x: 0.05, y: 0.56, w: 0.90, h: 0.39 }
  },

  focusPose: {
    position: [0.0, 1.45, 1.15],
    target: [0.0, 0.16, 0.22],
    fov: 38
  },

  controls: [
    {
      id: 'voltageGradientKV',
      label: 'انحدار الجهد بين قطبي المرسل',
      symbol: '\\Delta V / d',
      unit: 'kV/cm',
      min: 10,
      max: 60,
      step: 1,
      default: 36,
      derivedFromBook: true
    },
    {
      id: 'receiverAngleDeg',
      label: 'زاوية فتحة الحلقة المستقبلة (0° = موازٍ)',
      symbol: '\\theta',
      unit: 'deg',
      min: 0,
      max: 90,
      step: 1,
      default: 0,
      derivedFromBook: true
    },
    {
      id: 'receiverDiameterCm',
      label: 'قطر الحلقة المعدنية المستقبلة (الرنين = 20 cm)',
      symbol: 'D',
      unit: 'cm',
      min: 10,
      max: 30,
      step: 0.5,
      default: 20,
      derivedFromBook: true
    },
    {
      id: 'separationCm',
      label: 'البعد بين المرسل والحلقة المستقبلة',
      symbol: 'x',
      unit: 'cm',
      min: 30,
      max: 100,
      step: 5,
      default: 55,
      derivedFromBook: false
    },
    {
      id: 'autoSpark',
      type: 'toggle',
      label: 'توليد الشرارة الكهرومغناطيسية',
      labels: ['متوقف', 'شرارة نشطة'],
      default: true
    }
  ],

  solve(state) {
    const grad = state.voltageGradientKV ?? 36;
    const breakdownThreshold = 30; // kV/cm required for air ionization spark
    const transmitterSparkActive = grad >= breakdownThreshold;

    const angleDeg = state.receiverAngleDeg ?? 0;
    const alignmentFactor = Math.cos((angleDeg * Math.PI) / 180); // 1 at 0° (parallel), 0 at 90° (perpendicular)

    const diam = state.receiverDiameterCm ?? 20;
    const resonantDiam = 20.0;
    // Gaussian resonance curve around D = 20 cm
    const resonanceFactor = Math.exp(-Math.pow((diam - resonantDiam) / 2.8, 2));

    const receiverSparkIntensity = transmitterSparkActive
      ? (grad / 45) * alignmentFactor * resonanceFactor
      : 0;

    const receiverSparkActive = receiverSparkIntensity >= 0.52;

    let statusText = 'تتولد شرارة في المستقبل (تحقق الشرطين)';
    if (!transmitterSparkActive) {
      statusText = 'انحدار الجهد غير كافٍ لإحداث شرارة المرسل';
    } else if (alignmentFactor < 0.7) {
      statusText = 'لا تتولد شرارة (فتحة الحلقة لا توازي خط القطبين)';
    } else if (resonanceFactor < 0.65) {
      statusText = 'لا تتولد شرارة (قطر الحلقة غير مطابق للقطر المحدد)';
    }

    return {
      transmitterSparkActive,
      alignmentFactor,
      resonanceFactor,
      receiverSparkIntensity,
      receiverSparkActive,
      statusText
    };
  },

  readouts: [
    {
      label: 'شرارة ملف الحث (المرسل)',
      symbol: 'S_{\\text{tx}}',
      unit: '',
      format: (out) => (out.transmitterSparkActive ? 'متولدة (انحدار جهد كافٍ)' : 'منعدمة')
    },
    {
      label: 'توازي الفتحة (cos θ)',
      symbol: '\\cos\\theta',
      unit: '',
      value: (out) => out.alignmentFactor.toFixed(2)
    },
    {
      label: 'توافق قطر الحلقة الرنيني',
      symbol: 'Q_D',
      unit: '%',
      value: (out) => (out.resonanceFactor * 100).toFixed(0)
    },
    {
      label: 'حالة الحلقة المستقبلة',
      symbol: 'S_{\\text{rx}}',
      unit: '',
      format: (out) => out.statusText
    }
  ],

  step(state, out, dt) {
    if (!state.autoSpark) return false;
    state._sparkTime = (state._sparkTime || 0) + dt * 18;
    return true;
  },

  build(THREE, rootGroup, helpers) {
    const { ink } = helpers;
    const group = new THREE.Group();
    rootGroup.add(group);

    // 1. Induction Coil Transmitter (جهاز ملف الحث - المرسل) on the left
    const txGroup = new THREE.Group();
    txGroup.position.set(-0.34, 0, 0);
    group.add(txGroup);

    const baseBox = ink.createPaperMesh(
      new THREE.BoxGeometry(0.32, 0.05, 0.22),
      ink.sharedMaterials.paperWarm
    );
    baseBox.position.y = 0.025;
    txGroup.add(baseBox);

    const coilCylGeo = new THREE.CylinderGeometry(0.068, 0.068, 0.22, 24);
    coilCylGeo.rotateZ(Math.PI / 2);
    const coilCyl = ink.createPaperMesh(coilCylGeo, ink.sharedMaterials.accentOrange);
    coilCyl.position.set(0, 0.11, 0);
    txGroup.add(coilCyl);

    // Transmitter Electrode Posts & Spark Spheres (قطبي الملف الثانوي)
    const postGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.24, 12);
    const leftPost = ink.createPaperMesh(postGeo, ink.sharedMaterials.paper);
    leftPost.position.set(-0.045, 0.22, 0);
    const rightPost = ink.createPaperMesh(postGeo, ink.sharedMaterials.paper);
    rightPost.position.set(0.045, 0.22, 0);
    txGroup.add(leftPost, rightPost);

    const sphereGeo = new THREE.SphereGeometry(0.024, 18, 18);
    const txSphere1 = ink.createPaperMesh(sphereGeo, ink.sharedMaterials.accentOrange);
    txSphere1.position.set(-0.032, 0.34, 0);
    const txSphere2 = ink.createPaperMesh(sphereGeo, ink.sharedMaterials.accentOrange);
    txSphere2.position.set(0.032, 0.34, 0);
    txGroup.add(txSphere1, txSphere2);

    // Jagged Transmitter Spark Line
    const sparkPts = Array.from({ length: 8 }, () => new THREE.Vector3());
    const txSparkGeo = new THREE.BufferGeometry().setFromPoints(sparkPts);
    const txSparkLine = new THREE.Line(
      txSparkGeo,
      new THREE.LineBasicMaterial({ color: 0x38bdf8 })
    );
    txSparkLine.position.set(0, 0.34, 0);
    txGroup.add(txSparkLine);

    const lblTx = ink.createPrintedLabel('ملف الحث (المرسل)', { scale: 0.13 });
    lblTx.position.set(0, 0.45, 0);
    txGroup.add(lblTx);

    // 2. Receiver Metallic Ring with Gap (حلقة معدنية مستقبلة) on the right
    const rxStandGroup = new THREE.Group();
    rxStandGroup.position.set(0.32, 0, 0);
    group.add(rxStandGroup);

    const rxBase = ink.createPaperMesh(
      new THREE.CylinderGeometry(0.09, 0.11, 0.04, 18),
      ink.sharedMaterials.paperWarm
    );
    rxBase.position.y = 0.02;
    rxStandGroup.add(rxBase);

    const rxPillar = ink.createPaperMesh(
      new THREE.CylinderGeometry(0.01, 0.01, 0.26, 12),
      ink.sharedMaterials.paper
    );
    rxPillar.position.y = 0.15;
    rxStandGroup.add(rxPillar);

    // Rotatable Receiver Ring Assembly
    const rxRingPivot = new THREE.Group();
    rxRingPivot.position.set(0, 0.34, 0);
    rxStandGroup.add(rxRingPivot);

    // Open torus (with gap for spark)
    const torusGeo = new THREE.TorusGeometry(0.11, 0.009, 12, 40, Math.PI * 1.82);
    torusGeo.rotateZ(Math.PI * 0.09);
    const rxRingMesh = ink.createPaperMesh(torusGeo, ink.sharedMaterials.accentBlue);
    rxRingMesh.userData.draggable = true;
    rxRingPivot.add(rxRingMesh);

    const gapBallGeo = new THREE.SphereGeometry(0.016, 14, 14);
    const rxBall1 = ink.createPaperMesh(gapBallGeo, ink.sharedMaterials.accentOrange);
    rxBall1.position.set(0.105, 0.028, 0);
    const rxBall2 = ink.createPaperMesh(gapBallGeo, ink.sharedMaterials.accentOrange);
    rxBall2.position.set(0.105, -0.028, 0);
    rxRingPivot.add(rxBall1, rxBall2);

    const rxSparkPts = Array.from({ length: 6 }, () => new THREE.Vector3());
    const rxSparkGeo = new THREE.BufferGeometry().setFromPoints(rxSparkPts);
    const rxSparkLine = new THREE.Line(
      rxSparkGeo,
      new THREE.LineBasicMaterial({ color: 0x38bdf8 })
    );
    rxSparkLine.position.set(0.105, 0, 0);
    rxRingPivot.add(rxSparkLine);

    const lblRx = ink.createPrintedLabel('حلقة معدنية مستقبلة (اسحب لتدوير الفتحة)', { scale: 0.13 });
    lblRx.position.set(0, 0.52, 0);
    rxStandGroup.add(lblRx);

    // 3. Propagating EM Wavefront Arcs between Transmitter and Receiver
    const waveGroup = new THREE.Group();
    group.add(waveGroup);
    const waveArcs = [];
    for (let i = 0; i < 4; i++) {
      const pts = [];
      for (let s = -12; s <= 12; s++) {
        const a = (s / 12) * 0.55;
        pts.push(new THREE.Vector3(Math.cos(a) * 0.08, Math.sin(a) * 0.12, 0));
      }
      const wGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const wLine = new THREE.Line(
        wGeo,
        new THREE.LineBasicMaterial({ color: 0xd93829, transparent: true, opacity: 0.75 })
      );
      waveGroup.add(wLine);
      waveArcs.push(wLine);
    }

    const statusBanner = ink.createPrintedLabel('تتولد شرارة في المستقبل', {
      bgColor: '#1a8c5b',
      textColor: '#ffffff',
      scale: 0.14
    });
    statusBanner.position.set(0, 0.06, 0.30);
    group.add(statusBanner);

    return {
      draggableMeshes: [rxRingMesh],

      onDrag(localPt, state) {
        // Dragging receiver ring changes its orientation angle θ (0..90 deg)
        const dy = localPt.y - 0.34;
        const angle = THREE.MathUtils.clamp(Math.round(Math.abs(dy) * 450), 0, 90);
        state.receiverAngleDeg = angle;
      },

      update(state, out) {
        const sepX = THREE.MathUtils.mapLinear(state.separationCm || 55, 30, 100, 0.18, 0.42);
        txGroup.position.x = -sepX;
        rxStandGroup.position.x = sepX;

        // Scale receiver ring diameter D (resonant at 20 cm -> scale 1.0)
        const dScale = (state.receiverDiameterCm || 20) / 20;
        rxRingPivot.scale.setScalar(dScale);

        // Rotate receiver gap axis relative to transmitter spark axis
        // At 0 deg, both spark gaps are aligned; at 90 deg, they are perpendicular
        const rotRad = ((state.receiverAngleDeg || 0) * Math.PI) / 180;
        rxRingPivot.rotation.z = Math.PI / 2 - rotRad;

        const t = state._sparkTime || 0;

        // Update Transmitter Spark jitter
        txSparkLine.visible = out.transmitterSparkActive;
        if (out.transmitterSparkActive) {
          const pos = txSparkGeo.attributes.position;
          for (let i = 0; i < 8; i++) {
            const u = i / 7;
            const x = THREE.MathUtils.lerp(-0.025, 0.025, u);
            const jitter = (i === 0 || i === 7) ? 0 : Math.sin(t * 3.7 + i * 2.1) * 0.014;
            pos.setXYZ(i, x, jitter, Math.cos(t * 2.3 + i) * 0.008);
          }
          pos.needsUpdate = true;
        }

        // Update propagating EM wave arcs
        waveGroup.visible = out.transmitterSparkActive;
        if (out.transmitterSparkActive) {
          for (let i = 0; i < waveArcs.length; i++) {
            const frac = ((t * 0.08 + i / waveArcs.length) % 1);
            const x = THREE.MathUtils.lerp(-sepX + 0.05, sepX - 0.05, frac);
            waveArcs[i].position.set(x, 0.34, 0);
            waveArcs[i].scale.setScalar(0.6 + frac * 1.1);
          }
        }

        // Update Receiver Spark
        rxSparkLine.visible = out.receiverSparkActive;
        if (out.receiverSparkActive) {
          const rPos = rxSparkGeo.attributes.position;
          for (let i = 0; i < 6; i++) {
            const u = i / 5;
            const y = THREE.MathUtils.lerp(-0.022, 0.022, u);
            const jitter = (i === 0 || i === 5) ? 0 : Math.sin(t * 4.2 + i * 1.7) * 0.012 * out.receiverSparkIntensity;
            rPos.setXYZ(i, jitter, y, 0);
          }
          rPos.needsUpdate = true;
        }

        statusBanner.userData.updateText(out.statusText);
      },

      dispose() {
        rootGroup.remove(group);
      }
    };
  }
};