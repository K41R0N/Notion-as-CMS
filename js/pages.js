/**
 * Pages listing functionality
 * Shows all pages the Notion integration has access to
 */
document.addEventListener('DOMContentLoaded', function() {
  loadPages();
});

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

    // Fetch all accessible pages
    const response = await fetch('/.netlify/functions/pages-list');

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
    const icon = page.icon || '📄';
    const isEmoji = typeof icon === 'string' && !icon.startsWith('http');

    return `
      <a href="/page/${page.slug}" class="card">
        ${page.cover
          ? `<img src="${page.cover}" alt="" class="card-image" loading="lazy">`
          : `<div class="card-image-placeholder">${isEmoji ? icon : `<img src="${icon}" alt="" style="width: 2rem; height: 2rem;">`}</div>`
        }
        <div class="card-body">
          <h2 class="card-title">
            ${isEmoji ? `<span style="margin-right: 0.5rem;">${icon}</span>` : ''}
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
