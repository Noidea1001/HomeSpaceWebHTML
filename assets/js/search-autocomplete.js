/**
 * HomeSpace Search Autocomplete Engine
 * Provides instant real-time suggestions for neighborhoods, property types, and specific listings.
 */

(function (window, document) {
  'use strict';

  function injectStyles() {
    if (document.getElementById('hs-autocomplete-styles')) return;
    const style = document.createElement('style');
    style.id = 'hs-autocomplete-styles';
    style.textContent = `
      .hs-autocomplete-wrapper {
        position: relative;
        width: 100%;
      }
      .hs-autocomplete-menu {
        position: absolute;
        top: calc(100% + 6px);
        left: 0;
        right: 0;
        background: #ffffff;
        border: 1px solid #e4e4e7;
        border-radius: 12px;
        box-shadow: 0 14px 35px rgba(15, 23, 42, 0.12), 0 4px 10px rgba(0, 0, 0, 0.04);
        z-index: 99999;
        max-height: 380px;
        overflow-y: auto;
        padding: 6px 0;
        margin: 0;
        list-style: none;
        font-family: inherit;
        display: none;
      }
      .hs-autocomplete-header {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #71717a;
        padding: 8px 14px 4px 14px;
        background: #fafafa;
        border-top: 1px solid #f4f4f5;
        border-bottom: 1px solid #f4f4f5;
        margin-top: 4px;
      }
      .hs-autocomplete-header:first-child {
        border-top: none;
        margin-top: 0;
      }
      .hs-autocomplete-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 14px;
        cursor: pointer;
        transition: background-color 0.15s ease;
        color: #18181b;
        font-size: 13.5px;
        text-decoration: none;
      }
      .hs-autocomplete-item:hover, .hs-autocomplete-item.active {
        background-color: #f1f5f9;
      }
      .hs-autocomplete-item .hs-item-icon {
        width: 28px;
        height: 28px;
        border-radius: 6px;
        background: #eff6ff;
        color: #2563eb;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        flex-shrink: 0;
      }
      .hs-autocomplete-item .hs-item-thumb {
        width: 38px;
        height: 32px;
        border-radius: 6px;
        object-fit: cover;
        flex-shrink: 0;
      }
      .hs-autocomplete-item .hs-item-info {
        flex: 1;
        min-width: 0;
      }
      .hs-autocomplete-item .hs-item-title {
        font-weight: 600;
        color: #0f172a;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .hs-autocomplete-item .hs-item-sub {
        font-size: 11.5px;
        color: #64748b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .hs-autocomplete-item .hs-item-price {
        font-weight: 700;
        color: #2563eb;
        font-size: 12.5px;
        margin-left: auto;
        white-space: nowrap;
      }
      .hs-highlight {
        background-color: #dbeafe;
        color: #1d4ed8;
        padding: 0 1px;
        border-radius: 2px;
        font-weight: 700;
      }
    `;
    document.head.appendChild(style);
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function highlightMatch(text, query) {
    if (!query) return escapeHTML(text);
    const escapedText = escapeHTML(text);
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return escapedText.replace(regex, '<mark class="hs-highlight">$1</mark>');
  }

  let cachedProperties = null;

  async function getProperties() {
    if (cachedProperties) return cachedProperties;
    try {
      const stored = localStorage.getItem('homespace_properties_db');
      if (stored) {
        cachedProperties = JSON.parse(stored);
        return cachedProperties;
      }
      const res = await fetch('data/properties.json');
      if (res.ok) {
        cachedProperties = await res.json();
        return cachedProperties;
      }
    } catch (e) {
      console.warn('HomeSpaceSearchAutocomplete: could not fetch properties', e);
    }
    return [];
  }

  function setupAutocomplete(input) {
    if (!input || input.dataset.hsAutocompleteInit === 'true') return;
    input.dataset.hsAutocompleteInit = 'true';
    input.setAttribute('autocomplete', 'off');

    // Ensure wrapper
    let wrapper = input.parentElement;
    if (!wrapper.classList.contains('hs-autocomplete-wrapper')) {
      const div = document.createElement('div');
      div.className = 'hs-autocomplete-wrapper';
      wrapper.insertBefore(div, input);
      div.appendChild(input);
      wrapper = div;
    }

    const menu = document.createElement('div');
    menu.className = 'hs-autocomplete-menu';
    wrapper.appendChild(menu);

    let activeIndex = -1;
    let currentItems = [];
    let debounceTimer = null;

    async function handleInput() {
      const query = input.value.trim().toLowerCase();
      if (query.length < 1) {
        closeMenu();
        return;
      }

      const properties = await getProperties();
      if (!properties || properties.length === 0) {
        closeMenu();
        return;
      }

      // 1. Match Locations / Neighborhoods
      const cities = Array.from(new Set(properties.map(p => p.city).filter(Boolean)));
      const matchedCities = cities.filter(c => c.toLowerCase().includes(query));

      // 2. Match Types
      const types = ['Villa', 'Apartment', 'Condo', 'House'];
      const matchedTypes = types.filter(t => t.toLowerCase().includes(query));

      // 3. Match Properties (by title or address)
      const matchedProps = properties.filter(p =>
        (p.title && p.title.toLowerCase().includes(query)) ||
        (p.address && p.address.toLowerCase().includes(query))
      ).slice(0, 4);

      if (matchedCities.length === 0 && matchedTypes.length === 0 && matchedProps.length === 0) {
        closeMenu();
        return;
      }

      let html = '';
      currentItems = [];

      // Render Locations
      if (matchedCities.length > 0) {
        html += '<div class="hs-autocomplete-header"><i class="bi bi-geo-alt me-1"></i> Locations & Neighborhoods</div>';
        matchedCities.forEach(city => {
          const count = properties.filter(p => p.city === city).length;
          html += `
            <div class="hs-autocomplete-item" data-type="location" data-val="${escapeHTML(city)}">
              <div class="hs-item-icon"><i class="bi bi-geo-alt-fill"></i></div>
              <div class="hs-item-info">
                <div class="hs-item-title">${highlightMatch(city, query)}</div>
                <div class="hs-item-sub">${count} luxury listing${count > 1 ? 's' : ''}</div>
              </div>
            </div>
          `;
          currentItems.push({ type: 'location', value: city });
        });
      }

      // Render Types
      if (matchedTypes.length > 0) {
        html += '<div class="hs-autocomplete-header"><i class="bi bi-building me-1"></i> Property Types</div>';
        matchedTypes.forEach(t => {
          html += `
            <div class="hs-autocomplete-item" data-type="type" data-val="${t.toLowerCase()}">
              <div class="hs-item-icon"><i class="bi bi-house-door-fill"></i></div>
              <div class="hs-item-info">
                <div class="hs-item-title">${highlightMatch(t, query)}</div>
                <div class="hs-item-sub">Filter catalog by ${t.toLowerCase()}</div>
              </div>
            </div>
          `;
          currentItems.push({ type: 'type', value: t });
        });
      }

      // Render Specific Properties
      if (matchedProps.length > 0) {
        html += '<div class="hs-autocomplete-header"><i class="bi bi-star me-1"></i> Matching Properties</div>';
        matchedProps.forEach(prop => {
          const priceDisplay = prop.status === 'for-rent' ? '$' + prop.price.toLocaleString() + '/mo' : '$' + prop.price.toLocaleString();
          html += `
            <a href="property-details.html?id=${prop.id}" class="hs-autocomplete-item" data-type="property" data-id="${prop.id}">
              <img src="${escapeHTML(prop.mainImage || 'assets/img/real-estate/property-exterior-1.webp')}" class="hs-item-thumb" alt="${escapeHTML(prop.title)}">
              <div class="hs-item-info">
                <div class="hs-item-title">${highlightMatch(prop.title, query)}</div>
                <div class="hs-item-sub"><i class="bi bi-geo-alt"></i> ${escapeHTML(prop.city || prop.address)}</div>
              </div>
              <div class="hs-item-price">${priceDisplay}</div>
            </a>
          `;
          currentItems.push({ type: 'property', id: prop.id, url: `property-details.html?id=${prop.id}` });
        });
      }

      menu.innerHTML = html;
      menu.style.display = 'block';
      activeIndex = -1;

      // Attach click events
      menu.querySelectorAll('.hs-autocomplete-item').forEach((itemEl, idx) => {
        itemEl.addEventListener('click', (e) => {
          const itemType = itemEl.getAttribute('data-type');
          if (itemType === 'location') {
            e.preventDefault();
            const val = itemEl.getAttribute('data-val');
            input.value = val;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            closeMenu();
          } else if (itemType === 'type') {
            e.preventDefault();
            const val = itemEl.getAttribute('data-val');
            const typeSelect = document.getElementById('filter-type') || document.getElementById('search-type');
            if (typeSelect) {
              typeSelect.value = val;
              typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            closeMenu();
          }
        });
      });
    }

    function closeMenu() {
      menu.style.display = 'none';
      menu.innerHTML = '';
      activeIndex = -1;
      currentItems = [];
    }

    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(handleInput, 150);
    });

    input.addEventListener('focus', () => {
      if (input.value.trim().length > 0) {
        handleInput();
      }
    });

    input.addEventListener('keydown', (e) => {
      const items = menu.querySelectorAll('.hs-autocomplete-item');
      if (!items || items.length === 0 || menu.style.display === 'none') return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = (activeIndex + 1) % items.length;
        updateActiveItem(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = (activeIndex - 1 + items.length) % items.length;
        updateActiveItem(items);
      } else if (e.key === 'Enter') {
        if (activeIndex >= 0 && items[activeIndex]) {
          e.preventDefault();
          items[activeIndex].click();
        }
      } else if (e.key === 'Escape') {
        closeMenu();
      }
    });

    function updateActiveItem(items) {
      items.forEach((it, idx) => {
        if (idx === activeIndex) {
          it.classList.add('active');
          it.scrollIntoView({ block: 'nearest' });
        } else {
          it.classList.remove('active');
        }
      });
    }

    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) {
        closeMenu();
      }
    });
  }

  function init() {
    injectStyles();
    const inputs = document.querySelectorAll('#search-location, input[name="location"], #admin-search-input');
    inputs.forEach(setupAutocomplete);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.HomeSpaceSearchAutocomplete = { init, setupAutocomplete };
})(window, document);
