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
 */
function formatDate(dateString, configKey = 'pages') {
  if (!dateString) return '';
  const config = window.SITE_CONFIG?.[configKey] || {};
  const locale = config.dateLocale || 'en-US';
  const format = config.dateFormat || {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  return new Date(dateString).toLocaleDateString(locale, format);
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
 * @returns {string|null} Safe URL or null if invalid
 */
function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    if (url.startsWith('data:image/')) {
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
 */
function initMobileNav() {
  const toggle = document.querySelector('.mobile-menu-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (!toggle || !navLinks) return;

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
  debounce
};
