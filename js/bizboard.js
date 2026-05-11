/* bizboard.js - BizBoard rendering + product info panel */

const BizBoard = (() => {

  // === Local image cache (e-himart 등 느린 origin 회피) ===
  // images/url_map.json: { 원본URL: "해시.jpg" }
  let urlMap = {};
  fetch('images/url_map.json', { cache: 'no-cache' })
    .then(r => r.ok ? r.json() : {})
    .then(m => { urlMap = m || {}; })
    .catch(() => { urlMap = {}; });

  function toLocalUrl(url) {
    if (!url) return url;
    const fname = urlMap[url];
    if (!fname) return url;
    return 'images/' + fname;
  }

  // Advertiser short name mapping
  const ADV_SHORT = {
    'KR_LotteON': 'LOTTE ON',
    'KR_Lotte': 'LOTTE ON',
    'KR_Shinsegae': 'SSG.COM',
    'KR_SSG': 'SSG.COM',
    'KR_Halfclub': 'HALF CLUB',
    'KR_Emart': 'E-MART',
    'KR_Hmall': 'H MALL',
    'KR_NSMall': 'NS MALL',
    'KR_GS': 'GS SHOP',
  };

  function getShortAdvertiser(advertiser) {
    if (!advertiser) return '광고주';
    for (const [prefix, short] of Object.entries(ADV_SHORT)) {
      if (advertiser.startsWith(prefix)) return short;
    }
    const parts = advertiser.split('_');
    if (parts.length >= 2) return parts[1];
    return advertiser;
  }

  // Safely set image src, handling previous error state
  function setImage(containerId, imgId, url) {
    const container = document.querySelector('#' + containerId + ' .thumbnail-area, #' + containerId + ' .thumbnail-m')
      || document.getElementById(containerId);
    if (!container) return;

    // Always recreate img to avoid stale error state
    container.innerHTML = `<img id="${imgId}" src="" alt="썸네일">`;
    const img = container.querySelector('img');

    if (url) {
      const localUrl = toLocalUrl(url);
      img.src = localUrl;
      img.onerror = function() {
        // 로컬 캐시 실패 시 원본으로 fallback
        if (localUrl !== url) {
          img.onerror = function() {
            container.innerHTML = '<div class="img-placeholder">이미지 로드 실패</div>';
          };
          img.src = url;
          return;
        }
        container.innerHTML = '<div class="img-placeholder">이미지 로드 실패</div>';
      };
    } else {
      container.innerHTML = '<div class="img-placeholder">이미지 없음</div>';
    }
  }

  function render(item) {
    if (!item) return;

    const dspText = 'RTBHOUSE 광고입니다';

    // Desktop text
    document.getElementById('bb-main-copy').textContent = item.name || '';
    document.getElementById('bb-sub-copy').textContent = item.adCopy || '';
    document.getElementById('bb-dsp-text').textContent = dspText;

    // Desktop thumbnail
    const desktopThumbContainer = document.querySelector('#bizboard-desktop .thumbnail-area');
    if (desktopThumbContainer) {
      desktopThumbContainer.innerHTML = '<img id="bb-thumbnail" src="" alt="썸네일">';
      const img = desktopThumbContainer.querySelector('img');
      if (item.url) {
        const localUrl = toLocalUrl(item.url);
        img.src = localUrl;
        img.onerror = () => {
          if (localUrl !== item.url) {
            img.onerror = () => {
              desktopThumbContainer.innerHTML = '<div class="img-placeholder">이미지 로드 실패</div>';
            };
            img.src = item.url;
            return;
          }
          desktopThumbContainer.innerHTML = '<div class="img-placeholder">이미지 로드 실패</div>';
        };
      } else {
        desktopThumbContainer.innerHTML = '<div class="img-placeholder">이미지 없음</div>';
      }
    }

    // Mobile text
    document.getElementById('bb-main-copy-m').textContent = item.name || '';
    document.getElementById('bb-sub-copy-m').textContent = item.adCopy || '';
    document.getElementById('bb-dsp-text-m').textContent = dspText;

    // Mobile thumbnail
    const mobileThumbContainer = document.querySelector('#bizboard-mobile .thumbnail-m');
    if (mobileThumbContainer) {
      mobileThumbContainer.innerHTML = '<img id="bb-thumbnail-m" src="" alt="썸네일">';
      const imgM = mobileThumbContainer.querySelector('img');
      if (item.url) {
        const localUrlM = toLocalUrl(item.url);
        imgM.src = localUrlM;
        imgM.onerror = () => {
          if (localUrlM !== item.url) {
            imgM.onerror = () => {
              mobileThumbContainer.innerHTML = '<div class="img-placeholder">로드 실패</div>';
            };
            imgM.src = item.url;
            return;
          }
          mobileThumbContainer.innerHTML = '<div class="img-placeholder">로드 실패</div>';
        };
      } else {
        mobileThumbContainer.innerHTML = '<div class="img-placeholder">이미지 없음</div>';
      }
    }

    // Product info
    document.getElementById('info-id').textContent = item.identifier || '';
    document.getElementById('info-advertiser').textContent = item.advertiser || '';
    document.getElementById('info-name').textContent = item.name || '';
    document.getElementById('info-adcopy').textContent = item.adCopy || '';
    const urlEl = document.getElementById('info-url');
    urlEl.href = item.url || '#';
    urlEl.textContent = item.url ? (item.url.length > 50 ? item.url.substring(0, 50) + '...' : item.url) : '';

    // Preload next image
    preloadNext();
  }

  function preloadNext() {
    const end = Math.min(AppState.currentIndex + 6, AppState.filteredItems.length);
    for (let i = AppState.currentIndex + 1; i < end; i++) {
      const item = AppState.filteredItems[i];
      if (item && item.url) {
        const img = new Image();
        img.src = toLocalUrl(item.url);
      }
    }
  }

  // Listen for index changes
  document.addEventListener('index-changed', () => {
    const item = AppState.filteredItems[AppState.currentIndex];
    render(item);
    updateNavPosition();
  });

  return { render };
})();
