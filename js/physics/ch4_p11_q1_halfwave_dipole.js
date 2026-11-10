/**
 * js/physics/ch4_p11_q1_halfwave_dipole.js
 * Page 11, Question 1 & Page 12, Question 1:
 * "مم يتكون الهوائي ؟ ارسم مخطط يوضح كيفية توزيع الفولطية والتيار على طول سلكي الهوائي."
 * "متى يحقق الهوائي إرسالا أو استقبالا باكبر طاقة للإشارة ؟ ولماذا ؟"
 *
 * Physics & Curriculum Fidelity:
 * - Half-wave dipole (ℓ = λ/2): two separated metal rods fed at the center (نقطة التغذية).
 * - Phase difference between current and emf is 90°.
 * - At dipole ends: Voltage is maximum (Vmax), Current is minimum (0), Impedance is high (ممانعة عالية).
 * - At center feed point: Current is maximum (Imax), Voltage is minimum, Impedance is low (~73 Ω) allowing maximum power transfer.
 */

const SPEED_OF_LIGHT = 3e8;

export default {
  id: 'ch4_p11_q1_halfwave_dipole',

  source: {
    page: 11,
    seqPage: 8,
    questionNumber: 1,
    printedTitle: 'سؤال : توزيع الفولطية والتيار على طول سلكي هوائي نصف الموجة الديبول'
  },

  hotspot: {
    seqPage: 8,
    printedPage: 11,
    rect: { x: 0.58, y: 0.23, w: 0.36, h: 0.21 }
  },

  focusPose: {
    position: [0.35, 1.32, 1.05],
    target: [0.35, 0.16, -0.25],
    fov: 38
  },

  controls: [
    {
      id: 'supplyVoltageV',
      label: 'مقدار الفولطية المجهزة للهوائي (عامل 01)',
      symbol: 'V_{\\max}',
      unit: 'V',
      min: 10,
      max: 120,
      step: 5,
      default: 50,
      derivedFromBook: true
    },
    {
      id: 'signalFreqMHz',
      label: 'تردد الإشارة المرسلة أو المستلمة (عامل 02)',
      symbol: 'f',
      unit: 'MHz',
      min: 50,
      max: 300,
      step: 10,
      default: 100,
      derivedFromBook: true
    },
    {
      id: 'lengthToLambdaRatio',
      label: 'نسبة طول الهوائي للطول الموجي (الأمثل = 0.50)',
      symbol: '\\ell / \\lambda',
      unit: '',
      min: 0.25,
      max: 0.75,
      step: 0.01,
      default: 0.50,
      derivedFromBook: true
    },
    {
      id: 'probePositionNorm',
      label: 'موضع القياس على السلك (0 = نقطة التغذية بالمنتصف)',
      symbol: 'x / (\\ell/2)',
      unit: '',
      min: -1.0,
      max: 1.0,
      step: 0.05,
      default: 0.0,
      derivedFromBook: true
    },
    {
      id: 'autoOscillate',
      type: 'toggle',
      label: 'إظهار فرق الطور (90°) بين التيار والفولطية',
      labels: ['منحني القيم العظمى الثابت', 'تذبذب حي (فرق طور 90°)'],
      default: false
    }
  ],

  solve(state) {
    const fHz = (state.signalFreqMHz || 100) * 1e6;
    const wavelengthM = SPEED_OF_LIGHT / fHz;
    const ratio = state.lengthToLambdaRatio ?? 0.5;
    const antennaLengthM = wavelengthM * ratio;

    // Resonance power efficiency peaks sharply when l = lambda / 2 (ratio = 0.50)
    const tuningFactor = Math.exp(-Math.pow((ratio - 0.5) / 0.14, 2));
    const vMax = (state.supplyVoltageV || 50) * tuningFactor;
    const iMaxAmp = (vMax / 73) * tuningFactor;

    // Position xNormalized in [-1, +1] where 0 is center feed point, ±1 are rod ends
    const xNorm = state.probePositionNorm ?? 0;
    const currentEnvelope = Math.cos((xNorm * Math.PI) / 2); // Max (1) at center 0, 0 at ends ±1
    const voltageEnvelope = Math.abs(Math.sin((xNorm * Math.PI) / 2)); // 0 at center, Max (1) at ends ±1

    const localV = vMax * voltageEnvelope;
    const localI = iMaxAmp * currentEnvelope;
    const localImpedanceDesc =
      Math.abs(xNorm) < 0.25