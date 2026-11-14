/**
 * HomeSpace Property Comparison Engine
 * Allows users to select up to 3 properties and compare specifications side-by-side.
 */

const CompareEngine = (() => {
  const COMPARE_KEY = 'homespace_compare';
  const MAX_COMPARE = 3;

  function getCompareIds() {
    try {
      return JSON.parse(localStorage.getItem(COMPARE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveCompareIds(ids) {
    localStorage.setItem(COMPARE_KEY, JSON.stringify(ids));
    updateFloatingBar();
  }

  function addProperty(id) {
    let ids = getCompareIds();
    if (ids.includes(id)) return;
    if (ids.length >= MAX_COMPARE) {
      if (typeof PropertiesEngine !== 'undefined' && PropertiesEngine.showToast) {
        PropertiesEngine.showToast(`You can compare up to ${MAX_COMPARE} properties at a time.`, false);
      }
      return false;
    }
    ids.push(id);
    saveCompareIds(ids);
    if (typeof PropertiesEngine !== 'undefined' && PropertiesEngine.showToast) {
      PropertiesEngine.showToast('Added to comparison list');
    }
    return true;
  }

  function removeProperty(id) {
    let ids = getCompareIds().filter(i => i !== id);
    saveCompareIds(ids);
    if (typeof PropertiesEngine !== 'undefined' && PropertiesEngine.showToast) {
      PropertiesEngine.showToast('Removed from comparison list');
    }
  }

  function clearAll() {
    saveCompareIds([]);
    const modalEl = document.getElementById('compareModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }
  }

  function isCompared(id) {
    return getCompareIds().includes(id);
  }

  // Create or update the floating bottom bar
  function updateFloatingBar() {
    const ids = getCompareIds();
    let bar = document.getElementById('compare-floating-bar');

    if (ids.length === 0) {
      if (bar) bar.style.display = 'none';
      return;
    }

    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'compare-floating-bar';
      bar.style.cssText = 'position: fixed; bottom: 25px; left: 50%; transform: translateX(-50%); z-index: 1050; background: #09090b; color: #fff; padding: 12px 24px; border-radius: 50px; box-shadow: 0 12px 36px rgba(0,0,0,0.35); display: flex; align-items: center; gap: 16px; border: 1px solid rgba(255,255,255,0.15); font-size: 14px; font-weight: 600;';
      document.body.appendChild(bar);
    }

    bar.style.display = 'flex';
    bar.innerHTML = `
      <span><i class="bi bi-bar-chart-steps text-primary me-2"></i> Comparing <strong>${ids.length}</strong> of ${MAX_COMPARE}</span>
      <button class="btn btn-sm btn-primary" id="btn-open-compare-modal" style="background: #2563eb; border: none; border-radius: 20px; padding: 5px 16px; font-weight: 600;">
        Compare Now
      </button>
      <button class="btn btn-sm btn-outline-secondary text-white" id="btn-clear-compare" style="border: none; border-radius: 20px; font-size: 13px;">
        Clear
      </button>
    `;

    document.getElementById('btn-open-compare-modal')?.addEventListener('click', openComparisonModal);
    document.getElementById('btn-clear-compare')?.addEventListener('click', clearAll);
  }

  // Render & Open Side-by-Side Comparison Modal
  async function openComparisonModal() {
    const ids = getCompareIds();
    if (ids.length === 0) return;

    let modalEl = document.getElementById('compareModal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.className = 'modal fade';
      modalEl.id = 'compareModal';
      modalEl.tabIndex = -1;
      modalEl.innerHTML = `
        <div class="modal-dialog modal-xl modal-dialog-centered">
          <div class="modal-content" style="border-radius: 18px; border: 1px solid #e4e4e7; overflow: hidden;">
            <div class="modal-header" style="background: #000; color: #fff;">
              <h5 class="modal-title font-weight-bold"><i class="bi bi-bar-chart-steps text-primary me-2"></i> Property Comparison</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body p-4" id="compare-modal-body" style="overflow-x: auto;">
              <!-- Dynamic comparison table -->
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modalEl);
    }

    const modalBody = document.getElementById('compare-modal-body');
    if (!modalBody) return;

    modalBody.innerHTML = '<div class="text-center py-4 text-muted">Loading property details...</div>';

    let allProps = [];
    if (typeof PropertiesEngine !== 'undefined') {
      allProps = await PropertiesEngine.loadData();
    }

    const comparedProps = ids.map(id => allProps.find(p => p.id === id)).filter(Boolean);

    if (comparedProps.length === 0) {
      modalBody.innerHTML = '<div class="text-center py-4 text-muted">No properties found to compare.</div>';
      return;
    }

    const tableHTML = `
      <div class="table-responsive">
        <table class="table table-bordered text-center align-middle mb-0" style="min-width: 600px;">
          <thead class="table-light">
            <tr>
              <th style="width: 20%; text-align: left; background: #fafafa;">Feature</th>
              ${comparedProps.map(p => `
                <th style="width: ${80 / comparedProps.length}%;">
                  <div style="position: relative; height: 140px; border-radius: 10px; overflow: hidden; margin-bottom: 8px;">
                    <img src="${p.mainImage}" alt="${p.title}" style="width: 100%; height: 100%; object-fit: cover;">
                  </div>
                  <div class="fw-bold" style="font-size: 15px; color: #000;">${p.title}</div>
                  <button class="btn btn-sm btn-outline-danger mt-1 btn-remove-compare" data-id="${p.id}" style="font-size: 11px; padding: 2px 8px;">
                    <i class="bi bi-x-circle me-1"></i> Remove
                  </button>
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="text-start fw-bold bg-light">Price</td>
              ${comparedProps.map(p => `<td class="fw-bold text-primary fs-5">${PropertiesEngine.formatPrice(p.price, p.status)}</td>`).join('')}
            </tr>
            <tr>
              <td class="text-start fw-bold bg-light">Type</td>
              ${comparedProps.map(p => `<td class="text-uppercase small fw-bold">${p.type} (${p.status})</td>`).join('')}
            </tr>
            <tr>
              <td class="text-start fw-bold bg-light">Location</td>
              ${comparedProps.map(p => `<td class="small text-muted">${p.address}</td>`).join('')}
            </tr>
            <tr>
              <td class="text-start fw-bold bg-light">Bedrooms / Baths</td>
              ${comparedProps.map(p => `<td><strong>${p.bedrooms}</strong> Beds / <strong>${p.bathrooms}</strong> Baths</td>`).join('')}
            </tr>
            <tr>
              <td class="text-start fw-bold bg-light">Size (Sq Ft)</td>
              ${comparedProps.map(p => `<td>${Number(p.sqft).toLocaleString()} sqft</td>`).join('')}
            </tr>
            <tr>
              <td class="text-start fw-bold bg-light">Price per Sq Ft</td>
              ${comparedProps.map(p => `<td>$${Math.round(p.price / (p.sqft || 1)).toLocaleString()} / sqft</td>`).join('')}
            </tr>
            <tr>
              <td class="text-start fw-bold bg-light">Year Built</td>
              ${comparedProps.map(p => `<td>${p.yearBuilt || 2024}</td>`).join('')}
            </tr>
            <tr>
              <td class="text-start fw-bold bg-light">Key Amenities</td>
              ${comparedProps.map(p => `
                <td class="small text-start">
                  ${(p.features || []).slice(0, 4).map(f => `<div><i class="bi bi-check-circle-fill text-primary me-1" style="font-size: 12px;"></i>${f}</div>`).join('')}
                </td>
              `).join('')}
            </tr>
            <tr>
              <td class="text-start fw-bold bg-light">Action</td>
              ${comparedProps.map(p => `
                <td>
                  <a href="property-details.html?id=${encodeURIComponent(p.id)}" class="btn btn-sm btn-primary w-100" style="background:#2563eb; border:none; border-radius: 8px;">
                    View Details
                  </a>
                </td>
              `).join('')}
            </tr>
          </tbody>
        </table>
      </div>
    `;

    modalBody.innerHTML = tableHTML;

    // Remove buttons inside comparison table
    modalBody.querySelectorAll('.btn-remove-compare').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        removeProperty(id);
        openComparisonModal();
      });
    });

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }

  // Global click delegate for compare buttons
  document.addEventListener('click', (e) => {
    const compareBtn = e.target.closest('.compare-btn');
    if (compareBtn) {
      e.preventDefault();
      e.stopPropagation();
      const id = compareBtn.getAttribute('data-id');
      if (!id) return;

      if (isCompared(id)) {
        removeProperty(id);
        compareBtn.classList.remove('active');
        compareBtn.innerHTML = '<i class="bi bi-bar-chart-steps"></i>';
      } else {
        const added = addProperty(id);
        if (added) {
          compareBtn.classList.add('active');
          compareBtn.innerHTML = '<i class="bi bi-check-square-fill text-primary"></i>';
        }
      }
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    updateFloatingBar();
  });

  return {
    addProperty,
    removeProperty,
    clearAll,
    isCompared,
    getCompareIds,
    openComparisonModal
  };
})();
