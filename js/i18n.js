/* i18n.js - Internationalization */

const I18n = (() => {
  const T = {
    ko: {
      'app.title': 'Ad Review',
      'upload.btn': 'Excel 업로드',
      'filter.allAdv': '전체 광고주',
      'filter.all': '전체',
      'filter.unreviewed': '미검수',
      'filter.pass': 'Pass',
      'filter.fail': 'Fail',
      'progress.upload': '데이터를 업로드하세요',
      'progress.empty': '데이터 없음',
      'progress.stats': '{reviewed} / {total} ({pct}%)  |  Pass: {pass}  Fail: {fail}  미검수: {unreviewed}',
      'upload.dropText': 'Excel 파일을 드래그하거나 클릭하여 업로드',
      'upload.dropHint': '.xlsx, .xls, .csv 파일 지원',
      'info.id': 'ID',
      'info.advertiser': '광고주',
      'info.name': '상품명',
      'info.copy': '카피',
      'info.charLength': '글자수',
      'info.image': '이미지',
      'ai.title': 'AI 판정 결과',
      'ai.vertical': '업종:',
      'ai.verticalReason': '업종 사유:',
      'ai.packshotReason': '팩샷 사유:',
      'human.title': '내 판정 결과',
      'human.image': '이미지:',
      'human.vertical': '업종:',
      'nav.prev': '← 이전',
      'nav.next': '다음 →',
      'modal.customTitle': '기타 사유 입력',
      'modal.placeholder': '사유를 입력하세요...',
      'modal.ok': '확인',
      'modal.cancel': '취소',
      'modal.saveComplete': '엑셀파일에 저장완료',
      'reason.imageTitle': '이미지 사유',
      'reason.verticalTitle': '업종 사유',
      'reason.applyLast': '이전 설정 적용',
      'reason.quickTitle': '빠른 선택',
      'reason.aiAgree': 'AI 동의 (사유 복사)',
      'match.agree': 'AI 동의',
      'match.disagree': 'AI 불일치',
      'hint.nav': '<kbd>P</kbd> Pass &nbsp; <kbd>F</kbd> Fail &nbsp; <kbd>S</kbd> Skip &nbsp; <kbd>Space</kbd> 이전설정 &nbsp; <kbd>←</kbd><kbd>→</kbd> 이동 &nbsp; <kbd>Z/X/C/V/B</kbd> 빠른Fail',
      'hint.passReason': '<kbd>1-2</kbd> 이미지 &nbsp; <kbd>5-8</kbd> 업종 &nbsp; <kbd>9</kbd> AI동의 &nbsp; <kbd>Space</kbd> 이전설정 &nbsp; <kbd>→</kbd><kbd>Enter</kbd> 저장+다음 &nbsp; <kbd>Esc</kbd> 취소 &nbsp; <kbd>Z/X/C/V/B</kbd> 빠른Fail',
      'hint.failReason': '<kbd>1-7</kbd> 이미지 &nbsp; <kbd>Q-U</kbd> 업종 &nbsp; <kbd>0</kbd> AI동의 &nbsp; <kbd>Space</kbd> 이전설정 &nbsp; <kbd>→</kbd><kbd>Enter</kbd> 저장+다음 &nbsp; <kbd>Esc</kbd> 취소 &nbsp; <kbd>Z/X/C/V/B</kbd> 빠른Fail',
      'hint.modal': '<kbd>Enter</kbd> 확인 &nbsp; <kbd>Esc</kbd> 취소',
      'toast.loaded': '{count}건 로드 완료 ({name})',
      'toast.restored': '이전 세션 복원됨',
      'toast.emptyFile': '빈 Excel 파일입니다',
      'toast.parseFail': 'Excel 파일 파싱 실패: ',
      'toast.urlCopied': 'URL 복사됨',
      'toast.selectReason': '최소 1개의 사유를 선택하세요',
      'toast.enterReason': '사유를 입력하세요',
      'toast.noWritePerm': '파일 쓰기 권한이 필요합니다',
      'toast.autoSaveFail': '자동 저장 실패 — 파일 권한을 확인하세요',
      'toast.dragNoSave': '드래그 파일은 자동저장 불가 — 파일 선택기를 사용하세요',
      'toast.noData': '내보낼 데이터가 없습니다',
      'toast.parsed': '{count}건 파싱 완료',
      'toast.uploading': 'Sheets 업로드 중... ({pct}%)',
      'toast.uploadComplete': 'Google Sheets에 {count}건 업로드 완료',
      'toast.appendComplete': '{count}건 추가 업로드 완료',
      'toast.noDuplicates': '새로운 항목이 없습니다 (모두 중복)',
      'toast.duplicatesSkipped': '{added}건 추가, {skipped}건 중복 건너뜀',
      'toast.uploadFail': 'Sheets 업로드 실패 — 로컬에서 작업합니다',
      'toast.loadingSheets': 'Google Sheets에서 로드 중...',
      'toast.refreshed': 'Sheets에서 새로고침 완료',
      'toast.refreshFail': 'Sheets 새로고침 실패',
      'toast.notConfigured': 'Apps Script URL이 설정되지 않았습니다',
      'toast.noSheetsUrl': 'Spreadsheet URL이 설정되지 않았습니다',
      'sync.connected': '연결됨',
      'sync.disconnected': '오프라인',
      'sync.syncing': '동기화 중...',
      'modal.allReviewed': '모든 항목 검수 완료!',
      'btn.sheetsLink': 'Sheets 열기',
      'btn.refresh': '새로고침',
      'auth.title': '접근 제한',
      'auth.placeholder': '비밀번호 입력',
      'auth.submit': '확인',
      'auth.error': '비밀번호가 틀렸습니다',
      'auth.lockout': '{seconds}초 후 재시도 가능',
      'auth.attemptsLeft': '남은 시도: {n}회',
      'btn.clearCache': '캐시 초기화',
      'cache.confirmClear': '브라우저 캐시(IndexedDB, 오프라인 큐, 세션)를 모두 삭제합니다.\n계속하시겠습니까?',
      'cache.tooltip': '다음 항목을 삭제합니다:\n- IndexedDB 캐시 (검수 데이터)\n- 오프라인 대기열 (미전송 리뷰)\n- 세션 정보 (현재 위치, 필터)\n\nGoogle Sheets 원본 데이터는 영향 없습니다.\n삭제 후 페이지가 새로고침됩니다.',
      'toast.cacheCleared': '캐시 초기화 완료',
    },
    en: {
      'app.title': 'Ad Review',
      'upload.btn': 'Upload Excel',
      'filter.allAdv': 'All Advertisers',
      'filter.all': 'All',
      'filter.unreviewed': 'Unreviewed',
      'filter.pass': 'Pass',
      'filter.fail': 'Fail',
      'progress.upload': 'Upload data to start',
      'progress.empty': 'No data',
      'progress.stats': '{reviewed} / {total} ({pct}%)  |  Pass: {pass}  Fail: {fail}  Unreviewed: {unreviewed}',
      'upload.dropText': 'Drag or click to upload Excel file',
      'upload.dropHint': 'Supports .xlsx, .xls, .csv',
      'info.id': 'ID',
      'info.advertiser': 'Advertiser',
      'info.name': 'Product',
      'info.copy': 'Ad Copy',
      'info.charLength': 'Length',
      'info.image': 'Image',
      'ai.title': 'AI Verdict',
      'ai.vertical': 'Vertical:',
      'ai.verticalReason': 'Vertical Reason:',
      'ai.packshotReason': 'Packshot Reason:',
      'human.title': 'My Verdict',
      'human.image': 'Image:',
      'human.vertical': 'Vertical:',
      'nav.prev': '← Prev',
      'nav.next': 'Next →',
      'modal.customTitle': 'Custom Reason',
      'modal.placeholder': 'Enter reason...',
      'modal.ok': 'OK',
      'modal.cancel': 'Cancel',
      'modal.saveComplete': 'Saved to Excel',
      'reason.imageTitle': 'Image Reason',
      'reason.verticalTitle': 'Vertical Reason',
      'reason.applyLast': 'Apply Previous',
      'reason.quickTitle': 'Quick Select',
      'reason.aiAgree': 'AI Agree (copy reason)',
      'match.agree': 'AI Match',
      'match.disagree': 'AI Mismatch',
      'hint.nav': '<kbd>P</kbd> Pass &nbsp; <kbd>F</kbd> Fail &nbsp; <kbd>S</kbd> Skip &nbsp; <kbd>Space</kbd> Prev &nbsp; <kbd>←</kbd><kbd>→</kbd> Move &nbsp; <kbd>Z/X/C/V/B</kbd> Quick Fail',
      'hint.passReason': '<kbd>1-2</kbd> Image &nbsp; <kbd>5-8</kbd> Vertical &nbsp; <kbd>9</kbd> AI Agree &nbsp; <kbd>Space</kbd> Prev &nbsp; <kbd>→</kbd><kbd>Enter</kbd> Save+Next &nbsp; <kbd>Esc</kbd> Cancel &nbsp; <kbd>Z/X/C/V/B</kbd> Quick Fail',
      'hint.failReason': '<kbd>1-7</kbd> Image &nbsp; <kbd>Q-U</kbd> Vertical &nbsp; <kbd>0</kbd> AI Agree &nbsp; <kbd>Space</kbd> Prev &nbsp; <kbd>→</kbd><kbd>Enter</kbd> Save+Next &nbsp; <kbd>Esc</kbd> Cancel &nbsp; <kbd>Z/X/C/V/B</kbd> Quick Fail',
      'hint.modal': '<kbd>Enter</kbd> OK &nbsp; <kbd>Esc</kbd> Cancel',
      'toast.loaded': '{count} items loaded ({name})',
      'toast.restored': 'Session restored',
      'toast.emptyFile': 'Empty Excel file',
      'toast.parseFail': 'Excel parse failed: ',
      'toast.urlCopied': 'URL copied',
      'toast.selectReason': 'Select at least 1 reason',
      'toast.enterReason': 'Enter a reason',
      'toast.noWritePerm': 'File write permission required',
      'toast.autoSaveFail': 'Auto-save failed — check permissions',
      'toast.dragNoSave': 'Drag files can\'t auto-save — use file picker',
      'toast.noData': 'No data to export',
      'toast.parsed': '{count} items parsed',
      'toast.uploading': 'Uploading to Sheets... ({pct}%)',
      'toast.uploadComplete': '{count} items uploaded to Google Sheets',
      'toast.appendComplete': '{count} items appended',
      'toast.noDuplicates': 'No new items (all duplicates)',
      'toast.duplicatesSkipped': '{added} added, {skipped} duplicates skipped',
      'toast.uploadFail': 'Sheets upload failed — working locally',
      'toast.loadingSheets': 'Loading from Google Sheets...',
      'toast.refreshed': 'Refreshed from Sheets',
      'toast.refreshFail': 'Failed to refresh from Sheets',
      'toast.notConfigured': 'Apps Script URL not configured',
      'toast.noSheetsUrl': 'Spreadsheet URL not configured',
      'sync.connected': 'Connected',
      'sync.disconnected': 'Offline',
      'sync.syncing': 'Syncing...',
      'modal.allReviewed': 'All items reviewed!',
      'btn.sheetsLink': 'Open Sheets',
      'btn.refresh': 'Refresh',
      'auth.title': 'Access Restricted',
      'auth.placeholder': 'Enter password',
      'auth.submit': 'Submit',
      'auth.error': 'Incorrect password',
      'auth.lockout': 'Retry in {seconds}s',
      'auth.attemptsLeft': '{n} attempts left',
      'btn.clearCache': 'Clear Cache',
      'cache.confirmClear': 'This will delete all browser cache (IndexedDB, offline queue, session).\nContinue?',
      'cache.tooltip': 'This will delete:\n- IndexedDB cache (review data)\n- Offline queue (unsent reviews)\n- Session info (position, filters)\n\nGoogle Sheets data is NOT affected.\nPage will reload after clearing.',
      'toast.cacheCleared': 'Cache cleared',
    }
  };

  // Reason label translations (Korean label → English)
  const labelT = {
    en: {
      'Packshot O': 'Packshot O',
      'BG White': 'BG White',
      'BG Pure White + Packshot': 'BG Pure White + Packshot',
      'Branding OK': 'Branding OK',
      '기타 (이미지)': 'Other (Image)',
      '일반 소비재': 'Consumer Goods',
      '일반 식품': 'General Food',
      '일반 가전': 'Electronics',
      '기타 (업종)': 'Other (Vertical)',
      '텍스트 >50%': 'Text >50%',
      '테두리 텍스트': 'Border Text',
      '로고/배지': 'Logo/Badge',
      '로고/배지/텍스트': 'Logo/Badge/Text',
      '프로모션': 'Promotion',
      '라이프스타일': 'Lifestyle',
      '비흰색 BG': 'Non-white BG',
      '복수 상품': 'Multiple Products',
      '이미지가 너무 작음': 'Image Too Small',
      '컬러심볼': 'Color Symbol',
      '로드 실패': 'Load Failed',
      '건강기능식품': 'Health Supplements',
      '의약품/의료기기': 'Medicine/Medical',
      '성인/도박/담배': 'Adult/Gambling/Tobacco',
      '주류': 'Alcohol',
      '속옷/수영복': 'Underwear/Swimwear',
      '귀금속/투자': 'Precious Metals/Investment',
      '기타 규제업종': 'Other Regulated',
    }
  };

  let lang = localStorage.getItem('reviewLang') || null;

  function t(key, params) {
    let text = (T[lang] && T[lang][key]) || T['ko'][key] || key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replaceAll(`{${k}}`, String(v));
      }
    }
    return text;
  }

  function tLabel(label) {
    if (!label || lang === 'ko' || !lang) return label;
    return (labelT[lang] && labelT[lang][label]) || label;
  }

  function setLang(newLang) {
    lang = newLang;
    localStorage.setItem('reviewLang', lang);
  }

  function getLang() { return lang; }

  function applyStatic() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const attr = el.dataset.i18nAttr;
      if (attr === 'placeholder') {
        el.placeholder = t(key);
      } else {
        el.textContent = t(key);
      }
    });
    const toggle = document.getElementById('lang-toggle');
    if (toggle) toggle.textContent = lang === 'ko' ? 'EN' : '한국어';
  }

  function needsSelection() { return !lang; }

  return { t, tLabel, setLang, getLang, applyStatic, needsSelection };
})();
