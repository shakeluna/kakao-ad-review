/* keyboard.js - Keyboard shortcut handler (state machine) */

document.addEventListener('keydown', (e) => {
  // Ignore if typing in input/textarea (except modal which we handle)
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
    // Only handle Enter/Esc in modal mode
    if (AppState.keyboardMode === 'modal') {
      if (e.key === 'Enter') {
        e.preventDefault();
        Review.confirmCustomModal();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        Review.closeCustomModal();
      }
    }
    return;
  }

  const key = e.key;
  const keyUpper = key.toUpperCase();
  const mode = AppState.keyboardMode;

  // Z/X/C/V/B/N/M: Quick Fail shortcuts (nav/pass_reason/fail_reason, no modifiers)
  if (!e.ctrlKey && !e.altKey && !e.shiftKey && mode !== 'modal') {
    const quickFailMap = {
      'Z': { type: 'image', index: 0 },    // 텍스트 >50%
      'X': { type: 'image', index: 1 },    // 로고/배지/텍스트
      'C': { type: 'image', index: 2 },    // 비흰색 BG
      'V': { type: 'vertical', index: 0 }, // 건강기능식품
      'B': { type: 'vertical', index: 1 }, // 의약품/의료기기
      'N': { type: 'image', index: 3 },    // 이미지가 너무 작음
      'M': { type: 'image', index: 4 },    // 컬러심볼
    };
    if (keyUpper in quickFailMap) {
      e.preventDefault();
      const mapping = quickFailMap[keyUpper];
      Review.quickFail(mapping.type, mapping.index);
      return;
    }
  }

  switch (mode) {
    case 'nav':
      if (keyUpper === 'P') { e.preventDefault(); Review.startPass(); }
      else if (keyUpper === 'F') { e.preventDefault(); Review.startFail(); }
      else if (key === 'ArrowLeft' || keyUpper === 'A') { e.preventDefault(); goPrev(); }
      else if (key === 'ArrowRight' || keyUpper === 'D') { e.preventDefault(); goNext(); }
      break;

    case 'pass_reason':
      if (key === 'Escape') { e.preventDefault(); Review.cancelReason(); }
      else if (keyUpper === 'F') { e.preventDefault(); Review.startFail(); }
      else if (key === 'Enter' || key === 'ArrowRight' || keyUpper === 'D') { e.preventDefault(); goNext(); }
      else if (keyUpper === 'A' || key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
      else { e.preventDefault(); Review.handlePassReasonKey(keyUpper); }
      break;

    case 'fail_reason':
      if (key === 'Escape') { e.preventDefault(); Review.cancelReason(); }
      else if (keyUpper === 'P') { e.preventDefault(); Review.startPass(); }
      else if (key === 'Enter' || key === 'ArrowRight' || keyUpper === 'D') { e.preventDefault(); goNext(); }
      else if (keyUpper === 'A' || key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
      else { e.preventDefault(); Review.handleFailReasonKey(keyUpper); }
      break;

    case 'modal':
      // Handled above in input check
      break;
  }
});
