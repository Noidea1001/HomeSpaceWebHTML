/**
 * HomeSpace Luxury Dark & Light Mode Theme Engine
 * High-contrast Obsidian & White with Royal Blue accent.
 * Persists user preference in LocalStorage and syncs with system prefers-color-scheme.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'homespace_theme';

  function getSavedTheme() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch (e) {
      // fallback
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-bs-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-theme');
      if (document.body) document.body.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
      if (document.body) document.body.classList.remove('dark-theme');
    }
    updateToggleButtons(theme);
  }

  function updateToggleButtons(theme) {
    const buttons = document.querySelectorAll('.theme-toggle-btn');
    buttons.forEach(btn => {
      if (theme === 'dark') {
        btn.innerHTML = '<i class="bi bi-sun-fill text-warning"></i>';
        btn.setAttribute('title', 'Switch to Light Mode');
        btn.setAttribute('aria-label', 'Switch to Light Mode');
      } else {
        btn.innerHTML = '<i class="bi bi-moon-stars-fill text-dark"></i>';
        btn.setAttribute('title', 'Switch to Dark Mode');
        btn.setAttribute('aria-label', 'Switch to Dark Mode');
      }
    });
  }

  // Apply immediately before DOM is fully rendered to prevent flash
  const initialTheme = getSavedTheme();
  applyTheme(initialTheme);

  const HomeSpaceTheme = {
    get: function () {
      return document.documentElement.getAttribute('data-bs-theme') || initialTheme;
    },
    set: function (theme) {
      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch (e) {
        // ignore
      }
      applyTheme(theme);
    },
    toggle: function () {
      const next = this.get() === 'dark' ? 'light' : 'dark';
      this.set(next);
      return next;
    },
    initButton: function () {
      // Check if button already exists in navbar
      let btn = document.querySelector('.theme-toggle-btn');
      if (!btn) {
        const headerContainer = document.querySelector('#header .container-fluid, #header .container, header .container');
        if (headerContainer) {
          btn = document.createElement('button');
          btn.className = 'btn btn-sm btn-link theme-toggle-btn p-1 ms-2';
          btn.style.cssText = 'font-size: 1.15rem; text-decoration: none; border-radius: 50%; width: 38px; height: 38px; display: inline-flex; align-items: center; justify-content: center; transition: transform 0.2s ease; border: 1px solid rgba(125,125,125,0.2);';
          btn.innerHTML = initialTheme === 'dark' ? '<i class="bi bi-sun-fill text-warning"></i>' : '<i class="bi bi-moon-stars-fill text-dark"></i>';
          headerContainer.appendChild(btn);
        }
      }

      document.querySelectorAll('.theme-toggle-btn').forEach(b => {
        b.removeEventListener('click', handleToggleClick);
        b.addEventListener('click', handleToggleClick);
      });
      updateToggleButtons(this.get());
    }
  };

  function handleToggleClick(e) {
    e.preventDefault();
    const btn = e.currentTarget;
    btn.style.transform = 'scale(0.85) rotate(45deg)';
    setTimeout(() => {
      HomeSpaceTheme.toggle();
      btn.style.transform = 'scale(1) rotate(0deg)';
    }, 150);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => HomeSpaceTheme.initButton());
  } else {
    HomeSpaceTheme.initButton();
  }

  // Listen for OS scheme change
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        HomeSpaceTheme.set(e.matches ? 'dark' : 'light');
      }
    });
  }

  window.HomeSpaceTheme = HomeSpaceTheme;
})();
