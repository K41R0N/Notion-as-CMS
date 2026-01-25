/**
 * Notion-as-CMS Shared Utilities
 * Common functions used across multiple frontend files
 */

/**
 * Escape HTML entities to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * Format a date string using locale from SITE_CONFIG
 * @param {string} dateString - ISO date string
 * @param {string} configKey - 'blog', 'pages', or 'docs' for locale lookup
 * @returns {string} Formatted date or empty string if invalid
 */
function formatDate(dateString, configKey = 'pages') {
  if (!dateString) return '';

  const d = new Date(dateString);
  // Check if date is valid
  if (isNaN(d.getTime())) return '';

  const config = window.SITE_CONFIG?.[configKey] || {};
  const locale = config.dateLocale || 'en-US';
  const format = config.dateFormat || {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  return d.toLocaleDateString(locale, format);
}

/**
 * Extract plain text from HTML string
 */
function extractText(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

/**
 * Validate and sanitize URLs to prevent javascript: injection
 * Blocks SVG data URIs (can contain executable JavaScript)
 * @returns {string|null} Safe URL or null if invalid
 */
function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    // Handle data URLs for images
    if (url.startsWith('data:image/')) {
      // Block SVG data URIs - they can contain executable JavaScript
      const lowerUrl = url.toLowerCase();
      if (lowerUrl.includes('image/svg') || lowerUrl.includes('image/svg+xml')) {
        return null;
      }
      return url;
    }
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return url;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch with timeout and automatic retry
 * @param {string} url - URL to fetch
 * @param {object} options - Fetch options
 * @param {number} timeout - Timeout in ms (default: 10000)
 * @param {number} retries - Number of retries (default: 2)
 */
async function fetchWithRetry(url, options = {}, timeout = 10000, retries = 2) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok && response.status >= 500 && attempt < retries) {
        // Retry on server errors
        await sleep(Math.pow(2, attempt) * 1000); // Exponential backoff
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;

      if (error.name === 'AbortError') {
        lastError = new Error('Request timed out');
      }

      if (attempt < retries) {
        await sleep(Math.pow(2, attempt) * 1000);
      }
    }
  }

  throw lastError;
}

/**
 * Sleep helper for retry delays
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate estimated reading time
 * @param {string} htmlContent - HTML content to analyze
 * @returns {number} Estimated minutes to read
 */
function estimateReadTime(htmlContent) {
  const text = extractText(htmlContent);
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
  return Math.max(1, Math.ceil(wordCount / 200)); // 200 words per minute, minimum 1 minute
}

/**
 * Initialize mobile navigation toggle
 * Call this on DOMContentLoaded
 * Idempotent - safe to call multiple times
 */
let mobileNavInitialized = false;

function initMobileNav() {
  if (mobileNavInitialized) return;

  const toggle = document.querySelector('.mobile-menu-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (!toggle || !navLinks) return;

  mobileNavInitialized = true;

  // Click handler
  toggle.addEventListener('click', function() {
    const isOpen = navLinks.classList.toggle('nav-open');
    this.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  // Close on Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && navLinks.classList.contains('nav-open')) {
      navLinks.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    }
  });

  // Close when clicking outside
  document.addEventListener('click', function(e) {
    if (!toggle.contains(e.target) && !navLinks.contains(e.target)) {
      navLinks.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
}

/**
 * Debounce function for scroll handlers etc.
 */
function debounce(fn, delay = 100) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Dynamic Navigation
 * Fetches nav items from Notion and renders them
 * Handles overflow (> 5 items) with hamburger menu
 */
async function initDynamicNav() {
  const navContainer = document.querySelector('.nav-links');
  const logoLink = document.querySelector('.logo');
  const header = document.querySelector('.header nav');

  if (!navContainer) return;

  try {
    const response = await fetchWithRetry('/.netlify/functions/navigation');

    if (!response.ok) {
      console.warn('Failed to fetch navigation, using static fallback');
      return;
    }

    const data = await response.json();
    const { items, homePage } = data;

    if (!items || items.length === 0) {
      return; // Keep static nav
    }

    // Update logo link if home page exists
    if (homePage && logoLink) {
      logoLink.href = '/';
      logoLink.setAttribute('data-home-id', homePage.id);
    }

    // Determine current path for active state
    const currentPath = window.location.pathname;

    // Check if we need hamburger mode (> 5 items)
    const useHamburger = items.length > 5;

    if (useHamburger) {
      header?.classList.add('nav-hamburger-mode');
    }

    // Build nav HTML
    let navHtml = '';

    // Always add Home link first
    const homeActive = currentPath === '/' ? ' class="active"' : '';
    navHtml += `<li><a href="/"${homeActive}>Home</a></li>`;

    // Add dynamic items
    for (const item of items) {
      const isActive = currentPath === item.url ||
                       currentPath.startsWith(item.url + '/');
      const activeClass = isActive ? ' class="active"' : '';

      // Handle icon - could be emoji (text) or URL (image)
      let iconHtml = '';
      if (item.icon) {
        const isUrl = item.icon.startsWith('http') ||
                      item.icon.startsWith('/') ||
                      item.icon.startsWith('data:');
        if (isUrl) {
          iconHtml = `<img class="nav-icon" src="${escapeHtml(item.icon)}" alt="" /> `;
        } else {
          iconHtml = `<span class="nav-icon">${escapeHtml(item.icon)}</span> `;
        }
      }

      navHtml += `<li><a href="${escapeHtml(item.url)}"${activeClass}>${iconHtml}${escapeHtml(item.title)}</a></li>`;
    }

    navContainer.innerHTML = navHtml;

    // Re-initialize mobile nav after updating content
    initMobileNav();

  } catch (error) {
    console.warn('Error loading dynamic navigation:', error);
    // Keep static fallback
  }
}

/**
 * Initialize navigation - combines static mobile nav with dynamic content
 */
function initNavigation() {
  // First init mobile toggle functionality
  initMobileNav();

  // Then load dynamic nav items (async, will update when ready)
  initDynamicNav();
}

// Export for use in other files (works with simple script concatenation)
window.NotionCMS = window.NotionCMS || {};
window.NotionCMS.utils = {
  escapeHtml,
  formatDate,
  extractText,
  sanitizeUrl,
  fetchWithRetry,
  sleep,
  estimateReadTime,
  initMobileNav,
  initDynamicNav,
  initNavigation,
  debounce
};
