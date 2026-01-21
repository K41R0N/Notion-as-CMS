/**
 * Blog listing page functionality
 */
document.addEventListener('DOMContentLoaded', function() {
  loadBlogPosts();
});

async function loadBlogPosts() {
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const postsEl = document.getElementById('posts-grid');
  const emptyEl = document.getElementById('empty');

  try {
    // Show loading state
    loadingEl.style.display = 'block';
    errorEl.style.display = 'none';
    postsEl.style.display = 'none';
    emptyEl.style.display = 'none';

    // Fetch blog posts
    const response = await fetch('/.netlify/functions/blog-list');

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Hide loading
    loadingEl.style.display = 'none';

    if (data.posts && data.posts.length > 0) {
      postsEl.style.display = 'grid';
      renderBlogPosts(data.posts);
    } else {
      emptyEl.style.display = 'block';
    }

  } catch (error) {
    console.error('Error loading blog posts:', error);
    loadingEl.style.display = 'none';
    errorEl.style.display = 'block';
  }
}

function renderBlogPosts(posts) {
  const container = document.getElementById('posts-grid');

  container.innerHTML = posts.map(post => {
    const date = formatDate(post.publishedDate);

    return `
      <a href="/blog/${post.slug}" class="card">
        ${post.heroImage
          ? `<img src="${post.heroImage}" alt="" class="card-image" loading="lazy">`
          : `<div class="card-image-placeholder">📝</div>`
        }
        <div class="card-body">
          <h2 class="card-title">${escapeHtml(post.title)}</h2>
          <p class="card-description">${escapeHtml(post.description || 'Click to read more...')}</p>
          <div class="card-meta">
            <span class="card-date">${date}</span>
            <span class="card-link">Read more →</span>
          </div>
        </div>
      </a>
    `;
  }).join('');
}

function formatDate(dateString) {
  if (!dateString) return '';
  const config = window.SITE_CONFIG?.blog || {};
  return new Date(dateString).toLocaleDateString(
    config.dateLocale || 'en-US',
    config.dateFormat || { year: 'numeric', month: 'long', day: 'numeric' }
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
