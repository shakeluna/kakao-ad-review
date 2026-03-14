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

  switch (mode) {
    case 'nav':
      if (keyUpper === 'P') { e.preventDefault(); Review.startPass(); }
      else if (keyUpper === 'F') { e.preventDefault(); Review.startFail(); }
      else if (keyUpper === 'S') { e.preventDefault(); Review.skip(); }
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
