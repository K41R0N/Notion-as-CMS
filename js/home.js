/**
 * Homepage functionality
 * Fetches and renders the homepage content from Notion
 */
document.addEventListener('DOMContentLoaded', function() {
  loadHomepage();
});

async function loadHomepage() {
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const contentEl = document.getElementById('home-content');

  try {
    // Show loading state
    if (loadingEl) loadingEl.style.display = 'block';
    if (errorEl) errorEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'none';

    // Fetch homepage content
    const response = await fetch('/.netlify/functions/homepage');

    if (!response.ok) {
      if (response.status === 503) {
        // Homepage not configured - show static fallback content
        showFallbackContent();
        return;
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Hide loading and show content
    if (loadingEl) loadingEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'block';

    renderHomepage(data);

  } catch (error) {
    console.error('Error loading homepage:', error);

    // Show fallback content on error
    showFallbackContent();
  }
}

function renderHomepage(data) {
  // Hide fallback content
  const fallbackEl = document.getElementById('fallback-content');
  if (fallbackEl) {
    fallbackEl.style.display = 'none';
  }

  // Update page title and meta
  if (data.metaTitle) {
    document.title = data.metaTitle;
  }

  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && data.metaDescription) {
    metaDesc.setAttribute('content', data.metaDescription);
  }

  // Build homepage content with landing layout
  const contentEl = document.getElementById('home-content');
  if (contentEl && data.content) {
    // Create hero section if there's a title or cover
    let heroHtml = '';
    if (data.title || data.cover) {
      const coverStyle = data.cover ? `background-image: linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(${escapeHtml(data.cover)}); background-size: cover; background-position: center; color: white;` : '';
      heroHtml = `
        <section class="section" style="margin-top: 60px; padding: 80px 0; background: var(--color-bg-secondary); ${coverStyle}">
          <div class="container text-center">
            ${data.icon ? `<span style="font-size: 3rem; display: block; margin-bottom: 1rem;">${data.icon}</span>` : ''}
            <h1 style="font-size: clamp(2rem, 4vw, 3rem); margin-bottom: 1rem;">${escapeHtml(data.title)}</h1>
          </div>
        </section>
      `;
    }

    // Wrap content in landing layout container
    contentEl.innerHTML = `
      ${heroHtml}
      <div class="landing-content" style="padding: 3rem 0;">
        <div class="container">
          ${data.content}
        </div>
      </div>
    `;
  }

  // Add landing page class for styling
  document.body.classList.add('page-home', 'layout-landing');
}

function showFallbackContent() {
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const fallbackEl = document.getElementById('fallback-content');
  const contentEl = document.getElementById('home-content');

  if (loadingEl) loadingEl.style.display = 'none';

  // If there's a fallback section, show it
  if (fallbackEl) {
    fallbackEl.style.display = 'block';
    if (contentEl) contentEl.style.display = 'none';
  } else if (contentEl) {
    // Otherwise show any existing static content
    contentEl.style.display = 'block';
  }

  // Don't show error for unconfigured homepage - just use fallback
  if (errorEl) errorEl.style.display = 'none';
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
