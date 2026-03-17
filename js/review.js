/* review.js - Review logic, AI panel, reason selection */

const Review = (() => {

  // === Reason Definitions ===

  const PASS_IMAGE_REASONS = [
    { key: '1', label: 'BG Pure White + Packshot', value: 'Clean product photo on pure white background (#FFFFFF)' },
    { key: '2', label: '기타 (이미지)', value: null, isCustom: true },
  ];

  const PASS_VERTICAL_REASONS = [
    { key: '5', label: '일반 소비재', value: 'General consumer product. No restricted industry match' },
    { key: '6', label: '일반 식품', value: 'General food product. No health supplement indicators' },
    { key: '7', label: '일반 가전', value: 'General consumer electronics. No restriction' },
    { key: '8', label: '기타 (업종)', value: null, isCustom: true },
  ];

  const FAIL_IMAGE_REASONS = [
    { key: '1', label: '텍스트 >50%', value: 'Text covers >50% of image area' },
    { key: '2', label: '로고/배지/텍스트', value: 'External logo/badge/text overlay outside product' },
    { key: '3', label: '비흰색 BG', value: 'Background is not #FFFFFF' },
    { key: '4', label: '이미지가 너무 작음', value: 'Image resolution too small' },
    { key: '5', label: '컬러심볼', value: 'Color symbol present in image' },
    { key: '6', label: '로드 실패', value: 'Image failed to load or broken' },
    { key: '7', label: '기타 (이미지)', value: null, isCustom: true },
  ];

  const FAIL_VERTICAL_REASONS = [
    { key: 'Q', label: '건강기능식품', value: 'Health functional food. External DSP cannot verify' },
    { key: 'W', label: '의약품/의료기기', value: 'Medical product/device. Requires documentation' },
    { key: 'E', label: '성인/도박/담배', value: 'Kakao platform banned category' },
    { key: 'R', label: '주류', value: 'Alcohol product. Prohibited on BizBoard' },
    { key: 'T', label: '속옷/수영복', value: 'Underwear/swimwear. Platform inappropriate' },
    { key: 'Y', label: '귀금속/투자', value: 'Precious metals/investment product' },
    { key: 'U', label: '기타 규제업종', value: null, isCustom: true },
  ];

  // === Auto-save Timer ===

  let autoSaveTimer = null;
  const AUTO_SAVE_DELAY = 1000;

  function startAutoSaveTimer() {
    // 자동 저장 타이머 비활성화 — 수동 저장(Enter/→/Space)만 사용
    return;
  }

  function clearAutoSaveTimer() {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }
    removeAutoSaveBar();
  }

  function removeAutoSaveBar() {
    const bar = document.getElementById('auto-save-bar');
    if (bar) bar.remove();
  }

  // === Quick Combos ===

  const COMBO_KEY = 'reviewCombos';
  const MAX_COMBOS = 5;

  function getRecentCombos() {
    try { return JSON.parse(localStorage.getItem(COMBO_KEY) || '[]'); }
    catch { return []; }
  }

  function saveComboToHistory() {
    if (!AppState.currentVerdict) return;
    if (!AppState.selectedImageReason && !AppState.selectedVerticalReason) return;

    const combo = {
      verdict: AppState.currentVerdict,
      imageReason: AppState.selectedImageReason || '',
      verticalReason: AppState.selectedVerticalReason || '',
    };

    let combos = getRecentCombos();
    const idx = combos.findIndex(c =>
      c.verdict === combo.verdict &&
      c.imageReason === combo.imageReason &&
      c.verticalReason === combo.verticalReason
    );

    if (idx >= 0) {
      combos[idx].count = (combos[idx].count || 1) + 1;
      const existing = combos.splice(idx, 1)[0];
      combos.unshift(existing);
    } else {
      combo.count = 1;
      combos.unshift(combo);
    }

    combos = combos.slice(0, MAX_COMBOS);
    localStorage.setItem(COMBO_KEY, JSON.stringify(combos));
  }

  function applyQuickCombo(combo) {
    clearAutoSaveTimer();
    AppState.selectedImageReason = combo.imageReason || null;
    AppState.selectedVerticalReason = combo.verticalReason || null;
    renderHumanPanel();
    saveComboToHistory();
    if (saveCurrentVerdict()) {
      if (AppState.currentIndex < AppState.filteredItems.length - 1) {
        goTo(AppState.currentIndex + 1);
      }
    }
  }

  function renderQuickCombos(verdictType) {
    const verdict = verdictType === 'pass' ? 'Pass' : 'Fail';
    const combos = getRecentCombos().filter(c => c.verdict === verdict);
    if (combos.length === 0) return null;

    const container = document.createElement('div');
    container.className = 'quick-combos';
    container.innerHTML = `<div class="quick-combos-title">${I18n.t('reason.quickTitle')}</div>`;

    const grid = document.createElement('div');
    grid.className = 'quick-combos-grid';

    combos.forEach(combo => {
      const btn = document.createElement('button');
      btn.className = 'quick-combo-btn';
      const imgLabel = findReasonLabel('image', combo.imageReason) || '';
      const vertLabel = findReasonLabel('vertical', combo.verticalReason) || '';
      const labels = [imgLabel, vertLabel].filter(Boolean).join(' + ');
      btn.innerHTML = `${labels} <span class="combo-count">\u00d7${combo.count}</span>`;
      btn.addEventListener('click', () => applyQuickCombo(combo));
      grid.appendChild(btn);
    });

    container.appendChild(grid);
    return container;
  }

  // === Last Verdict (이전 설정 적용) ===

  const LAST_VERDICT_KEY = 'lastVerdict';

  function getLastVerdict() {
    try { return JSON.parse(localStorage.getItem(LAST_VERDICT_KEY)); }
    catch { return null; }
  }

  function saveLastVerdict() {
    if (!AppState.currentVerdict) return;
    if (!AppState.selectedImageReason && !AppState.selectedVerticalReason) return;
    localStorage.setItem(LAST_VERDICT_KEY, JSON.stringify({
      verdict: AppState.currentVerdict,
      imageReason: AppState.selectedImageReason || '',
      verticalReason: AppState.selectedVerticalReason || '',
    }));
  }

  function applyLastVerdict() {
    const last = getLastVerdict();
    if (!last) return;
    clearAutoSaveTimer();

    // Set verdict mode
    AppState.currentVerdict = last.verdict;
    AppState.selectedImageReason = last.imageReason || null;
    AppState.selectedVerticalReason = last.verticalReason || null;

    renderHumanPanel();
    if (saveCurrentVerdict()) {
      if (AppState.currentIndex < AppState.filteredItems.length - 1) {
        goTo(AppState.currentIndex + 1);
      }
    }
  }

  function renderLastVerdictButton() {
    // Remove existing
    const existing = document.getElementById('last-verdict-btn');
    if (existing) existing.remove();

    const last = getLastVerdict();
    if (!last) return;

    const item = AppState.filteredItems[AppState.currentIndex];
    if (!item || item.Human_Result) return; // Only for unreviewed items

    const imgLabel = findReasonLabel('image', last.imageReason) || '';
    const vertLabel = findReasonLabel('vertical', last.verticalReason) || '';
    const parts = [imgLabel, vertLabel].filter(Boolean).join(', ');
    const verdictClass = last.verdict === 'Pass' ? 'last-verdict-pass' : 'last-verdict-fail';

    const btn = document.createElement('button');
    btn.id = 'last-verdict-btn';
    btn.className = `last-verdict-btn ${verdictClass}`;
    btn.innerHTML = `<span class="last-verdict-label">${I18n.t('reason.applyLast')}</span> <span class="last-verdict-detail">${last.verdict} | ${parts}</span> <kbd>Space</kbd>`;
    btn.addEventListener('click', applyLastVerdict);

    // Insert before verdict buttons
    const reviewPanel = document.getElementById('review-panel');
    reviewPanel.insertBefore(btn, reviewPanel.firstChild);
  }

  // === AI Panel Rendering ===

  function renderAIPanel(item) {
    if (!item) return;

    // Final result badge
    const finalBadge = document.getElementById('ai-final-badge');
    const finalResult = item.Claude_Final_Result || '';
    finalBadge.textContent = finalResult || '-';
    finalBadge.className = 'ai-badge ' + getBadgeClass(finalResult, 'result');

    // Packshot badge
    const pshotBadge = document.getElementById('ai-packshot-badge');
    const pshot = item.Packshot || '';
    pshotBadge.textContent = 'Packshot ' + (pshot || '-');
    pshotBadge.className = 'ai-badge ' + getBadgeClass(pshot, 'packshot');

    // BG badge
    const bgBadge = document.getElementById('ai-bg-badge');
    const bg = item.BG_White || '';
    bgBadge.textContent = 'BG ' + (bg || '-');
    bgBadge.className = 'ai-badge ' + getBadgeClass(bg, 'bg');

    // Details
    document.getElementById('ai-vertical').textContent = item.Claude_vertical_review_results || '-';
    document.getElementById('ai-vertical-reason').textContent = item.Claude_Vertical_reason || '-';
    document.getElementById('ai-packshot-reason').textContent = item.Claude_Packshot_Reason || '-';
  }

  function getBadgeClass(value, type) {
    if (!value) return 'error';
    const v = String(value).toLowerCase().trim();

    if (type === 'result') {
      if (v === 'pass') return 'pass';
      if (v === 'fail') return 'fail';
      return 'error';
    }
    if (type === 'packshot') {
      if (v === 'o') return 'pass';
      if (v === 'x') return 'fail';
      return 'error';
    }
    if (type === 'bg') {
      if (v === 'white') return 'pass';
      if (v === 'notwhite' || v === 'not white') return 'fail';
      return 'error';
    }
    return 'error';
  }

  // === Review Panel ===

  function renderReviewPanel(item) {
    const panel = document.getElementById('reason-panel');
    panel.style.display = 'none';
    panel.innerHTML = '';

    // Reset verdict buttons
    document.getElementById('btn-pass').classList.remove('active', 'reviewed-pass');
    document.getElementById('btn-fail').classList.remove('active', 'reviewed-fail');

    // Show if already reviewed
    if (item && item.Human_Result) {
      if (item.Human_Result === 'Pass') {
        document.getElementById('btn-pass').classList.add('reviewed-pass');
      } else if (item.Human_Result === 'Fail') {
        document.getElementById('btn-fail').classList.add('reviewed-fail');
      }
    }

    // Match indicator
    updateMatchIndicator(item);
  }

  function updateMatchIndicator(item) {
    const el = document.getElementById('verdict-match');
    if (!item || !item.Human_Result) {
      el.textContent = '';
      el.className = 'verdict-match';
      return;
    }
    if (item.Claude_Final_Result === item.Human_Result) {
      el.textContent = I18n.t('match.agree');
      el.className = 'verdict-match match';
    } else {
      el.textContent = I18n.t('match.disagree');
      el.className = 'verdict-match mismatch';
    }
  }

  // === Verdict Actions ===

  function startPass() {
    clearAutoSaveTimer();
    AppState.currentVerdict = 'Pass';
    AppState.keyboardMode = 'pass_reason';
    // Defaults: Packshot O + 일반 소비재
    AppState.selectedImageReason = PASS_IMAGE_REASONS[0].value;
    AppState.selectedVerticalReason = PASS_VERTICAL_REASONS[0].value;

    document.getElementById('btn-pass').classList.add('active');
    document.getElementById('btn-fail').classList.remove('active');

    showReasonPanel(PASS_IMAGE_REASONS, PASS_VERTICAL_REASONS, 'pass');
    highlightDefault('image', PASS_IMAGE_REASONS[0].key, 'selected-pass');
    highlightDefault('vertical', PASS_VERTICAL_REASONS[0].key, 'selected-pass');
    renderHumanPanel();
    updateKeyboardHint();
  }

  function startFail() {
    clearAutoSaveTimer();
    AppState.currentVerdict = 'Fail';
    AppState.keyboardMode = 'fail_reason';
    // Default: 로고/배지
    AppState.selectedImageReason = FAIL_IMAGE_REASONS[1].value;
    AppState.selectedVerticalReason = null;

    document.getElementById('btn-fail').classList.add('active');
    document.getElementById('btn-pass').classList.remove('active');

    showReasonPanel(FAIL_IMAGE_REASONS, FAIL_VERTICAL_REASONS, 'fail');
    highlightDefault('image', FAIL_IMAGE_REASONS[1].key, 'selected-fail');
    renderHumanPanel();
    updateKeyboardHint();
  }

  function skip() {
    goNextUnreviewed();
  }

  function cancelReason() {
    clearAutoSaveTimer();
    AppState.keyboardMode = 'nav';
    AppState.currentVerdict = null;
    AppState.selectedImageReason = null;
    AppState.selectedVerticalReason = null;

    document.getElementById('btn-pass').classList.remove('active');
    document.getElementById('btn-fail').classList.remove('active');
    document.getElementById('reason-panel').style.display = 'none';
    updateKeyboardHint();
  }

  // === Reason Panel Rendering ===

  function showReasonPanel(imageReasons, verticalReasons, verdictType) {
    const panel = document.getElementById('reason-panel');
    panel.style.display = 'block';
    panel.innerHTML = '';

    const selectedClass = verdictType === 'pass' ? 'selected-pass' : 'selected-fail';

    // Quick combos
    const quickEl = renderQuickCombos(verdictType);
    if (quickEl) panel.appendChild(quickEl);

    // Image reasons
    const imgCat = document.createElement('div');
    imgCat.className = 'reason-category';
    imgCat.innerHTML = `<div class="reason-category-title">${I18n.t('reason.imageTitle')}</div>`;
    const imgGrid = document.createElement('div');
    imgGrid.className = 'reason-grid';

    imageReasons.forEach(r => {
      const btn = createReasonButton(r, 'image', selectedClass);
      imgGrid.appendChild(btn);
    });
    imgCat.appendChild(imgGrid);
    panel.appendChild(imgCat);

    // Vertical reasons
    const vertCat = document.createElement('div');
    vertCat.className = 'reason-category';
    vertCat.innerHTML = `<div class="reason-category-title">${I18n.t('reason.verticalTitle')}</div>`;
    const vertGrid = document.createElement('div');
    vertGrid.className = 'reason-grid';

    verticalReasons.forEach(r => {
      const btn = createReasonButton(r, 'vertical', selectedClass);
      vertGrid.appendChild(btn);
    });
    vertCat.appendChild(vertGrid);
    panel.appendChild(vertCat);

    // AI Agree button
    const agreeKey = verdictType === 'pass' ? '9' : '0';
    const agreeBtn = document.createElement('button');
    agreeBtn.className = 'reason-btn ai-agree';
    agreeBtn.innerHTML = `<kbd>${agreeKey}</kbd> ${I18n.t('reason.aiAgree')}`;
    agreeBtn.addEventListener('click', () => aiAgree());
    panel.appendChild(agreeBtn);
  }

  function createReasonButton(reason, category, selectedClass) {
    const btn = document.createElement('button');
    btn.className = 'reason-btn';
    btn.dataset.category = category;
    btn.dataset.key = reason.key;
    btn.dataset.value = reason.value || '';
    btn.dataset.isCustom = reason.isCustom ? 'true' : 'false';
    btn.innerHTML = `<kbd>${reason.key}</kbd> ${I18n.tLabel(reason.label)}`;

    btn.addEventListener('click', () => {
      if (reason.isCustom) {
        showCustomModal(category);
      } else {
        selectReason(category, reason.value, reason.key, selectedClass);
      }
    });

    return btn;
  }

  function highlightDefault(category, key, selectedClass) {
    const panel = document.getElementById('reason-panel');
    panel.querySelectorAll(`.reason-btn[data-category="${category}"]`).forEach(btn => {
      if (btn.dataset.key === key) btn.classList.add(selectedClass);
    });
  }

  function selectReason(category, value, key, selectedClass) {
    // Toggle: if same reason is already selected, deselect it
    const currentValue = category === 'image' ? AppState.selectedImageReason : AppState.selectedVerticalReason;
    const isDeselect = currentValue === value;

    if (category === 'image') {
      AppState.selectedImageReason = isDeselect ? null : value;
    } else {
      AppState.selectedVerticalReason = isDeselect ? null : value;
    }

    // Update button visuals
    const panel = document.getElementById('reason-panel');
    panel.querySelectorAll(`.reason-btn[data-category="${category}"]`).forEach(btn => {
      btn.classList.remove('selected-pass', 'selected-fail');
      if (!isDeselect && btn.dataset.key === key) {
        btn.classList.add(selectedClass);
      }
    });

    renderHumanPanel();
    startAutoSaveTimer();
  }

  function confirmReason() {
    goNext();
  }

  function aiAgree() {
    const item = AppState.filteredItems[AppState.currentIndex];
    if (!item) return;

    // Copy AI reasons
    AppState.selectedImageReason = item.Claude_Packshot_Reason || item.Packshot || 'AI Agree';
    AppState.selectedVerticalReason = item.Claude_Vertical_reason || item.Claude_vertical_review_results || 'AI Agree';

    // Clear individual reason highlights, highlight AI agree button
    const panel = document.getElementById('reason-panel');
    panel.querySelectorAll('.reason-btn[data-category]').forEach(btn => {
      btn.classList.remove('selected-pass', 'selected-fail');
    });
    const agreeBtn = panel.querySelector('.ai-agree');
    if (agreeBtn) agreeBtn.classList.add(AppState.currentVerdict === 'Pass' ? 'selected-pass' : 'selected-fail');

    renderHumanPanel();
    startAutoSaveTimer();
  }

  function saveCurrentVerdict() {
    if (!AppState.currentVerdict) return false;
    if (!AppState.selectedImageReason && !AppState.selectedVerticalReason) {
      showToast(I18n.t('toast.selectReason'));
      return false;
    }

    const item = AppState.filteredItems[AppState.currentIndex];
    if (!item) return false;

    saveComboToHistory();
    saveLastVerdict();

    const reviewData = {
      identifier: item.identifier,
      Human_Result: AppState.currentVerdict,
      Human_Image_Reason: AppState.selectedImageReason || '',
      Human_Vertical_Reason: AppState.selectedVerticalReason || '',
      Human_Custom_Reason: '',
      AI_Human_Match: item.Claude_Final_Result ? (item.Claude_Final_Result === AppState.currentVerdict) : '',
      reviewed_at: new Date().toISOString(),
    };

    Object.assign(item, reviewData);

    const mainItem = AppState.items.find(i => i.identifier === item.identifier);
    if (mainItem) Object.assign(mainItem, reviewData);

    Storage.saveReview(item.identifier, item).then(() => {
      document.dispatchEvent(new CustomEvent('review-saved'));
      if (SheetsAPI.isConfigured()) {
        SheetsAPI.queueReview(reviewData);
      }
    });

    return true;
  }

  // === Human Review Panel ===

  function findReasonLabel(category, value) {
    if (!value) return null;
    const allReasons = category === 'image'
      ? [...PASS_IMAGE_REASONS, ...FAIL_IMAGE_REASONS]
      : [...PASS_VERTICAL_REASONS, ...FAIL_VERTICAL_REASONS];
    const found = allReasons.find(r => r.value === value);
    return found ? I18n.tLabel(found.label) : value;
  }

  function renderHumanPanel(item) {
    const panel = document.getElementById('human-review-panel');
    if (!item) item = AppState.filteredItems[AppState.currentIndex];

    // Active verdict (currently selecting)
    if (AppState.currentVerdict) {
      panel.style.display = 'block';
      const badge = document.getElementById('human-verdict-badge');
      badge.textContent = AppState.currentVerdict;
      badge.className = 'ai-badge ' + (AppState.currentVerdict === 'Pass' ? 'pass' : 'fail');
      document.getElementById('human-image-reason').textContent = findReasonLabel('image', AppState.selectedImageReason) || '-';
      document.getElementById('human-vertical-reason').textContent = findReasonLabel('vertical', AppState.selectedVerticalReason) || '-';
      return;
    }

    // Previously reviewed
    if (item && item.Human_Result) {
      panel.style.display = 'block';
      const badge = document.getElementById('human-verdict-badge');
      badge.textContent = item.Human_Result;
      badge.className = 'ai-badge ' + (item.Human_Result === 'Pass' ? 'pass' : 'fail');
      document.getElementById('human-image-reason').textContent = findReasonLabel('image', item.Human_Image_Reason) || '-';
      document.getElementById('human-vertical-reason').textContent = findReasonLabel('vertical', item.Human_Vertical_Reason) || '-';
      return;
    }

    panel.style.display = 'none';
  }

  // === Custom Reason Modal ===

  let customModalCategory = null;

  function showCustomModal(category) {
    clearAutoSaveTimer();
    customModalCategory = category;
    AppState.keyboardMode = 'modal';

    const overlay = document.getElementById('modal-overlay');
    const input = document.getElementById('modal-input');
    const recentEl = document.getElementById('modal-recent');

    overlay.style.display = 'flex';
    input.value = '';
    input.focus();

    // Show recent reasons
    const recent = Storage.getRecentReasons();
    recentEl.innerHTML = '';
    recent.forEach(r => {
      const chip = document.createElement('span');
      chip.className = 'modal-recent-item';
      chip.textContent = r;
      chip.addEventListener('click', () => {
        input.value = r;
        confirmCustomModal();
      });
      recentEl.appendChild(chip);
    });
  }

  function confirmCustomModal() {
    const input = document.getElementById('modal-input');
    const value = input.value.trim();
    if (!value) {
      showToast(I18n.t('toast.enterReason'));
      return;
    }

    Storage.addRecentReason(value);

    const selectedClass = AppState.currentVerdict === 'Pass' ? 'selected-pass' : 'selected-fail';
    selectReason(customModalCategory, value, '', selectedClass);

    closeCustomModal();
  }

  function closeCustomModal() {
    document.getElementById('modal-overlay').style.display = 'none';
    // Restore keyboard mode
    AppState.keyboardMode = AppState.currentVerdict === 'Pass' ? 'pass_reason' : 'fail_reason';
    customModalCategory = null;
  }

  // Modal event handlers
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('modal-ok').addEventListener('click', confirmCustomModal);
    document.getElementById('modal-cancel').addEventListener('click', closeCustomModal);

    document.getElementById('btn-pass').addEventListener('click', startPass);
    document.getElementById('btn-fail').addEventListener('click', startFail);
    document.getElementById('btn-skip').addEventListener('click', skip);
  });

  // === Keyboard Hint ===

  function updateKeyboardHint() {
    const el = document.getElementById('keyboard-hint');
    switch (AppState.keyboardMode) {
      case 'nav':
        el.innerHTML = I18n.t('hint.nav');
        break;
      case 'pass_reason':
        el.innerHTML = I18n.t('hint.passReason');
        break;
      case 'fail_reason':
        el.innerHTML = I18n.t('hint.failReason');
        break;
      case 'modal':
        el.innerHTML = I18n.t('hint.modal');
        break;
    }
  }

  // === Handle Reason Keys ===

  function handlePassReasonKey(key) {
    const selectedClass = 'selected-pass';
    const imgReason = PASS_IMAGE_REASONS.find(r => r.key === key);
    if (imgReason) {
      if (imgReason.isCustom) {
        // Custom: toggle off if already custom-selected, otherwise open modal
        if (AppState.selectedImageReason && !PASS_IMAGE_REASONS.find(r => !r.isCustom && r.value === AppState.selectedImageReason)) {
          selectReason('image', AppState.selectedImageReason, '', selectedClass);
        } else {
          showCustomModal('image');
        }
        return;
      }
      selectReason('image', imgReason.value, imgReason.key, selectedClass);
      return;
    }
    const vertReason = PASS_VERTICAL_REASONS.find(r => r.key === key);
    if (vertReason) {
      if (vertReason.isCustom) {
        if (AppState.selectedVerticalReason && !PASS_VERTICAL_REASONS.find(r => !r.isCustom && r.value === AppState.selectedVerticalReason)) {
          selectReason('vertical', AppState.selectedVerticalReason, '', selectedClass);
        } else {
          showCustomModal('vertical');
        }
        return;
      }
      selectReason('vertical', vertReason.value, vertReason.key, selectedClass);
      return;
    }
    if (key === '9') { aiAgree(); return; }
  }

  function handleFailReasonKey(key) {
    const selectedClass = 'selected-fail';
    const imgReason = FAIL_IMAGE_REASONS.find(r => r.key === key);
    if (imgReason) {
      if (imgReason.isCustom) {
        if (AppState.selectedImageReason && !FAIL_IMAGE_REASONS.find(r => !r.isCustom && r.value === AppState.selectedImageReason)) {
          selectReason('image', AppState.selectedImageReason, '', selectedClass);
        } else {
          showCustomModal('image');
        }
        return;
      }
      selectReason('image', imgReason.value, imgReason.key, selectedClass);
      return;
    }
    const vertReason = FAIL_VERTICAL_REASONS.find(r => r.key === key);
    if (vertReason) {
      if (vertReason.isCustom) {
        if (AppState.selectedVerticalReason && !FAIL_VERTICAL_REASONS.find(r => !r.isCustom && r.value === AppState.selectedVerticalReason)) {
          selectReason('vertical', AppState.selectedVerticalReason, '', selectedClass);
        } else {
          showCustomModal('vertical');
        }
        return;
      }
      selectReason('vertical', vertReason.value, vertReason.key, selectedClass);
      return;
    }
    if (key === '0') { aiAgree(); return; }
  }

  // Listen for index changes to render AI panel + review panel
  document.addEventListener('index-changed', () => {
    const item = AppState.filteredItems[AppState.currentIndex];
    renderAIPanel(item);
    renderReviewPanel(item);
    // Auto-start Pass for unreviewed items
    if (item && !item.Human_Result) {
      startPass();
      renderLastVerdictButton();
      renderQuickFailGuide();
    } else {
      renderHumanPanel(item);
      updateKeyboardHint();
    }
  });

  // === Quick Fail Guide ===

  function renderQuickFailGuide() {
    const existing = document.getElementById('quick-fail-guide');
    if (existing) existing.remove();

    const item = AppState.filteredItems[AppState.currentIndex];
    if (!item || item.Human_Result) return;

    const guide = document.createElement('div');
    guide.id = 'quick-fail-guide';
    guide.className = 'quick-fail-guide';

    const keys = [
      { key: 'Z', label: FAIL_IMAGE_REASONS[0].label },
      { key: 'X', label: FAIL_IMAGE_REASONS[1].label },
      { key: 'C', label: FAIL_IMAGE_REASONS[2].label },
      { key: 'V', label: FAIL_VERTICAL_REASONS[0].label },
      { key: 'B', label: FAIL_VERTICAL_REASONS[1].label },
      { key: 'N', label: FAIL_IMAGE_REASONS[3].label },
      { key: 'M', label: FAIL_IMAGE_REASONS[4].label },
    ];

    guide.innerHTML =
      '<div style="font-size:11px;font-weight:700;color:#c0392b;margin-bottom:6px;">빠른 Fail</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:6px;">' +
      keys.map(k =>
        `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;background:#fff;border:1px solid #e0e0e0;border-radius:5px;font-size:12px;color:#555;">` +
        `<span style="display:inline-block;min-width:20px;text-align:center;padding:1px 6px;background:#e74c3c;color:#fff;border-radius:4px;font-size:11px;font-weight:700;">${k.key}</span> ${k.label}</span>`
      ).join('') +
      '</div>';

    const reviewPanel = document.getElementById('review-panel');
    reviewPanel.insertBefore(guide, reviewPanel.firstChild);
  }

  // === Quick Fail (Ctrl+1~5) ===

  function quickFail(type, reasonIndex) {
    let imageReason = null;
    let verticalReason = null;

    if (type === 'image') {
      const reason = FAIL_IMAGE_REASONS[reasonIndex];
      if (!reason) return;
      imageReason = reason.value;
    } else if (type === 'vertical') {
      const reason = FAIL_VERTICAL_REASONS[reasonIndex];
      if (!reason) return;
      verticalReason = reason.value;
    }

    clearAutoSaveTimer();
    AppState.currentVerdict = 'Fail';
    AppState.selectedImageReason = imageReason;
    AppState.selectedVerticalReason = verticalReason;

    renderHumanPanel();
    if (saveCurrentVerdict()) {
      if (AppState.currentIndex < AppState.filteredItems.length - 1) {
        goTo(AppState.currentIndex + 1);
      }
    }
  }

  return {
    startPass,
    startFail,
    skip,
    cancelReason,
    confirmReason,
    saveCurrentVerdict,
    handlePassReasonKey,
    handleFailReasonKey,
    showCustomModal,
    confirmCustomModal,
    closeCustomModal,
    updateKeyboardHint,
    applyLastVerdict,
    quickFail,
  };
})();
