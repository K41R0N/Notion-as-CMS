/**
 * Documentation page functionality
 * Renders a doc page with sidebar navigation and table of contents
 */
document.addEventListener('DOMContentLoaded', function() {
  loadDocPage();
});

let docsTree = [];
let flatDocs = []; // Flattened version for prev/next navigation

async function loadDocPage() {
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const contentEl = document.getElementById('doc-content');

  try {
    const slug = getSlugFromUrl();

    if (!slug) {
      throw new Error('No slug found');
    }

    // Show loading state
    loadingEl.style.display = 'block';
    errorEl.style.display = 'none';
    contentEl.style.display = 'none';

    // Fetch page and docs tree in parallel
    const [pageResponse, treeResponse] = await Promise.all([
      fetch(`/.netlify/functions/page-detail?slug=${encodeURIComponent(slug)}`),
      fetch('/.netlify/functions/docs-tree')
    ]);

    if (!pageResponse.ok) {
      if (pageResponse.status === 404) {
        throw new Error('Page not found');
      }
      throw new Error(`HTTP ${pageResponse.status}`);
    }

    const page = await pageResponse.json();

    if (treeResponse.ok) {
      const treeData = await treeResponse.json();
      docsTree = treeData.tree || [];
      flatDocs = flattenTree(docsTree);
    }

    // Hide loading and show content
    loadingEl.style.display = 'none';
    contentEl.style.display = 'grid';

    renderDocPage(page);
    renderSidebar(slug);
    buildTableOfContents();
    setupPrevNext(slug);
    setupScrollSpy();

  } catch (error) {
    console.error('Error loading doc page:', error);
    loadingEl.style.display = 'none';
    errorEl.style.display = 'block';
  }
}

function renderDocPage(page) {
  const siteName = window.SITE_CONFIG?.siteName || 'Notion CMS';

  // Update page title
  document.title = `${page.title} — Documentation — ${siteName}`;

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

  // Update icon (using safe DOM APIs to prevent XSS)
  const iconEl = document.getElementById('doc-icon');
  if (iconEl && page.icon) {
    iconEl.textContent = '';

    if (page.icon.startsWith('http')) {
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
      iconEl.textContent = page.icon;
    }
  } else if (iconEl) {
    iconEl.style.display = 'none';
  }

  // Update title
  const nameEl = document.getElementById('doc-name');
  if (nameEl) {
    nameEl.textContent = page.title;
  }

  // Update date
  const dateEl = document.getElementById('doc-date');
  if (dateEl) {
    const date = formatDate(page.lastEditedTime);
    dateEl.textContent = date;
  }

  // Update content
  const body = document.getElementById('doc-body');
  if (body) {
    body.innerHTML = page.content;
  }
}

function renderSidebar(currentSlug) {
  const navEl = document.getElementById('docs-nav');
  if (!navEl || docsTree.length === 0) return;

  navEl.innerHTML = renderTreeItems(docsTree, currentSlug);

  // Expand parent items that contain the current page
  expandActiveParents(navEl, currentSlug);
}

/**
 * Recursively render tree items with nested children
 */
function renderTreeItems(items, currentSlug, depth = 0) {
  return items.map(doc => {
    const isActive = doc.slug === currentSlug;
    const hasChildren = doc.children && doc.children.length > 0;
    const safeSlug = encodeURIComponent(doc.slug || '');
    const displayTitle = escapeHtml(doc.navTitle || doc.title);

    let html = `
      <li class="nav-item ${hasChildren ? 'has-children' : ''}" data-slug="${safeSlug}">
        <a href="/docs/${safeSlug}" class="${isActive ? 'active' : ''}">
          ${doc.icon && !doc.icon.startsWith('http') ? `<span class="nav-icon">${doc.icon}</span>` : ''}
          <span class="nav-title">${displayTitle}</span>
          ${hasChildren ? '<span class="nav-toggle">▸</span>' : ''}
        </a>`;

    if (hasChildren) {
      html += `
        <ul class="nav-children" style="display: none;">
          ${renderTreeItems(doc.children, currentSlug, depth + 1)}
        </ul>`;
    }

    html += '</li>';
    return html;
  }).join('');
}

/**
 * Expand parent items that contain the active page
 */
function expandActiveParents(navEl, currentSlug) {
  // Find the active link
  const activeLink = navEl.querySelector(`a.active`);
  if (!activeLink) return;

  // Expand all parent ul.nav-children
  let parent = activeLink.parentElement;
  while (parent && parent !== navEl) {
    if (parent.tagName === 'UL' && parent.classList.contains('nav-children')) {
      parent.style.display = 'block';
      // Update toggle icon
      const toggle = parent.previousElementSibling?.querySelector('.nav-toggle');
      if (toggle) toggle.textContent = '▾';
    }
    parent = parent.parentElement;
  }

  // Add click handlers for toggles
  navEl.querySelectorAll('.nav-toggle').forEach(toggle => {
    toggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const li = this.closest('li');
      const children = li.querySelector('.nav-children');
      if (children) {
        const isHidden = children.style.display === 'none';
        children.style.display = isHidden ? 'block' : 'none';
        this.textContent = isHidden ? '▾' : '▸';
      }
    });
  });
}

/**
 * Flatten tree for prev/next navigation
 */
function flattenTree(tree) {
  const result = [];
  function traverse(items) {
    for (const item of items) {
      result.push({
        slug: item.slug,
        title: item.title,
        url: item.url
      });
      if (item.children && item.children.length > 0) {
        traverse(item.children);
      }
    }
  }
  traverse(tree);
  return result;
}

function buildTableOfContents() {
  const tocList = document.getElementById('docs-toc-list');
  const content = document.getElementById('doc-body');
  if (!tocList || !content) return;

  const headings = content.querySelectorAll('h1, h2, h3');
  if (headings.length === 0) {
    // Hide TOC if no headings
    const tocContainer = document.querySelector('.docs-toc');
    if (tocContainer) tocContainer.style.display = 'none';
    return;
  }

  tocList.innerHTML = Array.from(headings).map(h => {
    const level = h.tagName.toLowerCase();
    const id = h.id || h.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    h.id = id;
    return `<li class="toc-${level}"><a href="#${id}">${escapeHtml(h.textContent)}</a></li>`;
  }).join('');

  // Add click handlers for smooth scrolling
  tocList.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const id = this.getAttribute('href').substring(1);
      const target = document.getElementById(id);
      if (target) {
        window.scrollTo({
          top: target.offsetTop - 100,
          behavior: 'smooth'
        });
        // Update URL hash without jumping
        history.pushState(null, null, `#${id}`);
      }
    });
  });
}

function setupPrevNext(currentSlug) {
  const prevNextEl = document.getElementById('docs-prev-next');
  if (!prevNextEl || flatDocs.length < 2) return;

  const currentIndex = flatDocs.findIndex(d => d.slug === currentSlug);
  if (currentIndex === -1) return;

  const prevDoc = currentIndex > 0 ? flatDocs[currentIndex - 1] : null;
  const nextDoc = currentIndex < flatDocs.length - 1 ? flatDocs[currentIndex + 1] : null;

  if (prevDoc || nextDoc) {
    prevNextEl.style.display = 'grid';

    const prevLink = document.getElementById('prev-link');
    const nextLink = document.getElementById('next-link');

    if (prevDoc && prevLink) {
      prevLink.href = `/docs/${prevDoc.slug}`;
      prevLink.style.display = 'block';
      document.getElementById('prev-title').textContent = prevDoc.title;
    }

    if (nextDoc && nextLink) {
      nextLink.href = `/docs/${nextDoc.slug}`;
      nextLink.style.display = 'block';
      document.getElementById('next-title').textContent = nextDoc.title;
    }
  }
}

function setupScrollSpy() {
  const tocLinks = document.querySelectorAll('.docs-toc-list a');
  const headings = document.querySelectorAll('#doc-body h1, #doc-body h2, #doc-body h3');

  if (tocLinks.length === 0 || headings.length === 0) return;

  const observerOptions = {
    rootMargin: '-100px 0px -70% 0px',
    threshold: 0
  };

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        tocLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          }
        });
      }
    });
  }, observerOptions);

  headings.forEach(heading => {
    if (heading.id) {
      observer.observe(heading);
    }
  });
}

function getSlugFromUrl() {
  const path = window.location.pathname;
  const segments = path.split('/').filter(s => s.length > 0);

  // Format: /docs/doc-slug
  if (segments.length >= 2 && segments[0] === 'docs') {
    return segments[1];
  }

  return null;
}

function formatDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function extractText(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
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
  loadDocPage();
});
