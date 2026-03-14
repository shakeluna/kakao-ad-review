/* storage.js - IndexedDB (cache + offline queue) + localStorage */

const Storage = (() => {
  const DB_NAME = 'AdReviewDB';
  const DB_VERSION = 3;
  const STORE_NAME = 'reviews';
  const META_STORE = 'meta';
  const OFFLINE_STORE = 'offlineQueue';
  let db = null;

  function initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const database = e.target.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, { keyPath: 'identifier' });
          store.createIndex('advertiser', 'advertiser', { unique: false });
          store.createIndex('Human_Result', 'Human_Result', { unique: false });
        }
        if (!database.objectStoreNames.contains(META_STORE)) {
          database.createObjectStore(META_STORE, { keyPath: 'key' });
        }
        if (!database.objectStoreNames.contains(OFFLINE_STORE)) {
          database.createObjectStore(OFFLINE_STORE, { keyPath: 'identifier' });
        }
      };

      request.onsuccess = (e) => {
        db = e.target.result;
        resolve(db);
      };

      request.onerror = (e) => {
        console.error('IndexedDB open error:', e.target.error);
        reject(e.target.error);
      };
    });
  }

  // === Cache: Full dataset ===

  function saveAllItems(items) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      items.forEach(item => store.put(item));
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  function saveReview(identifier, reviewData) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(identifier);

      getReq.onsuccess = () => {
        const existing = getReq.result;
        if (existing) {
          Object.assign(existing, reviewData);
          store.put(existing);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  function getAllItems() {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  function clearDB() {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  }

  // === Offline Review Queue ===

  function saveOfflineReview(review) {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(OFFLINE_STORE, 'readwrite');
        tx.objectStore(OFFLINE_STORE).put(review);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch (e) { resolve(); }
    });
  }

  function getOfflineReviews() {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(OFFLINE_STORE, 'readonly');
        const req = tx.objectStore(OFFLINE_STORE).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch (e) { resolve([]); }
    });
  }

  function clearOfflineReviews(identifiers) {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(OFFLINE_STORE, 'readwrite');
        const store = tx.objectStore(OFFLINE_STORE);
        identifiers.forEach(id => store.delete(id));
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch (e) { resolve(); }
    });
  }

  // === localStorage helpers ===

  function saveSession(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }

  function loadSession(key, defaultValue) {
    try {
      const val = localStorage.getItem(key);
      return val !== null ? JSON.parse(val) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }

  function clearSession() {
    ['currentIndex', 'currentAdvertiser', 'currentFilter', 'lastUploadFilename'].forEach(k => {
      localStorage.removeItem(k);
    });
  }

  function getRecentReasons() {
    return loadSession('recentReasons', []);
  }

  function addRecentReason(reason) {
    if (!reason) return;
    let recent = getRecentReasons();
    recent = recent.filter(r => r !== reason);
    recent.unshift(reason);
    if (recent.length > 5) recent = recent.slice(0, 5);
    saveSession('recentReasons', recent);
  }

  return {
    initDB,
    saveAllItems,
    saveReview,
    getAllItems,
    clearDB,
    saveOfflineReview,
    getOfflineReviews,
    clearOfflineReviews,
    saveSession,
    loadSession,
    clearSession,
    getRecentReasons,
    addRecentReason,
  };
})();
