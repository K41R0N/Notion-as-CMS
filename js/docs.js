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
    const icon = doc.icon || '📖';
    const isEmoji = typeof icon === 'string' && !icon.startsWith('http');

    return `
      <a href="/docs/${doc.slug}" class="card">
        ${doc.cover
          ? `<img src="${doc.cover}" alt="" class="card-image" loading="lazy">`
          : `<div class="card-image-placeholder">${isEmoji ? icon : `<img src="${icon}" alt="" style="width: 2rem; height: 2rem;">`}</div>`
        }
        <div class="card-body">
          <h2 class="card-title">
            ${isEmoji ? `<span style="margin-right: 0.5rem;">${icon}</span>` : ''}
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
