/**
 * Documentation listing functionality
 * Shows all docs pages (children of NOTION_DOCS_PAGE_ID)
 */
document.addEventListener('DOMContentLoaded', function() {
  loadDocs();
});

async function loadDocs() {
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const docsEl = document.getElementById('docs-grid');
  const emptyEl = document.getElementById('empty');

  try {
    // Show loading state
    loadingEl.style.display = 'block';
    errorEl.style.display = 'none';
    docsEl.style.display = 'none';
    emptyEl.style.display = 'none';

    // Fetch docs pages (filtered by type=docs)
    const response = await fetch('/.netlify/functions/pages-list?type=docs');

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Hide loading
    loadingEl.style.display = 'none';

    if (data.pages && data.pages.length > 0) {
      docsEl.style.display = 'grid';
      renderDocs(data.pages);
    } else {
      emptyEl.style.display = 'block';
    }

  } catch (error) {
    console.error('Error loading docs:', error);
    loadingEl.style.display = 'none';
    errorEl.style.display = 'block';
  }
}

function renderDocs(docs) {
  const container = document.getElementById('docs-grid');

  container.innerHTML = docs.map(doc => {
    const date = formatDate(doc.lastEditedTime);
    const rawIcon = doc.icon || '📖';
    const isEmoji = typeof rawIcon === 'string' && !rawIcon.startsWith('http');
    // Sanitize URLs to prevent XSS (allow only http/https, block SVG data URIs)
    const safeCover = sanitizeUrl(doc.cover);
    const safeIcon = isEmoji ? rawIcon : sanitizeUrl(rawIcon);
    // Escape slug for safe href attribute
    const safeSlug = encodeURIComponent(doc.slug || '');

    return `
      <a href="/docs/${safeSlug}" class="card">
        ${safeCover
          ? `<img src="${escapeHtml(safeCover)}" alt="" class="card-image" loading="lazy">`
          : `<div class="card-image-placeholder">${isEmoji ? rawIcon : (safeIcon ? `<img src="${escapeHtml(safeIcon)}" alt="" style="width: 2rem; height: 2rem;">` : '📖')}</div>`
        }
        <div class="card-body">
          <h2 class="card-title">
            ${isEmoji ? `<span style="margin-right: 0.5rem;">${rawIcon}</span>` : ''}
            ${escapeHtml(doc.title)}
          </h2>
          <div class="card-meta">
            <span class="card-date">Updated ${date}</span>
            <span class="card-link">Read →</span>
          </div>
        </div>
      </a>
    `;
  }).join('');
}

/**
 * Sanitize URLs - allow only http/https, block SVG data URIs
 */
function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    if (url.startsWith('data:image/')) {
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

function formatDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
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
