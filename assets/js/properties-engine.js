/**
 * HomeSpace Dynamic Properties Engine
 * Powers dynamic catalog rendering, real-time filtering, URL routing, and headless BaaS integration
 */

const PropertiesEngine = (() => {
  const STORAGE_KEY = 'homespace_properties_db';
  const DATA_URL = 'data/properties.json';

  // 1. Fetch properties from LocalStorage (cache/admin overrides) or JSON data
  async function loadData() {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
      const res = await fetch(DATA_URL);
      if (!res.ok) throw new Error('Failed to load JSON');
      const data = await res.json();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return data;
    } catch (err) {
      console.warn('PropertiesEngine: falling back to embedded dataset', err);
      return [];
    }
  }

  // 2. Save properties back to storage (for Admin Dashboard)
  function saveToStorage(propertiesList) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(propertiesList));
  }

  // 3. Reset storage to initial JSON
  async function resetStorage() {
    localStorage.removeItem(STORAGE_KEY);
    return await loadData();
  }

  // 4. Format price
  function formatPrice(price, status) {
    const formatted = '$' + Number(price).toLocaleString();
    return status === 'for-rent' ? `${formatted} / mo` : formatted;
  }

  // 5. Render single property card HTML
  function createPropertyCardHTML(prop) {
    const isRent = prop.status === 'for-rent';
    const statusBadge = isRent
      ? '<span class="status-badge" style="background:#09090b;color:#fff;">For Rent</span>'
      : '<span class="status-badge" style="background:#2563eb;color:#fff;">For Sale</span>';
    const featuredBadge = prop.featured
      ? '<span class="status-badge featured" style="background:#000000;color:#fff;">Featured</span>'
      : '';

    return `
      <div class="col-lg-4 col-md-6 property-card-item" data-type="${prop.type}" data-city="${(prop.city || '').toLowerCase()}" data-beds="${prop.bedrooms}" data-price="${prop.price}">
        <div class="property-item" style="border: 1px solid #e4e4e7; border-radius: 16px; overflow: hidden; background: #fff; height: 100%; display: flex; flex-direction: column;">
          <a href="property-details.html?id=${prop.id}" class="property-link">
            <div class="property-image-wrapper" style="position: relative; overflow: hidden; height: 260px;">
              <img src="${prop.mainImage}" alt="${prop.title}" class="img-fluid" style="width: 100%; height: 100%; object-fit: cover;">
              <div class="property-status" style="position: absolute; top: 15px; left: 15px; display: flex; gap: 6px; z-index: 2;">
                ${featuredBadge}
                ${statusBadge}
              </div>
              <div class="property-actions" style="position: absolute; top: 15px; right: 15px; display: flex; gap: 8px; z-index: 2;">
                <button class="action-btn favorite-btn" type="button" aria-label="Favorite"><i class="bi bi-heart"></i></button>
                <button class="action-btn share-btn" type="button" aria-label="Share"><i class="bi bi-share"></i></button>
              </div>
            </div>
          </a>

          <div class="property-details" style="padding: 24px; display: flex; flex-direction: column; flex-grow: 1;">
            <a href="property-details.html?id=${prop.id}" class="property-link" style="text-decoration: none; color: inherit;">
              <div class="property-header" style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
                <div class="property-price" style="font-size: 1.45rem; font-weight: 800; color: #000000;">
                  ${formatPrice(prop.price, prop.status)}
                </div>
                <div class="property-type text-uppercase" style="font-size: 12px; font-weight: 700; color: #2563eb; letter-spacing: 0.5px;">
                  ${prop.type}
                </div>
              </div>

              <h4 class="property-title" style="font-size: 1.15rem; font-weight: 700; color: #09090b; margin-bottom: 8px; line-height: 1.35;">
                ${prop.title}
              </h4>

              <p class="property-address" style="color: #71717a; font-size: 13.5px; margin-bottom: 16px;">
                <i class="bi bi-geo-alt" style="color: #2563eb;"></i> ${prop.address}
              </p>

              <div class="property-specs" style="display: flex; justify-content: space-between; padding-top: 14px; border-top: 1px solid #f4f4f5; color: #18181b; font-size: 13px; font-weight: 600;">
                <div class="spec-item"><i class="bi bi-house-door" style="color: #2563eb; margin-right: 4px;"></i>${prop.bedrooms} Beds</div>
                <div class="spec-item"><i class="bi bi-droplet" style="color: #2563eb; margin-right: 4px;"></i>${prop.bathrooms} Baths</div>
                <div class="spec-item"><i class="bi bi-arrows-angle-expand" style="color: #2563eb; margin-right: 4px;"></i>${prop.sqft.toLocaleString()} sqft</div>
              </div>
            </a>

            <div class="property-agent" style="display: flex; align-items: center; justify-content: space-between; padding-top: 16px; margin-top: auto; border-top: 1px solid #f4f4f5;">
              <div class="agent-info" style="display: flex; align-items: center; gap: 10px;">
                <img src="${prop.agent ? prop.agent.avatar : 'assets/img/real-estate/agent-1.webp'}" alt="${prop.agent ? prop.agent.name : 'Agent'}" class="agent-avatar" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;">
                <span class="agent-name" style="font-size: 13px; font-weight: 600; color: #09090b;">${prop.agent ? prop.agent.name : 'Agent'}</span>
              </div>
              <a href="property-details.html?id=${prop.id}" class="btn btn-sm" style="background: #2563eb; color: #fff; font-size: 12.5px; font-weight: 600; border-radius: 6px; padding: 5px 12px;">Details</a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 6. Initialize Properties Listing Page (properties.html)
  async function initPropertiesPage() {
    const gridContainer = document.querySelector('.properties-masonry .row') || document.querySelector('.properties-container .row');
    if (!gridContainer) return;

    const properties = await loadData();
    const countDisplay = document.querySelector('.results-info h5');

    // Parse URL Query Params (e.g. ?type=villa&location=beverly)
    const urlParams = new URLSearchParams(window.location.search);
    const initialLocation = urlParams.get('location') || '';
    const initialType = urlParams.get('type') || urlParams.get('property_type') || '';
    const initialBudget = urlParams.get('price') || urlParams.get('price_range') || '';
    const initialBeds = urlParams.get('bedrooms') || '';

    // Search Form Controls
    const locInput = document.querySelector('.search-field input[type="text"]');
    const typeSelect = document.querySelectorAll('.search-field select')[0];
    const priceSelect = document.querySelectorAll('.search-field select')[1];
    const bedButtons = document.querySelectorAll('.bedroom-quick .bed-btn');
    const sortSelect = document.querySelector('.sort-dropdown select');

    let currentBedFilter = 'any';

    // Populate initial form values from URL if present
    if (locInput && initialLocation) locInput.value = initialLocation;
    if (typeSelect && initialType) typeSelect.value = initialType;
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
      const typeVal = (typeSelect ? typeSelect.value.toLowerCase() : '');
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

        // Price Match
        if (priceVal && priceVal !== 'any price' && priceVal !== '') {
          if (priceVal === '$0 - $500k' || priceVal === '0-300000') {
            if (item.price > 500000) return false;
          } else if (priceVal === '$500k - $1M' || priceVal === '300000-600000') {
            if (item.price < 300000 || item.price > 1000000) return false;
          } else if (priceVal === '$1M+' || priceVal === '900000-1500000' || priceVal === '1500000+') {
            if (item.price < 900000) return false;
          }
        }

        return true;
      });

      // Sorting
      if (sortSelect) {
        const sortVal = sortSelect.value;
        if (sortVal === 'Price: Low to High') {
          filtered.sort((a, b) => a.price - b.price);
        } else if (sortVal === 'Price: High to Low') {
          filtered.sort((a, b) => b.price - a.price);
        } else if (sortVal === 'Largest Size') {
          filtered.sort((a, b) => b.sqft - a.sqft);
        }
      }

      // Render
      if (filtered.length === 0) {
        gridContainer.innerHTML = `
          <div class="col-12 text-center py-5">
            <i class="bi bi-search" style="font-size: 3rem; color: #a1a1aa;"></i>
            <h4 class="mt-3" style="font-weight: 700; color: #09090b;">No matching properties found</h4>
            <p style="color: #71717a;">Try clearing or adjusting your search filters to find available homes.</p>
            <button class="btn btn-sm btn-outline-dark reset-filters-btn mt-2" style="border-radius: 8px;">Reset All Filters</button>
          </div>
        `;
        const resetBtn = gridContainer.querySelector('.reset-filters-btn');
        if (resetBtn) {
          resetBtn.addEventListener('click', () => {
            if (locInput) locInput.value = '';
            if (typeSelect) typeSelect.selectedIndex = 0;
            if (priceSelect) priceSelect.selectedIndex = 0;
            currentBedFilter = 'any';
            bedButtons.forEach(b => b.classList.remove('active'));
            applyFilters();
          });
        }
      } else {
        gridContainer.innerHTML = filtered.map(createPropertyCardHTML).join('');
      }

      // Update count
      if (countDisplay) {
        countDisplay.textContent = `${filtered.length} Properties Found`;
      }
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
    const detailsContainer = document.querySelector('.property-details');
    if (!detailsContainer) return;

    const properties = await loadData();
    const urlParams = new URLSearchParams(window.location.search);
    const requestedId = urlParams.get('id') || 'prop-1';

    const prop = properties.find(p => p.id === requestedId) || properties[0];
    if (!prop) return;

    // 1. Update Document Title
    document.title = `${prop.title} - HomeSpace`;

    // 2. Update Breadcrumb & Header
    const pageTitleHeading = document.querySelector('.page-title h1');
    if (pageTitleHeading) pageTitleHeading.textContent = prop.title;

    // 3. Update Price & Title
    const priceDisplay = document.querySelector('.property-hero .property-price') || document.querySelector('.property-info .property-price');
    if (priceDisplay) priceDisplay.textContent = formatPrice(prop.price, prop.status);

    // 4. Update Main Slider Gallery
    const swiperWrapper = document.querySelector('.property-gallery-slider .swiper-wrapper');
    if (swiperWrapper && prop.gallery && prop.gallery.length > 0) {
      swiperWrapper.innerHTML = prop.gallery.map(imgSrc => `
        <div class="swiper-slide">
          <img src="${imgSrc}" class="img-fluid hero-image" alt="${prop.title}" style="width: 100%; height: 480px; object-fit: cover; border-radius: 12px;">
        </div>
      `).join('');
    }

    // 5. Update Address
    const addressElements = document.querySelectorAll('.property-address, .address-text');
    addressElements.forEach(el => {
      el.innerHTML = `<i class="bi bi-geo-alt" style="color: #2563eb;"></i> ${prop.address}`;
    });

    // 6. Update Specifications (Beds, Baths, Sqft, Year)
    const specItems = document.querySelectorAll('.overview-item, .spec-card');
    if (specItems.length >= 4) {
      if (specItems[0].querySelector('h4')) specItems[0].querySelector('h4').textContent = `${prop.bedrooms} Bedrooms`;
      if (specItems[1].querySelector('h4')) specItems[1].querySelector('h4').textContent = `${prop.bathrooms} Bathrooms`;
      if (specItems[2].querySelector('h4')) specItems[2].querySelector('h4').textContent = `${prop.sqft.toLocaleString()} sq ft`;
      if (specItems[3].querySelector('h4')) specItems[3].querySelector('h4').textContent = `${prop.yearBuilt || 2023}`;
    }

    // 7. Update Description
    const descPara = document.querySelector('.property-description p');
    if (descPara) {
      descPara.textContent = prop.description;
    }

    // 8. Update Features list
    const featuresList = document.querySelector('.features-list ul, .amenities-list ul');
    if (featuresList && prop.features) {
      featuresList.innerHTML = prop.features.map(f => `
        <li style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
          <i class="bi bi-check-circle-fill" style="color: #2563eb;"></i> <span>${f}</span>
        </li>
      `).join('');
    }

    // 9. Update Agent Card
    if (prop.agent) {
      const agentImg = document.querySelector('.agent-card .agent-photo, .agent-profile img');
      const agentName = document.querySelector('.agent-card .agent-info h4, .agent-name');
      const agentRole = document.querySelector('.agent-card .agent-info p, .agent-role');
      if (agentImg) agentImg.src = prop.agent.avatar;
      if (agentName) agentName.textContent = prop.agent.name;
      if (agentRole) agentRole.textContent = prop.agent.role;
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

  // Auto-run on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    initPropertiesPage();
    initPropertyDetailsPage();
    initHeroSearch();
  });

  return {
    loadData,
    saveToStorage,
    resetStorage,
    formatPrice
  };
})();
