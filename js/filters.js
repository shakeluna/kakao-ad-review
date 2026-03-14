/* filters.js - Advertiser + review status filtering */

const Filters = (() => {

  function populateAdvertiserDropdown() {
    const select = document.getElementById('advertiser-filter');
    const advertisers = [...new Set(AppState.items.map(i => i.advertiser).filter(Boolean))];
    advertisers.sort();

    // Keep the ALL option, remove old dynamic options
    while (select.options.length > 1) select.remove(1);

    advertisers.forEach(adv => {
      const opt = document.createElement('option');
      opt.value = adv;
      opt.textContent = adv;
      select.appendChild(opt);
    });
  }

  function applyFilters() {
    let items = AppState.items;

    // Advertiser filter
    if (AppState.currentAdvertiser !== 'ALL') {
      items = items.filter(i => i.advertiser === AppState.currentAdvertiser);
    }

    // Status filter
    switch (AppState.currentFilter) {
      case 'unreviewed':
        items = items.filter(i => !i.Human_Result);
        break;
      case 'pass':
        items = items.filter(i => i.Human_Result === 'Pass');
        break;
      case 'fail':
        items = items.filter(i => i.Human_Result === 'Fail');
        break;
      // 'all' - no filter
    }

    AppState.filteredItems = items;
  }

  return { populateAdvertiserDropdown, applyFilters };
})();
