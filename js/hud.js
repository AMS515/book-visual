/**
 * js/hud.js
 * Manages the bottom translucent HUD pill, Table of Contents (قائمة الفصول),
 * projected 2D/3D hotspot tags ("تفاعل"), Teacher Control Drawer, and Live Readouts.
 */

import * as THREE from 'three';
import { PAGES_MANIFEST, QUESTIONS_REGISTRY } from './registry.js';

export class HUDController {
  constructor(book, cameraRig, callbacks = {}) {
    this.book = book;
    this.cameraRig = cameraRig;
    this.callbacks = callbacks;

    this.hotspotOverlay = document.getElementById('hotspot-overlay');
    this.loadingIndicator = document.getElementById('loading-indicator');
    this.pageIndicatorText = document.getElementById('page-indicator-text');

    this.btnPrevPage = document.getElementById('btn-prev-page');
    this.btnNextPage = document.getElementById('btn-next-page');
    this.btnZoomIn = document.getElementById('btn-zoom-in');
    this.btnZoomOut = document.getElementById('btn-zoom-out');
    this.btnResetView = document.getElementById('btn-reset-view');
    this.btnFullscreen = document.getElementById('btn-fullscreen');
    this.btnReducedMotion = document.getElementById('btn-reduced-motion');

    // Teacher Drawer & Live Readouts
    this.teacherDrawer = document.getElementById('teacher-drawer');
    this.drawerControlsList = document.getElementById('drawer-controls-list');
    this.btnResetQuestion = document.getElementById('btn-reset-question');
    this.btnCollapseDrawer = document.getElementById('btn-collapse-drawer');
    this.liveReadouts = document.getElementById('live-readouts');
    this.readoutsGrid = document.getElementById('readouts-grid');

    // TOC elements
    this.btnToc = document.getElementById('btn-toc');
    this.tocModal = document.getElementById('toc-modal');
    this.btnCloseToc = document.getElementById('btn-close-toc');
    this.tabTocPages = document.getElementById('tab-toc-pages');
    this.tabTocQuestions = document.getElementById('tab-toc-questions');
    this.tocListContainer = document.getElementById('toc-list-container');
    this.activeTocTab = 'pages';

    this.hotspotElements = new Map();
    this.controlDomRefs = new Map();
    this.readoutDomRefs = [];

    this.buildHotspotDOMElements();
    this.bindHUDActions();
    this.renderTocList();
  }

  renderKaTeX(texString, container) {
    if (window.katex && texString) {
      try {
        window.katex.render(texString, container, { throwOnError: false });
        return;
      } catch (_) {}
    }
    container.textContent = texString;
  }

  buildHotspotDOMElements() {
    this.hotspotOverlay.innerHTML = '';
    for (const q of QUESTIONS_REGISTRY) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'page-hotspot hidden';
      btn.setAttribute('aria-label', `تفاعل مع الشكل: ${q.source.printedTitle}`);
      btn.innerHTML = `<span class="hotspot-tag">تفاعل</span>`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.callbacks.onSelectQuestion?.(q);
      });
      this.hotspotOverlay.appendChild(btn);
      this.hotspotElements.set(q.id, { el: btn, question: q });
    }
  }

  bindHUDActions() {
    this.btnNextPage.addEventListener('click', () => this.book.turnNext());
    this.btnPrevPage.addEventListener('click', () => this.book.turnPrev());

    this.btnZoomIn.addEventListener('click', () => this.cameraRig.zoomStep(0.8));
    this.btnZoomOut.addEventListener('click', () => this.cameraRig.zoomStep(1.25));
    this.btnResetView.addEventListener('click', () => {
      this.callbacks.onResetView?.();
    });

    this.btnFullscreen.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    });

    this.btnReducedMotion.addEventListener('click', () => {
      const nextState = this.btnReducedMotion.getAttribute('aria-pressed') !== 'true';
      this.btnReducedMotion.setAttribute('aria-pressed', String(nextState));
      this.cameraRig.reducedMotion = nextState;
      this.callbacks.onToggleReducedMotion?.(nextState);
    });

    this.btnCollapseDrawer.addEventListener('click', (e) => {
      e.stopPropagation();
      this.teacherDrawer.classList.toggle('collapsed');
    });

    this.btnResetQuestion.addEventListener('click', (e) => {
      e.stopPropagation();
      this.callbacks.onResetQuestionState?.();
    });

    // TOC Modal controls
    this.btnToc.addEventListener('click', () => {
      this.tocModal.classList.toggle('hidden');
      this.renderTocList();
    });
    this.btnCloseToc.addEventListener('click', () => this.tocModal.classList.add('hidden'));

    this.tabTocPages.addEventListener('click', () => {
      this.activeTocTab = 'pages';
      this.tabTocPages.classList.add('active');
      this.tabTocQuestions.classList.remove('active');
      this.renderTocList();
    });

    this.tabTocQuestions.addEventListener('click', () => {
      this.activeTocTab = 'questions';
      this.tabTocQuestions.classList.add('active');
      this.tabTocPages.classList.remove('active');
      this.renderTocList();
    });
  }

  /**
   * Builds the Teacher Control Drawer and Live Readouts for an active physics module.
   */
  showFocusPanels(moduleDef, state, onStateChange) {
    this.teacherDrawer.classList.remove('hidden', 'collapsed');
    this.liveReadouts.classList.remove('hidden');
    this.drawerControlsList.innerHTML = '';
    this.readoutsGrid.innerHTML = '';
    this.controlDomRefs.clear();
    this.readoutDomRefs = [];

    // 1. Build Controls
    for (const ctrl of moduleDef.controls || []) {
      const card = document.createElement('div');
      card.className = 'control-card';

      const topRow = document.createElement('div');
      topRow.className = 'control-top-row';

      const labelEl = document.createElement('span');
      labelEl.className = 'control-label';
      labelEl.textContent = ctrl.label;

      const symEl = document.createElement('span');
      symEl.className = 'control-symbol-unit';
      if (ctrl.symbol) {
        this.renderKaTeX(ctrl.unit ? `${ctrl.symbol}\\;(\\text{${ctrl.unit}})` : ctrl.symbol, symEl);
      } else {
        symEl.textContent = ctrl.unit || '';
      }

      topRow.append(labelEl, symEl);
      card.appendChild(topRow);

      if (ctrl.type === 'toggle') {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'toggle-switch-btn';
        const updateToggleUI = (val) => {
          btn.classList.toggle('active', Boolean(val));
          btn.textContent = val ? ctrl.labels[1] : ctrl.labels[0];
        };
        updateToggleUI(state[ctrl.id]);

        btn.addEventListener('click', () => {
          state[ctrl.id] = !state[ctrl.id];
          updateToggleUI(state[ctrl.id]);
          onStateChange(ctrl.id, state[ctrl.id]);
        });
        card.appendChild(btn);
        this.controlDomRefs.set(ctrl.id, { updateUI: updateToggleUI });
      } else if (ctrl.type === 'SelectStage') {
        const select = document.createElement('select');
        select.className = 'stage-select';
        for (const opt of ctrl.options) {
          const o = document.createElement('option');
          o.value = opt.value;
          o.textContent = opt.label;
          select.appendChild(o);
        }
        select.value = state[ctrl.id];
        select.addEventListener('change', () => {
          state[ctrl.id] = Number(select.value);
          onStateChange(ctrl.id, state[ctrl.id]);
        });
        card.appendChild(select);
        this.controlDomRefs.set(ctrl.id, {
          updateUI: (val) => {
            select.value = val;
          }
        });
      } else {
        // Numeric slider + +/- steppers + direct numeric input
        const row = document.createElement('div');
        row.className = 'control-slider-row';

        const btnMinus = document.createElement('button');
        btnMinus.type = 'button';
        btnMinus.className = 'stepper-btn';
        btnMinus.textContent = '−';

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.className = 'physics-slider';
        slider.min = ctrl.min;
        slider.max = ctrl.max;
        slider.step = ctrl.step;
        slider.value = state[ctrl.id];

        const btnPlus = document.createElement('button');
        btnPlus.type = 'button';
        btnPlus.className = 'stepper-btn';
        btnPlus.textContent = '+';

        const numInput = document.createElement('input');
        numInput.type = 'number';
        numInput.className = 'numeric-input';
        numInput.min = ctrl.min;
        numInput.max = ctrl.max;
        numInput.step = ctrl.step;
        numInput.value = Number(state[ctrl.id]).toFixed(ctrl.step < 1 ? 2 : 0);

        const applyValue = (rawVal) => {
          const clamped = THREE.MathUtils.clamp(Number(rawVal) || ctrl.default, ctrl.min, ctrl.max);
          state[ctrl.id] = clamped;
          slider.value = clamped;
          numInput.value = Number(clamped).toFixed(ctrl.step < 1 ? 2 : 0);
          onStateChange(ctrl.id, clamped);
        };

        slider.addEventListener('input', () => applyValue(slider.value));
        numInput.addEventListener('change', () => applyValue(numInput.value));
        btnMinus.addEventListener('click', () => applyValue(Number(state[ctrl.id]) - ctrl.step));
        btnPlus.addEventListener('click', () => applyValue(Number(state[ctrl.id]) + ctrl.step));

        row.append(btnMinus, slider, btnPlus, numInput);
        card.appendChild(row);

        this.controlDomRefs.set(ctrl.id, {
          updateUI: (val) => {
            slider.value = val;
            if (document.activeElement !== numInput) {
              numInput.value = Number(val).toFixed(ctrl.step < 1 ? 2 : 0);
            }
          }
        });
      }

      this.drawerControlsList.appendChild(card);
    }

    // 2. Build Readouts
    for (const r of moduleDef.readouts || []) {
      const row = document.createElement('div');
      row.className = 'readout-row';

      const lbl = document.createElement('span');
      lbl.className = 'readout-label';
      lbl.textContent = r.label || r.symbol;

      const valSpan = document.createElement('span');
      valSpan.className = 'readout-val';

      row.append(lbl, valSpan);
      this.readoutsGrid.appendChild(row);
      this.readoutDomRefs.push({ def: r, el: valSpan });
    }
  }

  syncControlsFromState(state) {
    for (const [id, ref] of this.controlDomRefs.entries()) {
      if (state[id] !== undefined) {
        ref.updateUI(state[id]);
      }
    }
  }

  updateLiveReadouts(out) {
    for (const { def, el } of this.readoutDomRefs) {
      if (def.format) {
        el.textContent = def.format(out);
      } else if (def.value) {
        const v = def.value(out);
        el.textContent = def.unit ? `${v} ${def.unit}` : `${v}`;
      }
    }
  }

  hideFocusPanels() {
    this.teacherDrawer.classList.add('hidden');
    this.liveReadouts.classList.add('hidden');
  }

  renderTocList() {
    this.tocListContainer.innerHTML = '';

    if (this.activeTocTab === 'pages') {
      for (const page of PAGES_MANIFEST) {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'toc-item';
        item.innerHTML = `
          <span class="toc-item-title">${page.seqPage}. ${page.title}</span>
          <span class="toc-item-meta">صفحة الكتاب (${page.printedPage})</span>
        `;
        item.addEventListener('click', () => {
          this.tocModal.classList.add('hidden');
          this.book.jumpToSeqPage(page.seqPage);
          this.cameraRig.setDefaultOverviewPose(false);
        });
        this.tocListContainer.appendChild(item);
      }
    } else {
      for (const q of QUESTIONS_REGISTRY) {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'toc-item';
        item.innerHTML = `
          <span class="toc-item-title">${q.source.printedTitle}</span>
          <span class="toc-item-meta">ص ${q.source.printedPage} • تفاعل</span>
        `;
        item.addEventListener('click', () => {
          this.tocModal.classList.add('hidden');
          this.book.jumpToSeqPage(q.source.seqPage);
          this.callbacks.onSelectQuestion?.(q);
        });
        this.tocListContainer.appendChild(item);
      }
    }
  }

  setLoading(isLoading) {
    this.loadingIndicator.classList.toggle('hidden', !isLoading);
  }

  updatePageIndicator(info) {
    this.btnNextPage.disabled = !info.canNext;
    this.btnPrevPage.disabled = !info.canPrev;

    if (info.singleMode && info.rightPage) {
      this.pageIndicatorText.textContent = `صفحة ${info.rightPage.seqPage} من 10 (مطبوعة: ${info.rightPage.printedPage})`;
      return;
    }

    if (info.rightPage && info.leftPage) {
      this.pageIndicatorText.textContent = `صفحتا ${info.rightPage.seqPage}–${info.leftPage.seqPage} من 10 (المطبوعة ${info.rightPage.printedPage}–${info.leftPage.printedPage})`;
    } else if (info.rightPage) {
      this.pageIndicatorText.textContent = `صفحة ${info.rightPage.seqPage} من 10 (المطبوعة ${info.rightPage.printedPage})`;
    }
  }

  updateHotspotProjections(camera, focusModeActive) {
    if (focusModeActive || this.book.turnState.active) {
      for (const { el } of this.hotspotElements.values()) {
        el.classList.add('hidden');
      }
      return;
    }

    const width = window.innerWidth;
    const height = window.innerHeight;

    for (const { el, question } of this.hotspotElements.values()) {
      const tf = this.book.getHotspotWorldTransform(question.hotspot);
      if (!tf) {
        el.classList.add('hidden');
        continue;
      }

      const halfW = tf.width * 0.5;
      const halfH = tf.height * 0.5;

      const corners = [
        new THREE.Vector3(tf.center.x - halfW, tf.center.y, tf.center.z - halfH),
        new THREE.Vector3(tf.center.x + halfW, tf.center.y, tf.center.z - halfH),
        new THREE.Vector3(tf.center.x - halfW, tf.center.y, tf.center.z + halfH),
        new THREE.Vector3(tf.center.x + halfW, tf.center.y, tf.center.z + halfH)
      ];

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const c of corners) {
        c.project(camera);
        const sx = (c.x * 0.5 + 0.5) * width;
        const sy = (-c.y * 0.5 + 0.5) * height;
        minX = Math.min(minX, sx);
        maxX = Math.max(maxX, sx);
        minY = Math.min(minY, sy);
        maxY = Math.max(maxY, sy);
      }

      el.classList.remove('hidden');
      el.style.left = `${minX}px`;
      el.style.top = `${minY}px`;
      el.style.width = `${Math.max(44, maxX - minX)}px`;
      el.style.height = `${Math.max(44, maxY - minY)}px`;
    }
  }
}