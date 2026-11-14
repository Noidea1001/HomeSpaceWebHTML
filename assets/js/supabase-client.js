/**
 * HomeSpace Cloud Backend Adapter (Supabase)
 * Enables dynamic multi-user cloud synchronization for property listings and inquiries.
 * Operates purely over client-side REST without requiring server-side runtimes.
 */

(function (window) {
  'use strict';

  const STORAGE_KEY = 'homespace_supabase_config';

  const HomeSpaceCloud = {
    getConfig: function () {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : { url: '', key: '', enabled: false };
      } catch (e) {
        return { url: '', key: '', enabled: false };
      }
    },

    saveConfig: function (url, key, enabled = true) {
      const cleanUrl = (url || '').trim().replace(/\/+$/, '');
      const cleanKey = (key || '').trim();
      const config = {
        url: cleanUrl,
        key: cleanKey,
        enabled: Boolean(cleanUrl && cleanKey && enabled),
        lastSync: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      return config;
    },

    clearConfig: function () {
      localStorage.removeItem(STORAGE_KEY);
    },

    isConfigured: function () {
      const cfg = this.getConfig();
      return Boolean(cfg.enabled && cfg.url && cfg.key);
    },

    getHeaders: function (key) {
      const activeKey = key || this.getConfig().key;
      return {
        'Content-Type': 'application/json',
        'apikey': activeKey,
        'Authorization': 'Bearer ' + activeKey
      };
    },

    testConnection: async function (testUrl, testKey) {
      const url = (testUrl || this.getConfig().url || '').trim().replace(/\/+$/, '');
      const key = (testKey || this.getConfig().key || '').trim();

      if (!url || !key) {
        return { success: false, message: 'Please provide both Supabase Project URL and Anon API Key.' };
      }

      try {
        const endpoint = `${url}/rest/v1/properties?select=id&limit=1`;
        const res = await fetch(endpoint, {
          method: 'GET',
          headers: this.getHeaders(key)
        });

        if (res.ok) {
          return { success: true, message: 'Connected successfully to Supabase!' };
        } else if (res.status === 404 || res.status === 400) {
          return {
            success: false,
            message: `Connected to Supabase, but 'properties' table was not found (${res.status}). Please run the SQL schema migration in Supabase SQL Editor.`
          };
        } else if (res.status === 401 || res.status === 403) {
          return { success: false, message: 'Invalid Anon API Key or insufficient Row Level Security permissions.' };
        } else {
          return { success: false, message: `Supabase returned HTTP ${res.status}: ${res.statusText}` };
        }
      } catch (err) {
        return { success: false, message: 'Network error connecting to Supabase: ' + err.message };
      }
    },

    fetchProperties: async function () {
      if (!this.isConfigured()) return null;
      const cfg = this.getConfig();
      try {
        const res = await fetch(`${cfg.url}/rest/v1/properties?select=*&order=id.asc`, {
          method: 'GET',
          headers: this.getHeaders(cfg.key)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch (err) {
        console.warn('HomeSpaceCloud: fetchProperties failed', err);
        return null;
      }
    },

    syncPropertiesToCloud: async function (propertiesList) {
      if (!this.isConfigured()) {
        throw new Error('Supabase is not configured.');
      }
      const cfg = this.getConfig();
      const headers = Object.assign({}, this.getHeaders(cfg.key), {
        'Prefer': 'resolution=merge-duplicates,return=representation'
      });

      const res = await fetch(`${cfg.url}/rest/v1/properties`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(propertiesList)
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Cloud sync failed (HTTP ${res.status}): ${errBody}`);
      }
      return await res.json();
    },

    submitInquiry: async function (inquiry) {
      if (!this.isConfigured()) return false;
      const cfg = this.getConfig();
      try {
        const res = await fetch(`${cfg.url}/rest/v1/inquiries`, {
          method: 'POST',
          headers: this.getHeaders(cfg.key),
          body: JSON.stringify(inquiry)
        });
        return res.ok;
      } catch (err) {
        console.warn('HomeSpaceCloud: submitInquiry error', err);
        return false;
      }
    },

    fetchInquiries: async function () {
      if (!this.isConfigured()) return [];
      const cfg = this.getConfig();
      try {
        const res = await fetch(`${cfg.url}/rest/v1/inquiries?select=*&order=created_at.desc`, {
          method: 'GET',
          headers: this.getHeaders(cfg.key)
        });
        if (!res.ok) return [];
        return await res.json();
      } catch (err) {
        console.warn('HomeSpaceCloud: fetchInquiries error', err);
        return [];
      }
    }
  };

  window.HomeSpaceCloud = HomeSpaceCloud;
})(window);
