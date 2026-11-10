/**
 * js/registry.js
 * Central registry of textbook pages (sequential 1..10 mapped to printed page numbers)
 * and interactive 3D questions hotspots.
 */

export const BOOK_CONFIG = {
  rtl: true, // Arabic book: spine on the right of cover, pages turn right-to-left
  pageWidth: 2.1,
  pageHeight: 2.97, // A4 aspect ratio (1 : 1.414)
  pageSegmentsX: 48,
  pageSegmentsY: 32,
  restingCurvature: 1.0,
  lazySpreadRadius: 2, // Keep current spread ± 2 spreads in GPU memory
  hiResZoomDistanceThreshold: 2.85
};

export const PAGES_MANIFEST = [
  { seqPage: 1, printedPage: 1, title: 'غلاف الفصل الرابع: الموجات الكهرومغناطيسية', rawFile: '1000128468.webp' },
  { seqPage: 2, printedPage: 4, title: 'استنتاج ماكسويل وتوليد المجال المغناطيسي', rawFile: '1000128473.webp' },
  { seqPage: 3, printedPage: 5, title: 'تيار الإزاحة وخصائص الموجات الكهرومغناطيسية', rawFile: '1000128476.webp' },
  { seqPage: 4, printedPage: 6, title: 'الشحنات المعجلة وتجربة العالم هرتز (Hertz)', rawFile: '1000128475.webp' },
  { seqPage: 5, printedPage: 7, title: 'شروط الشرارة في جهاز هرتز وأسئلة وزارية', rawFile: '1000128477.webp' },
  { seqPage: 6, printedPage: 8, title: 'كيفية توليد الموجات الكهرومغناطيسية (01 - 03)', rawFile: '1000128478.webp' },
  { seqPage: 7, printedPage: 9, title: 'انفصال حلقات المجال لحظة انقلاب القطبية (04)', rawFile: '1000128479.webp' },
  { seqPage: 8, printedPage: 11, title: 'الهوائي الديبول وتوزيع الفولطية والتيار', rawFile: '1000128467.webp' },
  { seqPage: 9, printedPage: 12, title: 'شرط أعظم طاقة للإرسال وتأريض الهوائي', rawFile: '1000128469.webp' },
  { seqPage: 10, printedPage: 13, title: 'مقارنة الهوائيات وحساب طول الهوائي والتردد الرنيني', rawFile: '1000128471.webp' }
];

/**
 * Interactive questions list with RTL normalized rects:
 * Origin (0,0) is TOP-RIGHT of the page:
 *   x: distance from right edge (0..1)
 *   y: distance from top edge (0..1)
 *   w: width fraction (0..1)
 *   h: height fraction (0..1)
 */
export const QUESTIONS_REGISTRY = [
  {
    id: 'ch4_p4_q1_maxwell_wave',
    source: {
      seqPage: 2,
      printedPage: 4,
      questionNumber: 1,
      printedTitle: 'سؤال : ما هو استنتاج ماكسويل؟'
    },
    hotspot: {
      seqPage: 2,
      rect: { x: 0.51, y: 0.11, w: 0.43, h: 0.15 }
    }
  },
  {
    id: 'ch4_p4_q4_displacement_current',
    source: {
      seqPage: 2,
      printedPage: 4,
      questionNumber: 4,
      printedTitle: 'سؤال : وضح كيفية توليد مجال مغناطيسي متغير من مجال كهربائي متغير؟'
    },
    hotspot: {
      seqPage: 2,
      rect: { x: 0.06, y: 0.59, w: 0.43, h: 0.32 }
    }
  },
  {
    id: 'ch4_p6_q3_hertz_spark',
    source: {
      seqPage: 4,
      printedPage: 6,
      questionNumber: 3,
      printedTitle: 'سؤال : كيف تمكن العالم هرتز من توليد الموجات الكهرومغناطيسية؟'
    },
    hotspot: {
      seqPage: 4,
      rect: { x: 0.05, y: 0.56, w: 0.90, h: 0.39 }
    }
  },
  {
    id: 'ch4_p8_q1_dipole_generation',
    source: {
      seqPage: 6,
      printedPage: 8,
      questionNumber: 1,
      printedTitle: 'سؤال : وضح كيفية توليد الموجات الكهرومغناطيسية؟ (المراحل 01، 02، 03)'
    },
    hotspot: {
      seqPage: 6,
      rect: { x: 0.49, y: 0.13, w: 0.44, h: 0.80 }
    }
  },
  {
    id: 'ch4_p9_q1_dipole_detachment',
    source: {
      seqPage: 7,
      printedPage: 9,
      questionNumber: 1,
      printedTitle: 'شكل (يوضح انفصال خطوط المجال الكهربائي عن الهوائي لحظة انقلاب الفولطية)'
    },
    hotspot: {
      seqPage: 7,
      rect: { x: 0.06, y: 0.08, w: 0.44, h: 0.33 }
    }
  },
  {
    id: 'ch4_p11_q1_halfwave_dipole',
    source: {
      seqPage: 8,
      printedPage: 11,
      questionNumber: 1,
      printedTitle: 'سؤال : مم يتكون الهوائي ؟ ارسم مخطط يوضح كيفية توزيع الفولطية والتيار على طول سلكي الهوائي.'
    },
    hotspot: {
      seqPage: 8,
      rect: { x: 0.58, y: 0.23, w: 0.36, h: 0.21 }
    }
  },
  {
    id: 'ch4_p12_q2_grounded_monopole',
    source: {
      seqPage: 9,
      printedPage: 12,
      questionNumber: 2,
      printedTitle: 'سؤال : ما الفائدة العملية من تأريض احد أقطاب الهوائي في عملية إرسال وتسلم الموجات الكهرومغناطيسية ؟'
    },
    hotspot: {
      seqPage: 9,
      rect: { x: 0.06, y: 0.71, w: 0.88, h: 0.21 }
    }
  },
  {
    id: 'ch4_p13_q2_antenna_resonance_calc',
    source: {
      seqPage: 10,
      printedPage: 13,
      questionNumber: 2,
      printedTitle: 'حساب طول الهوائي والتردد الرنيني ومقارنة الهوائي النصف موجي والربع موجي'
    },
    hotspot: {
      seqPage: 10,
      rect: { x: 0.06, y: 0.69, w: 0.88, h: 0.20 }
    }
  }
];