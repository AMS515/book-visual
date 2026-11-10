/**
 * js/physics/ch4_p4_q4_displacement_current.js
 * Page 4, Question 4 & Page 5:
 * "وضح كيفية توليد مجال مغناطيسي متغير من مجال كهربائي متغير؟"
 * - Parallel circular capacitor plates connected across an AC voltage source (AC)
 * - Time-varying Electric Field (E) between the plates generates a Displacement Current (Id ∝ ΔE/Δt)
 * - Displacement current generates perpendicular concentric Magnetic Field loops (B)
 */

const EPSILON_0 = 8.854e-12;

export default {
  id: 'ch4_p4_q4_displacement_current',

  source: {
    page: 4,
    seqPage: 2,
    questionNumber: 4,
    printedTitle: 'سؤال : وضح كيفية توليد مجال مغناطيسي متغير من مجال كهربائي متغير؟ (تيار الإزاحة)'
  },

  hotspot: {
    seqPage: 2,
    printedPage: 4,
    rect: { x: 0.06, y: 0.59, w: 0.43, h: 0.32 }
  },

  focusPose: {
    position: [-0.42, 1.38, 1.05],
    target: [-0.42, 0.16, 0.25],
    fov: 38
  },

  controls: [
    {
      id: 'acVoltageMax',
      label: 'فولطية المصدر المتناوب العظمى (AC)',
      symbol: 'V_{\\max}',
      unit: 'V',
      min: 10,
      max: 200,
      step: 5,
      default: 80,
      derivedFromBook: false
    },
    {
      id: 'acFreqKHz',
      label: 'تردد المصدر المتناوب (يزيد ΔE/Δt)',
      symbol: 'f',
      unit: 'kHz',
      min: 10,
      max: 500,
      step: 10,
      default: 120,
      derivedFromBook: false
    },
    {
      id: 'plateGapCm',
      label: 'البعد بين صفيحتي المتسعة',
      symbol: 'd',
      unit: 'cm',
      min: 2,
      max: 12,
      step: 0.5,
      default: 5,
      derivedFromBook: false
    },
    {
      id: 'phaseDeg',
      label: 'طور الفولطية المتناوبة',
      symbol: '\\theta',
      unit: 'deg',
      min: 0,
      max: 360,
      step: 2,
      default: 35,
      derivedFromBook: true
    },
    {
      id: 'autoPlay',
      type: 'toggle',
      label: 'تشغيل المصدر المتناوب (AC)',
      labels: ['متوقف (لحظي)', 'متناوب مع الزمن'],
      default: true
    }
  ],

  solve(state) {
    const vMax = state.acVoltageMax ?? 80;
    const fHz = (state.acFreqKHz ?? 120) * 1e3;
    const dMeters = Math.max(0.01, (state.plateGapCm ?? 5) * 0.01);
    const theta = ((state.phaseDeg ?? 35) * Math.PI) / 180;

    const eMax = vMax / dMeters; // V/m
    const eInst = eMax * Math.sin(theta);

    // Rate of change of electric field: dE/dt = 2*pi*f * E_max * cos(theta)
    const dEdt = 2 * Math.PI * fHz * eMax * Math.cos(theta);
    const plateArea = Math.PI * Math.pow(0.12, 2); // Assumed plate radius 12 cm

    // Page 5: Id ∝ ΔE/Δt
    const idMilliAmp = EPSILON_0 * plateArea * dEdt * 1e3;

    return {
      eMax,
      eInst,
      dEdt,
      idMilliAmp,
      polaritySign: Math.sin(theta) >= 0 ? 1 : -1,
      bDirectionSign: Math.cos(theta) >= 0 ? 1 : -1
    };
  },

  readouts: [
    {
      label: 'المجال الكهربائي اللحظي (E)',
      symbol: 'E',
      unit: 'V/m',
      value: (out) => out.eInst.toFixed(0)
    },
    {
      label: 'المعدل الزمني (ΔE / Δt)',
      symbol: '\\Delta E / \\Delta t',
      unit: 'V/(m·s)',
      format: (out) => `${(out.dEdt / 1e6).toFixed(2)} × 10⁶`
    },
    {
      label: 'تيار الإزاحة (Id ∝ ΔE/Δt)',
      symbol: 'I_d',
      unit: 'mA',
      value: (out) => Math.abs(out.idMilliAmp).toFixed(2)
    },
    {
      label: 'شحنة الصفيحتين اللحظية',
      symbol: 'q',
      unit: '',
      format: (out) => (out.polaritySign > 0 ? 'اليمنى (-q) | اليسرى (+q)' : 'اليمنى (+q) | اليسرى (-q)')
    }
  ],

  step(state, out, dt) {
    if (!state.autoPlay) return false;
    const rate = 65 * Math.sqrt((state.acFreqKHz || 120) / 120);
    state.phaseDeg = (state.phaseDeg + rate * dt) % 360;
    return true;
  },

  build(THREE, rootGroup, helpers) {
    const { ink } = helpers;
    const group = new THREE.Group();
    rootGroup.add(group);

    const centerY = 0.25;
    const plateRadius = 0.16;

    // 1. Two Circular Capacitor Plates (+q on left, -q on right, matching page 4 bottom figure)
    const plateGeo = new THREE.CylinderGeometry(plateRadius, plateRadius, 0.016, 32);
    plateGeo.rotateZ(Math.PI / 2);

    const leftPlate = ink.createPaperMesh(plateGeo, ink.sharedMaterials.accentOrange.clone());
    const rightPlate = ink.createPaperMesh(plateGeo, ink.sharedMaterials.accentOrange.clone());
    rightPlate.userData.draggable = true;
    group.add(leftPlate, rightPlate);

    const lblPosQ = ink.createPrintedLabel('+q', {
      bgColor: '#d93829',
      textColor: '#ffffff',
      scale: 0.11
    });
    const lblNegQ = ink.createPrintedLabel('-q', {
      bgColor: '#1d5b8c',
      textColor: '#ffffff',
      scale: 0.11
    });
    group.add(lblPosQ, lblNegQ);

    // 2. AC Source Circle & Connecting Wires at the bottom
    const acCircleGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.018, 24);
    const acCircle = ink.createPaperMesh(acCircleGeo, ink.sharedMaterials.paper);
    acCircle.position.set(0, 0.025, 0.23);
    group.add(acCircle);

    const lblAC = ink.createPrintedLabel('AC ~', {
      bgColor: '#faf6ee',
      textColor: '#d93829',
      scale: 0.12
    });
    lblAC.position.set(0, 0.06, 0.23);
    group.add(lblAC);

    const wireGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.18, centerY, 0),
      new THREE.Vector3(-0.26, centerY, 0),
      new THREE.Vector3(-0.26, 0.025, 0.23),
      new THREE.Vector3(-0.055, 0.025, 0.23),
      new THREE.Vector3(0.055, 0.025, 0.23),
      new THREE.Vector3(0.26, 0.025, 0.23),
      new THREE.Vector3(0.26, centerY, 0),
      new THREE.Vector3(0.18, centerY, 0)
    ]);
    const circuitWire = new THREE.Line(wireGeo, ink.sharedMaterials.inkLine);
    group.add(circuitWire);

    // 3. Electric Field Arrows (E) between the plates
    const eArrowsGroup = new THREE.Group();
    group.add(eArrowsGroup);
    const eOffsets = [
      [0, 0],
      [0.07, 0.04],
      [-0.07, 0.04],
      [0.07, -0.04],
      [-0.07, -0.04]
    ];
    const eLines = [];
    const eCones = [];
    const coneGeo = new THREE.ConeGeometry(0.014, 0.036, 12);

    for (const [dy, dz] of eOffsets) {
      const pts = [new THREE.Vector3(-0.1, 0, 0), new THREE.Vector3(0.1, 0, 0)];
      const lGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(lGeo, new THREE.LineBasicMaterial({ color: 0xd93829 }));
      line.position.set(0, centerY + dy, dz);
      eArrowsGroup.add(line);
      eLines.push(line);

      const cone = new THREE.Mesh(coneGeo, ink.sharedMaterials.accentRed);
      cone.position.set(0, centerY + dy, dz);
      eArrowsGroup.add(cone);
      eCones.push(cone);
    }

    // 4. Concentric Magnetic Field Rings (B) perpendicular to E
    const bRingsGroup = new THREE.Group();
    bRingsGroup.position.set(0, centerY, 0);
    group.add(bRingsGroup);

    const bRings = [];
    const bCones = [];
    const radii = [0.06, 0.115, 0.17];
    for (let i = 0; i < radii.length; i++) {
      const r = radii[i];
      const curvePts = [];
      for (let s = 0; s <= 48; s++) {
        const a = (s / 48) * Math.PI * 2;
        curvePts.push(new THREE.Vector3(0, Math.cos(a) * r, Math.sin(a) * r));
      }
      const rGeo = new THREE.BufferGeometry().setFromPoints(curvePts);
      const rLine = new THREE.Line(rGeo, new THREE.LineBasicMaterial({ color: 0x1d5b8c }));
      bRingsGroup.add(rLine);
      bRings.push(rLine);

      const bCone = new THREE.Mesh(coneGeo, ink.sharedMaterials.accentBlue);
      bCone.position.set(0, r, 0);
      bRingsGroup.add(bCone);
      bCones.push(bCone);
    }

    const lblE = ink.createPrintedLabel('E⃗ (مجال كهربائي متغير)', { scale: 0.12 });
    lblE.position.set(0, centerY + 0.12, 0);
    group.add(lblE);

    const lblB = ink.createPrintedLabel('B⃗ (مجال مغناطيسي متولد)', {
      bgColor: '#1d5b8c',
      textColor: '#ffffff',
      scale: 0.13
    });
    lblB.position.set(0, centerY + 0.22, 0);
    group.add(lblB);

    return {
      draggableMeshes: [rightPlate],

      onDrag(localPt, state) {
        const halfGap = THREE.MathUtils.clamp(Math.abs(localPt.x), 0.08, 0.24);
        state.plateGapCm = Math.round(THREE.MathUtils.mapLinear(halfGap, 0.08, 0.24, 2, 12) * 2) / 2;
      },

      update(state, out) {
        const halfGap = THREE.MathUtils.mapLinear(state.plateGapCm || 5, 2, 12, 0.08, 0.24);
        leftPlate.position.set(-halfGap, centerY, 0);
        rightPlate.position.set(halfGap, centerY, 0);

        // Update circuit wire ends to match plate positions
        const wPos = wireGeo.attributes.position;
        wPos.setXYZ(0, -halfGap, centerY, 0);
        wPos.setXYZ(7, halfGap, centerY, 0);
        wPos.needsUpdate = true;

        const posOnLeft = out.polaritySign >= 0;
        lblPosQ.position.set(-halfGap, centerY - 0.19, 0.04);
        lblNegQ.position.set(halfGap, centerY - 0.19, 0.04);
        lblPosQ.userData.updateText(posOnLeft ? '+q' : '-q');
        lblNegQ.userData.updateText(posOnLeft ? '-q' : '+q');

        // Update E-field lines between plates
        for (let i = 0; i < eLines.length; i++) {
          const lPos = eLines[i].geometry.attributes.position;
          lPos.setXYZ(0, -halfGap + 0.015, 0, 0);
          lPos.setXYZ(1, halfGap - 0.015, 0, 0);
          lPos.needsUpdate = true;

          eCones[i].rotation.z = posOnLeft ? -Math.PI / 2 : Math.PI / 2;
        }

        // Scale B-field rings proportional to displacement current Id (|ΔE/Δt|)
        const bStrength = THREE.MathUtils.clamp(Math.abs(out.idMilliAmp) / 1.5, 0.25, 1.35);
        bRingsGroup.scale.set(1, bStrength, bStrength);

        for (const bCone of bCones) {
          bCone.rotation.x = out.bDirectionSign >= 0 ? Math.PI / 2 : -Math.PI / 2;
        }
      },

      dispose() {
        rootGroup.remove(group);
      }
    };
  }
};