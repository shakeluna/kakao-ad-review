/* review.js - Review logic, AI panel, reason selection */

const Review = (() => {

  // === Reason Definitions ===

  const PASS_IMAGE_REASONS = [
    { key: '1', label: 'BG Pure White + Packshot', value: 'Clean product photo on pure white background (#FFFFFF)', tooltip: {
      ko: '순수 흰색(#FFFFFF) 배경 + 상품 단독 촬영.\n텍스트/로고/배지/프로모션 없음. 텍스트 50% 미만.',
      en: 'Pure white (#FFFFFF) background + single product.\nNo text/logos/badges/promotions. Text under 50%.'
    }},
    { key: '2', label: '기타 (이미지)', value: null, isCustom: true, tooltip: {
      ko: '위 항목에 해당하지 않는 이미지 사유가 있을 때 직접 입력.',
      en: 'Enter a custom image reason not listed above.'
    }},
  ];

  const PASS_VERTICAL_REASONS = [
    { key: '5', label: '일반 소비재', value: 'General consumer product. No restricted industry match', tooltip: {
      ko: '패션, 생활용품, 서적 등 제한 업종에 해당하지 않는 일반 소비재.',
      en: 'Fashion, household items, books, etc. No restricted industry match.'
    }},
    { key: '6', label: '일반 식품', value: 'General food product. No health supplement indicators', tooltip: {
      ko: '건강기능식품이 아닌 일반 식품.\n주의: 즙/진액/엑기스/농축액은 Not Sure로 별도 판단.',
      en: 'General food, not health supplements.\nNote: Juices/extracts/concentrates \u2192 Not Sure.'
    }},
    { key: '7', label: '일반 가전', value: 'General consumer electronics. No restriction', tooltip: {
      ko: '의료기기가 아닌 일반 가전제품.\n주의: 혈압계, 혈당계, 체온계 등은 의료기기 \u2192 Fail.',
      en: 'Consumer electronics, not medical devices.\nNote: \ud608\uc555\uacc4, \ud608\ub2f9\uacc4, \uccb4\uc628\uacc4 \u2192 Medical device (Fail).'
    }},
    { key: '8', label: '기타 (업종)', value: null, isCustom: true, tooltip: {
      ko: '위 항목에 해당하지 않는 업종 사유가 있을 때 직접 입력.',
      en: 'Enter a custom vertical reason not listed above.'
    }},
  ];

  const FAIL_IMAGE_REASONS = [
    { key: '1', label: '텍스트 >50%', value: 'Text covers >50% of image area', tooltip: {
      ko: '이미지 면적의 50% 이상이 텍스트로 채워진 경우.\n패키징 인쇄 텍스트도 포함하여 면적 기준 판단.',
      en: 'More than 50% of image area covered by text.\nIncludes packaging printed text.'
    }},
    { key: '2', label: '로고/배지/텍스트', value: 'External logo/badge/text overlay outside product', tooltip: {
      ko: '상품 외부에 로고, 배지, 인증마크, 프로모션 텍스트 존재.\n테두리 30% 영역(상하좌우) 내 텍스트도 해당.',
      en: 'Logos, badges, marks, or promo text outside product.\nIncludes text within 30% border zones.'
    }},
    { key: '3', label: '비흰색 BG', value: 'Background is not #FFFFFF', tooltip: {
      ko: '배경이 순수 흰색(#FFFFFF)이 아닌 경우.\n밝은 회색, 베이지, 그라데이션, 패턴 모두 부적합.',
      en: 'Background is not pure white (#FFFFFF).\nLight gray, beige, gradients, patterns all fail.'
    }},
    { key: '4', label: '이미지가 너무 작음', value: 'Image resolution too small', tooltip: {
      ko: '저해상도, 합성, 왜곡, 블러 등 고품질 기준 미달.',
      en: 'Low resolution, composited, distorted, or blurred.'
    }},
    { key: '5', label: '컬러심볼', value: 'Color symbol present in image', tooltip: {
      ko: '원색/형광색 등 비즈보드에서 금지하는 색상 요소 포함.',
      en: 'Contains primary/fluorescent colors prohibited by BizBoard.'
    }},
    { key: '6', label: '로드 실패', value: 'Image failed to load or broken', tooltip: {
      ko: '이미지 다운로드 실패 또는 깨짐/손상.\n확인 불가 = 검수 불가.',
      en: 'Image download failed or broken/corrupted.\nCannot verify = cannot approve.'
    }},
    { key: '7', label: '기타 (이미지)', value: null, isCustom: true, tooltip: {
      ko: '위 항목에 해당하지 않는 이미지 Fail 사유가 있을 때 직접 입력.',
      en: 'Enter a custom image fail reason not listed above.'
    }},
  ];

  const FAIL_VERTICAL_REASONS = [
    { key: 'Q', label: '건강기능식품', value: 'Health functional food. External DSP cannot verify', tooltip: {
      ko: '외부 DSP는 서류 검토 시스템이 없어 심사 불가.\n\n키워드: 비타민, 유산균, 콜라겐, 홍삼, 오메가3, 루테인, 밀크씨슬, 프로바이오틱스, 글루코사민, 아르기닌...\n\n예외: 즙/진액/농축액(양배추즙, 석류즙 등)은 Not Sure',
      en: 'External DSP has no document review system.\n\nKeywords: \ube44\ud0c0\ubbfc, \uc720\uc0b0\uade0, \ucf5c\ub77c\uac90, \ud64d\uc0bc, \uc624\uba54\uac003, \ub8e8\ud14c\uc778, \ubc00\ud06c\uc528\uc2ac, \ud504\ub85c\ubc14\uc774\uc624\ud2f1\uc2a4...\n\nExclusion: Juices/extracts (\uc591\ubc30\ucd94\uc999, \uc11d\ub958\uc999) \u2192 Not Sure'
    }},
    { key: 'W', label: '의약품/의료기기', value: 'Medical product/device. Requires documentation', tooltip: {
      ko: '서류 심사 필수 업종.\n\n키워드: 혈압계, 혈당계, 보청기, 콘택트렌즈, 체온계, 네뷸라이저, 물리치료기...\n\n예외: 밴드(헤어밴드, 고무밴드), 파스(파스타, 파스쿠찌) 등은 제외',
      en: 'Requires document review.\n\nKeywords: \ud608\uc555\uacc4, \ud608\ub2f9\uacc4, \ubcf4\uccad\uae30, \ucf58\ud0dd\ud2b8\ub80c\uc988, \uccb4\uc628\uacc4, \ub124\ubdf8\ub77c\uc774\uc800...\n\nExclusion: \ubc34\ub4dc (hair band, rubber band), \ud30c\uc2a4 (pasta, Pascucci) excluded'
    }},
    { key: 'E', label: '성인/도박/담배', value: 'Kakao platform banned category', tooltip: {
      ko: '카카오 플랫폼 공통 금지 업종.\n\n키워드: 성인용품, 카지노, 전자담배, 니코틴, 가상화폐, 대부업, 소개팅앱...\n\n예외: 시가(출시가, 시가총액), 쥴(스케쥴) 등은 제외',
      en: 'Kakao platform banned category.\n\nKeywords: \uc131\uc778\uc6a9\ud488, \uce74\uc9c0\ub178, \uc804\uc790\ub2f4\ubc30, \ub2c8\ucf54\ud2f4, \uac00\uc0c1\ud654\ud3d0, \ub300\ubd80\uc5c5...\n\nExclusion: \uc2dc\uac00 (\ucd9c\uc2dc\uac00/\uc2dc\uac00\ucd1d\uc561), \ucab8 (\uc2a4\ucf00\ucab8) excluded'
    }},
    { key: 'R', label: '주류', value: 'Alcohol product. Prohibited on BizBoard', tooltip: {
      ko: '카카오 비즈보드 금지.\n\n키워드: 소주, 위스키, 맥주, 와인, 막걸리, 사케, 하이볼, 리큐르...\n\n예외: 맥주효모, 와인잔, 와인색, 칵테일새우, 칵테일소스 등은 제외',
      en: 'Prohibited on BizBoard.\n\nKeywords: \uc18c\uc8fc, \uc704\uc2a4\ud0a4, \ub9e5\uc8fc, \uc640\uc778, \ub9c9\uac78\ub9ac, \uc0ac\ucf00, \ud558\uc774\ubcfc, \ub9ac\ud050\ub974...\n\nExclusion: \ub9e5\uc8fc\ud6a8\ubaa8, \uc640\uc778\uc794, \uc640\uc778\uc0c9, \uce75\ud14c\uc77c\uc0c8\uc6b0, \uce75\ud14c\uc77c\uc18c\uc2a4 excluded'
    }},
    { key: 'T', label: '속옷/수영복', value: 'Underwear/swimwear. Platform inappropriate', tooltip: {
      ko: '비즈보드 소재 가이드라인 부적합. 여성위생용품 포함.\n\n키워드: 브라렛, 팬티, 비키니, 래쉬가드, 캐미솔, 생리대, 탐폰...\n\n예외: 브라운, 브라켓, 브라질, 팬티호스 등은 제외',
      en: 'Platform inappropriate. Includes feminine hygiene.\n\nKeywords: \ube0c\ub77c\ub81b, \ud32c\ud2f0, \ube44\ud0a4\ub2c8, \ub798\uc26c\uac00\ub4dc, \uce90\ubbf8\uc194, \uc0dd\ub9ac\ub300, \ud0d0\ud3f0...\n\nExclusion: \ube0c\ub77c\uc6b4, \ube0c\ub77c\ucf13, \ube0c\ub77c\uc9c8, \ud32c\ud2f0\ud638\uc2a4 excluded'
    }},
    { key: 'Y', label: '귀금속/투자', value: 'Precious metals/investment product', tooltip: {
      ko: '투자성 상품으로 광고 부적합.\n\n키워드: 골드바, 금화, 실버바, 순금, 투자용, 재테크...\n\n예외: 순금 화장품(앰플, 에센스)은 제외. 한국금거래소 \u2192 전수 Reject',
      en: 'Investment products. Not suitable for ads.\n\nKeywords: \uace8\ub4dc\ubc14, \uae08\ud654, \uc2e4\ubc84\ubc14, \uc21c\uae08, \ud22c\uc790\uc6a9, \uc7ac\ud14c\ud06c...\n\nExclusion: \uc21c\uae08 cosmetics excluded. \ud55c\uad6d\uae08\uac70\ub798\uc18c \u2192 always Reject'
    }},
    { key: 'U', label: '기타 규제업종', value: null, isCustom: true, tooltip: {
      ko: '위 항목에 해당하지 않는 규제 업종 사유가 있을 때 직접 입력.\n예: 정치/종교, 논문대행, 게임아이템거래 등.',
      en: 'Enter a custom regulated industry reason not listed above.\nEx: Politics/religion, essay ghostwriting, game item trading, etc.'
    }},
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

  function getTooltipText(tooltip) {
    if (!tooltip) return '';
    const lang = I18n.getLang();
    return (lang === 'en' && tooltip.en) ? tooltip.en : tooltip.ko;
  }

  function createTooltipIcon(tooltip) {
    const helpIcon = document.createElement('span');
    helpIcon.className = 'reason-help-icon';
    helpIcon.textContent = '?';

    const tooltipEl = document.createElement('span');
    tooltipEl.className = 'reason-tooltip';
    tooltipEl.textContent = getTooltipText(tooltip);
    helpIcon.appendChild(tooltipEl);

    helpIcon.addEventListener('mouseenter', () => tooltipEl.classList.add('show'));
    helpIcon.addEventListener('mouseleave', () => tooltipEl.classList.remove('show'));
    helpIcon.addEventListener('click', (e) => { e.stopPropagation(); });

    return helpIcon;
  }

  function createReasonButton(reason, category, selectedClass) {
    const btn = document.createElement('button');
    btn.className = 'reason-btn';
    btn.dataset.category = category;
    btn.dataset.key = reason.key;
    btn.dataset.value = reason.value || '';
    btn.dataset.isCustom = reason.isCustom ? 'true' : 'false';
    btn.innerHTML = `<kbd>${reason.key}</kbd> ${I18n.tLabel(reason.label)}`;

    if (reason.tooltip) {
      btn.appendChild(createTooltipIcon(reason.tooltip));
    }

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

  // Listen for index changes to render review panel
  document.addEventListener('index-changed', () => {
    const item = AppState.filteredItems[AppState.currentIndex];
    renderReviewPanel(item);
    // Auto-start Pass for unreviewed items
    if (item && !item.Human_Result) {
      startPass();
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
      { key: 'Z', label: FAIL_IMAGE_REASONS[0].label, tooltip: FAIL_IMAGE_REASONS[0].tooltip },
      { key: 'X', label: FAIL_IMAGE_REASONS[1].label, tooltip: FAIL_IMAGE_REASONS[1].tooltip },
      { key: 'C', label: FAIL_IMAGE_REASONS[2].label, tooltip: FAIL_IMAGE_REASONS[2].tooltip },
      { key: 'V', label: FAIL_VERTICAL_REASONS[0].label, tooltip: FAIL_VERTICAL_REASONS[0].tooltip },
      { key: 'B', label: FAIL_VERTICAL_REASONS[1].label, tooltip: FAIL_VERTICAL_REASONS[1].tooltip },
      { key: 'N', label: FAIL_IMAGE_REASONS[3].label, tooltip: FAIL_IMAGE_REASONS[3].tooltip },
      { key: 'M', label: FAIL_IMAGE_REASONS[4].label, tooltip: FAIL_IMAGE_REASONS[4].tooltip },
    ];

    const title = document.createElement('div');
    title.style.cssText = 'font-size:11px;font-weight:700;color:#c0392b;margin-bottom:6px;';
    title.textContent = I18n.t('quickFail.title');
    guide.appendChild(title);

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';

    keys.forEach(k => {
      const chip = document.createElement('span');
      chip.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:3px 10px;background:#fff;border:1px solid #e0e0e0;border-radius:5px;font-size:12px;color:#555;position:relative;';
      chip.innerHTML =
        `<span style="display:inline-block;min-width:20px;text-align:center;padding:1px 6px;background:#e74c3c;color:#fff;border-radius:4px;font-size:11px;font-weight:700;">${k.key}</span> ${I18n.tLabel(k.label)}`;

      if (k.tooltip) {
        chip.appendChild(createTooltipIcon(k.tooltip));
      }

      row.appendChild(chip);
    });

    guide.appendChild(row);

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
