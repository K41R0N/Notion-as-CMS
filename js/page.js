/**
 * Page detail functionality
 * Renders any Notion page by slug with page-type specific layouts
 */
document.addEventListener('DOMContentLoaded', function() {
  loadPage();
});

async function loadPage() {
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const contentEl = document.getElementById('page-content');

  try {
    const slug = getSlugFromUrl();

    if (!slug) {
      throw new Error('No slug found');
    }

    // Show loading state
    loadingEl.style.display = 'block';
    errorEl.style.display = 'none';
    contentEl.style.display = 'none';

    // Fetch page
    const response = await fetch(`/.netlify/functions/page-detail?slug=${encodeURIComponent(slug)}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Page not found');
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const page = await response.json();

    // Check if user should be redirected to the correct URL path for this page type
    const currentPath = window.location.pathname;
    const isOnPageRoute = currentPath.startsWith('/page/');

    if (isOnPageRoute && page.pageType !== 'landing') {
      // User is on /page/ but this is a blog or docs page - redirect them
      if (page.url && page.url !== currentPath) {
        window.location.replace(page.url);
        return;
      }
    }

    // Hide loading and show content
    loadingEl.style.display = 'none';
    contentEl.style.display = 'block';

    // Apply page type layout
    applyPageTypeLayout(page.pageType, page.styleConfig);

    renderPage(page);

  } catch (error) {
    console.error('Error loading page:', error);
    loadingEl.style.display = 'none';
    errorEl.style.display = 'block';
  }
}

/**
 * Apply page-type specific layout class and adjust UI elements
 */
function applyPageTypeLayout(pageType, styleConfig) {
  const article = document.querySelector('.article');
  if (!article) return;

  // Remove any existing layout classes
  article.classList.remove('layout-landing', 'layout-blog', 'layout-docs');

  // Apply the appropriate layout class
  article.classList.add(`layout-${pageType}`);

  // Update content container class if specified
  const contentEl = document.getElementById('page-body');
  if (contentEl && styleConfig?.contentClass) {
    contentEl.className = styleConfig.contentClass;
  }

  // Show/hide elements based on styleConfig
  const dateEl = document.getElementById('page-date');
  const metaEl = document.querySelector('.article-meta');
  const footerEl = document.querySelector('.article-footer');
  const shareButtons = document.querySelector('.share-buttons');
  const breadcrumb = document.querySelector('.breadcrumb');

  // Date visibility
  if (metaEl) {
    metaEl.style.display = styleConfig?.showDate ? 'block' : 'none';
  }

  // Share buttons visibility
  if (shareButtons) {
    shareButtons.style.display = styleConfig?.showShareButtons ? 'flex' : 'none';
  }

  // Footer visibility (for landing pages, hide the whole footer)
  if (footerEl) {
    footerEl.style.display = (pageType === 'landing') ? 'none' : 'block';
  }

  // Breadcrumb visibility
  if (breadcrumb) {
    breadcrumb.style.display = (pageType === 'landing') ? 'none' : 'block';
  }
}

function renderPage(page) {
  const siteName = window.SITE_CONFIG?.siteName || 'Notion CMS';

  // Update page title
  document.title = `${page.title} — ${siteName}`;

  // Update meta description
  const metaDesc = document.getElementById('page-description');
  if (metaDesc) {
    const desc = extractText(page.content).substring(0, 160) + '...';
    metaDesc.setAttribute('content', desc);
  }

  // Update breadcrumb
  const breadcrumb = document.getElementById('breadcrumb-title');
  if (breadcrumb) {
    breadcrumb.textContent = page.title;
  }

  // Update cover image
  const coverEl = document.getElementById('page-cover');
  if (coverEl && page.cover) {
    coverEl.src = page.cover;
    coverEl.style.display = 'block';
  }

  // Update icon (using safe DOM APIs to prevent XSS)
  const iconEl = document.getElementById('page-icon');
  if (iconEl && page.icon) {
    // Clear existing content
    iconEl.textContent = '';

    if (page.icon.startsWith('http')) {
      // Validate URL before using
      const safeUrl = sanitizeIconUrl(page.icon);
      if (safeUrl) {
        const img = document.createElement('img');
        img.src = safeUrl;
        img.alt = '';
        img.style.width = '1.5rem';
        img.style.height = '1.5rem';
        img.style.verticalAlign = 'middle';
        iconEl.appendChild(img);
      } else {
        iconEl.style.display = 'none';
      }
    } else {
      // Emoji or text - use textContent (safe)
      iconEl.textContent = page.icon;
    }
  } else if (iconEl) {
    iconEl.style.display = 'none';
  }

  // Update title
  const nameEl = document.getElementById('page-name');
  if (nameEl) {
    nameEl.textContent = page.title;
  }

  // Update date
  const dateEl = document.getElementById('page-date');
  if (dateEl) {
    const date = formatDate(page.lastEditedTime);
    dateEl.textContent = date;
  }

  // Update content
  const body = document.getElementById('page-body');
  if (body) {
    body.innerHTML = page.content;
  }

  // Setup share buttons
  setupShareButtons(page.title);

  // Add smooth scrolling
  addSmoothScrolling();

  // Build table of contents if present
  buildTableOfContents();
}

function setupShareButtons(title) {
  const url = encodeURIComponent(window.location.href);
  const text = encodeURIComponent(title);

  const twitter = document.getElementById('share-twitter');
  if (twitter) {
    twitter.href = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
  }

  const linkedin = document.getElementById('share-linkedin');
  if (linkedin) {
    linkedin.href = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
  }
}

function getSlugFromUrl() {
  const path = window.location.pathname;
  const segments = path.split('/').filter(s => s.length > 0);

  // Format: /page/page-slug
  if (segments.length >= 2 && segments[0] === 'page') {
    return segments[1];
  }

  return null;
}

function formatDate(dateString, locale = null) {
  if (!dateString) return '';
  const config = window.SITE_CONFIG?.pages || {};
  const dateLocale = locale || config.dateLocale || 'en-US';
  const dateFormat = config.dateFormat || {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  return new Date(dateString).toLocaleDateString(dateLocale, dateFormat);
}

function extractText(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

function addSmoothScrolling() {
  const content = document.getElementById('page-body');
  if (!content) return;

  const anchors = content.querySelectorAll('a[href^="#"]');
  anchors.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const id = this.getAttribute('href').substring(1);
      const target = document.getElementById(id);
      if (target) {
        window.scrollTo({
          top: target.offsetTop - 100,
          behavior: 'smooth'
        });
      }
    });
  });
}

function buildTableOfContents() {
  const tocContainers = document.querySelectorAll('.notion-toc[data-toc="true"]');
  if (tocContainers.length === 0) return;

  const content = document.getElementById('page-body');
  if (!content) return;

  const headings = content.querySelectorAll('h1, h2, h3');
  if (headings.length === 0) return;

  const tocHtml = Array.from(headings).map(h => {
    const level = parseInt(h.tagName.charAt(1));
    const id = h.id || h.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    h.id = id;
    const indent = (level - 1) * 1;
    return `<div style="padding-left: ${indent}rem;"><a href="#${id}">${h.textContent}</a></div>`;
  }).join('');

  tocContainers.forEach(toc => {
    toc.innerHTML = `<strong>Table of Contents</strong>${tocHtml}`;
  });
}

/**
 * Sanitize icon URLs - allow only http/https, block SVG data URIs
 */
function sanitizeIconUrl(url) {
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

window.addEventListener('popstate', function() {
  loadPage();
});
