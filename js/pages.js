/**
 * Pages listing functionality
 * Shows all pages the Notion integration has access to
 */
document.addEventListener('DOMContentLoaded', function() {
  loadPages();
});

/**
 * Validate and sanitize URLs for use in src attributes
 * Only allows http, https, and data:image protocols
 */
function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    // Handle data URLs for images
    if (url.startsWith('data:image/')) {
      return url;
    }
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return url;
    }
    return null;
  } catch {
    return null;
  }
}

async function loadPages() {
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const pagesEl = document.getElementById('pages-grid');
  const emptyEl = document.getElementById('empty');

  try {
    // Show loading state
    loadingEl.style.display = 'block';
    errorEl.style.display = 'none';
    pagesEl.style.display = 'none';
    emptyEl.style.display = 'none';

    // Fetch only landing-type pages (pages under the configured NOTION_LANDING_PAGE_ID)
    const response = await fetch('/.netlify/functions/pages-list?type=landing');

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Hide loading
    loadingEl.style.display = 'none';

    if (data.pages && data.pages.length > 0) {
      pagesEl.style.display = 'grid';
      renderPages(data.pages);
    } else {
      emptyEl.style.display = 'block';
    }

  } catch (error) {
    console.error('Error loading pages:', error);
    loadingEl.style.display = 'none';
    errorEl.style.display = 'block';
  }
}

function renderPages(pages) {
  const container = document.getElementById('pages-grid');

  container.innerHTML = pages.map(page => {
    const date = formatDate(page.lastEditedTime);
    const rawIcon = page.icon || '📄';
    const isEmoji = typeof rawIcon === 'string' && !rawIcon.startsWith('http');
    // Sanitize URLs to prevent javascript: or other malicious protocols
    const safeCover = sanitizeUrl(page.cover);
    const safeIcon = isEmoji ? rawIcon : sanitizeUrl(rawIcon);

    return `
      <a href="/page/${escapeHtml(page.slug)}" class="card">
        ${safeCover
          ? `<img src="${safeCover}" alt="" class="card-image" loading="lazy">`
          : `<div class="card-image-placeholder">${isEmoji ? rawIcon : (safeIcon ? `<img src="${safeIcon}" alt="" style="width: 2rem; height: 2rem;">` : '📄')}</div>`
        }
        <div class="card-body">
          <h2 class="card-title">
            ${isEmoji ? `<span style="margin-right: 0.5rem;">${rawIcon}</span>` : ''}
            ${escapeHtml(page.title)}
          </h2>
          <div class="card-meta">
            <span class="card-date">Updated ${date}</span>
            <span class="card-link">View →</span>
          </div>
        </div>
      </a>
    `;
  }).join('');
}

function formatDate(dateString) {
  if (!dateString) return '';
  const config = window.SITE_CONFIG?.pages || {};
  return new Date(dateString).toLocaleDateString(
    config.dateLocale || 'en-US',
    { year: 'numeric', month: 'short', day: 'numeric' }
  );
}

function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
