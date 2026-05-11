/* app.js - Main application controller (Google Sheets edition) */

const AppState = {
  items: [],
  filteredItems: [],
  currentIndex: 0,
  keyboardMode: 'nav',
  currentVerdict: null,
  selectedImageReason: null,
  selectedVerticalReason: null,
  currentAdvertiser: 'ALL',
  currentFilter: 'all',
};

// Column name normalization map (sheet columns only)
const COLUMN_MAP = {
  'adv': 'advertiser',
  'advertiser': 'advertiser',
  'identifier': 'identifier',
  'name': 'name',
  'adcopy': 'adCopy',
  'adCopy': 'adCopy',
  'url': 'url',
  'Human_Result': 'Human_Result',
  'Human_Image_Reason': 'Human_Image_Reason',
  'Human_Vertical_Reason': 'Human_Vertical_Reason',
  'reviewed_at': 'reviewed_at',
};

function normalizeRow(rawRow) {
  const normalized = {};
  for (const [key, value] of Object.entries(rawRow)) {
    const mappedKey = COLUMN_MAP[key] || COLUMN_MAP[key.trim()] || key;
    normalized[mappedKey] = value;
  }

  if (!normalized.identifier) {
    normalized.identifier = 'ROW_' + Math.random().toString(36).substr(2, 9);
  }

  if (!normalized.adCopy || String(normalized.adCopy).trim() === '') {
    const advShort = getAdvShortForCopy(normalized.advertiser);
    normalized.adCopy = advShort + ' 구매하기 >';
  }

  return normalized;
}

function getAdvShortForCopy(advertiser) {
  if (!advertiser) return '광고주';
  const parts = advertiser.split('_');
  if (parts.length >= 2) return parts[1];
  return advertiser;
}

// === Navigation ===

function goTo(index) {
  if (AppState.filteredItems.length === 0) return;
  AppState.currentIndex = Math.max(0, Math.min(index, AppState.filteredItems.length - 1));
  AppState.keyboardMode = 'nav';
  AppState.currentVerdict = null;
  AppState.selectedImageReason = null;
  AppState.selectedVerticalReason = null;
  Storage.saveSession('currentIndex', AppState.currentIndex);
  document.dispatchEvent(new CustomEvent('index-changed'));
}

function goNext() {
  if (AppState.currentVerdict) {
    if (!Review.saveCurrentVerdict()) return;
  }
  if (AppState.currentIndex < AppState.filteredItems.length - 1) {
    goTo(AppState.currentIndex + 1);
  }
}

function goPrev() {
  if (AppState.currentVerdict) {
    if (!Review.saveCurrentVerdict()) return;
  }
  if (AppState.currentIndex > 0) {
    goTo(AppState.currentIndex - 1);
  }
}

function goNextUnreviewed() {
  const items = AppState.filteredItems;
  for (let i = AppState.currentIndex + 1; i < items.length; i++) {
    if (!items[i].Human_Result) { goTo(i); return; }
  }
  for (let i = 0; i < AppState.currentIndex; i++) {
    if (!items[i].Human_Result) { goTo(i); return; }
  }
  // All reviewed
  showAllReviewedModal();
  goTo(AppState.currentIndex);
}

function showAllReviewedModal() {
  // Flush pending reviews before showing completion
  if (SheetsAPI.isConfigured()) {
    SheetsAPI.flushReviews();
  }

  const overlay = document.getElementById('modal-overlay');
  const title = document.getElementById('modal-title');
  const input = document.getElementById('modal-input');
  const recent = document.getElementById('modal-recent');
  const actions = document.querySelector('.modal-actions');

  title.textContent = I18n.t('modal.allReviewed');
  input.style.display = 'none';
  recent.style.display = 'none';
  actions.innerHTML = `<button class="btn-modal btn-modal-ok" id="modal-done-ok">${I18n.t('modal.ok')}</button>`;

  overlay.style.display = 'flex';
  document.getElementById('modal-done-ok').addEventListener('click', () => {
    overlay.style.display = 'none';
    title.textContent = I18n.t('modal.customTitle');
    input.style.display = '';
    recent.style.display = '';
    actions.innerHTML = `
      <button class="btn-modal btn-modal-ok" id="modal-ok"><span data-i18n="modal.ok">${I18n.t('modal.ok')}</span> <kbd>Enter</kbd></button>
      <button class="btn-modal btn-modal-cancel" id="modal-cancel"><span data-i18n="modal.cancel">${I18n.t('modal.cancel')}</span> <kbd>Esc</kbd></button>
    `;
    document.getElementById('modal-ok').addEventListener('click', () => Review.confirmCustomModal());
    document.getElementById('modal-cancel').addEventListener('click', () => Review.closeCustomModal());
  });
}

// === Progress ===

function updateProgress() {
  const total = AppState.filteredItems.length;
  if (total === 0) {
    document.getElementById('progress-bar').style.width = '0%';
    document.getElementById('progress-stats').textContent = I18n.t('progress.empty');
    return;
  }

  const reviewed = AppState.filteredItems.filter(i => i.Human_Result).length;
  const pass = AppState.filteredItems.filter(i => i.Human_Result === 'Pass').length;
  const fail = AppState.filteredItems.filter(i => i.Human_Result === 'Fail').length;
  const unreviewed = total - reviewed;
  const pct = (reviewed / total * 100).toFixed(1);

  document.getElementById('progress-bar').style.width = pct + '%';
  document.getElementById('progress-stats').textContent =
    I18n.t('progress.stats', { reviewed, total, pct, pass, fail, unreviewed });
}

function updateNavPosition() {
  const total = AppState.filteredItems.length;
  const pos = total > 0 ? AppState.currentIndex + 1 : 0;
  document.getElementById('nav-position').textContent = `#${pos} / ${total}`;
}

// === Toast ===

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

// === Load Data from Sheets ===

async function loadFromSheets() {
  if (!SheetsAPI.isConfigured()) return false;

  try {
    showToast(I18n.t('toast.loadingSheets'));
    const data = await SheetsAPI.fetchData();
    if (data.length === 0) return false;

    const items = data.map(normalizeRow);
    AppState.items = items;
    await Storage.saveAllItems(items);

    // localStorage에 lastVerdict가 없으면, 가장 최근 검수된 항목에서 초기화
    if (!localStorage.getItem('lastVerdict')) {
      const reviewed = items.filter(i => i.Human_Result && (i.Human_Image_Reason || i.Human_Vertical_Reason));
      if (reviewed.length > 0) {
        const last = reviewed[reviewed.length - 1];
        localStorage.setItem('lastVerdict', JSON.stringify({
          verdict: last.Human_Result,
          imageReason: last.Human_Image_Reason || '',
          verticalReason: last.Human_Vertical_Reason || '',
        }));
      }
    }

    return true;
  } catch (e) {
    console.error('Failed to load from Sheets:', e);
    return false;
  }
}

// === UI State ===

function showDataUI() {
  document.getElementById('upload-prompt').style.display = 'none';
  document.getElementById('main-content').style.display = 'flex';
  document.getElementById('nav-footer').style.display = 'flex';

  Filters.populateAdvertiserDropdown();

  const savedIndex = Storage.loadSession('currentIndex', 0);
  const savedAdv = Storage.loadSession('currentAdvertiser', 'ALL');
  const savedFilter = Storage.loadSession('currentFilter', 'all');

  document.getElementById('advertiser-filter').value = savedAdv;
  document.getElementById('status-filter').value = savedFilter;
  AppState.currentAdvertiser = savedAdv;
  AppState.currentFilter = savedFilter;

  applyFilters();

  const idx = Math.min(savedIndex, AppState.filteredItems.length - 1);
  goTo(Math.max(0, idx));
}

function applyFilters() {
  Filters.applyFilters();
  updateProgress();
  updateNavPosition();
}

// === Language ===

function changeLang(lang) {
  I18n.setLang(lang);
  I18n.applyStatic();
  if (AppState.currentVerdict) Review.cancelReason();
  if (AppState.filteredItems.length > 0) {
    document.dispatchEvent(new CustomEvent('index-changed'));
  }
  updateProgress();
  Review.updateKeyboardHint();
}

// === Initialization ===

// === Auth Gate ===

function initAuthGate() {
  const overlay = document.getElementById('auth-overlay');
  const input = document.getElementById('auth-input');
  const btn = document.getElementById('auth-submit');
  const error = document.getElementById('auth-error');
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_SEC = 30;
  let fails = parseInt(sessionStorage.getItem('auth_fails') || '0', 10);

  function applyLang() {
    const lang = I18n.getLang();
    if (lang) {
      document.getElementById('auth-title').textContent = I18n.t('auth.title');
      input.placeholder = I18n.t('auth.placeholder');
      btn.textContent = I18n.t('auth.submit');
    }
  }

  function showError(msg) { error.textContent = msg; }

  function lock() {
    input.disabled = true;
    btn.disabled = true;
    let remaining = LOCKOUT_SEC;
    showError(I18n.t('auth.lockout', { seconds: remaining }));
    const timer = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(timer);
        fails = 0;
        sessionStorage.setItem('auth_fails', '0');
        input.disabled = false;
        btn.disabled = false;
        showError('');
        input.focus();
      } else {
        showError(I18n.t('auth.lockout', { seconds: remaining }));
      }
    }, 1000);
  }

  function attempt() {
    const val = input.value.trim();
    if (!val) return;
    if (val === Config.SECRET_TOKEN) {
      sessionStorage.setItem('auth_ok', '1');
      sessionStorage.removeItem('auth_fails');
      overlay.classList.add('hidden');
      initApp();
    } else {
      fails++;
      sessionStorage.setItem('auth_fails', String(fails));
      input.value = '';
      if (fails >= MAX_ATTEMPTS) {
        lock();
      } else {
        const left = MAX_ATTEMPTS - fails;
        showError(I18n.t('auth.error') + ' — ' + I18n.t('auth.attemptsLeft', { n: left }));
      }
    }
  }

  applyLang();
  if (fails >= MAX_ATTEMPTS) lock();
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') attempt(); });
  btn.addEventListener('click', attempt);
  input.focus();
}

document.addEventListener('DOMContentLoaded', async () => {
  // Auth gate check
  if (sessionStorage.getItem('auth_ok') !== '1') {
    initAuthGate();
    return;
  }
  document.getElementById('auth-overlay').classList.add('hidden');
  initApp();
});

async function initApp() {
  // Language selection
  if (I18n.needsSelection()) {
    const langModal = document.getElementById('lang-modal');
    langModal.style.display = 'flex';
    await new Promise(resolve => {
      document.getElementById('lang-select-ko').addEventListener('click', () => {
        I18n.setLang('ko');
        langModal.style.display = 'none';
        resolve();
      });
      document.getElementById('lang-select-en').addEventListener('click', () => {
        I18n.setLang('en');
        langModal.style.display = 'none';
        resolve();
      });
    });
  }
  I18n.applyStatic();

  // Language toggle
  document.getElementById('lang-toggle').addEventListener('click', () => {
    changeLang(I18n.getLang() === 'ko' ? 'en' : 'ko');
  });

  await Storage.initDB();

  // Initialize SheetsAPI
  SheetsAPI.init();

  // Try to load data: Sheets first, then IndexedDB cache
  let dataLoaded = false;

  if (SheetsAPI.isConfigured()) {
    dataLoaded = await loadFromSheets();
  }

  if (!dataLoaded) {
    const cachedItems = await Storage.getAllItems();
    if (cachedItems.length > 0) {
      AppState.items = cachedItems;
      dataLoaded = true;
    }
  }

  if (dataLoaded) {
    const savedFilename = Storage.loadSession('lastUploadFilename', '');
    if (savedFilename) document.getElementById('current-filename').textContent = savedFilename;
    showDataUI();
    showToast(I18n.t('toast.restored'));
  }

  // Navigation buttons
  document.getElementById('btn-prev').addEventListener('click', goPrev);
  document.getElementById('btn-next').addEventListener('click', goNext);

  // Sheets link button
  const sheetsLinkBtn = document.getElementById('btn-sheets-link');
  if (sheetsLinkBtn) {
    sheetsLinkBtn.addEventListener('click', () => {
      if (Config.SPREADSHEET_URL) {
        window.open(Config.SPREADSHEET_URL, '_blank');
      } else {
        showToast(I18n.t('toast.noSheetsUrl'));
      }
    });
  }

  // Clear cache button
  const clearCacheBtn = document.getElementById('btn-clear-cache');
  if (clearCacheBtn) {
    clearCacheBtn.addEventListener('click', () => {
      if (!confirm(I18n.t('cache.confirmClear'))) return;
      indexedDB.deleteDatabase('AdReviewDB');
      Storage.clearSession();
      localStorage.removeItem('lastVerdict');
      showToast(I18n.t('toast.cacheCleared'));
      setTimeout(() => location.reload(), 500);
    });
  }

  // Cache help tooltip
  const cacheHelpBtn = document.getElementById('btn-cache-help');
  const cacheTooltip = document.getElementById('cache-tooltip');
  if (cacheHelpBtn && cacheTooltip) {
    cacheTooltip.textContent = I18n.t('cache.tooltip');
    cacheHelpBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      cacheTooltip.classList.toggle('show');
    });
    document.addEventListener('click', () => cacheTooltip.classList.remove('show'));
  }

  // Refresh from Sheets button
  const refreshBtn = document.getElementById('btn-refresh');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      if (!SheetsAPI.isConfigured()) {
        showToast(I18n.t('toast.notConfigured'));
        return;
      }
      const loaded = await loadFromSheets();
      if (loaded) {
        showDataUI();
        showToast(I18n.t('toast.refreshed'));
      } else {
        showToast(I18n.t('toast.refreshFail'));
      }
    });
  }

  // Copy URL button
  document.getElementById('copy-url-btn').addEventListener('click', () => {
    const item = AppState.filteredItems[AppState.currentIndex];
    if (item && item.url) {
      navigator.clipboard.writeText(item.url).then(() => showToast(I18n.t('toast.urlCopied')));
    }
  });

  // Filter change handlers
  document.getElementById('advertiser-filter').addEventListener('change', (e) => {
    AppState.currentAdvertiser = e.target.value;
    Storage.saveSession('currentAdvertiser', AppState.currentAdvertiser);
    applyFilters();
    goTo(0);
  });

  document.getElementById('status-filter').addEventListener('change', (e) => {
    AppState.currentFilter = e.target.value;
    Storage.saveSession('currentFilter', AppState.currentFilter);
    applyFilters();
    goTo(0);
  });

  // Listen for review-saved events
  document.addEventListener('review-saved', () => {
    updateProgress();
  });
}
