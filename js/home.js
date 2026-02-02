/**
 * Homepage functionality
 * Fetches and renders the homepage content from Notion
 * Supports section-based layouts via toggle blocks
 */
document.addEventListener('DOMContentLoaded', function() {
  loadHomepage();
});

async function loadHomepage() {
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const contentEl = document.getElementById('home-content');

  try {
    if (loadingEl) loadingEl.style.display = 'block';
    if (errorEl) errorEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'none';

    const response = await fetch('/.netlify/functions/homepage');

    if (!response.ok) {
      if (response.status === 503) {
        showFallbackContent();
        return;
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (loadingEl) loadingEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'block';

    renderHomepage(data);

  } catch (error) {
    console.error('Error loading homepage:', error);
    showFallbackContent();
  }
}

function renderHomepage(data) {
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

  const contentEl = document.getElementById('home-content');
  if (!contentEl) return;

  // Render sections
  if (data.sections && data.sections.length > 0) {
    let html = '';
    let sectionIndex = 0;

    for (const section of data.sections) {
      html += renderSection(section, sectionIndex);
      sectionIndex++;
    }

    contentEl.innerHTML = html;
  } else {
    // Fallback: no sections defined, show basic content
    contentEl.innerHTML = `
      <section class="hero">
        <div class="hero-content">
          <h1>${escapeHtml(data.title || 'Welcome')}</h1>
        </div>
      </section>
    `;
  }

  document.body.classList.add('page-home', 'layout-landing');
}

/**
 * Render a section based on its type
 */
function renderSection(section, index) {
  const isAlt = index % 2 === 1;

  switch (section.type) {
    case 'hero':
      return renderHeroSection(section);
    case 'features':
      return renderFeaturesSection(section, isAlt);
    case 'steps':
      return renderStepsSection(section, isAlt);
    case 'code':
      return renderCodeSection(section, isAlt);
    case 'cta':
      return renderCtaSection(section);
    case 'content':
    default:
      return renderContentSection(section, isAlt);
  }
}

/**
 * Hero Section
 */
function renderHeroSection(section) {
  const badge = section.badge
    ? `<div class="hero-badge"><span class="hero-badge-dot"></span>${escapeHtml(section.badge)}</div>`
    : '';

  const title = section.title
    ? `<h1>${section.title}</h1>` // Already HTML from API
    : '';

  const description = section.description
    ? `<p class="hero-description">${section.description}</p>` // Already HTML
    : '';

  let buttons = '';
  if (section.buttons && section.buttons.length > 0) {
    buttons = '<div class="hero-actions">';
    for (const btn of section.buttons) {
      const btnClass = btn.primary ? 'btn btn-primary btn-lg' : 'btn btn-secondary btn-lg';
      buttons += `<a href="${escapeHtml(btn.url)}" class="${btnClass}">${escapeHtml(btn.text)}</a>`;
    }
    buttons += '</div>';
  }

  const image = section.image
    ? `<div class="hero-image"><img src="${escapeHtml(section.image)}" alt="" loading="lazy"></div>`
    : '';

  return `
    <section class="hero">
      <div class="hero-float hero-float-1"></div>
      <div class="hero-float hero-float-2"></div>
      <div class="hero-float hero-float-3"></div>
      <div class="hero-content">
        ${badge}
        ${title}
        ${description}
        ${buttons}
      </div>
      ${image}
    </section>
  `;
}

/**
 * Features Section
 */
function renderFeaturesSection(section, isAlt) {
  const title = section.title
    ? `<h2 class="text-center mb-2xl">${escapeHtml(section.title)}</h2>`
    : '';

  let items = '';
  if (section.items && section.items.length > 0) {
    items = '<div class="features-grid">';
    for (const item of section.items) {
      items += `
        <div class="feature-card">
          <div class="feature-icon">${escapeHtml(item.icon)}</div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description)}</p>
        </div>
      `;
    }
    items += '</div>';
  }

  return `
    <section class="section${isAlt ? ' section-alt' : ''}">
      <div class="container">
        ${title}
        ${items}
      </div>
    </section>
  `;
}

/**
 * Steps Section (How It Works)
 */
function renderStepsSection(section, isAlt) {
  const title = section.title
    ? `<h2 class="text-center mb-2xl">${escapeHtml(section.title)}</h2>`
    : '';

  let items = '';
  if (section.items && section.items.length > 0) {
    items = '<div class="features-grid">';
    for (const item of section.items) {
      const number = String(item.number).padStart(2, '0');
      items += `
        <div class="feature-card">
          <div class="feature-number">${number}</div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description)}</p>
        </div>
      `;
    }
    items += '</div>';
  }

  return `
    <section class="section${isAlt ? ' section-alt' : ''}">
      <div class="container">
        ${title}
        ${items}
      </div>
    </section>
  `;
}

/**
 * Code Section
 */
function renderCodeSection(section, isAlt) {
  const title = section.title
    ? `<h2 class="text-center mb-xl">${escapeHtml(section.title)}</h2>`
    : '';

  const description = section.description
    ? `<p class="text-center mb-2xl" style="color: var(--color-text-secondary);">${escapeHtml(section.description)}</p>`
    : '';

  let blocks = '';
  if (section.blocks && section.blocks.length > 0) {
    for (let i = 0; i < section.blocks.length; i++) {
      const block = section.blocks[i];
      const isLast = i === section.blocks.length - 1;
      blocks += `
        <div class="code-block${isLast ? '' : ' mb-xl'}">
          <div class="code-header">
            <span class="code-dot code-dot-red"></span>
            <span class="code-dot code-dot-yellow"></span>
            <span class="code-dot code-dot-green"></span>
            ${block.caption ? `<span class="code-title">${escapeHtml(block.caption)}</span>` : ''}
          </div>
          <div class="code-content">
            <pre>${escapeHtml(block.code)}</pre>
          </div>
        </div>
      `;
    }
  }

  return `
    <section class="section${isAlt ? ' section-alt' : ''}">
      <div class="container-narrow">
        ${title}
        ${description}
        ${blocks}
      </div>
    </section>
  `;
}

/**
 * CTA Section
 */
function renderCtaSection(section) {
  const title = section.title
    ? `<h2>${section.title}</h2>` // Already HTML from API
    : '';

  const description = section.description
    ? `<p>${section.description}</p>` // Already HTML
    : '';

  let buttons = '';
  if (section.buttons && section.buttons.length > 0) {
    buttons = '<div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">';
    for (const btn of section.buttons) {
      const btnClass = btn.primary ? 'btn btn-primary btn-lg' : 'btn btn-secondary btn-lg';
      buttons += `<a href="${escapeHtml(btn.url)}" class="${btnClass}">${escapeHtml(btn.text)}</a>`;
    }
    buttons += '</div>';
  }

  return `
    <section class="cta-section">
      <div class="cta-content">
        ${title}
        ${description}
        ${buttons}
      </div>
    </section>
  `;
}

/**
 * Generic Content Section
 */
function renderContentSection(section, isAlt) {
  const title = section.title
    ? `<h2 class="text-center mb-2xl">${escapeHtml(section.title)}</h2>`
    : '';

  return `
    <section class="section${isAlt ? ' section-alt' : ''}">
      <div class="container">
        ${title}
        <div class="content-section">
          ${section.content || ''}
        </div>
      </div>
    </section>
  `;
}

function showFallbackContent() {
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const fallbackEl = document.getElementById('fallback-content');
  const contentEl = document.getElementById('home-content');

  if (loadingEl) loadingEl.style.display = 'none';

  if (fallbackEl) {
    fallbackEl.style.display = 'block';
    if (contentEl) contentEl.style.display = 'none';
  } else if (contentEl) {
    contentEl.style.display = 'block';
  }

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
  return String(text).replace(/[&<>"']/g, m => map[m]);
}
