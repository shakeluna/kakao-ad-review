/* sheets.js - Google Sheets API via Apps Script proxy */

const SheetsAPI = (() => {
  let reviewQueue = [];
  let flushTimer = null;
  let isFlushing = false;
  let connectionStatus = 'disconnected';

  const DATA_HEADERS = [
    'advertiser', 'identifier', 'name', 'adCopy', 'url', 'char_length',
    'Claude_Final_Result', 'Claude_vertical_review_results', 'Claude_Vertical_reason',
    'Packshot', 'Claude_Packshot_Reason', 'BG_White',
    'Human_Result', 'Human_Image_Reason', 'Human_Vertical_Reason',
    'Human_Custom_Reason', 'AI_Human_Match', 'reviewed_at',
  ];

  // === Status Management ===

  function updateStatus(status) {
    connectionStatus = status;
    const el = document.getElementById('sync-status');
    if (!el) return;
    el.className = 'sync-status sync-' + status;
    const labels = {
      connected: I18n.t('sync.connected'),
      disconnected: I18n.t('sync.disconnected'),
      syncing: I18n.t('sync.syncing'),
    };
    el.textContent = labels[status] || status;
  }

  // === HTTP Communication ===

  async function requestGet(params) {
    const url = Config.APPS_SCRIPT_URL;
    if (!url) throw new Error('Apps Script URL not configured');

    const qs = new URLSearchParams({ ...params, token: Config.SECRET_TOKEN }).toString();
    const res = await fetch(url + '?' + qs, { redirect: 'follow' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  }

  async function requestPost(body) {
    const url = Config.APPS_SCRIPT_URL;
    if (!url) throw new Error('Apps Script URL not configured');

    // Use default Content-Type (text/plain) to avoid CORS preflight
    const res = await fetch(url, {
      method: 'POST',
      redirect: 'follow',
      body: JSON.stringify({ ...body, token: Config.SECRET_TOKEN }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  }

  // === Data Read ===

  async function fetchData(advertiser) {
    updateStatus('syncing');
    try {
      const params = { action: 'getData' };
      if (advertiser && advertiser !== 'ALL') params.advertiser = advertiser;
      const result = await requestGet(params);
      if (!result.success) throw new Error(result.error);
      updateStatus('connected');
      return result.data;
    } catch (e) {
      updateStatus('disconnected');
      throw e;
    }
  }

  async function getAdvertisers() {
    const result = await requestGet({ action: 'getAdvertisers' });
    if (!result.success) throw new Error(result.error);
    return result.advertisers;
  }

  // === Data Upload ===

  async function uploadData(items) {
    updateStatus('syncing');

    // Convert items to row arrays
    const rows = items.map(item =>
      DATA_HEADERS.map(h => {
        const val = item[h];
        if (val === undefined || val === null) return '';
        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
        return val;
      })
    );

    const chunkSize = Config.UPLOAD_CHUNK_SIZE;
    const totalChunks = Math.ceil(rows.length / chunkSize) || 1;

    for (let i = 0; i < totalChunks; i++) {
      const chunk = rows.slice(i * chunkSize, (i + 1) * chunkSize);
      const result = await requestPost({
        action: 'upload',
        headers: DATA_HEADERS,
        rows: chunk,
        chunkIndex: i,
        totalChunks: totalChunks,
      });
      if (!result.success) throw new Error(result.error);

      const pct = Math.round(((i + 1) / totalChunks) * 100);
      showToast(I18n.t('toast.uploading', { pct: pct }));
    }

    updateStatus('connected');
    return { success: true, total: rows.length };
  }

  // === Review Queue ===

  function queueReview(reviewData) {
    reviewQueue.push(reviewData);
    // Save to offline backup immediately
    Storage.saveOfflineReview(reviewData);
    updateQueueBadge();

    if (reviewQueue.length >= Config.BATCH_SIZE) {
      flushReviews();
    } else {
      resetFlushTimer();
    }
  }

  function resetFlushTimer() {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(flushReviews, Config.FLUSH_INTERVAL);
  }

  async function flushReviews() {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    if (reviewQueue.length === 0 || isFlushing) return;

    isFlushing = true;
    const batch = reviewQueue.splice(0, reviewQueue.length);
    updateQueueBadge();

    updateStatus('syncing');
    try {
      const result = await requestPost({ action: 'review', reviews: batch });
      if (!result.success) throw new Error(result.error);

      // Clear offline backups for successfully synced items
      await Storage.clearOfflineReviews(batch.map(r => r.identifier));
      updateStatus('connected');
    } catch (e) {
      console.error('Review flush failed:', e);
      // Items already saved in offline queue, will retry on next load
      updateStatus('disconnected');
    } finally {
      isFlushing = false;
    }

    // If more items accumulated during flush
    if (reviewQueue.length > 0) {
      resetFlushTimer();
    }
  }

  function updateQueueBadge() {
    const el = document.getElementById('queue-count');
    if (!el) return;
    const pending = reviewQueue.length;
    el.textContent = pending > 0 ? pending : '';
    el.style.display = pending > 0 ? 'inline-block' : 'none';
  }

  // === Initialization ===

  function init() {
    // Save pending reviews to IndexedDB on page unload
    window.addEventListener('beforeunload', () => {
      // Reviews are already saved individually to offline queue
      // Attempt a best-effort flush (may not complete)
      if (reviewQueue.length > 0 && Config.APPS_SCRIPT_URL) {
        const data = JSON.stringify({
          action: 'review',
          token: Config.SECRET_TOKEN,
          reviews: reviewQueue,
        });
        // sendBeacon with Blob for reliability during unload
        const blob = new Blob([data], { type: 'text/plain' });
        navigator.sendBeacon(Config.APPS_SCRIPT_URL, blob);
      }
    });

    // Retry offline queue from previous session
    retryOfflineQueue();
  }

  async function retryOfflineQueue() {
    try {
      const pending = await Storage.getOfflineReviews();
      if (pending.length > 0) {
        console.log('Retrying', pending.length, 'offline reviews');
        reviewQueue = [...pending, ...reviewQueue];
        updateQueueBadge();
        if (Config.APPS_SCRIPT_URL) {
          flushReviews();
        }
      }
    } catch (e) {
      console.error('Failed to retry offline queue:', e);
    }
  }

  function isConfigured() {
    return !!Config.APPS_SCRIPT_URL;
  }

  return {
    fetchData,
    getAdvertisers,
    uploadData,
    queueReview,
    flushReviews,
    init,
    isConfigured,
    get status() { return connectionStatus; },
    get pendingCount() { return reviewQueue.length; },
  };
})();
