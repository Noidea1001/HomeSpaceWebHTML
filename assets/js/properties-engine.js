/**
 * HomeSpace Dynamic Properties Engine
 * Powers dynamic catalog rendering, real-time filtering, URL routing, favorites, and live property detail hydration.
 */

const PropertiesEngine = (() => {
  const STORAGE_KEY = 'homespace_properties_db';
  const MODIFIED_FLAG_KEY = 'homespace_admin_modified';
  const FAVORITES_KEY = 'homespace_favorites';
  const DATA_URL = 'data/properties.json';

  // Helper: Escape HTML to prevent injection
  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Helper: Toast notification
  function showToast(message, isSuccess = true) {
    let toast = document.getElementById('homespace-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'homespace-toast';
      toast.style.cssText = 'position: fixed; bottom: 25px; right: 25px; z-index: 99999; padding: 12px 20px; border-radius: 10px; color: #fff; font-size: 14px; font-weight: 600; box-shadow: 0 8px 24px rgba(0,0,0,0.25); transition: opacity 0.3s ease, transform 0.3s ease; pointer-events: none; opacity: 0; transform: translateY(10px);';
      document.body.appendChild(toast);
    }
    toast.style.background = isSuccess ? '#09090b' : '#dc2626';
    toast.innerHTML = `<i class="bi ${isSuccess ? 'bi-check-circle-fill text-primary me-2' : 'bi-exclamation-circle me-2'}"></i>${escapeHTML(message)}`;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
    }, 2800);
  }

  // Favorites helpers
  function getFavorites() {
    try {
      return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
    } catch {
      return [];
    }
  }

  function isFavorited(id) {
    return getFavorites().includes(id);
  }

  function toggleFavorite(id) {
    let favs = getFavorites();
    if (favs.includes(id)) {
      favs = favs.filter(f => f !== id);
    } else {
      favs.push(id);
    }
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
    return favs.includes(id);
  }

  // 1. Fetch properties from LocalStorage if admin-modified, otherwise fetch fresh JSON
  async function loadData() {
    try {
      const hasLocalOverrides = localStorage.getItem(MODIFIED_FLAG_KEY) === 'true';
      const cached = localStorage.getItem(STORAGE_KEY);
      if (hasLocalOverrides && cached) {
        return JSON.parse(cached);
      }

      const res = await fetch(DATA_URL + '?v=' + Date.now());
      if (!res.ok) throw new Error('Failed to load JSON');
      const data = await res.json();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return data;
    } catch (err) {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) return JSON.parse(cached);
      console.warn('PropertiesEngine: falling back to empty dataset', err);
      return [];
    }
  }

  // 2. Save properties back to storage (for Admin Dashboard)
  function saveToStorage(propertiesList) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(propertiesList));
    localStorage.setItem(MODIFIED_FLAG_KEY, 'true');
  }

  // 3. Reset storage to initial JSON
  async function resetStorage() {
    localStorage.removeItem(MODIFIED_FLAG_KEY);
    localStorage.removeItem(STORAGE_KEY);
    return await loadData();
  }

  // 4. Format price
  function formatPrice(price, status) {
    const formatted = '$' + Number(price).toLocaleString();
    return status === 'for-rent' ? `${formatted} / mo` : formatted;
  }

  // 5. Render single property card HTML (Grid View)
  function createPropertyCardHTML(prop) {
    const isRent = prop.status === 'for-rent';
    const statusBadge = isRent
      ? '<span class="status-badge" style="background:#09090b;color:#fff;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:700;">For Rent</span>'
      : '<span class="status-badge" style="background:#2563eb;color:#fff;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:700;">For Sale</span>';
    const featuredBadge = prop.featured
      ? '<span class="status-badge featured" style="background:#000000;color:#fff;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:700;">Featured</span>'
      : '';
    const isFav = isFavorited(prop.id);
    const isComp = typeof CompareEngine !== 'undefined' && CompareEngine.isCompared(prop.id);

    return `
      <div class="col-lg-4 col-md-6 property-card-item" data-id="${escapeHTML(prop.id)}" data-type="${escapeHTML(prop.type)}" data-city="${escapeHTML((prop.city || '').toLowerCase())}" data-beds="${prop.bedrooms}" data-price="${prop.price}">
        <div class="property-item" style="border: 1px solid #e4e4e7; border-radius: 16px; overflow: hidden; background: #fff; height: 100%; display: flex; flex-direction: column; position: relative;">
          <div class="property-image-wrapper" style="position: relative; overflow: hidden; height: 260px;">
            <a href="property-details.html?id=${encodeURIComponent(prop.id)}" class="property-link" style="display: block; width: 100%; height: 100%;">
              <img src="${escapeHTML(prop.mainImage)}" alt="${escapeHTML(prop.title)}" class="img-fluid" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy">
            </a>
            <div class="property-status" style="position: absolute; top: 15px; left: 15px; display: flex; gap: 6px; z-index: 2; pointer-events: none;">
              ${featuredBadge}
              ${statusBadge}
            </div>
            <div class="property-actions" style="position: absolute; top: 15px; right: 15px; display: flex; gap: 8px; z-index: 3;">
              <button class="action-btn compare-btn ${isComp ? 'active' : ''}" type="button" data-id="${escapeHTML(prop.id)}" aria-label="Compare" title="${isComp ? 'Remove from compare' : 'Compare property'}" style="background: rgba(255,255,255,0.92); border: none; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.15); cursor: pointer; transition: transform 0.2s;">
                <i class="bi ${isComp ? 'bi-check-square-fill text-primary' : 'bi-bar-chart-steps'}"></i>
              </button>
              <button class="action-btn favorite-btn ${isFav ? 'active' : ''}" type="button" data-id="${escapeHTML(prop.id)}" aria-label="Favorite" title="${isFav ? 'Remove from favorites' : 'Save to favorites'}" style="background: rgba(255,255,255,0.92); border: none; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.15); cursor: pointer; transition: transform 0.2s;">
                <i class="bi ${isFav ? 'bi-heart-fill text-danger' : 'bi-heart'}"></i>
              </button>
              <button class="action-btn share-btn" type="button" data-id="${escapeHTML(prop.id)}" data-title="${escapeHTML(prop.title)}" aria-label="Share" title="Share link" style="background: rgba(255,255,255,0.92); border: none; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.15); cursor: pointer; transition: transform 0.2s;">
                <i class="bi bi-share"></i>
              </button>
            </div>
          </div>

          <div class="property-details" style="padding: 24px; display: flex; flex-direction: column; flex-grow: 1;">
            <a href="property-details.html?id=${encodeURIComponent(prop.id)}" class="property-link" style="text-decoration: none; color: inherit;">
              <div class="property-header" style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
                <div class="property-price" style="font-size: 1.45rem; font-weight: 800; color: #000000;">
                  ${formatPrice(prop.price, prop.status)}
                </div>
                <div class="property-type text-uppercase" style="font-size: 12px; font-weight: 700; color: #2563eb; letter-spacing: 0.5px;">
                  ${escapeHTML(prop.type)}
                </div>
              </div>

              <h4 class="property-title" style="font-size: 1.15rem; font-weight: 700; color: #09090b; margin-bottom: 8px; line-height: 1.35;">
                ${escapeHTML(prop.title)}
              </h4>

              <p class="property-address" style="color: #71717a; font-size: 13.5px; margin-bottom: 16px;">
                <i class="bi bi-geo-alt" style="color: #2563eb;"></i> ${escapeHTML(prop.address)}
              </p>

              <div class="property-specs" style="display: flex; justify-content: space-between; padding-top: 14px; border-top: 1px solid #f4f4f5; color: #18181b; font-size: 13px; font-weight: 600;">
                <div class="spec-item"><i class="bi bi-house-door" style="color: #2563eb; margin-right: 4px;"></i>${prop.bedrooms} Beds</div>
                <div class="spec-item"><i class="bi bi-droplet" style="color: #2563eb; margin-right: 4px;"></i>${prop.bathrooms} Baths</div>
                <div class="spec-item"><i class="bi bi-arrows-angle-expand" style="color: #2563eb; margin-right: 4px;"></i>${Number(prop.sqft).toLocaleString()} sqft</div>
              </div>
            </a>

            <div class="property-agent" style="display: flex; align-items: center; justify-content: space-between; padding-top: 16px; margin-top: auto; border-top: 1px solid #f4f4f5;">
              <div class="agent-info" style="display: flex; align-items: center; gap: 10px;">
                <img src="${escapeHTML(prop.agent ? prop.agent.avatar : 'assets/img/real-estate/agent-1.webp')}" alt="${escapeHTML(prop.agent ? prop.agent.name : 'Agent')}" class="agent-avatar" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;" loading="lazy">
                <span class="agent-name" style="font-size: 13px; font-weight: 600; color: #09090b;">${escapeHTML(prop.agent ? prop.agent.name : 'Agent')}</span>
              </div>
              <a href="property-details.html?id=${encodeURIComponent(prop.id)}" class="btn btn-sm" style="background: #2563eb; color: #fff; font-size: 12.5px; font-weight: 600; border-radius: 6px; padding: 5px 14px;">Details</a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 5b. Render single property item HTML (List / Rows View)
  function createPropertyRowHTML(prop) {
    const isRent = prop.status === 'for-rent';
    const statusBadge = isRent
      ? '<span class="status-badge" style="background:#09090b;color:#fff;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:700;">For Rent</span>'
      : '<span class="status-badge" style="background:#2563eb;color:#fff;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:700;">For Sale</span>';
    const isFav = isFavorited(prop.id);

    return `
      <div class="col-12 property-row-item mb-4" data-id="${escapeHTML(prop.id)}">
        <div class="property-item" style="border: 1px solid #e4e4e7; border-radius: 16px; overflow: hidden; background: #fff; padding: 18px; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
          <div class="row align-items-center g-4">
            <div class="col-lg-4 col-md-5">
              <div style="position: relative; height: 210px; border-radius: 12px; overflow: hidden;">
                <a href="property-details.html?id=${encodeURIComponent(prop.id)}">
                  <img src="${escapeHTML(prop.mainImage)}" alt="${escapeHTML(prop.title)}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy">
                </a>
                <div style="position: absolute; top: 12px; left: 12px; pointer-events: none;">
                  ${statusBadge}
                </div>
              </div>
            </div>
            <div class="col-lg-8 col-md-7">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <span class="badge text-uppercase mb-1" style="background: rgba(37,99,235,0.1); color: #2563eb; font-weight: 700; font-size: 11px; padding: 4px 8px; border-radius: 4px;">${escapeHTML(prop.type)}</span>
                  <h4 style="font-weight: 800; font-size: 1.25rem; margin-bottom: 4px;">
                    <a href="property-details.html?id=${encodeURIComponent(prop.id)}" style="color: #09090b; text-decoration: none;">${escapeHTML(prop.title)}</a>
                  </h4>
                  <p class="text-muted small mb-3"><i class="bi bi-geo-alt text-primary"></i> ${escapeHTML(prop.address)}</p>
                </div>
                <div class="text-end">
                  <div style="font-size: 1.45rem; font-weight: 800; color: #000;">${formatPrice(prop.price, prop.status)}</div>
                </div>
              </div>
              <div class="d-flex flex-wrap gap-4 py-2 border-top border-bottom small text-muted mb-3">
                <span><i class="bi bi-house-door text-primary"></i> <strong>${prop.bedrooms}</strong> Beds</span>
                <span><i class="bi bi-droplet text-primary"></i> <strong>${prop.bathrooms}</strong> Baths</span>
                <span><i class="bi bi-arrows-angle-expand text-primary"></i> <strong>${Number(prop.sqft).toLocaleString()}</strong> sqft</span>
                <span><i class="bi bi-calendar3 text-primary"></i> Built <strong>${prop.yearBuilt || 2024}</strong></span>
              </div>
              <div class="d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center gap-2">
                  <img src="${escapeHTML(prop.agent ? prop.agent.avatar : 'assets/img/real-estate/agent-1.webp')}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" loading="lazy">
                  <span class="small font-weight-bold" style="color: #09090b;">${escapeHTML(prop.agent ? prop.agent.name : 'HomeSpace Advisor')}</span>
                </div>
                <div class="d-flex gap-2">
                  <button class="btn btn-sm btn-outline-primary compare-btn ${isComp ? 'active' : ''}" data-id="${escapeHTML(prop.id)}" title="${isComp ? 'Remove from compare' : 'Compare'}"><i class="bi ${isComp ? 'bi-check-square-fill' : 'bi-bar-chart-steps'}"></i> Compare</button>
                  <button class="btn btn-sm btn-outline-dark favorite-btn ${isFav ? 'active' : ''}" data-id="${escapeHTML(prop.id)}" title="Save"><i class="bi ${isFav ? 'bi-heart-fill text-danger' : 'bi-heart'}"></i></button>
                  <a href="property-details.html?id=${encodeURIComponent(prop.id)}" class="btn btn-sm btn-primary" style="background:#2563eb; border:none; padding: 6px 16px; border-radius: 8px; font-weight: 600;">View Details</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 6. Initialize Properties Listing Page (properties.html)
  async function initPropertiesPage() {
    const masonryContainer = document.querySelector('.properties-masonry .row');
    const rowsContainer = document.querySelector('.properties-rows .row');
    if (!masonryContainer && !rowsContainer) return;

    const properties = await loadData();
    const countDisplay = document.querySelector('.results-info h5');
    const resultsSub = document.querySelector('.results-info p');
    const paginationWrapper = document.querySelector('.pagination-wrapper');

    // Parse URL Query Params
    const urlParams = new URLSearchParams(window.location.search);
    const initialLocation = urlParams.get('location') || '';
    const initialType = (urlParams.get('type') || urlParams.get('property_type') || '').toLowerCase();
    const initialBudget = urlParams.get('price') || urlParams.get('price_range') || '';
    const initialBeds = urlParams.get('bedrooms') || '';

    // Search Form Controls
    const locInput = document.querySelector('.search-field input[type="text"]');
    const typeSelect = document.querySelectorAll('.search-field select')[0];
    const priceSelect = document.querySelectorAll('.search-field select')[1];
    const bedButtons = document.querySelectorAll('.bedroom-quick .bed-btn');
    const sortSelect = document.querySelector('.sort-dropdown select');
    const viewButtons = document.querySelectorAll('.view-toggle .view-btn');

    let currentBedFilter = 'any';
    let currentView = 'masonry';

    // Populate initial form values from URL if present
    if (locInput && initialLocation) locInput.value = initialLocation;
    if (typeSelect && initialType) {
      for (let i = 0; i < typeSelect.options.length; i++) {
        if (typeSelect.options[i].value.toLowerCase() === initialType ||
            typeSelect.options[i].text.toLowerCase() === initialType) {
          typeSelect.selectedIndex = i;
          break;
        }
      }
    }
    if (priceSelect && initialBudget) {
      for (let i = 0; i < priceSelect.options.length; i++) {
        const optVal = priceSelect.options[i].value;
        const optText = priceSelect.options[i].text.toLowerCase();
        if (optVal === initialBudget || optText.includes(initialBudget)) {
          priceSelect.selectedIndex = i;
          break;
        }
      }
    }
    if (initialBeds && initialBeds !== 'any') {
      currentBedFilter = initialBeds;
      bedButtons.forEach(b => {
        if (b.getAttribute('data-beds') === initialBeds) b.classList.add('active');
        else b.classList.remove('active');
      });
    }

    // Filter Logic
    function applyFilters() {
      const locQuery = (locInput ? locInput.value.trim().toLowerCase() : '');
      const typeVal = (typeSelect ? (typeSelect.value || typeSelect.options[typeSelect.selectedIndex]?.text || '').toLowerCase() : '');
      const priceVal = (priceSelect ? priceSelect.value : '');

      let filtered = properties.filter(item => {
        // Location Match
        if (locQuery) {
          const matchLoc = (item.city || '').toLowerCase().includes(locQuery) ||
                           (item.address || '').toLowerCase().includes(locQuery) ||
                           (item.title || '').toLowerCase().includes(locQuery);
          if (!matchLoc) return false;
        }

        // Type Match
        if (typeVal && typeVal !== 'any type' && typeVal !== '') {
          if (item.type.toLowerCase() !== typeVal) return false;
        }

        // Bedroom Match
        if (currentBedFilter !== 'any') {
          const minBeds = parseInt(currentBedFilter, 10);
          if (item.bedrooms < minBeds) return false;
        }

        // Price Match (supports both label strings & range strings)
        if (priceVal && priceVal !== 'any price' && priceVal !== '') {
          if (priceVal === '$0 - $500k' || priceVal === '0-300000' || priceVal === '0-500000') {
            if (item.price > 500000) return false;
          } else if (priceVal === '$500k - $1M' || priceVal === '300000-600000' || priceVal === '500000-1000000') {
            if (item.price < 300000 || item.price > 1000000) return false;
          } else if (priceVal === '600000-900000') {
            if (item.price < 600000 || item.price > 900000) return false;
          } else if (priceVal === '$1M+' || priceVal === '900000-1500000' || priceVal === '1500000+' || priceVal === '1000000+') {
            if (item.price < 900000) return false;
          }
        }

        return true;
      });

      // Sorting
      if (sortSelect) {
        const sortVal = sortSelect.value;
        if (sortVal.includes('Low to High')) {
          filtered.sort((a, b) => a.price - b.price);
        } else if (sortVal.includes('High to Low')) {
          filtered.sort((a, b) => b.price - a.price);
        } else if (sortVal.includes('Largest')) {
          filtered.sort((a, b) => b.sqft - a.sqft);
        } else if (sortVal.includes('Newest')) {
          filtered.sort((a, b) => (b.yearBuilt || 2024) - (a.yearBuilt || 2024));
        }
      }

      // Render Empty State
      if (filtered.length === 0) {
        const emptyHTML = `
          <div class="col-12 text-center py-5">
            <i class="bi bi-search" style="font-size: 3rem; color: #a1a1aa;"></i>
            <h4 class="mt-3" style="font-weight: 700; color: #09090b;">No matching properties found</h4>
            <p style="color: #71717a;">Try clearing or adjusting your search filters to find available homes.</p>
            <button class="btn btn-sm btn-outline-dark reset-filters-btn mt-2" style="border-radius: 8px;">Reset All Filters</button>
          </div>
        `;
        if (masonryContainer) masonryContainer.innerHTML = emptyHTML;
        if (rowsContainer) rowsContainer.innerHTML = emptyHTML;

        document.querySelectorAll('.reset-filters-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            if (locInput) locInput.value = '';
            if (typeSelect) typeSelect.selectedIndex = 0;
            if (priceSelect) priceSelect.selectedIndex = 0;
            currentBedFilter = 'any';
            bedButtons.forEach(b => b.classList.remove('active'));
            applyFilters();
          });
        });
      } else {
        if (masonryContainer) {
          masonryContainer.innerHTML = filtered.map(createPropertyCardHTML).join('');
        }
        if (rowsContainer) {
          rowsContainer.innerHTML = filtered.map(createPropertyRowHTML).join('');
        }
      }

      // Update count & subtext
      if (countDisplay) {
        countDisplay.textContent = `${filtered.length} Properties Found`;
      }
      if (resultsSub) {
        resultsSub.textContent = locQuery
          ? `Filtered by "${locQuery}"`
          : 'Showing verified luxury listings across all districts';
      }
      if (paginationWrapper) {
        paginationWrapper.style.display = filtered.length > 0 ? 'block' : 'none';
        const pageInfo = paginationWrapper.querySelector('.pagination-info p');
        if (pageInfo) {
          pageInfo.innerHTML = `Showing <strong>1-${filtered.length}</strong> of <strong>${filtered.length}</strong> properties`;
        }
      }

      // Update interactive map if active or available
      if (window.HomeSpaceMap) {
        window.HomeSpaceMap.updateMarkers(filtered);
      }
    }

    // View Toggle (Masonry vs Rows vs Map)
    if (viewButtons.length > 0) {
      viewButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          viewButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentView = btn.getAttribute('data-view');

          const masonryEl = document.querySelector('.properties-masonry');
          const rowsEl = document.querySelector('.properties-rows');
          const mapEl = document.querySelector('.properties-map-view');

          if (currentView === 'rows') {
            if (masonryEl) masonryEl.style.display = 'none';
            if (rowsEl) rowsEl.style.display = 'block';
            if (mapEl) mapEl.style.display = 'none';
          } else if (currentView === 'map') {
            if (masonryEl) masonryEl.style.display = 'none';
            if (rowsEl) rowsEl.style.display = 'none';
            if (mapEl) {
              mapEl.style.display = 'block';
              if (window.HomeSpaceMap) {
                window.HomeSpaceMap.initPropertiesMap('properties-map', properties);
                window.HomeSpaceMap.invalidateSize();
              }
            }
          } else {
            if (masonryEl) masonryEl.style.display = 'block';
            if (rowsEl) rowsEl.style.display = 'none';
            if (mapEl) mapEl.style.display = 'none';
          }
        });
      });
    }

    // Attach Event Listeners
    if (locInput) locInput.addEventListener('input', applyFilters);
    if (typeSelect) typeSelect.addEventListener('change', applyFilters);
    if (priceSelect) priceSelect.addEventListener('change', applyFilters);
    if (sortSelect) sortSelect.addEventListener('change', applyFilters);

    bedButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        bedButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentBedFilter = btn.getAttribute('data-beds');
        applyFilters();
      });
    });

    const searchSubmitBtn = document.querySelector('.search-bar .search-btn');
    if (searchSubmitBtn) {
      searchSubmitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        applyFilters();
      });
    }

    // Initial render
    applyFilters();
  }

  // 7. Initialize Property Details Page (property-details.html)
  async function initPropertyDetailsPage() {
    const detailsContainer = document.querySelector('.property-details') || document.querySelector('.property-details-page');
    if (!detailsContainer) return;

    const properties = await loadData();
    const urlParams = new URLSearchParams(window.location.search);
    const requestedId = urlParams.get('id') || 'prop-1';

    const prop = properties.find(p => p.id === requestedId) || properties[0];
    if (!prop) return;

    // 1. Update Document Title & Breadcrumbs
    document.title = `${prop.title} - HomeSpace Real Estate`;
    const pageTitleHeading = document.querySelector('.page-title h1');
    if (pageTitleHeading) pageTitleHeading.textContent = prop.title;
    const breadcrumbCurrent = document.querySelector('.breadcrumbs li.current');
    if (breadcrumbCurrent) breadcrumbCurrent.textContent = prop.title;

    // 2. Update Main Title & Meta Header
    const titleEl = document.querySelector('.property-header .property-title') || document.querySelector('.property-info h1');
    if (titleEl) titleEl.textContent = prop.title;

    const addressEl = document.querySelector('.property-meta .address');
    if (addressEl) addressEl.innerHTML = `<i class="bi bi-geo-alt"></i> ${escapeHTML(prop.address)}`;

    const listingIdEl = document.querySelector('.property-meta .listing-id');
    if (listingIdEl) listingIdEl.textContent = `ID: #${escapeHTML(prop.id).toUpperCase()}`;

    // 3. Update Price & Deposit Breakdown
    const mainPriceEl = document.querySelector('.pricing-section .main-price');
    if (mainPriceEl) {
      mainPriceEl.innerHTML = prop.status === 'for-rent'
        ? `$${Number(prop.price).toLocaleString()}<span class="period">/month</span>`
        : `$${Number(prop.price).toLocaleString()}`;
    }

    const depositEl = document.querySelector('.price-breakdown .deposit');
    if (depositEl) {
      depositEl.textContent = prop.status === 'for-rent'
        ? `Security Deposit: $${(Number(prop.price) * 2).toLocaleString()}`
        : `Estimated Down Payment (20%): $${(Number(prop.price) * 0.2).toLocaleString()}`;
    }

    const availableEl = document.querySelector('.price-breakdown .available');
    if (availableEl) {
      availableEl.textContent = prop.status === 'for-rent' ? 'Available Now for Move-in' : 'Ready for Immediate Closing';
    }

    // 4. Update Quick Stat Cards
    const statCards = document.querySelectorAll('.stat-grid .stat-card');
    if (statCards.length >= 5) {
      // 1: Bedrooms
      const bedNum = statCards[0].querySelector('.stat-number');
      if (bedNum) bedNum.textContent = prop.bedrooms;

      // 2: Bathrooms
      const bathNum = statCards[1].querySelector('.stat-number');
      if (bathNum) bathNum.textContent = prop.bathrooms;

      // 3: Sq Ft
      const sqftNum = statCards[2].querySelector('.stat-number');
      if (sqftNum) sqftNum.textContent = Number(prop.sqft).toLocaleString();

      // 4: Property Type
      const typeNum = statCards[3].querySelector('.stat-number');
      const typeLabel = statCards[3].querySelector('.stat-label');
      if (typeNum) typeNum.textContent = prop.type.charAt(0).toUpperCase() + prop.type.slice(1);
      if (typeLabel) typeLabel.textContent = 'Property Type';

      // 5: Year Built
      const yearNum = statCards[4].querySelector('.stat-number');
      const yearLabel = statCards[4].querySelector('.stat-label');
      if (yearNum) yearNum.textContent = prop.yearBuilt || 2024;
      if (yearLabel) yearLabel.textContent = 'Year Built';
    }

    // 5. Update Sliders (Main & Thumbnails)
    const gallery = (prop.gallery && prop.gallery.length > 0) ? prop.gallery : [prop.mainImage];
    const mainSlider = document.querySelector('.property-gallery-slider .swiper-wrapper');
    if (mainSlider) {
      mainSlider.innerHTML = gallery.map((imgSrc, idx) => `
        <div class="swiper-slide">
          <img src="${escapeHTML(imgSrc)}" class="img-fluid hero-image" alt="${escapeHTML(prop.title)} - Photo ${idx + 1}" style="width: 100%; height: 480px; object-fit: cover; border-radius: 12px;">
          ${idx === 0 ? `
            <div class="hero-overlay">
              <div class="property-badge">
                <span class="status-badge ${prop.status === 'for-rent' ? 'for-rent' : 'for-sale'}">${prop.status === 'for-rent' ? 'For Rent' : 'For Sale'}</span>
                ${prop.featured ? '<span class="featured-badge" style="background:#000;color:#fff;">Featured</span>' : ''}
              </div>
            </div>` : ''}
        </div>
      `).join('');
    }

    const thumbSlider = document.querySelector('.property-thumbnails-slider .swiper-wrapper');
    if (thumbSlider) {
      thumbSlider.innerHTML = gallery.map((imgSrc, idx) => `
        <div class="swiper-slide">
          <img src="${escapeHTML(imgSrc)}" class="img-fluid thumbnail-img" alt="${escapeHTML(prop.title)} - Thumbnail ${idx + 1}">
        </div>
      `).join('');
    }

    // 6. Update Description
    const descEl = document.querySelector('.property-details p');
    if (descEl && prop.description) {
      descEl.textContent = prop.description;
    }

    // 7. Update Features / Amenities List
    const featureLists = document.querySelectorAll('.features-grid .feature-list');
    if (featureLists.length >= 2 && Array.isArray(prop.features) && prop.features.length > 0) {
      const mid = Math.ceil(prop.features.length / 2);
      const col1 = prop.features.slice(0, mid);
      const col2 = prop.features.slice(mid);

      featureLists[0].innerHTML = col1.map(f => `<li><i class="bi bi-check2"></i> ${escapeHTML(f)}</li>`).join('');
      featureLists[1].innerHTML = col2.map(f => `<li><i class="bi bi-check2"></i> ${escapeHTML(f)}</li>`).join('');
    }

    // 8. Update Agent Card & Contacts
    if (prop.agent) {
      const agentPhoto = document.querySelector('.agent-card .agent-avatar img');
      if (agentPhoto && prop.agent.avatar) agentPhoto.src = prop.agent.avatar;
      const agentName = document.querySelector('.agent-card .agent-info h4');
      if (agentName) agentName.textContent = prop.agent.name;
      const agentRole = document.querySelector('.agent-card .agent-info .agent-role');
      if (agentRole) agentRole.textContent = prop.agent.role;

      const contactItems = document.querySelectorAll('.agent-card .agent-contact .contact-item');
      if (contactItems.length >= 2) {
        if (prop.agent.phone) contactItems[0].querySelector('span').textContent = prop.agent.phone;
        if (prop.agent.email) contactItems[1].querySelector('span').textContent = prop.agent.email;
      }

      // Update call buttons
      const callBtn = document.querySelector('.agent-actions .btn-success');
      if (callBtn && prop.agent.phone) {
        callBtn.onclick = () => window.location.href = `tel:${prop.agent.phone.replace(/[^0-9+]/g, '')}`;
      }
    }

    // 9. Update Rental / Purchase Calculator
    const calcTitle = document.querySelector('.calculator-card h4');
    const costItems = document.querySelectorAll('.calculator-content .cost-item');
    const totalVal = document.querySelector('.calculator-content .total-value');
    const totalLabel = document.querySelector('.calculator-content .total-label');
    if (costItems.length >= 4 && totalVal) {
      if (prop.status === 'for-rent') {
        if (calcTitle) calcTitle.textContent = 'Monthly Rental Cost Breakdown';
        costItems[0].querySelector('.cost-label').textContent = 'Monthly Rent';
        costItems[0].querySelector('.cost-value').textContent = `$${Number(prop.price).toLocaleString()}`;
        costItems[1].querySelector('.cost-label').textContent = 'Utilities (estimated)';
        costItems[1].querySelector('.cost-value').textContent = '$180';
        costItems[2].querySelector('.cost-label').textContent = 'Parking';
        costItems[2].querySelector('.cost-value').textContent = '$200';
        costItems[3].querySelector('.cost-label').textContent = 'Insurance & Fees';
        costItems[3].querySelector('.cost-value').textContent = '$50';
        if (totalLabel) totalLabel.textContent = 'Total Monthly Estimate';
        totalVal.textContent = `$${(Number(prop.price) + 430).toLocaleString()}`;
      } else {
        if (calcTitle) calcTitle.textContent = 'Estimated Monthly Ownership Cost';
        const loanAmount = prop.price * 0.8;
        const monthlyMortgage = Math.round(loanAmount * (0.065 / 12) / (1 - Math.pow(1 + 0.065 / 12, -360)));
        const monthlyTax = Math.round((prop.price * 0.012) / 12);
        const monthlyIns = Math.round((prop.price * 0.0035) / 12);
        const hoa = 150;
        costItems[0].querySelector('.cost-label').textContent = 'Principal & Interest (80% LTV)';
        costItems[0].querySelector('.cost-value').textContent = `$${monthlyMortgage.toLocaleString()}`;
        costItems[1].querySelector('.cost-label').textContent = 'Property Taxes (est)';
        costItems[1].querySelector('.cost-value').textContent = `$${monthlyTax.toLocaleString()}`;
        costItems[2].querySelector('.cost-label').textContent = 'Homeowners Insurance';
        costItems[2].querySelector('.cost-value').textContent = `$${monthlyIns.toLocaleString()}`;
        costItems[3].querySelector('.cost-label').textContent = 'HOA / Maintenance';
        costItems[3].querySelector('.cost-value').textContent = `$${hoa.toLocaleString()}`;
        if (totalLabel) totalLabel.textContent = 'Total Estimated Monthly';
        totalVal.textContent = `$${(monthlyMortgage + monthlyTax + monthlyIns + hoa).toLocaleString()}`;
      }
    }

    // 10. Update Quick Actions (Save / Share)
    const saveBtn = document.querySelector('.actions-card button:has(.bi-heart), .actions-card .btn-outline-primary:nth-child(1)');
    if (saveBtn) {
      saveBtn.classList.add('favorite-btn');
      saveBtn.setAttribute('data-id', prop.id);
      if (isFavorited(prop.id)) {
        saveBtn.innerHTML = '<i class="bi bi-heart-fill text-danger"></i> Saved';
      }
    }
    const shareBtn = document.querySelector('.actions-card button:has(.bi-share), .actions-card .btn-outline-primary:nth-child(2)');
    if (shareBtn) {
      shareBtn.classList.add('share-btn');
      shareBtn.setAttribute('data-id', prop.id);
    }

    // 11. Update Interactive Neighborhood Map
    if (window.HomeSpaceMap && document.getElementById('property-detail-map')) {
      window.HomeSpaceMap.initDetailMap('property-detail-map', prop);
    }
  }

  // 8. Connect Hero Search Form on Index.html to Properties Catalog
  function initHeroSearch() {
    const heroForm = document.querySelector('.property-search-form');
    if (!heroForm) return;

    heroForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const loc = heroForm.querySelector('input[name="location"]')?.value || '';
      const type = heroForm.querySelector('select[name="property_type"]')?.value || '';
      const price = heroForm.querySelector('select[name="price_range"]')?.value || '';
      const rooms = heroForm.querySelector('select[name="bedrooms"]')?.value || '';

      const params = new URLSearchParams();
      if (loc) params.set('location', loc);
      if (type) params.set('type', type);
      if (price) params.set('price', price);
      if (rooms) params.set('bedrooms', rooms);

      window.location.href = `properties.html?${params.toString()}`;
    });
  }

  // 9. Hydrate Featured Properties Section on Index.html
  async function initFeaturedProperties() {
    const featuredSection = document.getElementById('featured-properties');
    if (!featuredSection) return;

    const properties = await loadData();
    const featured = properties.filter(p => p.featured);
    if (!featured || featured.length === 0) return;

    const mainProp = featured[0];
    const sideProps = featured.slice(1, 3);

    const mainContainer = featuredSection.querySelector('.featured-property-main');
    if (mainContainer && mainProp) {
      mainContainer.innerHTML = `
        <div class="property-hero" style="position: relative; overflow: hidden; border-radius: 16px 16px 0 0; max-height: 420px;">
          <img src="${escapeHTML(mainProp.mainImage)}" alt="${escapeHTML(mainProp.title)}" class="img-fluid" style="width: 100%; height: 420px; object-fit: cover;" loading="lazy">
          <div class="property-overlay" style="position: absolute; bottom: 0; left: 0; right: 0; padding: 24px; background: linear-gradient(transparent, rgba(0,0,0,0.88));">
            <div class="property-badge-main premium" style="display: inline-block; background: #000; color: #fff; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 6px; margin-bottom: 8px;">Featured Premium</div>
            <div class="property-stats" style="display: flex; gap: 20px; color: #fff; font-size: 14px; font-weight: 600;">
              <div class="stat-item"><i class="bi bi-house-door"></i> ${mainProp.bedrooms} Bedrooms</div>
              <div class="stat-item"><i class="bi bi-droplet-fill"></i> ${mainProp.bathrooms} Bathrooms</div>
              <div class="stat-item"><i class="bi bi-arrows-move"></i> ${Number(mainProp.sqft).toLocaleString()} sq ft</div>
            </div>
          </div>
        </div>
        <div class="property-hero-content" style="padding: 28px; background: #fff; border: 1px solid #e4e4e7; border-top: none; border-radius: 0 0 16px 16px;">
          <div class="property-header" style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px;">
            <div class="property-info">
              <h2 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 6px;"><a href="property-details.html?id=${encodeURIComponent(mainProp.id)}" style="color: #000; text-decoration: none;">${escapeHTML(mainProp.title)}</a></h2>
              <div class="property-address" style="color: #71717a; font-size: 14px;"><i class="bi bi-geo-alt-fill text-primary"></i> ${escapeHTML(mainProp.address)}</div>
            </div>
            <div class="property-price-main" style="font-size: 1.8rem; font-weight: 800; color: #2563eb;">${formatPrice(mainProp.price, mainProp.status)}</div>
          </div>
          <p class="property-description" style="color: #52525b; line-height: 1.6; margin-bottom: 20px;">${escapeHTML(mainProp.description)}</p>
          <div class="property-actions-main" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: gap;">
            <div class="d-flex gap-2">
              <a href="property-details.html?id=${encodeURIComponent(mainProp.id)}" class="btn btn-primary" style="background: #2563eb; border: none; padding: 10px 24px; border-radius: 8px; font-weight: 600;">Explore Residence</a>
              <a href="properties.html" class="btn btn-outline-dark" style="padding: 10px 20px; border-radius: 8px; font-weight: 600;">View All Properties</a>
            </div>
            <div class="property-listing-info text-muted small">
              <span class="badge" style="background: ${mainProp.status === 'for-rent' ? '#09090b' : '#2563eb'}; color: #fff; font-size: 12px; padding: 6px 10px;">${mainProp.status === 'for-rent' ? 'For Rent' : 'For Sale'}</span>
            </div>
          </div>
        </div>
      `;
    }

    const sideContainer = featuredSection.querySelector('.properties-sidebar');
    if (sideContainer && sideProps.length > 0) {
      sideContainer.innerHTML = sideProps.map(item => `
        <div class="sidebar-property-card mb-4" style="border: 1px solid #e4e4e7; border-radius: 14px; overflow: hidden; background: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
          <div class="sidebar-property-image" style="position: relative; height: 180px; overflow: hidden;">
            <a href="property-details.html?id=${encodeURIComponent(item.id)}">
              <img src="${escapeHTML(item.mainImage)}" alt="${escapeHTML(item.title)}" class="img-fluid" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy">
            </a>
            <div class="sidebar-property-badge" style="position: absolute; top: 10px; left: 10px; background: #000; color: #fff; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 4px;">Featured</div>
          </div>
          <div class="sidebar-property-content" style="padding: 18px;">
            <h4 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 6px;"><a href="property-details.html?id=${encodeURIComponent(item.id)}" style="color: #000; text-decoration: none;">${escapeHTML(item.title)}</a></h4>
            <div class="sidebar-location text-muted small mb-2"><i class="bi bi-geo-alt text-primary"></i> ${escapeHTML(item.city || item.address)}</div>
            <div class="sidebar-specs d-flex gap-3 small text-muted mb-3">
              <span><i class="bi bi-house"></i> ${item.bedrooms} BR</span>
              <span><i class="bi bi-droplet"></i> ${item.bathrooms} BA</span>
              <span><i class="bi bi-rulers"></i> ${Number(item.sqft).toLocaleString()} sqft</span>
            </div>
            <div class="sidebar-price-row d-flex justify-content-between align-items-center">
              <div class="sidebar-price font-weight-bold" style="font-size: 1.25rem; font-weight: 800; color: #000;">${formatPrice(item.price, item.status)}</div>
              <a href="property-details.html?id=${encodeURIComponent(item.id)}" class="btn btn-sm btn-primary" style="background: #2563eb; border: none; border-radius: 6px; padding: 4px 14px; font-weight: 600;">View</a>
            </div>
          </div>
        </div>
      `).join('');
    }
  }

  // 10. Global Event Delegation for Interactive Buttons (Favorites & Share)
  document.addEventListener('click', (e) => {
    const favBtn = e.target.closest('.favorite-btn');
    if (favBtn) {
      e.preventDefault();
      e.stopPropagation();
      const id = favBtn.getAttribute('data-id');
      if (!id) return;
      const isNowFav = toggleFavorite(id);
      document.querySelectorAll(`.favorite-btn[data-id="${id}"]`).forEach(btn => {
        btn.classList.toggle('active', isNowFav);
        const icon = btn.querySelector('i');
        if (icon) {
          icon.className = isNowFav ? 'bi bi-heart-fill text-danger' : 'bi bi-heart';
        }
      });
      showToast(isNowFav ? 'Saved to your favorites' : 'Removed from favorites');
      return;
    }

    const shareBtn = e.target.closest('.share-btn');
    if (shareBtn) {
      e.preventDefault();
      e.stopPropagation();
      const id = shareBtn.getAttribute('data-id');
      const shareUrl = `${window.location.origin}${window.location.pathname.replace(/[^/]*$/, '')}property-details.html?id=${encodeURIComponent(id)}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl).then(() => {
          showToast('Property link copied to clipboard!');
        }).catch(() => {
          showToast('Link copied: ' + shareUrl);
        });
      } else {
        showToast('Link: ' + shareUrl);
      }
      return;
    }
  });

  // Auto-run on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    initPropertiesPage();
    initPropertyDetailsPage();
    initHeroSearch();
    initFeaturedProperties();
  });

  return {
    loadData,
    saveToStorage,
    resetStorage,
    formatPrice,
    getFavorites,
    isFavorited,
    toggleFavorite,
    escapeHTML,
    showToast
  };
})();
