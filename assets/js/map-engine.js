/**
 * HomeSpace - Interactive Map & Geo-Explorer Engine
 * Powered by Leaflet & OpenStreetMap / CartoDB Voyager tiles.
 * Provides interactive map browsing for catalog and property detail pages.
 */

(function (window) {
  'use strict';

  // Inject Map Custom Marker and Popup Styling
  function injectMapStyles() {
    if (document.getElementById('homespace-map-styles')) return;
    const style = document.createElement('style');
    style.id = 'homespace-map-styles';
    style.textContent = `
      .map-price-marker {
        background: #2563eb;
        color: #ffffff;
        font-weight: 700;
        font-size: 12px;
        padding: 5px 10px;
        border-radius: 20px;
        box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4), 0 2px 4px rgba(0,0,0,0.15);
        white-space: nowrap;
        position: relative;
        cursor: pointer;
        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.2s ease;
        border: 2px solid #ffffff;
        text-align: center;
        display: inline-block;
      }
      .map-price-marker:hover, .map-price-marker.active {
        background: #0f172a;
        transform: scale(1.12);
        z-index: 1000;
      }
      .map-price-marker::after {
        content: '';
        position: absolute;
        bottom: -6px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 6px solid #2563eb;
        transition: border-top-color 0.2s ease;
      }
      .map-price-marker:hover::after, .map-price-marker.active::after {
        border-top-color: #0f172a;
      }
      .leaflet-popup-content-wrapper {
        border-radius: 14px !important;
        padding: 0 !important;
        overflow: hidden !important;
        box-shadow: 0 16px 36px rgba(15, 23, 42, 0.16) !important;
      }
      .leaflet-popup-content {
        margin: 0 !important;
        line-height: 1.4 !important;
      }
      .map-popup-card {
        width: 240px;
        font-family: inherit;
      }
      .map-popup-card img {
        width: 100%;
        height: 130px;
        object-fit: cover;
        display: block;
      }
      .map-popup-body {
        padding: 12px 14px;
        background: #ffffff;
      }
      .map-popup-title {
        font-size: 13px;
        font-weight: 700;
        color: #0f172a;
        margin: 4px 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .map-popup-price {
        color: #2563eb;
        font-weight: 800;
        font-size: 15px;
        margin-bottom: 4px;
      }
      .map-popup-specs {
        font-size: 11px;
        color: #64748b;
        margin-bottom: 10px;
      }
      .map-popup-btn {
        display: block;
        text-align: center;
        background: #0f172a;
        color: #ffffff !important;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 6px 10px;
        border-radius: 6px;
        text-decoration: none;
        transition: background 0.2s ease;
      }
      .map-popup-btn:hover {
        background: #2563eb;
      }
      .properties-map-view {
        width: 100%;
        margin-bottom: 2rem;
      }
    `;
    document.head.appendChild(style);
  }

  function formatPriceBadge(price, status) {
    if (status === 'for-rent') {
      return '$' + price.toLocaleString() + '/mo';
    }
    if (price >= 1000000) {
      return '$' + (price / 1000000).toFixed(price % 1000000 === 0 ? 0 : 2) + 'M';
    }
    if (price >= 1000) {
      return '$' + Math.round(price / 1000) + 'k';
    }
    return '$' + price.toLocaleString();
  }

  const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  const TILE_ATTRIB = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>';

  const HomeSpaceMap = {
    mapInstance: null,
    detailMapInstance: null,
    markersLayer: null,
    properties: [],

    initPropertiesMap: function (containerId, properties) {
      if (typeof L === 'undefined') {
        console.warn('Leaflet library not loaded.');
        return null;
      }
      injectMapStyles();

      const container = document.getElementById(containerId);
      if (!container) return null;

      if (this.mapInstance) {
        this.properties = properties || [];
        this.updateMarkers(this.properties);
        return this.mapInstance;
      }

      this.properties = properties || [];

      // Default center around Greater Los Angeles
      this.mapInstance = L.map(containerId, {
        zoomControl: true,
        scrollWheelZoom: true
      }).setView([34.0522, -118.35], 11);

      L.tileLayer(TILE_URL, {
        maxZoom: 19,
        attribution: TILE_ATTRIB
      }).addTo(this.mapInstance);

      this.markersLayer = L.layerGroup().addTo(this.mapInstance);
      this.updateMarkers(this.properties);

      return this.mapInstance;
    },

    updateMarkers: function (properties) {
      if (!this.mapInstance || !this.markersLayer || typeof L === 'undefined') return;

      this.markersLayer.clearLayers();
      const list = properties || [];
      const bounds = [];

      list.forEach((prop) => {
        if (!prop.coordinates || typeof prop.coordinates.lat !== 'number' || typeof prop.coordinates.lng !== 'number') {
          return;
        }

        const latLng = [prop.coordinates.lat, prop.coordinates.lng];
        bounds.push(latLng);

        const badgeText = formatPriceBadge(prop.price, prop.status);
        const icon = L.divIcon({
          className: 'custom-map-icon',
          html: '<div class="map-price-marker"><span>' + badgeText + '</span></div>',
          iconSize: [64, 28],
          iconAnchor: [32, 28],
          popupAnchor: [0, -28]
        });

        const popupContent = `
          <div class="map-popup-card">
            <img src="${prop.mainImage || 'assets/img/real-estate/property-exterior-1.webp'}" alt="${prop.title}">
            <div class="map-popup-body">
              <span class="badge ${prop.status === 'for-rent' ? 'bg-info' : 'bg-primary'} text-white" style="font-size: 10px;">${(prop.status || 'for-sale').toUpperCase()}</span>
              <h6 class="map-popup-title" title="${prop.title}">${prop.title}</h6>
              <div class="map-popup-price">${prop.status === 'for-rent' ? '$' + prop.price.toLocaleString() + '/mo' : '$' + prop.price.toLocaleString()}</div>
              <div class="map-popup-specs">
                <i class="bi bi-door-closed"></i> ${prop.bedrooms || 0} Beds &bull;
                <i class="bi bi-droplet"></i> ${prop.bathrooms || 0} Baths &bull;
                <i class="bi bi-arrows-angle-expand"></i> ${(prop.sqft || 0).toLocaleString()} sqft
              </div>
              <a href="property-details.html?id=${prop.id}" class="map-popup-btn">View Details &rarr;</a>
            </div>
          </div>
        `;

        const marker = L.marker(latLng, { icon: icon })
          .bindPopup(popupContent, { maxWidth: 260, offset: [0, -10] });

        this.markersLayer.addLayer(marker);
      });

      if (bounds.length > 0) {
        this.mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    },

    invalidateSize: function () {
      if (this.mapInstance) {
        setTimeout(() => {
          this.mapInstance.invalidateSize();
        }, 150);
      }
    },

    initDetailMap: function (containerId, property) {
      if (typeof L === 'undefined') {
        console.warn('Leaflet library not loaded.');
        return null;
      }
      injectMapStyles();

      const container = document.getElementById(containerId);
      if (!container || !property || !property.coordinates) return null;

      const lat = property.coordinates.lat;
      const lng = property.coordinates.lng;

      if (this.detailMapInstance) {
        this.detailMapInstance.remove();
        this.detailMapInstance = null;
      }

      const map = L.map(containerId, {
        scrollWheelZoom: false,
        zoomControl: true
      }).setView([lat, lng], 15);

      L.tileLayer(TILE_URL, {
        maxZoom: 19,
        attribution: TILE_ATTRIB
      }).addTo(map);

      // Neighborhood radius highlight (400m)
      L.circle([lat, lng], {
        color: '#2563eb',
        fillColor: '#3b82f6',
        fillOpacity: 0.12,
        weight: 1.5,
        radius: 400
      }).addTo(map);

      // Property Marker
      const badgeText = formatPriceBadge(property.price, property.status);
      const icon = L.divIcon({
        className: 'custom-map-icon',
        html: '<div class="map-price-marker active"><span>' + badgeText + '</span></div>',
        iconSize: [70, 30],
        iconAnchor: [35, 30],
        popupAnchor: [0, -30]
      });

      const directionsUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(property.address || property.title);

      const popupContent = `
        <div class="map-popup-card">
          <div class="map-popup-body" style="padding: 14px;">
            <h6 class="map-popup-title" style="white-space: normal;">${property.title}</h6>
            <p style="font-size: 11px; color: #64748b; margin-bottom: 8px;">${property.address || ''}</p>
            <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" class="map-popup-btn">
              <i class="bi bi-geo-alt"></i> Get Directions (Google Maps)
            </a>
          </div>
        </div>
      `;

      L.marker([lat, lng], { icon: icon })
        .addTo(map)
        .bindPopup(popupContent)
        .openPopup();

      this.detailMapInstance = map;
      setTimeout(() => map.invalidateSize(), 200);

      return map;
    }
  };

  window.HomeSpaceMap = HomeSpaceMap;
})(window);
